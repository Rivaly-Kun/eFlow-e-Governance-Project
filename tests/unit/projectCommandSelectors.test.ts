import { describe, expect, it } from "vitest";
import { buildProjectActivity, buildProjectCommandMetrics, buildProjectPortfolioSummary } from "../../src/app/features/projects/selectors/projectCommandSelectors";
import type { Project } from "../../src/app/features/projects/services/types";
import type { Task } from "../../src/app/features/tasks";
import type { TeamWorkflowFacts } from "../../src/app/features/team-management";

const now = new Date("2026-08-19T00:00:00+08:00").getTime();
const project: Project = { id: "project", title: "Flood control", description: "", status: "active", priority: "high", targetDate: "2026-08-30", createdAt: now - 1000, updatedAt: now - 500 };
const tasks: Task[] = [
  { id: "a", linkedProjectId: "project", title: "Survey", status: "completed", percentComplete: 100, createdAt: now - 5000, updatedAt: now - 3000 },
  { id: "b", linkedProjectId: "project", title: "Design", status: "for_review", percentComplete: 80, dueDate: "2026-08-18", assigneeId: "lead", createdAt: now - 4000, updatedAt: now - 2000 },
];
const facts: TeamWorkflowFacts = {
  subtasks: [], progress: [], statusHistory: [], evidence: [],
  submissions: [{ id: "s", kind: "task", taskId: "b", version: 1, submitterId: "lead", submitterName: "Lead", status: "pending", submittedAt: now - 3600000 }],
};

describe("Project Command Workspace selectors", () => {
  it("derives weighted progress and review health from canonical task data", () => {
    const metrics = buildProjectCommandMetrics(project, tasks, [], facts, [{ id: "overdue:b", kind: "overdue", severity: "critical", title: "Overdue", detail: "", taskId: "b", taskTitle: "Design", employeeIds: [] }], now);
    expect(metrics.progress).toBe(90);
    expect(metrics.scheduleHealth).toBe("overdue");
    expect(metrics.awaitingReview).toBe(1);
    expect(metrics.activeLeadIds).toEqual(["lead"]);
  });

  it("uses the same linked tasks for portfolio card summaries", () => {
    const summary = buildProjectPortfolioSummary(project, tasks, now);
    expect(summary.total).toBe(2);
    expect(summary.completed).toBe(1);
    expect(summary.awaitingReview).toBe(1);
    expect(summary.health).toBe("overdue");
    expect(summary.isEmpty).toBe(false);
  });

  it("marks a retained project container with no linked work as empty", () => {
    const summary = buildProjectPortfolioSummary(project, [], now);
    expect(summary.total).toBe(0);
    expect(summary.isEmpty).toBe(true);
  });

  it("merges audit and workflow events into one newest-first timeline", () => {
    const rows = buildProjectActivity(facts, [{ id: "audit", kind: "project", title: "project updated", detail: "", occurredAt: now }]);
    expect(rows.map((row) => row.id)).toEqual(["audit", "submission:s"]);
  });
});
