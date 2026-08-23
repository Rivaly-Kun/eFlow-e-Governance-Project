import { describe, expect, it } from "vitest";
import { buildCommittedProposalDeliverySummary } from "../../src/app/features/interdepartment-collaboration";
import type { Project } from "../../src/app/features/projects";
import type { Task } from "../../src/app/features/tasks";

const project = (status: Project["status"] = "active"): Project => ({
  id: "project-1",
  title: "Project 1",
  description: "Committed delivery",
  sourceCollaborationDraftId: "draft-1",
  status,
  priority: "medium",
  createdAt: 1,
  updatedAt: 1,
});

const task = (id: string, status: Task["status"], percentComplete = 0): Task => ({
  id,
  title: `Task ${id}`,
  status,
  percentComplete,
  linkedProjectId: "project-1",
  sourceCollaborationDraftId: "draft-1",
  createdAt: 1,
  updatedAt: 1,
});

describe("committed proposal delivery lifecycle", () => {
  it("shows continuous operational progress and pending governance reviews", () => {
    const tasks = [
      task("approved", "completed", 100),
      task("review", "for_review", 100),
      task("active", "in_progress", 40),
    ];
    const summary = buildCommittedProposalDeliverySummary("draft-1", [project()], tasks);

    expect(summary.stage).toBe("awaiting_review");
    expect(summary.completedTaskCount).toBe(1);
    expect(summary.awaitingReviewCount).toBe(1);
    expect(summary.progress).toBe(80);
  });

  it("advances from task completion to project completion and archival", () => {
    const approvedTasks = [task("one", "completed", 100), task("two", "completed", 100)];
    expect(buildCommittedProposalDeliverySummary("draft-1", [project("active")], approvedTasks)).toMatchObject({
      stage: "ready_to_complete",
      readyToComplete: true,
      progress: 100,
    });
    expect(buildCommittedProposalDeliverySummary("draft-1", [project("completed")], approvedTasks)).toMatchObject({
      stage: "ready_to_archive",
      readyToArchive: true,
    });
    expect(buildCommittedProposalDeliverySummary("draft-1", [project("archived")], approvedTasks)).toMatchObject({
      stage: "archived",
      archived: true,
    });
  });

  it("does not mix another proposal's projects or tasks into the totals", () => {
    const otherProject = { ...project(), id: "project-2", sourceCollaborationDraftId: "draft-2" };
    const otherTask = { ...task("other", "completed", 100), linkedProjectId: "project-2", sourceCollaborationDraftId: "draft-2" };
    const summary = buildCommittedProposalDeliverySummary("draft-1", [project(), otherProject], [task("mine", "in_progress", 25), otherTask]);

    expect(summary.projectCount).toBe(1);
    expect(summary.taskCount).toBe(1);
    expect(summary.progress).toBe(25);
  });
});
