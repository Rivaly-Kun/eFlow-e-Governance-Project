import { describe, expect, it } from "vitest";
import {
  resolveNotificationDestination,
} from "../../src/app/features/notifications";
import type { Notification } from "../../src/app/services/notificationService";

function notification(
  patch: Partial<Notification>,
): Notification {
  return {
    id: "notification-1",
    type: "status_change",
    title: "Task updated",
    message: "Work changed.",
    read: false,
    createdAt: Date.now(),
    ...patch,
  };
}

describe("notification navigation", () => {
  it("opens the exact department task review queue", () => {
    expect(resolveNotificationDestination(notification({
      type: "approval_needed",
      title: "Task ready for review",
      message: 'Gabriel submitted "Prepare meeting" for review.',
      taskId: "task-1",
      taskTitle: "Prepare meeting",
      statusTo: "for_review",
    }), "depthead")).toMatchObject({
      section: "reviews",
      page: "For Review",
      label: "Open task review",
      intent: { kind: "task_review", taskId: "task-1" },
    });
  });

  it("opens subtask evidence in the leader review queue", () => {
    expect(resolveNotificationDestination(notification({
      type: "approval_needed",
      title: "Subtask evidence ready for review",
      message: 'Gabriel submitted "Prepare presentation".',
      taskId: "task-1",
      statusTo: "for_review",
    }), "employee")).toMatchObject({
      section: "reviews",
      page: "Leader Reviews",
      intent: {
        kind: "subtask_review",
        taskId: "task-1",
        entityLabel: "Prepare presentation",
      },
    });
  });

  it("opens an assigned employee subtask rather than the parent task board", () => {
    expect(resolveNotificationDestination(notification({
      type: "assignment",
      title: "New Subtask Assignment",
      message: 'Crisostomo assigned you to subtask "Prepare snacks" in "Meeting".',
      taskId: "task-2",
    }), "employee")).toMatchObject({
      section: "subtasks",
      page: "My Subtasks",
      label: "Open subtask",
      intent: { entityLabel: "Prepare snacks" },
    });
  });

  it("opens subtask progress updates in the lead workspace", () => {
    expect(resolveNotificationDestination(notification({
      title: "Subtask progress updated",
      message: 'Maria updated "Invite participants" to 40%.',
      taskId: "task-3",
    }), "depthead")).toMatchObject({
      section: "leading",
      page: "Leading Work",
      label: "Open leading task",
      intent: { kind: "leading_task", taskId: "task-3" },
    });
  });

  it("opens announcements and ordinary task decisions in their workspaces", () => {
    expect(resolveNotificationDestination(notification({
      type: "assignment",
      title: "New announcement",
      message: "Office closure advisory",
    }), "employee")).toMatchObject({
      section: "announcements",
      page: "Announcements",
    });

    expect(resolveNotificationDestination(notification({
      type: "completed",
      title: "Task approved",
      message: 'Your work on "Meeting report" was approved.',
      taskId: "task-4",
      taskTitle: "Meeting report",
      statusTo: "completed",
    }), "employee")).toMatchObject({
      section: "tasks",
      page: "My Tasks",
      label: "Open task",
      intent: { kind: "task", taskId: "task-4" },
    });
  });

  it("opens collaboration requests in Plans & Projects", () => {
    expect(resolveNotificationDestination(notification({
      type: "collaboration_request",
      title: "Inter-department collaboration request",
      message: 'LEDIPO requested review of "OCEDSIPP".',
      proposalId: "draft-1",
      entityType: "collaboration_draft",
    }), "depthead")).toMatchObject({
      section: "projects",
      page: "Projects",
      label: "Open collaboration review",
      intent: { kind: "collaboration", proposalId: "draft-1" },
    });
  });

  it("routes financial approvals into Reviews and employee decisions into petty cash", () => {
    expect(resolveNotificationDestination(notification({
      type: "petty_cash_request",
      title: "Petty-cash request awaiting approval",
      taskId: "task-5",
      taskTitle: "Prepare workshop",
    }), "depthead")).toMatchObject({
      section: "reviews",
      page: "For Review",
      label: "Open budget approval",
      intent: { kind: "budget", taskId: "task-5" },
    });

    expect(resolveNotificationDestination(notification({
      type: "petty_cash_decision",
      title: "Petty cash approved",
      taskId: "task-5",
    }), "employee")).toMatchObject({
      section: "budget",
      page: "Petty Cash & Expenses",
      label: "Open petty cash",
    });
  });
});
