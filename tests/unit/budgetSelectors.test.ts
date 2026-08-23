import { describe, expect, it } from "vitest";
import {
  getAllocationCashPosition,
  getBudgetScheduleTotals,
  groupProposalBudgetLines,
  getBudgetUtilizationSignal,
  type DepartmentBudgetSummary,
  type PettyCashRequest,
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
});
