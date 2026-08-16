import { describe, expect, it } from "vitest";
import {
  normalizeDraftAssignment,
  selectDraftAssignmentLead,
  toggleDraftAssignmentMember,
} from "../../src/app/features/proposal-import/services/draftAssignment";

describe("draft team assignment", () => {
  it("makes the first selected member the team leader", () => {
    const assignment = toggleDraftAssignmentMember(
      { memberIds: [], leadId: null },
      "employee-1",
    );

    expect(assignment).toEqual({
      memberIds: ["employee-1"],
      leadId: "employee-1",
    });
  });

  it("promotes the next member when the current leader is removed", () => {
    const assignment = toggleDraftAssignmentMember(
      { memberIds: ["employee-1", "employee-2"], leadId: "employee-1" },
      "employee-1",
    );

    expect(assignment).toEqual({
      memberIds: ["employee-2"],
      leadId: "employee-2",
    });
  });

  it("allows a selected team member to be designated as leader", () => {
    const assignment = selectDraftAssignmentLead(
      normalizeDraftAssignment(["employee-1", "employee-2"], null),
      "employee-2",
    );

    expect(assignment.leadId).toBe("employee-2");
  });
});
