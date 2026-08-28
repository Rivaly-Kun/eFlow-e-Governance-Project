import { Label } from "@vibe/core";
import type { ProjectStatus } from "../services/types";
import type { ProjectScheduleHealth } from "../components/project-command/types";

type LabelColor =
  "primary" | "positive" | "working_orange" | "dark" | "negative";
const lifecycle: Record<ProjectStatus, { text: string; color: LabelColor }> = {
  planning: { text: "Planning", color: "primary" },
  active: { text: "Active", color: "positive" },
  on_hold: { text: "On hold", color: "working_orange" },
  completed: { text: "Completed", color: "dark" },
  archived: { text: "Archived", color: "negative" },
};
const schedule: Record<
  ProjectScheduleHealth,
  { text: string; color: LabelColor }
> = {
  on_track: { text: "On track", color: "positive" },
  due_soon: { text: "Due soon", color: "working_orange" },
  overdue: { text: "Overdue", color: "negative" },
  at_risk: { text: "At risk", color: "negative" },
  completed: { text: "Completed", color: "dark" },
};
export function ProjectLifecycleLabel({ status }: { status: ProjectStatus }) {
  const item = lifecycle[status];
  return <span role="status" aria-label={`Project lifecycle: ${item.text}`}><Label text={item.text} color={item.color} /></span>;
}
export function ProjectScheduleLabel({
  health,
  empty = false,
}: {
  health: ProjectScheduleHealth;
  empty?: boolean;
}) {
  if (empty)
    return <span role="status" aria-label="Project schedule: no scheduled work"><Label text="No scheduled work" color="dark" /></span>;
  const item = schedule[health];
  return <span role="status" aria-label={`Project schedule: ${item.text}`}><Label text={item.text} color={item.color} /></span>;
}
