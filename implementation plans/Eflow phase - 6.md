# eFlow — Phase 6: Team Leader Panel + Org Hierarchy Scoping
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Every edit below is anchored to an exact string, pulled directly from the real current codebase. If a target string does not exist verbatim in the current file, **stop and output the actual current content of that section instead of guessing or improvising a fix.** Do not proceed past a mismatch.
- Make only the edits listed in this document. Do not refactor, rename, reformat, "clean up," or simplify any code outside the listed changes, even if it looks improvable.
- Do not change any exported function signature unless this document explicitly shows the new signature.
- Do not invent fields, tables, or columns not listed in the SQL or the code blocks below. If you believe something is missing, flag it in your output rather than adding it silently.
- Work through the numbered files in order. Later edits assume earlier ones are already in place.
- Before reporting this phase complete, run the SELF-VERIFICATION section at the end and address every item on it.

---

## CONTEXT

Two things were confirmed by direct inspection of the current codebase before writing this document — not assumed, not carried over from a prior session's memory of the code:

**Confirmed gap 1 — `org_id` does not exist anywhere in the task pipeline.** `taskService.ts` has zero references to `org_id`/`orgId`. `CreateTaskPayload` only has a free-text `department?: string` field. `ProposalImport.tsx` sets `department: userProfile?.departmentId || ""` at task creation — meaning `department` has, by coincidence, been holding the creating user's real org UUID as a string, but there is no real `org_id` foreign key column, no index for it, and no hierarchical (parent/child) awareness. `DeptHeadContent.tsx` currently filters tasks with `t.department === userProfile.departmentId` — **exact string match only.** This means a dept head sitting above two sections currently cannot see tasks scoped to either section unless a task's `department` string happens to equal the dept head's own org id exactly. This phase fixes the gap for good: a real `org_id` column, a backfill for existing rows, and hierarchy-aware scoping using the `organizations.path` (ltree) column that already exists from Phase 1 — fixing DeptHead's own visibility gap as a side effect, not just building new scoping for Team Leader.

**Confirmed gap 2 — a `team_leader` user currently lands on the Super Admin dashboard.** `App.tsx`'s `mapRoleToPanel` already correctly returns `'teamleader'` for that role (already correct, do not touch). But `SidebarDemo.tsx`'s `roleNavConfigs` object and its content-rendering `map` object have no `teamleader` key at all — only `superadmin`, `depthead`, `employee` (plus a few dead legacy keys: `executive`, `legislative`, `hrmo`, `finance`, `councilor_pad`, left over from before the role simplification, harmless but unused). The lookup `map[role]?.[config.defaultSection] || map.superadmin.dashboard` silently falls back to the Super Admin dashboard when `map.teamleader` is undefined. **Anyone with the `team_leader` role today sees the org tree builder, not a task board.** This phase registers `teamleader` properly across all three places it needs to exist, pointing at a genuinely new `TeamLeaderContent.tsx`.

**What Team Leader needs** (per the original LEDIPO meeting notes): manage tasks and subtasks within their own section, verify employee submissions, and — same as Dept Head — be able to upload proposals for their own unit. Confirmed by inspection: `ProposalImport.tsx` has no role gate blocking non-dept-head use (the one `role === "department_head"` check in that file filters an employee-suggestion list, unrelated to component access) — it can be reused by Team Leader completely unmodified.

---

## PHASE-SPECIFIC RULES

