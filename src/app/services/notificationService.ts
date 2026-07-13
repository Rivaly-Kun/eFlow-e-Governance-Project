// ─── eFlow Notification Service (Supabase) ───────────────────────
// Real-time notifications from Supabase notifications table.

import { supabase } from '../../lib/supabase';

export type NotificationType =
  | 'assignment'
  | 'overdue'
  | 'burnout_warning'
  | 'approval_needed'
  | 'completed'
  | 'reassignment'
  | 'status_change'
  | 'undo'
  | 'comment';

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
    createdAt: new Date((row.created_at as string) || Date.now()).getTime(),
  };
}

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
    else callback([]);
  };
  load();

  const channelId = `notifs-${userId}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'notifications',
      filter: `user_id=eq.${userId}`,
    }, () => load())
    .subscribe();

  return () => supabase.removeChannel(channel);
}

export async function createNotification(
  userId: string,
  notification: Omit<Notification, 'id' | 'read' | 'createdAt'>,
): Promise<void> {
  if (!userId) return;

  await supabase.from('notifications').insert({
    user_id: userId,
    type: notification.type,
    title: notification.title,
    message: notification.message,
    task_id: notification.taskId || null,
    task_title: notification.taskTitle || '',
    actor_id: notification.actorId || null,
    actor_name: notification.actorName || '',
    status_from: notification.statusFrom || '',
    status_to: notification.statusTo || '',
    reason: notification.reason || '',
    read: false,
  });

  // Fire-and-forget email — never let this throw into the caller. The
  // in-app notification above has already succeeded regardless of
  const apiBase = (import.meta.env.VITE_LLM_BASE_URL || "").replace(/\/$/, "");
  fetch(`${apiBase}/controlpanelEflow/api/notifications/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title: notification.title,
      body: notification.message,
      taskId: notification.taskId || null,
    }),
  }).catch((err) => console.error("Email notification request failed:", err));
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('id', notificationId).eq('user_id', userId);
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);
  return count || 0;
}
