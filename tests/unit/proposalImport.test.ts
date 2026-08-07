import { describe, expect, it } from "vitest";
import { parseLlmResult } from "../../src/app/features/proposal-import/services/parseLlmResult";

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
});
