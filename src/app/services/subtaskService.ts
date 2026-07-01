// ─── Subtask Service ──────────────────────────────────────────────
// CRUD + realtime for the subtasks table.

import { supabase } from '../../lib/supabase';

export type SubtaskSource = 'ai_extracted' | 'template' | 'manual';

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: number;
  assignedTo?: string;
  position: number;
  source: SubtaskSource;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

function rowToSubtask(row: Record<string, unknown>): Subtask {
  return {
    id: row.id as string,
    taskId: row.task_id as string,
    title: row.title as string,
    isCompleted: (row.is_completed as boolean) || false,
    completedBy: (row.completed_by as string) || undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
    assignedTo: (row.assigned_to as string) || undefined,
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

// ─── createSubtask (single, manual add) ────────────────────────────
export async function createSubtask(
  taskId: string,
  title: string,
  opts?: { source?: SubtaskSource; position?: number; createdBy?: string },
): Promise<Subtask> {
  const { data, error } = await supabase
    .from('subtasks')
    .insert({
      task_id: taskId,
      title,
      source: opts?.source || 'manual',
      position: opts?.position ?? 0,
      created_by: opts?.createdBy || null,
    })
    .select()
    .single();
  if (error) throw error;
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
  return (data || []).map(rowToSubtask);
}

// ─── toggleSubtask ──────────────────────────────────────────────────
export async function toggleSubtask(
  subtaskId: string,
  isCompleted: boolean,
  actorId?: string,
): Promise<void> {
  await supabase
    .from('subtasks')
    .update({
      is_completed: isCompleted,
      completed_by: isCompleted ? actorId || null : null,
      completed_at: isCompleted ? new Date().toISOString() : null,
    })
    .eq('id', subtaskId);
}

// ─── updateSubtask ──────────────────────────────────────────────────
export async function updateSubtask(
  subtaskId: string,
  updates: { title?: string; position?: number; assignedTo?: string },
): Promise<void> {
  const row: Record<string, unknown> = {};
  if (updates.title !== undefined) row.title = updates.title;
  if (updates.position !== undefined) row.position = updates.position;
  if (updates.assignedTo !== undefined) row.assigned_to = updates.assignedTo || null;
  await supabase.from('subtasks').update(row).eq('id', subtaskId);
}

// ─── deleteSubtask ──────────────────────────────────────────────────
export async function deleteSubtask(subtaskId: string): Promise<void> {
  await supabase.from('subtasks').delete().eq('id', subtaskId);
}

// ─── reorderSubtasks ────────────────────────────────────────────────
export async function reorderSubtasks(orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, idx) =>
      supabase.from('subtasks').update({ position: idx }).eq('id', id),
    ),
  );
}
