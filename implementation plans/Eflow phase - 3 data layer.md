# eFlow — Phase 3: Data Layer Migration (Firebase → Supabase)
## Claude Code Implementation Prompt

---

## CONTEXT

Phase 1 (org tree, Supabase schema, super admin) and Phase 2 (Supabase Auth, RBAC) are complete and working.

Phase 3 replaces ALL remaining Firebase RTDB services with Supabase equivalents. After this phase, Firebase is completely gone from the app except `src/firebase.ts` which is kept only for FCM push notifications (Phase 7).

**Supabase credentials:**
```
VITE_SUPABASE_URL=https://ixnfphgjyelhckjwjkdv.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_s0LWw094r4gy5BoYqKFOSw_bU8qChg0
```

---

## CRITICAL RULE: KEEP ALL FUNCTION SIGNATURES IDENTICAL

`MondayBoard.tsx` (4334 lines), `DeptHeadContent.tsx`, `EmployeeContent.tsx`, `ProposalImport.tsx` all import from the services being replaced. **Do NOT change any exported function name, parameter, or return type.** Only change the implementation inside. If the signature changes, those 4 components all break.

---

## STEP 0 — RUN THIS SQL IN SUPABASE FIRST

```sql
-- ─── Tasks ───────────────────────────────────────────────────────
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending_assignment'
    CHECK (status IN ('pending_assignment','todo','in_progress','for_review','completed')),
  priority TEXT DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assignee_name TEXT DEFAULT '',
  team_id TEXT DEFAULT '',
  team_name TEXT DEFAULT '',
  team_member_ids UUID[] DEFAULT '{}',
  team_member_names TEXT[] DEFAULT '{}',
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  department TEXT DEFAULT '',
  deadline TEXT DEFAULT '',
  due_date TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  feedback TEXT DEFAULT '',
  rejection_note TEXT DEFAULT '',
  rejected_at TIMESTAMPTZ,
  reopen_reason TEXT DEFAULT '',
  reopened_at TIMESTAMPTZ,
  reopened_by_id UUID REFERENCES profiles(id),
  reopened_by_name TEXT DEFAULT '',
  recommended_employee_ids UUID[] DEFAULT '{}',
  recommendation_reasoning TEXT DEFAULT '',
  recommendation_source TEXT DEFAULT '',
  recommendation_lead_id UUID REFERENCES profiles(id),
  burnout_warning BOOLEAN DEFAULT FALSE,
  proposal_id TEXT DEFAULT '',
  proposal_title TEXT DEFAULT '',
  program_id TEXT DEFAULT '',
  program_title TEXT DEFAULT '',
  project_id TEXT DEFAULT '',
  project_title TEXT DEFAULT '',
  activity_id TEXT DEFAULT '',
  activity_title TEXT DEFAULT '',
  activity_schedule TEXT DEFAULT '',
  hierarchy_path TEXT DEFAULT '',
  import_batch_id TEXT DEFAULT '',
  audit_hash TEXT DEFAULT '',
  barangay TEXT DEFAULT '',
  estimated_hours FLOAT DEFAULT 0,
  budget_impact FLOAT DEFAULT 0,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX ON tasks (org_id);
CREATE INDEX ON tasks (assigned_to);
CREATE INDEX ON tasks (status);
CREATE INDEX ON tasks (import_batch_id);
CREATE INDEX ON tasks (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX ON tasks (created_at DESC);

-- ─── Task Status History (for Process Mining Phase 8) ────────────
CREATE TABLE task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT,
  to_status TEXT NOT NULL,
  actor_id UUID REFERENCES profiles(id),
  actor_name TEXT DEFAULT '',
  note TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON task_status_history (task_id);
CREATE INDEX ON task_status_history (created_at);

-- ─── Task Activities (comments + audit log feed) ─────────────────
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES profiles(id),
  actor_name TEXT DEFAULT '',
  type TEXT NOT NULL,
  content TEXT DEFAULT '',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON task_activities (task_id, created_at DESC);

-- ─── Task Attachments ─────────────────────────────────────────────
CREATE TABLE task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES profiles(id),
  uploader_name TEXT DEFAULT '',
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER DEFAULT 0,
  mime_type TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON task_attachments (task_id);

-- ─── Employee Notes ───────────────────────────────────────────────
CREATE TABLE employee_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  strengths TEXT DEFAULT '',
  weaknesses TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  tags TEXT[] DEFAULT '{}',
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX ON employee_notes (profile_id);

-- ─── Notifications ────────────────────────────────────────────────
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  task_title TEXT DEFAULT '',
  actor_id UUID REFERENCES profiles(id),
  actor_name TEXT DEFAULT '',
  status_from TEXT DEFAULT '',
  status_to TEXT DEFAULT '',
  reason TEXT DEFAULT '',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON notifications (user_id, read);
CREATE INDEX ON notifications (created_at DESC);

-- ─── RLS Policies ─────────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Tasks: all auth users can read/write (org filtering done in app layer)
CREATE POLICY "tasks_all_auth" ON tasks FOR ALL USING (auth.uid() IS NOT NULL);

-- History: all auth users can read/write
CREATE POLICY "history_all_auth" ON task_status_history FOR ALL USING (auth.uid() IS NOT NULL);

-- Activities: all auth users can read/write
CREATE POLICY "activities_all_auth" ON task_activities FOR ALL USING (auth.uid() IS NOT NULL);

-- Attachments: all auth users can read/write
CREATE POLICY "attachments_all_auth" ON task_attachments FOR ALL USING (auth.uid() IS NOT NULL);

-- Employee notes: only dept_head/team_leader/super_admin
CREATE POLICY "notes_privileged" ON employee_notes FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role IN ('super_admin','dept_head','team_leader')
  ));

-- Notifications: users see only their own
CREATE POLICY "notifs_own" ON notifications FOR ALL USING (user_id = auth.uid());

-- ─── updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Enable realtime on new tables ───────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activities;
```

