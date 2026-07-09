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
  subtasks?: string[];
  recommendationSource?: "llm" | "fallback" | "import";
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
      const profileSkills = employee.jobDescription || "";
      const noteSkills = notes?.strengths || "";
      const combinedSkills = [profileSkills, noteSkills].filter(Boolean).join(", ") || "General";
      return `- ID: ${employee.id} | ${employee.name} | Workload: ${employee.currentWorkload}% | Skills: ${combinedSkills}`;
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
    { keyword: "facilitat", skill: "facilitation" },
    { keyword: "consult", skill: "stakeholder engagement" },
    { keyword: "stakeholder", skill: "stakeholder engagement" },
    { keyword: "analysis", skill: "data analysis" },
    { keyword: "economic", skill: "economic analysis" },
    { keyword: "diagnostic", skill: "economic analysis" },
    { keyword: "benchmark", skill: "benchmarking" },
    { keyword: "planning", skill: "strategic planning" },
    { keyword: "strategic", skill: "strategic planning" },
    { keyword: "writing", skill: "technical writing" },
    { keyword: "report", skill: "report writing" },
    { keyword: "document", skill: "technical writing" },
    { keyword: "presentation", skill: "presentation" },
    { keyword: "validation", skill: "stakeholder validation" },
    { keyword: "coordinat", skill: "project coordination" },
    { keyword: "policy", skill: "policy analysis" },
    { keyword: "regulat", skill: "regulatory compliance" },
    { keyword: "budget", skill: "budgeting" },
    { keyword: "invest", skill: "investment promotion" },
    { keyword: "zoning", skill: "zoning & land use" },
    { keyword: "urban", skill: "urban planning" },
    { keyword: "gis", skill: "GIS mapping" },
    { keyword: "mapping", skill: "GIS mapping" },
    { keyword: "traffic", skill: "traffic analysis" },
    { keyword: "swot", skill: "SWOT analysis" },
    { keyword: "survey", skill: "data gathering" },
    { keyword: "data gather", skill: "data gathering" },
    { keyword: "data collect", skill: "data gathering" },
    { keyword: "research", skill: "data gathering" },
    { keyword: "visioning", skill: "strategic planning" },
    { keyword: "roadmap", skill: "strategic planning" },
    { keyword: "competitiv", skill: "economic analysis" },
    { keyword: "legislat", skill: "policy analysis" },
    { keyword: "enactment", skill: "policy analysis" },
    { keyword: "public relation", skill: "public relations" },
  ];

  const lower = text.toLowerCase();
  const skills = new Set<string>();
  rules.forEach((rule) => {
    if (lower.includes(rule.keyword)) skills.add(rule.skill);
  });

  return Array.from(skills);
};

// ─── Keyword → Subtask Template Fallback ──────────────────────────
const SUBTASK_TEMPLATES: Record<string, string[]> = {
  meeting: ["Prepare agenda", "Send invitations", "Book venue", "Prepare minutes", "Post-meeting report"],
  kickoff: ["Prepare agenda", "Send invitations", "Book venue", "Prepare minutes", "Post-meeting report"],
  workshop: ["Prepare materials", "Confirm facilitators", "Register participants", "Document outputs"],
  procurement: ["Prepare BAC documents", "Canvass suppliers", "Submit purchase request", "Receive items"],
  seminar: ["Prepare materials", "Confirm speakers", "Register participants", "Document outputs"],
  benchmarking: ["Identify benchmark sites", "Coordinate site visit", "Document findings", "Prepare report"],
  validation: ["Prepare validation materials", "Schedule presentation", "Collect feedback", "Incorporate revisions"],
  consultation: ["Identify stakeholders", "Schedule sessions", "Facilitate discussion", "Document inputs"],
  draft: ["Outline structure", "Write first draft", "Internal review", "Revise based on feedback"],
  presentation: ["Prepare slides", "Rehearse presentation", "Deliver presentation", "Collect feedback"],
};

function generateTemplateSubtasks(title: string, description: string): string[] {
  const haystack = `${title} ${description}`.toLowerCase();
  for (const [keyword, templates] of Object.entries(SUBTASK_TEMPLATES)) {
    if (haystack.includes(keyword)) return templates;
  }
  // Generic fallback — always give the task SOME checklist
  return ["Plan and prepare", "Execute", "Review and finalize"];
}

function extractExplicitSubtasks(methodology?: string[], _description?: string): string[] {
  const items: string[] = [];
  if (methodology && methodology.length > 0) {
    methodology.forEach((m) => {
      const cleaned = m.replace(/^[Ø•\-\d.\s]+/, "").trim();
      if (cleaned.length > 3 && cleaned.length < 100) items.push(cleaned);
    });
  }
  return Array.from(new Set(items)).slice(0, 6);
}

type PartSection = {
  title: string;
  description: string;
  schedule?: string;
  tasks: ProposalDecompositionTask[];
};

const cleanHierarchyTitle = (value: string, fallback: string): string => {
  const noSchedule = value.replace(/\bMonth\s*\d+(?:\s*-\s*\d+)?\b/gi, " ");
  const noBullets = noSchedule.replace(/[Ø•]/g, " ");
  const firstActionBoundary = noBullets.split(/\s+\d+\.\s+/)[0] || noBullets;
  const normalized = firstActionBoundary.replace(/\s+/g, " ").trim();
  return normalized || fallback;
};

