# eFlow — AI Table Fix 2: PDF Proposal Import Employee Recommendations
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Every edit below is anchored to an exact string, verified directly against the current codebase. If a target string does not exist verbatim, stop and output what you actually found instead of guessing.
- Make only the edits listed in this document. Do not refactor, rename, or touch anything outside the listed changes.
- Do not change any exported function signature unless explicitly shown here.
- Before reporting this phase complete, run the SELF-VERIFICATION section at the end.

---

## ROOT CAUSE ANALYSIS

There are **four compounding bugs** that cause every PDF import task to recommend only one person (the dept head) with low skill-match scores (20–45%).

### Bug 1 — Department filter is exact-match only (CRITICAL)

**File:** `src/app/components/DeptHead/ProposalImport.tsx`, line 171.

```typescript
if (emp.department !== departmentId) return false;
```

The logged-in user is a BPLO dept head (`org_id: 7c8b232a`). Their employees work in child orgs: LEDIPO (`org_id: fdd4dfee`), TDFRO (`org_id: 71de1bde`), CPDO sections, etc. This exact-match filter excludes every single descendant-org employee. Only other users whose `org_id` is literally `7c8b232a` pass the filter — and those are also excluded by the dept-head check on line 183. Result: `deptEmployees` is **empty or near-empty**.

### Bug 2 — `deptEmployeesWithNotes` gate (HIGH)

**File:** `src/app/components/DeptHead/ProposalImport.tsx`, lines 480–483.

```typescript
const availableEmployees =
  deptEmployeesWithNotes.length > 0
    ? deptEmployeesWithNotes
    : deptEmployees;
```

If only one employee has notes, `deptEmployeesWithNotes` has exactly one person. The AI gets one candidate, always picks them. Combined with Bug 1 (which already eliminated most candidates), this turns the recommendation into a single-person rubber stamp.

### Bug 3 — `usersAsEmployees` drops all skill data (MEDIUM)

**File:** `src/app/components/DeptHead/ProposalImport.tsx`, line 102.

```typescript
jobDescription: "",
```

When employees are sourced from `useUsers()` (instead of `useEmployees()`), `jobDescription` is hardcoded to `""`. Profile skills are never read. The scoring engine finds zero keyword matches and returns a floor score of 20%.

### Bug 4 — `buildCompactEmployeesContext` ignores profile skills (MEDIUM)

**File:** `src/app/services/proposalDecompositionService.ts`, line 197.

```typescript
return `- ID: ${employee.id} | ${employee.name} | Workload: ${employee.currentWorkload}% | Skills: ${notes?.strengths || "General"}`;
```

The LLM context shows `Skills: ${notes?.strengths || "General"}` — it only reads `employeeNotes.strengths`. The actual profile-level skills stored in `employee.jobDescription` (which is the comma-separated skill list from `profileToEmployee`) are never shown to the LLM. If an employee has no notes, the LLM sees `Skills: General`, which is useless for matching.

---

## PROPOSED CHANGES

---

## PART A — Fix department filtering to include descendant orgs

**File:** `src/app/components/DeptHead/ProposalImport.tsx`

### A1 — Add imports for `useOrgs` and `getDescendantOrgIds`

The current import block for hooks (line 12–17) is:

```typescript
import {
  useEmployees,
  useEmployeeNotes,
  useUsers,
  useDepartments,
} from "../../hooks/useFirebaseData";
```

Replace it with:

```typescript
import {
  useEmployees,
  useEmployeeNotes,
  useUsers,
  useDepartments,
  useOrgs,
} from "../../hooks/useFirebaseData";
import { getDescendantOrgIds } from "../../../lib/supabaseService";
```

### A2 — Add `useOrgs` hook call and compute `scopedOrgIds`

After the existing line 65 (`const { userProfile } = useAuth();`), add:

```typescript
  const { orgs } = useOrgs();
```

### A3 — Compute descendant org IDs as a memoized set

After the existing `departmentNameById` useMemo block (after line 75), add this new `useMemo`:

```typescript
  const scopedOrgIds = useMemo(() => {
    if (!userProfile?.departmentId) return new Set<string>();
    return new Set(getDescendantOrgIds(orgs, userProfile.departmentId));
  }, [orgs, userProfile?.departmentId]);
```

### A4 — Replace exact department match with scoped org check

The current `deptEmployees` filter (line 165–199) has this exact check on line 171:

```typescript
      if (emp.department !== departmentId) return false;
```