Also create a Supabase Storage bucket:
- Name: `task-attachments`
- Public: false (private, access via signed URLs)
- Do this in Supabase Dashboard → Storage → New Bucket

---

## FILES TO CREATE / MODIFY

---

### 1. `src/app/services/taskService.ts` — FULL REWRITE

Keep every single export identical. Only change the implementation.

**Imports:**
```ts
import { supabase } from '../../lib/supabase';
import { createNotification } from './notificationService';
// Remove ALL firebase imports
```

**Type exports** (keep 100% identical to current):
```ts
export type TaskStatus = 'pending_assignment' | 'todo' | 'in_progress' | 'for_review' | 'completed';
export interface TaskAssignmentDetails { teamId?: string; teamName?: string; teamMemberIds?: string[]; teamMemberNames?: string[]; }
export interface TaskHierarchy { proposalId?: string; proposalTitle?: string; programId?: string; programTitle?: string; projectId?: string; projectTitle?: string; activityId?: string; activityTitle?: string; activitySchedule?: string; hierarchyPath?: string; importBatchId?: string; }
export interface Task extends TaskHierarchy { /* all fields exactly as in current file */ }
export interface TaskSubmissionMetadata { note: string; submitterId: string; submitterName: string; submittedAt: number; attachments: string[]; }
export interface TaskSubmissionInput { /* same */ }
export interface TaskActor { /* same */ }
export interface TaskUndoInput { /* same */ }
export interface TaskActivity { id: string; type: string; actorId: string; actorName: string; content: string; metadata?: Record<string,unknown>; createdAt: number; }
export interface CreateTaskPayload { /* same as current */ }
export interface UpdateTaskPayload { /* same as current */ }
```

