// ─── Shared operational selectors ───────────────────────────────
// The single source of truth for how every dashboard, board, and report
// classifies tasks and projects. Screens must NOT reinvent these filters —
// divergent local filters were the root cause of dashboards disagreeing
// (see "Task Flow Stabilization and Dashboard Accuracy Plan").
//
// Every function is pure: inputs in, numbers/arrays out. Inputs are always
// explicit (task list, project list, scope, "now") so the same call produces
// the same answer on the Admin, Department Head, and Employee screens.
//
// Canonical definitions (do not weaken without updating the plan):
//   • Unassigned  → assigneeId is null/empty. NEVER inferred from status.
//   • Active      → not deleted, not archived, not completed.
//   • Overdue     → active, has a real calendar due date now in the past.
//   • For review  → status === 'for_review'.
//   • linked_project_id is the ONLY canonical task→project link. Legacy
//     projectId (proposal hierarchy) is never used for operational metrics.

import type { Task, TaskStatus } from './taskService';
import type { Project, Milestone } from './projectService';

export type Health = 'on_track' | 'at_risk' | 'delayed' | 'complete' | 'no_data';

// ─── Primitive predicates ────────────────────────────────────────

export function isArchived(t: Task): boolean {
  return !!t.archivedAt;
}

/** Unassigned is defined solely by a missing assignee — never by status. */
export function isUnassigned(t: Task): boolean {
  return !t.assigneeId;
}

export function isCompleted(t: Task): boolean {
  return t.status === 'completed';
}

/** Active = not archived, not completed, and not 100% complete. */
export function isActive(t: Task): boolean {
  return !isArchived(t) && !isCompleted(t) && (t.percentComplete ?? 0) < 100;
}

export function isForReview(t: Task): boolean {
  return t.status === 'for_review';
}

/**
 * A due date only counts when it is a real calendar date. Proposal-imported
 * tasks sometimes carry fuzzy schedules ("Month 2", "Phase 1", "Week 3") that
 * must never be treated as an operational deadline.
 */
export function parseDueDate(t: Task): number | null {
  const raw = t.dueDate || t.deadline;
  if (!raw || typeof raw !== 'string') return null;
  if (/month|phase|week|quarter|ongoing|tbd|q[1-4]/i.test(raw)) return null;
  const ms = new Date(raw).getTime();
  return Number.isFinite(ms) ? ms : null;
}

/** Overdue = active AND has a real due date strictly before `now`. */
export function isOverdue(t: Task, now: number = Date.now()): boolean {
  if (!isActive(t)) return false;
  const due = parseDueDate(t);
  return due !== null && due < now;
}

// ─── Scope ───────────────────────────────────────────────────────
// scopedOrgIds empty ⇒ no scope filter (super admin sees everything).

export function inScope(orgId: string | undefined, scopedOrgIds: string[]): boolean {
  if (scopedOrgIds.length === 0) return true;
  if (!orgId) return true; // legacy rows without an org stay visible in-scope
  return scopedOrgIds.includes(orgId);
}

export function scopeTasks(tasks: Task[], scopedOrgIds: string[]): Task[] {
  if (scopedOrgIds.length === 0) return tasks;
  return tasks.filter((t) => inScope(t.orgId, scopedOrgIds));
}

export function scopeProjects(projects: Project[], scopedOrgIds: string[]): Project[] {
  if (scopedOrgIds.length === 0) return projects;
  return projects.filter((p) => inScope(p.orgId, scopedOrgIds));
}

// ─── Task-set selectors ──────────────────────────────────────────
// All operate on a task list the caller has already scoped. They apply the
// archive/active policy themselves so screens never have to remember to.

export function activeTasks(tasks: Task[]): Task[] {
  return tasks.filter(isActive);
}

export function unassignedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => isActive(t) && isUnassigned(t));
}

export function overdueTasks(tasks: Task[], now: number = Date.now()): Task[] {
  return tasks.filter((t) => isOverdue(t, now));
}

export function forReviewTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && isForReview(t));
}

export function inProgressTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && t.status === 'in_progress');
}

export function completedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && isCompleted(t));
}

export function archivedTasks(tasks: Task[]): Task[] {
  return tasks.filter(isArchived);
}

/** Only the canonical link is honoured. */
export function tasksForProject(tasks: Task[], projectId: string): Task[] {
  return tasks.filter((t) => t.linkedProjectId === projectId && !isArchived(t));
}

