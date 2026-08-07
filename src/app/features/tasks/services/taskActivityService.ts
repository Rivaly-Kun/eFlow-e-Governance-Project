import { supabase } from "../../../../lib/supabase";
import type { TaskActivity } from "../taskTypes";

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

// ─── archiveTask / unarchiveTask ─────────────────────────────────
// Retains the task but excludes it from active work. Modeled via the
// `archived_at` timestamp (not the status enum) so it is independent of the
// task status CHECK constraint; new screens filter on archivedAt. Writes an
// audit event — archiving is never silent.
