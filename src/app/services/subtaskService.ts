// ─── Subtask Service ──────────────────────────────────────────────
// CRUD + realtime for the subtasks table.

import { supabase } from '../../lib/supabase';
import { createNotification } from './notificationService';

export type SubtaskSource = 'ai_extracted' | 'template' | 'manual';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: number;
  assignedTo?: string;
  assignedToIds: string[];
  position: number;
  source: SubtaskSource;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

function rowToSubtask(row: Record<string, unknown>): Subtask {
  const rawIds = row.assigned_to_ids;
  const assignedToIds: string[] = Array.isArray(rawIds)
    ? (rawIds as string[])
    : row.assigned_to
    ? [row.assigned_to as string]
    : [];

  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    isCompleted: (row.is_completed as boolean) || false,
    completedBy: (row.completed_by as string) || undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
    assignedTo: (row.assigned_to as string) || (assignedToIds[0] || undefined),
    assignedToIds,
    position: (row.position as number) || 0,
    source: (row.source as SubtaskSource) || 'manual',
    createdBy: (row.created_by as string) || undefined,
    createdAt: new Date(row.created_at as string).getTime(),
    updatedAt: new Date(row.updated_at as string).getTime(),
  };
}

// ─── subscribeToSubtasks ───────────────────────────────────────────
export function subscribeToSubtasks(
  taskId: string,
  callback: (subtasks: Subtask[]) => void,
): () => void {
  const load = async () => {
    const { data } = await supabase
      .from('subtasks')
      .select('*')
      .eq('task_id', taskId)
      .order('position', { ascending: true });
    if (data) callback(data.map(rowToSubtask));
  };
  load();

  const channelId = `subtasks-${taskId}-${Math.random().toString(36).substring(2, 9)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'subtasks', filter: `task_id=eq.${taskId}` },
      () => load(),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── syncTaskSubtaskStats ──────────────────────────────────────────
export async function syncTaskSubtaskStats(
  taskId: string,
  assignedMemberIds?: string[] | string,
): Promise<void> {
  try {
    const { data: taskRow } = await supabase
      .from('tasks')
      .select('id, team_member_ids, team_member_names, percent_complete, status')
      .eq('id', taskId)
      .maybeSingle();

    if (!taskRow) return;

    const idsToAdd: string[] = Array.isArray(assignedMemberIds)
      ? assignedMemberIds.filter(Boolean)
      : assignedMemberIds
      ? [assignedMemberIds]
      : [];

    if (idsToAdd.length > 0) {
      const currentMemberIds: string[] = Array.isArray(taskRow.team_member_ids)
        ? (taskRow.team_member_ids as string[])
        : [];
      const newIds = idsToAdd.filter((id) => !currentMemberIds.includes(id));

      if (newIds.length > 0) {
        const nextIds = [...currentMemberIds, ...newIds];
        let nextNames: string[] = Array.isArray(taskRow.team_member_names)
          ? (taskRow.team_member_names as string[])
          : [];

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', newIds);

        if (profiles && profiles.length > 0) {
          const newNames = profiles.map((p) => p.full_name || 'User');
          nextNames = [...nextNames, ...newNames];
        }

        await supabase
          .from('tasks')
          .update({
            team_member_ids: nextIds,
            team_member_names: nextNames,
          })
          .eq('id', taskId);
      }
    }

    const { data: subtasks } = await supabase
      .from('subtasks')
      .select('is_completed')
      .eq('task_id', taskId);

    if (subtasks) {
      const total = subtasks.length;
      const completed = subtasks.filter((s) => s.is_completed).length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      await supabase
        .from('tasks')
        .update({
          subtask_count: total,
          subtask_completed_count: completed,
          percent_complete: percent,
        })
        .eq('id', taskId);
    }
  } catch (err) {
    console.error('Failed to sync task subtask stats:', err);
  }
}

// ─── createSubtask (single, manual add) ────────────────────────────
export async function createSubtask(
  taskId: string,
  title: string,
  opts?: {
    source?: SubtaskSource;
    position?: number;
    createdBy?: string;
    assignedToIds?: string[];
    assignedTo?: string;
    actorName?: string;
  },
): Promise<Subtask> {
  const assignedIds = opts?.assignedToIds || (opts?.assignedTo ? [opts.assignedTo] : []);

  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: taskId,
      title,
      source: opts?.source || 'manual',
      position: opts?.position ?? 0,
      created_by: opts?.createdBy || null,
      assigned_to: assignedIds[0] || null,
      assigned_to_ids: assignedIds,
    })
    .select()
    .single();
  if (error) throw error;

  await syncTaskSubtaskStats(taskId, assignedIds);

  if (assignedIds.length > 0) {
    const { data: task } = await supabase
      .from('tasks')
      .select('title')
      .eq('id', taskId)
      .maybeSingle();

    const taskTitle = task?.title || 'a task';
    const actorName = opts?.actorName || 'Your Team Lead';

    await Promise.all(
      assignedIds
        .filter((uid) => uid !== opts?.createdBy)
        .map((uid) =>
          createNotification(uid, {
            type: 'assignment',
            title: 'New Subtask Assignment',
            message: `${actorName} assigned you to subtask "${title}" in "${taskTitle}".`,
            taskId,
            taskTitle,
          }),
        ),
    );
  }

  return rowToSubtask(data);
}

// ─── createSubtasksBatch (used by ProposalImport right after createTask) ──
export async function createSubtasksBatch(
  taskId: string,
  titles: string[],
  source: SubtaskSource = 'ai_extracted',
): Promise<Subtask[]> {
  if (!titles || titles.length === 0) return [];
  const rows = titles
    .filter((t) => t && t.trim().length > 0)
    .map((title, idx) => ({
      task_id: taskId,
      title: title.trim(),
      source,
      position: idx,
    }));
  if (rows.length === 0) return [];
  const { data, error } = await supabase.from('subtasks').insert(rows).select();
  if (error) throw error;

  await syncTaskSubtaskStats(taskId);
  return (data || []).map(rowToSubtask);
}

// ─── toggleSubtask ──────────────────────────────────────────────────
export async function toggleSubtask(
  subtaskId: string,
  isCompleted: boolean,
  actorId?: string,
): Promise<void> {
  const { data: current } = await supabase
    .from('subtasks')
    .select('task_id')
    .eq('id', subtaskId)
    .maybeSingle();

  const { error } = await supabase
    .from('subtasks')
    .update({
      is_completed: isCompleted,
      completed_by: isCompleted ? actorId || null : null,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', subtaskId);
  if (error) throw error;

  if (current?.task_id) {
    await syncTaskSubtaskStats(current.task_id);
  }
}

// ─── updateSubtask ──────────────────────────────────────────────────
export async function updateSubtask(
  subtaskId: string,
  updates: { title?: string; position?: number; assignedTo?: string; assignedToIds?: string[] },
  actor?: { id: string; name: string },
): Promise<void> {
  const { data: current } = await supabase
    .from('subtasks')
    .select('task_id, title, assigned_to_ids')
    .eq('id', subtaskId)
    .maybeSingle();

  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.position !== undefined) row.position = updates.position;

  let newAssignedIds: string[] | undefined = updates.assignedToIds;
  if (newAssignedIds === undefined && updates.assignedTo !== undefined) {
    newAssignedIds = updates.assignedTo ? [updates.assignedTo] : [];
  }

  if (newAssignedIds !== undefined) {
    row.assigned_to_ids = newAssignedIds;
    row.assigned_to = newAssignedIds[0] || null;
  }

  const { error } = await supabase
    .from('subtasks')
    .update(row)
    .eq('id', subtaskId);
  if (error) throw error;

  if (current?.task_id) {
    await syncTaskSubtaskStats(current.task_id, newAssignedIds);

    if (newAssignedIds && newAssignedIds.length > 0) {
      const oldIds: string[] = Array.isArray(current.assigned_to_ids) ? current.assigned_to_ids : [];
      const addedIds = newAssignedIds.filter((id) => !oldIds.includes(id) && id !== actor?.id);

      if (addedIds.length > 0) {
        const { data: task } = await supabase
          .from('tasks')
          .select('title')
          .eq('id', current.task_id)
          .maybeSingle();

        const subTitle = updates.title || current.title || 'a subtask';
        const taskTitle = task?.title || 'a task';
        const actorName = actor?.name || 'Your Team Lead';

        await Promise.all(
          addedIds.map((uid) =>
            createNotification(uid, {
              type: 'assignment',
              title: 'New Subtask Assignment',
              message: `${actorName} assigned you to subtask "${subTitle}" in "${taskTitle}".`,
              taskId: current.task_id,
              taskTitle,
              actorId: actor?.id,
              actorName,
            }),
          ),
        );
      }
    }
  }
}

// ─── deleteSubtask ──────────────────────────────────────────────────
export async function deleteSubtask(subtaskId: string): Promise<void> {
  const { data: current } = await supabase
    .from('subtasks')
    .select('task_id')
    .eq('id', subtaskId)
    .maybeSingle();

  const { error } = await supabase
    .from('subtasks')
    .delete()
    .eq('id', subtaskId);
  if (error) throw error;

  if (current?.task_id) {
    await syncTaskSubtaskStats(current.task_id);
  }
}

// ─── reorderSubtasks ────────────────────────────────────────────────
export async function reorderSubtasks(orderedIds: string[]): Promise<void> {
  const results = await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('subtasks').update({ position: idx }).eq('id', id),
    ),
  );
  const failed = results.find((result) => result.error);
  if (failed?.error) throw failed.error;
}


