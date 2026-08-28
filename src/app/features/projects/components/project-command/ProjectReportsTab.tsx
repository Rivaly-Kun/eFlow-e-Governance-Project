import { useMemo } from "react";
import { Button, EmptyState, Label } from "@vibe/core";
import { Download, File, Open } from "@vibe/icons";
import { AlertTriangle, Eye, ReceiptText } from "lucide-react";
import { createReceiptSignedUrl, peso } from "../../../budget";
import { getSubtaskEvidenceUrl } from "../../../subtasks";
import {
  exportCsv,
  exportPdf,
  type ReportColumn,
} from "../../../../services/reportService";
import {
  buildProjectExecutionFinancialRows,
  type ProjectExecutionFinancialRow,
} from "../../selectors/projectFinancialReportSelectors";
import type { ProjectCommandData } from "./types";

const COLUMNS: ReportColumn<ProjectExecutionFinancialRow>[] = [
  {
    key: "hierarchy",
    header: "Work Item",
    value: (row) => `${row.level === "subtask" ? "  ↳ " : ""}${row.workItem}`,
  },
  {
    key: "accountability",
    header: "Accountability",
    value: (row) => row.accountability,
  },
  {
    key: "status",
    header: "Status",
    value: (row) => row.status.replace(/_/g, " "),
  },
  { key: "progress", header: "Progress", value: (row) => `${row.progress}%` },
  {
    key: "deadline",
    header: "Deadline",
    value: (row) => row.deadline || "Unscheduled",
  },
  {
    key: "schedule",
    header: "Schedule Health",
    value: (row) => row.schedule.replace(/_/g, " "),
  },
  { key: "budget_mode", header: "Budget Mode", value: (row) => row.budgetMode },
  {
    key: "budget",
    header: "Budget / Cap",
    value: (row) =>
      row.budgetMode === "shared"
        ? "Shared task pool"
        : row.budgetAmount.toFixed(2),
  },
  {
    key: "reserved",
    header: "Reserved",
    value: (row) => row.reservedAmount.toFixed(2),
  },
  {
    key: "spent",
    header: "Actual Spent",
    value: (row) => row.spentAmount.toFixed(2),
  },
  {
    key: "returned",
    header: "Returned",
    value: (row) => row.returnedAmount.toFixed(2),
  },
  {
    key: "available",
    header: "Available",
    value: (row) =>
      row.budgetMode === "shared"
        ? "From parent task"
        : row.availableAmount.toFixed(2),
  },
  { key: "receipts", header: "Receipts", value: (row) => row.receiptCount },
  {
    key: "evidence",
    header: "Completion Evidence",
    value: (row) => row.evidenceCount,
  },
];

