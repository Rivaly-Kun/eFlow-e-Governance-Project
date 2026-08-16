// @vitest-environment jsdom

import { createElement } from "react";
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ContextMenu } from "../../src/app/features/organization/components/org-tree/ContextMenu";

describe("organization context menu", () => {
  it("closes when the user left-clicks outside the menu", () => {
    const onClose = vi.fn();
    render(
      createElement(ContextMenu, {
        menu: { x: 10, y: 10, orgId: "org-1" },
        onClose,
        onAddChild: vi.fn(),
        onEdit: vi.fn(),
        onAssignHead: vi.fn(),
        onDelete: vi.fn(),
        canDelete: true,
      }),
    );

    fireEvent.pointerDown(document.body, { button: 0 });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
