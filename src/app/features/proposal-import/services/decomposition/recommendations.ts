import type { Employee } from "../../../../services/employeeService";
import { scoreEmployees } from "../../../../services/aiScoringEngine";
import type { Task } from "../../../../services/taskService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type { ProposalDecompositionResult, ProposalDecompositionTask } from "../../types";

const normalizeName = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export const mapNamesToIds = (values: string[], employees: Employee[]) => {
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

export const getRecommendedValues = (task: ProposalDecompositionTask): string[] => {
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

export const buildCompactEmployeesContext = (
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

export const selectFallbackTeam = (scored: ReturnType<typeof scoreEmployees>) => {
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

export const applyLocalRecommendations = (
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