export function ProjectReportsTab({
  data,
  canExport,
}: {
  data: ProjectCommandData;
  canExport: boolean;
}) {
  const rows = useMemo(
    () =>
      buildProjectExecutionFinancialRows(
        data.tasks,
        data.facts.subtasks,
        data.financial,
        data.facts,
      ),
    [data.facts, data.financial, data.tasks],
  );
  const taskRows = rows.filter((row) => row.level === "task");
  const totalBudget = taskRows.reduce((sum, row) => sum + row.budgetAmount, 0);
  const actualSpent = data.financial.requests
    .filter((request) => request.status === "settled")
    .reduce((sum, request) => sum + (request.actualSpent || 0), 0);
  const reserved = data.financial.requests
    .filter(
      (request) =>
        !["draft", "rejected", "cancelled", "expired", "settled"].includes(
          request.status,
        ),
    )
    .reduce(
      (sum, request) =>
        sum + (request.approvedAmount ?? request.requestedAmount),
      0,
    );
  const remaining = Math.max(0, totalBudget - actualSpent - reserved);
  const receiptCount = data.financial.liquidations.reduce(
    (sum, liquidation) => sum + liquidation.receipts.length,
    0,
  );
  const overdue = rows.filter((row) => row.schedule === "overdue").length;
  const meta = {
    title: `${data.project.title} Execution and Financial Register`,
    subtitle:
      "Task/subtask hierarchy, accountability, delivery, cash reservations, actual expenses, returns, and receipt evidence",
    filters: { project: data.project.title, status: data.project.status },
    totals: {
      progress: `${data.metrics.progress}%`,
      task_budget: peso.format(totalBudget),
      reserved: peso.format(reserved),
      actual_spent: peso.format(actualSpent),
      remaining: peso.format(remaining),
      receipts: receiptCount,
    },
  };

  return (
    <div className="space-y-4">
      <section className="eflow-section-card">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2>Project execution and financial register</h2>
              <Label text="Audit & Liquidation" color="dark" />
            </div>
            <p className="m-0 mt-1 text-xs text-secondary max-w-2xl">
              Traceable register from approved task funding through progress,
              cash release, receipts, returned balance, and settlement.
            </p>
          </div>
          {canExport && (
            <div className="flex gap-2">
              <Button
                size="small"
                leftIcon={Download}
                onClick={() => exportCsv(rows, COLUMNS, meta)}
              >
                Export CSV
              </Button>
              <Button
                kind="secondary"
                size="small"
                leftIcon={File}
                onClick={() => exportPdf(rows, COLUMNS, meta)}
              >
                Export PDF
              </Button>
            </div>
          )}
        </header>
      </section>

      {data.financialError && (
        <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> Financial rows
          could not be loaded: {data.financialError}
        </div>
      )}

      {/* Operational & Financial Pulse Bar */}
      <div className="eflow-health-strip">
        <div className="eflow-health-item">
          <span className="eflow-health-item-label">Weighted progress</span>
          <div className="flex items-center gap-2">
            <span className="eflow-health-item-value">{data.metrics.progress}%</span>
            <span className="text-xs text-secondary">
              ({data.metrics.taskCompleted}/{data.metrics.taskTotal} tasks)
            </span>
          </div>
        </div>

        <div className="eflow-health-item">
          <span className="eflow-health-item-label">Task budget</span>
          <span className="eflow-health-item-value">{peso.format(totalBudget)}</span>
        </div>

        <div className="eflow-health-item">
          <span className="eflow-health-item-label">Reserved cash</span>
          <span className="eflow-health-item-value">{peso.format(reserved)}</span>
        </div>

        <div className="eflow-health-item">
          <span className="eflow-health-item-label">Actual spent</span>
          <span className="eflow-health-item-value">{peso.format(actualSpent)}</span>
        </div>

        <div className="eflow-health-item">
          <span className="eflow-health-item-label">Remaining balance</span>
          <span className="eflow-health-item-value text-emerald-700">{peso.format(remaining)}</span>
        </div>

        <div className="eflow-health-item">
          <span className="eflow-health-item-label">Evidence health</span>
          <span className="eflow-health-item-value">
            {receiptCount} receipts · {data.facts.evidence.length} files · {overdue} overdue
          </span>
        </div>
      </div>

      <section className="eflow-section-card">
        <header>
          <h3>Task and subtask execution register</h3>
          <p className="m-0 mt-0.5 text-xs text-secondary">
            Subtasks without a set cap draw dynamically from the shared parent-task pool.
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-[1100px] w-full text-left text-xs">
            <thead className="border-b border-neutral-200 bg-neutral-50 text-[11px] font-bold uppercase tracking-wider text-neutral-600">
              <tr>
                <th className="px-4 py-3">Work hierarchy</th>
                <th className="px-4 py-3">Accountability</th>
                <th className="px-4 py-3">Status / progress</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Budget mode</th>
                <th className="px-4 py-3">Reserved / spent / returned</th>
                <th className="px-4 py-3">Evidence</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {rows.map((row) => (
                <ExecutionRow
                  key={`${row.level}-${row.id}`}
                  row={row}
                  data={data}
                />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <ReceiptRegister data={data} />
    </div>
  );
}

function ExecutionRow({
  row,
  data,
}: {
  row: ProjectExecutionFinancialRow;
  data: ProjectCommandData;
}) {
  const requestIds = new Set(
    data.financial.requests
      .filter((request) =>
        row.level === "task"
          ? request.taskId === row.id
          : request.subtaskId === row.id,
      )
      .map((request) => request.id),
  );
  const receipts = data.financial.liquidations
    .filter((item) => requestIds.has(item.requestId))
    .flatMap((item) => item.receipts);
  const submissionIds = new Set(
    data.facts.submissions
      .filter((item) =>
        row.level === "task"
          ? item.kind === "task" && item.taskId === row.id
          : item.kind === "subtask" && item.subtaskId === row.id,
      )
      .map((item) => item.id),
  );
  const evidence = data.facts.evidence.filter(
    (item) =>
      item.taskId === (row.parentTaskId || row.id) &&
      (row.level === "task"
        ? item.kind === "task"
        : Boolean(item.submissionId && submissionIds.has(item.submissionId))),
  );

  const scheduleColor =
    row.schedule === "overdue"
      ? "negative"
      : row.schedule === "due_soon"
        ? "working_orange"
        : row.schedule === "completed"
          ? "positive"
          : "dark";

  return (
    <tr
      className={`text-xs ${row.level === "task" ? "bg-white font-medium" : "bg-neutral-50/60"}`}
    >
      <td className="px-4 py-3">
        <div
          className={`${row.level === "task" ? "font-semibold text-neutral-900" : "pl-4 text-neutral-700"}`}
        >
          {row.level === "subtask" && (
            <span className="mr-1.5 text-neutral-400">↳</span>
          )}
          {row.workItem}
        </div>
      </td>
      <td className="px-4 py-3 text-secondary">{row.accountability}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="capitalize text-neutral-700">
            {row.status.replace(/_/g, " ")}
          </span>
          <strong className="text-neutral-900">{row.progress}%</strong>
        </div>
        <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-neutral-200">
          <div
            className="h-full rounded-full bg-blue-600"
            style={{ width: `${row.progress}%` }}
          />
        </div>
      </td>
      <td className="px-4 py-3">
        <Label text={row.schedule.replace(/_/g, " ")} color={scheduleColor} />
        <div className="mt-1 text-[11px] text-secondary">
          {row.deadline || "No deadline"}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-neutral-800">
          {row.budgetMode === "shared"
            ? "Shared task pool"
            : row.budgetMode === "cap"
              ? `Cap ${peso.format(row.budgetAmount)}`
              : peso.format(row.budgetAmount)}
        </div>
        {row.budgetMode !== "shared" && (
          <div className="mt-0.5 text-[11px] text-emerald-700 font-medium">
            {peso.format(row.availableAmount)} remaining
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-secondary">
        <div>{peso.format(row.reservedAmount)} reserved</div>
        <div className="font-medium text-neutral-800">
          {peso.format(row.spentAmount)} spent
        </div>
        <div>{peso.format(row.returnedAmount)} returned</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1.5">
          {receipts.slice(0, 3).map((receipt) => (
            <button
              key={receipt.id}
              type="button"
              title={receipt.fileName}
              onClick={async () =>
                window.open(
                  await createReceiptSignedUrl(receipt.filePath),
                  "_blank",
                  "noopener,noreferrer",
                )
              }
              className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
            >
              <ReceiptText size={11} /> {receipt.vendor} ·{" "}
              {peso.format(receipt.amount)}
            </button>
          ))}
          {evidence.slice(0, 3).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={async () => {
                const url = await getSubtaskEvidenceUrl(item.filePath);
                if (url) window.open(url, "_blank", "noopener,noreferrer");
              }}
              className="inline-flex items-center gap-1 rounded-md border border-blue-300 bg-blue-50 px-2 py-1 text-[11px] font-medium text-blue-800 hover:bg-blue-100"
            >
              <Eye size={11} /> {item.fileName}
            </button>
          ))}
          {!receipts.length && !evidence.length && (
            <span className="text-secondary text-[11px]">No files attached</span>
          )}
        </div>
      </td>
    </tr>
  );
}

function ReceiptRegister({ data }: { data: ProjectCommandData }) {
  const requestById = new Map(
    data.financial.requests.map((request) => [request.id, request]),
  );
  const commitmentById = new Map(
    data.financial.commitments.map((commitment) => [commitment.id, commitment]),
  );
  const receipts = data.financial.liquidations.flatMap((liquidation) =>
    liquidation.receipts.map((receipt) => ({
      liquidation,
      receipt,
      request: requestById.get(liquidation.requestId),
    })),
  );
  return (
    <section className="eflow-section-card">
      <header>
        <h3>Financial and liquidation register</h3>
        <p className="m-0 mt-0.5 text-xs text-secondary">
          Every receipt remains linked to its proposal, task, subtask,
          requester, and liquidation record.
        </p>
      </header>
      {receipts.length ? (
        <div className="divide-y divide-neutral-100">
          {receipts.map(({ liquidation, receipt, request }) => (
            <div
              key={receipt.id}
              className="flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <div>
                <div className="text-sm font-semibold text-neutral-900">
                  {[
                    request
                      ? commitmentById.get(request.commitmentId)?.title
                      : undefined,
                    request?.taskTitle,
                    request?.subtaskTitle,
                  ]
                    .filter(Boolean)
                    .join(" → ") || "Funded work item"}
                </div>
                <div className="mt-1 text-xs text-secondary">
                  {request?.cashRecipientName || request?.requesterName} ·{" "}
                  {request?.purpose} · liquidation attempt {liquidation.version}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-sm font-bold text-neutral-900">
                    {peso.format(receipt.amount)}
                  </div>
                  <div className="text-xs text-secondary">
                    {receipt.vendor} · {receipt.receiptDate}
                  </div>
                </div>
                <Button
                  kind="tertiary"
                  size="small"
                  leftIcon={Open}
                  onClick={async () =>
                    window.open(
                      await createReceiptSignedUrl(receipt.filePath),
                      "_blank",
                      "noopener,noreferrer",
                    )
                  }
                >
                  View receipt
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No receipt packages yet"
          description="Receipt packages appear here after they are submitted and liquidated for this project."
        />
      )}
    </section>
  );
}
