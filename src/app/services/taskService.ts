// â”€â”€â”€ eFlow Task Service (Supabase) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Full rewrite from Firebase RTDB â†’ Supabase PostgreSQL.
// All exported function signatures kept identical.

import { supabase } from '../../lib/supabase';
import { createNotification } from './notificationService';

export type TaskStatus =
  | 'pending_assignment'
  | 'todo'
  | 'in_progress'
  | 'for_review'
  | 'completed';

export interface TaskAssignmentDetails {
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
}

export interface TaskHierarchy {
  proposalId?: string;
  proposalTitle?: string;
  programId?: string;
  programTitle?: string;
  projectId?: string;
  projectTitle?: string;
  activityId?: string;
  activityTitle?: string;
  activitySchedule?: string;
  hierarchyPath?: string;
  importBatchId?: string;
}

export interface Task extends TaskHierarchy {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  assignedTo?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  department?: string;
  orgId?: string;
  priority?: 'low' | 'medium' | 'high';
  deadline?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  auditHash?: string;
  feedback?: string;
  latestSubmission?: TaskSubmissionMetadata;
  rejectionNote?: string;
  rejectedAt?: number;
  reopenReason?: string;
  reopenedAt?: number;
  reopenedById?: string;
  reopenedByName?: string;
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  recommendationSource?: 'llm' | 'fallback' | 'import';
  recommendationLeadId?: string;
  burnoutWarning?: boolean;
  barangay?: string;
  estimatedHours?: number;
  budgetImpact?: number;
  subtaskCount?: number;
  subtaskCompletedCount?: number;
}

export interface TaskSubmissionMetadata {
  note: string;
  submitterId: string;
  submitterName: string;
  submittedAt: number;
  attachments: string[];
}

export interface TaskSubmissionInput {
  note: string;
  attachments?: File[];
  submitterId: string;
  submitterName: string;
}

export interface TaskActor {
  id?: string;
  name?: string;
}

export interface TaskUndoInput {
  reason: string;
  actor?: TaskActor;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  action: string;
  details: string;
  userId?: string;
  userName?: string;
  timestamp: number;
}

