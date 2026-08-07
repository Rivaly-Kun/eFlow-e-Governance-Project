import type { Employee } from "../../../../services/employeeService";
import { scoreEmployees } from "../../../../services/aiScoringEngine";
import type { Task } from "../../../../services/taskService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type { ProposalDecompositionResult } from "../../types";
import { parseLlmResult } from "../parseLlmResult";
import { callDecompositionLLM } from "./llmClient";
import {
  buildFallbackDecomposition,
  buildStructuredDecomposition,
  hasHierarchyContent,
  repairFlatStructure,
  shouldUseStructuredFallback,
} from "./hierarchyFallback";
import {
  buildCompactEmployeesContext,
  getRecommendedValues,
  mapNamesToIds,
  selectFallbackTeam,
} from "./recommendations";
import {
  extractActionTable,
  extractExplicitSubtasks,
  generateTemplateSubtasks,
} from "./textAnalysis";

export const decomposeWholeDocument = async (
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): Promise<ProposalDecompositionResult> => {
  // Build employee context for the prompt
  const employeeBlock =
    employees && employees.length > 0
      ? `\n\nAvailable employees for task assignment:\n${buildCompactEmployeesContext(
          employees,
          employeeNotes,
        )}`
      : "";

  const recommendationInstruction =
    employees && employees.length > 0
      ? `\n10. For each task, include "recommendedEmployeeIds" as an array of employee IDs best suited for the task based on their strengths, and "recommendationReasoning" explaining why.`
      : "";

  const recommendationSchema =
    employees && employees.length > 0
      ? `,\n          "recommendedEmployeeIds": ["employee_id_1"],\n          "recommendationReasoning": "Why this employee fits"`
      : "";

  const subtaskSchema = `,\n          "subtasks": ["Checklist step 1", "Checklist step 2", "Checklist step 3"]`;

  const tableText = extractActionTable(proposalText);
  const mustCoverInstruction = `IMPORTANT: This proposal has 8 Parts (Part 1 through Part 8) spanning 6 months.
You MUST decompose ALL 8 parts. Do not stop after Part 1 or 2.
Every Part in the methodology table must become an Activity with 2-3 tasks.
Required activities: Inception & Planning (Month 1), Situational Analysis (Month 1-2), Economic Diagnostic (Month 1-2),
Strategic Framework Workshop (Month 3), Benchmarking (Month 3), Draft EDSP & Roadmap (Month 4),
Stakeholder Validation (Month 5), Final Outputs & Adoption (Month 6).`;

  const prompt = `You are an AI assistant that decomposes government proposals into a strictly nested 5-level hierarchy.

CRITICAL NESTING RULE: The JSON must be deeply nested. Structure MUST be:
programs[] → each program has projects[] → each project has activities[] → each activity has tasks[]
NEVER output programs, projects, activities as separate top-level arrays. They must always be nested inside their parent.

Proposal Title: ${proposalTitle}
Proposal Text (action table only):
${tableText}

Instructions:
1. Identify broad Programs (thematic clusters of work in the proposal).
2. Under each Program, identify Projects. Projects go INSIDE programs[n].projects — NOT at top level.
3. Under each Project, map Activities from the schedule/methodology table. Activities go INSIDE projects[n].activities — NOT at top level.
4. Under each Activity, generate 2-5 assignable Tasks. Tasks go INSIDE activities[n].tasks — NOT at top level.
5. For tasks, infer requiredSkills from job functions and methods mentioned in the proposal.
6. Populate schedule from any timeline column (e.g. "Month 1-2").
6b. For each task, include a "subtasks" array of 3-6 short, actionable checklist items. Pull these from the activity's methodology/details text where available (e.g. "Technical Presentations", "Document Review and Gap Analysis"). Only invent generic steps if the source text gives no usable detail.
7. If multiple phases/parts/sections are present, split them into separate programs/projects/activities. Avoid collapsing everything into a single program unless there is only one distinct theme.
8. Output ONLY strict JSON. No markdown fences. No preamble. No explanation.

${mustCoverInstruction}

${recommendationInstruction}${employeeBlock}

WRONG — never do this:
{ "programs": [...], "projects": [...], "activities": [...], "tasks": [...] }

CORRECT — always do this:
{ "programs": [{ "projects": [{ "activities": [{ "tasks": [...] }] }] }] }

Required JSON shape:
{
  "proposal": { "title": "...", "description": "..." },
  "programs": [{
    "title": "...", "description": "...",
    "projects": [{
      "title": "...", "description": "...",
      "activities": [{
        "title": "...", "description": "...",
        "schedule": "Month 1",
        "methodology": ["Workshop"],
        "tasks": [{
          "title": "...", "description": "...",
          "estimatedDuration": "2 days",
          "requiredSkills": ["facilitation", "data gathering"],
          "priority": "high"${recommendationSchema}${subtaskSchema}
        }]
      }]
    }]
  }]
}`;

  try {
    const contentString = await callDecompositionLLM(prompt);

    console.log("[Decomposition DEBUG] Raw LLM response content:\n", contentString);

    // Parse the LLM JSON output
    let parsed = parseLlmResult(contentString);

    if (parsed && !hasHierarchyContent(parsed)) {
      // Attempt structural repair before giving up
      try {
        const jsonMatch = contentString.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const rawObj = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
          parsed = repairFlatStructure(parsed, rawObj);
        }
      } catch {
        // repair failed, parsed stays as-is
      }
    }

    if (!parsed || !hasHierarchyContent(parsed)) {
      console.warn("LLM output did not contain valid hierarchy. Using fallback decomposition.");
      return buildFallbackDecomposition(proposalText, proposalTitle, employees, employeeNotes);
    }

    if (shouldUseStructuredFallback(parsed, proposalText)) {
      const structured = buildStructuredDecomposition(
        proposalText,
        proposalTitle,
        employees,
        employeeNotes,
      );
      if (structured) return structured;
    }

    // If LLM produced hierarchy but no employee recommendations, populate them locally
    if (employees && employees.length > 0) {
      parsed.programs.forEach((program) => {
        program.projects.forEach((project) => {
          project.activities.forEach((activity) => {
            activity.tasks.forEach((task) => {
              const normalized = mapNamesToIds(
                getRecommendedValues(task),
                employees,
              );
              if (normalized.length > 0) {
                task.recommendedEmployeeIds = normalized;
              }

              if (!task.recommendedEmployeeIds || task.recommendedEmployeeIds.length === 0) {
                console.log(`[Decomposition DEBUG] Task "${task.title}" has no LLM recommendations. Running local scoring fallback...`);
                const taskForScoring: Task = {
                  id: "temp",
                  title: task.title,
                  description: task.description,
                  status: "pending_assignment",
                  tags: task.requiredSkills,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                const scored = scoreEmployees(taskForScoring, employees, employeeNotes);
                console.log(`[Decomposition DEBUG] Scored employees for task "${task.title}":`, scored.map(s => ({ name: s.employeeName, score: s.totalScore, skillMatch: s.breakdown.skillMatch })));
                const selected = scored.length > 0 ? selectFallbackTeam(scored) : [];
                console.log(`[Decomposition DEBUG] Selected fallback team for task "${task.title}":`, selected.map(s => s.employeeName));

                if (selected.length > 0) {
                  task.recommendedEmployeeIds = selected.map((c) => c.employeeId);
                  task.recommendationReasoning =
                    selected.length > 1
                      ? `Team of ${selected.length}: Lead ${selected[0].employeeName}, support ${selected.slice(1).map((c) => c.employeeName).join(", ")}.`
                      : selected[0].reasoning;
                  task.burnoutWarning = selected.some((c) => c.burnoutWarning);
                  task.recommendationSource = "fallback";
                }
              }
            });
          });
        });
      });
    }

    // Ensure every task has subtasks — prefer activity methodology, then templates
    parsed.programs.forEach((program) => {
      program.projects.forEach((project) => {
        project.activities.forEach((activity) => {
          activity.tasks.forEach((task) => {
            if (!task.subtasks || task.subtasks.length === 0) {
              const explicit = extractExplicitSubtasks(activity.methodology, task.description);
              task.subtasks = explicit.length > 0
                ? explicit
                : generateTemplateSubtasks(task.title, task.description);
            }
          });
        });
      });
    });

    return parsed;
  } catch (error) {
    console.error("Proposal decomposition failed:", error);
    return buildFallbackDecomposition(proposalText, proposalTitle, employees, employeeNotes);
  }
};

// ─── Exported entry point ────────────────────────────────────────
// Tries per-part LLM orchestration first for "Part N" documents,
// falls back to whole-document path for everything else.