Replace it with:

```typescript
      if (!emp.department || !scopedOrgIds.has(emp.department)) return false;
```

Also, add `scopedOrgIds` to the dependency array. The current dependency array (lines 191–199) is:

```typescript
  }, [
    directoryEmployees,
    headUsers,
    userByEmail,
    userById,
    userProfile?.departmentId,
    userProfile?.email,
    userProfile?.uid,
  ]);
```

Replace it with:

```typescript
  }, [
    directoryEmployees,
    headUsers,
    userByEmail,
    userById,
    scopedOrgIds,
    userProfile?.departmentId,
    userProfile?.email,
    userProfile?.uid,
  ]);
```

---

## PART B — Remove the `deptEmployeesWithNotes` gate

**File:** `src/app/components/DeptHead/ProposalImport.tsx`

### B1 — Always pass all department employees to AI

The current code (lines 480–488) is:

```typescript
        const availableEmployees =
          deptEmployeesWithNotes.length > 0
            ? deptEmployeesWithNotes
            : deptEmployees;
        const decomposed = await decomposeProposal(
          text,
          file.name.replace(/\.pdf$/i, ""),
          availableEmployees,
          employeeNotes,
        );
```

Replace it with:

```typescript
        const decomposed = await decomposeProposal(
          text,
          file.name.replace(/\.pdf$/i, ""),
          deptEmployees,
          employeeNotes,
        );
```

### B2 — Remove `deptEmployeesWithNotes` from the useCallback deps

The current `useCallback` dependency array (line 500) is:

```typescript
    [deptEmployees, deptEmployeesWithNotes, employeeNotes, autoCreateTasks],
```

Replace it with:

```typescript
    [deptEmployees, employeeNotes, autoCreateTasks],
```

---

## PART C — Fix `usersAsEmployees` to carry profile skills

**File:** `src/app/components/DeptHead/ProposalImport.tsx`

### C1 — Read skills from user profile into `jobDescription`

The current `usersAsEmployees` useMemo (lines 95–112) builds each employee object with `jobDescription: ""` on line 102. The exact code block to change is:

```typescript
    return users.map((user) => {
      const name = user.fullName || user.email || "Unnamed User";
      const departmentId = user.departmentId || "";
      return {
        id: user.uid,
        name,
        jobTitle: titleForRole(user.role),
        jobDescription: "",
        currentWorkload: typeof user.workload === "number" ? user.workload : 0,
        department: departmentId || undefined,
        departmentName: departmentId
          ? departmentNameById.get(departmentId) || departmentId
          : undefined,
        initials: initialsFor(name),
        email: user.email || undefined,
      };
    });
```

Replace it with:

```typescript
    return users.map((user) => {
      const name = user.fullName || user.email || "Unnamed User";
      const departmentId = user.departmentId || "";
      const skills = (user as unknown as Record<string, unknown>).skills as Record<string, boolean> | undefined;
      const skillList = skills
        ? Object.keys(skills).filter((k) => skills[k]).join(", ")
        : "";
      return {
        id: user.uid,
        name,
        jobTitle: titleForRole(user.role),
        jobDescription: skillList || titleForRole(user.role),
        currentWorkload: typeof user.workload === "number" ? user.workload : 0,
        department: departmentId || undefined,
        departmentName: departmentId
          ? departmentNameById.get(departmentId) || departmentId
          : undefined,
        initials: initialsFor(name),
        email: user.email || undefined,
      };
    });
```

**Why:** Now users sourced from `useUsers()` carry their profile skills in `jobDescription`, the same way `profileToEmployee` does in `employeeService.ts`. The AI scoring engine will have real keywords to match against.

---

## PART D — Fix `buildCompactEmployeesContext` to use profile skills

**File:** `src/app/services/proposalDecompositionService.ts`

### D1 — Show actual skills (from `employee.jobDescription`) to the LLM

The current `buildCompactEmployeesContext` function (lines 190–199) is:

```typescript
const buildCompactEmployeesContext = (
  employees: Employee[],
  employeeNotes?: EmployeeNotesMap,
) =>
  employees
    .map((employee) => {
      const notes = employeeNotes?.[employee.id];
      return `- ID: ${employee.id} | ${employee.name} | Workload: ${employee.currentWorkload}% | Skills: ${notes?.strengths || "General"}`;
    })
    .join("\n");
```

Replace the entire function with:

