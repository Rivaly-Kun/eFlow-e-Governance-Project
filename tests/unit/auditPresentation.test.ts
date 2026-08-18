import { describe, expect, it } from "vitest";
import {
  humanizeAuditAction,
  humanizeAuditField,
  orderAuditDiff,
  presentAuditValue,
  shortenIdentifier,
} from "../../src/app/features/audit";

describe("audit presentation", () => {
  it("turns internal event and field names into operational language", () => {
    expect(humanizeAuditAction("task.transition.completed")).toBe("Task completed");
    expect(humanizeAuditField("auditHash")).toBe("Approval verification");
    expect(humanizeAuditField("submissionId")).toBe("Submission record");
  });

  it("abbreviates technical references without discarding their exact value", () => {
    const id = "721ec4b9-7372-49ef-ba3f-0d3e813ccb8d";
    expect(shortenIdentifier(id)).toBe("721ec4b9…3ccb8d");
    expect(presentAuditValue("submissionId", id)).toEqual({
      display: "721ec4b9…3ccb8d",
      technical: id,
    });
  });

  it("orders the meaningful lifecycle change before technical verification data", () => {
    const ordered = orderAuditDiff([
      { key: "auditHash", before: null, after: "hash", changed: true },
      { key: "submissionId", before: "id", after: "id", changed: false },
      { key: "status", before: "for_review", after: "completed", changed: true },
    ]);
    expect(ordered.map((row) => row.key)).toEqual(["status", "submissionId", "auditHash"]);
  });
});