**Column mapping** (Supabase snake_case ↔ TypeScript camelCase):
```ts
// Helper: convert Supabase row → Task object
function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) || '',
    status: row.status as TaskStatus,
    priority: (row.priority as 'low'|'medium'|'high') || 'medium',
    assigneeId: row.assigned_to as string || undefined,
    assignedTo: row.assigned_to as string || undefined,
    assigneeName: (row.assignee_name as string) || undefined,
    department: (row.department as string) || undefined,
    teamId: (row.team_id as string) || undefined,
    teamName: (row.team_name as string) || undefined,
    teamMemberIds: (row.team_member_ids as string[]) || [],
    teamMemberNames: (row.team_member_names as string[]) || [],
    deadline: (row.deadline as string) || undefined,
    dueDate: (row.due_date as string) || undefined,
    tags: (row.tags as string[]) || [],
    feedback: (row.feedback as string) || undefined,
    rejectionNote: (row.rejection_note as string) || undefined,
    rejectedAt: row.rejected_at ? new Date(row.rejected_at as string).getTime() : undefined,
    reopenReason: (row.reopen_reason as string) || undefined,
    reopenedAt: row.reopened_at ? new Date(row.reopened_at as string).getTime() : undefined,
    reopenedById: (row.reopened_by_id as string) || undefined,
    reopenedByName: (row.reopened_by_name as string) || undefined,
    recommendedEmployeeIds: (row.recommended_employee_ids as string[]) || [],
    recommendationReasoning: (row.recommendation_reasoning as string) || undefined,
    recommendationSource: (row.recommendation_source as 'llm'|'fallback'|'import') || undefined,
    recommendationLeadId: (row.recommendation_lead_id as string) || undefined,
    burnoutWarning: (row.burnout_warning as boolean) || false,
    proposalId: (row.proposal_id as string) || undefined,
    proposalTitle: (row.proposal_title as string) || undefined,
    programId: (row.program_id as string) || undefined,
    programTitle: (row.program_title as string) || undefined,
    projectId: (row.project_id as string) || undefined,
    projectTitle: (row.project_title as string) || undefined,
    activityId: (row.activity_id as string) || undefined,
    activityTitle: (row.activity_title as string) || undefined,
    activitySchedule: (row.activity_schedule as string) || undefined,
    hierarchyPath: (row.hierarchy_path as string) || undefined,
    importBatchId: (row.import_batch_id as string) || undefined,
    auditHash: (row.audit_hash as string) || undefined,
    barangay: (row.barangay as string) || undefined,
    estimatedHours: (row.estimated_hours as number) || undefined,
    budgetImpact: (row.budget_impact as number) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

// Helper: convert Task fields → Supabase insert/update object
function taskToRow(task: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description;
  if (task.status !== undefined) row.status = task.status;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.assigneeId !== undefined) row.assigned_to = task.assigneeId || null;
  if (task.assignedTo !== undefined) row.assigned_to = task.assignedTo || null;
  if (task.assigneeName !== undefined) row.assignee_name = task.assigneeName;
  if (task.department !== undefined) row.department = task.department;
  if (task.teamId !== undefined) row.team_id = task.teamId;
  if (task.teamName !== undefined) row.team_name = task.teamName;
  if (task.teamMemberIds !== undefined) row.team_member_ids = task.teamMemberIds;
  if (task.teamMemberNames !== undefined) row.team_member_names = task.teamMemberNames;
  if (task.deadline !== undefined) row.deadline = task.deadline;
  if (task.dueDate !== undefined) row.due_date = task.dueDate;
  if (task.tags !== undefined) row.tags = task.tags;
  if (task.feedback !== undefined) row.feedback = task.feedback;
  if (task.rejectionNote !== undefined) row.rejection_note = task.rejectionNote;
  if (task.rejectedAt !== undefined) row.rejected_at = task.rejectedAt ? new Date(task.rejectedAt).toISOString() : null;
  if (task.reopenReason !== undefined) row.reopen_reason = task.reopenReason;
  if (task.reopenedAt !== undefined) row.reopened_at = task.reopenedAt ? new Date(task.reopenedAt).toISOString() : null;
  if (task.reopenedById !== undefined) row.reopened_by_id = task.reopenedById || null;
  if (task.reopenedByName !== undefined) row.reopened_by_name = task.reopenedByName;
  if (task.recommendedEmployeeIds !== undefined) row.recommended_employee_ids = task.recommendedEmployeeIds;
  if (task.recommendationReasoning !== undefined) row.recommendation_reasoning = task.recommendationReasoning;
  if (task.recommendationSource !== undefined) row.recommendation_source = task.recommendationSource;
  if (task.recommendationLeadId !== undefined) row.recommendation_lead_id = task.recommendationLeadId || null;
  if (task.burnoutWarning !== undefined) row.burnout_warning = task.burnoutWarning;
  if (task.proposalId !== undefined) row.proposal_id = task.proposalId;
  if (task.proposalTitle !== undefined) row.proposal_title = task.proposalTitle;
  if (task.programId !== undefined) row.program_id = task.programId;
  if (task.programTitle !== undefined) row.program_title = task.programTitle;
  if (task.projectId !== undefined) row.project_id = task.projectId;
  if (task.projectTitle !== undefined) row.project_title = task.projectTitle;
  if (task.activityId !== undefined) row.activity_id = task.activityId;
  if (task.activityTitle !== undefined) row.activity_title = task.activityTitle;
  if (task.activitySchedule !== undefined) row.activity_schedule = task.activitySchedule;
  if (task.hierarchyPath !== undefined) row.hierarchy_path = task.hierarchyPath;
  if (task.importBatchId !== undefined) row.import_batch_id = task.importBatchId;
  if (task.auditHash !== undefined) row.audit_hash = task.auditHash;
  if (task.barangay !== undefined) row.barangay = task.barangay;
  if (task.estimatedHours !== undefined) row.estimated_hours = task.estimatedHours;
  if (task.budgetImpact !== undefined) row.budget_impact = task.budgetImpact;
  return row;
}
```