```typescript
const buildCompactEmployeesContext = (
  employees: Employee[],
  employeeNotes?: EmployeeNotesMap,
) =>
  employees
    .map((employee) => {
      const notes = employeeNotes?.[employee.id];
      const profileSkills = employee.jobDescription || "";
      const noteSkills = notes?.strengths || "";
      const combinedSkills = [profileSkills, noteSkills].filter(Boolean).join(", ") || "General";
      return `- ID: ${employee.id} | ${employee.name} | Workload: ${employee.currentWorkload}% | Skills: ${combinedSkills}`;
    })
    .join("\n");
```

**Why:** Now the LLM sees both the real profile skills (e.g. "Data gathering, SWOT analysis, Report writing") AND any manager-written strengths from `employeeNotes`. If both are empty, it falls back to "General".

---

## PART E — Expand `inferSkillsFromText` keyword vocabulary

**File:** `src/app/services/proposalDecompositionService.ts`

### E1 — Add more keyword → skill mapping rules

The current `inferSkillsFromText` function (lines 260–279) has only 8 keyword rules. The exact current code is:

```typescript
const inferSkillsFromText = (text: string): string[] => {
  const rules = [
    { keyword: "workshop", skill: "facilitation" },
    { keyword: "consult", skill: "stakeholder engagement" },
    { keyword: "analysis", skill: "economic analysis" },
    { keyword: "benchmark", skill: "benchmarking" },
    { keyword: "planning", skill: "strategic planning" },
    { keyword: "writing", skill: "technical writing" },
    { keyword: "presentation", skill: "presentation" },
    { keyword: "validation", skill: "policy coordination" },
  ];

  const lower = text.toLowerCase();
  const skills = new Set<string>();
  rules.forEach((rule) => {
    if (lower.includes(rule.keyword)) skills.add(rule.skill);
  });

  return Array.from(skills);
};
```

Replace the entire function with:

```typescript
const inferSkillsFromText = (text: string): string[] => {
  const rules = [
    { keyword: "workshop", skill: "facilitation" },
    { keyword: "facilitat", skill: "facilitation" },
    { keyword: "consult", skill: "stakeholder engagement" },
    { keyword: "stakeholder", skill: "stakeholder engagement" },
    { keyword: "analysis", skill: "data analysis" },
    { keyword: "economic", skill: "economic analysis" },
    { keyword: "diagnostic", skill: "economic analysis" },
    { keyword: "benchmark", skill: "benchmarking" },
    { keyword: "planning", skill: "strategic planning" },
    { keyword: "strategic", skill: "strategic planning" },
    { keyword: "writing", skill: "technical writing" },
    { keyword: "report", skill: "report writing" },
    { keyword: "document", skill: "technical writing" },
    { keyword: "presentation", skill: "presentation" },
    { keyword: "validation", skill: "stakeholder validation" },
    { keyword: "coordinat", skill: "project coordination" },
    { keyword: "policy", skill: "policy analysis" },
    { keyword: "regulat", skill: "regulatory compliance" },
    { keyword: "budget", skill: "budgeting" },
    { keyword: "invest", skill: "investment promotion" },
    { keyword: "zoning", skill: "zoning & land use" },
    { keyword: "urban", skill: "urban planning" },
    { keyword: "gis", skill: "GIS mapping" },
    { keyword: "mapping", skill: "GIS mapping" },
    { keyword: "traffic", skill: "traffic analysis" },
    { keyword: "swot", skill: "SWOT analysis" },
    { keyword: "survey", skill: "data gathering" },
    { keyword: "data gather", skill: "data gathering" },
    { keyword: "data collect", skill: "data gathering" },
    { keyword: "research", skill: "data gathering" },
    { keyword: "visioning", skill: "strategic planning" },
    { keyword: "roadmap", skill: "strategic planning" },
    { keyword: "competitiv", skill: "economic analysis" },
    { keyword: "legislat", skill: "policy analysis" },
    { keyword: "enactment", skill: "policy analysis" },
    { keyword: "public relation", skill: "public relations" },
  ];

  const lower = text.toLowerCase();
  const skills = new Set<string>();
  rules.forEach((rule) => {
    if (lower.includes(rule.keyword)) skills.add(rule.skill);
  });

  return Array.from(skills);
};
```

