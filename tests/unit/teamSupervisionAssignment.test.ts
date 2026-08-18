import { describe, expect, it } from "vitest";
import { buildTaskReplacementPlan } from "../../src/app/features/team-management/services/teamSupervisionActions";
import type { Task } from "../../src/app/services/taskService";

const baseTask: Task = {
  id: "task-1",
  title: "Prepare report",
  status: "in_progress",
  assigneeId: "lead-1",
  assigneeName: "Lead One",
  teamMemberIds: ["lead-1", "member-1"],
  teamMemberNames: ["Lead One", "Member One"],
  createdAt: 1,
  updatedAt: 1,
};

describe("team supervision assignment changes", () => {
  it("changes the task lead only when the outgoing person is the lead", () => {
    const plan = buildTaskReplacementPlan(baseTask, "lead-1", { id: "replacement-1", name: "Replacement" });
    expect(plan).toMatchObject({ mode: "lead", assigneeId: "replacement-1", assigneeName: "Replacement" });
    expect(plan.assignment.teamMemberIds).toEqual(["replacement-1", "member-1"]);
  });

  it("replaces a team member without silently changing the lead", () => {
    const plan = buildTaskReplacementPlan(baseTask, "member-1", { id: "replacement-1", name: "Replacement" });
    expect(plan).toMatchObject({ mode: "member", assigneeId: "lead-1", assigneeName: "Lead One" });
    expect(plan.assignment.teamMemberIds).toEqual(["lead-1", "replacement-1"]);
  });
});
