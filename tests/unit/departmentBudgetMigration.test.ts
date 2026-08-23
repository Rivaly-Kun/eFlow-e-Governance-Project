import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL(
    "../../supabase/migrations/20260822000008_department_budget_and_petty_cash.sql",
    import.meta.url,
  ),
  "utf8",
);

describe("department budget migration", () => {
  it("hard-gates manual proposal publication against a locked annual budget", () => {
    expect(sql).toContain("commit_single_department_proposal_budget");
    expect(sql).toContain("No locked % department budget exists");
    expect(sql).toContain("Insufficient department budget. Shortfall");
    expect(sql).toContain("Set a proposal budget greater than zero before publishing");
    expect(sql).toContain("revision.snapshot -> 'budget'");
    expect(sql).toContain("line ->> 'expenseClass'");
  });

  it("keeps reservations, verified expenses, and returned cash as separate ledger events", () => {
    expect(sql).toContain("'petty_cash_reserved'");
    expect(sql).toContain("'expense_posted'");
    expect(sql).toContain("'cash_returned'");
    expect(sql).toContain("You cannot approve your own request");
    expect(sql).toContain("Receipt amounts must equal the declared amount spent");
  });

  it("uses the established user-first organization access signature", () => {
    expect(sql).toContain("public.can_access_org(caller_id, target_org, 'read')");
    expect(sql).not.toContain("public.can_access_org(p_org_id, auth.uid())");
  });
});
