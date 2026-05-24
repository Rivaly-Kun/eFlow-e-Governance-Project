import { ref, onValue, push, update, set, get, remove } from "firebase/database";
import { database } from "../../firebase";
import { EMPLOYEE_SEED_BY_ID, TASK_SEED, getDepartmentLabel } from "./eflowSeedData";
import { createNotification } from "./notificationService";

export type TaskStatus =
  | "pending_assignment"
  | "todo"
  | "in_progress"
  | "for_review"
  | "completed";

export interface TaskAssignmentDetails {
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
}

export interface TaskHierarchy {
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
}

export interface Task extends TaskHierarchy {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assigneeId?: string;
  assigneeName?: string;
  assignedTo?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  department?: string;
  priority?: "low" | "medium" | "high";
  deadline?: string;
  dueDate?: string;
  tags?: string[];
  createdAt: number;
  updatedAt: number;
  auditHash?: string;
  feedback?: string;
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  recommendationSource?: "llm" | "fallback" | "import";
  recommendationLeadId?: string;
  burnoutWarning?: boolean;
  // ─── Enhanced fields ───
  barangay?: string;
  estimatedHours?: number;
  budgetImpact?: number;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  action: string;
  details: string;
  userId?: string;
  userName?: string;
  timestamp: number;
}

const TASKS_PATH = "tasks";
const ACTIVITIES_PATH = "taskActivities";

const TASK_STATUS_VALUES: TaskStatus[] = ["pending_assignment", "todo", "in_progress", "for_review", "completed"];

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === "string" && TASK_STATUS_VALUES.includes(value as TaskStatus);

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const normalizeOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const normalizeTaskRecord = (id: string, record: Record<string, unknown>): Task => {
  const assigneeId = typeof record.assigneeId === "string" ? record.assigneeId : typeof record.assignedTo === "string" ? record.assignedTo : undefined;
  const teamId = normalizeOptionalString(record.teamId) || normalizeOptionalString(record.department);
  const teamName = normalizeOptionalString(record.teamName) || getDepartmentLabel(teamId);
  const assigneeName =
    typeof record.assigneeName === "string"
      ? record.assigneeName
      : assigneeId
        ? EMPLOYEE_SEED_BY_ID[assigneeId]?.name
        : undefined;
  const teamMemberIds = normalizeStringArray(record.teamMemberIds);
  const teamMemberNames = normalizeStringArray(record.teamMemberNames);
  const recommendedEmployeeIds = normalizeStringArray(record.recommendedEmployeeIds);
  const status = isTaskStatus(record.status) ? record.status : "pending_assignment";
  const createdAt = typeof record.createdAt === "number" ? record.createdAt : Date.now();
  const updatedAt = typeof record.updatedAt === "number" ? record.updatedAt : createdAt;
  const recommendationReasoning =
    typeof record.recommendationReasoning === "string"
      ? record.recommendationReasoning
      : undefined;
  const recommendationSource =
    typeof record.recommendationSource === "string"
      ? (record.recommendationSource as Task["recommendationSource"])
      : undefined;
  const recommendationLeadId =
    typeof record.recommendationLeadId === "string"
      ? record.recommendationLeadId
      : undefined;
  const burnoutWarning =
    typeof record.burnoutWarning === "boolean"
      ? record.burnoutWarning
      : undefined;

  return {
    id,
    title: typeof record.title === "string" ? record.title : "Untitled task",
    description: typeof record.description === "string" ? record.description : undefined,
    status,
    assigneeId,
    assigneeName,
    assignedTo: assigneeId,
    teamId,
    teamName,
    teamMemberIds: teamMemberIds.length > 0 ? teamMemberIds : assigneeId ? [assigneeId] : [],
    teamMemberNames: teamMemberNames.length > 0 ? teamMemberNames : assigneeName ? [assigneeName] : [],
    department: teamId,
    priority:
      record.priority === "low" || record.priority === "medium" || record.priority === "high"
        ? record.priority
        : undefined,
    deadline:
      typeof record.deadline === "string"
        ? record.deadline
        : typeof record.dueDate === "string"
          ? record.dueDate
          : undefined,
    dueDate: typeof record.dueDate === "string" ? record.dueDate : undefined,
    tags: normalizeStringArray(record.tags),
    recommendedEmployeeIds: recommendedEmployeeIds.length > 0 ? recommendedEmployeeIds : undefined,
    recommendationReasoning,
    recommendationSource,
    recommendationLeadId,
    burnoutWarning,
    createdAt,
    updatedAt,
    auditHash: typeof record.auditHash === "string" ? record.auditHash : undefined,
    feedback: typeof record.feedback === "string" ? record.feedback : undefined,
    barangay: typeof record.barangay === "string" ? record.barangay : undefined,
    estimatedHours: typeof record.estimatedHours === "number" ? record.estimatedHours : undefined,
    budgetImpact: typeof record.budgetImpact === "number" ? record.budgetImpact : undefined,
    proposalId: normalizeOptionalString(record.proposalId),
    proposalTitle: normalizeOptionalString(record.proposalTitle),
    programId: normalizeOptionalString(record.programId),
    programTitle: normalizeOptionalString(record.programTitle),
    projectId: normalizeOptionalString(record.projectId),
    projectTitle: normalizeOptionalString(record.projectTitle),
    activityId: normalizeOptionalString(record.activityId),
    activityTitle: normalizeOptionalString(record.activityTitle),
    activitySchedule: normalizeOptionalString(record.activitySchedule),
    hierarchyPath: normalizeOptionalString(record.hierarchyPath),
    importBatchId: normalizeOptionalString(record.importBatchId),
  };
};

