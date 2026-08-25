import { describe, expect, it } from "vitest";
import {
  buildBudgetExpenseReportRows,
  getAllocationCashPosition,
  getTaskBudgetDistribution,
  getBudgetScheduleTotals,
  groupProposalBudgetLines,
  getBudgetUtilizationSignal,
  getEligiblePettyCashAllocations,
  type DepartmentBudgetSummary,
  type PettyCashRequest,
  type WorkBudgetAllocation,
} from "../../src/app/features/budget";

function request(
  status: PettyCashRequest["status"],
  approvedAmount: number,
  actualSpent?: number,
): PettyCashRequest {
  return {
    id: crypto.randomUUID(),
    requestNumber: 1,
    fiscalBudgetId: "budget-1",
    commitmentId: "commitment-1",
    allocationId: "allocation-1",
    orgId: "org-1",
    taskId: "task-1",
    requesterId: "user-1",
    purpose: "Operational expense",
    requestedAmount: approvedAmount,
    approvedAmount,
    actualSpent,
    status,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("budget selectors", () => {
  it("keeps multiple particulars inside their shared category", () => {
    expect(groupProposalBudgetLines([
      { id: "1", expenseClass: "Professional Services", category: "Honoraria", particular: "Lead consultant", amount: 325_000, fundSource: "Department Budget", position: 0 },
      { id: "2", expenseClass: "Professional Services", category: "Honoraria", particular: "Research assistants", amount: 120_000, fundSource: "Department Budget", position: 1 },
    ])).toMatchObject([{
      expenseClass: "Professional Services",
      amount: 445_000,
      categories: [{
        category: "Honoraria",
        amount: 445_000,
        particulars: [{ id: "1" }, { id: "2" }],
      }],
    }]);
  });

  it("calculates PDF-style subtotals by expense class and category", () => {
    expect(getBudgetScheduleTotals([
      { id: "1", expenseClass: "Professional Services", category: "Honoraria", particular: "Consultant", amount: 500, fundSource: "LEDIPO", position: 0 },
      { id: "2", expenseClass: "Other Expenses", category: "Meals", particular: "Workshop meals", amount: 300, fundSource: "LEDIPO", position: 1 },
      { id: "3", expenseClass: "Professional Services", category: "Honoraria", particular: "Facilitator", amount: 250, fundSource: "LEDIPO", position: 2 },
      { id: "4", expenseClass: "Professional Services", category: "Documentation", particular: "Writer", amount: 125, fundSource: "LEDIPO", position: 3 },
    ])).toEqual([
      {
        expenseClass: "Professional Services",
        amount: 875,
        categories: [
          { category: "Honoraria", amount: 750 },
          { category: "Documentation", amount: 125 },
        ],
      },
      {
        expenseClass: "Other Expenses",
        amount: 300,
        categories: [{ category: "Meals", amount: 300 }],
      },
    ]);
  });

  it("keeps reserved cash and verified spending separate", () => {
    expect(getAllocationCashPosition(10_000, [
      request("approved", 2_000),
      request("liquidation_submitted", 1_000),
      request("settled", 3_000, 2_500),
      request("rejected", 900),
    ])).toEqual({
      reserved: 3_000,
      spent: 2_500,
      remaining: 4_500,
    });
  });

  it("does not expose parent-task cash twice after it is delegated or reserved", () => {
    const taskCash = request("approved", 1_000);
    const distribution = getTaskBudgetDistribution(
      1_000,
      [taskCash],
      [{ id: "subtask", taskId: "task-1", subtaskId: "sub-1", amount: 0, status: "approved" } as WorkBudgetAllocation],
    );

    expect(distribution).toMatchObject({
      taskCashCommitted: 1_000,
      allocatedToSubtasks: 0,
      distributable: 0,
    });
  });

  it("only raises the underutilization warning during Q4", () => {
    const summary = {
      approvedAmount: 100_000,
      spentAmount: 60_000,
      underutilizationThreshold: 75,
    } as DepartmentBudgetSummary;

    expect(getBudgetUtilizationSignal(summary, 8)).toMatchObject({
      utilization: 60,
      isQ4: false,
      underTarget: false,
    });
    expect(getBudgetUtilizationSignal(summary, 9)).toMatchObject({
      utilization: 60,
      isQ4: true,
      underTarget: true,
    });
  });

  it("lets contributors request only from their assigned subtask allocation", () => {
    const allocations = [
      { id: "task", taskId: "task-1", status: "approved", subtaskAssigneeIds: [] },
      { id: "mine", taskId: "task-1", subtaskId: "sub-1", status: "approved", subtaskAssigneeIds: ["employee"] },
      { id: "other", taskId: "task-1", subtaskId: "sub-2", status: "approved", subtaskAssigneeIds: ["other"] },
    ] as WorkBudgetAllocation[];
    const tasks = [{ id: "task-1", recommendationLeadId: "leader", teamMemberIds: ["employee", "other"] }];

    expect(getEligiblePettyCashAllocations(allocations, tasks, "employee").map((item) => item.id)).toEqual(["mine"]);
    expect(getEligiblePettyCashAllocations(allocations, tasks, "leader").map((item) => item.id)).toEqual(["task", "mine", "other"]);
  });

  it("reports only settled spending with its proposal and budget classification", () => {
    const settled = request("settled", 1_000, 850);
    settled.id = "request-1";
    settled.requestNumber = 7;
    settled.requesterName = "Employee One";
    settled.taskTitle = "Prepare meeting";
    settled.subtaskTitle = "Buy materials";
    settled.returnedAmount = 150;
    settled.updatedAt = Date.UTC(2026, 7, 24);
    const pending = request("pending_department_approval", 500);
    expect(buildBudgetExpenseReportRows({
      summary: null, lines: [], adjustments: [], releases: [], ledger: [],
      commitments: [{ id: "commitment-1", fiscalBudgetId: "budget-1", proposalDraftId: "draft-1", title: "Annual Investment Plan", amount: 10_000, status: "active", createdAt: 1 }],
      allocations: [{ id: "allocation-1", commitmentId: "commitment-1", taskId: "task-1", amount: 10_000, status: "approved", reason: "Published", requestedBy: "head", requestedAt: 1 }],
      allocationLines: [{ id: "line-1", allocationId: "allocation-1", expenseClass: "Other Expenses", category: "Meeting supplies", particular: "Materials", amount: 10_000, fundSource: "Department Budget", position: 0 }],
      requests: [settled, pending],
      liquidations: [{ id: "liquidation-1", requestId: "request-1", version: 1, declaredSpent: 850, returnedAmount: 150, note: "Complete", status: "approved", submittedBy: "employee", submittedAt: settled.updatedAt, receipts: [{ id: "receipt-1", liquidationId: "liquidation-1", vendor: "Vendor", receiptDate: "2026-08-24", description: "Materials", amount: 850, fileName: "receipt.pdf", filePath: "receipt.pdf", mimeType: "application/pdf", fileSize: 10 }] }],
    })).toMatchObject([{
      requestNumber: 7,
      proposal: "Annual Investment Plan",
      task: "Prepare meeting",
      subtask: "Buy materials",
      employee: "Employee One",
      expenseClasses: ["Other Expenses"],
      categories: ["Meeting supplies"],
      actualAmount: 850,
      returnedAmount: 150,
      receiptCount: 1,
      monthKey: "2026-08",
    }]);
  });
});
