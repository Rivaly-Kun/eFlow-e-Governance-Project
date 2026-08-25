import type { ReactNode } from "react";
import { Banknote, CheckCircle2, CircleDollarSign, ShieldAlert } from "lucide-react";
import { buildProposalBudgetFromTasks, getProposalBudgetReadiness, type TaskBudgetSource } from "../selectors/budgetSelectors";
import { peso } from "./budgetUi";

export function ProposalTaskBudgetSummary({
  tasks,
  fiscalYear = new Date().getFullYear(),
  fundingOwnerName,
}: {
  tasks: TaskBudgetSource[];
  fiscalYear?: number;
  fundingOwnerName?: string;
}) {
  const budget = buildProposalBudgetFromTasks(tasks, fiscalYear);
  const readiness = getProposalBudgetReadiness(tasks);
  const enabledCount = tasks.filter((task) => task.enabled !== false).length;

  return <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-950 px-5 py-4 text-white">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10"><Banknote size={16} /></div>
        <div><div className="text-[9px] uppercase tracking-[.18em] text-neutral-400">Proposal funding roll-up</div><h2 className="mt-1 text-[14px] font-['Lexend:SemiBold',_sans-serif]">Every task carries its own budget</h2><p className="mt-1 max-w-2xl text-[10px] leading-relaxed text-neutral-400">Open a task below to mark it funded or no-cost. Proposal totals are calculated automatically and cannot drift away from delivery work.</p></div>
      </div>
      <div className="text-right"><div className="text-[9px] uppercase tracking-wide text-neutral-400">Proposal total</div><div className="mt-1 text-[19px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">{peso.format(budget.totalAmount)}</div><div className="text-[9px] text-neutral-400">FY {fiscalYear} · {fundingOwnerName ? `${fundingOwnerName} Department Budget` : "Department Budget"}</div></div>
    </header>
    <div className="grid gap-px bg-neutral-100 sm:grid-cols-4">
      <Metric label="Tasks" value={enabledCount} icon={<CircleDollarSign size={13} />} />
      <Metric label="Funded" value={readiness.fundedCount} tone="emerald" icon={<Banknote size={13} />} />
      <Metric label="No cost" value={readiness.noCostCount} icon={<CheckCircle2 size={13} />} />
      <Metric label="Needs decision" value={readiness.missingTaskKeys.length + readiness.invalidTaskKeys.length} tone={readiness.ready ? "emerald" : "amber"} icon={<ShieldAlert size={13} />} />
    </div>
    <div className={`border-t px-5 py-3 text-[10px] ${readiness.ready ? "border-emerald-100 bg-emerald-50 text-emerald-800" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
      {readiness.ready
        ? "Funding schedule complete. Publishing can reserve this proposal and create matching task allocations."
        : "Funding is incomplete. Every enabled task must be marked funded with valid particulars, or explicitly marked no cost."}
    </div>
  </section>;
}

function Metric({ label, value, tone = "neutral", icon }: { label: string; value: number; tone?: "neutral" | "emerald" | "amber"; icon: ReactNode }) {
  const color = tone === "emerald" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-neutral-700";
  return <div className="flex items-center justify-between bg-white px-4 py-3"><div><div className="text-[9px] uppercase tracking-wide text-neutral-400">{label}</div><div className={`mt-1 text-[16px] font-['Lexend:SemiBold',_sans-serif] ${color}`}>{value}</div></div><span className={color}>{icon}</span></div>;
}
