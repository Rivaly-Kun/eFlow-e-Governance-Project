import { describe, expect, it, vi } from "vitest";
import { parseLlmResult } from "../../src/app/features/proposal-import/services/parseLlmResult";

const { callDecompositionLLM } = vi.hoisted(() => ({
  callDecompositionLLM: vi.fn(),
}));

vi.mock(
  "../../src/app/features/proposal-import/services/decomposition/llmClient",
  () => ({ callDecompositionLLM }),
);

import { decomposeWholeDocument } from "../../src/app/features/proposal-import/services/decomposition/wholeDocumentDecomposition";

describe("proposal LLM response parsing", () => {
  it("accepts fenced JSON and removes model thinking text", () => {
    const fence = String.fromCharCode(96).repeat(3);
    const result = parseLlmResult(
      "<think>internal reasoning</think>" +
        fence +
        "json\n" +
        JSON.stringify({
          proposal: { title: "Roadmap", description: "Plan" },
          programs: [{ title: "Program", projects: [] }],
        }) +
        "\n" +
        fence,
    );

    expect(result).toEqual({
      proposal: { title: "Roadmap", description: "Plan" },
      programs: [{ title: "Program", projects: [] }],
    });
  });

  it("rejects text without a JSON object", () => {
    expect(parseLlmResult("No structured answer returned")).toBeNull();
  });

  it("does not create a local proposal when DeepSeek is unavailable", async () => {
    callDecompositionLLM.mockRejectedValueOnce(new Error("AI service unavailable"));

    await expect(
      decomposeWholeDocument("Proposal content", "Roadmap"),
    ).rejects.toThrow("AI service unavailable");
  });

  it("rejects malformed DeepSeek output instead of fabricating a hierarchy", async () => {
    callDecompositionLLM.mockResolvedValueOnce("not JSON");

    await expect(
      decomposeWholeDocument("Proposal content", "Roadmap"),
    ).rejects.toThrow("could not be parsed into a proposal hierarchy");
  });
});
