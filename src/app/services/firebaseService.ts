// ─── eFlow Firebase Service Layer ────────────────────────────────
// All Firebase RTDB reads/writes centralized here.
// Components should NEVER import firebase directly — use hooks or this service.

import { ref, onValue, get, set, update, push, remove, off } from "firebase/database";
import { database } from "../../firebase";
import type { UserProfile, Department, Project, Task, RoleDefinition } from "../types";

// ─── PATHS ───────────────────────────────────────────────────────
const PATHS = {
  users: "users",
  departments: "departments",
  projects: "projects",
  tasks: "tasks",
  roles: "roles",
} as const;

// ─── USER OPERATIONS ─────────────────────────────────────────────

export function subscribeToUsers(callback: (users: UserProfile[]) => void) {
  const usersRef = ref(database, PATHS.users);
  const handler = onValue(usersRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list = Object.entries(data).map(([uid, val]: [string, any]) => ({
      // Supabase properties
      id: uid,
      full_name: val.fullName || val.name || "",
      email: val.email || "",
      employee_id: val.employeeId || "",
      org_id: val.departmentId || val.department || null,
      role: val.role || "employee",
      skills: val.skills || {},
      workload: typeof val.workload === "number" ? val.workload : 0,
      burnout_level: val.burnoutLevel || "low",
      is_active: val.status !== "inactive",
      created_at: new Date(val.createdAt || 0).toISOString(),
      updated_at: new Date(val.lastLogin || 0).toISOString(),
      // Legacy aliases
      uid,
      employeeId: val.employeeId || "",
      fullName: val.fullName || val.name || "",
      departmentId: val.departmentId || val.department || "",
      burnoutLevel: val.burnoutLevel || "low",
      status: val.status || "active",
      createdAt: val.createdAt || 0,
      lastLogin: val.lastLogin || 0,
    })) as UserProfile[];
    callback(list);
  });
  return () => off(usersRef, "value", handler);
}

export async function getUserById(uid: string): Promise<UserProfile | null> {
  const snap = await get(ref(database, `${PATHS.users}/${uid}`));
  if (!snap.exists()) return null;
  const val = snap.val();
  return {
    // Supabase properties
    id: uid,
    full_name: val.fullName || val.name || "",
    email: val.email || "",
    employee_id: val.employeeId || "",
    org_id: val.departmentId || val.department || null,
    role: val.role || "employee",
    skills: val.skills || {},
    workload: typeof val.workload === "number" ? val.workload : 0,
    burnout_level: val.burnoutLevel || "low",
    is_active: val.status !== "inactive",
    created_at: new Date(val.createdAt || 0).toISOString(),
    updated_at: new Date(val.lastLogin || 0).toISOString(),
    // Legacy aliases
    uid,
    employeeId: val.employeeId || "",
    fullName: val.fullName || val.name || "",
    departmentId: val.departmentId || val.department || "",
    burnoutLevel: val.burnoutLevel || "low",
    status: val.status || "active",
    createdAt: val.createdAt || 0,
    lastLogin: val.lastLogin || 0,
  };
}

export async function createUserProfile(uid: string, data: Omit<UserProfile, "uid">) {
  await set(ref(database, `${PATHS.users}/${uid}`), { ...data });
}

export async function updateUserProfile(uid: string, partial: Partial<UserProfile>) {
  // Remove uid from partial to avoid writing it as a field
  const { uid: _, ...data } = partial as any;
  await update(ref(database, `${PATHS.users}/${uid}`), data);
}

export async function deactivateUser(uid: string) {
  await update(ref(database, `${PATHS.users}/${uid}`), { status: "inactive" });
}

export async function activateUser(uid: string) {
  await update(ref(database, `${PATHS.users}/${uid}`), { status: "active" });
}

// ─── DEPARTMENT OPERATIONS ───────────────────────────────────────

export function subscribeToDepartments(callback: (departments: Department[]) => void) {
  const deptRef = ref(database, PATHS.departments);
  const handler = onValue(deptRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    // Handle both array and object structures
    if (Array.isArray(data)) {
      const list = data.filter(Boolean).map((val: any) => ({
        id: val.id || "",
        name: val.name || "",
        description: val.description || "",
        headUserId: val.headUserId || val.headUid || "",
        employeeCount: typeof val.employeeCount === "number" ? val.employeeCount : 0,
        status: val.status || "active",
        createdAt: val.createdAt || 0,
      })) as Department[];
      callback(list);
    } else {
      const list = Object.entries(data).map(([id, val]: [string, any]) => ({
        id: val.id || id,
        name: val.name || "",
        description: val.description || "",
        headUserId: val.headUserId || val.headUid || "",
        employeeCount: typeof val.employeeCount === "number" ? val.employeeCount : 0,
        status: val.status || "active",
        createdAt: val.createdAt || 0,
      })) as Department[];
      callback(list);
    }
  });
  return () => off(deptRef, "value", handler);
}

