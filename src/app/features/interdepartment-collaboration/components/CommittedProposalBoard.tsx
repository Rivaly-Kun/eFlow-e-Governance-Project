import * as React from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Search, Workflow } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import type { UserProfile } from "../../../types";
import { canUserReviewTask } from "../../reviews";
import { getTaskTeamMemberIds, ScopedTaskKanban, TaskDetailDrawer, type Task } from "../../tasks";
import type { CommittedProposalDeliverySummary } from "../selectors/deliveryProgress";
import { countOverdueDeliveryTasks, filterCommittedProposalBoardTasks } from "../selectors/deliveryBoard";

export function CommittedProposalBoard({
  delivery,
  profiles,
  readOnly = false,
}: {
  delivery: CommittedProposalDeliverySummary;
  profiles: UserProfile[];
  readOnly?: boolean;
}) {
  const { user, userProfile } = useAuth();
  const [query, setQuery] = React.useState("");
  const [projectId, setProjectId] = React.useState("all");
  const [selectedTaskId, setSelectedTaskId] = React.useState<string | null>(null);
  const currentUserId = user?.id || userProfile?.id || "";
  const boardRole = ["dept_head", "department_head", "assistant_head", "super_admin"].includes(userProfile?.role || "")
    ? "depthead"
    : "employee";

  const visibleTasks = React.useMemo(() => {
    return filterCommittedProposalBoardTasks(delivery.tasks, query, projectId);
  }, [delivery.tasks, projectId, query]);

  const selectedTask = selectedTaskId
    ? delivery.tasks.find((task) => task.id === selectedTaskId) || null
    : null;
  const canPostProgress = Boolean(
    !readOnly &&
    selectedTask &&
    currentUserId &&
    getTaskTeamMemberIds(selectedTask).includes(currentUserId),
  );
  const overdueCount = countOverdueDeliveryTasks(delivery.tasks);

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-950 px-5 py-4 text-white">
          <div>
            <div className="flex items-center gap-2 text-[14px] font-['Lexend:SemiBold',_sans-serif]"><Workflow size={16} /> Delivery board</div>
            <p className="mt-1 text-[9.5px] text-neutral-400">Every column is backed by the live task lifecycle. Review and completion still use their governed workflows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BoardSignal icon={<Workflow size={11} />} value={delivery.remainingTaskCount} label="remaining" />
            <BoardSignal icon={<ClipboardCheck size={11} />} value={delivery.awaitingReviewCount} label="in review" />
            <BoardSignal icon={<CheckCircle2 size={11} />} value={delivery.completedTaskCount} label="approved" />
            <BoardSignal icon={<AlertTriangle size={11} />} value={overdueCount} label="overdue" warning={overdueCount > 0} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search proposal tasks…"
              className="h-9 w-full rounded-lg border border-neutral-200 bg-neutral-50 pl-8 pr-3 text-[10.5px] text-neutral-800 outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <select
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            className="h-9 min-w-[190px] rounded-lg border border-neutral-200 bg-white px-3 text-[10.5px] text-neutral-700 outline-none focus:border-violet-300"
          >
            <option value="all">All proposal projects</option>
            {delivery.projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
          </select>
          <span className="ml-auto text-[9.5px] text-neutral-400">{visibleTasks.length} of {delivery.taskCount} tasks</span>
        </div>

        <div className="p-4">
          {visibleTasks.length > 0 ? (
            <ScopedTaskKanban
              tasks={visibleTasks}
              profiles={profiles}
              role={boardRole}
              currentUserId={currentUserId}
              currentUserName={userProfile?.full_name || userProfile?.fullName || ""}
              readOnly={readOnly}
              onOpenTask={(task) => setSelectedTaskId(task.id)}
            />
          ) : (
            <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-16 text-center">
              <Workflow size={26} className="mx-auto text-neutral-300" />
              <div className="mt-3 text-[12px] font-medium text-neutral-700">No matching delivery tasks</div>
              <p className="mt-1 text-[10px] text-neutral-400">Clear the search or choose another project.</p>
            </div>
          )}
        </div>
      </section>

      <TaskDetailDrawer
        task={selectedTask as Task | null}
        onClose={() => setSelectedTaskId(null)}
        canReview={Boolean(!readOnly && selectedTask && canUserReviewTask(selectedTask, currentUserId, userProfile?.role))}
        canPostProgress={canPostProgress}
        canDiscuss={!readOnly}
        readOnly={readOnly}
      />
    </div>
  );
}

function BoardSignal({ icon, value, label, warning = false }: { icon: React.ReactNode; value: number; label: string; warning?: boolean }) {
  return <span className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[9px] ${warning ? "border-red-400/30 bg-red-500/15 text-red-200" : "border-white/10 bg-white/5 text-neutral-300"}`}>{icon}<strong className="text-white">{value}</strong>{label}</span>;
}
