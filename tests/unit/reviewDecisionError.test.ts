import { describe, expect, it } from "vitest";
import { getReviewDecisionErrorMessage } from "../../src/app/features/tasks/services/taskReviewError";

describe("review-decision RPC errors", () => {
  it("turns a missing live RPC into an actionable error", () => {
    expect(
      getReviewDecisionErrorMessage({
        code: "PGRST202",
        message: "Could not find the function public.decide_task_review",
      }),
    ).toContain("not installed in Supabase");
  });

  it("retains database validation errors", () => {
    expect(
      getReviewDecisionErrorMessage({
        code: "42501",
        message: "Only the assigned reviewer may decide this submission",
      }),
    ).toBe("Only the assigned reviewer may decide this submission");
  });
});