export async function getDepartmentById(id: string): Promise<Department | null> {
  const snap = await get(ref(database, `${PATHS.departments}/${id}`));
  if (!snap.exists()) return null;
  const val = snap.val();
  return {
    id: val.id || id,
    name: val.name || "",
    description: val.description || "",
    headUserId: val.headUserId || val.headUid || "",
    employeeCount: typeof val.employeeCount === "number" ? val.employeeCount : 0,
    status: val.status || "active",
    createdAt: val.createdAt || 0,
  };
}

export async function createDepartment(data: Department) {
  await set(ref(database, `${PATHS.departments}/${data.id}`), data);
}

export async function updateDepartment(id: string, partial: Partial<Department>) {
  await update(ref(database, `${PATHS.departments}/${id}`), partial);
}

export async function archiveDepartment(id: string) {
  await update(ref(database, `${PATHS.departments}/${id}`), { status: "archived" });
}

export async function assignDepartmentHead(deptId: string, userId: string) {
  // Get current department to find old head
  const deptSnap = await get(ref(database, `${PATHS.departments}/${deptId}`));
  if (deptSnap.exists()) {
    const oldHeadId = deptSnap.val().headUserId || deptSnap.val().headUid;
    if (oldHeadId && oldHeadId !== userId) {
      // Demote old head to employee
      await update(ref(database, `${PATHS.users}/${oldHeadId}`), { role: "employee" });
    }
  }

  // Update department head
  await update(ref(database, `${PATHS.departments}/${deptId}`), { headUserId: userId });

  // Promote new head
  if (userId) {
    await update(ref(database, `${PATHS.users}/${userId}`), { role: "department_head", departmentId: deptId });
  }
}

export async function checkDepartmentCodeExists(code: string): Promise<boolean> {
  const snap = await get(ref(database, `${PATHS.departments}/${code}`));
  return snap.exists();
}

// ─── PROJECT OPERATIONS ──────────────────────────────────────────

export function subscribeToProjects(callback: (projects: Project[]) => void) {
  const projRef = ref(database, PATHS.projects);
  const handler = onValue(projRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const entries = Array.isArray(data) ? data.filter(Boolean) : Object.values(data);
    const list = entries.map((val: any, idx: number) => ({
      id: val.id || `proj_${idx}`,
      title: val.title || "",
      department: val.department || "",
      budget: typeof val.budget === "number" ? val.budget : 0,
      lead: val.lead || "",
      members: Array.isArray(val.members) ? val.members : [],
      status: val.status || "active",
      startDate: val.startDate || "",
      endDate: val.endDate || "",
      barangay: val.barangay || undefined,
    })) as Project[];
    callback(list);
  });
  return () => off(projRef, "value", handler);
}

// ─── TASK OPERATIONS ─────────────────────────────────────────────

export function subscribeToAllTasks(callback: (tasks: Task[]) => void) {
  const tasksRef = ref(database, PATHS.tasks);
  const handler = onValue(tasksRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const entries = Array.isArray(data) ? data.filter(Boolean) : Object.entries(data);
    const list = (Array.isArray(data)
      ? entries.map((val: any, idx: number) => normalizeTask(`task_${idx}`, val))
      : (entries as [string, any][]).map(([id, val]) => normalizeTask(id, val))
    );
    callback(list);
  });
  return () => off(tasksRef, "value", handler);
}

