// ─── eFlow Central Type Definitions ──────────────────────────────
// All Firebase RTDB node types live here.

// ─── Roles ───────────────────────────────────────────────────────
export type UserRole =
  | "super_admin"
  | "department_head"
  | "employee"
  | "executive"
  | "legislative"
  | "hrmo"
  | "finance"
  | "councilor_pad";

export interface RolePermissions {
  manage_users: boolean;
  manage_departments: boolean;
  assign_roles: boolean;
  assign_tasks: boolean;
  manage_department: boolean;
  view_own_tasks: boolean;
}

export interface RoleDefinition {
  permissions: RolePermissions;
}

// ─── User Profile (/users/{uid}) ─────────────────────────────────
export interface UserProfile {
  uid: string;
  employeeId: string;
  fullName: string;
  email: string;
  role: UserRole;
  departmentId: string;
  skills: Record<string, boolean>;
  workload: number;
  burnoutLevel: "low" | "medium" | "high";
  status: "active" | "inactive";
  createdAt: number;
  lastLogin: number;
}

// ─── Department (/departments/{id}) ──────────────────────────────
export interface Department {
  id: string;
  name: string;
  description: string;
  headUserId: string;
  employeeCount: number;
  status: "active" | "archived";
  createdAt: number;
}

// ─── Project (/projects/{id}) ────────────────────────────────────
export interface Project {
  id: string;
  title: string;
  department: string;
  budget: number;
  lead: string;
  members: string[];
  status: string;
  startDate: string;
  endDate: string;
  barangay?: string;
}

// ─── Task (/tasks/{id}) ──────────────────────────────────────────
export type TaskStatus =
  | "pending_assignment"
  | "todo"
  | "in_progress"
  | "for_review"
  | "completed";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  department?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  priority?: "low" | "medium" | "high";
  deadline?: string;
  dueDate?: string;
  tags?: string[];
  feedback?: string;
  latestSubmission?: TaskSubmission;
  rejectionNote?: string;
  rejectedAt?: number;
  reopenReason?: string;
  reopenedAt?: number;
  reopenedById?: string;
  reopenedByName?: string;
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  recommendationSource?: "llm" | "fallback" | "import";
  recommendationLeadId?: string;
  burnoutWarning?: boolean;
  proposalId?: string;
  proposalTitle?: string;
  programId?: string;
  programTitle?: string;
  projectId?: string;
  projectTitle?: string;
  activityId?: string;
  activityTitle?: string;
  activitySchedule?: string;
  hierarchyPath?: string;
  importBatchId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface TaskSubmission {
  note: string;
  submitterId: string;
  submitterName: string;
  submittedAt: number;
  attachments: string[];
}

// ─── Dashboard Metrics (computed) ────────────────────────────────
export interface DashboardMetrics {
  totalUsers: number;
  totalDepartments: number;
  activeProjects: number;
  activeTasks: number;
  pendingTasks: number;
  completedTasks: number;
  departmentHeads: number;
  overloadedEmployees: number;
  averageWorkload: number;
}
