// ─── Notification Service ────────────────────────────────────────
// Realtime notifications pushed to /notifications/{userId}/{pushId}

import { ref, onValue, push, update, off, query, orderByChild, limitToLast } from "firebase/database";
import { database } from "../../firebase";

export type NotificationType =
  | "assignment"
  | "overdue"
  | "burnout_warning"
  | "approval_needed"
  | "completed"
  | "reassignment"
  | "status_change"
  | "comment";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  taskTitle?: string;
  read: boolean;
  createdAt: number;
}

const NOTIFICATIONS_PATH = "notifications";

export function subscribeToNotifications(
  userId: string,
  callback: (notifications: Notification[]) => void,
  limit = 50
) {
  const notifsRef = query(
    ref(database, `${NOTIFICATIONS_PATH}/${userId}`),
    orderByChild("createdAt"),
    limitToLast(limit)
  );
  const handler = onValue(notifsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list: Notification[] = Object.entries(data)
      .map(([id, val]: [string, any]) => ({
        id,
        type: val.type || "assignment",
        title: val.title || "",
        message: val.message || "",
        taskId: val.taskId,
        taskTitle: val.taskTitle,
        read: val.read === true,
        createdAt: val.createdAt || 0,
      }))
      .sort((a, b) => b.createdAt - a.createdAt);
    callback(list);
  });
  return () => off(notifsRef, "value", handler);
}

export async function createNotification(
  userId: string,
  notification: Omit<Notification, "id" | "read" | "createdAt">
): Promise<void> {
  const notifsRef = ref(database, `${NOTIFICATIONS_PATH}/${userId}`);
  await push(notifsRef, {
    ...notification,
    read: false,
    createdAt: Date.now(),
  });
}

export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  await update(ref(database, `${NOTIFICATIONS_PATH}/${userId}/${notificationId}`), { read: true });
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const notifsRef = ref(database, `${NOTIFICATIONS_PATH}/${userId}`);
  const { get: fbGet } = await import("firebase/database");
  const snap = await fbGet(notifsRef);
  if (!snap.exists()) return;
  const updates: Record<string, any> = {};
  Object.keys(snap.val()).forEach((id) => {
    updates[`${id}/read`] = true;
  });
  await update(notifsRef, updates);
}