**Function implementations:**

```ts
// ─── Local listener system (same pattern as supabaseService) ──────
const taskListeners = new Set<(tasks: Task[]) => void>();

async function notifyTaskListeners() {
  try {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });
    if (data) {
      const tasks = data.map(rowToTask);
      taskListeners.forEach(cb => { try { cb(tasks); } catch(e) { console.error(e); } });
    }
  } catch(err) { console.error('Error notifying task listeners:', err); }
}

// ─── subscribeToTasks ─────────────────────────────────────────────
export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  taskListeners.add(callback);

  // Initial load
  supabase
    .from('tasks')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      if (data) callback(data.map(rowToTask));
    });

  // Supabase realtime
  const channel = supabase
    .channel('tasks-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      notifyTaskListeners();
    })
    .subscribe();

  return () => {
    taskListeners.delete(callback);
    supabase.removeChannel(channel);
  };
};

// ─── seedTasksIfEmpty ─────────────────────────────────────────────
export const seedTasksIfEmpty = async () => {
  const { count } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .is('deleted_at', null);
  
  if ((count ?? 0) > 0) return; // already has data

  // Import seed data and insert into Supabase
  const { TASK_SEED } = await import('./eflowSeedData');
  const rows = TASK_SEED.map((t: any) => ({
    title: t.title,
    description: t.description || '',
    status: t.status || 'pending_assignment',
    priority: t.priority || 'medium',
    department: t.department || '',
    deadline: t.deadline || '',
    tags: t.tags || [],
    created_at: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }));
  await supabase.from('tasks').insert(rows);
  await notifyTaskListeners();
};

// ─── createTask ───────────────────────────────────────────────────
export const createTask = async (
  payload: CreateTaskPayload,
  actorId?: string,
  actorName?: string,
): Promise<Task> => {
  const row = taskToRow(payload as Partial<Task>);
  if (actorId) row.created_by = actorId;
  
  const { data, error } = await supabase
    .from('tasks')
    .insert(row)
    .select()
    .single();
  
  if (error) throw error;
  const task = rowToTask(data);
  
  // Log status history
  await supabase.from('task_status_history').insert({
    task_id: task.id,
    from_status: null,
    to_status: task.status,
    actor_id: actorId || null,
    actor_name: actorName || '',
    note: 'Task created',
  });

  await notifyTaskListeners();
  return task;
};

// ─── assignTask ───────────────────────────────────────────────────
export const assignTask = async (
  taskId: string,
  assigneeId: string,
  assigneeName: string,
  assignment?: TaskAssignmentDetails,
) => {
  const update: Record<string, unknown> = {
    assigned_to: assigneeId || null,
    assignee_name: assigneeName,
    status: 'todo',
  };
  if (assignment) {
    if (assignment.teamId) update.team_id = assignment.teamId;
    if (assignment.teamName) update.team_name = assignment.teamName;
    if (assignment.teamMemberIds) update.team_member_ids = assignment.teamMemberIds;
    if (assignment.teamMemberNames) update.team_member_names = assignment.teamMemberNames;
  }

  const { error } = await supabase.from('tasks').update(update).eq('id', taskId);
  if (error) throw error;

  // Notify assignee
  if (assigneeId) {
    await createNotification(assigneeId, {
      type: 'assignment',
      title: 'New Task Assigned',
      message: `You have been assigned a new task.`,
      taskId,
      actorName: assigneeName,
      statusTo: 'todo',
    });
  }

  await notifyTaskListeners();
};

// ─── updateTask ───────────────────────────────────────────────────
export const updateTask = async (taskId: string, updates: UpdateTaskPayload): Promise<void> => {
  const row = taskToRow(updates as Partial<Task>);
  const { error } = await supabase.from('tasks').update(row).eq('id', taskId);
  if (error) throw error;
  await notifyTaskListeners();
};

// ─── updateTaskStatus ─────────────────────────────────────────────
export const updateTaskStatus = async (
  taskId: string,
  newStatus: TaskStatus,
  actor: TaskActor,
  note?: string,
): Promise<void> => {
  // Get current status for history
  const { data: current } = await supabase.from('tasks').select('status, assigned_to').eq('id', taskId).single();
  const fromStatus = current?.status;

  await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
  
  // Log status history (critical for Process Mining)
  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: fromStatus || null,
    to_status: newStatus,
    actor_id: actor.id || null,
    actor_name: actor.name || '',
    note: note || '',
  });

  await notifyTaskListeners();
};

// ─── submitTaskForReview ──────────────────────────────────────────
export const submitTaskForReview = async (
  taskId: string,
  input: TaskSubmissionInput,
): Promise<void> => {
  await supabase.from('tasks').update({
    status: 'for_review',
    feedback: input.note || '',
  }).eq('id', taskId);

  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: 'in_progress',
    to_status: 'for_review',
    actor_id: input.submitterId || null,
    actor_name: input.submitterName || '',
    note: input.note || 'Submitted for review',
  });

  await notifyTaskListeners();
};

// ─── verifyTask ───────────────────────────────────────────────────
export const verifyTask = async (
  taskId: string,
  actor: TaskActor,
  verified: boolean,
  rejectionNote?: string,
): Promise<void> => {
  const newStatus = verified ? 'completed' : 'in_progress';
  const update: Record<string, unknown> = { status: newStatus };
  if (!verified && rejectionNote) {
    update.rejection_note = rejectionNote;
    update.rejected_at = new Date().toISOString();
  }

  await supabase.from('tasks').update(update).eq('id', taskId);
  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: 'for_review',
    to_status: newStatus,
    actor_id: actor.id || null,
    actor_name: actor.name || '',
    note: verified ? 'Task verified and completed' : (rejectionNote || 'Rejected'),
  });

  await notifyTaskListeners();
};

// ─── deleteTask ───────────────────────────────────────────────────
export const deleteTask = async (taskId: string): Promise<void> => {
  // Soft delete
  await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId);
  await notifyTaskListeners();
};

// ─── reassignTask ─────────────────────────────────────────────────
export const reassignTask = async (
  taskId: string,
  newAssigneeId: string,
  newAssigneeName: string,
  actor: TaskActor,
  reason?: string,
): Promise<void> => {
  await supabase.from('tasks').update({
    assigned_to: newAssigneeId || null,
    assignee_name: newAssigneeName,
    status: 'todo',
  }).eq('id', taskId);

  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: null,
    to_status: 'todo',
    actor_id: actor.id || null,
    actor_name: actor.name || '',
    note: reason || `Reassigned to ${newAssigneeName}`,
  });

  if (newAssigneeId) {
    await createNotification(newAssigneeId, {
      type: 'reassignment',
      title: 'Task Reassigned to You',
      message: reason || `A task has been reassigned to you by ${actor.name}.`,
      taskId,
      actorName: actor.name,
    });
  }

  await notifyTaskListeners();
};

// ─── undoCompletedTask ────────────────────────────────────────────
export const undoCompletedTask = async (
  taskId: string,
  input: TaskUndoInput,
): Promise<void> => {
  await supabase.from('tasks').update({
    status: 'in_progress',
    reopen_reason: input.reason || '',
    reopened_at: new Date().toISOString(),
    reopened_by_id: input.actorId || null,
    reopened_by_name: input.actorName || '',
  }).eq('id', taskId);

  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: 'completed',
    to_status: 'in_progress',
    actor_id: input.actorId || null,
    actor_name: input.actorName || '',
    note: input.reason || 'Task reopened',
  });

  await notifyTaskListeners();
};

// ─── logTaskActivity ──────────────────────────────────────────────
export async function logTaskActivity(
  taskId: string,
  actor: TaskActor,
  type: string,
  content: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await supabase.from('task_activities').insert({
    task_id: taskId,
    actor_id: actor.id || null,
    actor_name: actor.name || '',
    type,
    content,
    metadata: metadata || {},
  });
}

// ─── subscribeToTaskActivities ────────────────────────────────────
export function subscribeToTaskActivities(
  taskId: string,
  callback: (activities: TaskActivity[]) => void,
): () => void {
  const load = async () => {
    const { data } = await supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });
    if (data) {
      callback(data.map(row => ({
        id: row.id,
        type: row.type,
        actorId: row.actor_id || '',
        actorName: row.actor_name || '',
        content: row.content || '',
        metadata: row.metadata || {},
        createdAt: new Date(row.created_at).getTime(),
      })));
    }
  };
  load();

  const channel = supabase
    .channel(`task-activities-${taskId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'task_activities',
      filter: `task_id=eq.${taskId}`,
    }, () => load())
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