**Why:** The vocabulary now mirrors the exact skill keywords stored in the `profiles.skills` column (e.g. "Data gathering", "SWOT analysis", "project coordination", "strategic planning"). When `inferSkillsFromText` runs on the PDF text, the inferred `requiredSkills` will match the profile skill keywords — dramatically increasing skill-match scores from the 20–45% range to 60–90%+.

---

## SUMMARY OF ALL CHANGED FILES

| File | What changes |
|---|---|
| `src/app/components/DeptHead/ProposalImport.tsx` | Import `useOrgs` + `getDescendantOrgIds`; compute `scopedOrgIds` via `useMemo`; replace exact org-match filter with `scopedOrgIds.has()`; remove `deptEmployeesWithNotes` gate — always pass `deptEmployees`; fix `usersAsEmployees` to read `skills` from user profile into `jobDescription`. |
| `src/app/services/proposalDecompositionService.ts` | `buildCompactEmployeesContext` now shows `employee.jobDescription` + `notes.strengths` combined; `inferSkillsFromText` expanded from 8 to 36 keyword→skill rules matching the profile skill vocabulary. |

**Files explicitly NOT changed:**
- `src/app/services/aiScoringEngine.ts` — `computeSkillMatch` is correct; it reads `employee.jobDescription` which now has real skill data.
- `src/app/services/employeeService.ts` — `profileToEmployee` already correctly maps `profile.skills` to `jobDescription`.
- `src/app/services/llmService.ts` — `buildEmployeesContext` already labels the field `Skills:` (from Phase 10).
- `server/main.py` — no backend changes needed.
- Any SQL / Supabase — no schema changes needed.

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Does `ProposalImport.tsx` import `useOrgs` from `useFirebaseData` and `getDescendantOrgIds` from `supabaseService`?
- [ ] Does `ProposalImport.tsx` call `useOrgs()` and compute `scopedOrgIds` via `useMemo`?
- [ ] Does `deptEmployees` filter use `scopedOrgIds.has(emp.department)` instead of `emp.department !== departmentId`?
- [ ] Is `scopedOrgIds` in the `deptEmployees` dependency array?
- [ ] Does the `decomposeProposal` call pass `deptEmployees` directly (NOT `availableEmployees` or `deptEmployeesWithNotes`)?
- [ ] Is `deptEmployeesWithNotes` removed from the `useCallback` dependency array?
- [ ] Does `usersAsEmployees` read `skills` from the user object and set `jobDescription` to the comma-separated skill list?
- [ ] Does `buildCompactEmployeesContext` now combine `employee.jobDescription` + `notes?.strengths` for the Skills field?
- [ ] Does `inferSkillsFromText` now have 36 rules covering vocabulary like "stakeholder", "strategic", "swot", "budget", "zoning", "gis", "traffic", "data gather", "coordinat", "regulat", "urban", "invest", etc.?
- [ ] Did you touch `aiScoringEngine.ts`? (Should be NO.)
- [ ] Did you touch `employeeService.ts`? (Should be NO.)
- [ ] Does the project still compile / type-check with no new TypeScript errors introduced?

---

## TESTING CHECKLIST

- [ ] Log in as a dept head (e.g. `gabzcah@gmail.com` — BPLO dept head)
- [ ] Go to the Proposal Import section → upload `Project-Proposal-OCEDSIPP-Final-Version.pdf`
- [ ] Wait for decomposition to complete
- [ ] **Verify multiple employees are recommended** — you should see names like Maria Clara, Juan Dela Cruz, Raoul Cam, Vincent Emnas, etc. — NOT just "Cheryl Gallo" for every task
- [ ] **Verify skill match scores are higher** — tasks like "SWOT analysis" should match employees with "SWOT analysis" skill at 60%+, not 20%
- [ ] **Verify different employees are recommended for different tasks** — "Kick Off Meeting" might recommend someone with facilitation skills; "Technical Economic Diagnostic" should recommend someone with "economic analysis" or "data analysis" skills
- [ ] Check the browser console for `[Decomposition]` logs — confirm the employee list shows more than 1 candidate
- [ ] (Regression) Confirm that employees outside the dept head's org tree do NOT appear in recommendations (CPDO, TDFRO employees should not show up for a BPLO head unless BPLO is the parent of those orgs)
- [ ] (Regression) Confirm that dept heads themselves are excluded from recommendations (they should not be recommended as assignees)
- [ ] (Regression) Confirm the regular Monday Board "Recommend Team" AI still works correctly — it uses `llmService.ts` not `proposalDecompositionService.ts`, so this fix should not affect it

