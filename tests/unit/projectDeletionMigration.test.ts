import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../supabase/migrations/20260819000003_fix_project_deletion_task_links.sql", import.meta.url),
  "utf8",
);

describe("permanent project deletion migration", () => {
  it("clears project and milestone task links in one update before deleting the project", () => {
    const clearLinksAt = sql.indexOf("update public.tasks");
    const projectDeleteAt = sql.indexOf("delete from public.projects");

    expect(clearLinksAt).toBeGreaterThan(-1);
    expect(sql).toContain("set linked_project_id = null,\n      milestone_id = null");
    expect(projectDeleteAt).toBeGreaterThan(clearLinksAt);
  });
});