---

### 2. `src/app/services/employeeService.ts` — FULL REWRITE

Keep `Employee` interface and all exports identical. Bridge `UserProfile` → `Employee`.

```ts
import { supabase } from '../../lib/supabase';
import type { UserProfile } from '../types';

// Keep Employee interface IDENTICAL to current
export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  jobDescription: string;
  currentWorkload: number;
  department?: string;
  departmentName?: string;
  initials?: string;
  email?: string;
}

// Bridge: convert UserProfile → Employee (for LLM service compatibility)
function profileToEmployee(profile: UserProfile, orgName?: string): Employee {
  const parts = (profile.full_name || '').split(' ');
  const initials = parts.map(p => p[0]?.toUpperCase() || '').join('').slice(0, 2) || '??';
  return {
    id: profile.id,
    name: profile.full_name,
    jobTitle: formatRole(profile.role),
    jobDescription: Object.keys(profile.skills || {})
      .filter(k => (profile.skills as Record<string,boolean>)[k])
      .join(', ') || `${formatRole(profile.role)} at ${orgName || 'LEDIPO'}`,
    currentWorkload: profile.workload || 0,
    department: profile.org_id || '',
    departmentName: orgName || profile.org_id || '',
    initials,
    email: profile.email,
  };
}

function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// Local listener system
const employeeListeners = new Set<(employees: Employee[]) => void>();

async function loadAndNotify() {
  // Fetch all active, non-super_admin profiles
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*, organizations(name)')
    .eq('is_active', true)
    .neq('role', 'super_admin')
    .order('full_name');

  if (!profiles) return [];
  
  const employees = profiles.map((p: any) => 
    profileToEmployee(p as UserProfile, p.organizations?.name)
  );
  
  employeeListeners.forEach(cb => { try { cb(employees); } catch(e) { console.error(e); } });
  return employees;
}

// subscribeToEmployees — keep same signature
export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
  employeeListeners.add(callback);
  loadAndNotify().then(employees => callback(employees));

  const channel = supabase
    .channel('profiles-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      loadAndNotify();
    })
    .subscribe();

  return () => {
    employeeListeners.delete(callback);
    supabase.removeChannel(channel);
  };
};

// getEmployeeById
export const getEmployeeById = async (id: string): Promise<Employee | null> => {
  const { data } = await supabase
    .from('profiles')
    .select('*, organizations(name)')
    .eq('id', id)
    .single();
  if (!data) return null;
  return profileToEmployee(data as any, (data as any).organizations?.name);
};

// updateEmployeeWorkload
export const updateEmployeeWorkload = async (id: string, workload: number): Promise<void> => {
  await supabase.from('profiles').update({ workload }).eq('id', id);
  await loadAndNotify();
};

// Keep SeedEmployee export for backward compat (components may reference it)
export type { Employee as SeedEmployee };
```