let seedPromise: Promise<void> | null = null;

export const subscribeToTasks = (callback: (tasks: Task[]) => void) => {
  const tasksRef = ref(database, TASKS_PATH);
  return onValue(tasksRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const taskList = Object.entries(data).map(([key, value]) => normalizeTaskRecord(key, value as Record<string, unknown>));
      callback(taskList);
    } else {
      callback([]);
    }
  });
};

export const seedTasksIfEmpty = async () => {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const tasksRef = ref(database, TASKS_PATH);
    const snapshot = await get(tasksRef);

    if (!snapshot.exists()) {
      const taskData = Object.fromEntries(
        TASK_SEED.map((task) => {
          const assignee = EMPLOYEE_SEED_BY_ID[task.assignedTo];
          const teamName = getDepartmentLabel(task.department);

          return [task.id, {
            title: task.title,
            description: task.description,
            department: task.department,
            teamId: task.department,
            teamName,
            assigneeId: task.assignedTo,
            assigneeName: assignee?.name,
            assignedTo: task.assignedTo,
            teamMemberIds: [task.assignedTo],
            teamMemberNames: assignee ? [assignee.name] : [],
            status: task.status,
            priority: task.priority,
            dueDate: task.dueDate,
            deadline: task.dueDate,
            tags: task.tags,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }];
        })
      );

      await set(tasksRef, taskData);
      console.log("Seeded live task directory to Firebase.");
    }
  })().finally(() => {
    seedPromise = null;
  });

  return seedPromise;
};

// ─── Enhanced createTask with full field support ─────────────────
export interface CreateTaskPayload {
  title: string;
  description: string;
  deadline: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  status?: TaskStatus;
  department?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  assigneeId?: string;
  assigneeName?: string;
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  recommendationSource?: "llm" | "fallback" | "import";
  recommendationLeadId?: string;
  burnoutWarning?: boolean;
  barangay?: string;
  estimatedHours?: number;
  budgetImpact?: number;
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
}

export interface UpdateTaskPayload {
  title?: string;
  description?: string;
  deadline?: string;
  priority?: "low" | "medium" | "high";
  tags?: string[];
  status?: TaskStatus;
  department?: string;
  teamId?: string;
  teamName?: string;
  teamMemberIds?: string[];
  teamMemberNames?: string[];
  assigneeId?: string;
  assigneeName?: string;
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
}