function normalizeTask(id: string, val: any): Task {
  const normalizeOptionalString = (value: unknown): string | undefined => {
    if (typeof value !== "string") return undefined;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  };

  const latestSubmissionRaw =
    val && typeof val.latestSubmission === "object" ? val.latestSubmission : null;
  const latestSubmission = latestSubmissionRaw
    ? {
        note:
          typeof latestSubmissionRaw.note === "string"
            ? latestSubmissionRaw.note
            : "",
        submitterId:
          typeof latestSubmissionRaw.submitterId === "string"
            ? latestSubmissionRaw.submitterId
            : "",
        submitterName:
          typeof latestSubmissionRaw.submitterName === "string"
            ? latestSubmissionRaw.submitterName
            : "",
        submittedAt:
          typeof latestSubmissionRaw.submittedAt === "number"
            ? latestSubmissionRaw.submittedAt
            : 0,
        attachments: Array.isArray(latestSubmissionRaw.attachments)
          ? latestSubmissionRaw.attachments.filter(
              (item: unknown): item is string => typeof item === "string",
            )
          : [],
      }
    : undefined;
  const hasLatestSubmission = Boolean(
    latestSubmission &&
      (latestSubmission.note ||
        latestSubmission.submitterId ||
        latestSubmission.submitterName ||
        latestSubmission.submittedAt ||
        latestSubmission.attachments.length > 0),
  );
  const rejectionNote =
    typeof val.rejectionNote === "string"
      ? val.rejectionNote
      : typeof val.feedback === "string"
        ? val.feedback
        : undefined;
  const rejectedAt =
    typeof val.rejectedAt === "number" ? val.rejectedAt : undefined;
  const reopenReason =
    typeof val.reopenReason === "string" && val.reopenReason.trim().length > 0
      ? val.reopenReason
      : undefined;
  const reopenedAt =
    typeof val.reopenedAt === "number" ? val.reopenedAt : undefined;
  const reopenedById =
    typeof val.reopenedById === "string" && val.reopenedById.trim().length > 0
      ? val.reopenedById
      : undefined;
  const reopenedByName =
    typeof val.reopenedByName === "string" &&
    val.reopenedByName.trim().length > 0
      ? val.reopenedByName
      : undefined;

  return {
    id,
    title: val.title || "Untitled",
    description: val.description || undefined,
    status: val.status || "pending_assignment",
    assigneeId: val.assigneeId || val.assignedTo || undefined,
    assigneeName: val.assigneeName || undefined,
    department: val.department || val.teamId || undefined,
    teamId: val.teamId || val.department || undefined,
    teamName: val.teamName || undefined,
    teamMemberIds: Array.isArray(val.teamMemberIds)
      ? val.teamMemberIds
      : [],
    teamMemberNames: Array.isArray(val.teamMemberNames)
      ? val.teamMemberNames
      : [],
    priority: val.priority || undefined,
    deadline: val.deadline || val.dueDate || undefined,
    dueDate: val.dueDate || undefined,
    tags: Array.isArray(val.tags) ? val.tags : [],
    feedback: typeof val.feedback === "string" ? val.feedback : undefined,
    latestSubmission: hasLatestSubmission ? latestSubmission : undefined,
    rejectionNote,
    rejectedAt,
    reopenReason,
    reopenedAt,
    reopenedById,
    reopenedByName,
    recommendedEmployeeIds: Array.isArray(val.recommendedEmployeeIds)
      ? val.recommendedEmployeeIds
      : [],
    recommendationReasoning:
      typeof val.recommendationReasoning === "string"
        ? val.recommendationReasoning
        : undefined,
    recommendationSource:
      val.recommendationSource === "llm" ||
      val.recommendationSource === "fallback" ||
      val.recommendationSource === "import"
        ? val.recommendationSource
        : undefined,
    recommendationLeadId:
      typeof val.recommendationLeadId === "string"
        ? val.recommendationLeadId
        : undefined,
    burnoutWarning:
      typeof val.burnoutWarning === "boolean"
        ? val.burnoutWarning
        : undefined,
    proposalId: normalizeOptionalString(val.proposalId),
    proposalTitle: normalizeOptionalString(val.proposalTitle),
    programId: normalizeOptionalString(val.programId),
    programTitle: normalizeOptionalString(val.programTitle),
    projectId: normalizeOptionalString(val.projectId),
    projectTitle: normalizeOptionalString(val.projectTitle),
    activityId: normalizeOptionalString(val.activityId),
    activityTitle: normalizeOptionalString(val.activityTitle),
    activitySchedule: normalizeOptionalString(val.activitySchedule),
    hierarchyPath: normalizeOptionalString(val.hierarchyPath),
    importBatchId: normalizeOptionalString(val.importBatchId),
    createdAt: val.createdAt || 0,
    updatedAt: val.updatedAt || val.createdAt || 0,
  };
}

// ─── ROLE OPERATIONS ─────────────────────────────────────────────

export function subscribeToRoles(callback: (roles: Record<string, RoleDefinition>) => void) {
  const rolesRef = ref(database, PATHS.roles);
  const handler = onValue(rolesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }
    callback(snapshot.val());
  });
  return () => off(rolesRef, "value", handler);
}

// ─── DEPARTMENT EMPLOYEE COUNT ───────────────────────────────────

export async function incrementDeptEmployeeCount(deptId: string, delta: number) {
  const snap = await get(ref(database, `${PATHS.departments}/${deptId}/employeeCount`));
  const current = snap.exists() ? (snap.val() as number) : 0;
  await set(ref(database, `${PATHS.departments}/${deptId}/employeeCount`), Math.max(0, current + delta));
}