---

### 3. `src/app/services/notificationService.ts` — FULL REWRITE

Keep ALL exports identical.

```ts
import { supabase } from '../../lib/supabase';

// Keep ALL type exports IDENTICAL
export type NotificationType = 
  | 'assignment' | 'overdue' | 'burnout_warning' | 'approval_needed'
  | 'completed' | 'reassignment' | 'status_change' | 'undo' | 'comment';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  taskTitle?: string;
  actorId?: string;
  actorName?: string;
  statusFrom?: string;
  statusTo?: string;
  reason?: string;
  read: boolean;
  createdAt: number;
}

function rowToNotif(row: Record<string, unknown>): Notification {
  return {
    id: row.id as string,
    type: (row.type as NotificationType) || 'assignment',
    title: (row.title as string) || '',
    message: (row.message as string) || '',
    taskId: (row.task_id as string) || undefined,
    taskTitle: (row.task_title as string) || undefined,
    actorId: (row.actor_id as string) || undefined,
    actorName: (row.actor_name as string) || undefined,
    statusFrom: (row.status_from as string) || undefined,
    statusTo: (row.status_to as string) || undefined,
    reason: (row.reason as string) || undefined,
    read: (row.read as boolean) || false,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

// subscribeToNotifications — keep same signature
export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  limit = 50,
) {
  const load = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (data) callback(data.map(rowToNotif));
  };
  load();

  const channel = supabase
    .channel(`notifs-${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, () => load())
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// createNotification — keep same signature
export async function createNotification(
  userId: string,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    taskId?: string;
    taskTitle?: string;
    actorId?: string;
    actorName?: string;
    statusFrom?: string;
    statusTo?: string;
    reason?: string;
  },
): Promise<void> {
  await supabase.from('notifications').insert({
    user_id: userId,
    type: data.type,
    title: data.title,
    message: data.message,
    task_id: data.taskId || null,
    task_title: data.taskTitle || '',
    actor_id: data.actorId || null,
    actor_name: data.actorName || '',
    status_from: data.statusFrom || '',
    status_to: data.statusTo || '',
    reason: data.reason || '',
    read: false,
  });
}