1. **Do not modify `MondayBoard.tsx` in any way.** Its `role` prop is typed `'depthead' | 'employee'` and gates roughly 15 separate conditionals across the file. `TeamLeaderContent` will pass the literal string `"depthead"` as that prop's value. This is a deliberate choice, not an oversight: the `role` prop is a UI-permission gate, not a data-integrity field — it does not get written to the database. The actual actor identity for notifications, audit history, and activity logs continues to come from `userProfile.id` / `userProfile.fullName`, passed as separate props exactly as DeptHeadContent already does. Touching 15+ near-identical conditionals in a 4,300-line file for zero functional gain is the kind of scope creep this document explicitly forbids.
2. **Do not modify `ProposalImport.tsx`'s internal logic** beyond the single line specified in Section 3 below. It already works correctly for any role via `userProfile?.departmentId`.
3. **Do not remove or stop writing the `department` text column.** It stays as a human-readable label. `org_id` is additive — the new, real scoping key.
4. **Some legacy or seed tasks will not backfill cleanly** (their `department` value isn't a valid UUID). This is expected. They simply won't appear in any org-scoped view until manually reassigned. Do not attempt to fix or chase down individual unscoped legacy rows in this phase.
5. **`App.tsx` is already correct — do not touch it.** `mapRoleToPanel` already returns `'teamleader'` for the `team_leader` role.

---

## STEP 0 — RUN THIS SQL IN SUPABASE FIRST

```sql
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_org_id ON tasks (org_id);

-- Backfill: `department` has been holding the creating user's org UUID as
-- text since Phase 3/4. This safely migrates only rows where that's
-- actually true (matches a UUID shape); anything else is left NULL rather
-- than guessed at.
UPDATE tasks
SET org_id = department::uuid
WHERE org_id IS NULL
  AND department ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
```

---

## FILES TO CREATE / MODIFY

---

### 1. `src/app/services/taskService.ts` — TARGETED EDITS

**1a. Add `orgId` to the `Task` interface.** Find the `Task` interface near the top of the file — it contains a `department: string;` field (confirmed present, since `rowToTask` returns `department: readString(row.department)`). Add a sibling field directly next to it:
```ts
orgId?: string;
```

**1b. Add `orgId` to `CreateTaskPayload`.** Find this exact block:
```ts
export interface CreateTaskPayload {
  title: string;
  description: string;
  deadline: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: TaskStatus;
  department?: string;
```
Add directly after `department?: string;`:
```ts
  orgId?: string;
```

**1c. Add `orgId` mapping to `rowToTask`.** Find this exact line inside `rowToTask`:
```ts
    department: readString(row.department),
```
Add directly after it:
```ts
    orgId: readString(row.org_id),
```

**1d. Add `orgId` mapping to `taskToRow`.** Find this exact line inside `taskToRow`:
```ts
  if (task.department !== undefined) row.department = task.department || '';
```
Add directly after it:
```ts
  if (task.orgId !== undefined) row.org_id = task.orgId || null;
```

---

### 2. `src/lib/supabaseService.ts` — NEW EXPORT

Add this function anywhere near the existing `fetchAllOrgs` export. It computes every org id in a subtree (the anchor org plus all descendants) using the `organizations.path` ltree column already fetched by `fetchAllOrgs`/`useOrgs` — no new database round trip, no RPC function needed, pure client-side filtering over data that's already loaded.

```ts
// ─── getDescendantOrgIds ────────────────────────────────────────────
// Given the full org list and an anchor org id, returns the anchor's id
// plus every descendant's id (using the ltree `path` column). Used to
// scope tasks/employees to "everything under my node," not just an
// exact match on my own node — this is what lets a Dept Head see their
// sub-sections' tasks, and a Team Leader see only their own section.
export function getDescendantOrgIds(
  orgs: Organization[],
  anchorOrgId: string | null | undefined,
): string[] {
  if (!anchorOrgId) return [];
  const anchor = orgs.find((o) => o.id === anchorOrgId);
  if (!anchor) return [anchorOrgId];
  return orgs
    .filter((o) => o.path === anchor.path || o.path.startsWith(`${anchor.path}.`))
    .map((o) => o.id);
}
```

---

### 3. `src/app/components/DeptHead/ProposalImport.tsx` — ONE-LINE EDIT

Find this exact line:
```ts
                department: userProfile?.departmentId || "",
```
Add directly after it, in the same object literal:
```ts
                orgId: userProfile?.departmentId || undefined,
```

---

### 4. `src/app/components/DeptHead/DeptHeadContent.tsx` — TARGETED EDITS

**4a. Add imports.** Near the top of the file, alongside the other hook imports, add:
```ts
import { useOrgs } from "../../hooks/useSupabaseData";
import { getDescendantOrgIds } from "../../../lib/supabaseService";
```

**4b. Replace the first department filter.** Find this exact block:
```ts
  const { tasks } = useTasks();
  const { employees: allEmployees } = useEmployees();
  const { userProfile } = useAuth();

  // Filter to department
  const deptTasks = useMemo(() => {
    if (!userProfile?.departmentId) return tasks;
    return tasks.filter(
      (t) => !t.department || t.department === userProfile.departmentId,
    );
  }, [tasks, userProfile?.departmentId]);
```
Replace with:
```ts
  const { tasks } = useTasks();
  const { employees: allEmployees } = useEmployees();
  const { userProfile } = useAuth();
  const { orgs } = useOrgs();

  // Filter to entire org subtree (own node + all descendants), not just
  // an exact match — this is the fix for Dept Head not seeing sub-section
  // tasks.
  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );
  const deptTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (t) => !t.orgId || scopedOrgIds.includes(t.orgId),
    );
  }, [tasks, scopedOrgIds]);
```

**4c. Replace the second department filter.** Find this exact block:
```ts
  const { tasks } = useTasks();
  const { deptEmployees, directoryLoading, userProfile } =
    useDeptDirectoryEmployees();
  const { notes, loading: notesLoading } = useEmployeeNotes();

  // Filter tasks by department
  const deptTasks = useMemo(() => {
    if (!userProfile?.departmentId) return tasks;
    return tasks.filter(
      (t) =>
        !t.department ||
        t.department === userProfile.departmentId ||
        t.status === "pending_assignment",
    );
  }, [tasks, userProfile?.departmentId]);
```
Replace with:
```ts
  const { tasks } = useTasks();
  const { deptEmployees, directoryLoading, userProfile } =
    useDeptDirectoryEmployees();
  const { notes, loading: notesLoading } = useEmployeeNotes();
  const { orgs } = useOrgs();

  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );
  // Filter tasks to org subtree — unassigned tasks still show regardless
  // of scoping so they can be triaged, matching the original behavior.
  const deptTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (t) =>
        !t.orgId ||
        scopedOrgIds.includes(t.orgId) ||
        t.status === "pending_assignment",
    );
  }, [tasks, scopedOrgIds]);
```

---

### 5. `src/app/components/TeamLeader/TeamLeaderContent.tsx` — NEW FILE

Directory `src/app/components/TeamLeader/` does not exist yet — create it.

This reuses, unmodified: `MondayBoard` (role prop passed as `"depthead"` per Rule 1), `ProposalImport` (passed through as-is), `verifyTask` (same signature DeptHeadContent already uses), and the subtask editor built into `MondayBoard`'s `TaskEditorModal` from Phase 4 — none of that needs new code. What's genuinely new is the scoping layer and a small team workload list. Match `DeptHeadContent.tsx`'s visual conventions exactly: `bg-neutral-50` page background, `Lexend` font classes, same badge/pill patterns.

```tsx
import React, { useState, useMemo, useEffect } from "react";
import { Users, FolderUp, ClipboardCheck, Activity } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks, useEmployees, useEmployeeNotes } from "../../hooks/useFirebaseData";
import { useOrgs } from "../../hooks/useSupabaseData";
import { getDescendantOrgIds, fetchAllOrgs } from "../../../lib/supabaseService";
import { MondayBoard } from "../ui/MondayBoard";
import { ProposalImport } from "../DeptHead/ProposalImport";
import { verifyTask } from "../../services/taskService";
import { NotificationBell } from "../ui/NotificationBell";

type TeamLeaderTab = "board" | "import" | "workload";

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-colors ${
        active
          ? "bg-neutral-900 text-white"
          : "text-neutral-600 hover:bg-neutral-100"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function TeamWorkloadView({ orgName }: { orgName: string }) {
  const { employees } = useEmployees();

  return (
    <div className="p-6">
      <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-1">
        Team Workload — {orgName}
      </div>
      <div className="text-[11px] text-neutral-400 mb-4">
        Employees within your section
      </div>
      <div className="space-y-2">
        {employees.map((emp) => {
          const burnout = (emp as any).burnoutLevel || "low";
          const workload = (emp as any).currentWorkload ?? 0;
          const burnoutColor =
            burnout === "high"
              ? "text-red-600 bg-red-50"
              : burnout === "medium"
                ? "text-amber-600 bg-amber-50"
                : "text-emerald-600 bg-emerald-50";
          return (
            <div
              key={emp.id}
              className="flex items-center gap-3 bg-white rounded-xl border border-neutral-200 px-4 py-3"
            >
              <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[11px] font-['Lexend:SemiBold',_sans-serif] shrink-0">
                {emp.initials || "??"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-neutral-800 font-['Lexend:Medium',_sans-serif] truncate">
                  {emp.name}
                </div>
                <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mt-1 max-w-[160px]">
                  <div
                    className="h-full bg-neutral-800"
                    style={{ width: `${Math.min(workload, 100)}%` }}
                  />
                </div>
              </div>
              <span className="text-[11px] text-neutral-500 shrink-0">{workload}%</span>
              <span
                className={`text-[9px] uppercase px-2 py-0.5 rounded-full shrink-0 ${burnoutColor}`}
              >
                {burnout}
              </span>
            </div>
          );
        })}
        {employees.length === 0 && (
          <div className="text-[12px] text-neutral-400 text-center py-8">
            No employees found in your section.
          </div>
        )}
      </div>
    </div>
  );
}

export function TeamLeaderContent() {
  const { userProfile } = useAuth();
  const { tasks } = useTasks();
  const { employees } = useEmployees();
  const { notes } = useEmployeeNotes();
  const { orgs } = useOrgs();
  const [tab, setTab] = useState<TeamLeaderTab>("board");
  const [orgName, setOrgName] = useState<string>("My Section");

  useEffect(() => {
    if (!userProfile?.departmentId) return;
    fetchAllOrgs().then((allOrgs) => {
      const org = allOrgs.find((o) => o.id === userProfile.departmentId);
      if (org) setOrgName(org.name);
    });
  }, [userProfile?.departmentId]);

  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );

  const scopedTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (t) => !t.orgId || scopedOrgIds.includes(t.orgId) || t.status === "pending_assignment",
    );
  }, [tasks, scopedOrgIds]);

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-neutral-200 bg-white">
        <div>
          <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">
            Team Leader · {orgName}
          </div>
          <h1 className="text-[19px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
            Section Workspace
          </h1>
        </div>
        <NotificationBell userId={userProfile?.uid} />
      </div>

      <div className="flex items-center gap-2 px-6 py-3 bg-white border-b border-neutral-200">
        <TabButton
          active={tab === "board"}
          onClick={() => setTab("board")}
          icon={<ClipboardCheck size={14} />}
          label="Task Board"
        />
        <TabButton
          active={tab === "import"}
          onClick={() => setTab("import")}
          icon={<FolderUp size={14} />}
          label="Import Proposal"
        />
        <TabButton
          active={tab === "workload"}
          onClick={() => setTab("workload")}
          icon={<Users size={14} />}
          label="Team Workload"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === "board" && (
          <MondayBoard
            tasks={scopedTasks}
            employees={employees}
            employeeNotes={notes}
            role="depthead"
            departmentFilter={userProfile?.departmentId}
            currentUserId={userProfile?.uid}
            currentUserName={userProfile?.fullName}
            onVerifyTask={(taskId, approve, feedback) =>
              verifyTask(taskId, approve, feedback, {
                id: userProfile?.uid,
                name: userProfile?.fullName,
              })
            }
          />
        )}
        {tab === "import" && <ProposalImport />}
        {tab === "workload" && <TeamWorkloadView orgName={orgName} />}
      </div>
    </div>
  );
}

export default TeamLeaderContent;
```

**Note on the `MondayBoard` props above:** match them exactly against how `DeptHeadContent.tsx` calls `<MondayBoard ... />` at its own confirmed call site (props: `tasks`, `employees`, `employeeNotes`, `role`, `departmentFilter`, `currentUserId`, and however it wires task verification/approval). If any prop name here doesn't match what `DeptHeadContent.tsx` actually passes, use DeptHeadContent's real prop names instead — this component must stay a faithful sibling of DeptHeadContent's own `<MondayBoard />` usage, not a reinvention.

---

### 6. `src/app/components/Layout/SidebarDemo.tsx` — THREE REGISTRATIONS

**6a. Register the nav config.** Find this exact block:
```ts
  depthead: {
    defaultSection: "deptportfolio",
    navItems: [
      {
        id: "deptportfolio",
        icon: <Folder size={16} />,
        label: "Department Workspace",
      },
    ],
  },
```
Add directly after it (same object, sibling key):
```ts
  teamleader: {
    defaultSection: "deptportfolio",
    navItems: [
      {
        id: "deptportfolio",
        icon: <Folder size={16} />,
        label: "Section Workspace",
      },
    ],
  },
```

**6b. Add the import.** Find this exact line:
```ts
import { DeptHeadContent } from "../DeptHead/DeptHeadContent";
```
Add directly after it:
```ts
import { TeamLeaderContent } from "../TeamLeader/TeamLeaderContent";
```

**6c. Register the content map entry.** Find the object entry that starts with:
```ts
    depthead: {
      deptportfolio: {
```
This is a large, multi-field object (title, sections, items with icons/labels) — do not try to reproduce or paraphrase its contents. Instead: locate where this `depthead` entry's value object closes (matching brace), and immediately after it, add a new sibling key:
```ts
    teamleader: {
      deptportfolio: TeamLeaderContent,
    },
```
If the surrounding `map` object's value shape for other roles is a plain component reference (not the nested title/sections object you found under `depthead`), match whatever shape the map actually expects — there may be two separate registries in this file (one for detailed sidebar sub-navigation labels, one for the actual rendered page component per role/section). If so, `depthead`'s entry in the registry that maps directly to a **rendered component** is the one to mirror for `teamleader` → `TeamLeaderContent`. The nested title/sections/icons object under `depthead` at `deptportfolio` is sidebar label configuration, not a rendered component — if that's the block you found, keep searching for the separate registry where `map[role][section]` resolves to an actual React component (referenced via the line `map[role]?.[config.defaultSection] || map.superadmin.dashboard`), and register `teamleader` there instead.

**6d. Leave the existing bare `role === "teamleader"` checks alone.** Two conditionals already reference this exact string (icon-rail visibility branches) — they are correct as-is and unrelated to this registration work.

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Did you run the Step 0 SQL exactly as written — `org_id` column, index, and backfill, nothing added or omitted?
- [ ] Does `Task`, `CreateTaskPayload`, `rowToTask`, and `taskToRow` all now handle `orgId`/`org_id` consistently?
- [ ] Does `getDescendantOrgIds` live in `supabaseService.ts` and get imported (not redefined) everywhere it's used?
- [ ] Did `ProposalImport.tsx` get exactly one line added, with no other changes to that file?
- [ ] Do both filters in `DeptHeadContent.tsx` now use `scopedOrgIds`/`getDescendantOrgIds` instead of exact-match `department` comparison, with the `pending_assignment` escape hatch preserved in the second block?
- [ ] Does `TeamLeaderContent.tsx` exist at the specified path, and does its `<MondayBoard />` call use the exact same prop names as `DeptHeadContent.tsx`'s own usage (not invented ones)?
- [ ] Is `role="depthead"` (the literal string) passed to `MondayBoard` from `TeamLeaderContent` — and is `MondayBoard.tsx` itself completely untouched?
- [ ] Is `teamleader` now a real, working key in every registry `SidebarDemo.tsx` needs it in — confirmed by tracing `map[role]?.[config.defaultSection]` for `role = "teamleader"` and verifying it resolves to `TeamLeaderContent`, not falling through to `map.superadmin.dashboard`?
- [ ] Did you touch `App.tsx`? (Should be no — it was already correct.)
- [ ] Did you touch `MondayBoard.tsx`? (Should be no.)
- [ ] Did you touch any file, function, or import not explicitly listed in this document? If yes, revert those changes.
- [ ] Does the project still compile / type-check with no new errors introduced?

---

## TESTING CHECKLIST

- [ ] Create a test user with role `team_leader`, `org_id` set to one of LEDIPO's sections — log in — confirm you land on a real Section Workspace, not the Super Admin org tree
- [ ] As that team leader, confirm the task board shows only tasks scoped to their section (plus any unassigned/`pending_assignment` tasks)
- [ ] As a dept head whose org sits above two sections, confirm their board now shows tasks from BOTH sections (the fix from Section 4) — this should be visibly different from before this phase
- [ ] Team leader imports a proposal via the Import Proposal tab — tasks get created with a real `org_id` pointing at the team leader's section
- [ ] Team leader opens a task, adds a subtask manually — works identically to how it works for Dept Head (proves the untouched `MondayBoard`/Phase 4 subtask layer is being reused correctly, not reimplemented)
- [ ] Team leader verifies (approves) a submitted task — status changes to `completed`, matches Dept Head's approve behavior exactly
- [ ] Team Workload tab shows only employees within the team leader's section, with workload % and burnout pill per person
- [ ] Run the Step 0 SQL's `SELECT COUNT(*) FROM tasks WHERE org_id IS NOT NULL;` before and after — confirm the backfill actually populated existing rows, not just new ones going forward
- [ ] Confirm a super_admin login still correctly lands on the real Super Admin dashboard (regression check — make sure the `teamleader` addition didn't disturb the fallback logic for other roles)