export interface CreateTaskPayload {
  title: string;
  description: string;
  deadline: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: TaskStatus;
  department?: string;
  orgId?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  assigneeId?: string;
  assigneeName?: string;
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  recommendationSource?: 'llm' | 'fallback' | 'import';
  recommendationLeadId?: string;
  burnoutWarning?: boolean;
  barangay?: string;
  estimatedHours?: number;
  budgetImpact?: number;
  proposalId?: string;
  proposalTitle?: string;
  programId?: string;
  programTitle?: string;
  projectId?: string;
  projectTitle?: string;
  activityId?: string;
  activityTitle?: string;
  activitySchedule?: string;
  hierarchyPath?: string;
  importBatchId?: string;
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  deadline?: string;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  status?: TaskStatus;
  department?: string;
  orgId?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  assigneeId?: string;
  assigneeName?: string;
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  recommendationSource?: 'llm' | 'fallback' | 'import';
  recommendationLeadId?: string;
  burnoutWarning?: boolean;
  proposalId?: string;
  proposalTitle?: string;
  programId?: string;
  programTitle?: string;
  projectId?: string;
  projectTitle?: string;
  activityId?: string;
  activityTitle?: string;
  activitySchedule?: string;
  hierarchyPath?: string;
  importBatchId?: string;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const readString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;

function rowToTask(row: Record<string, unknown>): Task {
  return {
    id: row.id as string,
    title: (row.title as string) || 'Untitled task',
    description: readString(row.description),
    status: (row.status as TaskStatus) || 'pending_assignment',
    priority: (row.priority as 'low' | 'medium' | 'high') || 'medium',
    assigneeId: readString(row.assigned_to),
    assigneeName: readString(row.assignee_name),
    assignedTo: readString(row.assigned_to),
    teamId: readString(row.team_id),
    teamName: readString(row.team_name),
    teamMemberIds: (row.team_member_ids as string[]) || [],
    teamMemberNames: (row.team_member_names as string[]) || [],
    department: readString(row.department),
    orgId: readString(row.org_id),
    deadline: readString(row.deadline),
    dueDate: readString(row.due_date),
    tags: (row.tags as string[]) || [],
    createdAt: new Date((row.created_at as string) || Date.now()).getTime(),
    updatedAt: new Date((row.updated_at as string) || Date.now()).getTime(),
    auditHash: readString(row.audit_hash),
    feedback: readString(row.feedback),
    latestSubmission: row.latest_submission
      ? (row.latest_submission as TaskSubmissionMetadata)
      : undefined,
    rejectionNote: readString(row.rejection_note),
    rejectedAt: row.rejected_at ? new Date(row.rejected_at as string).getTime() : undefined,
    reopenReason: readString(row.reopen_reason),
    reopenedAt: row.reopened_at ? new Date(row.reopened_at as string).getTime() : undefined,
    reopenedById: readString(row.reopened_by_id),
    reopenedByName: readString(row.reopened_by_name),
    recommendedEmployeeIds: (row.recommended_employee_ids as string[]) || [],
    recommendationReasoning: readString(row.recommendation_reasoning),
    recommendationSource: readString(row.recommendation_source) as Task['recommendationSource'],
    recommendationLeadId: readString(row.recommendation_lead_id),
    burnoutWarning: (row.burnout_warning as boolean) || false,
    proposalId: readString(row.proposal_id),
    proposalTitle: readString(row.proposal_title),
    programId: readString(row.program_id),
    programTitle: readString(row.program_title),
    projectId: readString(row.project_id),
    projectTitle: readString(row.project_title),
    activityId: readString(row.activity_id),
    activityTitle: readString(row.activity_title),
    activitySchedule: readString(row.activity_schedule),
    hierarchyPath: readString(row.hierarchy_path),
    importBatchId: readString(row.import_batch_id),
    barangay: readString(row.barangay),
    estimatedHours: (row.estimated_hours as number) || undefined,
    budgetImpact: (row.budget_impact as number) || undefined,
    subtaskCount: (row.subtask_count as number) || 0,
    subtaskCompletedCount: (row.subtask_completed_count as number) || 0,
  };
}

function taskToRow(task: Partial<Task>): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  if (task.title !== undefined) row.title = task.title;
  if (task.description !== undefined) row.description = task.description;
  if (task.status !== undefined) row.status = task.status;
  if (task.priority !== undefined) row.priority = task.priority;
  if (task.assigneeId !== undefined) row.assigned_to = task.assigneeId || null;
  if (task.assignedTo !== undefined) row.assigned_to = task.assignedTo || null;
  if (task.assigneeName !== undefined) row.assignee_name = task.assigneeName || '';
  if (task.department !== undefined) row.department = task.department || '';
  if (task.orgId !== undefined) row.org_id = task.orgId || null;
  if (task.teamId !== undefined) row.team_id = task.teamId || '';
  if (task.teamName !== undefined) row.team_name = task.teamName || '';
  if (task.teamMemberIds !== undefined) row.team_member_ids = task.teamMemberIds;
  if (task.teamMemberNames !== undefined) row.team_member_names = task.teamMemberNames;
  if (task.deadline !== undefined) { row.deadline = task.deadline; row.due_date = task.deadline; }
  if (task.dueDate !== undefined) row.due_date = task.dueDate;
  if (task.tags !== undefined) row.tags = task.tags;
  if (task.feedback !== undefined) row.feedback = task.feedback;
  if (task.rejectionNote !== undefined) row.rejection_note = task.rejectionNote;
  if (task.rejectedAt !== undefined) row.rejected_at = task.rejectedAt ? new Date(task.rejectedAt).toISOString() : null;
  if (task.reopenReason !== undefined) row.reopen_reason = task.reopenReason;
  if (task.reopenedAt !== undefined) row.reopened_at = task.reopenedAt ? new Date(task.reopenedAt).toISOString() : null;
  if (task.reopenedById !== undefined) row.reopened_by_id = task.reopenedById || null;
  if (task.reopenedByName !== undefined) row.reopened_by_name = task.reopenedByName || '';
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

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending_assignment: 'Pending Assignment',
  todo: 'To Do',
  in_progress: 'In Progress',
  for_review: 'For Review',
  completed: 'Completed',
};

// â”€â”€â”€ Local listener system â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
      taskListeners.forEach(cb => { try { cb(tasks); } catch (e) { console.error(e); } });
    }
  } catch (err) {
    console.error('Error loading tasks:', err);
  }
}

async function fetchTaskById(taskId: string): Promise<Record<string, unknown> | null> {
  const { data } = await supabase.from('tasks').select('*').eq('id', taskId).single();
  return data || null;
}

// â”€â”€â”€ subscribeToTasks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

let seedPromise: Promise<void> | null = null;

