import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildCollaborationSnapshot,
  calculateCollaborationReadiness,
  defaultParticipationRole,
  getCollaborationCandidateEmployees,
  summarizeRevisionDiff,
  notifyCollaborationDraftsChanged,
  subscribeToLocalCollaborationDraftChanges,
  isExternalReviewParticipant,
  isActiveCollaborationDraft,
} from "../../src/app/features/interdepartment-collaboration";
import type { Organization } from "../../src/app/types";

const ownerOrg = "11111111-1111-4111-8111-111111111111";
const participantOrg = "22222222-2222-4222-8222-222222222222";
const boardOrg = "33333333-3333-4333-8333-333333333333";

function organization(id: string, org_type: Organization["org_type"]): Organization {
  return { id, name: org_type, slug: org_type, parent_id: null, path: id, org_type, description: "", head_user_id: null, assistant_head_user_id: null, is_active: true, created_at: "", updated_at: "" };
}

function snapshot() {
  return buildCollaborationSnapshot({
    title: "OCEDSIPP",
    ownerOrgId: ownerOrg,
    planningAnchor: new Date("2026-08-21T00:00:00Z").getTime(),
    organizations: [
      { orgId: ownerOrg, participationRole: "owner", staffingEnabled: true },
      { orgId: participantOrg, participationRole: "participant", staffingEnabled: true },
      { orgId: boardOrg, participationRole: "governance", staffingEnabled: false },
    ],
    tasks: [{
      key: "task-a", proposalTitle: "OCEDSIPP", proposalId: "proposal", programIdx: 0, projectIdx: 0,
      activityIdx: 0, taskIdx: 0, programId: "program", programTitle: "Program", projectId: "project",
      projectTitle: "Project", activityId: "activity", activityTitle: "Activity", activitySchedule: "Month 2",
      title: "Economic diagnostic", description: "Analyze the local economy", deadline: "Month 2", priority: "high",
      requiredSkills: ["data_analysis"], assignedMemberIds: ["employee-a"], leadMemberId: "employee-a",
      burnoutWarning: false, reasoning: "Skill fit", enabled: true, primaryOrgId: participantOrg,
    }],
  });
}

