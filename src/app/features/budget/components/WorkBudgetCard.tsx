import { useMemo, useState } from "react";
import { Banknote, Plus, WalletCards } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import type { Task } from "../../tasks";
import type { Subtask } from "../../subtasks";
import { useDepartmentBudget } from "../hooks/useDepartmentBudget";
import { createWorkBudgetAllocation } from "../services/budgetService";
import { getAllocationCashPosition } from "../selectors/budgetSelectors";
import { peso, StatusPill } from "./budgetUi";

export function WorkBudgetCard({ task, subtask, canManage = false }: { task: Task; subtask?: Subtask; canManage?: boolean }) {
  const { userProfile } = useAuth(); const orgId = task.orgId || userProfile?.org_id || userProfile?.departmentId || "";
  const budget = useDepartmentBudget(orgId, new Date().getFullYear());
  const [editing, setEditing] = useState(false); const [amount, setAmount] = useState(0); const [reason, setReason] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const allocation = useMemo(() => budget.allocations.find((item) => item.taskId === task.id && (subtask ? item.subtaskId === subtask.id : !item.subtaskId) && ["pending", "approved"].includes(item.status)), [budget.allocations, subtask, task.id]);
  const requests = budget.requests.filter((item) => item.allocationId === allocation?.id);
  const { reserved, spent, remaining } = getAllocationCashPosition(
    allocation?.amount || 0,
    requests,
  );
  const isManager = ["dept_head", "department_head", "assistant_head"].includes(userProfile?.role || "");
  const isLead = userProfile?.id === (task.recommendationLeadId || task.assigneeId);
  const canCreate = Boolean(budget.summary?.status === "locked" && canManage && (subtask ? isManager || isLead : isManager));
  const save = async () => { setBusy(true); setError(""); try { await createWorkBudgetAllocation({ taskId: task.id, subtaskId: subtask?.id, amount, reason }); setEditing(false); setAmount(0); setReason(""); await budget.refresh(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Allocation could not be created."); } finally { setBusy(false); } };
  if (!budget.summary && !canCreate) return null;
  return <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3"><div className="flex items-start justify-between gap-3"><div className="flex gap-2"><div className="rounded-lg bg-white p-2 text-emerald-700"><Banknote size={14} /></div><div><div className="text-[10px] uppercase tracking-wide text-emerald-700">{subtask ? "Subtask budget" : "Task budget"}</div>{allocation ? <div className="mt-1 flex items-center gap-2"><span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-950">{peso.format(allocation.amount)}</span><StatusPill status={allocation.status} /></div> : <div className="mt-1 text-[11px] text-neutral-600">No allocation assigned</div>}</div></div>{canCreate && !allocation && <button onClick={() => setEditing((value) => !value)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-1.5 text-[9.5px] text-emerald-800"><Plus size={10} /> {subtask && !isManager ? "Propose" : "Allocate"}</button>}</div>
    {allocation?.status === "approved" && <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-emerald-100 bg-white/70 p-2.5 text-[9.5px]"><div><span className="text-neutral-400">Reserved</span><div className="mt-1 font-['Lexend:Medium',_sans-serif]">{peso.format(reserved)}</div></div><div><span className="text-neutral-400">Spent</span><div className="mt-1 font-['Lexend:Medium',_sans-serif]">{peso.format(spent)}</div></div><div><span className="text-neutral-400">Remaining</span><div className="mt-1 font-['Lexend:Medium',_sans-serif] text-emerald-700">{peso.format(remaining)}</div></div></div>}
    {editing && <div className="mt-3 grid gap-2 sm:grid-cols-[.45fr_1fr_auto]"><input type="number" min={0} step="0.01" value={amount || ""} onChange={(event) => setAmount(Number(event.target.value))} placeholder="Amount" className="h-9 rounded-lg border border-emerald-200 bg-white px-2.5 text-[10px]" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder={subtask ? "What does this subtask need?" : "Purpose of task allocation"} className="h-9 rounded-lg border border-emerald-200 bg-white px-2.5 text-[10px]" /><button disabled={busy || amount <= 0 || !reason.trim()} onClick={save} className="inline-flex h-9 items-center gap-1 rounded-lg bg-emerald-700 px-3 text-[9.5px] text-white disabled:opacity-40"><WalletCards size={10} /> Submit</button></div>}
    {error && <div className="mt-2 text-[9.5px] text-rose-600">{error}</div>}
  </section>;
}
