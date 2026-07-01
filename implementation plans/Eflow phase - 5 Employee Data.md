# eFlow — Phase 5: Employee Panel Wired to Real Data
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Every edit below is anchored to an exact string. If a target string does not exist verbatim in the current file, **stop and output the actual current content of that section instead of guessing or improvising a fix.** Do not proceed past a mismatch.
- Make only the edits listed in this document. Do not refactor, rename, reformat, "clean up," or simplify any code outside the listed changes, even if it looks improvable. Adjacent code that looks messy is not in scope.
- Do not change any exported function signature unless this document explicitly shows the new signature. If unsure whether something is used elsewhere, treat it as used elsewhere and leave the signature alone.
- Do not invent fields, tables, or columns not listed in the SQL or the code blocks below. If you believe something is missing, flag it in your output rather than adding it silently.
- Work through the numbered files in order. Do not skip ahead or reorder — later edits assume earlier ones are already in place.
- Before reporting this phase complete, run the SELF-VERIFICATION section at the end and address every item on it.

---

## CONTEXT

Phase 1-4 complete. Good news from investigation: most of "Employee panel wired to real data" already works as a side effect of Phase 3's `taskService.ts` rewrite:

- ✅ `EmployeeTaskBoard()` in `EmployeeContent.tsx` already filters tasks to `assigneeId === userProfile.uid` with live realtime updates
- ✅ `onExecute` → `updateTaskStatus(taskId, "in_progress")` already works
- ✅ `NotificationBell` already mounted in `SidebarDemo.tsx`, already wired to Supabase via Phase 3
- ✅ Reassignment realtime already works via `subscribeToTasks`

**Two real gaps found, and this phase exists to close them:**

**Gap 1 — Task submission is silently broken.** Phase 3's `submitTaskForReview` only sets `status: 'for_review'` and `feedback`. It never uploads the `attachments: File[]` the employee selects, and it never writes a `latestSubmission` object — but `MondayBoard`'s `SubmissionDetails` component (line ~390) reads `task.latestSubmission` to render the submission note, submitter, and attachment links. Right now that field is always `undefined`, so submissions silently vanish from the UI even though the task status changes correctly. This phase fixes it properly: real file upload to Supabase Storage, real `latestSubmission` persistence.

**Gap 2 — No profile page exists.** The settings icon in the sidebar (`SidebarDemo.tsx`) sets `activeSection = "settings"`, but `EmployeeContent.tsx`'s `employeePages` routing map has no `settings` key, so it falls through to the "Blank dashboard" placeholder. This phase builds a real one.

---

## PHASE-SPECIFIC RULES (in addition to the non-negotiables above)

1. **Do not touch** `EmployeeTaskBoard`, `onExecute`, task filtering, or notification wiring — these already work correctly. Confirm via the testing checklist, do not rewrite.
2. **Do not change** the `verifyTask` signature. Confirmed live call site in `DeptHeadContent.tsx`: `verifyTask(taskId, approve, feedback, { id, name })` — i.e. `(taskId: string, approve: boolean, feedback?: string, actor?: TaskActor)`. This was correctly preserved through Phase 3. Leave it exactly as is.
3. **Do not change** `MondayBoard.tsx`'s `SubmissionDetails` or `RejectionNotice` render components — they already expect the right shape (`task.latestSubmission.attachments` as an array of usable URL strings). This phase makes the data match what they already expect, not the other way around.
4. **Skills, avatar photo upload are out of scope for this phase.** Skills stay read-only on the employee side (editable only by dept_head/team_leader via the existing employee_notes flow) to avoid employees gaming AI task-matching. No photo upload — avatar stays initials-based, matching the pattern already used everywhere else in the app (org tree nodes, user tables).

---

## STEP 0 — RUN THIS SQL IN SUPABASE FIRST

