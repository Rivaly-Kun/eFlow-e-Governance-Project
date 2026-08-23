import type {
  BudgetLineInput,
  DepartmentBudgetSummary,
  PettyCashRequest,
  ProposalBudgetExpenseGroup,
} from "../types";

export function groupProposalBudgetLines(lines: BudgetLineInput[]): ProposalBudgetExpenseGroup[] {
  const expenseGroups = new Map<string, ProposalBudgetExpenseGroup>();

  for (const line of lines) {
    const expenseKey = line.expenseClass.trim().toLowerCase() || "__empty_expense_class__";
    let expenseGroup = expenseGroups.get(expenseKey);
    if (!expenseGroup) {
      expenseGroup = {
        id: line.id,
        expenseClass: line.expenseClass,
        amount: 0,
        categories: [],
      };
      expenseGroups.set(expenseKey, expenseGroup);
    }

    const categoryKey = line.category.trim().toLowerCase() || "__empty_category__";
    let categoryGroup = expenseGroup.categories.find(
      (category) => (category.category.trim().toLowerCase() || "__empty_category__") === categoryKey,
    );
    if (!categoryGroup) {
      categoryGroup = {
        id: line.id,
        category: line.category,
        fundSource: line.fundSource,
        amount: 0,
        particulars: [],
      };
      expenseGroup.categories.push(categoryGroup);
    }

    const amount = Math.max(0, Number(line.amount) || 0);
    categoryGroup.particulars.push(line);
    categoryGroup.amount += amount;
    expenseGroup.amount += amount;
  }

  return Array.from(expenseGroups.values());
}

export function getBudgetScheduleTotals(lines: BudgetLineInput[]) {
  const totals = new Map<string, Map<string, number>>();
  for (const line of lines) {
    const expenseClass = line.expenseClass.trim() || "Unclassified expenses";
    const category = line.category.trim() || "Uncategorized";
    const categoryTotals = totals.get(expenseClass) || new Map<string, number>();
    categoryTotals.set(
      category,
      (categoryTotals.get(category) || 0) + Math.max(0, Number(line.amount) || 0),
    );
    totals.set(expenseClass, categoryTotals);
  }
  return Array.from(totals, ([expenseClass, categoryTotals]) => ({
    expenseClass,
    amount: Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0),
    categories: Array.from(categoryTotals, ([category, amount]) => ({ category, amount })),
  }));
}

const RESERVED_REQUEST_STATES = new Set([
  "approved",
  "liquidation_submitted",
  "changes_requested",
]);

export function getAllocationCashPosition(
  allocationAmount: number,
  requests: PettyCashRequest[],
) {
  const reserved = requests
    .filter((request) => RESERVED_REQUEST_STATES.has(request.status))
    .reduce((total, request) => total + (request.approvedAmount || 0), 0);
  const spent = requests
    .filter((request) => request.status === "settled")
    .reduce((total, request) => total + (request.actualSpent || 0), 0);

  return {
    reserved,
    spent,
    remaining: Math.max(0, allocationAmount - reserved - spent),
  };
}

export function getBudgetUtilizationSignal(
  summary: DepartmentBudgetSummary,
  monthIndex = new Date().getMonth(),
) {
  const utilization = summary.approvedAmount > 0
    ? (summary.spentAmount / summary.approvedAmount) * 100
    : 0;
  const isQ4 = monthIndex >= 9;

  return {
    utilization,
    isQ4,
    underTarget: isQ4 && utilization < summary.underutilizationThreshold,
  };
}