export const createTask = async (
  titleOrPayload: string | CreateTaskPayload,
  description?: string,
  deadline?: string
) => {
  const tasksRef = ref(database, TASKS_PATH);
  const newTaskRef = push(tasksRef);
  const taskId = newTaskRef.key!;

  let newTask: Record<string, unknown>;

  if (typeof titleOrPayload === "object") {
    const p = titleOrPayload;
    newTask = {
      title: p.title,
      description: p.description,
      deadline: p.deadline,
      dueDate: p.deadline,
      status: p.status || "pending_assignment",
      priority: p.priority || "medium",
      tags: p.tags || [],
      department: p.department || p.teamId || "",
      teamId: p.teamId || p.department || "",
      teamName: p.teamName || "",
      teamMemberIds: p.teamMemberIds || [],
      teamMemberNames: p.teamMemberNames || [],
      assigneeId: p.assigneeId || "",
      assigneeName: p.assigneeName || "",
      barangay: p.barangay || "",
      estimatedHours: p.estimatedHours || 0,
      budgetImpact: p.budgetImpact || 0,
      projectId: p.projectId || "",
      proposalId: p.proposalId || "",
      proposalTitle: p.proposalTitle || "",
      programId: p.programId || "",
      programTitle: p.programTitle || "",
      projectTitle: p.projectTitle || "",
      activityId: p.activityId || "",
      activityTitle: p.activityTitle || "",
      activitySchedule: p.activitySchedule || "",
      hierarchyPath: p.hierarchyPath || "",
      importBatchId: p.importBatchId || "",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (p.recommendedEmployeeIds && p.recommendedEmployeeIds.length > 0) {
      newTask.recommendedEmployeeIds = p.recommendedEmployeeIds;
    }
    if (p.recommendationReasoning) {
      newTask.recommendationReasoning = p.recommendationReasoning;
    }
    if (p.recommendationSource) {
      newTask.recommendationSource = p.recommendationSource;
    }
    if (p.recommendationLeadId) {
      newTask.recommendationLeadId = p.recommendationLeadId;
    }
    if (typeof p.burnoutWarning === "boolean") {
      newTask.burnoutWarning = p.burnoutWarning;
    }
  } else {
    // Legacy 3-arg call
    newTask = {
      title: titleOrPayload,
      description: description || "",
      deadline: deadline || "",
      dueDate: deadline || "",
      status: "pending_assignment",
      teamId: "",
      teamName: "",
      teamMemberIds: [],
      teamMemberNames: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  await set(newTaskRef, newTask);

  // Create activity log
  await logTaskActivity(taskId, "created", `Task "${newTask.title}" created`);
};

export const assignTask = async (taskId: string, assigneeId: string, assigneeName: string, assignment?: TaskAssignmentDetails) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);
  const updatePayload: Record<string, unknown> = {
    assigneeId,
    assigneeName,
    status: "todo",
    updatedAt: Date.now(),
  };

  if (assignment?.teamId) updatePayload.teamId = assignment.teamId;
  if (assignment?.teamName) updatePayload.teamName = assignment.teamName;
  if (assignment?.teamMemberIds) updatePayload.teamMemberIds = assignment.teamMemberIds;
  if (assignment?.teamMemberNames) updatePayload.teamMemberNames = assignment.teamMemberNames;

  await update(taskRef, updatePayload);

  // Activity log
  await logTaskActivity(taskId, "assigned", `Assigned to ${assigneeName} (${assignment?.teamName || ""})`);

  // Notify assignee
  try {
    await createNotification(assigneeId, {
      type: "assignment",
      title: "New Task Assignment",
      message: `You have been assigned a new task`,
      taskId,
    });
  } catch {
    // Non-critical
  }
};

export const updateTask = async (
  taskId: string,
  payload: UpdateTaskPayload,
) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);
  const updatePayload: Record<string, unknown> = { updatedAt: Date.now() };
  const changedKeys: string[] = [];

  const applyStringField = (key: keyof UpdateTaskPayload, targetKey = key) => {
    if (!(key in payload)) return;
    updatePayload[targetKey as string] = payload[key] ?? "";
    changedKeys.push(targetKey as string);
  };

  applyStringField("title");
  applyStringField("description");
  applyStringField("department");
  applyStringField("teamId");
  applyStringField("teamName");
  applyStringField("assigneeId");
  applyStringField("assigneeName");
  applyStringField("recommendationReasoning");
  applyStringField("recommendationLeadId");
  applyStringField("proposalId");
  applyStringField("proposalTitle");
  applyStringField("programId");
  applyStringField("programTitle");
  applyStringField("projectId");
  applyStringField("projectTitle");
  applyStringField("activityId");
  applyStringField("activityTitle");
  applyStringField("activitySchedule");
  applyStringField("hierarchyPath");
  applyStringField("importBatchId");

  if ("deadline" in payload) {
    const value = payload.deadline ?? "";
    updatePayload.deadline = value;
    updatePayload.dueDate = value;
    changedKeys.push("deadline", "dueDate");
  }
  if ("priority" in payload && payload.priority) {
    updatePayload.priority = payload.priority;
    changedKeys.push("priority");
  }
  if ("status" in payload && payload.status) {
    updatePayload.status = payload.status;
    changedKeys.push("status");
  }
  if ("recommendationSource" in payload && payload.recommendationSource) {
    updatePayload.recommendationSource = payload.recommendationSource;
    changedKeys.push("recommendationSource");
  }
  if ("burnoutWarning" in payload && typeof payload.burnoutWarning === "boolean") {
    updatePayload.burnoutWarning = payload.burnoutWarning;
    changedKeys.push("burnoutWarning");
  }
  if ("tags" in payload && Array.isArray(payload.tags)) {
    updatePayload.tags = payload.tags;
    changedKeys.push("tags");
  }
  if ("teamMemberIds" in payload && Array.isArray(payload.teamMemberIds)) {
    updatePayload.teamMemberIds = payload.teamMemberIds;
    changedKeys.push("teamMemberIds");
  }
  if ("teamMemberNames" in payload && Array.isArray(payload.teamMemberNames)) {
    updatePayload.teamMemberNames = payload.teamMemberNames;
    changedKeys.push("teamMemberNames");
  }
  if (
    "recommendedEmployeeIds" in payload &&
    Array.isArray(payload.recommendedEmployeeIds)
  ) {
    updatePayload.recommendedEmployeeIds = payload.recommendedEmployeeIds;
    changedKeys.push("recommendedEmployeeIds");
  }

  if (changedKeys.length === 0) return;

  await update(taskRef, updatePayload);
  await logTaskActivity(
    taskId,
    "updated",
    `Task updated: ${Array.from(new Set(changedKeys)).join(", ")}`,
  );
};

