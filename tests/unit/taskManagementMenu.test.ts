// @vitest-environment jsdom

import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskManagementMenu } from "../../src/app/features/tasks/components/board/TaskManagementMenu";
import type { Task } from "../../src/app/features/tasks";

afterEach(cleanup);

function task(status: Task["status"] = "in_progress"): Task {
  return {
    id: "task-1",
    title: "Prepare meeting",
    description: "",
    status,
    priority: "medium",
    tags: [],
  } as Task;
}

describe("task management overflow menu", () => {
  it("keeps management actions in the overflow and closes after selection", () => {
    const onEdit = vi.fn();
    render(createElement(TaskManagementMenu, {
      task: task(),
      onEdit,
      onEditTeam: vi.fn(),
      onArchive: vi.fn(),
      onCancel: vi.fn(),
      onDelete: vi.fn(),
    }));

    fireEvent.click(screen.getByRole("button", { name: "Manage Prepare meeting" }));
    expect(screen.getByText("Edit task details")).toBeTruthy();
    expect(screen.getByText("Edit team and lead")).toBeTruthy();
    expect(screen.getByText("Archive task")).toBeTruthy();
    expect(screen.getByText("Delete task")).toBeTruthy();

    fireEvent.click(screen.getByText("Edit task details"));
    expect(onEdit).toHaveBeenCalledOnce();
    expect(screen.queryByText("Archive task")).toBeNull();
  });

  it("offers reopening through the menu for completed work", () => {
    render(createElement(TaskManagementMenu, {
      task: task("completed"),
      onReopen: vi.fn(),
      onArchive: vi.fn(),
    }));
    fireEvent.click(screen.getByRole("button", { name: "Manage Prepare meeting" }));
    expect(screen.getByText("Reopen task")).toBeTruthy();
    expect(screen.queryByText("Cancel task")).toBeNull();
  });
});