// markNotificationRead
export async function markNotificationRead(notifId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', notifId);
}

// markAllNotificationsRead
export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true })
    .eq('user_id', userId).eq('read', false);
}

// getUnreadCount
export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}
```

---

### 4. `src/app/services/employeeNotesService.ts` — FULL REWRITE

```ts
import { supabase } from '../../lib/supabase';

// Keep types IDENTICAL
export interface EmployeeNote {
  employeeId: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  tags: string[];
  updatedAt: number;
  updatedBy?: string;
}
export type EmployeeNotesMap = Record<string, EmployeeNote>;

// subscribeToEmployeeNotes — keep same signature
export const subscribeToEmployeeNotes = (callback: (notes: EmployeeNotesMap) => void) => {
  const load = async () => {
    const { data } = await supabase.from('employee_notes').select('*');
    if (!data) { callback({}); return; }
    const map: EmployeeNotesMap = {};
    data.forEach(row => {
      map[row.profile_id] = {
        employeeId: row.profile_id,
        strengths: row.strengths || '',
        weaknesses: row.weaknesses || '',
        notes: row.notes || '',
        tags: row.tags || [],
        updatedAt: new Date(row.updated_at).getTime(),
        updatedBy: row.updated_by || undefined,
      };
    });
    callback(map);
  };
  load();
  return () => {};  // no realtime needed for notes
};

// updateEmployeeNotes — keep same signature
export const updateEmployeeNotes = async (
  employeeId: string,
  updates: Partial<EmployeeNote>,
  updatedById?: string,
): Promise<void> => {
  await supabase.from('employee_notes').upsert({
    profile_id: employeeId,
    strengths: updates.strengths || '',
    weaknesses: updates.weaknesses || '',
    notes: updates.notes || '',
    tags: updates.tags || [],
    updated_by: updatedById || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'profile_id' });
};
```

---

### 5. `src/app/services/workflowService.ts` — SIMPLIFY (remove Firebase)

```ts
// No Firebase. Workflow statuses are constants — LEDIPO doesn't need to customize them.

export interface WorkflowStatus {
  id: string;
  label: string;
  color: string;
  textColor: string;
  order: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  statuses: WorkflowStatus[];
}

export const DEFAULT_WORKFLOW_STATUSES: WorkflowStatus[] = [
  { id: 'pending_assignment', label: 'Pending Assignment', color: 'bg-gray-200', textColor: 'text-gray-800', order: 0 },
  { id: 'todo', label: 'To Do', color: 'bg-blue-200', textColor: 'text-blue-800', order: 1 },
  { id: 'in_progress', label: 'In Progress', color: 'bg-yellow-200', textColor: 'text-yellow-800', order: 2 },
  { id: 'for_review', label: 'For Review', color: 'bg-purple-200', textColor: 'text-purple-800', order: 3 },
  { id: 'completed', label: 'Completed', color: 'bg-green-200', textColor: 'text-green-800', order: 4 },
];

export const DEFAULT_TEMPLATE: WorkflowTemplate = {
  id: 'default',
  name: 'Standard LGU Workflow',
  statuses: DEFAULT_WORKFLOW_STATUSES,
};

// Keep same function signatures so nothing breaks
export async function seedWorkflowTemplateIfEmpty(): Promise<void> {
  // No-op: statuses are hardcoded constants now
}

export function subscribeToWorkflowTemplate(
  _templateId: string,
  callback: (template: WorkflowTemplate) => void,
): () => void {
  // Immediately return the default template
  setTimeout(() => callback(DEFAULT_TEMPLATE), 0);
  return () => {};
}

export async function getWorkflowTemplate(_templateId: string): Promise<WorkflowTemplate> {
  return DEFAULT_TEMPLATE;
}
```

---

### 6. `src/app/hooks/useFirebaseData.ts` — REPLACE WITH SUPABASE

**Do NOT delete this file** — too many components import from it. Instead, replace the implementation while keeping ALL exports identical.

Rename it internally but keep the file at the same path.

```ts
// ─── useFirebaseData.ts (now backed by Supabase) ─────────────────
// File kept at same path for import compatibility.
// All hooks now use Supabase under the hood.

