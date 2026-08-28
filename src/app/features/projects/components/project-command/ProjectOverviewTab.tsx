import { Avatar, EmptyState, Label } from "@vibe/core";
import { AlertTriangle, Layers } from "lucide-react";
import type { UserProfile } from "../../../../types";
import { ProjectScheduleLabel } from "../../presentation/projectPresentation";
import type { ProjectCommandData } from "./types";

function activityHeadline(item: ProjectCommandData["activity"][number]) {
  const title = item.title.trim();
  if (!item.actorName || item.actorName === "System") return title;
  return `${item.actorName} ${title.charAt(0).toLowerCase()}${title.slice(1)}`;
}

export function ProjectOverviewTab({
  data,
  profiles,
  onOpenTask,
}: {
  data: ProjectCommandData;
  profiles: UserProfile[];
  onOpenTask: (taskId: string) => void;
}) {
  const owner = profiles.find((profile) => profile.id === data.project.ownerId);
  const counts = [
    [
      "To do",
      data.tasks.filter((task) =>
        ["pending_assignment", "todo"].includes(task.status),
      ).length,
    ],
    [
      "In progress",
      data.tasks.filter((task) => task.status === "in_progress").length,
    ],
    [
      "Awaiting review",
      data.tasks.filter((task) => task.status === "for_review").length,
    ],
    ["Completed", data.metrics.taskCompleted],
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_340px]">
        {/* Left Column: Briefing & Activities */}
        <div className="space-y-4">
          {/* 1. Delivery Progress Position */}
          <section className="eflow-overview-section">
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
              <div>
                <h2 className="text-base font-bold text-neutral-900">Project Briefing &amp; Progress</h2>
                <p className="m-0 mt-0.5 text-xs text-neutral-500">
                  Current project delivery position and execution health.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <ProjectScheduleLabel health={data.metrics.scheduleHealth} />
                <strong className="text-xl font-bold text-neutral-900">{data.metrics.progress}%</strong>
              </div>
            </header>

            <div className="p-4">
              <div className="eflow-progress-track h-2">
                <span style={{ width: `${data.metrics.progress}%` }} />
              </div>
              <div className="eflow-overview-stats">
                {counts.map(([label, value]) => (
                  <div key={String(label)}>
                    <strong className="text-lg font-bold text-neutral-900">{value}</strong>
                    <span className="block text-xs text-neutral-500">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 2. Milestones / Activities */}
          <section className="eflow-overview-section">
            <header className="flex items-center justify-between border-b border-neutral-100 p-4">
              <div>
                <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2">
                  <Layers size={15} className="text-neutral-500" />
                  Delivery Activities ({data.milestones.length})
                </h3>
                <p className="m-0 mt-0.5 text-xs text-neutral-500">Project plan summary</p>
              </div>
              <span className="text-xs text-neutral-500">
                {data.metrics.milestoneCompleted} of {data.milestones.length} complete
              </span>
            </header>
            <div className="eflow-overview-plan-head" aria-hidden="true">
              <span>Activity</span><span>Owner</span><span>Target</span><span>Progress</span><span>State</span>
            </div>
            <div>
              {data.milestones.length ? (
                data.milestones.map((milestone, index) => {
                  const linkedTasks = data.tasks.filter((task) => task.milestoneId === milestone.id && !task.archivedAt && task.status !== "cancelled");
                  const progress = linkedTasks.length
                    ? Math.round(linkedTasks.reduce((sum, task) => sum + (task.status === "completed" ? 100 : task.percentComplete || 0), 0) / linkedTasks.length)
                    : (milestone.status === "completed" || milestone.manualStatus === "completed" ? 100 : 0);
                  const ownerId = linkedTasks.map((task) => task.recommendationLeadId || task.assigneeId).find(Boolean) || data.project.ownerId;
                  const activityOwner = profiles.find((profile) => profile.id === ownerId);
                  const state = (milestone.manualStatus || milestone.status || "not_started").replace(/_/g, " ");
                  return (
                    <div key={milestone.id} className="eflow-overview-plan-row">
                      <div className="eflow-overview-plan-row__activity">
                        <span className="eflow-overview-plan-row__index">{index + 1}</span>
                        <strong>{milestone.title}</strong>
                      </div>
                      <div className="eflow-overview-plan-row__owner">
                        {activityOwner ? <Avatar text={activityOwner.full_name.split(" ").map((part) => part[0]).join("").slice(0, 2)} size="small" /> : null}
                        <span>{activityOwner?.full_name || "Unassigned"}</span>
                      </div>
                      <span className="text-xs text-neutral-600">{milestone.dueDate || "No target"}</span>
                      <div className="eflow-overview-plan-row__progress">
                        <div className="eflow-progress-track"><span style={{ width: `${progress}%` }} /></div>
                        <span>{progress}%</span>
                      </div>
                      <Label text={state.replace(/^./, (letter) => letter.toUpperCase())} color={state === "completed" ? "positive" : state === "at risk" ? "negative" : "primary"} />
                    </div>
                  );
                })
              ) : (
                <EmptyState
                  title="No activities defined"
                  description="No project plan activities have been recorded yet."
                />
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Attention items & Project details */}
        <aside className="space-y-4">
          {/* 1. Needs Attention */}
          <section className="eflow-overview-section">
            <header className="flex items-center justify-between border-b border-neutral-100 p-4">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <AlertTriangle size={15} className="text-amber-600" />
                Needs Attention
              </h3>
              <Label
                text={`${data.attention.length}`}
                color={data.attention.length ? "working_orange" : "positive"}
              />
            </header>
            <div className="divide-y divide-neutral-100">
              {data.attention.length ? (
                data.attention.slice(0, 5).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="w-full p-3 text-left hover:bg-neutral-50 transition"
                    onClick={() => item.taskId && onOpenTask(item.taskId)}
                  >
                    <strong className="block text-xs font-semibold text-neutral-900">{item.title}</strong>
                    <span className="mt-0.5 block text-[11px] text-neutral-500 leading-normal">
                      {item.detail}
                    </span>
                  </button>
                ))
              ) : (
                <EmptyState
                  title="All clear"
                  description="There are no overdue items or blockers requiring immediate intervention."
                />
              )}
            </div>
          </section>

          <section className="eflow-overview-section">
            <header className="border-b border-neutral-100 p-4">
              <h3 className="text-sm font-bold text-neutral-900">Recent activity</h3>
            </header>
            <div className="divide-y divide-neutral-100">
              {data.activity.length ? data.activity.slice(0, 4).map((item) => (
                <button key={item.id} type="button" className="w-full p-3 text-left hover:bg-neutral-50 transition" onClick={() => item.taskId && onOpenTask(item.taskId)}>
                  <strong className="block truncate text-xs font-semibold text-neutral-900">{activityHeadline(item)}</strong>
                  <span className="mt-0.5 block truncate text-[11px] text-neutral-500">
                    {item.detail} · {new Date(item.occurredAt).toLocaleString()}
                  </span>
                </button>
              )) : <p className="m-0 p-4 text-xs text-neutral-500">No recent activity recorded.</p>}
            </div>
          </section>

          {/* 2. Project Details Card */}
          <section className="eflow-section-card">
            <header className="border-b border-neutral-100 p-4">
              <h3 className="text-sm font-bold text-neutral-900">Project Details</h3>
            </header>
            <dl className="grid grid-cols-2 gap-3 p-4 text-xs">
              <dt className="text-neutral-500">Project Lead</dt>
              <dd className="m-0 flex items-center gap-1.5 font-medium text-neutral-900 truncate">
                {owner && (
                  <Avatar
                    text={owner.full_name
                      .split(" ")
                      .map((name) => name[0])
                      .join("")
                      .slice(0, 2)}
                    size="small"
                  />
                )}
                <span className="truncate">{owner?.full_name || "Unassigned"}</span>
              </dd>
              <dt className="text-neutral-500">Start Date</dt>
              <dd className="m-0 font-medium text-neutral-900">{data.project.startDate || "Not scheduled"}</dd>
              <dt className="text-neutral-500">Target Date</dt>
              <dd className="m-0 font-medium text-neutral-900">{data.project.targetDate || "Not scheduled"}</dd>
              <dt className="text-neutral-500">Last Activity</dt>
              <dd className="m-0 font-medium text-neutral-900">
                {data.metrics.lastActivityAt
                  ? new Date(data.metrics.lastActivityAt).toLocaleDateString()
                  : "No activity recorded"}
              </dd>
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}