```sql
-- ─── Submission metadata on tasks (mirrors old Firebase shape exactly) ──
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS latest_submission JSONB;

-- ─── Guard against self-privilege-escalation on profile self-edit ───────
-- RLS policy "profiles_update_own" (from Phase 1) lets a user UPDATE
-- their own row, but doesn't restrict WHICH columns they can change.
-- Without this, an employee could set their own role/org_id/is_active
-- via a raw API call. This trigger silently reverts those three fields
-- if the row being changed belongs to the caller themselves and they
-- aren't already a super_admin. Admin operations (super_admin editing
-- SOMEONE ELSE's row) are untouched since auth.uid() != OLD.id in that
-- case. Service-role calls (FastAPI) are untouched since auth.uid() is
-- NULL in that context.
CREATE OR REPLACE FUNCTION prevent_self_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.uid() = OLD.id AND OLD.role <> 'super_admin' THEN
    IF NEW.role IS DISTINCT FROM OLD.role THEN NEW.role := OLD.role; END IF;
    IF NEW.org_id IS DISTINCT FROM OLD.org_id THEN NEW.org_id := OLD.org_id; END IF;
    IF NEW.is_active IS DISTINCT FROM OLD.is_active THEN NEW.is_active := OLD.is_active; END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER guard_self_profile_update
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION prevent_self_privilege_escalation();
```

Also, in the Supabase Dashboard, confirm the `task-attachments` Storage bucket from Phase 3 exists (Storage → should already be there, private, not public). If it's missing, create it now: name `task-attachments`, public = false.

---

## FILES TO CREATE / MODIFY

---

### 1. `src/app/services/taskService.ts` — TARGETED EDITS

**1a. Add `latestSubmission` to `rowToTask`.** Find where other optional fields are mapped (near `subtaskCount`/`subtaskCompletedCount` from Phase 4), add:
```ts
latestSubmission: row.latest_submission
  ? (row.latest_submission as TaskSubmissionMetadata)
  : undefined,
```

**1b. Replace `submitTaskForReview` entirely** with a version that actually uploads attachments:

