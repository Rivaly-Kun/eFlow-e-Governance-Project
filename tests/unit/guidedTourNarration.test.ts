// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { getTourNarrationText, selectTourNarrationVoice } from "../../src/app/features/guided-tours";

function voice(name: string, lang: string, isDefault = false): SpeechSynthesisVoice {
  return { name, lang, default: isDefault, localService: true, voiceURI: name };
}

describe("guided tour narration", () => {
  it("turns a step into concise spoken guidance", () => {
    expect(getTourNarrationText({
      id: "navigation",
      title: "Your navigation",
      description: "Move between  role-specific   workspaces.",
      target: "#sidebar",
    })).toBe("Your navigation. Move between role-specific workspaces.");
  });

  it("prefers a natural English voice over unrelated defaults", () => {
    const selected = selectTourNarrationVoice([
      voice("Default voice", "fr-FR", true),
      voice("Microsoft Aria Online (Natural)", "en-US"),
      voice("Basic English", "en-US"),
    ]);

    expect(selected?.name).toContain("Aria");
  });
});
