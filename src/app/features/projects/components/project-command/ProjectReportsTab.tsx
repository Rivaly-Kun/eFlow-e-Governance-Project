import { useMemo } from "react";
import { AlertTriangle, Download, Eye, FileText, ReceiptText } from "lucide-react";
import { createReceiptSignedUrl, peso } from "../../../budget";
import { getSubtaskEvidenceUrl } from "../../../subtasks";
import { exportCsv, exportPdf, type ReportColumn } from "../../../../services/reportService";
import { buildProjectExecutionFinancialRows, type ProjectExecutionFinancialRow } from "../../selectors/projectFinancialReportSelectors";
import type { ProjectCommandData } from "./types";

const COLUMNS: ReportColumn<ProjectExecutionFinancialRow>[] = [
  { key: "hierarchy", header: "Work Item", value: (row) => `${row.level === "subtask" ? "  ↳ " : ""}${row.workItem}` },
  { key: "accountability", header: "Accountability", value: (row) => row.accountability },
  { key: "status", header: "Status", value: (row) => row.status.replace(/_/g, " ") },
  { key: "progress", header: "Progress", value: (row) => `${row.progress}%` },
  { key: "deadline", header: "Deadline", value: (row) => row.deadline || "Unscheduled" },
  { key: "schedule", header: "Schedule Health", value: (row) => row.schedule.replace(/_/g, " ") },
  { key: "budget_mode", header: "Budget Mode", value: (row) => row.budgetMode },
  { key: "budget", header: "Budget / Cap", value: (row) => row.budgetMode === "shared" ? "Shared task pool" : row.budgetAmount.toFixed(2) },
  { key: "reserved", header: "Reserved", value: (row) => row.reservedAmount.toFixed(2) },
  { key: "spent", header: "Actual Spent", value: (row) => row.spentAmount.toFixed(2) },
  { key: "returned", header: "Returned", value: (row) => row.returnedAmount.toFixed(2) },
  { key: "available", header: "Available", value: (row) => row.budgetMode === "shared" ? "From parent task" : row.availableAmount.toFixed(2) },
  { key: "receipts", header: "Receipts", value: (row) => row.receiptCount },
  { key: "evidence", header: "Completion Evidence", value: (row) => row.evidenceCount },
];

