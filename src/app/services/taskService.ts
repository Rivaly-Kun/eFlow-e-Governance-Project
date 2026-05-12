import { ref, onValue, push, update, set, get } from "firebase/database";
import { database } from "../../firebase";
import { EMPLOYEE_SEED_BY_ID, TASK_SEED, getDepartmentLabel } from "./eflowSeedData";

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

export interface Task {
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
}

const TASKS_PATH = "tasks";

const TASK_STATUS_VALUES: TaskStatus[] = ["pending_assignment", "todo", "in_progress", "for_review", "completed"];

const isTaskStatus = (value: unknown): value is TaskStatus =>
  typeof value === "string" && TASK_STATUS_VALUES.includes(value as TaskStatus);

const normalizeStringArray = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];

const normalizeTaskRecord = (id: string, record: Record<string, unknown>): Task => {
  const assigneeId = typeof record.assigneeId === "string" ? record.assigneeId : typeof record.assignedTo === "string" ? record.assignedTo : undefined;
  const teamId = typeof record.teamId === "string" ? record.teamId : typeof record.department === "string" ? record.department : undefined;
  const teamName = typeof record.teamName === "string" ? record.teamName : getDepartmentLabel(teamId);
  const assigneeName =
    typeof record.assigneeName === "string"
      ? record.assigneeName
      : assigneeId
        ? EMPLOYEE_SEED_BY_ID[assigneeId]?.name
        : undefined;
  const teamMemberIds = normalizeStringArray(record.teamMemberIds);
  const teamMemberNames = normalizeStringArray(record.teamMemberNames);
  const status = isTaskStatus(record.status) ? record.status : "pending_assignment";
  const createdAt = typeof record.createdAt === "number" ? record.createdAt : Date.now();
  const updatedAt = typeof record.updatedAt === "number" ? record.updatedAt : createdAt;

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
    createdAt,
    updatedAt,
    auditHash: typeof record.auditHash === "string" ? record.auditHash : undefined,
    feedback: typeof record.feedback === "string" ? record.feedback : undefined,
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

export const createTask = async (title: string, description: string, deadline: string) => {
  const tasksRef = ref(database, TASKS_PATH);
  const newTaskRef = push(tasksRef);
  
  const newTask = {
    title,
    description,
    deadline,
    status: "pending_assignment",
    teamId: "",
    teamName: "",
    teamMemberIds: [],
    teamMemberNames: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(newTaskRef, newTask);
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
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
  const taskRef = ref(database, `${TASKS_PATH}/${taskId}`);
  await update(taskRef, {
    status,
    updatedAt: Date.now(),
  });
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
  } else {
    await update(taskRef, {
      status: "in_progress",
      feedback: feedback || null,
      updatedAt: Date.now(),
    });
  }
};
