// ─── Proposal Decomposition Service ─────────────────────────────
// Decomposes government proposals into Programs → Projects → Activities → Tasks
// via LLM (deepseek-r1:8b) with structural repair and local scoring fallback.

import { Employee } from "./employeeService";
import { scoreEmployees } from "./aiScoringEngine";
import type { Task } from "./taskService";
import type { EmployeeNotesMap } from "./employeeNotesService";

const API_BASE = (import.meta.env.VITE_LLM_BASE_URL || "/api").replace(/\/$/, "");
const CHAT_ENDPOINT = `${API_BASE}/chat`;
const LLM_MODEL = "deepseek-r1:8b";
const LLM_TIMEOUT_MS = 600_000;

// ─── Types ───────────────────────────────────────────────────────

export interface ProposalDecompositionTask {
  title: string;
  description: string;
  estimatedDuration?: string;
  requiredSkills?: string[];
  priority?: "low" | "medium" | "high";
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  burnoutWarning?: boolean;
}

export interface ProposalDecompositionActivity {
  title: string;
  description: string;
  schedule?: string;
  methodology?: string[];
  tasks: ProposalDecompositionTask[];
}

export interface ProposalDecompositionProject {
  title: string;
  description: string;
  activities: ProposalDecompositionActivity[];
}

export interface ProposalDecompositionProgram {
  title: string;
  description: string;
  projects: ProposalDecompositionProject[];
}

export interface ProposalDecompositionResult {
  proposal?: { title: string; description: string };
  programs: ProposalDecompositionProgram[];
}

// ─── Auth key fetching (shared with llmService) ──────────────────

let cachedAuthKey: string | null = null;
let authKeyPromise: Promise<string | null> | null = null;

const fetchAuthKey = async () => {
  if (cachedAuthKey) return cachedAuthKey;
  if (authKeyPromise) return authKeyPromise;

  authKeyPromise = fetch(`${API_BASE}/authkey`)
    .then(async (res) => {
      if (!res.ok) return null;
      const data = await res.json();
      const key = typeof data.api_key === "string" ? data.api_key.trim() : null;
      if (key) cachedAuthKey = key;
      return key;
    })
    .catch(() => null)
    .finally(() => {
      authKeyPromise = null;
    });

  return authKeyPromise;
};

// ─── JSON parsing helpers ────────────────────────────────────────

const parseLlmJson = (raw: string): ProposalDecompositionResult | null => {
  try {
    // Strip markdown fences, <think> blocks, preamble
    let cleaned = raw
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);

    // Normalize top-level shape
    const programs = Array.isArray(parsed.programs) ? parsed.programs : [];

    return {
      proposal: parsed.proposal || { title: "", description: "" },
      programs,
    };
  } catch {
    return null;
  }
};

const extractActionTable = (text: string): string => {
  const tableStartPatterns = [
    /ACTION\s+DETAILS\s+METHODOLOGY\s+SCHEDULE/i,
    /Part\s+1\s*:/i,
    /Scope\s+and\s+Methodology/i,
  ];
  const tableEndPatterns = [
    /Proposed\s+Budget/i,
    /Monitoring\s+and\s+Evaluation/i,
    /TOTAL\s+PROJECT\s+COST/i,
  ];

  let startIdx = -1;
  for (const pattern of tableStartPatterns) {
    const match = text.search(pattern);
    if (match !== -1) {
      startIdx = match;
      break;
    }
  }

  let endIdx = text.length;
  for (const pattern of tableEndPatterns) {
    const match = text.search(pattern);
    if (match !== -1 && match > startIdx) {
      endIdx = match;
      break;
    }
  }

  if (startIdx !== -1) {
    return text.slice(startIdx, endIdx).trim();
  }

  return text.slice(0, 3000);
};

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const mapNamesToIds = (values: string[], employees: Employee[]) => {
  const byId = new Map(employees.map((employee) => [employee.id, employee.id]));
  const byName = new Map(
    employees.map((employee) => [normalizeName(employee.name), employee.id]),
  );

  const resolved: string[] = [];
  values.forEach((value) => {
    if (byId.has(value)) {
      resolved.push(value);
      return;
    }
    const normalized = normalizeName(value);
    const exact = byName.get(normalized);
    if (exact) {
      resolved.push(exact);
      return;
    }
    const fuzzy = employees.find((employee) => {
      const candidate = normalizeName(employee.name);
      return candidate.includes(normalized) || normalized.includes(candidate);
    });
    if (fuzzy) resolved.push(fuzzy.id);
  });

  return Array.from(new Set(resolved));
};