```ts
export const submitTaskForReview = async (
  taskId: string,
  submission: TaskSubmissionInput,
): Promise<void> => {
  const trimmedNote = submission.note.trim();
  if (!trimmedNote) throw new Error("Submission note is required.");
  if (!submission.submitterId) throw new Error("Submitter ID is required.");

  const attachments = submission.attachments || [];

  // Upload each file to Supabase Storage, get a long-lived signed URL
  // (60 days — comfortably beyond any capstone demo or review cycle).
  // Also insert a relational row per file into task_attachments so a
  // fresh signed URL can always be regenerated later from file_path,
  // even after this one expires.
  const uploadedUrls = await Promise.all(
    attachments.map(async (file, idx) => {
      const safeName =
        typeof file.name === "string" && file.name.trim().length > 0
          ? file.name
          : `attachment-${idx + 1}`;
      const path = `${taskId}/${submission.submitterId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("task-attachments")
        .upload(path, file, { upsert: false });
      if (uploadError) throw uploadError;

      const { data: signedData, error: signError } = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 60); // 60 days
      if (signError) throw signError;

      await supabase.from("task_attachments").insert({
        task_id: taskId,
        uploaded_by: submission.submitterId,
        uploader_name: submission.submitterName,
        file_name: safeName,
        file_path: path,
        file_size: file.size || 0,
        mime_type: file.type || "",
      });

      return signedData.signedUrl;
    }),
  );

  const now = Date.now();
  const latestSubmission: TaskSubmissionMetadata = {
    note: trimmedNote,
    submitterId: submission.submitterId,
    submitterName: submission.submitterName,
    submittedAt: now,
    attachments: uploadedUrls,
  };

  await supabase
    .from("tasks")
    .update({
      status: "for_review",
      latest_submission: latestSubmission,
      rejection_note: null,
      rejected_at: null,
      feedback: null,
    })
    .eq("id", taskId);

  await supabase.from("task_status_history").insert({
    task_id: taskId,
    from_status: "in_progress",
    to_status: "for_review",
    actor_id: submission.submitterId,
    actor_name: submission.submitterName,
    note: trimmedNote,
  });

  await logTaskActivity(
    taskId,
    { id: submission.submitterId, name: submission.submitterName },
    "submitted",
    `Submitted for review by ${submission.submitterName}`,
  );

  // Notify the task's dept head / assigner
  const { data: taskRow } = await supabase
    .from("tasks")
    .select("created_by, title")
    .eq("id", taskId)
    .single();
  if (taskRow?.created_by) {
    await createNotification(taskRow.created_by, {
      type: "approval_needed",
      title: "Task Submitted for Review",
      message: `${submission.submitterName} submitted "${taskRow.title}" for review.`,
      taskId,
      taskTitle: taskRow.title,
      actorId: submission.submitterId,
      actorName: submission.submitterName,
      statusFrom: "in_progress",
      statusTo: "for_review",
    });
  }

  await notifyTaskListeners();
};
```

**1c. Verify `verifyTask`'s approve branch writes `feedback`.** Open the current implementation and confirm it matches this shape (patch only if it's missing the `feedback` write on approve — the original Firebase version let a dept head leave a positive note even when approving, not just when rejecting):

```ts
export const verifyTask = async (
  taskId: string,
  approve: boolean,
  feedback?: string,
  actor?: TaskActor,
): Promise<void> => {
  const { data: current } = await supabase
    .from("tasks")
    .select("status")
    .eq("id", taskId)
    .single();

  const newStatus = approve ? "completed" : "in_progress";
  const update: Record<string, unknown> = {
    status: newStatus,
    feedback: feedback || null,
  };
  if (!approve) {
    update.rejection_note = feedback || null;
    update.rejected_at = new Date().toISOString();
  } else {
    update.rejection_note = null;
    update.rejected_at = null;
  }

  await supabase.from("tasks").update(update).eq("id", taskId);

  await supabase.from("task_status_history").insert({
    task_id: taskId,
    from_status: current?.status || "for_review",
    to_status: newStatus,
    actor_id: actor?.id || null,
    actor_name: actor?.name || (approve ? "Department head" : "Reviewer"),
    note: approve ? (feedback || "Approved and completed") : (feedback || "Rejected"),
  });

  await logTaskActivity(
    taskId,
    { id: actor?.id, name: actor?.name },
    approve ? "approved" : "rejected",
    approve
      ? `${actor?.name || "Reviewer"} approved and completed the task`
      : `${actor?.name || "Reviewer"} sent the task back for revisions`,
  );

  await notifyTaskListeners();
};
```

---

### 2. `src/lib/supabaseService.ts` — SMALL ADDITION

Add a self-service profile update wrapper alongside the existing (admin) `updateProfile`:

```ts
// ─── updateOwnProfile ───────────────────────────────────────────────
// For the logged-in user editing their own profile. Whitelisted fields
// only — role/org_id/is_active are blocked client-side here AND at the
// DB level via the guard_self_profile_update trigger (defense in depth).
export async function updateOwnProfile(
  userId: string,
  data: { full_name?: string },
): Promise<void> {
  const update: Record<string, unknown> = {};
  if (data.full_name !== undefined) update.full_name = data.full_name;

  const { error } = await supabase.from("profiles").update(update).eq("id", userId);
  if (error) throw error;
}
```

---

### 3. `src/app/components/Employee/ProfilePage.tsx` — NEW FILE

Match existing Employee UI conventions: `bg-neutral-50` page background, white cards with `border-neutral-200 rounded-xl`, `Lexend` font classes, same badge/pill styling used elsewhere in `EmployeeContent.tsx`.

```tsx
import React, { useState, useEffect } from "react";
import { User, Mail, IdCard, Building2, Shield, Lock, Activity } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { updateOwnProfile, fetchAllOrgs } from "../../../lib/supabaseService";
import { supabase } from "../../../lib/supabase";

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-neutral-100 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-neutral-100 text-neutral-500 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-neutral-400">{label}</div>
        <div className="text-[13px] text-neutral-800 font-['Lexend:Medium',_sans-serif] truncate">
          {value || "—"}
        </div>
      </div>
    </div>
  );
}

