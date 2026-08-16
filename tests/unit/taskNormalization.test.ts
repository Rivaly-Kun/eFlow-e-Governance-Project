import { describe, expect, it } from "vitest";
import { uniqueValues } from "../../src/app/features/tasks/components/board/model";
import { rowToTask } from "../../src/app/features/tasks/services/taskMapper";

describe("task array normalization", () => {
  it("drops null, non-string, blank, and duplicate task member values", () => {
    const task = rowToTask({
      id: "task-1",
      title: "Task",
      team_member_ids: [null, " member-1 ", "", "member-1", 42],
      team_member_names: [null, " Cheryl ", "Cheryl"],
      tags: [" urgent ", null, "urgent"],
      recommended_employee_ids: [null, "member-2"],
      acceptance_criteria: [null, "Evidence attached"],
      dependency_ids: [null, "dependency-1"],
    });

    expect(task.teamMemberIds).toEqual(["member-1"]);
    expect(task.teamMemberNames).toEqual(["Cheryl"]);
    expect(task.tags).toEqual(["urgent"]);
    expect(task.recommendedEmployeeIds).toEqual(["member-2"]);
    expect(task.acceptanceCriteria).toEqual(["Evidence attached"]);
    expect(task.dependencyIds).toEqual(["dependency-1"]);
  });

  it("keeps board-level normalization safe for legacy nullable arrays", () => {
    expect(uniqueValues([null, " member-1 ", undefined, "member-1", 5])).toEqual(["member-1"]);
  });
});
