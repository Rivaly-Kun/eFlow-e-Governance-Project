import { useMemo, useState } from "react";
import { Banknote, Plus, TriangleAlert, WalletCards } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import type { Task } from "../../tasks";
import type { Subtask } from "../../subtasks";
import { getCurrentFiscalYear } from "../constants";
import { useDepartmentBudget } from "../hooks/useDepartmentBudget";
import { getAllocationCashPosition, getTaskBudgetDistribution } from "../selectors/budgetSelectors";
import { createSubtaskBudgetAllocation } from "../services/budgetService";
import { peso, StatusPill } from "./budgetUi";

interface WorkBudgetCardProps {
  task: Task;
  subtask?: Subtask;
  canManage?: boolean;
}

export function WorkBudgetCard({ task, subtask, canManage = false }: WorkBudgetCardProps) {
  const { userProfile } = useAuth();
  const orgId = task.orgId || userProfile?.org_id || userProfile?.departmentId || "";
  const budget = useDepartmentBudget(orgId, getCurrentFiscalYear());
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState(0);
  const [reason, setReason] = useState("");
  const [parentLineId, setParentLineId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const allocation = useMemo(
    () => budget.allocations.find((item) => item.taskId === task.id
      && (subtask ? item.subtaskId === subtask.id : !item.subtaskId)
      && ["pending", "approved"].includes(item.status)),
    [budget.allocations, subtask, task.id],
  );
  const taskAllocation = useMemo(
    () => budget.allocations.find((item) => item.taskId === task.id && !item.subtaskId && item.status === "approved"),
    [budget.allocations, task.id],
  );
  const childAllocations = useMemo(
    () => budget.allocations.filter((item) => item.taskId === task.id && item.subtaskId && ["pending", "approved"].includes(item.status)),
    [budget.allocations, task.id],
  );
  const directTaskRequests = useMemo(
    () => budget.requests.filter((item) => item.allocationId === taskAllocation?.id),
    [budget.requests, taskAllocation?.id],
  );
  const distribution = getTaskBudgetDistribution(taskAllocation?.amount || 0, directTaskRequests, childAllocations);
  const allocationRequests = budget.requests.filter((item) => item.allocationId === allocation?.id);
  const allocationPosition = getAllocationCashPosition(allocation?.amount || 0, allocationRequests);
  const isLead = userProfile?.id === (task.recommendationLeadId || task.assigneeId);
  const canDistribute = Boolean(
    subtask
    && taskAllocation
    && budget.summary?.status === "locked"
    && canManage
    && isLead
    && distribution.distributable > 0,
  );
  const allocationLines = budget.allocationLines.filter((line) => line.allocationId === allocation?.id);
  const taskAllocationLines = budget.allocationLines.filter((line) => line.allocationId === taskAllocation?.id);
  const selectedParentLine = taskAllocationLines.find((line) => line.id === parentLineId);
  const lineDistributed = selectedParentLine
    ? childAllocations
      .filter((item) => item.parentAllocationLineId === selectedParentLine.id)
      .reduce((sum, item) => sum + item.amount, 0)
    : 0;
  const lineDistributable = selectedParentLine
    ? Math.min(Math.max(0, selectedParentLine.amount - lineDistributed), distribution.distributable)
    : distribution.distributable;

  const beginDistribution = () => {
    setError("");
    setEditing((open) => !open);
    setAmount(distribution.distributable);
  };

  const save = async () => {
    if (!subtask) return;
    setBusy(true);
    setError("");
    try {
      await createSubtaskBudgetAllocation({
        taskId: task.id,
        subtaskId: subtask.id,
        parentAllocationLineId: parentLineId || undefined,
        amount,
        reason,
      });
      setEditing(false);
      setAmount(0);
      setReason("");
      setParentLineId("");
      await budget.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The subtask budget could not be assigned.");
    } finally {
      setBusy(false);
    }
  };

  if (!budget.summary && !canDistribute) return null;

  return (
    <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
      <header className="flex items-start justify-between gap-3">
        <div className="flex gap-2">
          <div className="rounded-lg bg-white p-2 text-emerald-700"><Banknote size={14} /></div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-emerald-700">{subtask ? "Subtask budget" : "Task budget"}</div>
            <BudgetAmount allocation={allocation} subtask={subtask} taskAllocation={taskAllocation} distribution={distribution} />
          </div>
        </div>
        {canDistribute && !allocation && (
          <button onClick={beginDistribution} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[9.5px] text-emerald-800">
            <Plus size={10} /> Assign to subtask
          </button>
        )}
      </header>

      {allocation?.status === "approved" && (
        <AllocationSummary
          reserved={allocationPosition.reserved}
          spent={allocationPosition.spent}
          remaining={allocationPosition.remaining}
          lines={allocationLines}
        />
      )}

      {subtask && !allocation && taskAllocation && (
        <TaskFundingContext distribution={distribution} />
      )}

      {editing && subtask && (
        <DistributionEditor
          subtask={subtask}
          totalDistributable={distribution.distributable}
          lineDistributable={lineDistributable}
          taskAllocationLines={taskAllocationLines}
          parentLineId={parentLineId}
          amount={amount}
          reason={reason}
          busy={busy}
          onLineChange={(value) => {
            setParentLineId(value);
            const line = taskAllocationLines.find((item) => item.id === value);
            const used = line
              ? childAllocations.filter((item) => item.parentAllocationLineId === line.id).reduce((sum, item) => sum + item.amount, 0)
              : 0;
            setAmount(line ? Math.min(distribution.distributable, Math.max(0, line.amount - used)) : distribution.distributable);
          }}
          onAmountChange={setAmount}
          onReasonChange={setReason}
          onSave={save}
        />
      )}

      {error && <div className="mt-2 text-[9.5px] text-rose-600">{error}</div>}
    </section>
  );
}

function BudgetAmount({
  allocation,
  subtask,
  taskAllocation,
  distribution,
}: {
  allocation?: { amount: number; status: string };
  subtask?: Subtask;
  taskAllocation?: { amount: number };
  distribution: ReturnType<typeof getTaskBudgetDistribution>;
}) {
  if (allocation) {
    return <div className="mt-1 flex items-center gap-2"><span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-950">{peso.format(allocation.amount)}</span><StatusPill status={allocation.status} /></div>;
  }
  if (!subtask) return <div className="mt-1 text-[11px] text-neutral-600">No allocation assigned</div>;
  if (!taskAllocation) {
    return <div className="mt-1 text-[11px] text-neutral-600">No approved budget for this task</div>;
  }
  if (distribution.distributable > 0) {
    return <div className="mt-1 text-[11px] text-neutral-600">Awaiting Task Leader distribution</div>;
  }
  return <div className="mt-1 text-[11px] text-neutral-600">No distributable task balance remains</div>;
}

function TaskFundingContext({ distribution }: { distribution: ReturnType<typeof getTaskBudgetDistribution> }) {
  if (distribution.distributable > 0) {
    return <div className="mt-3 rounded-lg border border-emerald-100 bg-white/70 p-2.5 text-[9.5px] text-emerald-900">{peso.format(distribution.distributable)} remains on the approved parent-task budget. Your Task Leader must assign it to this subtask before you can request petty cash.</div>;
  }
  if (distribution.taskCashCommitted > 0) {
    return <div className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[9.5px] text-amber-800"><TriangleAlert size={13} className="mt-0.5 shrink-0" /><span>{peso.format(distribution.taskCashCommitted)} is already committed to a task-level cash request. It cannot be reassigned to this subtask; settle or cancel that request first.</span></div>;
  }
  return <div className="mt-3 text-[9.5px] text-neutral-600">The approved task budget has already been distributed to other subtasks.</div>;
}

function AllocationSummary({
  reserved,
  spent,
  remaining,
  lines,
}: {
  reserved: number;
  spent: number;
  remaining: number;
  lines: Array<{ id: string; category: string; particular: string; amount: number }>;
}) {
  return <><div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-emerald-100 bg-white/70 p-2.5 text-[9.5px]"><Metric label="Reserved" value={reserved} /><Metric label="Spent" value={spent} /><Metric label="Remaining" value={remaining} good /></div>{lines.length > 0 && <div className="mt-2 space-y-1 rounded-lg border border-emerald-100 bg-white/70 p-2.5">{lines.map((line) => <div key={line.id} className="flex items-center justify-between gap-3 text-[9px]"><span className="min-w-0 truncate text-neutral-600">{line.category} · {line.particular}</span><strong className="shrink-0 tabular-nums">{peso.format(line.amount)}</strong></div>)}</div>}</>;
}

function DistributionEditor({
  subtask,
  totalDistributable,
  lineDistributable,
  taskAllocationLines,
  parentLineId,
  amount,
  reason,
  busy,
  onLineChange,
  onAmountChange,
  onReasonChange,
  onSave,
}: {
  subtask: Subtask;
  totalDistributable: number;
  lineDistributable: number;
  taskAllocationLines: Array<{ id: string; category: string; particular: string; amount: number }>;
  parentLineId: string;
  amount: number;
  reason: string;
  busy: boolean;
  onLineChange: (value: string) => void;
  onAmountChange: (value: number) => void;
  onReasonChange: (value: string) => void;
  onSave: () => void;
}) {
  return <div className="mt-3 space-y-2 rounded-xl border border-emerald-100 bg-white/80 p-3"><div className="text-[9.5px] text-neutral-600">Assign already approved task funding to <strong>{subtask.title}</strong>. Available to distribute: <strong className="text-emerald-700">{peso.format(totalDistributable)}</strong>.</div>{taskAllocationLines.length > 0 && <select value={parentLineId} onChange={(event) => onLineChange(event.target.value)} className="h-9 w-full rounded-lg border border-emerald-200 bg-white px-2.5 text-[10px]"><option value="">Use the available task balance</option>{taskAllocationLines.map((line) => <option key={line.id} value={line.id}>{line.category} · {line.particular} · up to {peso.format(line.amount)}</option>)}</select>}<div className="grid gap-2 sm:grid-cols-[.45fr_1fr_auto]"><input type="number" min={0} max={lineDistributable} step="0.01" value={amount || ""} onChange={(event) => onAmountChange(Number(event.target.value))} placeholder="Amount" className="h-9 rounded-lg border border-emerald-200 bg-white px-2.5 text-[10px]" /><input value={reason} onChange={(event) => onReasonChange(event.target.value)} placeholder="What does this subtask need?" className="h-9 rounded-lg border border-emerald-200 bg-white px-2.5 text-[10px]" /><button disabled={busy || amount <= 0 || amount > lineDistributable || !reason.trim()} onClick={onSave} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-[9.5px] text-white disabled:opacity-40"><WalletCards size={10} /> {busy ? "Assigning…" : "Assign budget"}</button></div></div>;
}

function Metric({ label, value, good = false }: { label: string; value: number; good?: boolean }) {
  return <div><span className="text-neutral-400">{label}</span><div className={`mt-1 font-['Lexend:Medium',_sans-serif] ${good ? "text-emerald-700" : ""}`}>{peso.format(value)}</div></div>;
}
