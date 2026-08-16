import { describe, expect, it } from "vitest";
import {
  filterLeadershipCandidates,
  resolveOrganizationLeadershipReviewer,
} from "../../src/app/features/organization/selectors";
import type { Organization, UserProfile } from "../../src/app/types";

const organization: Organization = {
  id: "org-1",
  name: "Engineering Office",
  slug: "engineering",
  parent_id: null,
  path: "engineering",
  org_type: "department",
  description: "",
  head_user_id: "head-1",
  assistant_head_user_id: "assistant-1",
  is_active: true,
  created_at: "2026-08-14T00:00:00.000Z",
  updated_at: "2026-08-14T00:00:00.000Z",
};

describe("organization leadership review routing", () => {
  it("routes Head-led work to the Assistant Head", () => {
    expect(resolveOrganizationLeadershipReviewer(organization, "head-1")).toEqual({
      reviewerId: "assistant-1",
      reviewerRole: "assistant_head",
    });
  });

  it("routes Assistant-Head-led work to the Head", () => {
    expect(resolveOrganizationLeadershipReviewer(organization, "assistant-1")).toEqual({
      reviewerId: "head-1",
      reviewerRole: "head",
    });
  });

  it("preserves normal reviewer routing for other task leads", () => {
    expect(resolveOrganizationLeadershipReviewer(organization, "employee-1")).toBeNull();
  });

  it("finds leadership candidates by person details or organization", () => {
    const candidates = [
      {
        id: "candidate-1",
        full_name: "Cheryl Gallo",
        email: "cheryl@ormoc.gov.ph",
        employee_id: "EMP-104",
        role: "employee",
        org_id: "org-1",
      },
      {
        id: "candidate-2",
        full_name: "Raul Cam",
        email: "raul@ormoc.gov.ph",
        employee_id: "EMP-222",
        role: "employee",
        org_id: null,
      },
    ] as UserProfile[];

    expect(filterLeadershipCandidates(candidates, "engineering", [organization]))
      .toMatchObject([{ id: "candidate-1" }]);
    expect(filterLeadershipCandidates(candidates, "EMP-222", [organization]))
      .toMatchObject([{ id: "candidate-2" }]);
  });
});
