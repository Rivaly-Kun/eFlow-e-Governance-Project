import type { Employee } from "../../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type {
  ProposalDecompositionActivity,
  ProposalDecompositionProgram,
  ProposalDecompositionProject,
  ProposalDecompositionResult,
  ProposalDecompositionTask,
} from "../../types";
import {
  extractPartSections,
  generateTemplateSubtasks,
} from "./textAnalysis";
import { applyLocalRecommendations } from "./recommendations";

export const hasHierarchyContent = (result: ProposalDecompositionResult): boolean => {
  if (!result.programs || result.programs.length === 0) return false;

  // At least one program must have nested projects with activities
  return result.programs.some(
    (p) =>
      Array.isArray(p.projects) &&
      p.projects.length > 0 &&
      p.projects.some(
        (proj) => Array.isArray(proj.activities) && proj.activities.length > 0,
      ),
  );
};

type DecompositionCounts = {
  programs: number;
  projects: number;
  activities: number;
  tasks: number;
};

const countHierarchy = (result: ProposalDecompositionResult): DecompositionCounts => {
  let projects = 0;
  let activities = 0;
  let tasks = 0;

  result.programs.forEach((program) => {
    projects += program.projects.length;
    program.projects.forEach((project) => {
      activities += project.activities.length;
      project.activities.forEach((activity) => {
        tasks += activity.tasks.length;
      });
    });
  });

  return {
    programs: result.programs.length,
    projects,
    activities,
    tasks,
  };
};

export const shouldUseStructuredFallback = (
  result: ProposalDecompositionResult,
  proposalText: string,
): boolean => {
  const counts = countHierarchy(result);
  const longText = proposalText.length > 1500;
  const hasParts = /Part\s+\d+/i.test(proposalText);

  if (counts.tasks <= 1 && counts.activities <= 1) return true;
  if (hasParts && counts.tasks < 4) return true;
  if (longText && counts.tasks < 4) return true;

  return false;
};

export const buildStructuredDecomposition = (
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): ProposalDecompositionResult | null => {
  const parts = extractPartSections(proposalText);
  if (!parts) return null;

  const programs: ProposalDecompositionProgram[] = parts.map((part, index) => ({
    title: part.title || `Program ${index + 1}`,
    description: part.description,
    projects: [
      {
        title: `${part.title} Implementation`,
        description: part.description,
        activities: [
          {
            title: part.title,
            description: part.description,
            schedule: part.schedule,
            methodology: [],
            tasks: part.tasks,
          },
        ],
      },
    ],
  }));

  const result: ProposalDecompositionResult = {
    proposal: { title: proposalTitle, description: proposalText.substring(0, 200) },
    programs,
  };

  applyLocalRecommendations(result, employees, employeeNotes);
  return result;
};

// ─── Structural repair for flat LLM output ──────────────────────

export const repairFlatStructure = (
  result: ProposalDecompositionResult,
  rawObj: Record<string, unknown>,
): ProposalDecompositionResult => {
  if (!Array.isArray(result.programs) || result.programs.length === 0)
    return result;

  result.programs.forEach((program) => {
    // If program has no projects but top-level projects array exists, inject it
    if (!Array.isArray(program.projects) || program.projects.length === 0) {
      const topProjects = Array.isArray(rawObj.projects)
        ? rawObj.projects
        : [];
      if (topProjects.length > 0) {
        (program as ProposalDecompositionProgram).projects =
          topProjects as ProposalDecompositionProject[];
      }
    }

    (program.projects || []).forEach((project) => {
      // If project has no activities but top-level activities array exists, inject it
      if (
        !Array.isArray(project.activities) ||
        project.activities.length === 0
      ) {
        const topActivities = Array.isArray(rawObj.activities)
          ? rawObj.activities
          : [];
        if (topActivities.length > 0) {
          (project as ProposalDecompositionProject).activities =
            topActivities as ProposalDecompositionActivity[];
        }
      }

      // Similarly, inject tasks into activities if flat
      (project.activities || []).forEach((activity) => {
        if (!Array.isArray(activity.tasks) || activity.tasks.length === 0) {
          const topTasks = Array.isArray(rawObj.tasks) ? rawObj.tasks : [];
          if (topTasks.length > 0) {
            (activity as ProposalDecompositionActivity).tasks =
              topTasks as ProposalDecompositionTask[];
          }
        }
      });
    });
  });

  return result;
};

// ─── Fallback decomposition (local, no LLM) ─────────────────────

export const buildFallbackDecomposition = (
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): ProposalDecompositionResult => {
  // Extract key sentences to build a minimal hierarchy
  const sentences = proposalText
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 15);

  const programTitle = proposalTitle || "Imported Proposal";
  const projectTitle = sentences[0]?.substring(0, 80) || "Main Project";

  // Build 2–4 activities from text sections
  const chunkSize = Math.max(1, Math.ceil(sentences.length / 4));
  const activityGroups: string[][] = [];
  for (let i = 0; i < sentences.length && activityGroups.length < 4; i += chunkSize) {
    activityGroups.push(sentences.slice(i, i + chunkSize));
  }

  if (activityGroups.length === 0) {
    activityGroups.push(["General implementation"]);
  }

  const activities: ProposalDecompositionActivity[] = activityGroups.map(
    (group, idx) => {
      const actTitle =
        group[0]?.substring(0, 60) || `Activity ${idx + 1}`;
      const tasks: ProposalDecompositionTask[] = group
        .slice(0, 3)
        .map((sentence, tIdx) => ({
          title: sentence.substring(0, 80) || `Task ${tIdx + 1}`,
          description: sentence,
          estimatedDuration: "TBD",
          requiredSkills: [],
          priority: "medium" as const,
          subtasks: generateTemplateSubtasks(sentence, sentence),
        }));

      // Ensure at least 1 task per activity
      if (tasks.length === 0) {
        tasks.push({
          title: `Execute ${actTitle}`,
          description: `Complete the activity: ${actTitle}`,
          estimatedDuration: "TBD",
          requiredSkills: [],
          priority: "medium",
          subtasks: generateTemplateSubtasks(`Execute ${actTitle}`, `Complete the activity: ${actTitle}`),
        });
      }

      return {
        title: actTitle,
        description: group.join(". "),
        schedule: `Phase ${idx + 1}`,
        methodology: [],
        tasks,
      };
    },
  );

  const result: ProposalDecompositionResult = {
    proposal: { title: proposalTitle, description: proposalText.substring(0, 200) },
    programs: [
      {
        title: programTitle,
        description: proposalText.substring(0, 300),
        projects: [
          {
            title: projectTitle,
            description: proposalText.substring(0, 200),
            activities,
          },
        ],
      },
    ],
  };

  applyLocalRecommendations(result, employees, employeeNotes);

  return result;
};

// ─── LLM HTTP call helper ────────────────────────────────────────
// Extracted so both whole-document and per-part paths share one
// implementation instead of duplicating the fetch + timeout + parse.