import { useState, useEffect } from 'react';
import { subscribeToTasks } from '../services/taskService';
import { subscribeToEmployees } from '../services/employeeService';
import { subscribeToEmployeeNotes } from '../services/employeeNotesService';
import { fetchAllProfiles, subscribeToProfiles, fetchAllOrgs, subscribeToOrgs } from '../../lib/supabaseService';
import type { UserProfile, Department, Task } from '../types';
import type { Employee } from '../services/employeeService';
import type { EmployeeNotesMap } from '../services/employeeNotesService';

// ─── useUsers ─────────────────────────────────────────────────────
export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAllProfiles().then(data => { setUsers(data); setLoading(false); });
    const unsub = subscribeToProfiles(data => setUsers(data));
    return unsub;
  }, []);

  return { users, loading };
}

// ─── useDepartments ───────────────────────────────────────────────
// Maps Organization to Department shape for backward compat
export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const orgs = await fetchAllOrgs();
      setDepartments(orgs.map(org => ({
        id: org.id,
        name: org.name,
        description: org.description || '',
        headUserId: org.head_user_id || '',
        employeeCount: 0,
        status: org.is_active ? 'active' : 'archived',
        createdAt: new Date(org.created_at).getTime(),
      })));
      setLoading(false);
    };
    load();
    const unsub = subscribeToOrgs(orgs => {
      setDepartments(orgs.map(org => ({
        id: org.id,
        name: org.name,
        description: org.description || '',
        headUserId: org.head_user_id || '',
        employeeCount: 0,
        status: org.is_active ? 'active' : 'archived',
        createdAt: new Date(org.created_at).getTime(),
      })));
    });
    return unsub;
  }, []);

  return { departments, loading };
}

// ─── useTasks ─────────────────────────────────────────────────────
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToTasks(data => {
      setTasks(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { tasks, loading };
}

// ─── useEmployees ─────────────────────────────────────────────────
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToEmployees(data => {
      setEmployees(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { employees, loading };
}

// ─── useEmployeeNotes ─────────────────────────────────────────────
export function useEmployeeNotes() {
  const [notes, setNotes] = useState<EmployeeNotesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToEmployeeNotes(data => {
      setNotes(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { notes, loading };
}

// ─── useProjects (stub — projects table comes in Phase 4) ─────────
export function useProjects() {
  return { projects: [], loading: false };
}
```

---

### 7. CLEANUP — Remove Firebase from non-auth files

After the service rewrites above, these files should have zero Firebase imports:
- `src/app/services/taskService.ts` ✓
- `src/app/services/employeeService.ts` ✓
- `src/app/services/notificationService.ts` ✓
- `src/app/services/employeeNotesService.ts` ✓
- `src/app/services/workflowService.ts` ✓
- `src/app/hooks/useFirebaseData.ts` ✓

**Files to DELETE** (no longer needed):
- `src/app/services/firebaseService.ts`
- `src/app/services/seedRoles.ts`

**Files to KEEP** (still used):
- `src/firebase.ts` — kept for FCM (Phase 7)
- `src/app/services/eflowSeedData.ts` — referenced by seedTasksIfEmpty
- `src/app/services/aiScoringEngine.ts` — local LLM fallback scorer
- `src/app/services/llmService.ts` — connects to Ollama server
- `src/app/services/proposalDecompositionService.ts` — AI PDF decomposer
- `src/app/services/pdsParser.ts` — PDF parsing utility

---

## TESTING CHECKLIST

After implementation verify:
- [ ] DeptHead logs in → MondayBoard loads tasks from Supabase (empty = no crash)
- [ ] Create task in DeptHead → appears in Supabase tasks table
- [ ] Assign task to employee → employee sees it in their panel
- [ ] Employee updates status → change appears in dept head's board in real time
- [ ] Employee submits for review → status changes to `for_review`
- [ ] Dept head verifies task → status changes to `completed`
- [ ] `task_status_history` table has a new row for every status change
- [ ] Notifications created on assignment → appear in notification bell
- [ ] `seedTasksIfEmpty` seeds demo tasks into Supabase when table is empty
- [ ] ProposalImport: upload PDF → AI decomposes → tasks created in Supabase
- [ ] Employee notes: dept head saves notes → appear in Supabase employee_notes
- [ ] No Firebase RTDB calls anywhere except src/firebase.ts (check network tab)