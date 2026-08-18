import { describe, expect, it } from "vitest";

import { resolvePermissions } from "../../src/app/services/permissionService";
import {
  monthlyContributionFixture,
  orderedProjectWorkflowFixture,
  sameRoleAccessFixture,
} from "../fixtures/sirGersonBaseline";

describe("Sir Gerson implementation baseline", () => {
  it("keeps individual overrides isolated between users with the same role", () => {
    const [standardHead, exceptionalHead] = sameRoleAccessFixture.heads;
    const standard = resolvePermissions(
      sameRoleAccessFixture.role,
      [...sameRoleAccessFixture.rolePermissions],
      [...standardHead.overrides],
    );
    const exceptional = resolvePermissions(
      sameRoleAccessFixture.role,
      [...sameRoleAccessFixture.rolePermissions],
      [...exceptionalHead.overrides],
    );

    expect(standard.has("reports.export")).toBe(true);
    expect(standard.has("audit.read")).toBe(false);
    expect(exceptional.has("reports.export")).toBe(false);
    expect(exceptional.has("audit.read")).toBe(true);
  });

  it("records one operational project relationship and contiguous subtask order", () => {
    const workflow = orderedProjectWorkflowFixture;
    expect(workflow.tasks[0].linkedProjectId).toBe(workflow.projectId);
    expect(workflow.subtasks.map((subtask) => subtask.position)).toEqual([0, 1, 2]);
    expect(new Set(workflow.subtasks.map((subtask) => subtask.id)).size).toBe(workflow.subtasks.length);
  });

  it("pins productivity fixtures to Manila month boundaries", () => {
    expect(monthlyContributionFixture.timezone).toBe("Asia/Manila");
    expect(monthlyContributionFixture.periods).toEqual(["2026-07", "2026-08"]);
  });
});

