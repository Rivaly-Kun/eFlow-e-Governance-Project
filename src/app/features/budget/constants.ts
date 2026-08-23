import type { ProposalBudgetDraft } from "./types";

export const DEFAULT_PETTY_CASH_LIMIT = 30_000;
export const DEFAULT_PETTY_CASH_REQUEST_LIMIT = 5_000;
export const DEFAULT_UNDERUTILIZATION_THRESHOLD = 75;
export const PROPOSAL_FUND_SOURCE = "Department Budget";
export const PROPOSAL_EXPENSE_CLASSES = [
  "Professional Services",
  "Other Expenses",
  "Maintenance and Other Operating Expenses",
  "Capital Outlay",
  "Personnel Services",
] as const;

export function createBudgetLine(position = 0) {
  return {
    id: crypto.randomUUID(),
    expenseClass: "Other Expenses",
    category: "Operating Expenses",
    particular: "",
    amount: 0,
    fundSource: PROPOSAL_FUND_SOURCE,
    position,
  };
}

export function createEmptyProposalBudget(fiscalYear = new Date().getFullYear()): ProposalBudgetDraft {
  return { fiscalYear, totalAmount: 0, lines: [createBudgetLine(0)] };
}
