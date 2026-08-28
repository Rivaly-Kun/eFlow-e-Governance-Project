import * as React from "react";
import { Button } from "@vibe/core";
import type { UserProfile } from "../../../../types";
import type { ProjectCommandData } from "./types";
import { ProjectPlanTab } from "./ProjectPlanTab";
import { ProjectWorkTab } from "./ProjectWorkTab";

export function ProjectDeliveryTab({
  data,
  profiles,
  canManage,
  onOpenTask,
}: {
  data: ProjectCommandData;
  profiles: UserProfile[];
  canManage: boolean;
  onOpenTask: (taskId: string) => void;
}) {
  const [viewMode, setViewMode] = React.useState<"plan" | "execution">("execution");

  return (
    <div className="space-y-4">
      {/* Lightweight Local Delivery Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-2.5 shadow-sm">
        <div className="flex items-center gap-1">
          <Button
            kind={viewMode === "execution" ? "primary" : "tertiary"}
            size="small"
            onClick={() => setViewMode("execution")}
          >
            Execution &amp; Tasks ({data.tasks.length})
          </Button>
          <Button
            kind={viewMode === "plan" ? "primary" : "tertiary"}
            size="small"
            onClick={() => setViewMode("plan")}
          >
            Plan &amp; Activities ({data.milestones.length})
          </Button>
        </div>

        <div className="flex items-center gap-2 text-xs text-neutral-500 pr-2">
          <span>{data.metrics.taskCompleted}/{data.tasks.length} tasks completed</span>
          <span>·</span>
          <span>{data.metrics.milestoneCompleted}/{data.milestones.length} activities completed</span>
        </div>
      </div>

      {/* Render Selected View */}
      {viewMode === "plan" ? (
        <div className="animate-in fade-in duration-150">
          <ProjectPlanTab
            data={data}
            profiles={profiles}
            canManage={canManage && data.project.status !== "archived"}
          />
        </div>
      ) : (
        <div className="animate-in fade-in duration-150">
          <ProjectWorkTab
            data={data}
            profiles={profiles}
            onOpenTask={onOpenTask}
            canManage={canManage}
          />
        </div>
      )}
    </div>
  );
}
