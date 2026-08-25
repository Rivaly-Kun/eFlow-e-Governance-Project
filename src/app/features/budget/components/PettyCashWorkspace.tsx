import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, Plus, ReceiptText, RotateCcw, Send, Trash2, WalletCards } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useDepartmentBudget } from "../hooks/useDepartmentBudget";
import { acknowledgePettyCashRelease, createPettyCashRequest, createReceiptSignedUrl, resubmitPettyCashRequest, submitPettyCashLiquidation } from "../services/budgetService";
import { getAllocationCashPosition, getEligiblePettyCashAllocations } from "../selectors/budgetSelectors";
import type { PettyCashRequest, ReceiptDraft } from "../types";
import { BudgetCard, BudgetEmpty, peso, StatusPill } from "./budgetUi";
import { FiscalYearControl } from "./FiscalYearControl";
import { getCurrentFiscalYear } from "../constants";
import { useNotificationNavigationIntent } from "../../notifications";

export function PettyCashWorkspace() {
  const { userProfile } = useAuth(); const orgId = userProfile?.org_id || userProfile?.departmentId || "";
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear()); const budget = useDepartmentBudget(orgId, fiscalYear);
  const { tasks } = useTasks(); const [requestDialog, setRequestDialog] = useState<"new" | string>(""); const [liquidatingId, setLiquidatingId] = useState("");
  const [focusedRequestId, setFocusedRequestId] = useState("");
  const mine = useMemo(() => budget.requests.filter((item) => item.requesterId === userProfile?.id || item.cashRecipientId === userProfile?.id), [budget.requests, userProfile?.id]);
  const allocations = useMemo(
    () => getEligiblePettyCashAllocations(budget.allocations, tasks, userProfile?.id || ""),
    [budget.allocations, tasks, userProfile?.id],
  );
  const selectedRequest = mine.find((item) => item.id === liquidatingId);
  const correctedRequest = mine.find((item) => item.id === requestDialog);
  const pending = mine.filter((item) => ["pending", "pending_leader_review", "pending_department_approval", "approved", "scheduled_for_release", "partially_released"].includes(item.status)).length;
  const ready = mine.filter((item) => ["released", "changes_requested", "overdue_liquidation"].includes(item.status)).length;
  const settled = mine.filter((item) => item.status === "settled").length;
  useNotificationNavigationIntent(
    (intent) => intent.kind === "budget",
    (intent) => {
      if (budget.loading) return false;
      const requestId = intent.financialRecordType === "petty_cash_request"
        ? intent.financialRecordId
        : intent.financialRecordType === "petty_cash_release"
          ? budget.releases.find((item) => item.id === intent.financialRecordId)?.requestId
          : intent.financialRecordType === "petty_cash_liquidation"
            ? budget.liquidations.find((item) => item.id === intent.financialRecordId)?.requestId
            : mine.find((item) => item.taskId === intent.taskId)?.id;
      if (requestId) setFocusedRequestId(requestId);
      return true;
    },
    [budget.liquidations, budget.loading, budget.releases, mine],
  );
  return <div className="min-h-full bg-neutral-50 p-6 font-['Lexend:Regular',_sans-serif] sm:p-8"><div className="mx-auto max-w-[1280px] space-y-5"><header className="flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div><div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">My workspace · Financial requests</div><h1 className="mt-1 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-950">Petty Cash &amp; Expenses</h1><p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-neutral-500">Request cash against your funded task or assigned subtask, follow Team Leader and department approval, acknowledge release, then liquidate every released peso with receipts and returned cash.</p></div><div className="flex flex-wrap gap-2"><FiscalYearControl value={fiscalYear} onChange={setFiscalYear} /><button onClick={() => setRequestDialog("new")} disabled={!budget.summary || budget.summary.status !== "locked" || !allocations.length} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40"><Plus size={12} /> New request</button></div></header>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><BudgetCard label="Daily department ceiling" value={peso.format(budget.summary?.dailyPettyCashReleaseLimit || 0)} note={`${peso.format(budget.summary?.dailyReleaseRemaining || 0)} release room today`} icon={<WalletCards size={15} />} /><BudgetCard label="In approval or release" value={String(pending)} note="Leader → Head/Assistant → scheduled cash" icon={<Clock3 size={15} />} tone={pending ? "warn" : "good"} /><BudgetCard label="Receipts required" value={String(ready)} note="Released cash awaiting liquidation" icon={<ReceiptText size={15} />} tone={ready ? "warn" : "good"} /><BudgetCard label="Settled" value={String(settled)} note="Verified expense packages" icon={<CheckCircle2 size={15} />} tone="good" /></div>
    {budget.error ? <BudgetEmpty title="Budget data could not be loaded" description={budget.error} /> : !budget.summary ? <BudgetEmpty title="Department budget is not ready" description="Your Department Head must create and lock the annual budget before petty-cash requests can be made." /> : !allocations.length ? <BudgetEmpty title="No funded work allocation" description="Employees can request only from an approved allocation for their assigned subtask. A Task Leader may also request from the parent task allocation." /> : !mine.length ? <BudgetEmpty title="No petty-cash requests" description="Start a request from an approved task or subtask allocation. Approval reserves the amount; only verified receipts become actual spending." action={<button onClick={() => setRequestDialog("new")} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-[10.5px] text-white">Create first request</button>} /> : <RequestList requests={mine} releases={budget.releases} liquidations={budget.liquidations} tasks={tasks} currentUserId={userProfile?.id || ""} focusedRequestId={focusedRequestId} onCorrect={setRequestDialog} onLiquidate={setLiquidatingId} onChanged={budget.refresh} />}
    {requestDialog && <RequestDialog allocations={allocations} requests={budget.requests} tasks={tasks} correction={correctedRequest} onClose={() => setRequestDialog("")} onSaved={async () => { setRequestDialog(""); await budget.refresh(); }} />}
    {selectedRequest && <LiquidationDialog request={selectedRequest} orgId={orgId} perReceiptLimit={budget.summary?.perReceiptLimit || 0} allowReceiptOverride={Boolean(budget.summary?.allowReceiptLimitOverride)} onClose={() => setLiquidatingId("")} onSaved={async () => { setLiquidatingId(""); await budget.refresh(); }} />}
  </div></div>;
}

function RequestList({
  requests,
  releases,
  liquidations,
  tasks,
  currentUserId,
  focusedRequestId,
  onCorrect,
  onLiquidate,
  onChanged,
}: {
  requests: ReturnType<typeof useDepartmentBudget>["requests"];
  releases: ReturnType<typeof useDepartmentBudget>["releases"];
  liquidations: ReturnType<typeof useDepartmentBudget>["liquidations"];
  tasks: ReturnType<typeof useTasks>["tasks"];
  currentUserId: string;
  focusedRequestId?: string;
  onCorrect: (id: string) => void;
  onLiquidate: (id: string) => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const acknowledge = async (releaseId: string) => {
    setBusy(releaseId); setError("");
    try { await acknowledgePettyCashRelease(releaseId); await onChanged(); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Cash receipt could not be acknowledged."); }
    finally { setBusy(""); }
  };
  useEffect(() => {
    if (!focusedRequestId) return;
    const timer = window.setTimeout(() => document.getElementById(`petty-cash-request-${focusedRequestId}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 120);
    return () => window.clearTimeout(timer);
  }, [focusedRequestId]);
  return (
    <div className="space-y-3">
      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10px] text-rose-700">{error}</div>}
      <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {requests.map((request) => {
        const task = tasks.find((item) => item.id === request.taskId);
        const latest = liquidations.find((item) => item.requestId === request.id);
        const requestReleases = releases.filter((item) => item.requestId === request.id);
        const unacknowledged = requestReleases.find((item) => item.status === "released" && item.recipientId === currentUserId && !item.acknowledgedAt);
        return (
          <div id={`petty-cash-request-${request.id}`} key={request.id} className={`border-b border-neutral-100 p-4 last:border-0 ${focusedRequestId === request.id ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : ""}`}>
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                    PC-{String(request.requestNumber).padStart(5, "0")} · {request.subtaskTitle || task?.title || request.taskTitle || "Assigned work"}
                  </div>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-1 text-[10px] text-neutral-500">{request.purpose}</div>
                <div className="mt-1 text-[9.5px] text-neutral-500">Reviewer: {request.taskLeaderName || "Team Leader"} → Department Head/Assistant</div>
                {request.approvalReason && <div className="mt-1 text-[9.5px] text-neutral-500">Decision note: {request.approvalReason}</div>}
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wide text-neutral-400">Amount</div>
                <div className="mt-1 text-[12px] font-['Lexend:SemiBold',_sans-serif]">{peso.format(request.approvedAmount ?? request.requestedAmount)}</div>
              </div>
              <div className="flex items-center justify-end">
                {["leader_changes_requested", "department_changes_requested"].includes(request.status) ? (
                  <button onClick={() => onCorrect(request.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 text-[9.5px] text-amber-800">
                    <RotateCcw size={11} /> Correct request
                  </button>
                ) : unacknowledged ? (
                  <button disabled={busy === unacknowledged.id} onClick={() => void acknowledge(unacknowledged.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[9.5px] text-white disabled:opacity-40">
                    <CheckCircle2 size={11} /> Acknowledge cash
                  </button>
                ) : ["released", "changes_requested", "overdue_liquidation"].includes(request.status) ? (
                  <button onClick={() => onLiquidate(request.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-[9.5px] text-white">
                    {request.status === "changes_requested" ? <RotateCcw size={11} /> : <ReceiptText size={11} />}
                    {request.status === "changes_requested" ? "Resubmit receipts" : "Submit receipts"}
                  </button>
                ) : request.status === "settled" ? (
                  <span className="text-[9.5px] text-emerald-700">Spent {peso.format(request.actualSpent || 0)} · returned {peso.format(request.returnedAmount || 0)}</span>
                ) : null}
              </div>
            </div>
            {requestReleases.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{requestReleases.map((release) => <div key={release.id} className="rounded-lg border border-blue-100 bg-blue-50 px-2.5 py-2 text-[9px] text-blue-800"><strong>{peso.format(release.amount)}</strong> · {release.scheduledDate} · {release.status}{release.acknowledgedAt ? " · received" : ""}</div>)}</div>}
            {latest && (
              <div className="mt-3 rounded-xl border border-neutral-100 bg-neutral-50 p-3">
                <div className="flex flex-wrap items-center gap-2 text-[9.5px] text-neutral-500">
                  <span>Liquidation attempt {latest.version}</span>
                  <StatusPill status={latest.status} />
                  <span>Declared {peso.format(latest.declaredSpent)}</span>
                  <span>Return {peso.format(latest.returnedAmount)}</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {latest.receipts.map((receipt) => (
                    <button
                      key={receipt.id}
                      onClick={async () => window.open(await createReceiptSignedUrl(receipt.filePath), "_blank", "noopener,noreferrer")}
                      className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-left text-[9.5px] text-neutral-600 hover:border-neutral-300"
                    >
                      <strong>{receipt.vendor}</strong> · {peso.format(receipt.amount)}<br />
                      {receipt.fileName}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

function RequestDialog({ allocations, requests, tasks, correction, onClose, onSaved }: { allocations: ReturnType<typeof useDepartmentBudget>["allocations"]; requests: ReturnType<typeof useDepartmentBudget>["requests"]; tasks: ReturnType<typeof useTasks>["tasks"]; correction?: PettyCashRequest; onClose: () => void; onSaved: () => Promise<void> }) {
  const [allocationId, setAllocationId] = useState(correction?.allocationId || ""); const [amount, setAmount] = useState(correction?.requestedAmount || 0); const [purpose, setPurpose] = useState(correction?.purpose || ""); const [neededBy, setNeededBy] = useState(correction?.neededBy || ""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const save = async () => { setBusy(true); setError(""); try { if (correction) await resubmitPettyCashRequest({ requestId: correction.id, amount, purpose, neededBy }); else await createPettyCashRequest({ allocationId, amount, purpose, neededBy }); await onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Request could not be saved."); } finally { setBusy(false); } };
  const selected = allocations.find((item) => item.id === allocationId);
  const cashPosition = selected ? getAllocationCashPosition(selected.amount, requests.filter((item) => item.allocationId === selected.id && item.id !== correction?.id)) : null;
  return <Dialog title={correction ? "Correct petty-cash request" : "New petty-cash request"} subtitle="Requests consume the selected work allocation; the department daily ceiling controls release timing, not whether a valid request may be approved." onClose={onClose}><div className="space-y-3"><label className="block"><span className="text-[10px] text-neutral-500">Funded work item</span><select disabled={Boolean(correction)} value={allocationId} onChange={(event) => setAllocationId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-[10.5px] disabled:bg-neutral-50"><option value="">Select an allocation…</option>{allocations.map((allocation) => <option key={allocation.id} value={allocation.id}>{allocation.subtaskTitle || tasks.find((task) => task.id === allocation.taskId)?.title || "Assigned task"}{allocation.subtaskId ? " · subtask" : " · Task Leader cost"} · {peso.format(allocation.amount)}</option>)}</select></label>{selected && cashPosition && <div className="grid grid-cols-3 gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-[9.5px] text-emerald-800"><div>Approved<strong className="mt-1 block">{peso.format(selected.amount)}</strong></div><div>Reserved/spent<strong className="mt-1 block">{peso.format(cashPosition.reserved + cashPosition.spent)}</strong></div><div>Requestable<strong className="mt-1 block">{peso.format(cashPosition.remaining)}</strong></div></div>}<div className="grid gap-3 sm:grid-cols-2"><Field label="Requested amount" type="number" value={amount || ""} onChange={(value) => setAmount(Number(value))} /><Field label="Needed by" type="date" value={neededBy} onChange={setNeededBy} /></div><label className="block"><span className="text-[10px] text-neutral-500">Purpose</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} placeholder="What will this money purchase or support?" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-[10.5px]" /></label>{correction && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800">Reviewer note: {correction.leaderDecisionReason || correction.departmentDecisionReason || correction.approvalReason || "Update the request and resubmit it."}</div>}{error && <div className="rounded-lg bg-rose-50 p-3 text-[10px] text-rose-700">{error}</div>}<div className="flex justify-end gap-2"><button onClick={onClose} className="h-9 rounded-lg border border-neutral-200 px-4 text-[10px]">Cancel</button><button disabled={busy || !allocationId || amount <= 0 || !purpose.trim() || Boolean(cashPosition && amount > cashPosition.remaining)} onClick={save} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-4 text-[10px] text-white disabled:opacity-40"><Send size={11} /> {correction ? "Resubmit" : "Submit request"}</button></div></div></Dialog>;
}

function LiquidationDialog({ request, orgId, perReceiptLimit, allowReceiptOverride, onClose, onSaved }: { request: ReturnType<typeof useDepartmentBudget>["requests"][number]; orgId: string; perReceiptLimit: number; allowReceiptOverride: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const approved = request.releasedAmount || 0; const [spent, setSpent] = useState(approved); const [note, setNote] = useState(""); const [receipts, setReceipts] = useState<ReceiptDraft[]>([{ id: crypto.randomUUID(), vendor: "", receiptNumber: "", receiptDate: new Date().toISOString().slice(0, 10), description: "", amount: approved }]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const receiptTotal = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
  const update = (id: string, patch: Partial<ReceiptDraft>) => setReceipts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const submit = async () => { setBusy(true); setError(""); try { await submitPettyCashLiquidation({ orgId, requestId: request.id, spent, note, receipts }); await onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Liquidation could not be submitted."); } finally { setBusy(false); } };
  return <Dialog title="Submit receipts & liquidation" subtitle={`Released cash: ${peso.format(approved)} · unused return: ${peso.format(Math.max(0, approved - spent))}`} onClose={onClose}><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Actual amount spent" type="number" value={spent} onChange={(value) => setSpent(Number(value))} /><div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"><div className="text-[9px] uppercase tracking-wide text-neutral-400">Receipt total</div><div className={`mt-1 text-[14px] font-['Lexend:SemiBold',_sans-serif] ${Math.abs(receiptTotal - spent) > .009 ? "text-rose-600" : "text-emerald-700"}`}>{peso.format(receiptTotal)}</div></div></div><div className="space-y-3">{receipts.map((receipt, index) => <div key={receipt.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex items-center justify-between"><div className="text-[10px] font-['Lexend:Medium',_sans-serif]">Receipt {index + 1}</div><button disabled={receipts.length === 1} onClick={() => setReceipts((current) => current.filter((item) => item.id !== receipt.id))} className="text-neutral-400 hover:text-rose-600 disabled:opacity-30"><Trash2 size={12} /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Field label="Vendor / payee" value={receipt.vendor} onChange={(value) => update(receipt.id, { vendor: value })} /><Field label="OR/AR number" value={receipt.receiptNumber} onChange={(value) => update(receipt.id, { receiptNumber: value })} /><Field label="Receipt date" type="date" value={receipt.receiptDate} onChange={(value) => update(receipt.id, { receiptDate: value })} /><Field label="Amount" type="number" value={receipt.amount || ""} onChange={(value) => update(receipt.id, { amount: Number(value) })} /><label className="sm:col-span-2"><span className="text-[9.5px] text-neutral-500">Expense description</span><input value={receipt.description} onChange={(event) => update(receipt.id, { description: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2.5 text-[10px]" /></label>{receipt.amount > perReceiptLimit && <label className="sm:col-span-2"><span className="text-[9.5px] text-amber-700">Threshold exception · receipt exceeds {peso.format(perReceiptLimit)}</span><textarea disabled={!allowReceiptOverride} value={receipt.overrideReason || ""} onChange={(event) => update(receipt.id, { overrideReason: event.target.value })} rows={2} placeholder={allowReceiptOverride ? "Explain why this larger receipt was necessary." : "Department policy does not allow threshold exceptions."} className="mt-1 w-full rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] disabled:opacity-60" /></label>}<label className="sm:col-span-2"><span className="text-[9.5px] text-neutral-500">Receipt image or PDF</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => update(receipt.id, { file: event.target.files?.[0] })} className="mt-1 block w-full text-[9.5px] text-neutral-500 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-[9.5px]" /></label></div></div>)}</div><button onClick={() => setReceipts((current) => [...current, { id: crypto.randomUUID(), vendor: "", receiptNumber: "", receiptDate: new Date().toISOString().slice(0, 10), description: "", amount: 0 }])} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-[9.5px]"><Plus size={11} /> Add receipt</button><label className="block"><span className="text-[10px] text-neutral-500">Liquidation note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Explain what was purchased, why it was needed, and any unused cash being returned." className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-[10.5px]" /></label>{error && <div className="rounded-lg bg-rose-50 p-3 text-[10px] text-rose-700">{error}</div>}<div className="flex justify-end gap-2"><button onClick={onClose} className="h-9 rounded-lg border border-neutral-200 px-4 text-[10px]">Cancel</button><button disabled={busy || spent < 0 || spent > approved || Math.abs(receiptTotal - spent) > .009 || !note.trim() || receipts.some((item) => !item.vendor.trim() || !item.description.trim() || !item.file || (item.amount > perReceiptLimit && (!allowReceiptOverride || !item.overrideReason?.trim())))} onClick={submit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-4 text-[10px] text-white disabled:opacity-40"><FileText size={11} /> Submit liquidation</button></div></div></Dialog>;
}

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <><div className="fixed inset-0 z-[70] bg-neutral-950/35 backdrop-blur-[1px]" onClick={onClose} /><div className="fixed inset-x-4 top-1/2 z-[71] mx-auto max-h-[90vh] max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"><header className="border-b border-neutral-100 p-4"><h2 className="text-[15px] font-['Lexend:SemiBold',_sans-serif]">{title}</h2><p className="mt-1 text-[10px] text-neutral-500">{subtitle}</p></header><div className="p-4">{children}</div></div></>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) { return <label><span className="text-[9.5px] text-neutral-500">{label}</span><input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2.5 text-[10px]" /></label>; }
