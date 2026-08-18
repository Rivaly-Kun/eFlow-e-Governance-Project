// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamCompositionNote } from "../../src/app/features/proposal-import/components/TeamCompositionNote";

describe("proposal team composition note", () => {
  it("explains team size and each member's contribution", () => {
    render(createElement(TeamCompositionNote, {
      composition: {
        mode: "team",
        selectedCount: 2,
        eligibleCount: 8,
        rationale: "Two people are required for facilitation and documentation.",
        memberReasons: [
          { employeeId: "maria", employeeName: "Maria", role: "lead", contribution: "Covers facilitation" },
          { employeeId: "cris", employeeName: "Crisostomo", role: "support", contribution: "Covers documentation" },
        ],
      },
    }));

    const note = screen.getByRole("note", { name: "AI team composition" });
    expect(note.textContent).toContain("2-person delivery team");
    expect(note.textContent).toContain("2 of 8 eligible selected");
    expect(note.textContent).toContain("Maria · Lead");
    expect(note.textContent).toContain("Crisostomo · Support");
  });
});
