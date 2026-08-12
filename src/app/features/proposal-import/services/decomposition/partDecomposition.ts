import type { Employee } from "../../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type { AiQueueUpdate } from "../../../ai";
import type {
  ProposalDecompositionActivity,
  ProposalDecompositionResult,
  ProposalDecompositionTask,
} from "../../types";
import { callDecompositionLLM } from "./llmClient";
import { extractPartSections, type PartSection } from "./textAnalysis";
import {
  getRecommendedValues,
  mapNamesToIds,
} from "./recommendations";

export async function decomposeSinglePart(
  part: PartSection,
  employees?: Employee[],
  _employeeNotes?: EmployeeNotesMap,
  onQueueUpdate?: (update: AiQueueUpdate) => void,
): Promise<ProposalDecompositionActivity> {
  const employeeList = (employees || [])
    .map((e) => `- ${e.name} (${e.id}): ${e.jobDescription || "no listed skills"}`)
    .join("\n");

  const prompt = `Break down ONE section of a government project proposal into actionable tasks.

Section title: "${part.title}"
Details: "${part.description}"
Schedule: "${part.schedule || "not specified"}"

Available team:
${employeeList || "No employees provided — omit recommendedEmployeeIds."}

Respond with JSON only, no preamble, no markdown fences:
{
  "tasks": [{
    "title": "...", "description": "...",
    "estimatedDuration": "2 days",
    "requiredSkills": ["skill1", "skill2"],
    "priority": "high",
    "recommendedEmployeeIds": ["exact-id-from-list-above"],
    "recommendationReasoning": "Why this person fits, referencing their actual listed skills.",
    "subtasks": ["step 1", "step 2", "step 3"]
  }]
}

Produce 1-4 tasks for this section only. Do not attempt to cover the whole proposal — only this section.`;

  try {
    const rawResponse = await callDecompositionLLM(prompt, onQueueUpdate);
    const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in LLM response");

    const parsed = JSON.parse(jsonMatch[0]) as { tasks: ProposalDecompositionTask[] };
    if (!parsed.tasks || parsed.tasks.length === 0) throw new Error("Empty tasks array");

    // Resolve any name-based recommendations to IDs
    if (employees && employees.length > 0) {
      parsed.tasks.forEach((task) => {
        const normalized = mapNamesToIds(getRecommendedValues(task), employees);
        if (normalized.length > 0) {
          task.recommendedEmployeeIds = normalized;
        }
        task.recommendationSource = (task.recommendedEmployeeIds && task.recommendedEmployeeIds.length > 0)
          ? "llm"
          : undefined;
      });
    }

    return {
      title: part.title,
      description: part.description,
      schedule: part.schedule,
      methodology: [],
      tasks: parsed.tasks,
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown AI error";
    throw new Error(`DeepSeek could not decompose "${part.title}": ${detail}`);
  }
}

// ─── decomposeProposalByPart ─────────────────────────────────────────
// Orchestrates the per-part calls sequentially (not Promise.all — a
// local Ollama server holds one model in memory and processes one
// request at a time; concurrent calls would just queue behind each
// other while holding open connections for no benefit).
export async function decomposeProposalByPart(
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
  onProgress?: (current: number, total: number, partTitle: string) => void,
  onQueueUpdate?: (update: AiQueueUpdate) => void,
): Promise<ProposalDecompositionResult> {
  const parts = extractPartSections(proposalText);
  if (!parts || parts.length === 0) {
    throw new Error("No proposal parts could be extracted for DeepSeek to process.");
  }

  const activities: ProposalDecompositionActivity[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (onProgress) onProgress(i + 1, parts.length, parts[i].title);
    const activity = await decomposeSinglePart(
      parts[i],
      employees,
      employeeNotes,
      onQueueUpdate,
    );
    activities.push(activity);
  }

  return {
    proposal: { title: proposalTitle, description: proposalText.substring(0, 200) },
    programs: activities.map((activity, index) => ({
      title: activity.title || `Program ${index + 1}`,
      description: activity.description,
      projects: [
        {
          title: `${activity.title} Implementation`,
          description: activity.description,
          activities: [activity],
        },
      ],
    })),
  };
}

// ─── Whole-document path (original approach, renamed) ────────────
