import { describe, expect, it } from "vitest";
import {
  getGovernanceLifecycleErrorMessage,
  isGovernanceLifecycleSchemaMissing,
} from "../../src/app/features/interdepartment-collaboration/services/governanceLifecycleError";

describe("governance lifecycle deployment errors", () => {
  it("turns the missing closeout RPC response into an actionable message", () => {
    const error = {
      code: "PGRST202",
      message:
        "Could not find the function public.request_proposal_closeout(p_draft_id, p_note) in the schema cache",
    };

    expect(isGovernanceLifecycleSchemaMissing(error)).toBe(true);
    expect(getGovernanceLifecycleErrorMessage(error)).toContain(
      "20260822000002_governance_delivery_lifecycle.sql",
    );
  });

  it("preserves ordinary governance validation errors", () => {
    expect(
      getGovernanceLifecycleErrorMessage({
        code: "22023",
        message: "Every active task must be approved before closeout",
      }),
    ).toBe("Every active task must be approved before closeout");
  });
});
