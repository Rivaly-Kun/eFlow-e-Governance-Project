import type { Task } from "../../../services/taskService";

export function isArchived(task: Task): boolean {
  return !!task.archivedAt;
}

export function isUnassigned(task: Task): boolean {
  return !task.assigneeId;
}

export function isCompleted(task: Task): boolean {
  return task.status === "completed";
}

export function isActive(task: Task): boolean {
  return !isArchived(task) && !isCompleted(task) && task.status !== "cancelled";
}

export function isForReview(task: Task): boolean {
  return task.status === "for_review";
}

export function parseDueDate(task: Task): number | null {
  const raw = task.dueDate || task.deadline;
  if (!raw || typeof raw !== "string") return null;
  if (/month|phase|week|quarter|ongoing|tbd|q[1-4]/i.test(raw)) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

export function isOverdue(task: Task, now: number = Date.now()): boolean {
  if (!isActive(task)) return false;
  const due = parseDueDate(task);
  return due !== null && due < now;
}
