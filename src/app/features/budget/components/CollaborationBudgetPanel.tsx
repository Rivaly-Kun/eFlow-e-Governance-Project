import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Save, ShieldAlert } from "lucide-react";
import type { CollaborationDraftSnapshot, CollaborationSnapshotTask } from "../../interdepartment-collaboration";
import { buildProposalBudgetFromTasks, getBudgetLineAmount, getProposalBudgetReadiness } from "../selectors/budgetSelectors";
import { peso } from "./budgetUi";
import { ProposalTaskBudgetSummary } from "./ProposalTaskBudgetSummary";
import { TaskBudgetDialog } from "./TaskBudgetDialog";

export function CollaborationBudgetPanel({ snapshot, editable, fundingOwnerName, onSave }: {
  snapshot: CollaborationDraftSnapshot;
  editable: boolean;
  fundingOwnerName?: string;
  onSave: (snapshot: CollaborationDraftSnapshot, summary: string) => Promise<void>;
}) {
  const [tasks, setTasks] = useState(snapshot.tasks);
  const [openTaskKey, setOpenTaskKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => setTasks(snapshot.tasks), [snapshot]);
  const budget = useMemo(() => buildProposalBudgetFromTasks(tasks, snapshot.budget?.fiscalYear), [snapshot.budget?.fiscalYear, tasks]);
  const readiness = getProposalBudgetReadiness(tasks);
  const dirty = JSON.stringify(tasks) !== JSON.stringify(snapshot.tasks) || JSON.stringify(budget) !== JSON.stringify(snapshot.budget);
  const openTask = tasks.find((task) => task.key === openTaskKey);
  const patchTask = (taskKey: string, patch: Partial<CollaborationSnapshotTask>) => setTasks((current) => current.map((task) => task.key === taskKey ? { ...task, ...patch } : task));

  return <div className="space-y-4">
    <ProposalTaskBudgetSummary tasks={tasks} fiscalYear={budget.fiscalYear} fundingOwnerName={fundingOwnerName} />
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <header className="flex items-center justify-between border-b border-neutral-100 px-4 py-3"><div><h3 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Delivery task funding</h3><p className="mt-0.5 text-[9.5px] text-neutral-500">The operational allocation for each task is created from this exact schedule.</p></div><div className="text-[10px] text-neutral-500">{tasks.filter((task) => task.enabled !== false).length} task(s)</div></header>
      <div className="divide-y divide-neutral-100">
        {tasks.filter((task) => task.enabled !== false).map((task) => {
          const total = (task.budgetLines || []).reduce((sum, line) => sum + getBudgetLineAmount(line), 0);
          const complete = task.budgetDecision === "no_cost" || (task.budgetDecision === "funded" && total > 0);
          return <button key={task.key} type="button" disabled={!editable} onClick={() => setOpenTaskKey(task.key)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-neutral-50 disabled:cursor-default">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${complete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{complete ? <CheckCircle2 size={14} /> : <ShieldAlert size={14} />}</span>
            <span className="min-w-0 flex-1"><span className="block truncate text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{task.title}</span><span className="mt-0.5 block truncate text-[9px] text-neutral-500">{task.programTitle} · {task.projectTitle} · {task.activityTitle}</span></span>
            <span className="text-right"><span className="block text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{task.budgetDecision === "funded" ? peso.format(total) : task.budgetDecision === "no_cost" ? "No cost" : "Decision needed"}</span><span className="mt-0.5 block text-[9px] text-neutral-400">{task.budgetDecision === "funded" ? `${task.budgetLines?.length || 0} particular(s)` : "Task funding"}</span></span>
            {editable && <ChevronRight size={13} className="text-neutral-300" />}
          </button>;
        })}
      </div>
    </section>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10.5px] leading-relaxed text-blue-800"><strong>Owner-department funding gate:</strong> publishing reserves {peso.format(budget.totalAmount)} exactly once from {fundingOwnerName ? `${fundingOwnerName}'s` : "the owner's"} locked annual budget and creates matching allocations for every funded task. No-cost tasks create no allocation.</div>
    {editable && <div className="flex items-center justify-between gap-3"><div className={`text-[10px] ${readiness.ready ? "text-emerald-700" : "text-amber-700"}`}>{readiness.ready ? "Every task has a complete funding decision." : "Complete every task budget before publication."}</div><button type="button" disabled={!dirty || saving} onClick={async () => { setSaving(true); try { await onSave({ ...snapshot, tasks, budget }, "Task funding schedule updated"); } finally { setSaving(false); } }} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40"><Save size={12} />{saving ? "Publishing…" : "Publish funding revision"}</button></div>}
    {openTask && <TaskBudgetDialog open taskKey={openTask.key} taskTitle={openTask.title} decision={openTask.budgetDecision || "missing"} noCostReason={openTask.budgetNoCostReason} lines={openTask.budgetLines || []} fundingSource={fundingOwnerName ? `${fundingOwnerName} Department Budget` : undefined} readOnly={!editable} onChange={(patch) => patchTask(openTask.key, patch)} onClose={() => setOpenTaskKey(null)} />}
  </div>;
}
