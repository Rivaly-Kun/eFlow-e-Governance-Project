import type { Subtask } from "../../services/subtaskService";

export function getSubtaskReplacementBlocker(subtasks: Subtask[]): string | null {
  const protectedSubtask = subtasks.find(
    (subtask) =>
      subtask.status !== "todo" ||
      subtask.percentComplete > 0 ||
      subtask.isCompleted ||
      Boolean(subtask.latestSubmissionId),
  );
  return protectedSubtask
    ? `Subtask “${protectedSubtask.title}” is already in progress or has review history and cannot be deleted or overridden.`
    : null;
}