describe("inter-department collaboration domain", () => {
  it("invalidates the draft portfolio immediately after local mutations", () => {
    let refreshes = 0;
    const unsubscribe = subscribeToLocalCollaborationDraftChanges(() => { refreshes += 1; });
    notifyCollaborationDraftsChanged();
    unsubscribe();
    notifyCollaborationDraftsChanged();
    expect(refreshes).toBe(1);
  });

  it("removes published proposals from active draft and review lists", () => {
    expect(isActiveCollaborationDraft({ status: "ready_to_commit" })).toBe(true);
    expect(isActiveCollaborationDraft({ status: "committed" })).toBe(false);
    expect(isActiveCollaborationDraft({ status: "archived" })).toBe(false);
  });

  it("keeps governance out of staffing and expands only approved pools", () => {
    const employees = [
      { id: "a", name: "Owner", jobTitle: "", jobDescription: "", currentWorkload: 0, department: ownerOrg },
      { id: "b", name: "Participant", jobTitle: "", jobDescription: "", currentWorkload: 0, department: participantOrg },
      { id: "c", name: "Board", jobTitle: "", jobDescription: "", currentWorkload: 0, department: boardOrg },
    ];
    expect(getCollaborationCandidateEmployees(employees, snapshot().organizations).map((item) => item.id)).toEqual(["a", "b"]);
    expect(defaultParticipationRole(organization(boardOrg, "board"))).toBe("governance");
    expect(defaultParticipationRole(organization(participantOrg, "department"))).toBe("participant");
  });

  it("never presents the owning organization as its own reviewer", () => {
    const participants = snapshot().organizations.map((item) => ({ draftId: "draft", orgId: item.orgId, participationRole: item.participationRole, staffingEnabled: item.staffingEnabled }));
    expect(participants.filter(isExternalReviewParticipant).map((item) => item.orgId)).toEqual([participantOrg, boardOrg]);
  });

  it("normalizes relative schedules and explicit responsibility", () => {
    const result = snapshot();
    expect(result.tasks[0].deadline).toBe("2026-10-21");
    expect(result.tasks[0].activityPrimaryOrgId).toBe(participantOrg);
    expect(result.tasks[0].primaryOrgId).toBe(participantOrg);
  });

  it("makes every task inherit its activity responsibility", () => {
    const base = snapshot();
    const inherited = buildCollaborationSnapshot({
      title: base.title,
      ownerOrgId: ownerOrg,
      organizations: base.organizations,
      tasks: base.tasks.map((task) => ({
        ...task,
        activityPrimaryOrgId: ownerOrg,
        activitySupportingOrgIds: [participantOrg],
        primaryOrgId: participantOrg,
        supportingOrgIds: [boardOrg],
      })),
    });
    expect(inherited.tasks[0].primaryOrgId).toBe(ownerOrg);
    expect(inherited.tasks[0].supportingOrgIds).toEqual([participantOrg]);
  });

  it("invalidates old-revision approvals and blocks open changes", () => {
    const participants = snapshot().organizations.map((item) => ({ draftId: "draft", orgId: item.orgId, participationRole: item.participationRole, staffingEnabled: item.staffingEnabled }));
    const approvals = participants.map((item, index) => ({ id: String(index), draftId: "draft", revisionId: index === 1 ? "old" : "current", organizationId: item.orgId, decision: "approved" as const, approvedBy: "head", createdAt: 1 }));
    expect(calculateCollaborationReadiness({ currentRevisionId: "current", participants, approvals, changeRequests: [] })).toMatchObject({ ready: false, approvedCount: 1, requiredCount: 2 });
    const currentApprovals = participants.map((item, index) => ({ ...approvals[index], revisionId: "current" }));
    expect(calculateCollaborationReadiness({ currentRevisionId: "current", participants, approvals: currentApprovals, changeRequests: [{ id: "change", draftId: "draft", revisionId: "current", requestedBy: "head", requestingOrgId: participantOrg, targetType: "task", targetKey: "task-a", reason: "Replace staff", proposedChange: {}, status: "open", createdAt: 1 }] }).ready).toBe(false);
  });

  it("summarizes substantive staffing revisions", () => {
    const before = snapshot();
    const after = { ...before, tasks: before.tasks.map((task) => ({ ...task, assignedMemberIds: ["employee-b"], leadMemberId: "employee-b" })) };
    expect(summarizeRevisionDiff(before, after)).toContain("Tasks, schedules, responsibilities, or staffing changed");
  });
});

describe("collaboration migration contracts", () => {
  const migrationNames = ["organizations", "drafts", "security", "runtime", "commit", "owner_auto_accept"];
  const migrations = migrationNames.map((name, index) => readFileSync(`supabase/migrations/2026082100000${index}_collaboration_${name}.sql`, "utf8")).join("\n");
  it("keeps view and mutation authority separate", () => {
    expect(migrations).toContain("can_see_collaboration_project");
    expect(migrations).toContain("can_manage_collaboration_project");
    expect(migrations).toContain("public.auth_role(caller_id) <> 'super_admin'");
  });
  it("uses one atomic commit function and guarded governance routing", () => {
    expect(migrations).toContain("commit_collaboration_draft");
    expect(migrations).toContain("review_route_mode = 'governance'");
    expect(migrations).toContain("Task Leader cannot review their own Task");
    expect(migrations).toContain("save_collaboration_staffing_revision");
    expect(migrations).toContain("autosave_collaboration_draft");
  });
  it("auto-accepts the owner organization and blocks manual owner decisions", () => {
    expect(migrations).toContain("auto_accept_collaboration_owner");
    expect(migrations).toContain("guard_collaboration_owner_decision");
    expect(migrations).toContain("participating.participation_role <> 'owner'");
  });
  it("keeps AI staffing owner-only and source PDF changes audited", () => {
    const backend = readFileSync("server/services/collaboration_ai.py", "utf8");
    expect(backend).toContain("Only the owning office may request AI staffing recommendations.");
    expect(backend).toContain('draft.get("status") != "draft"');
    expect(migrations).toContain("collaboration.source_document_attached");
  });
});