function formatRole(role: string): string {
  return (role || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ProfilePage() {
  const { userProfile } = useAuth();
  const [fullName, setFullName] = useState(userProfile?.fullName || "");
  const [orgName, setOrgName] = useState<string>("—");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");
  const [pwError, setPwError] = useState("");

  useEffect(() => {
    if (!userProfile?.departmentId) return;
    fetchAllOrgs().then((orgs) => {
      const org = orgs.find((o) => o.id === userProfile.departmentId);
      if (org) setOrgName(org.name);
    });
  }, [userProfile?.departmentId]);

  const initials = (userProfile?.fullName || "?")
    .split(" ")
    .map((p) => p[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

  const handleSaveName = async () => {
    if (!userProfile?.uid || !fullName.trim()) return;
    setSaving(true);
    setSaveMsg("");
    try {
      await updateOwnProfile(userProfile.uid, { full_name: fullName.trim() });
      setSaveMsg("Saved.");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      setSaveMsg("Failed to save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwMsg("");
    if (newPassword.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPwMsg("Password updated.");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPwMsg(""), 2500);
    } catch (err: any) {
      setPwError(err?.message || "Failed to update password.");
    } finally {
      setPwSaving(false);
    }
  };

  const workload = userProfile?.workload ?? 0;
  const burnout = userProfile?.burnoutLevel || "low";
  const burnoutColor =
    burnout === "high"
      ? "text-red-600 bg-red-50"
      : burnout === "medium"
        ? "text-amber-600 bg-amber-50"
        : "text-emerald-600 bg-emerald-50";

  return (
    <div className="p-8 h-full bg-neutral-50 overflow-y-auto">
      <div className="mb-6">
        <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">
          My Workspace · Account
        </div>
        <h1 className="text-[22px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
          Profile & Settings
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl">
        {/* Identity card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 md:col-span-2">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[18px] font-['Lexend:SemiBold',_sans-serif]">
              {initials}
            </div>
            <div>
              <div className="text-[15px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
                {userProfile?.fullName}
              </div>
              <div className="inline-flex items-center gap-1 mt-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-neutral-600">
                <Shield size={10} /> {formatRole(userProfile?.role || "")}
              </div>
            </div>
          </div>

          <InfoRow icon={<Mail size={14} />} label="Email" value={userProfile?.email || ""} />
          <InfoRow
            icon={<IdCard size={14} />}
            label="Employee ID"
            value={userProfile?.employeeId || ""}
          />
          <InfoRow icon={<Building2 size={14} />} label="Office / Section" value={orgName} />
        </div>

        {/* Edit name */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
            <User size={14} /> Display Name
          </div>
          <input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full h-9 rounded-lg border border-neutral-200 px-3 text-[13px] outline-none focus:border-neutral-400"
          />
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleSaveName}
              disabled={saving || !fullName.trim()}
              className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {saveMsg && <span className="text-[11px] text-neutral-500">{saveMsg}</span>}
          </div>
        </div>

        {/* Workload snapshot */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
            <Activity size={14} /> Workload Snapshot
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-neutral-500">Current load</span>
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800">
              {workload}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-neutral-100 overflow-hidden mb-3">
            <div
              className="h-full bg-neutral-800 transition-all"
              style={{ width: `${Math.min(workload, 100)}%` }}
            />
          </div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${burnoutColor}`}
          >
            {burnout} burnout risk
          </span>
        </div>

        {/* Change password */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 md:col-span-2">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3 flex items-center gap-2">
            <Lock size={14} /> Change Password
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 px-3 text-[13px] outline-none focus:border-neutral-400"
            />
            <input
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-9 rounded-lg border border-neutral-200 px-3 text-[13px] outline-none focus:border-neutral-400"
            />
          </div>
          {pwError && <div className="text-[11px] text-red-600 mt-2">{pwError}</div>}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={handleChangePassword}
              disabled={pwSaving || !newPassword}
              className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
            >
              {pwSaving ? "Updating…" : "Update Password"}
            </button>
            {pwMsg && <span className="text-[11px] text-emerald-600">{pwMsg}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
```

---

### 4. `src/app/components/Employee/EmployeeContent.tsx` — TARGETED EDIT

**4a. Import the new page.** Add near the top:
```ts
import { ProfilePage } from "./ProfilePage";
```

**4b. Route `settings` to it.** Find the `employeePages` map:
```ts
export const employeePages: Record<
  string,
  Record<string, React.ComponentType>
> = {
  workspace: { /* ... */ },
  empfin: { /* ... */ },
  achievement: { /* ... */ },
};
```
Add a new top-level key:
```ts
export const employeePages: Record<
  string,
  Record<string, React.ComponentType>
> = {
  workspace: { /* unchanged */ },
  empfin: { /* unchanged */ },
  achievement: { /* unchanged */ },
  settings: {
    "Profile & Account": ProfilePage,
  },
};
```
And add the matching default:
```ts
export const employeeDefaultPages: Record<string, string> = {
  workspace: "Active Tasks",
  empfin: "Expense & Liquidation Submission",
  achievement: "Departmental Goals",
  settings: "Profile & Account",
};
```

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

Before reporting this phase done, check your own output against each line below. If any answer is "no," go back and fix it before reporting completion.

- [ ] Did you run the Step 0 SQL exactly as written, with no columns/triggers added or omitted?
- [ ] Does `rowToTask` now map `latestSubmission` from `row.latest_submission`, exactly as specified?
- [ ] Is the new `submitTaskForReview` a full replacement, not a partial patch — does it upload every file in `attachments`, write `task_attachments` rows, and set `latest_submission` on the task row?
- [ ] Did you leave `verifyTask`'s signature exactly as `(taskId, approve, feedback?, actor?)` — no parameter reordering, no renaming?
- [ ] Did you leave `MondayBoard.tsx`'s `SubmissionDetails` and `RejectionNotice` components completely untouched?
- [ ] Does `ProfilePage.tsx` exist at the exact path specified, exporting both a named and default export?
- [ ] Is `settings` now a real key in both `employeePages` and `employeeDefaultPages` in `EmployeeContent.tsx`, pointing at `ProfilePage`?
- [ ] Did `updateOwnProfile` get added to `supabaseService.ts` without modifying the existing admin `updateProfile` function?
- [ ] Did you touch any file, function, or import not explicitly listed in this document? If yes, revert those changes.
- [ ] Does the project still compile / type-check with no new errors introduced?

---

## TESTING CHECKLIST

**New functionality (this phase):**
- [ ] Employee opens a `todo`/`in_progress` task → clicks Submit → fills note, attaches a file → submits
- [ ] File appears in Supabase Storage under `task-attachments/{taskId}/{submitterId}/...`
- [ ] A row appears in `task_attachments` table with correct `file_path`
- [ ] `tasks.latest_submission` is populated with note, submitter, timestamp, and a working attachment URL
- [ ] MondayBoard's task card (dept head view) now shows the `SubmissionDetails` block with the note and a clickable attachment link that opens the file
- [ ] Dept head rejects with feedback → employee sees `RejectionNotice` with the note; task status returns to `in_progress`
- [ ] Dept head approves with feedback → task status becomes `completed`, `feedback` field holds the approval note
- [ ] Clicking the sidebar settings icon as an employee → loads Profile & Account page, not blank dashboard
- [ ] Profile page shows correct name, email, employee ID, org/section name, role badge, workload %, burnout pill
- [ ] Editing display name and saving → `profiles.full_name` updates in Supabase, reflected on next reload
- [ ] Attempting to change password with mismatched confirm → shows inline error, no request sent
- [ ] Changing password successfully → can log out and back in with the new password
- [ ] (Security) Using browser devtools, attempt a direct Supabase client call updating your own `role` to `super_admin` while logged in as employee → trigger silently reverts it, role stays `employee`

**Regression check (should already work, confirm untouched):**
- [ ] Employee task list still correctly filtered to only their assigned/team tasks
- [ ] Status change todo → in_progress via Execute button still works
- [ ] Notification bell still shows real-time notifications and unread count
- [ ] Reassigning a task from DeptHead still appears instantly in the employee's board