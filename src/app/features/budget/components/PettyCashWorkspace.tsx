import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, FileText, Plus, ReceiptText, RotateCcw, Send, Trash2, WalletCards } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useDepartmentBudget } from "../hooks/useDepartmentBudget";
import { createPettyCashRequest, createReceiptSignedUrl, submitPettyCashLiquidation } from "../services/budgetService";
import type { ReceiptDraft } from "../types";
import { BudgetCard, BudgetEmpty, peso, StatusPill } from "./budgetUi";

export function PettyCashWorkspace() {
  const { userProfile } = useAuth(); const orgId = userProfile?.org_id || userProfile?.departmentId || "";
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear()); const budget = useDepartmentBudget(orgId, fiscalYear);
  const { tasks } = useTasks(); const [showRequest, setShowRequest] = useState(false); const [liquidatingId, setLiquidatingId] = useState("");
  const mine = budget.requests.filter((item) => item.requesterId === userProfile?.id);
  const myTaskIds = useMemo(() => new Set(tasks.filter((task) => task.assigneeId === userProfile?.id || task.recommendationLeadId === userProfile?.id || task.teamMemberIds?.includes(userProfile?.id || "")).map((task) => task.id)), [tasks, userProfile?.id]);
  const allocations = budget.allocations.filter((item) => item.status === "approved" && myTaskIds.has(item.taskId));
  const selectedRequest = mine.find((item) => item.id === liquidatingId);
  const pending = mine.filter((item) => item.status === "pending").length;
  const ready = mine.filter((item) => ["approved", "changes_requested"].includes(item.status)).length;
  const settled = mine.filter((item) => item.status === "settled").length;
  return <div className="min-h-full bg-neutral-50 p-6 font-['Lexend:Regular',_sans-serif] sm:p-8"><div className="mx-auto max-w-[1280px] space-y-5"><header className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">My workspace · Financial requests</div><h1 className="mt-1 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-950">Petty Cash &amp; Expenses</h1><p className="mt-1 text-[11px] text-neutral-500">Request operational cash from an approved work allocation, then submit exact receipts and return any unused amount.</p></div><div className="flex gap-2"><select value={fiscalYear} onChange={(event) => setFiscalYear(Number(event.target.value))} className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-[10.5px]">{[fiscalYear - 1, fiscalYear, fiscalYear + 1].map((year) => <option key={year}>{year}</option>)}</select><button onClick={() => setShowRequest(true)} disabled={!budget.summary || budget.summary.status !== "locked" || !allocations.length} className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-neutral-950 px-4 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40"><Plus size={12} /> New request</button></div></header>
    {budget.error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10.5px] text-rose-700">{budget.error}</div>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><BudgetCard label="Request limit" value={peso.format(budget.summary?.pettyCashRequestLimit || 0)} note="Maximum per request" icon={<WalletCards size={15} />} /><BudgetCard label="Pending approval" value={String(pending)} note="Waiting for Head or Assistant" icon={<Clock3 size={15} />} tone={pending ? "warn" : "good"} /><BudgetCard label="Receipts required" value={String(ready)} note="Approved cash awaiting liquidation" icon={<ReceiptText size={15} />} tone={ready ? "warn" : "good"} /><BudgetCard label="Settled" value={String(settled)} note="Verified expense packages" icon={<CheckCircle2 size={15} />} tone="good" /></div>
    {!budget.summary ? <BudgetEmpty title="Department budget is not ready" description="Your Department Head must create and lock the annual budget before petty-cash requests can be made." /> : !allocations.length ? <BudgetEmpty title="No funded work allocation" description="A Head or Assistant must allocate proposal funds to your task. Task Leaders may propose a subtask budget for approval." /> : !mine.length ? <BudgetEmpty title="No petty-cash requests" description="Start a request from an approved task or subtask allocation. Approval reserves the amount; only verified receipts become actual spending." action={<button onClick={() => setShowRequest(true)} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-[10.5px] text-white">Create first request</button>} /> : <RequestList requests={mine} liquidations={budget.liquidations} tasks={tasks} onLiquidate={setLiquidatingId} />}
    {showRequest && <RequestDialog allocations={allocations} tasks={tasks} requestLimit={budget.summary?.pettyCashRequestLimit || 0} onClose={() => setShowRequest(false)} onSaved={async () => { setShowRequest(false); await budget.refresh(); }} />}
    {selectedRequest && <LiquidationDialog request={selectedRequest} orgId={orgId} onClose={() => setLiquidatingId("")} onSaved={async () => { setLiquidatingId(""); await budget.refresh(); }} />}
  </div></div>;
}

function RequestList({
  requests,
  liquidations,
  tasks,
  onLiquidate,
}: {
  requests: ReturnType<typeof useDepartmentBudget>["requests"];
  liquidations: ReturnType<typeof useDepartmentBudget>["liquidations"];
  tasks: ReturnType<typeof useTasks>["tasks"];
  onLiquidate: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {requests.map((request) => {
        const task = tasks.find((item) => item.id === request.taskId);
        const latest = liquidations.find((item) => item.requestId === request.id);
        return (
          <div key={request.id} className="border-b border-neutral-100 p-4 last:border-0">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                    PC-{String(request.requestNumber).padStart(5, "0")} · {request.subtaskTitle || task?.title || request.taskTitle || "Assigned work"}
                  </div>
                  <StatusPill status={request.status} />
                </div>
                <div className="mt-1 text-[10px] text-neutral-500">{request.purpose}</div>
                {request.approvalReason && <div className="mt-1 text-[9.5px] text-neutral-500">Decision note: {request.approvalReason}</div>}
              </div>
              <div className="text-right">
                <div className="text-[9px] uppercase tracking-wide text-neutral-400">Amount</div>
                <div className="mt-1 text-[12px] font-['Lexend:SemiBold',_sans-serif]">{peso.format(request.approvedAmount ?? request.requestedAmount)}</div>
              </div>
              <div className="flex items-center justify-end">
                {["approved", "changes_requested"].includes(request.status) ? (
                  <button onClick={() => onLiquidate(request.id)} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-neutral-950 px-3 text-[9.5px] text-white">
                    {request.status === "changes_requested" ? <RotateCcw size={11} /> : <ReceiptText size={11} />}
                    {request.status === "changes_requested" ? "Resubmit receipts" : "Submit receipts"}
                  </button>
                ) : request.status === "settled" ? (
                  <span className="text-[9.5px] text-emerald-700">Spent {peso.format(request.actualSpent || 0)} · returned {peso.format(request.returnedAmount || 0)}</span>
                ) : null}
              </div>
            </div>
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
  );
}

function RequestDialog({ allocations, tasks, requestLimit, onClose, onSaved }: { allocations: ReturnType<typeof useDepartmentBudget>["allocations"]; tasks: ReturnType<typeof useTasks>["tasks"]; requestLimit: number; onClose: () => void; onSaved: () => Promise<void> }) {
  const [allocationId, setAllocationId] = useState(""); const [amount, setAmount] = useState(0); const [purpose, setPurpose] = useState(""); const [neededBy, setNeededBy] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const save = async () => { setBusy(true); setError(""); try { await createPettyCashRequest({ allocationId, amount, purpose, neededBy }); await onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Request could not be created."); } finally { setBusy(false); } };
  return <Dialog title="New petty-cash request" subtitle={`Maximum ${peso.format(requestLimit)} per request`} onClose={onClose}><div className="space-y-3"><label className="block"><span className="text-[10px] text-neutral-500">Funded work item</span><select value={allocationId} onChange={(event) => setAllocationId(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-neutral-200 px-3 text-[10.5px]"><option value="">Select an allocation…</option>{allocations.map((allocation) => <option key={allocation.id} value={allocation.id}>{tasks.find((task) => task.id === allocation.taskId)?.title || "Assigned task"}{allocation.subtaskId ? " · subtask allocation" : ""} · {peso.format(allocation.amount)}</option>)}</select></label><div className="grid gap-3 sm:grid-cols-2"><Field label="Requested amount" type="number" value={amount || ""} onChange={(value) => setAmount(Number(value))} /><Field label="Needed by" type="date" value={neededBy} onChange={setNeededBy} /></div><label className="block"><span className="text-[10px] text-neutral-500">Purpose</span><textarea value={purpose} onChange={(event) => setPurpose(event.target.value)} rows={3} placeholder="What will this money purchase or support?" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-[10.5px]" /></label>{error && <div className="rounded-lg bg-rose-50 p-3 text-[10px] text-rose-700">{error}</div>}<div className="flex justify-end gap-2"><button onClick={onClose} className="h-9 rounded-lg border border-neutral-200 px-4 text-[10px]">Cancel</button><button disabled={busy || !allocationId || amount <= 0 || amount > requestLimit || !purpose.trim()} onClick={save} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-4 text-[10px] text-white disabled:opacity-40"><Send size={11} /> Submit request</button></div></div></Dialog>;
}

function LiquidationDialog({ request, orgId, onClose, onSaved }: { request: ReturnType<typeof useDepartmentBudget>["requests"][number]; orgId: string; onClose: () => void; onSaved: () => Promise<void> }) {
  const approved = request.approvedAmount || 0; const [spent, setSpent] = useState(approved); const [note, setNote] = useState(""); const [receipts, setReceipts] = useState<ReceiptDraft[]>([{ id: crypto.randomUUID(), vendor: "", receiptNumber: "", receiptDate: new Date().toISOString().slice(0, 10), description: "", amount: approved }]); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const receiptTotal = receipts.reduce((sum, receipt) => sum + (Number(receipt.amount) || 0), 0);
  const update = (id: string, patch: Partial<ReceiptDraft>) => setReceipts((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  const submit = async () => { setBusy(true); setError(""); try { await submitPettyCashLiquidation({ orgId, requestId: request.id, spent, note, receipts }); await onSaved(); } catch (caught) { setError(caught instanceof Error ? caught.message : "Liquidation could not be submitted."); } finally { setBusy(false); } };
  return <Dialog title="Submit receipts & liquidation" subtitle={`Approved cash: ${peso.format(approved)} · unused return: ${peso.format(Math.max(0, approved - spent))}`} onClose={onClose}><div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2"><Field label="Actual amount spent" type="number" value={spent} onChange={(value) => setSpent(Number(value))} /><div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3"><div className="text-[9px] uppercase tracking-wide text-neutral-400">Receipt total</div><div className={`mt-1 text-[14px] font-['Lexend:SemiBold',_sans-serif] ${Math.abs(receiptTotal - spent) > .009 ? "text-rose-600" : "text-emerald-700"}`}>{peso.format(receiptTotal)}</div></div></div><div className="space-y-3">{receipts.map((receipt, index) => <div key={receipt.id} className="rounded-xl border border-neutral-200 p-3"><div className="flex items-center justify-between"><div className="text-[10px] font-['Lexend:Medium',_sans-serif]">Receipt {index + 1}</div><button disabled={receipts.length === 1} onClick={() => setReceipts((current) => current.filter((item) => item.id !== receipt.id))} className="text-neutral-400 hover:text-rose-600 disabled:opacity-30"><Trash2 size={12} /></button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Field label="Vendor / payee" value={receipt.vendor} onChange={(value) => update(receipt.id, { vendor: value })} /><Field label="OR/AR number" value={receipt.receiptNumber} onChange={(value) => update(receipt.id, { receiptNumber: value })} /><Field label="Receipt date" type="date" value={receipt.receiptDate} onChange={(value) => update(receipt.id, { receiptDate: value })} /><Field label="Amount" type="number" value={receipt.amount || ""} onChange={(value) => update(receipt.id, { amount: Number(value) })} /><label className="sm:col-span-2"><span className="text-[9.5px] text-neutral-500">Expense description</span><input value={receipt.description} onChange={(event) => update(receipt.id, { description: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2.5 text-[10px]" /></label><label className="sm:col-span-2"><span className="text-[9.5px] text-neutral-500">Receipt image or PDF</span><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => update(receipt.id, { file: event.target.files?.[0] })} className="mt-1 block w-full text-[9.5px] text-neutral-500 file:mr-2 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-2 file:text-[9.5px]" /></label></div></div>)}</div><button onClick={() => setReceipts((current) => [...current, { id: crypto.randomUUID(), vendor: "", receiptNumber: "", receiptDate: new Date().toISOString().slice(0, 10), description: "", amount: 0 }])} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-2 text-[9.5px]"><Plus size={11} /> Add receipt</button><label className="block"><span className="text-[10px] text-neutral-500">Liquidation note</span><textarea value={note} onChange={(event) => setNote(event.target.value)} rows={3} placeholder="Explain what was purchased, why it was needed, and any unused cash being returned." className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2 text-[10.5px]" /></label>{error && <div className="rounded-lg bg-rose-50 p-3 text-[10px] text-rose-700">{error}</div>}<div className="flex justify-end gap-2"><button onClick={onClose} className="h-9 rounded-lg border border-neutral-200 px-4 text-[10px]">Cancel</button><button disabled={busy || spent < 0 || spent > approved || Math.abs(receiptTotal - spent) > .009 || !note.trim() || receipts.some((item) => !item.vendor.trim() || !item.description.trim() || !item.file)} onClick={submit} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-950 px-4 text-[10px] text-white disabled:opacity-40"><FileText size={11} /> Submit liquidation</button></div></div></Dialog>;
}

function Dialog({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: React.ReactNode }) { return <><div className="fixed inset-0 z-[70] bg-neutral-950/35 backdrop-blur-[1px]" onClick={onClose} /><div className="fixed inset-x-4 top-1/2 z-[71] mx-auto max-h-[90vh] max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl"><header className="border-b border-neutral-100 p-4"><h2 className="text-[15px] font-['Lexend:SemiBold',_sans-serif]">{title}</h2><p className="mt-1 text-[10px] text-neutral-500">{subtitle}</p></header><div className="p-4">{children}</div></div></>; }
function Field({ label, value, onChange, type = "text" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string }) { return <label><span className="text-[9.5px] text-neutral-500">{label}</span><input type={type} min={type === "number" ? 0 : undefined} step={type === "number" ? "0.01" : undefined} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-2.5 text-[10px]" /></label>; }
