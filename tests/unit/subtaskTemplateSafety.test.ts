import { describe, expect, it } from "vitest";
import { getSubtaskReplacementBlocker } from "../../src/app/features/work-templates";
import type { Subtask } from "../../src/app/features/subtasks";

function subtask(overrides: Partial<Subtask> = {}): Subtask {
  return {
    id: "subtask-1",
    taskId: "task-1",
    title: "Prepare presentation",
    isCompleted: false,
    assignedToIds: [],
    position: 0,
    source: "manual",
    status: "todo",
    percentComplete: 0,
    ...overrides,
  } as Subtask;
}

describe("subtask template replacement safety", () => {
  it("allows replacement when every existing subtask is untouched", () => {
    expect(getSubtaskReplacementBlocker([subtask(), subtask({ id: "subtask-2" })])).toBeNull();
  });

  it.each([
    ["progress", { status: "in_progress", percentComplete: 20 }],
    ["review", { status: "for_review", percentComplete: 100, latestSubmissionId: "submission-1" }],
    ["completion", { status: "completed", percentComplete: 100, isCompleted: true }],
  ])("blocks replacement after %s has started", (_label, changes) => {
    expect(getSubtaskReplacementBlocker([subtask(changes as Partial<Subtask>)])).toContain(
      "already in progress or has review history",
    );
  });
});
