import type {
  BudgetCommitment,
  BudgetLedgerEntry,
  DepartmentBudgetLine,
  DepartmentBudgetSummary,
  PettyCashLiquidation,
  PettyCashReceipt,
  PettyCashRequest,
  WorkBudgetAllocation,
} from "../types";

const number = (value: unknown) => Number(value || 0);
const millis = (value: unknown) => value ? new Date(String(value)).getTime() : undefined;

export const mapBudgetSummary = (row: Record<string, unknown>): DepartmentBudgetSummary => ({
  id: String(row.id), orgId: String(row.orgId), fiscalYear: number(row.fiscalYear),
  status: String(row.status) as DepartmentBudgetSummary["status"],
  approvedAmount: number(row.approvedAmount), committedAmount: number(row.committedAmount),
  spentAmount: number(row.spentAmount), availableAmount: number(row.availableAmount),
  commitmentRemaining: number(row.commitmentRemaining), pettyCashLimit: number(row.pettyCashLimit),
  pettyCashRequestLimit: number(row.pettyCashRequestLimit), pettyCashReserved: number(row.pettyCashReserved),
  pettyCashSpent: number(row.pettyCashSpent), pettyCashAvailable: number(row.pettyCashAvailable),
  underutilizationThreshold: number(row.underutilizationThreshold), notes: row.notes ? String(row.notes) : undefined,
  lockedAt: millis(row.lockedAt), updatedAt: millis(row.updatedAt),
});

export const mapBudgetLine = (row: Record<string, unknown>): DepartmentBudgetLine => ({
  id: String(row.id), fiscalBudgetId: String(row.fiscal_budget_id), expenseClass: String(row.expense_class || "Other Expenses"), category: String(row.category || ""),
  particular: String(row.particular || ""), amount: number(row.approved_amount),
  fundSource: String(row.fund_source || ""), position: number(row.position),
});

export const mapCommitment = (row: Record<string, unknown>): BudgetCommitment => ({
  id: String(row.id), fiscalBudgetId: String(row.fiscal_budget_id), proposalDraftId: String(row.proposal_draft_id),
  proposalRevisionId: row.proposal_revision_id ? String(row.proposal_revision_id) : undefined,
  title: String(row.title || "Untitled proposal"), amount: number(row.amount),
  status: String(row.status) as BudgetCommitment["status"], createdAt: millis(row.created_at) || 0,
});

export const mapAllocation = (row: Record<string, unknown>): WorkBudgetAllocation => ({
  id: String(row.id), commitmentId: String(row.commitment_id), taskId: String(row.task_id),
  subtaskId: row.subtask_id ? String(row.subtask_id) : undefined, amount: number(row.amount),
  status: String(row.status) as WorkBudgetAllocation["status"], reason: String(row.reason || ""),
  requestedBy: String(row.requested_by), decidedBy: row.decided_by ? String(row.decided_by) : undefined,
  decisionReason: row.decision_reason ? String(row.decision_reason) : undefined,
  requestedAt: millis(row.requested_at) || 0, decidedAt: millis(row.decided_at),
});

export const mapRequest = (row: Record<string, unknown>): PettyCashRequest => ({
  id: String(row.id), requestNumber: number(row.request_number), fiscalBudgetId: String(row.fiscal_budget_id),
  commitmentId: String(row.commitment_id), allocationId: String(row.allocation_id), orgId: String(row.org_id),
  taskId: String(row.task_id), subtaskId: row.subtask_id ? String(row.subtask_id) : undefined,
  requesterId: String(row.requester_id), requesterName: (row.requester as { full_name?: string } | null)?.full_name,
  taskTitle: (row.task as { title?: string } | null)?.title, subtaskTitle: (row.subtask as { title?: string } | null)?.title,
  purpose: String(row.purpose || ""), requestedAmount: number(row.requested_amount),
  neededBy: row.needed_by ? String(row.needed_by) : undefined,
  status: String(row.status) as PettyCashRequest["status"],
  approvedAmount: row.approved_amount == null ? undefined : number(row.approved_amount),
  approvalReason: row.approval_reason ? String(row.approval_reason) : undefined,
  actualSpent: row.actual_spent == null ? undefined : number(row.actual_spent),
  returnedAmount: row.returned_amount == null ? undefined : number(row.returned_amount),
  createdAt: millis(row.created_at) || 0, updatedAt: millis(row.updated_at) || 0,
});

export const mapReceipt = (row: Record<string, unknown>): PettyCashReceipt => ({
  id: String(row.id), liquidationId: String(row.liquidation_id), vendor: String(row.vendor || ""),
  receiptNumber: row.receipt_number ? String(row.receipt_number) : undefined,
  receiptDate: String(row.receipt_date || ""), description: String(row.description || ""), amount: number(row.amount),
  fileName: String(row.file_name || "Receipt"), filePath: String(row.file_path || ""),
  mimeType: String(row.mime_type || "application/octet-stream"), fileSize: number(row.file_size),
});

export const mapLiquidation = (row: Record<string, unknown>, receipts: PettyCashReceipt[]): PettyCashLiquidation => ({
  id: String(row.id), requestId: String(row.request_id), version: number(row.version),
  declaredSpent: number(row.declared_spent), returnedAmount: number(row.returned_amount), note: String(row.note || ""),
  status: String(row.status) as PettyCashLiquidation["status"], submittedBy: String(row.submitted_by),
  submittedAt: millis(row.submitted_at) || 0, decisionReason: row.decision_reason ? String(row.decision_reason) : undefined,
  receipts: receipts.filter((receipt) => receipt.liquidationId === String(row.id)),
});

export const mapLedger = (row: Record<string, unknown>): BudgetLedgerEntry => ({
  id: String(row.id), entryType: String(row.entry_type || ""), amount: number(row.amount),
  description: String(row.description || ""), actorId: row.actor_id ? String(row.actor_id) : undefined,
  createdAt: millis(row.created_at) || 0,
});
