// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectLifecycleLabel, ProjectScheduleLabel } from "../../src/app/features/projects/presentation/projectPresentation";
import { EflowVibeThemeProvider } from "../../src/app/shared/vibe";

describe("Phase 03 project presentation", () => {
  it("communicates lifecycle and schedule independently with accessible text", () => {
    render(<EflowVibeThemeProvider preference="light"><ProjectLifecycleLabel status="active" /><ProjectScheduleLabel health="overdue" /></EflowVibeThemeProvider>);
    expect(screen.getByLabelText("Project lifecycle: Active")).toBeTruthy();
    expect(screen.getByLabelText("Project schedule: Overdue")).toBeTruthy();
  });

  it("does not communicate an unscheduled project by color alone", () => {
    render(<EflowVibeThemeProvider preference="light"><ProjectScheduleLabel health="on_track" empty /></EflowVibeThemeProvider>);
    expect(screen.getByLabelText("Project schedule: no scheduled work")).toBeTruthy();
  });
});