const getRecommendedValues = (task: ProposalDecompositionTask): string[] => {
  if (Array.isArray(task.recommendedEmployeeIds)) {
    return task.recommendedEmployeeIds.filter(
      (value): value is string => typeof value === "string",
    );
  }
  const names = (task as unknown as Record<string, unknown>)
    .recommendedEmployeeNames;
  if (Array.isArray(names)) {
    return names.filter((value): value is string => typeof value === "string");
  }
  if (typeof names === "string") return [names];
  return [];
};

const buildCompactEmployeesContext = (
  employees: Employee[],
  employeeNotes?: EmployeeNotesMap,
) =>
  employees
    .map((employee) => {
      const notes = employeeNotes?.[employee.id];
      return `- ID: ${employee.id} | ${employee.name} | Workload: ${employee.currentWorkload}% | Skills: ${notes?.strengths || "General"}`;
    })
    .join("\n");

const hasHierarchyContent = (result: ProposalDecompositionResult): boolean => {
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

const shouldUseStructuredFallback = (
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

const inferSkillsFromText = (text: string): string[] => {
  const rules = [
    { keyword: "workshop", skill: "facilitation" },
    { keyword: "consult", skill: "stakeholder engagement" },
    { keyword: "analysis", skill: "economic analysis" },
    { keyword: "benchmark", skill: "benchmarking" },
    { keyword: "planning", skill: "strategic planning" },
    { keyword: "writing", skill: "technical writing" },
    { keyword: "presentation", skill: "presentation" },
    { keyword: "validation", skill: "policy coordination" },
  ];

  const lower = text.toLowerCase();
  const skills = new Set<string>();
  rules.forEach((rule) => {
    if (lower.includes(rule.keyword)) skills.add(rule.skill);
  });

  return Array.from(skills);
};

type PartSection = {
  title: string;
  description: string;
  schedule?: string;
  tasks: ProposalDecompositionTask[];
};

const extractPartSections = (proposalText: string): PartSection[] | null => {
  const sourceText = extractActionTable(proposalText);
  const partRegex =
    /Part\s+\d+\s*:?\s*([^\n]+?)(?=Part\s+\d+\s*:|Proposed Budget|Monitoring|$)/gi;
  const matches = Array.from(sourceText.matchAll(partRegex));

  if (matches.length < 2) return null;

  console.info(`Extracted ${matches.length} parts from proposal text`);

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end =
      index + 1 < matches.length
        ? matches[index + 1].index ?? sourceText.length
        : sourceText.length;
    const sectionText = sourceText.slice(start, end);
    const title = (match[1] || `Part ${index + 1}`).trim();
    const scheduleMatch = sectionText.match(/Month\s*\d+(?:\s*-\s*\d+)?/i);
    const schedule = scheduleMatch
      ? scheduleMatch[0].replace(/\s+/g, " ")
      : undefined;

    const numberedLines = sectionText
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+\./.test(line))
      .map((line) => line.replace(/^\d+\.\s*/, ""))
      .filter(Boolean);

    const sentences = sectionText
      .split(/[.\n]/)
      .map((sentence) => sentence.trim())
      .filter(
        (sentence) =>
          sentence.length > 15 && !/^Part\s+\d+/i.test(sentence),
      );

    const taskLines = numberedLines.length > 0 ? numberedLines : sentences;
    const tasks: ProposalDecompositionTask[] = taskLines
      .slice(0, 3)
      .map((line, idx) => ({
        title: line.substring(0, 80) || `Task ${idx + 1}`,
        description: line,
        estimatedDuration: "TBD",
        requiredSkills: inferSkillsFromText(line),
        priority: "medium" as const,
      }));

    if (tasks.length === 0) {
      tasks.push({
        title: `Execute ${title}`,
        description: `Complete the activities for ${title}`,
        estimatedDuration: "TBD",
        requiredSkills: [],
        priority: "medium",
      });
    }

    const description = sentences.slice(0, 2).join(". ") || title;

    return {
      title,
      description,
      schedule,
      tasks,
    };
  });
};

const selectFallbackTeam = (scored: ReturnType<typeof scoreEmployees>) => {
  if (!scored.length) return [];

  const topSkillMatch = scored[0].breakdown.skillMatch;
  const SKILL_GAP = 15;
  const MIN_SKILL_FLOOR = Math.max(25, topSkillMatch - SKILL_GAP);

  const qualified = scored.filter(
    (candidate) => candidate.breakdown.skillMatch >= MIN_SKILL_FLOOR,
  );

  let team = (qualified.length ? qualified : scored).slice(0, 3);

  if (team.length >= 2) {
    const skillGapToSecond =
      team[0].breakdown.skillMatch - team[1].breakdown.skillMatch;
    if (skillGapToSecond >= 10) {
      team = skillGapToSecond >= 20 ? team.slice(0, 1) : team.slice(0, 2);
    } else if (team.length === 3) {
      const skillGapToThird =
        team[0].breakdown.skillMatch - team[2].breakdown.skillMatch;
      if (skillGapToThird >= 10) {
        team = team.slice(0, 2);
      }
    }
  }

  return team;
};

