// ─── Client-Side AI Scoring Engine ───────────────────────────────
// Weighted scoring fallback when DeepSeek LLM is offline.
// Supplements (never replaces) the real LLM recommendation.

import { Employee } from "./employeeService";
import { Task } from "./taskService";
import type { EmployeeNotesMap } from "./employeeNotesService";

export interface ScoredCandidate {
  employeeId: string;
  employeeName: string;
  totalScore: number;
  breakdown: {
    skillMatch: number;
    workloadAvailability: number;
    burnoutPenalty: number;
    departmentCompatibility: number;
    deadlineUrgency: number;
  };
  reasoning: string;
  burnoutWarning: boolean;
  overloadRisk: boolean;
}

// ─── Weights ─────────────────────────────────────────────────────
const WEIGHTS = {
  skillMatch: 0.40,
  workloadAvailability: 0.25,
  burnoutPenalty: 0.20,
  departmentCompatibility: 0.10,
  deadlineUrgency: 0.05,
} as const;

// ─── Skill keyword extraction ────────────────────────────────────
function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .filter((w) => !STOP_WORDS.has(w));
}

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "all", "from", "that", "this",
  "are", "was", "has", "been", "will", "can", "its", "not",
  "but", "they", "their", "our", "your", "who", "also",
]);

// ─── Score calculation ───────────────────────────────────────────
function computeSkillMatch(
  employee: Employee,
  task: Task,
  employeeNotes?: EmployeeNotesMap,
): number {
  // Include requiredSkills in task text
  const taskText = `${task.title} ${task.description || ""} ${(task.tags || []).join(" ")} ${((task as unknown as Record<string, unknown>).requiredSkills as string[] || []).join(" ")}`;

  const notes = employeeNotes?.[employee.id];
  const noteText = notes
    ? `${notes.strengths || ""} ${notes.weaknesses || ""} ${notes.notes || ""} ${(notes.tags || []).join(" ")}`
    : "";

  // Include notes — this is where all real skill data lives
  const empText = `${employee.jobTitle} ${employee.jobDescription} ${employee.departmentName || ""} ${noteText}`;

  const taskKw = extractKeywords(taskText);
  const empKwArray = extractKeywords(empText);

  if (taskKw.length === 0) return 50; // No keywords = neutral score

  // Use partial/substring matching — "presentation" matches "presentations", "facilit" matches "facilitation"
  const matches = taskKw.filter((kw) =>
    empKwArray.some((ek) => ek.includes(kw) || kw.includes(ek))
  ).length;

  return Math.min(100, (matches / Math.max(taskKw.length, 1)) * 100 + 20);
}

function computeWorkloadAvailability(employee: Employee): number {
  // 0 workload = 100 availability, 100 workload = 0 availability
  return Math.max(0, 100 - employee.currentWorkload);
}

function computeBurnoutPenalty(employee: Employee): number {
  if (employee.currentWorkload >= 85) return 10;  // Severe penalty
  if (employee.currentWorkload >= 70) return 40;  // Moderate penalty
  if (employee.currentWorkload >= 50) return 70;  // Low penalty
  return 100; // No penalty
}

function computeDeptCompatibility(employee: Employee, task: Task): number {
  if (!task.department || !employee.department) return 50;
  return employee.department === task.department ? 100 : 30;
}

function computeDeadlineUrgency(task: Task): number {
  if (!task.deadline && !task.dueDate) return 50;
  const deadline = new Date(task.deadline || task.dueDate!);
  const now = new Date();
  const daysLeft = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

  if (daysLeft < 0) return 100;  // Overdue — urgent, pick least busy
  if (daysLeft < 3) return 90;
  if (daysLeft < 7) return 70;
  if (daysLeft < 14) return 50;
  return 30; // Plenty of time
}

// ─── Main scoring function ───────────────────────────────────────
export function scoreEmployees(task: Task, employees: Employee[], employeeNotes?: EmployeeNotesMap): ScoredCandidate[] {
  const urgency = computeDeadlineUrgency(task);

  const scored = employees.map((emp): ScoredCandidate => {
    const skillMatch = computeSkillMatch(emp, task, employeeNotes);
    const workloadAvailability = computeWorkloadAvailability(emp);
    const burnoutPenalty = computeBurnoutPenalty(emp);
    const departmentCompatibility = computeDeptCompatibility(emp, task);
    const deadlineUrgency = urgency;

    const totalScore =
      skillMatch * WEIGHTS.skillMatch +
      workloadAvailability * WEIGHTS.workloadAvailability +
      burnoutPenalty * WEIGHTS.burnoutPenalty +
      departmentCompatibility * WEIGHTS.departmentCompatibility +
      deadlineUrgency * WEIGHTS.deadlineUrgency;

    const burnoutWarning = emp.currentWorkload >= 75;
    const overloadRisk = emp.currentWorkload >= 85;

    // Generate reasoning
    const reasons: string[] = [];
    if (skillMatch > 60) reasons.push(`Strong skill match (${Math.round(skillMatch)}%)`);
    else if (skillMatch > 30) reasons.push(`Moderate skill match (${Math.round(skillMatch)}%)`);
    else reasons.push(`Low skill match (${Math.round(skillMatch)}%)`);

    if (workloadAvailability > 60) reasons.push(`Good availability (${100 - emp.currentWorkload}% free)`);
    else reasons.push(`Limited availability (workload ${emp.currentWorkload}%)`);

    if (burnoutWarning) reasons.push(`⚠️ Burnout risk — workload at ${emp.currentWorkload}%`);
    if (departmentCompatibility > 80) reasons.push("Same department");

    return {
      employeeId: emp.id,
      employeeName: emp.name,
      totalScore: Math.round(totalScore * 10) / 10,
      breakdown: {
        skillMatch: Math.round(skillMatch),
        workloadAvailability: Math.round(workloadAvailability),
        burnoutPenalty: Math.round(burnoutPenalty),
        departmentCompatibility: Math.round(departmentCompatibility),
        deadlineUrgency: Math.round(deadlineUrgency),
      },
      reasoning: reasons.join(". ") + ".",
      burnoutWarning,
      overloadRisk,
    };
  });

  // Sort by total score descending
  scored.sort((a, b) => b.totalScore - a.totalScore);
  return scored;
}

// ─── Get top recommendation ──────────────────────────────────────
export function getTopRecommendation(task: Task, employees: Employee[], employeeNotes?: EmployeeNotesMap): ScoredCandidate | null {
  const scored = scoreEmployees(task, employees, employeeNotes);
  return scored.length > 0 ? scored[0] : null;
}

// ─── Generate summary text ───────────────────────────────────────
export function generateRecommendationSummary(
  candidate: ScoredCandidate,
  allCandidates: ScoredCandidate[]
): string {
  const rank = allCandidates.findIndex((c) => c.employeeId === candidate.employeeId) + 1;
  const total = allCandidates.length;

  let summary = `${candidate.employeeName} ranks #${rank} of ${total} candidates with a fit score of ${candidate.totalScore.toFixed(1)}/100. `;
  summary += candidate.reasoning;

  if (candidate.overloadRisk) {
    summary += ` WARNING: This employee is at high burnout risk.`;
    if (allCandidates.length > 1 && allCandidates[1]) {
      summary += ` Consider ${allCandidates[1].employeeName} as an alternative (score: ${allCandidates[1].totalScore.toFixed(1)}).`;
    }
  }

  return summary;
}