export function tasksForMilestone(tasks: Task[], milestoneId: string): Task[] {
  return tasks.filter((t) => t.milestoneId === milestoneId && !isArchived(t));
}

// ─── Rates & rollups ─────────────────────────────────────────────

export function completionRate(tasks: Task[]): { completed: number; total: number; rate: number } {
  const active = tasks.filter((t) => !isArchived(t));
  const completed = active.filter(isCompleted).length;
  const total = active.length;
  return { completed, total, rate: total ? Math.round((completed / total) * 100) : 0 };
}

/** Completion rate limited to tasks touched within the last `days`. */
export function completionRateSince(
  tasks: Task[],
  days: number,
  now: number = Date.now(),
): { completed: number; total: number; rate: number } {
  const since = now - days * 86400000;
  const window = tasks.filter((t) => !isArchived(t) && t.updatedAt >= since);
  const completed = window.filter(isCompleted).length;
  const total = window.length;
  return { completed, total, rate: total ? Math.round((completed / total) * 100) : 0 };
}

export interface WorkloadRow {
  id: string;
  name: string;
  active: number;
  overdue: number;
  review: number;
}

/**
 * Workload by employee — the count of that person's ACTIVE assigned tasks.
 * Used identically on Department Head and Admin screens so a person's number
 * never differs between views.
 */
export function workloadByEmployee(tasks: Task[], now: number = Date.now()): WorkloadRow[] {
  const map = new Map<string, WorkloadRow>();
  for (const t of tasks) {
    if (!t.assigneeId || !isActive(t)) continue;
    const row =
      map.get(t.assigneeId) ||
      { id: t.assigneeId, name: t.assigneeName || 'Unknown', active: 0, overdue: 0, review: 0 };
    row.active++;
    if (isOverdue(t, now)) row.overdue++;
    if (isForReview(t)) row.review++;
    map.set(t.assigneeId, row);
  }
  return Array.from(map.values()).sort((a, b) => b.active - a.active);
}

/** Active tasks with a real due date at or before `now + days`, soonest first. */
export function upcomingDeadlines(tasks: Task[], days: number, now: number = Date.now()): Task[] {
  const until = now + days * 86400000;
  return tasks
    .filter((t) => {
      if (!isActive(t)) return false;
      const due = parseDueDate(t);
      return due !== null && due <= until;
    })
    .sort((a, b) => (parseDueDate(a) ?? 0) - (parseDueDate(b) ?? 0));
}

// ─── Project health & completion ─────────────────────────────────

export interface ProjectStats {
  total: number;
  completed: number;
  overdue: number;
  active: number;
  percentComplete: number; // 0..100, based on completed / total linked tasks
  health: Health;
}

/**
 * Project health derived from canonically linked tasks. A project with no
 * linked task returns `no_data` — it must say "No task data", never "healthy".
 * An explicitly completed/archived project reflects that status directly.
 */
export function projectStats(
  project: Pick<Project, 'id' | 'status'>,
  tasks: Task[],
  now: number = Date.now(),
): ProjectStats {
  const linked = tasksForProject(tasks, project.id);
  const total = linked.length;
  const completed = linked.filter(isCompleted).length;
  const overdue = linked.filter((t) => isOverdue(t, now)).length;
  const active = linked.filter(isActive).length;
  const percentComplete = total ? Math.round((completed / total) * 100) : 0;

  let health: Health;
  if (project.status === 'completed') {
    health = 'complete';
  } else if (total === 0) {
    health = 'no_data';
  } else if (completed === total) {
    health = 'complete';
  } else if (overdue > 0) {
    health = 'delayed';
  } else {
    const nearDue = linked.some((t) => {
      if (!isActive(t)) return false;
      const due = parseDueDate(t);
      if (due === null) return false;
      const inDays = (due - now) / 86400000;
      return inDays >= 0 && inDays <= 3;
    });
    health = nearDue ? 'at_risk' : 'on_track';
  }

  return { total, completed, overdue, active, percentComplete, health };
}

// ─── Milestone status (auto rollup) ──────────────────────────────
// Kept here so milestone progress uses the same task classification as
// everything else. Manual override wins when set.