const extractPartSections = (proposalText: string): PartSection[] | null => {
  const sourceText = extractActionTable(proposalText);
const partRegex =
  /Part\s+\d+\s*:?\s*([\s\S]+?)(?=Part\s+\d+\s*:|Proposed Budget|Monitoring|$)/gi;
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
    const rawTitle = (match[1] || `Part ${index + 1}`).trim();
    const title = cleanHierarchyTitle(rawTitle, `Part ${index + 1}`);
    const scheduleMatch = sectionText.match(/Month\s*\d+(?:\s*-\s*\d+)?/i);
    const schedule = scheduleMatch
      ? scheduleMatch[0].replace(/\s+/g, " ")
      : undefined;

    const numberedLinesFromRows = sectionText
      .split(/\n/)
      .map((line) => line.trim())
      .filter((line) => /^\d+\./.test(line))
      .map((line) => line.replace(/^\d+\.\s*/, ""))
      .filter(Boolean);
    const numberedLinesInline = Array.from(
      sectionText.matchAll(
        /\b\d+\.\s*([^Ø•\n]+?)(?=\s+\d+\.\s*|\s+Month\s*\d|$)/gi,
      ),
    )
      .map((matchLine) => (matchLine[1] || "").trim())
      .filter(Boolean);
    const numberedLines = Array.from(
      new Set([...numberedLinesFromRows, ...numberedLinesInline]),
    );

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
      .map((line, idx) => {
        const normalizedLine = line
          .replace(/[Ø•]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        return {
          title: cleanHierarchyTitle(normalizedLine, `Task ${idx + 1}`).substring(
            0,
            100,
          ),
          description: normalizedLine,
          estimatedDuration: "TBD",
          requiredSkills: inferSkillsFromText(normalizedLine),
          priority: "medium" as const,
          subtasks: extractExplicitSubtasks(undefined, normalizedLine).length > 0
            ? extractExplicitSubtasks(undefined, normalizedLine)
            : generateTemplateSubtasks(normalizedLine, normalizedLine),
        };
      });

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
  console.log("[Decomposition DEBUG] Running applyLocalRecommendations with employees:", employees.map(e => e.name));

  result.programs.forEach((program) => {
    program.projects.forEach((project) => {
      project.activities.forEach((activity) => {
        activity.tasks.forEach((task) => {
          if (task.recommendedEmployeeIds && task.recommendedEmployeeIds.length > 0) {
            return; // Already has a real recommendation — don't overwrite it
          }
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
              task.recommendationSource = "fallback";
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

async function callDecompositionLLM(prompt: string): Promise<string> {
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
    throw new Error(`LLM Error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return (
    data.message?.content ||
    data.choices?.[0]?.message?.content ||
    data.response ||
    data.content ||
    ""
  ) as string;
}

// ─── decomposeSinglePart ─────────────────────────────────────────────
// Sends ONE part's content to the LLM — a much smaller ask than the
// whole document, matching what every debug log shows the model
// actually succeeding at. Falls back to the deterministic scorer only
// for THIS part if its own call fails, not the whole document.
async function decomposeSinglePart(
  part: { title: string; description: string; schedule?: string; tasks: ProposalDecompositionTask[] },
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
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
    const rawResponse = await callDecompositionLLM(prompt);
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
    console.warn(`[Per-Part LLM] Failed for "${part.title}", using local scoring for this part only:`, err);
    const fallbackActivity: ProposalDecompositionActivity = {
      title: part.title,
      description: part.description,
      schedule: part.schedule,
      methodology: [],
      tasks: part.tasks, // the regex-extracted tasks for this part, unscored
    };
    const wrapper: ProposalDecompositionResult = {
      proposal: { title: part.title, description: part.description },
      programs: [{ title: part.title, description: part.description, projects: [{ title: part.title, description: part.description, activities: [fallbackActivity] }] }],
    };
    applyLocalRecommendations(wrapper, employees, employeeNotes);
    return fallbackActivity;
  }
}

// ─── decomposeProposalByPart ─────────────────────────────────────────
// Orchestrates the per-part calls sequentially (not Promise.all — a
// local Ollama server holds one model in memory and processes one
// request at a time; concurrent calls would just queue behind each
// other while holding open connections for no benefit).
async function decomposeProposalByPart(
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
  onProgress?: (current: number, total: number, partTitle: string) => void,
): Promise<ProposalDecompositionResult> {
  const parts = extractPartSections(proposalText);
  if (!parts || parts.length === 0) {
    throw new Error("No parts extracted — caller should fall back to whole-document path");
  }

  const activities: ProposalDecompositionActivity[] = [];
  for (let i = 0; i < parts.length; i++) {
    if (onProgress) onProgress(i + 1, parts.length, parts[i].title);
    const activity = await decomposeSinglePart(parts[i], employees, employeeNotes);
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

const decomposeWholeDocument = async (
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

export async function decomposeProposal(
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
  onProgress?: (current: number, total: number, partTitle: string) => void,
): Promise<ProposalDecompositionResult> {
  const hasParts = /Part\s+\d+/i.test(proposalText);

  if (hasParts) {
    try {
      return await decomposeProposalByPart(proposalText, proposalTitle, employees, employeeNotes, onProgress);
    } catch (err) {
      console.warn("[Decomposition] Per-part path failed, falling back to whole-document:", err);
      // fall through to whole-document path below
    }
  }

  return decomposeWholeDocument(proposalText, proposalTitle, employees, employeeNotes);
}