export const deleteTask = async (taskId: string) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);
  const snapshot = await get(taskRef);
  const taskTitle =
    snapshot.exists() && typeof snapshot.val()?.title === "string"
      ? snapshot.val().title
      : taskId;

  await remove(taskRef);
  await remove(ref(database, `${ACTIVITIES_PATH}/${taskId}`));

  console.info(`Task deleted: ${taskTitle}`);
};

// ─── Reassign with activity logging ──────────────────────────────
export const reassignTask = async (
  taskId: string,
  newAssigneeId: string,
  newAssigneeName: string,
  newTeam?: TaskAssignmentDetails,
  oldAssigneeName?: string
) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);
  const updatePayload: Record<string, unknown> = {
    assigneeId: newAssigneeId,
    assigneeName: newAssigneeName,
    updatedAt: Date.now(),
  };

  if (newTeam?.teamId) updatePayload.teamId = newTeam.teamId;
  if (newTeam?.teamName) updatePayload.teamName = newTeam.teamName;
  if (newTeam?.teamMemberIds) updatePayload.teamMemberIds = newTeam.teamMemberIds;
  if (newTeam?.teamMemberNames) updatePayload.teamMemberNames = newTeam.teamMemberNames;

  await update(taskRef, updatePayload);

  await logTaskActivity(
    taskId,
    "reassigned",
    `Reassigned from ${oldAssigneeName || "unassigned"} to ${newAssigneeName}`
  );

  // Notify new assignee
  try {
    await createNotification(newAssigneeId, {
      type: "reassignment",
      title: "Task Reassigned to You",
      message: `A task has been reassigned to you`,
      taskId,
    });
  } catch {
    // Non-critical
  }
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);
  await update(taskRef, {
    status,
    updatedAt: Date.now(),
  });

  const statusLabels: Record<TaskStatus, string> = {
    pending_assignment: "Pending Assignment",
    todo: "To Do",
    in_progress: "In Progress",
    for_review: "For Review",
    completed: "Completed",
  };

  await logTaskActivity(taskId, "status_change", `Status changed to "${statusLabels[status]}"`);
};

async function generateAuditHash(taskData: any): Promise<string> {
  const msgUint8 = new TextEncoder().encode(JSON.stringify(taskData));
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

export const verifyTask = async (taskId: string, approve: boolean, feedback?: string) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);

  if (approve) {
    const snapshot = await get(taskRef);
    const taskData = snapshot.val();
    const hash = await generateAuditHash({ ...taskData, approvedAt: Date.now() });

    await update(taskRef, {
      status: "completed",
      auditHash: hash,
      updatedAt: Date.now(),
      feedback: feedback || null
    });

    await logTaskActivity(taskId, "approved", "Task approved and completed");
  } else {
    await update(taskRef, {
      status: "in_progress",
      feedback: feedback || null,
      updatedAt: Date.now(),
    });

    await logTaskActivity(taskId, "rejected", `Task rejected: ${feedback || "Needs rework"}`);
  }
};

// ─── Activity Log ────────────────────────────────────────────────
export async function logTaskActivity(
  taskId: string,
  action: string,
  details: string,
  userId?: string,
  userName?: string
): Promise<void> {
  const actRef = ref(database, `${ACTIVITIES_PATH}/${taskId}`);
  await push(actRef, {
    taskId,
    action,
    details,
    userId: userId || "",
    userName: userName || "System",
    timestamp: Date.now(),
  });
}

export function subscribeToTaskActivities(
  taskId: string,
  callback: (activities: TaskActivity[]) => void
) {
  const actRef = ref(database, `${ACTIVITIES_PATH}/${taskId}`);
  return onValue(actRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    const data = snapshot.val();
    const list: TaskActivity[] = Object.entries(data)
      .map(([id, val]: [string, any]) => ({
        id,
        taskId: val.taskId || taskId,
        action: val.action || "",
        details: val.details || "",
        userId: val.userId,
        userName: val.userName,
        timestamp: val.timestamp || 0,
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
    callback(list);
  });
}
