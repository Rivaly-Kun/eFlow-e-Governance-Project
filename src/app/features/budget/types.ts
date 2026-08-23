export type FiscalBudgetStatus = "draft" | "locked" | "closed";
export type AllocationStatus = "pending" | "approved" | "rejected" | "cancelled";
export type PettyCashStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "cancelled"
  | "liquidation_submitted"
  | "changes_requested"
  | "settled";

export interface BudgetLineInput {
  id: string;
  expenseClass: string;
  category: string;
  particular: string;
  amount: number;
  fundSource: string;
  position: number;
}

export interface ProposalBudgetDraft {
  fiscalYear: number;
  totalAmount: number;
  lines: BudgetLineInput[];
}

export interface ProposalBudgetCategoryGroup {
  id: string;
  category: string;
  fundSource: string;
  amount: number;
  particulars: BudgetLineInput[];
}

export interface ProposalBudgetExpenseGroup {
  id: string;
  expenseClass: string;
  amount: number;
  categories: ProposalBudgetCategoryGroup[];
}

export interface DepartmentBudgetSummary {
  id: string;
  orgId: string;
  fiscalYear: number;
  status: FiscalBudgetStatus;
  approvedAmount: number;
  committedAmount: number;
  spentAmount: number;
  availableAmount: number;
  commitmentRemaining: number;
  pettyCashLimit: number;
  pettyCashRequestLimit: number;
  pettyCashReserved: number;
  pettyCashSpent: number;
  pettyCashAvailable: number;
  underutilizationThreshold: number;
  notes?: string;
  lockedAt?: number;
  updatedAt?: number;
}

export interface DepartmentBudgetLine extends BudgetLineInput {
  fiscalBudgetId: string;
}

export interface BudgetCommitment {
  id: string;
  fiscalBudgetId: string;
  proposalDraftId: string;
  proposalRevisionId?: string;
  title: string;
  amount: number;
  status: "active" | "released" | "closed";
  createdAt: number;
}

export interface WorkBudgetAllocation {
  id: string;
  commitmentId: string;
  taskId: string;
  subtaskId?: string;
  amount: number;
  status: AllocationStatus;
  reason: string;
  requestedBy: string;
  decidedBy?: string;
  decisionReason?: string;
  requestedAt: number;
  decidedAt?: number;
}

export interface PettyCashRequest {
  id: string;
  requestNumber: number;
  fiscalBudgetId: string;
  commitmentId: string;
  allocationId: string;
  orgId: string;
  taskId: string;
  subtaskId?: string;
  requesterId: string;
  requesterName?: string;
  taskTitle?: string;
  subtaskTitle?: string;
  purpose: string;
  requestedAmount: number;
  neededBy?: string;
  status: PettyCashStatus;
  approvedAmount?: number;
  approvalReason?: string;
  actualSpent?: number;
  returnedAmount?: number;
  createdAt: number;
  updatedAt: number;
}

export interface PettyCashReceipt {
  id: string;
  liquidationId: string;
  vendor: string;
  receiptNumber?: string;
  receiptDate: string;
  description: string;
  amount: number;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
}

export interface PettyCashLiquidation {
  id: string;
  requestId: string;
  version: number;
  declaredSpent: number;
  returnedAmount: number;
  note: string;
  status: "pending" | "approved" | "changes_requested";
  submittedBy: string;
  submittedAt: number;
  decisionReason?: string;
  receipts: PettyCashReceipt[];
}

export interface BudgetLedgerEntry {
  id: string;
  entryType: string;
  amount: number;
  description: string;
  actorId?: string;
  createdAt: number;
}

export interface DepartmentBudgetBundle {
  summary: DepartmentBudgetSummary | null;
  lines: DepartmentBudgetLine[];
  commitments: BudgetCommitment[];
  allocations: WorkBudgetAllocation[];
  requests: PettyCashRequest[];
  liquidations: PettyCashLiquidation[];
  ledger: BudgetLedgerEntry[];
}

export interface ReceiptDraft {
  id: string;
  vendor: string;
  receiptNumber: string;
  receiptDate: string;
  description: string;
  amount: number;
  file?: File;
}
