import type { Milestone, Project, ProjectMember } from "../../services/types";
import type { Task } from "../../../tasks";
import type { TeamAttentionItem, TeamWorkflowFacts } from "../../../team-management";

export type ProjectCommandTab = "overview" | "plan" | "work" | "people" | "reviews" | "activity" | "reports";
export type ProjectScheduleHealth = "on_track" | "due_soon" | "overdue" | "at_risk" | "completed";

export interface ProjectCommandMetrics {
  progress: number;
  scheduleHealth: ProjectScheduleHealth;
  taskTotal: number;
  taskCompleted: number;
  milestoneOpen: number;
  milestoneCompleted: number;
  overdue: number;
  blocked: number;
  awaitingReview: number;
  changesRequested: number;
  activeLeadIds: string[];
  nextDeadline?: string;
  lastActivityAt?: number;
}

export interface ProjectActivityItem {
  id: string;
  kind: "project" | "status" | "progress" | "submission";
  title: string;
  detail: string;
  actorName?: string;
  occurredAt: number;
  taskId?: string;
}

export interface ProjectCommandData {
  project: Project;
  tasks: Task[];
  milestones: Milestone[];
  members: ProjectMember[];
  facts: TeamWorkflowFacts;
  attention: TeamAttentionItem[];
  metrics: ProjectCommandMetrics;
  activity: ProjectActivityItem[];
  loading: boolean;
  error: string;
  refreshMembers: () => Promise<void>;
}
