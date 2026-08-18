// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AssignmentExceptionNote } from "../../src/app/features/proposal-import/components/AssignmentExceptionNote";

describe("capacity-aware proposal assignment note", () => {
  it("shows the bypassed specialist and selected alternative with Team Intelligence signals", () => {
    render(createElement(AssignmentExceptionNote, {
      exception: {
        bypassedEmployeeId: "cheryl",
        bypassedEmployeeName: "Cheryl",
        selectedEmployeeId: "gabriel",
        selectedEmployeeName: "Gabriel",
        bypassedWorkloadSignal: 72,
        selectedWorkloadSignal: 21,
        bypassedSkillMatch: 94,
        selectedSkillMatch: 88,
        severity: "elevated",
        message: "Cheryl is the strongest skill match, but Team Intelligence reports elevated workload. Gabriel was assigned as the closest qualified alternative.",
      },
    }));

    const note = screen.getByRole("note", { name: "Capacity-aware assignment exception" });
    expect(note.textContent).toContain("Cheryl · strongest match 94%");
    expect(note.textContent).toContain("Gabriel · assigned 88%");
    expect(note.textContent).toContain("72/100");
    expect(note.textContent).toContain("21/100");
  });
});
