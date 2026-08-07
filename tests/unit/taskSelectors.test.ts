import { describe, expect, it } from "vitest";
import {
  completionRate,
  isActive,
  isOverdue,
  isTaskLead,
  unassignedTasks,
} from "../../src/app/services/taskSelectors";

const task = (overrides: Record<string, unknown> = {}) => ({
  id: "task-1",
  status: "todo",
  assigneeId: "employee-1",
  teamMemberIds: ["employee-1"],
  dueDate: "2026-01-01",
  updatedAt: Date.UTC(2026, 0, 1),
  ...overrides,
});

describe("task selector compatibility", () => {
  it("does not classify cancelled work as active", () => {
    expect(isActive(task({ status: "cancelled" }) as never)).toBe(false);
  });
  it("uses lifecycle state and real dates for overdue work", () => {
    expect(isOverdue(task() as never, Date.UTC(2026, 1, 1))).toBe(true);
    expect(isOverdue(task({ dueDate: "Phase 1" }) as never, Date.UTC(2026, 1, 1))).toBe(false);
    expect(isOverdue(task({ status: "completed" }) as never, Date.UTC(2026, 1, 1))).toBe(false);
  });

  it("keeps lead fallback and unassigned semantics stable", () => {
    expect(isTaskLead(task() as never, "employee-1")).toBe(true);
    expect(isTaskLead(task({ recommendationLeadId: "employee-2" }) as never, "employee-1")).toBe(false);
    expect(unassignedTasks([task({ assigneeId: null }), task() ] as never)).toHaveLength(1);
  });

  it("excludes archived work from completion denominators", () => {
    expect(completionRate([
      task({ status: "completed" }),
      task({ id: "archived", status: "completed", archivedAt: Date.now() }),
      task({ id: "open" }),
    ] as never)).toEqual({ completed: 1, total: 2, rate: 50 });
  });
});
