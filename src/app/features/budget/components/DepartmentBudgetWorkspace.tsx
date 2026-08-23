import { useMemo, useState } from "react";
import { AlertTriangle, Archive, Banknote, BookOpenCheck, BriefcaseBusiness, Clock3, Landmark, ListChecks, LockKeyhole, Plus, ReceiptText, TrendingUp, WalletCards } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useDepartmentBudget } from "../hooks/useDepartmentBudget";
import { createReceiptSignedUrl, createWorkBudgetAllocation } from "../services/budgetService";
import { getBudgetUtilizationSignal } from "../selectors/budgetSelectors";
import { AnnualBudgetSetup } from "./AnnualBudgetSetup";
import { BudgetApprovalQueue } from "./BudgetApprovalQueue";
import { BudgetCard, BudgetEmpty, peso, StatusPill } from "./budgetUi";

type Tab = "overview" | "annual" | "proposals" | "allocations" | "approvals" | "expenses" | "ledger";

export function DepartmentBudgetWorkspace() {
  const { userProfile } = useAuth();
  const orgId = userProfile?.org_id || userProfile?.departmentId || "";
  const [fiscalYear, setFiscalYear] = useState(new Date().getFullYear());
  const [tab, setTab] = useState<Tab>("overview");
  const budget = useDepartmentBudget(orgId, fiscalYear);
  const { tasks } = useTasks();
  const canPrepare = ["dept_head", "department_head"].includes(userProfile?.role || "");
  const canApprove = canPrepare || userProfile?.role === "assistant_head";
  const pendingCount = budget.allocations.filter((item) => item.status === "pending").length + budget.requests.filter((item) => item.status === "pending").length + budget.liquidations.filter((item) => item.status === "pending").length;
  const utilizationSignal = budget.summary
    ? getBudgetUtilizationSignal(budget.summary)
    : { utilization: 0, isQ4: false, underTarget: false };
  const { utilization, underTarget } = utilizationSignal;
  if (!orgId) return <div className="p-8 text-[12px] text-neutral-500">Your account needs an organization before a department budget can be opened.</div>;
  return <div className="min-h-full bg-neutral-50 p-6 font-['Lexend:Regular',_sans-serif] sm:p-8"><div className="mx-auto max-w-[1500px] space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><div className="text-[9px] uppercase tracking-[0.18em] text-neutral-400">Department · Fiscal control</div><h1 className="mt-1 text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-950">Department Budget</h1><p className="mt-1 text-[11px] text-neutral-500">Plan the annual envelope, reserve proposal funding, approve petty cash, verify receipts, and monitor utilization from one ledger.</p></div><label className="text-[10px] text-neutral-500">Fiscal year<select value={fiscalYear} onChange={(event) => setFiscalYear(Number(event.target.value))} className="ml-2 h-9 rounded-xl border border-neutral-200 bg-white px-3 text-[11px] text-neutral-800">{[fiscalYear - 1, fiscalYear, fiscalYear + 1].map((year) => <option key={year}>{year}</option>)}</select></label></header>
    {budget.error && <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-[11px] text-rose-700">{budget.error}</div>}
    {budget.loading ? <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center text-[11px] text-neutral-500">Loading the department ledger…</div> : <>
      <nav className="flex flex-wrap gap-1 rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-sm">{([
        ["overview", "Overview", <Landmark size={12} />], ["annual", "Annual plan", <BookOpenCheck size={12} />],
        ["proposals", "Proposal commitments", <BriefcaseBusiness size={12} />], ["allocations", "Work allocations", <ListChecks size={12} />],
        ["approvals", `Approvals${pendingCount ? ` · ${pendingCount}` : ""}`, <WalletCards size={12} />], ["expenses", "Expenses", <ReceiptText size={12} />],
        ["ledger", "Audit ledger", <Archive size={12} />],
      ] as Array<[Tab, string, React.ReactNode]>).map(([id, label, icon]) => <button key={id} onClick={() => setTab(id)} className={`inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[10px] font-['Lexend:Medium',_sans-serif] transition ${tab === id ? "bg-neutral-950 text-white" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"}`}>{icon}{label}</button>)}</nav>
      {!budget.summary && tab !== "annual" ? <BudgetEmpty title={`No ${fiscalYear} annual budget yet`} description="The Department Head must create and lock the annual budget before proposals can be funded or petty cash can be requested." action={canPrepare ? <button onClick={() => setTab("annual")} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-white">Create annual budget</button> : undefined} /> : <>
        {tab === "overview" && budget.summary && <Overview summary={budget.summary} utilization={utilization} underTarget={underTarget} commitments={budget.commitments.length} pending={pendingCount} />}
        {tab === "annual" && <AnnualBudgetSetup orgId={orgId} fiscalYear={fiscalYear} data={budget} canEdit={canPrepare} onChanged={budget.refresh} />}
        {tab === "proposals" && <ProposalCommitments commitments={budget.commitments} />}
        {tab === "allocations" && <AllocationsPanel commitments={budget.commitments} allocations={budget.allocations} tasks={tasks.filter((task) => task.orgId === orgId)} canApprove={canApprove} onChanged={budget.refresh} />}
        {tab === "approvals" && <BudgetApprovalQueue data={budget} onChanged={budget.refresh} />}
        {tab === "expenses" && <ExpensesPanel requests={budget.requests} liquidations={budget.liquidations} />}
        {tab === "ledger" && <LedgerPanel entries={budget.ledger} />}
      </>}
    </>}
  </div></div>;
}

function Overview({ summary, utilization, underTarget, commitments, pending }: { summary: NonNullable<ReturnType<typeof useDepartmentBudget>["summary"]>; utilization: number; underTarget: boolean; commitments: number; pending: number }) {
  return <div className="space-y-4"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><BudgetCard label="Approved annual budget" value={peso.format(summary.approvedAmount)} note={`${summary.fiscalYear} locked appropriation`} icon={<LockKeyhole size={15} />} /><BudgetCard label="Available for proposals" value={peso.format(summary.availableAmount)} note={`${commitments} published proposal commitment(s)`} icon={<Banknote size={15} />} tone={summary.availableAmount > 0 ? "good" : "warn"} /><BudgetCard label="Committed" value={peso.format(summary.committedAmount)} note="Reserved by published proposals" icon={<BriefcaseBusiness size={15} />} /><BudgetCard label="Actual spending" value={peso.format(summary.spentAmount)} note={`${utilization.toFixed(1)}% annual utilization`} icon={<TrendingUp size={15} />} tone={underTarget ? "warn" : "good"} /></div><div className="grid gap-3 lg:grid-cols-3"><BudgetCard label="Petty cash available" value={peso.format(summary.pettyCashAvailable)} note={`${peso.format(summary.pettyCashLimit)} annual department limit`} icon={<WalletCards size={15} />} tone="good" /><BudgetCard label="Petty cash reserved" value={peso.format(summary.pettyCashReserved)} note="Approved requests awaiting settlement" icon={<Clock3 size={15} />} tone="warn" /><BudgetCard label="Approval inbox" value={String(pending)} note="Allocations, requests, and liquidations" icon={<ReceiptText size={15} />} tone={pending ? "warn" : "good"} /></div>{underTarget && <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4"><AlertTriangle size={18} className="shrink-0 text-amber-700" /><div><div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-amber-950">Q4 utilization is below target</div><p className="mt-1 text-[10.5px] text-amber-800">Current utilization is {utilization.toFixed(1)}%; the department target is {summary.underutilizationThreshold}%. Review stalled commitments and pending liquidations.</p></div></div>}<section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex justify-between text-[10px] text-neutral-500"><span>Annual utilization</span><span>{utilization.toFixed(1)}%</span></div><div className="mt-2 h-3 overflow-hidden rounded-full bg-neutral-100"><div className={`h-full rounded-full ${underTarget ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${Math.min(100, utilization)}%` }} /></div><div className="mt-3 grid grid-cols-3 gap-3 text-[10px]"><div><span className="text-neutral-400">Available</span><div className="mt-1 font-['Lexend:Medium',_sans-serif]">{peso.format(summary.availableAmount)}</div></div><div><span className="text-neutral-400">Committed balance</span><div className="mt-1 font-['Lexend:Medium',_sans-serif]">{peso.format(summary.commitmentRemaining)}</div></div><div><span className="text-neutral-400">Spent</span><div className="mt-1 font-['Lexend:Medium',_sans-serif]">{peso.format(summary.spentAmount)}</div></div></div></section></div>;
}

function ProposalCommitments({ commitments }: { commitments: ReturnType<typeof useDepartmentBudget>["commitments"] }) { if (!commitments.length) return <BudgetEmpty title="No funded proposals" description="Drafts do not consume funds. A commitment appears here only when a department-only proposal passes its approval gate and is published." />; return <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">{commitments.map((item) => <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 last:border-0"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><BriefcaseBusiness size={15} /></div><div className="min-w-0 flex-1"><div className="truncate text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{item.title}</div><div className="mt-1 text-[9.5px] text-neutral-500">Reserved when published · {new Date(item.createdAt).toLocaleString()}</div></div><StatusPill status={item.status} /><div className="w-32 text-right text-[12px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">{peso.format(item.amount)}</div></div>)}</div>; }

function AllocationsPanel({ commitments, allocations, tasks, canApprove, onChanged }: { commitments: ReturnType<typeof useDepartmentBudget>["commitments"]; allocations: ReturnType<typeof useDepartmentBudget>["allocations"]; tasks: ReturnType<typeof useTasks>["tasks"]; canApprove: boolean; onChanged: () => Promise<void> }) {
  const [taskId, setTaskId] = useState(""); const [amount, setAmount] = useState(0); const [reason, setReason] = useState(""); const [message, setMessage] = useState(""); const [busy, setBusy] = useState(false);
  const eligible = useMemo(() => tasks.filter((task) => commitments.some((commitment) => commitment.proposalDraftId === task.sourceCollaborationDraftId) && !allocations.some((allocation) => allocation.taskId === task.id && !allocation.subtaskId && ["pending", "approved"].includes(allocation.status))), [allocations, commitments, tasks]);
  const create = async () => { setBusy(true); setMessage(""); try { await createWorkBudgetAllocation({ taskId, amount, reason }); setTaskId(""); setAmount(0); setReason(""); await onChanged(); } catch (error) { setMessage(error instanceof Error ? error.message : "Allocation could not be created."); } finally { setBusy(false); } };
  return <div className="space-y-4">{canApprove && <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><Plus size={14} /><h3 className="text-[12px] font-['Lexend:SemiBold',_sans-serif]">Allocate a task budget</h3></div><p className="mt-1 text-[9.5px] text-neutral-500">This divides a proposal commitment for operational use; it does not deduct the annual budget a second time.</p><div className="mt-4 grid gap-3 md:grid-cols-[1.2fr_.5fr_1fr_auto]"><select value={taskId} onChange={(event) => setTaskId(event.target.value)} className="h-10 rounded-xl border border-neutral-200 px-3 text-[10.5px]"><option value="">Select funded task…</option>{eligible.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}</select><input type="number" min={0} step="0.01" value={amount || ""} onChange={(event) => setAmount(Number(event.target.value))} placeholder="Amount" className="h-10 rounded-xl border border-neutral-200 px-3 text-[10.5px]" /><input value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Purpose of this allocation" className="h-10 rounded-xl border border-neutral-200 px-3 text-[10.5px]" /><button disabled={busy || !taskId || amount <= 0 || !reason.trim()} onClick={create} className="h-10 rounded-xl bg-neutral-950 px-4 text-[10.5px] text-white disabled:opacity-40">Allocate</button></div>{message && <div className="mt-3 text-[10px] text-rose-600">{message}</div>}</section>}
    {!allocations.length ? <BudgetEmpty title="No work allocations" description="Allocate part of a funded proposal to a task. Task Leaders can then propose subtask allocations for Head or Assistant approval." /> : <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">{allocations.map((item) => { const task = tasks.find((candidate) => candidate.id === item.taskId); return <div key={item.id} className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 last:border-0"><div className="min-w-0 flex-1"><div className="truncate text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{task?.title || "Work allocation"}{item.subtaskId ? " · Subtask allocation" : " · Task allocation"}</div><div className="mt-1 text-[9.5px] text-neutral-500">{item.reason}</div></div><StatusPill status={item.status} /><div className="text-[12px] font-['Lexend:SemiBold',_sans-serif]">{peso.format(item.amount)}</div></div>; })}</div>}
  </div>;
}

function ExpensesPanel({
  requests,
  liquidations,
}: {
  requests: ReturnType<typeof useDepartmentBudget>["requests"];
  liquidations: ReturnType<typeof useDepartmentBudget>["liquidations"];
}) {
  if (!requests.length) {
    return <BudgetEmpty title="No petty-cash activity" description="Approved and settled employee requests will be retained here with their receipt history." />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {requests.map((item) => {
        const latest = liquidations.find((liquidation) => liquidation.requestId === item.id);
        return (
          <div key={item.id} className="border-b border-neutral-100 p-4 last:border-0">
            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <div>
                <div className="flex items-center gap-2">
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif]">PC-{String(item.requestNumber).padStart(5, "0")} · {item.taskTitle || "Assigned work"}</div>
                  <StatusPill status={item.status} />
                </div>
                <div className="mt-1 text-[10px] text-neutral-500">{item.requesterName} · {item.purpose}</div>
              </div>
              <div className="text-right text-[10px]">
                <div className="text-neutral-400">Approved/requested</div>
                <div className="mt-1 font-['Lexend:Medium',_sans-serif]">{peso.format(item.approvedAmount ?? item.requestedAmount)}</div>
              </div>
              <div className="text-right text-[10px]">
                <div className="text-neutral-400">Actual / returned</div>
                <div className="mt-1 font-['Lexend:Medium',_sans-serif]">{latest ? `${peso.format(latest.declaredSpent)} / ${peso.format(latest.returnedAmount)}` : "Awaiting receipts"}</div>
              </div>
            </div>
            {latest && (
              <div className="mt-3 flex flex-wrap gap-2">
                {latest.receipts.map((receipt) => (
                  <button
                    key={receipt.id}
                    onClick={async () => window.open(await createReceiptSignedUrl(receipt.filePath), "_blank", "noopener,noreferrer")}
                    className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-left text-[9.5px] text-neutral-600 hover:border-neutral-300"
                  >
                    <strong>{receipt.vendor}</strong> · {peso.format(receipt.amount)}<br />
                    {receipt.fileName}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LedgerPanel({ entries }: { entries: ReturnType<typeof useDepartmentBudget>["ledger"] }) { if (!entries.length) return <BudgetEmpty title="No ledger entries" description="Locking the annual budget, publishing proposals, approving allocations, and settling expenses will create immutable entries here." />; return <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">{entries.map((entry) => <div key={entry.id} className="flex items-center gap-3 border-b border-neutral-100 p-4 last:border-0"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600"><Archive size={13} /></div><div className="min-w-0 flex-1"><div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] capitalize text-neutral-800">{entry.entryType.split("_").join(" ")}</div><div className="mt-0.5 truncate text-[9.5px] text-neutral-500">{entry.description} · {new Date(entry.createdAt).toLocaleString()}</div></div><div className="text-[11px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">{peso.format(entry.amount)}</div></div>)}</div>; }
