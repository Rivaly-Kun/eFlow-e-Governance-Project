import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("subtask execution dependency migration", () => {
  it("enforces ordered work in the database and preserves a standalone escape hatch", () => {
    const sql = readFileSync(resolve(
      process.cwd(),
      "supabase/migrations/20260819000004_subtask_execution_dependencies.sql",
    ), "utf8");
    expect(sql).toContain("add column if not exists is_standalone boolean not null default false");
    expect(sql).toContain("guard_subtask_execution_dependencies");
    expect(sql).toContain("prerequisite.position < new.position");
    expect(sql).toContain("prerequisite.is_standalone = false");
    expect(sql).toContain("Complete Step %");
  });
});
