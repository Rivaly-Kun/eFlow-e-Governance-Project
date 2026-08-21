import { describe, expect, it } from "vitest";
import {
  buildProposalPortfolioGroups,
  projectMatchesProposalQuery,
  resolveProjectHierarchyIdentity,
} from "../../src/app/features/projects";
import type { Project } from "../../src/app/features/projects";
import type { Task } from "../../src/app/features/tasks";

function project(id: string, orgId: string, title: string, description = ""): Project {
  return {
    id,
    orgId,
    title,
    description,
    status: "active",
    priority: "medium",
    createdAt: 1,
    updatedAt: 1,
  };
}

function task(id: string, linkedProjectId: string, orgId: string, programId: string, programTitle: string): Task {
  return {
    id,
    linkedProjectId,
    orgId,
    title: `Task ${id}`,
    status: "todo",
    proposalId: "ocedsipp",
    proposalTitle: "OCEDSIPP Final Version",
    programId,
    programTitle,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("proposal-grouped project portfolio", () => {
  it("groups projects by proposal and organization, then nests them by program", () => {
    const projects = [
      project("project-1", "ledipo", "Inception"),
      project("project-2", "ledipo", "Benchmarking"),
      project("project-3", "cpdo", "CPDO Inception"),
    ];
    const tasks = [
      task("task-1", "project-1", "ledipo", "program-1", "Planning Framework"),
      task("task-2", "project-2", "ledipo", "program-2", "Research and Benchmarking"),
      task("task-3", "project-3", "cpdo", "program-1", "Planning Framework"),
    ];

    const groups = buildProposalPortfolioGroups(projects, tasks);

    expect(groups).toHaveLength(2);
    const ledipo = groups.find((group) => group.orgId === "ledipo");
    expect(ledipo?.title).toBe("OCEDSIPP Final Version");
    expect(ledipo?.projectCount).toBe(2);
    expect(ledipo?.programs.map((program) => program.title)).toEqual([
      "Planning Framework",
      "Research and Benchmarking",
    ]);
  });

  it("keeps proposal programs in source-plan order even when projects arrive newest-first", () => {
    const projects = [
      project("operational-final", "ledipo", "Final Outputs"),
      project("operational-inception", "ledipo", "Inception"),
      project("operational-analysis", "ledipo", "Situational Analysis"),
    ];
    projects[0].programId = "ocedsipp-program-8-final-outputs";
    projects[0].programTitle = "Final Outputs";
    projects[0].proposalId = "ocedsipp";
    projects[0].proposalTitle = "OCEDSIPP";
    projects[0].targetDate = "2027-01-31";
    projects[1].programId = "ocedsipp-program-1-inception";
    projects[1].programTitle = "Inception";
    projects[1].proposalId = "ocedsipp";
    projects[1].proposalTitle = "OCEDSIPP";
    projects[1].targetDate = "2026-09-30";
    projects[2].programId = "ocedsipp-program-2-situational-analysis";
    projects[2].programTitle = "Situational Analysis";
    projects[2].proposalId = "ocedsipp";
    projects[2].proposalTitle = "OCEDSIPP";
    projects[2].targetDate = "2026-10-31";

    expect(buildProposalPortfolioGroups(projects, [])[0].programs.map((program) => program.title)).toEqual([
      "Inception",
      "Situational Analysis",
      "Final Outputs",
    ]);
    expect(buildProposalPortfolioGroups(projects, [])[0].targetDate).toBe("2027-01-31");
  });

  it("keeps an empty imported project inside its source proposal using persisted compatibility metadata", () => {
    const imported = project(
      "empty-project",
      "ledipo",
      "Final Outputs and Adoption",
      "Imported via proposal: Project-Proposal-OCEDSIPP-Final-Version",
    );

    expect(resolveProjectHierarchyIdentity(imported, [])).toMatchObject({
      proposalTitle: "Project-Proposal-OCEDSIPP-Final-Version",
      sourceType: "ai_pdf",
      sourceFileName: "Project-Proposal-OCEDSIPP-Final-Version.pdf",
    });
    expect(buildProposalPortfolioGroups([imported], [])[0]).toMatchObject({
      projectCount: 1,
      taskCount: 0,
    });
  });

  it("searches proposal and program names as well as project titles", () => {
    const operationalProject = project("project-1", "ledipo", "Inception");
    const tasks = [task("task-1", "project-1", "ledipo", "program-1", "Strategic Planning")];

    expect(projectMatchesProposalQuery(operationalProject, tasks, "ocedsipp")).toBe(true);
    expect(projectMatchesProposalQuery(operationalProject, tasks, "strategic planning")).toBe(true);
    expect(projectMatchesProposalQuery(operationalProject, tasks, "finance payroll")).toBe(false);
  });
});
