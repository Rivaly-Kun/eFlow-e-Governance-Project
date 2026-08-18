// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import {
  getGuidedTourStorageKey,
  readGuidedTourProgress,
  writeGuidedTourProgress,
} from "../../src/app/features/guided-tours";

beforeEach(() => window.localStorage.clear());

describe("guided tour progress", () => {
  it("isolates first-login and resume state by authenticated user and role", () => {
    writeGuidedTourProgress("user-1", "employee", {
      welcomed: true,
      systemCompleted: false,
      completedPages: ["tasks:My Tasks"],
      voiceEnabled: true,
      activeTour: { kind: "system", index: 3, section: "tasks", page: "My Tasks" },
    });

    expect(readGuidedTourProgress("user-1", "employee").activeTour?.index).toBe(3);
    expect(readGuidedTourProgress("user-1", "employee").voiceEnabled).toBe(true);
    expect(readGuidedTourProgress("user-2", "employee").welcomed).toBe(false);
    expect(getGuidedTourStorageKey("user-1", "employee")).not.toBe(getGuidedTourStorageKey("user-1", "dept_head"));
  });

  it("recovers safely when stored progress is malformed", () => {
    window.localStorage.setItem(getGuidedTourStorageKey("user-1", "employee"), "not-json");
    expect(readGuidedTourProgress("user-1", "employee")).toEqual({
      welcomed: false,
      systemCompleted: false,
      completedPages: [],
      voiceEnabled: false,
    });
  });
});
