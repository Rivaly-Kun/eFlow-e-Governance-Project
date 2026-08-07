import type { Task } from "../../../services/taskService";

export function isTaskLead(
  task: Pick<Task, "recommendationLeadId" | "teamMemberIds">,
  userId: string | null | undefined,
): boolean {
  if (!userId) return false;
  return task.recommendationLeadId
    ? task.recommendationLeadId === userId
    : task.teamMemberIds?.[0] === userId;
}
