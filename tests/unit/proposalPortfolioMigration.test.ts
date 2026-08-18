import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(
  new URL("../../supabase/migrations/20260819000005_proposal_portfolios_and_unique_leadership.sql", import.meta.url),
  "utf8",
);

describe("proposal portfolio and leadership migration", () => {
  it("persists proposal and program identity on operational projects", () => {
    expect(sql).toContain("add column if not exists proposal_id text");
    expect(sql).toContain("add column if not exists program_id text");
    expect(sql).toContain("source_file_name");
    expect(sql).toContain("projects_proposal_scope_idx");
  });

  it("enforces one active Head and Assistant Head per organization", () => {
    expect(sql).toContain("profiles_one_active_head_per_org");
    expect(sql).toContain("profiles_one_active_assistant_per_org");
    expect(sql).toContain("guard_profile_leadership_integrity");
  });

  it("limits management project scope to the caller's exact organization", () => {
    expect(sql).toContain("target_org = caller_profile.org_id");
    expect(sql).toContain("project_org = caller_profile.org_id");
    expect(sql).toContain("projects_exact_scope_read");
  });
});
