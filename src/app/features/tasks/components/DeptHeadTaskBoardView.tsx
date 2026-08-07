import type { ComponentProps } from "react";
import { MondayBoard } from "./board/MondayBoard";

/**
 * Department Head task-board presentation boundary.
 *
 * Data scoping remains in the Department Head adapter so the current
 * organization and permission behavior stay unchanged while the board UI is
 * owned by the tasks feature.
 */
export function DeptHeadTaskBoardView(
  props: ComponentProps<typeof MondayBoard>,
) {
  return (
    <div className="p-8 h-full bg-neutral-50">
      <div className="mb-3">
        <div className="text-[12px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
          Department Task Board
        </div>
      </div>
      <MondayBoard {...props} />
    </div>
  );
}