export const seedTasksIfEmpty = async () => {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    const { count } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .is('deleted_at', null);
    if ((count ?? 0) > 0) return;
    const { TASK_SEED } = await import('./eflowSeedData');
    const { EMPLOYEE_SEED_BY_ID, getDepartmentLabel } = await import('./eflowSeedData');
    const rows = TASK_SEED.map((t: any) => {
      const assignee = EMPLOYEE_SEED_BY_ID[t.assignedTo];
      const teamName = getDepartmentLabel(t.department);
      return {
        title: t.title,
        description: t.description || '',
        status: t.status || 'pending_assignment',
        priority: t.priority || 'medium',
        department: t.department || '',
        team_id: t.department || '',
        team_name: teamName || '',
        assigned_to: t.assignedTo || null,
        assignee_name: assignee?.name || '',
        team_member_ids: t.assignedTo ? [t.assignedTo] : [],
        team_member_names: assignee ? [assignee.name] : [],
        deadline: t.dueDate || '',
        due_date: t.dueDate || '',
        tags: t.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });
    await supabase.from('tasks').insert(rows);
    await notifyTaskListeners();
    console.log('Seeded tasks to Supabase.');
  })().finally(() => { seedPromise = null; });
  return seedPromise;
};

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  taskListeners.add(callback);

  supabase
    .from('tasks')
    .select('*')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .then(({ data }) => {
      if (data) callback(data.map(rowToTask));
    });

  const channelId = `tasks-changes-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
      notifyTaskListeners();
    })
    .subscribe();

  return () => {
    taskListeners.delete(callback);
    supabase.removeChannel(channel);
  };
};

// â”€â”€â”€ createTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const createTask = async (
  titleOrPayload: string | CreateTaskPayload,
  description?: string,
  deadline?: string,
) => {
  let newTask: Record<string, unknown>;

  if (typeof titleOrPayload === 'object') {
    const p = titleOrPayload;
    const row = taskToRow({
      title: p.title,
      description: p.description,
      deadline: p.deadline,
      status: p.status || 'pending_assignment',
      priority: p.priority || 'medium',
      tags: p.tags || [],
      department: p.department || p.teamId || '',
      teamId: p.teamId || p.department || '',
      teamName: p.teamName || '',
      teamMemberIds: p.teamMemberIds || [],
      teamMemberNames: p.teamMemberNames || [],
      assigneeId: p.assigneeId || '',
      assigneeName: p.assigneeName || '',
      barangay: p.barangay || '',
      estimatedHours: p.estimatedHours || 0,
      budgetImpact: p.budgetImpact || 0,
      proposalId: p.proposalId || '',
      proposalTitle: p.proposalTitle || '',
      programId: p.programId || '',
      programTitle: p.programTitle || '',
      projectId: p.projectId || '',
      projectTitle: p.projectTitle || '',
      activityId: p.activityId || '',
      activityTitle: p.activityTitle || '',
      activitySchedule: p.activitySchedule || '',
      hierarchyPath: p.hierarchyPath || '',
      importBatchId: p.importBatchId || '',
      recommendedEmployeeIds: p.recommendedEmployeeIds,
      recommendationReasoning: p.recommendationReasoning,
      recommendationSource: p.recommendationSource,
      recommendationLeadId: p.recommendationLeadId,
      burnoutWarning: p.burnoutWarning,
    });
    newTask = row;
  } else {
    newTask = {
      title: titleOrPayload,
      description: description || '',
      deadline: deadline || '',
      due_date: deadline || '',
      status: 'pending_assignment',
      team_id: '',
      team_name: '',
      team_member_ids: [],
      team_member_names: [],
    };
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert(newTask)
    .select()
    .single();

  if (error) throw error;
  const task = rowToTask(data);

  const taskTitle = (newTask.title as string) || 'Task';
  await supabase.from('task_status_history').insert({
    task_id: task.id,
    from_status: null,
    to_status: task.status,
    note: 'Task created',
  });

  // Notify assignee if assigned at creation
  const assigneeId = readString(newTask.assigned_to);
  if (assigneeId) {
    await createNotification(assigneeId, {
      type: 'assignment',
      title: 'New Task Assignment',
      message: `New assignment: ${taskTitle}`,
      taskId: task.id,
      taskTitle,
    });
  }

  await notifyTaskListeners();
  return task;
};

// â”€â”€â”€ assignTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  if (assignment?.teamId) update.team_id = assignment.teamId;
  if (assignment?.teamName) update.team_name = assignment.teamName;
  if (assignment?.teamMemberIds) update.team_member_ids = assignment.teamMemberIds;
  if (assignment?.teamMemberNames) update.team_member_names = assignment.teamMemberNames;

  await supabase.from('tasks').update(update).eq('id', taskId);

  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
  const taskTitle = (task?.title as string) || 'Task';

  if (assigneeId) {
    await createNotification(assigneeId, {
      type: 'assignment',
      title: 'New Task Assigned',
      message: `You have been assigned to "${taskTitle}".`,
      taskId,
      taskTitle,
      actorName: assigneeName,
      statusTo: 'todo',
    });
  }

  await notifyTaskListeners();
};

// â”€â”€â”€ updateTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const updateTask = async (
  taskId: string,
  payload: UpdateTaskPayload,
) => {
  const row = taskToRow(payload as Partial<Task>);
  await supabase.from('tasks').update(row).eq('id', taskId);
  await notifyTaskListeners();
};

// â”€â”€â”€ updateTaskStatus â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const updateTaskStatus = async (
  taskId: string,
  status: TaskStatus,
  actor?: TaskActor,
) => {
  const current = await fetchTaskById(taskId);
  if (!current) throw new Error('Task not found.');

  const previousStatus = current.status as TaskStatus;
  if (previousStatus === status) return;
  if (previousStatus === 'completed' && status !== 'completed') {
    throw new Error('Completed tasks can only be reopened with undo.');
  }

  await supabase.from('tasks').update({ status }).eq('id', taskId);

  const actorName = actor?.name || 'Someone';
  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: previousStatus,
    to_status: status,
    actor_id: actor?.id || null,
    actor_name: actorName,
  });

  await createNotification(actor?.id || '', {
    type: status === 'completed' ? 'completed' : 'status_change',
    title: status === 'completed' ? 'Task Completed' : `Task Moved to ${TASK_STATUS_LABELS[status]}`,
    message: `${actorName} moved "${current.title || 'task'}" to ${TASK_STATUS_LABELS[status]}.`,
    taskId,
    taskTitle: (current.title as string) || '',
    actorName,
    statusFrom: previousStatus,
    statusTo: status,
  });

  await notifyTaskListeners();
};

// â”€â”€â”€ submitTaskForReview â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const submitTaskForReview = async (
  taskId: string,
  submission: TaskSubmissionInput,
): Promise<void> => {
  const trimmedNote = submission.note.trim();
  if (!trimmedNote) throw new Error("Submission note is required.");
  if (!submission.submitterId) throw new Error("Submitter ID is required.");

  const attachments = submission.attachments || [];

  // Upload each file to Supabase Storage, get a long-lived signed URL
  // (60 days â€” comfortably beyond any capstone demo or review cycle).
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
    "submitted",
    `Submitted for review by ${submission.submitterName}`,
    submission.submitterId,
    submission.submitterName,
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

// â”€â”€â”€ verifyTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const verifyTask = async (
  taskId: string,
  approve: boolean,
  feedback?: string,
  actor?: TaskActor,
) => {
  const current = await fetchTaskById(taskId);
  if (!current) throw new Error('Task not found.');

  const actorName = actor?.name || (approve ? 'Department head' : 'Reviewer');

  if (approve) {
    const hash = await generateAuditHash({ ...current, approvedAt: Date.now() });
    await supabase.from('tasks').update({
      status: 'completed',
      audit_hash: hash,
      feedback: feedback || null,
      rejection_note: null,
      rejected_at: null,
    }).eq('id', taskId);

    await supabase.from('task_status_history').insert({
      task_id: taskId,
      from_status: current.status,
      to_status: 'completed',
      actor_id: actor?.id || null,
      actor_name: actorName,
      note: 'Task verified and completed',
    });

    await createNotification(actor?.id || '', {
      type: 'completed',
      title: 'Task Completed',
      message: `${actorName} approved and completed "${current.title || 'task'}".`,
      taskId,
      taskTitle: (current.title as string) || '',
      actorName,
      statusFrom: current.status as string,
      statusTo: 'completed',
    });
  } else {
    const reason = feedback || 'Needs rework';
    await supabase.from('tasks').update({
      status: 'in_progress',
      feedback: feedback || null,
      rejection_note: reason,
      rejected_at: new Date().toISOString(),
    }).eq('id', taskId);

    await supabase.from('task_status_history').insert({
      task_id: taskId,
      from_status: current.status,
      to_status: 'in_progress',
      actor_id: actor?.id || null,
      actor_name: actorName,
      note: reason,
    });

    await createNotification(actor?.id || '', {
      type: 'status_change',
      title: 'Task Returned for Rework',
      message: `${actorName} returned "${current.title || 'task'}" for rework.`,
      taskId,
      taskTitle: (current.title as string) || '',
      actorName,
      statusFrom: current.status as string,
      statusTo: 'in_progress',
      reason,
    });
  }

  await notifyTaskListeners();
};

async function generateAuditHash(taskData: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(taskData));
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// â”€â”€â”€ deleteTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const deleteTask = async (taskId: string): Promise<void> => {
  await supabase.from('tasks').update({ deleted_at: new Date().toISOString() }).eq('id', taskId);
  await notifyTaskListeners();
};

// â”€â”€â”€ reassignTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const reassignTask = async (
  taskId: string,
  newAssigneeId: string,
  newAssigneeName: string,
  newTeam?: TaskAssignmentDetails,
  _oldAssigneeName?: string,
) => {
  const update: Record<string, unknown> = {
    assigned_to: newAssigneeId || null,
    assignee_name: newAssigneeName,
  };
  if (newTeam?.teamId) update.team_id = newTeam.teamId;
  if (newTeam?.teamName) update.team_name = newTeam.teamName;
  if (newTeam?.teamMemberIds) update.team_member_ids = newTeam.teamMemberIds;
  if (newTeam?.teamMemberNames) update.team_member_names = newTeam.teamMemberNames;

  await supabase.from('tasks').update(update).eq('id', taskId);

  const { data: task } = await supabase.from('tasks').select('title').eq('id', taskId).single();
  const taskTitle = (task?.title as string) || 'Task';

  if (newAssigneeId) {
    await createNotification(newAssigneeId, {
      type: 'reassignment',
      title: 'Task Reassigned to You',
      message: `A task has been reassigned to you.`,
      taskId,
      taskTitle,
      actorName: newAssigneeName,
    });
  }

  await notifyTaskListeners();
};

// â”€â”€â”€ undoCompletedTask â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const undoCompletedTask = async (
  taskId: string,
  undoInput: TaskUndoInput,
): Promise<void> => {
  const reason = undoInput.reason.trim();
  if (!reason) throw new Error('Undo reason is required.');

  const current = await fetchTaskById(taskId);
  if (!current) throw new Error('Task not found.');
  if (current.status !== 'completed') throw new Error('Only completed tasks can be reopened.');

  const actor = undoInput.actor;
  const actorName = actor?.name || 'Department head';

  await supabase.from('tasks').update({
    status: 'in_progress',
    reopen_reason: reason,
    reopened_at: new Date().toISOString(),
    reopened_by_id: actor?.id || null,
    reopened_by_name: actor?.name || '',
  }).eq('id', taskId);

  await supabase.from('task_status_history').insert({
    task_id: taskId,
    from_status: 'completed',
    to_status: 'in_progress',
    actor_id: actor?.id || null,
    actor_name: actorName,
    note: reason,
  });

  await createNotification(actor?.id || '', {
    type: 'undo',
    title: 'Task Reopened',
    message: `${actorName} reopened "${current.title || 'task'}" for additional work.`,
    taskId,
    taskTitle: (current.title as string) || '',
    actorName,
    statusFrom: 'completed',
    statusTo: 'in_progress',
    reason,
  });

  await notifyTaskListeners();
};

// â”€â”€â”€ Activity Log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function logTaskActivity(
  taskId: string,
  action: string,
  details: string,
  userId?: string,
  userName?: string,
): Promise<void> {
  await supabase.from('task_activities').insert({
    task_id: taskId,
    type: action,
    content: details,
    actor_id: userId || null,
    actor_name: userName || 'System',
  });
}

export function subscribeToTaskActivities(
  taskId: string,
  callback: (activities: TaskActivity[]) => void,
) {
  const load = async () => {
    const { data } = await supabase
      .from('task_activities')
      .select('*')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false });

    if (data) {
      callback(data.map(row => ({
        id: row.id,
        taskId: row.task_id,
        action: row.type || '',
        details: row.content || '',
        userId: row.actor_id || undefined,
        userName: row.actor_name || undefined,
        timestamp: new Date(row.created_at).getTime(),
      })));
    } else {
      callback([]);
    }
  };
  load();

  const channelId = `task-activities-${taskId}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'task_activities',
      filter: `task_id=eq.${taskId}`,
    }, () => load())
    .subscribe();

  return () => supabase.removeChannel(channel);
}