export function milestoneAutoStatus(
  milestone: Pick<Milestone, 'manualStatus'>,
  tasks: Task[],
  now: number = Date.now(),
): { status: Exclude<Milestone['status'], 'auto'>; source: 'manual' | 'auto' } {
  if (milestone.manualStatus) return { status: milestone.manualStatus, source: 'manual' };
  const linked = tasks.filter((t) => !isArchived(t));
  if (linked.length === 0) return { status: 'not_started', source: 'auto' };
  const done = linked.filter(isCompleted).length;
  if (done === linked.length) return { status: 'completed', source: 'auto' };
  if (linked.some((t) => isOverdue(t, now))) return { status: 'at_risk', source: 'auto' };
  const started = linked.some((t) => t.status !== 'pending_assignment' && t.status !== 'todo');
  return { status: started ? 'in_progress' : 'not_started', source: 'auto' };
}

// ─── System-wide metric bundle (dashboards) ──────────────────────

export interface OperationalMetrics {
  activeProjects: number;
  activeTasks: number;
  unassignedTasks: number;
  inProgressTasks: number;
  pendingReview: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

/**
 * One bundle every dashboard can render from. Caller passes tasks/projects
 * already scoped to what that viewer may see.
 */
export function operationalMetrics(
  tasks: Task[],
  projects: Project[],
  now: number = Date.now(),
): OperationalMetrics {
  const active = activeTasks(tasks);
  return {
    activeProjects: projects.filter((p) => p.status !== 'archived' && p.status !== 'completed').length,
    activeTasks: active.length,
    unassignedTasks: unassignedTasks(tasks).length,
    inProgressTasks: inProgressTasks(tasks).length,
    pendingReview: forReviewTasks(tasks).length,
    completedTasks: completedTasks(tasks).length,
    overdueTasks: overdueTasks(tasks, now).length,
    completionRate: completionRate(tasks).rate,
  };
}

// ─── Data-health integrity checks (plan §5) ──────────────────────
// Each row is an EXCEPTION the reconciliation/repair backlog cares about. All
// derived from the same live task/project data the dashboards use, so the panel
// can never disagree with the numbers shown elsewhere. Pure: caller passes
// already-scoped lists.

export interface DataHealthReport {
  assignedButPending: Task[];
  missingProjectLink: Task[];
  danglingProjectLink: Task[];
  overdueWithoutDueDate: Task[];
}

/**
 * Assigned-but-pending is the flagship inconsistency (§0.3): a task carrying an
 * assignee while still `pending_assignment`. After the migration + guard this
 * should be empty, so a non-zero count means a write bypassed the lifecycle.
 */
export function assignedButPending(tasks: Task[]): Task[] {
  return tasks.filter((t) => !isArchived(t) && t.status === 'pending_assignment' && !!t.assigneeId);
}

/** Active task with no canonical project link (§0.2 "Needs project link"). */
export function missingProjectLink(tasks: Task[]): Task[] {
  return tasks.filter((t) => isActive(t) && !t.linkedProjectId);
}

/** Active task whose linked_project_id resolves to no live project. */
export function danglingProjectLink(tasks: Task[], projects: Pick<Project, 'id'>[]): Task[] {
  const known = new Set(projects.map((p) => p.id));
  return tasks.filter((t) => isActive(t) && !!t.linkedProjectId && !known.has(t.linkedProjectId));
}

/**
 * Active task whose deadline can't be treated as a real calendar date — a fuzzy
 * proposal schedule ("Month 2", "Phase 1") or blank. These cannot be judged
 * overdue and silently fall out of deadline reporting, so they're surfaced.
 */
export function overdueWithoutDueDate(tasks: Task[]): Task[] {
  return tasks.filter((t) => isActive(t) && parseDueDate(t) === null);
}

/**
 * One integrity bundle for the restricted Admin data-health panel (plan §5).
 * Derived from the same live task/project lists the dashboards use, so a clean
 * board here guarantees the dashboard numbers can be trusted.
 */
export function dataHealth(
  tasks: Task[],
  projects: Pick<Project, 'id'>[],
): DataHealthReport {
  return {
    assignedButPending: assignedButPending(tasks),
    missingProjectLink: missingProjectLink(tasks),
    danglingProjectLink: danglingProjectLink(tasks, projects),
    overdueWithoutDueDate: overdueWithoutDueDate(tasks),
  };
}

// Status labels + the canonical transition table live in taskService; keep a
// display helper for health here so badges are consistent.
export const HEALTH_LABEL: Record<Health, string> = {
  on_track: 'On track',
  at_risk: 'At risk',
  delayed: 'Delayed',
  complete: 'Complete',
  no_data: 'No task data',
};

// Re-exported for callers that need the status union without importing two modules.
export type { TaskStatus };