const applyLocalRecommendations = (
  result: ProposalDecompositionResult,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
) => {
  if (!employees || employees.length === 0) return;

  result.programs.forEach((program) => {
    program.projects.forEach((project) => {
      project.activities.forEach((activity) => {
        activity.tasks.forEach((task) => {
          const taskForScoring: Task = {
            id: "temp",
            title: task.title,
            description: task.description,
            status: "pending_assignment" as const,
            tags: task.requiredSkills,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          const scored = scoreEmployees(taskForScoring, employees, employeeNotes);
          if (scored.length > 0) {
            const team = selectFallbackTeam(scored);
            if (team.length > 0) {
              task.recommendedEmployeeIds = team.map((c) => c.employeeId);
              task.recommendationReasoning =
                team.length > 1
                  ? `Team of ${team.length}: Lead ${team[0].employeeName}, support ${team
                      .slice(1)
                      .map((c) => c.employeeName)
                      .join(", ")}.`
                  : scored[0].reasoning;
              task.burnoutWarning = team.some((c) => c.burnoutWarning);
            }
          }
        });
      });
    });
  });
};

const buildStructuredDecomposition = (
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
): ProposalDecompositionResult | null => {
  const parts = extractPartSections(proposalText);
  if (!parts) return null;

  const programTitle = proposalTitle || "Imported Proposal";
  const projects: ProposalDecompositionProject[] = parts.map((part) => ({
    title: part.title,
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
  }));

  const result: ProposalDecompositionResult = {
    proposal: { title: proposalTitle, description: proposalText.substring(0, 200) },
    programs: [
      {
        title: programTitle,
        description: proposalText.substring(0, 300),
        projects,
      },
    ],
  };

  applyLocalRecommendations(result, employees, employeeNotes);
  return result;
};

// ─── Structural repair for flat LLM output ──────────────────────

const repairFlatStructure = (
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

const buildFallbackDecomposition = (
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
        }));

      // Ensure at least 1 task per activity
      if (tasks.length === 0) {
        tasks.push({
          title: `Execute ${actTitle}`,
          description: `Complete the activity: ${actTitle}`,
          estimatedDuration: "TBD",
          requiredSkills: [],
          priority: "medium",
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

// ─── Main decompose function ─────────────────────────────────────

export const decomposeProposal = async (
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
      ? `\n9. For each task, include "recommendedEmployeeIds" as an array of employee IDs best suited for the task based on their strengths, and "recommendationReasoning" explaining why.`
      : "";

  const recommendationSchema =
    employees && employees.length > 0
      ? `,\n          "recommendedEmployeeIds": ["employee_id_1"],\n          "recommendationReasoning": "Why this employee fits"`
      : "";

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
          "priority": "high"${recommendationSchema}
        }]
      }]
    }]
  }]
}`;

  try {
    const runtimeToken = await fetchAuthKey();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

    const response = await fetch(CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(runtimeToken ? { Authorization: `Bearer ${runtimeToken}` } : {}),
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: "user", content: prompt }],
        stream: false,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error("LLM Decomposition Error:", response.status, response.statusText);
      return buildFallbackDecomposition(proposalText, proposalTitle, employees, employeeNotes);
    }

    const data = await response.json();
    const contentString =
      data.message?.content ||
      data.choices?.[0]?.message?.content ||
      data.response ||
      data.content ||
      "";

    // Parse the LLM JSON output
    let parsed = parseLlmJson(contentString);

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
                const selected = scored.length > 0 ? selectFallbackTeam(scored) : [];

                if (selected.length > 0) {
                  task.recommendedEmployeeIds = selected.map((c) => c.employeeId);
                  task.recommendationReasoning =
                    selected.length > 1
                      ? `Team of ${selected.length}: Lead ${selected[0].employeeName}, support ${selected.slice(1).map((c) => c.employeeName).join(", ")}.`
                      : selected[0].reasoning;
                  task.burnoutWarning = selected.some((c) => c.burnoutWarning);
                }
              }
            });
          });
        });
      });
    }

    return parsed;
  } catch (error) {
    console.error("Proposal decomposition failed:", error);
    return buildFallbackDecomposition(proposalText, proposalTitle, employees, employeeNotes);
  }
};
