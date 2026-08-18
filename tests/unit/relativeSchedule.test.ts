import { describe, expect, it } from "vitest";
import {
  parseCalendarDate,
  relativeScheduleEndMonth,
  resolveScheduleDateInput,
} from "../../src/app/shared/scheduling/relativeSchedule";
import { parseDueDate } from "../../src/app/features/tasks/selectors/lifecycle";
import type { Task } from "../../src/app/features/tasks/taskTypes";

const anchor = new Date(2026, 7, 19).getTime();

describe("proposal-relative schedules", () => {
  it("uses the final month of a relative range", () => {
    expect(relativeScheduleEndMonth("Month 1")).toBe(1);
    expect(relativeScheduleEndMonth("Month 1-2")).toBe(2);
    expect(relativeScheduleEndMonth("Month 1 - 2")).toBe(2);
  });

  it("anchors relative months to the plan commit date", () => {
    expect(resolveScheduleDateInput("Month 1", anchor)).toBe("2026-09-19");
    expect(resolveScheduleDateInput("Month 1-2", anchor)).toBe("2026-10-19");
    expect(resolveScheduleDateInput("Month 6", anchor)).toBe("2027-02-19");
  });

  it("never lets Month labels become dates in 2001", () => {
    expect(parseCalendarDate("Month 1")).toBeNull();
    const task = {
      id: "task-1",
      title: "Relative task",
      status: "todo",
      createdAt: anchor,
      updatedAt: anchor,
      dueDate: "Month 1",
      activitySchedule: "Month 1",
    } as Task;
    expect(new Date(parseDueDate(task) || 0).getFullYear()).toBe(2026);
  });

  it("keeps explicit calendar dates unchanged", () => {
    expect(resolveScheduleDateInput("2026-08-25", anchor)).toBe("2026-08-25");
  });
});
