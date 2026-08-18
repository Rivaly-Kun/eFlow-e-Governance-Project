import type { Task } from "../../../services/taskService";
import { resolveScheduleTimestamp } from "../../../shared/scheduling/relativeSchedule";

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
  const anchor = Number.isFinite(task.createdAt) ? task.createdAt : Date.now();
  const fromDeadline = resolveScheduleTimestamp(raw, anchor);
  if (fromDeadline !== null) return fromDeadline;
  return resolveScheduleTimestamp(task.activitySchedule, anchor);
}

export function isOverdue(task: Task, now: number = Date.now()): boolean {
  if (!isActive(task)) return false;
  const due = parseDueDate(task);
  return due !== null && due < now;
}
