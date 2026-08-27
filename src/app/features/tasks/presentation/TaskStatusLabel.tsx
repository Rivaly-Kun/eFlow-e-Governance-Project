import { Label } from "@vibe/core";
import { getTaskStatusPresentation } from "./taskStatusPresentation";

export function TaskStatusLabel({ status }: { status: string }) {
  const presentation = getTaskStatusPresentation(status);
  return (
    <span role="status" aria-label={`${presentation.label}. ${presentation.description}`}>
      <Label color={presentation.color} text={presentation.label} />
    </span>
  );
}
