import { AlertTriangle, CheckCircle2, Clock3, ListChecks, Milestone, ShieldAlert } from "lucide-react";
import type { ProjectCommandMetrics } from "./types";

const HEALTH = {
  on_track: { label: "On track", tone: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  due_soon: { label: "Due soon", tone: "bg-amber-50 text-amber-700", icon: Clock3 },
  overdue: { label: "Overdue", tone: "bg-red-50 text-red-700", icon: AlertTriangle },
  at_risk: { label: "At risk", tone: "bg-orange-50 text-orange-700", icon: ShieldAlert },
  completed: { label: "Completed", tone: "bg-blue-50 text-blue-700", icon: CheckCircle2 },
} as const;

function Metric({ label, value, hint, icon }: { label: string; value: string | number; hint: string; icon: React.ReactNode }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-3.5 shadow-sm"><div className="flex items-center justify-between"><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</span><span className="text-neutral-400">{icon}</span></div><div className="mt-2 text-[19px] font-semibold text-neutral-950">{value}</div><div className="mt-0.5 text-[9.5px] text-neutral-400">{hint}</div></div>;
}

export function ProjectHealthStrip({ metrics }: { metrics: ProjectCommandMetrics }) {
  const health = HEALTH[metrics.scheduleHealth];
  const HealthIcon = health.icon;
  return <div className="grid grid-cols-2 gap-3 lg:grid-cols-5"><Metric label="Weighted progress" value={`${metrics.progress}%`} hint={`${metrics.taskCompleted}/${metrics.taskTotal} tasks approved`} icon={<ListChecks size={15} />} /><Metric label="Schedule health" value={health.label} hint={metrics.nextDeadline ? `Next: ${new Date(metrics.nextDeadline).toLocaleDateString()}` : "No measurable deadline"} icon={<span className={`rounded-lg p-1 ${health.tone}`}><HealthIcon size={13} /></span>} /><Metric label="Milestones" value={metrics.milestoneOpen} hint={`${metrics.milestoneCompleted} completed`} icon={<Milestone size={15} />} /><Metric label="Attention" value={metrics.overdue + metrics.blocked + metrics.changesRequested} hint={`${metrics.overdue} overdue · ${metrics.blocked} blocked`} icon={<AlertTriangle size={15} />} /><Metric label="Review queue" value={metrics.awaitingReview} hint={`${metrics.changesRequested} changes requested`} icon={<Clock3 size={15} />} /></div>;
}
