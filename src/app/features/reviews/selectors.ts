import type { Task } from "../../services/taskService";

export function canUserReviewTask(
  task: Task,
  userId?: string,
  role?: string,
): boolean {
  if (!userId || task.latestSubmission?.submitterId === userId) return false;
  return (
    role === "super_admin" ||
    task.reviewerId === userId ||
    task.backupReviewerId === userId
  );
}

export function isTaskVisibleInReviewQueue(
  task: Task,
  userId?: string,
  role?: string,
): boolean {
  return (
    task.status === "for_review" &&
    !task.archivedAt &&
    canUserReviewTask(task, userId, role)
  );
}
