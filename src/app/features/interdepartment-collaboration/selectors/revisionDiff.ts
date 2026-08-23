import type { CollaborationDraftSnapshot } from "../types";

export function summarizeRevisionDiff(previous: CollaborationDraftSnapshot, next: CollaborationDraftSnapshot): string[] {
  const changes: string[] = [];
  if (previous.title !== next.title || previous.description !== next.description) changes.push("Proposal details changed");
  if (previous.organizations.length !== next.organizations.length || JSON.stringify(previous.organizations) !== JSON.stringify(next.organizations)) changes.push("Organization participation changed");
  if (previous.tasks.length !== next.tasks.length) changes.push("Work structure changed");
  const previousTasks = new Map(previous.tasks.map((task) => [task.key, task]));
  if (next.tasks.some((task) => JSON.stringify(previousTasks.get(task.key)) !== JSON.stringify(task))) changes.push("Tasks, schedules, responsibilities, or staffing changed");
  return changes.length ? changes : ["Draft metadata updated"];
}
