import * as React from "react";
import { AlertTriangle, Archive, ArrowRight, CheckCircle2, Clock3, FolderKanban, Loader2, PackageCheck, ShieldCheck } from "lucide-react";
import { ProgressBar, formatDate } from "../../../components/workflow/primitives";
import type { CommittedProposalDeliverySummary, ProposalDeliveryStage } from "../selectors/deliveryProgress";

export const DELIVERY_STAGE_LABELS: Record<ProposalDeliveryStage, string> = {
  publishing: "Preparing delivery",
  active: "Delivery active",
  attention: "Attention required",
  awaiting_review: "Awaiting review",
  ready_to_complete: "Ready to complete",
  ready_to_archive: "Ready to archive",
  archived: "Delivery archived",
};

export function CommittedProposalDeliveryPanel({
  summary,
  canManage,
  busy,
  onOpenProject,
  onMarkCompleted,
  onArchive,
}: {
  summary: CommittedProposalDeliverySummary;
  canManage: boolean;
  busy: boolean;
  onOpenProject: (projectId: string) => void;
  onMarkCompleted: () => Promise<void>;
  onArchive: () => Promise<void>;
}) {
  const [confirmArchive, setConfirmArchive] = React.useState(false);
  const stageTone = summary.stage === "attention"
    ? "border-red-200 bg-red-50 text-red-800"
    : summary.stage === "awaiting_review"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : ["ready_to_complete", "ready_to_archive", "archived"].includes(summary.stage)
        ? "border-emerald-200 bg-emerald-50 text-emerald-800"
        : "border-blue-200 bg-blue-50 text-blue-800";

  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <div className="bg-gradient-to-br from-neutral-950 to-neutral-800 p-5 text-white">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">Operational delivery</div>
            <h2 className="mt-1 text-[16px] font-['Lexend:SemiBold',_sans-serif]">{DELIVERY_STAGE_LABELS[summary.stage]}</h2>
            <p className="mt-1 text-[10.5px] text-neutral-300">
              {summary.completedTaskCount}/{summary.taskCount} tasks approved · {summary.completedProjectCount}/{summary.projectCount} projects completed
            </p>
          </div>
          <div className="text-right"><div className="text-[30px] font-['Lexend:SemiBold',_sans-serif] leading-none">{summary.progress}%</div><div className="mt-1 text-[9px] uppercase tracking-wide text-neutral-400">Weighted progress</div></div>
        </div>
        <div className="mt-4"><ProgressBar value={summary.progress} tone={summary.progress === 100 ? "good" : "neutral"} /></div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
          <Metric icon={<FolderKanban size={13} />} value={`${summary.completedProjectCount}/${summary.projectCount}`} label="Projects complete" />
          <Metric icon={<CheckCircle2 size={13} />} value={`${summary.completedTaskCount}/${summary.taskCount}`} label="Tasks approved" />
          <Metric icon={<Clock3 size={13} />} value={summary.remainingTaskCount} label="Tasks remaining" />
          <Metric icon={<ShieldCheck size={13} />} value={summary.awaitingReviewCount} label="Awaiting review" />
          <Metric icon={<AlertTriangle size={13} />} value={summary.overdueCount} label="Overdue" bad={summary.overdueCount > 0} />
        </div>

        <div className={`mt-4 rounded-xl border px-4 py-3 ${stageTone}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[11px] font-['Lexend:SemiBold',_sans-serif]">{DELIVERY_STAGE_LABELS[summary.stage]}</div>
              <p className="mt-0.5 text-[9.5px] opacity-80">
                {summary.stage === "ready_to_complete" ? "Every operational task is approved. Mark the proposal projects completed to close delivery." :
                  summary.stage === "ready_to_archive" ? "Delivery is complete. Archive the operational projects when the records no longer need to remain active." :
                  summary.stage === "archived" ? "The operational projects are archived while governance history remains available here." :
                  summary.stage === "awaiting_review" ? `${summary.awaitingReviewCount} task submission(s) are waiting for their assigned reviewer.` :
                  summary.stage === "attention" ? `${summary.overdueCount} overdue and ${summary.changesRequestedCount} revision item(s) need attention.` :
                  summary.stage === "publishing" ? "Operational projects are still being discovered. Refresh if publishing has just completed." :
                  `${summary.remainingTaskCount} task(s) remain before delivery can be completed.`}
              </p>
            </div>
            {canManage && summary.readyToComplete && <button type="button" disabled={busy} onClick={() => void onMarkCompleted()} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-[10px] font-medium text-white disabled:opacity-50">{busy ? <Loader2 size={12} className="animate-spin" /> : <PackageCheck size={12} />} Mark projects completed</button>}
            {canManage && summary.readyToArchive && !confirmArchive && <button type="button" disabled={busy} onClick={() => setConfirmArchive(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-[10px] font-medium text-white disabled:opacity-50"><Archive size={12} /> Archive completed proposal</button>}
          </div>
          {confirmArchive && <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-emerald-200 pt-3"><span className="text-[9.5px]">Archive all completed operational projects? Governance history and task audit records remain retained.</span><div className="flex gap-2"><button type="button" onClick={() => setConfirmArchive(false)} className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1.5 text-[9.5px]">Cancel</button><button type="button" disabled={busy} onClick={() => void onArchive().then(() => setConfirmArchive(false))} className="rounded-lg bg-neutral-900 px-2.5 py-1.5 text-[9.5px] text-white disabled:opacity-50">Confirm archive</button></div></div>}
        </div>

        <div className="mt-4 space-y-2">
          {summary.projects.map((project) => {
            const projectTasks = summary.tasks.filter((task) => task.linkedProjectId === project.id);
            const completed = projectTasks.filter((task) => task.status === "completed").length;
            const progress = projectTasks.length ? Math.round(projectTasks.reduce((total, task) => total + (task.status === "completed" ? 100 : task.percentComplete || 0), 0) / projectTasks.length) : project.status === "completed" || project.status === "archived" ? 100 : 0;
            return <button key={project.id} type="button" onClick={() => onOpenProject(project.id)} className="flex w-full items-center gap-3 rounded-xl border border-neutral-200 px-3 py-3 text-left transition hover:border-neutral-300 hover:bg-neutral-50"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600"><FolderKanban size={14} /></span><span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{project.title}</span><span className="mt-0.5 block text-[9px] text-neutral-400">{completed}/{projectTasks.length} tasks approved · Target {formatDate(project.targetDate)}</span><span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-neutral-100"><span className="block h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></span></span><span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[8.5px] capitalize text-neutral-600">{project.status.replace("_", " ")}</span><ArrowRight size={13} className="text-neutral-400" /></button>;
          })}
        </div>
      </div>
    </section>
  );
}

function Metric({ icon, value, label, bad = false }: { icon: React.ReactNode; value: string | number; label: string; bad?: boolean }) {
  return <div className={`rounded-xl border p-3 ${bad ? "border-red-100 bg-red-50" : "border-neutral-100 bg-neutral-50"}`}><div className={`flex items-center gap-1.5 text-[15px] font-semibold ${bad ? "text-red-700" : "text-neutral-900"}`}>{icon}{value}</div><div className="mt-1 text-[8px] uppercase tracking-wide text-neutral-400">{label}</div></div>;
}
