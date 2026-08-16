import type { DraftTask } from "../components/draftModel";

export interface ManualPlanValidationIssue {
  id: string;
  message: string;
}

function labelForTask(task: DraftTask, position: number) {
  return task.title.trim()
    ? `Task “${task.title.trim()}”`
    : `Task ${position + 1}`;
}

function hasCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return !Number.isNaN(Date.parse(`${value}T00:00:00`));
}

export function validateManualPlanDraft({
  planTitle,
  planDescription,
  tasks,
}: {
  planTitle: string;
  planDescription: string;
  tasks: DraftTask[];
}): ManualPlanValidationIssue[] {
  const enabledTasks = tasks.filter((task) => task.enabled);
  const issues: ManualPlanValidationIssue[] = [];

  if (!planTitle.trim()) {
    issues.push({ id: "plan-title", message: "Plan title is required." });
  }
  if (!planDescription.trim()) {
    issues.push({ id: "plan-description", message: "Plan description is required." });
  }
  if (enabledTasks.length === 0) {
    issues.push({ id: "tasks", message: "Add at least one task to create this work plan." });
  }

  enabledTasks.forEach((task, position) => {
    const label = labelForTask(task, position);
    if (!task.programTitle.trim()) {
      issues.push({ id: `${task.key}-program`, message: `${label} needs a Program name.` });
    }
    if (!task.projectTitle.trim()) {
      issues.push({ id: `${task.key}-project`, message: `${label} needs a Project name.` });
    }
    if (!task.activityTitle.trim()) {
      issues.push({ id: `${task.key}-activity`, message: `${label} needs an Activity name.` });
    }
    if (!task.title.trim()) {
      issues.push({ id: `${task.key}-title`, message: `${label} needs a task title.` });
    }
    if (!task.description.trim()) {
      issues.push({ id: `${task.key}-description`, message: `${label} needs a description.` });
    }
    if (!task.deadline.trim()) {
      issues.push({ id: `${task.key}-deadline`, message: `${label} does not have a due date.` });
    } else if (!hasCalendarDate(task.deadline.trim())) {
      issues.push({ id: `${task.key}-deadline-format`, message: `${label} needs a calendar due date.` });
    }
  });

  return issues;
}
