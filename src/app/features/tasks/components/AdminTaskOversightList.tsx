import { AlertTriangle, Building2, CalendarDays, ChevronRight, CircleUserRound } from "lucide-react";
import { formatDate, ProgressBar, relativeDays } from "../../../components/workflow/primitives";
import { PriorityPill, TaskStatusBadge } from "../../../components/workflow/StatusBadges";
import type { Task } from "../taskTypes";

export function AdminTaskOversightList({
  tasks,
  orgName,
  onOpen,
}: {
  tasks: Task[];
  orgName: (orgId?: string) => string;
  onOpen: (task: Task) => void;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3.5 sm:px-5">
        <div>
          <h2 className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">Visible operational work</h2>
          <p className="mt-0.5 text-[10.5px] text-neutral-500">Open a record to inspect its delivery details, evidence, discussion, and audit history.</p>
        </div>
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-medium text-neutral-600">{tasks.length} records</span>
      </div>

      <div className="divide-y divide-neutral-100">
        {tasks.slice(0, 200).map((task) => {
          const deadline = task.deadline || task.dueDate;
          const relative = relativeDays(deadline);
          const progress = Math.max(0, Math.min(100, task.percentComplete ?? 0));
          const unassigned = !task.assigneeId || task.status === "pending_assignment";
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onOpen(task)}
              className="group grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-neutral-50/80 sm:px-5 lg:grid-cols-[minmax(260px,1.7fr)_minmax(170px,1fr)_minmax(150px,.85fr)_145px_20px] lg:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <TaskStatusBadge status={task.status} rejected={Boolean(task.rejectionNote && task.status === "in_progress")} size="sm" />
                  <PriorityPill priority={task.priority} />
                  {relative.overdue && <span className="inline-flex items-center gap-1 text-[9.5px] font-medium text-red-600"><AlertTriangle size={10} /> Overdue</span>}
                </div>
                <h3 className="mt-2 truncate text-[13px] font-semibold text-neutral-950">{task.title}</h3>
                <p className="mt-0.5 truncate text-[10.5px] text-neutral-500">{task.projectTitle || task.programTitle || "No proposal hierarchy recorded"}</p>
              </div>

              <InfoCell icon={<CircleUserRound size={13} />} label="Responsible people" value={task.teamMemberNames?.length ? task.teamMemberNames.join(", ") : task.assigneeName || "Unassigned"} alert={unassigned} />
              <InfoCell icon={<Building2 size={13} />} label="Organization" value={orgName(task.orgId)} />

              <div className="min-w-0">
                <div className="flex items-center justify-between gap-2 text-[9.5px] text-neutral-500">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={11} /> {formatDate(deadline)}</span>
                  <span className={relative.overdue ? "font-medium text-red-600" : "text-neutral-400"}>{relative.label}</span>
                </div>
                <div className="mt-2"><ProgressBar value={progress} tone={task.status === "completed" ? "good" : relative.overdue ? "bad" : "neutral"} /></div>
                <div className="mt-1 text-right text-[9.5px] font-medium tabular-nums text-neutral-500">{progress}%</div>
              </div>

              <ChevronRight size={16} className="hidden text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500 lg:block" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

function InfoCell({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: string; alert?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-[0.1em] text-neutral-400">{icon}{label}</div>
      <div className={`mt-1 truncate text-[11px] font-medium ${alert ? "text-amber-700" : "text-neutral-700"}`}>{value}</div>
    </div>
  );
}
