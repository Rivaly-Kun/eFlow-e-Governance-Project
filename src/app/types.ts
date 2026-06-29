// ─── eFlow Central Type Definitions ──────────────────────────────
// Supabase-backed types. Firebase RTDB types removed.

// ─── Roles ───────────────────────────────────────────────────────
export type UserRole =
  | 'super_admin'
  | 'dept_head'
  | 'team_leader'
  | 'employee'
  // ── legacy (still referenced by non-migrated components) ──
  | 'department_head'
  | 'executive'
  | 'legislative'
  | 'hrmo'
  | 'finance'
  | 'councilor_pad';

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

// ─── Organization (the dynamic org tree — Supabase) ──────────────
export type OrgType = 'lgu' | 'department' | 'division' | 'section' | 'unit';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  path: string;
  org_type: OrgType;
  description: string;
  head_user_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  children?: Organization[];
  member_count?: number;
}

// ─── User Profile (matches Supabase profiles table) ──────────────
export interface UserProfile {
  // Supabase columns
  id: string;
  full_name: string;
  email: string;
  employee_id: string;
  org_id: string | null;
  role: UserRole;
  skills: Record<string, boolean>;
  workload: number;
  burnout_level: 'low' | 'medium' | 'high';
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Computed client-side
  org_name?: string;
  // Legacy aliases (set at runtime by AuthContext for Phase 2 compat)
  uid: string;
  employeeId: string;
  fullName: string;
  departmentId: string;
  burnoutLevel: 'low' | 'medium' | 'high';
  status: 'active' | 'inactive';
  createdAt: number;
  lastLogin: number;
}

// ─── System Config ───────────────────────────────────────────────
export interface SystemConfig {
  key: string;
  value: string;
}

// ─── Department (legacy, for non-SuperAdmin components) ──────────
export interface Department {
  id: string;
  name: string;
  description: string;
  headUserId: string;
  employeeCount: number;
  status: 'active' | 'archived';
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
  | 'pending_assignment'
  | 'todo'
  | 'in_progress'
  | 'for_review'
  | 'completed';

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
  priority?: 'low' | 'medium' | 'high';
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
  recommendationSource?: 'llm' | 'fallback' | 'import';
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