export function ProjectReportsTab({ data, canExport }: { data: ProjectCommandData; canExport: boolean }) {
  const rows = useMemo(() => buildProjectExecutionFinancialRows(data.tasks, data.facts.subtasks, data.financial, data.facts), [data.facts, data.financial, data.tasks]);
  const taskRows = rows.filter((row) => row.level === "task");
  const totalBudget = taskRows.reduce((sum, row) => sum + row.budgetAmount, 0);
  const actualSpent = data.financial.requests.filter((request) => request.status === "settled").reduce((sum, request) => sum + (request.actualSpent || 0), 0);
  const reserved = data.financial.requests.filter((request) => !["draft", "rejected", "cancelled", "expired", "settled"].includes(request.status)).reduce((sum, request) => sum + (request.approvedAmount ?? request.requestedAmount), 0);
  const remaining = Math.max(0, totalBudget - actualSpent - reserved);
  const receiptCount = data.financial.liquidations.reduce((sum, liquidation) => sum + liquidation.receipts.length, 0);
  const overdue = rows.filter((row) => row.schedule === "overdue").length;
  const meta = {
    title: `${data.project.title} Execution and Financial Register`,
    subtitle: "Task/subtask hierarchy, accountability, delivery, cash reservations, actual expenses, returns, and receipt evidence",
    filters: { project: data.project.title, status: data.project.status },
    totals: { progress: `${data.metrics.progress}%`, task_budget: peso.format(totalBudget), reserved: peso.format(reserved), actual_spent: peso.format(actualSpent), remaining: peso.format(remaining), receipts: receiptCount },
  };

  return <div className="space-y-4">
    <section className="rounded-2xl border border-neutral-200 bg-gradient-to-br from-neutral-950 to-neutral-800 p-5 text-white">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-neutral-400">Project execution and financial register</div><h3 className="mt-1 text-[17px] font-semibold">{data.project.title}</h3><p className="mt-1 max-w-2xl text-[10.5px] leading-relaxed text-neutral-300">One traceable view from approved task funding through progress, cash release, receipts, returned balance, and settlement.</p></div>{canExport && <div className="flex gap-2"><button type="button" onClick={() => exportCsv(rows, COLUMNS, meta)} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-[10.5px] font-semibold text-neutral-900"><Download size={12} /> CSV</button><button type="button" onClick={() => exportPdf(rows, COLUMNS, meta)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[10.5px] font-semibold text-white"><FileText size={12} /> PDF</button></div>}</div>
    </section>

    {data.financialError && <div className="flex gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-800"><AlertTriangle size={13} className="mt-0.5 shrink-0" /> Financial rows could not be loaded: {data.financialError}</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Kpi label="Weighted progress" value={`${data.metrics.progress}%`} note={`${data.metrics.taskCompleted}/${data.metrics.taskTotal} tasks approved`} />
      <Kpi label="Task budget" value={peso.format(totalBudget)} note="Published proposal funding" />
      <Kpi label="Temporarily reserved" value={peso.format(reserved)} note="Pending through unsettled cash" />
      <Kpi label="Actual spent" value={peso.format(actualSpent)} note="Verified settled receipts" />
      <Kpi label="Remaining room" value={peso.format(remaining)} note="Across shared pools and caps" />
      <Kpi label="Evidence health" value={`${receiptCount} receipts`} note={`${data.facts.evidence.length} completion files · ${overdue} overdue`} />
    </div>

    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <header className="border-b border-neutral-100 px-4 py-3"><h4 className="text-[12px] font-semibold text-neutral-900">Task and subtask register</h4><p className="mt-0.5 text-[9.5px] text-neutral-500">Subtasks without a cap draw dynamically from the shared parent-task pool.</p></header>
      <div className="overflow-x-auto"><table className="min-w-[1180px] w-full text-left"><thead className="bg-neutral-50 text-[8.5px] uppercase tracking-[0.1em] text-neutral-400"><tr><th className="px-3 py-2.5">Work hierarchy</th><th className="px-3 py-2.5">Accountability</th><th className="px-3 py-2.5">Status / progress</th><th className="px-3 py-2.5">Schedule</th><th className="px-3 py-2.5">Budget mode</th><th className="px-3 py-2.5">Reserved / spent / return</th><th className="px-3 py-2.5">Evidence</th></tr></thead><tbody>{rows.map((row) => <ExecutionRow key={`${row.level}-${row.id}`} row={row} data={data} />)}</tbody></table></div>
    </section>

    <ReceiptRegister data={data} />
  </div>;
}

function ExecutionRow({ row, data }: { row: ProjectExecutionFinancialRow; data: ProjectCommandData }) {
  const requestIds = new Set(data.financial.requests.filter((request) => row.level === "task" ? request.taskId === row.id : request.subtaskId === row.id).map((request) => request.id));
  const receipts = data.financial.liquidations.filter((item) => requestIds.has(item.requestId)).flatMap((item) => item.receipts);
  const submissionIds = new Set(data.facts.submissions.filter((item) => row.level === "task" ? item.kind === "task" && item.taskId === row.id : item.kind === "subtask" && item.subtaskId === row.id).map((item) => item.id));
  const evidence = data.facts.evidence.filter((item) => item.taskId === (row.parentTaskId || row.id) && (row.level === "task" ? item.kind === "task" : Boolean(item.submissionId && submissionIds.has(item.submissionId))));
  const scheduleTone = row.schedule === "overdue" ? "bg-rose-50 text-rose-700" : row.schedule === "due_soon" ? "bg-amber-50 text-amber-700" : row.schedule === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-600";
  return <tr className={`border-t border-neutral-100 text-[9.5px] ${row.level === "task" ? "bg-white" : "bg-neutral-50/50"}`}><td className="px-3 py-3"><div className={`${row.level === "task" ? "font-semibold text-neutral-900" : "pl-5 text-neutral-700"}`}>{row.level === "subtask" && <span className="mr-1 text-neutral-300">↳</span>}{row.workItem}</div></td><td className="px-3 py-3 text-neutral-600">{row.accountability}</td><td className="px-3 py-3"><div className="flex items-center gap-2"><span className="capitalize text-neutral-600">{row.status.replace(/_/g, " ")}</span><strong>{row.progress}%</strong></div><div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${row.progress}%` }} /></div></td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 capitalize ${scheduleTone}`}>{row.schedule.replace(/_/g, " ")}</span><div className="mt-1 text-[8.8px] text-neutral-400">{row.deadline || "No deadline"}</div></td><td className="px-3 py-3"><div className="font-medium capitalize text-neutral-700">{row.budgetMode === "shared" ? "Shared task pool" : row.budgetMode === "cap" ? `Cap ${peso.format(row.budgetAmount)}` : peso.format(row.budgetAmount)}</div>{row.budgetMode !== "shared" && <div className="mt-1 text-[8.8px] text-emerald-700">{peso.format(row.availableAmount)} remaining</div>}</td><td className="px-3 py-3 text-neutral-600"><div>{peso.format(row.reservedAmount)} reserved</div><div>{peso.format(row.spentAmount)} spent</div><div>{peso.format(row.returnedAmount)} returned</div></td><td className="px-3 py-3"><div className="flex flex-wrap gap-1">{receipts.slice(0, 3).map((receipt) => <button key={receipt.id} type="button" title={receipt.fileName} onClick={async () => window.open(await createReceiptSignedUrl(receipt.filePath), "_blank", "noopener,noreferrer")} className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[8.5px] text-emerald-700"><ReceiptText size={9} /> {receipt.vendor} · {peso.format(receipt.amount)}</button>)}{evidence.slice(0, 3).map((item) => <button key={item.id} type="button" onClick={async () => { const url = await getSubtaskEvidenceUrl(item.filePath); if (url) window.open(url, "_blank", "noopener,noreferrer"); }} className="inline-flex items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[8.5px] text-blue-700"><Eye size={9} /> {item.fileName}</button>)}{!receipts.length && !evidence.length && <span className="text-neutral-300">No files</span>}</div></td></tr>;
}

function ReceiptRegister({ data }: { data: ProjectCommandData }) {
  const requestById = new Map(data.financial.requests.map((request) => [request.id, request]));
  const commitmentById = new Map(data.financial.commitments.map((commitment) => [commitment.id, commitment]));
  const receipts = data.financial.liquidations.flatMap((liquidation) => liquidation.receipts.map((receipt) => ({ liquidation, receipt, request: requestById.get(liquidation.requestId) })));
  return <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm"><header className="border-b border-neutral-100 px-4 py-3"><h4 className="text-[12px] font-semibold">Financial and liquidation register</h4><p className="mt-0.5 text-[9.5px] text-neutral-500">Every receipt remains linked to its proposal, task, subtask, requester, and liquidation attempt.</p></header>{receipts.length ? receipts.map(({ liquidation, receipt, request }) => <div key={receipt.id} className="grid gap-3 border-b border-neutral-100 p-4 last:border-0 md:grid-cols-[1fr_auto_auto]"><div><div className="text-[10.5px] font-medium text-neutral-900">{[request ? commitmentById.get(request.commitmentId)?.title : undefined, request?.taskTitle, request?.subtaskTitle].filter(Boolean).join(" → ") || "Funded work"}</div><div className="mt-1 text-[9.5px] text-neutral-500">{request?.cashRecipientName || request?.requesterName} · {request?.purpose} · liquidation attempt {liquidation.version}</div></div><div className="text-right"><div className="text-[10px] font-semibold">{peso.format(receipt.amount)}</div><div className="mt-1 text-[8.8px] text-neutral-400">{receipt.vendor} · {receipt.receiptDate}</div></div><button type="button" onClick={async () => window.open(await createReceiptSignedUrl(receipt.filePath), "_blank", "noopener,noreferrer")} className="inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-neutral-200 px-3 text-[9px] text-neutral-700"><Eye size={10} /> View receipt</button></div>) : <div className="p-8 text-center text-[10px] text-neutral-400">No receipt packages have been submitted for this project yet.</div>}</section>;
}

function Kpi({ label, value, note }: { label: string; value: string; note: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="text-[8.5px] font-semibold uppercase tracking-[0.12em] text-neutral-400">{label}</div><div className="mt-2 text-[14px] font-semibold text-neutral-900">{value}</div><div className="mt-1 text-[8.8px] text-neutral-400">{note}</div></div>;
}
