import React, { useMemo, useState, useCallback, useRef } from "react";
import {
  Task,
  TaskStatus,
  TaskAssignmentDetails,
  CreateTaskPayload,
  updateTaskStatus,
} from "../../services/taskService";
import { Employee } from "../../services/employeeService";
import {
  recommendTeam,
  LLMTeamRecommendation,
} from "../../services/llmService";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  GripVertical,
  Clock,
} from "lucide-react";
import type { EmployeeNotesMap } from "../../services/employeeNotesService";

interface MondayBoardProps {
  tasks: Task[];
  employees?: Employee[];
  employeeNotes?: EmployeeNotesMap;
  role: "depthead" | "employee";
  departmentFilter?: string; // Dept heads only see their department
  currentUserId?: string; // For employee view — only show assigned tasks
  onAssign?: (
    taskId: string,
    assigneeId: string,
    assigneeName: string,
    assignment?: TaskAssignmentDetails,
  ) => void;
  onExecute?: (taskId: string) => void;
  onSubmit?: (taskId: string) => void;
  onVerify?: (taskId: string, approve: boolean, feedback?: string) => void;
  onCreateTask?: (
    titleOrPayload: string | CreateTaskPayload,
    description?: string,
    deadline?: string,
  ) => void;
}

type TeamGroup = {
  key: string;
  label: string;
  members: Employee[];
  avgWorkload: number;
};

const statusColors: Record<
  TaskStatus,
  { bg: string; text: string; label: string }
> = {
  pending_assignment: {
    bg: "bg-gray-200",
    text: "text-gray-800",
    label: "Pending Assignment",
  },
  todo: { bg: "bg-blue-200", text: "text-blue-800", label: "To Do" },
  in_progress: {
    bg: "bg-yellow-200",
    text: "text-yellow-800",
    label: "In Progress",
  },
  for_review: {
    bg: "bg-purple-200",
    text: "text-purple-800",
    label: "For Review",
  },
  completed: { bg: "bg-green-200", text: "text-green-800", label: "Completed" },
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const teamKeyForEmployee = (employee: Employee) =>
  employee.department || employee.jobTitle || "general";

const teamLabelForEmployee = (employee: Employee) =>
  employee.departmentName ||
  employee.department ||
  employee.jobTitle ||
  "General Team";

export function MondayBoard({
  tasks,
  employees = [],
  employeeNotes,
  role,
  departmentFilter,
  onAssign,
  onExecute,
  onSubmit,
  onVerify,
  onCreateTask,
}: MondayBoardProps) {
  // Filter employees by department if provided
  const deptEmployees = useMemo(() => {
    if (!departmentFilter || !employees) return employees || [];
    return employees.filter((e) => e.department === departmentFilter);
  }, [employees, departmentFilter]);

  const deptEmployeesWithNotes = useMemo(
    () => deptEmployees.filter((emp) => Boolean(employeeNotes?.[emp.id])),
    [deptEmployees, employeeNotes],
  );

  const employeesForAi = useMemo(
    () =>
      deptEmployeesWithNotes.length > 0
        ? deptEmployeesWithNotes
        : deptEmployees,
    [deptEmployees, deptEmployeesWithNotes],
  );

  // Filter tasks by department if provided
  const deptTasks = useMemo(() => {
    if (!departmentFilter) return tasks;
    return tasks.filter(
      (t) =>
        !t.department ||
        t.department === departmentFilter ||
        t.status === "pending_assignment",
    );
  }, [tasks, departmentFilter]);

  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<
    "low" | "medium" | "high"
  >("medium");
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [memberDragId, setMemberDragId] = useState<string | null>(null);
  const [composerAiLoading, setComposerAiLoading] = useState(false);
  const [composerAiRecommendation, setComposerAiRecommendation] =
    useState<LLMTeamRecommendation | null>(null);
  const [composerAiOffline, setComposerAiOffline] = useState(false);
  const [composerOpen, setComposerOpen] = useState(true);
  const [teamPoolOpen, setTeamPoolOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const dragTaskRef = useRef<string | null>(null);
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<
    Record<string, LLMTeamRecommendation>
  >({});
  const [dismissedRecommendations, setDismissedRecommendations] = useState<
    Set<string>
  >(new Set());
  const [aiOfflineTaskIds, setAiOfflineTaskIds] = useState<Set<string>>(
    new Set(),
  );
  const [assignmentDrafts, setAssignmentDrafts] = useState<
    Record<string, string[]>
  >({});
  const [assignmentPanels, setAssignmentPanels] = useState<
    Record<string, boolean>
  >({});

  const teamGroups = useMemo<TeamGroup[]>(() => {
    const groups = new Map<string, TeamGroup>();

    deptEmployees.forEach((employee) => {
      const key = teamKeyForEmployee(employee);
      const label = teamLabelForEmployee(employee);
      const existing = groups.get(key);

      if (existing) {
        existing.members.push(employee);
        existing.avgWorkload = Math.round(
          existing.members.reduce(
            (total, member) => total + member.currentWorkload,
            0,
          ) / existing.members.length,
        );
        return;
      }

      groups.set(key, {
        key,
        label,
        members: [employee],
        avgWorkload: employee.currentWorkload,
      });
    });

    return Array.from(groups.values()).sort((left, right) =>
      left.label.localeCompare(right.label),
    );
  }, [deptEmployees]);

  const employeeById = useMemo<Record<string, Employee>>(
    () =>
      Object.fromEntries(
        deptEmployees.map((employee) => [employee.id, employee]),
      ) as Record<string, Employee>,
    [deptEmployees],
  );

  const dismissRecommendation = (taskId: string) => {
    setAiRecommendations((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
    setDismissedRecommendations((prev) => {
      const next = new Set(prev);
      next.add(taskId);
      return next;
    });
  };

  const pickLead = (members: Employee[]) =>
    [...members].sort(
      (left, right) => left.currentWorkload - right.currentWorkload,
    )[0];

  const resolveMembersByIds = (ids: string[]) =>
    ids
      .map((id) => employeeById[id])
      .filter((member): member is Employee => Boolean(member));

  const buildImportRecommendation = useCallback(
    (task: Task): LLMTeamRecommendation | null => {
      if (dismissedRecommendations.has(task.id)) return null;
      if (
        !task.recommendedEmployeeIds ||
        task.recommendedEmployeeIds.length === 0
      )
        return null;

      return {
        recommendedEmployeeIds: task.recommendedEmployeeIds,
        leadEmployeeId:
          task.recommendationLeadId || task.recommendedEmployeeIds[0],
        reasoning:
          task.recommendationReasoning ||
          "Imported suggestion based on proposal analysis.",
        burnoutWarning: task.burnoutWarning === true,
        source: "import",
      };
    },
    [dismissedRecommendations],
  );

  const assignTaskToMembers = (
    task: Task,
    members: Employee[],
    leadOverride?: Employee,
  ) => {
    if (!members.length || !onAssign) return;

    const lead = leadOverride ?? pickLead(members) ?? members[0];
    if (!lead) return;

    const teamId = lead.department || task.department || "custom";
    const teamName = lead.departmentName || lead.department || "Custom Team";

    onAssign(task.id, lead.id, lead.name, {
      teamId,
      teamName,
      teamMemberIds: members.map((member) => member.id),
      teamMemberNames: members.map((member) => member.name),
    });

    dismissRecommendation(task.id);
    setAssignmentPanels((prev) => ({ ...prev, [task.id]: false }));
  };

  const handleAiAssign = async (task: Task) => {
    setAiLoadingTaskId(task.id);
    // Clear any previous offline message for this task
    setAiOfflineTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    setDismissedRecommendations((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    try {
      const recommendation = await recommendTeam(
        task,
        employeesForAi,
        employeeNotes,
      );
      if (recommendation) {
        setAiRecommendations((prev) => ({
          ...prev,
          [task.id]: recommendation,
        }));
      } else {
        // AI is unavailable — show inline message
        setAiOfflineTaskIds((prev) => new Set(prev).add(task.id));
      }
    } catch (error) {
      console.error("AI Assignment error:", error);
      setAiOfflineTaskIds((prev) => new Set(prev).add(task.id));
    } finally {
      setAiLoadingTaskId(null);
    }
  };

  const handleCreate = () => {
    if (!newTaskTitle.trim() || !newTaskDeadline || !onCreateTask) return;

    const members = selectedMembers;
    const leadOverride = composerAiRecommendation?.leadEmployeeId
      ? employeeById[composerAiRecommendation.leadEmployeeId]
      : undefined;
    const lead =
      leadOverride && members.some((member) => member.id === leadOverride.id)
        ? leadOverride
        : members.length
          ? pickLead(members)
          : undefined;
    const teamId = lead?.department || departmentFilter || "";
    const teamName = lead?.departmentName || lead?.department || "Custom Team";
    const status = members.length ? "todo" : "pending_assignment";

    const payload: CreateTaskPayload = {
      title: newTaskTitle.trim(),
      description: newTaskDescription.trim() || "No description provided.",
      deadline: newTaskDeadline,
      priority: newTaskPriority,
      teamMemberIds: members.map((member) => member.id),
      teamMemberNames: members.map((member) => member.name),
      assigneeId: lead?.id,
      assigneeName: lead?.name,
      teamId,
      teamName,
      status,
    };

    onCreateTask(payload);
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskDeadline("");
    setNewTaskPriority("medium");
    setSelectedMembers([]);
    setComposerAiRecommendation(null);
    setComposerAiOffline(false);
  };

  const handleMemberToggle = (member: Employee) => {
    setSelectedMembers((prev) => {
      const exists = prev.some((m) => m.id === member.id);
      if (exists) {
        return prev.filter((m) => m.id !== member.id);
      }
      return [...prev, member];
    });
  };

  const handleMemberDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const id =
      event.dataTransfer.getData("application/eflow-employee") ||
      event.dataTransfer.getData("text/plain");
    if (!id) return;
    const member = employeeById[id];
    if (member) handleMemberToggle(member);
  };

  const handleComposerAiSuggest = async () => {
    if (!newTaskTitle.trim()) return;
    setComposerAiLoading(true);
    setComposerAiOffline(false);
    try {
      const draftTask: Task = {
        id: "draft",
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || "No description provided.",
        status: "pending_assignment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const recommendation = await recommendTeam(
        draftTask,
        employeesForAi,
        employeeNotes,
      );

      if (recommendation) {
        setComposerAiRecommendation(recommendation);
        const members = resolveMembersByIds(
          recommendation.recommendedEmployeeIds,
        );
        setSelectedMembers(members);
      } else {
        setComposerAiOffline(true);
      }
    } catch (error) {
      console.error("AI Team Suggestion error:", error);
      setComposerAiOffline(true);
    } finally {
      setComposerAiLoading(false);
    }
  };

  const getDraftMemberIds = useCallback(
    (task: Task) => {
      if (assignmentDrafts[task.id]) return assignmentDrafts[task.id];
      if (task.teamMemberIds && task.teamMemberIds.length > 0)
        return task.teamMemberIds;
      if (task.assigneeId) return [task.assigneeId];
      return [] as string[];
    },
    [assignmentDrafts],
  );

  const toggleAssignmentMember = (taskId: string, memberId: string) => {
    setAssignmentDrafts((prev) => {
      const current = prev[taskId] || [];
      const exists = current.includes(memberId);
      const nextMembers = exists
        ? current.filter((id) => id !== memberId)
        : [...current, memberId];
      return { ...prev, [taskId]: nextMembers };
    });
  };

  const applyAssignmentDraft = (task: Task) => {
    const memberIds = getDraftMemberIds(task);
    const members = resolveMembersByIds(memberIds);
    if (!members.length) return;
    assignTaskToMembers(task, members);
  };

  const handleConfirmRecommendation = (
    task: Task,
    recommendation: LLMTeamRecommendation,
  ) => {
    const members = resolveMembersByIds(recommendation.recommendedEmployeeIds);
    if (!members.length) return;

    // Use the designated lead from recommendation instead of lowest workload
    const leadOverride = recommendation.leadEmployeeId
      ? employeeById[recommendation.leadEmployeeId]
      : undefined;

    assignTaskToMembers(task, members, leadOverride);
  };

  // ─── Filter tasks by search ─────────────────────────────────────
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return deptTasks;
    const q = searchQuery.toLowerCase();
    return deptTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q)) ||
        (t.assigneeName || "").toLowerCase().includes(q) ||
        (t.teamName || "").toLowerCase().includes(q),
    );
  }, [deptTasks, searchQuery]);

  const groupTasksByStatus = () => {
    const groups: Record<TaskStatus, Task[]> = {
      pending_assignment: [],
      todo: [],
      in_progress: [],
      for_review: [],
      completed: [],
    };

    filteredTasks.forEach((task) => {
      if (groups[task.status]) groups[task.status].push(task);
    });

    return groups;
  };

  const groupedTasks = groupTasksByStatus();
  const taskGridClass =
    "grid min-w-[1100px] grid-cols-[minmax(260px,1.7fr)_minmax(320px,1.35fr)_minmax(140px,0.7fr)_minmax(150px,0.8fr)_minmax(140px,0.55fr)] gap-4";

  // ─── Drag-and-drop handlers ────────────────────────────────────
  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    dragTaskRef.current = taskId;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", taskId);
    (e.currentTarget as HTMLElement).style.opacity = "0.5";
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).style.opacity = "1";
    dragTaskRef.current = null;
    setDragOverStatus(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, status: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverStatus(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverStatus(null);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault();
      setDragOverStatus(null);
      const taskId = e.dataTransfer.getData("text/plain");
      if (!taskId) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus) return;
      try {
        await updateTaskStatus(taskId, newStatus);
      } catch (err) {
        console.error("Failed to update task status:", err);
      }
    },
    [deptTasks],
  );

  // ─── Deadline helpers ──────────────────────────────────────────
  const getDeadlineInfo = (task: Task) => {
    const dl = task.deadline || task.dueDate;
    if (!dl) return null;
    const deadline = new Date(dl);
    const now = new Date();
    const diff = deadline.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0)
      return {
        label: `${Math.abs(days)}d overdue`,
        tone: "text-red-600 bg-red-50 border-red-200",
      };
    if (days === 0)
      return {
        label: "Due today",
        tone: "text-amber-600 bg-amber-50 border-amber-200",
      };
    if (days <= 3)
      return {
        label: `${days}d left`,
        tone: "text-amber-600 bg-amber-50 border-amber-200",
      };
    return {
      label: `${days}d left`,
      tone: "text-neutral-500 bg-neutral-50 border-neutral-200",
    };
  };

  const priorityBorder: Record<string, string> = {
    high: "border-l-red-500",
    medium: "border-l-amber-400",
    low: "border-l-emerald-400",
  };

  return (
    <div className="w-full flex flex-col font-['Lexend:Regular',_sans-serif]">
      {role === "depthead" && (
        <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.9fr)]">
          <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Task Composer
                </div>
                <h2 className="text-[20px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-1">
                  Create a team task
                </h2>
                <p className="text-[12px] text-neutral-500 mt-1.5">
                  Write the brief here, then let the board route it to the right
                  people in Firebase.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setComposerOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600 transition hover:bg-neutral-50"
                >
                  {composerOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {composerOpen ? "Collapse" : "Expand"}
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!newTaskTitle.trim() || !newTaskDeadline}
                  className="rounded-xl bg-neutral-900 px-4 py-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Create Task
                </button>
              </div>
            </div>

            {composerOpen && (
              <>
                <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1.3fr)_180px]">
                  <input
                    type="text"
                    placeholder="Task title"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    className="h-[42px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                  <input
                    type="date"
                    value={newTaskDeadline}
                    onChange={(e) => setNewTaskDeadline(e.target.value)}
                    className="h-[42px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                  />
                </div>

                <textarea
                  rows={2}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add location, context, or constraints so the AI can pick the right team."
                  className="mt-3 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                />

                <div className="mt-3 grid gap-3 md:grid-cols-[200px_minmax(0,1fr)]">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                      Priority
                    </label>
                    <select
                      value={newTaskPriority}
                      onChange={(e) =>
                        setNewTaskPriority(
                          e.target.value as "low" | "medium" | "high",
                        )
                      }
                      className="h-[36px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>

                  <div className="flex items-end justify-between gap-2">
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                        Assignment
                      </div>
                      <div className="text-[12px] text-neutral-600">
                        Drag members from the Team Pool or use AI suggestions.
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleComposerAiSuggest}
                        disabled={composerAiLoading || !deptEmployees.length}
                        className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-violet-100 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {composerAiLoading ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5" />
                        )}
                        AI Suggest Team
                      </button>
                      <button
                        onClick={() => setSelectedMembers([])}
                        disabled={!selectedMembers.length}
                        className="inline-flex h-8 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                </div>

                <div
                  className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleMemberDrop}
                >
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                      Selected Members
                    </div>
                    <div className="text-[10px] text-neutral-500">
                      {selectedMembers.length} assigned
                    </div>
                  </div>
                  {selectedMembers.length === 0 ? (
                    <div className="mt-2 text-[12px] text-neutral-500">
                      Drop teammates here or click names in the Team Pool.
                    </div>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {selectedMembers.map((member) => (
                        <span
                          key={member.id}
                          className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-1 text-[10px] text-neutral-600"
                        >
                          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-['Lexend:Medium',_sans-serif] text-white">
                            {getInitials(member.name)}
                          </span>
                          {member.name}
                          <button
                            onClick={() => handleMemberToggle(member)}
                            className="text-neutral-400 hover:text-neutral-700"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {composerAiOffline && (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
                    AI suggestions are unavailable right now.
                  </div>
                )}

                {composerAiRecommendation && (
                  <div className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-violet-700">
                      AI Recommendation
                    </div>
                    <div className="mt-1 text-[12px] text-neutral-700">
                      {composerAiRecommendation.reasoning}
                    </div>
                  </div>
                )}

                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    New tasks stay pending until members are assigned.
                  </span>
                  <span>
                    {teamGroups.length} live teams · {deptEmployees.length}{" "}
                    members
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Team Pool
                </div>
                <h3 className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-1">
                  Your Subordinates
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTeamPoolOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600 transition hover:bg-neutral-50"
                >
                  {teamPoolOpen ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                  {teamPoolOpen ? "Collapse" : "Expand"}
                </button>
                <div className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500">
                  {deptEmployees.length} members
                </div>
              </div>
            </div>

            {teamPoolOpen && (
              <div className="mt-4 space-y-3">
                {teamGroups.length > 0 ? (
                  teamGroups.map((team) => {
                    return (
                      <div
                        key={team.key}
                        className="rounded-2xl border border-neutral-200 bg-white p-4"
                      >
                        <div className="flex flex-wrap gap-2">
                          {team.members.slice(0, 6).map((member) => {
                            const isSelected = selectedMembers.some(
                              (m) => m.id === member.id,
                            );
                            return (
                              <span
                                key={member.id}
                                draggable
                                onDragStart={(event) => {
                                  setMemberDragId(member.id);
                                  event.dataTransfer.setData(
                                    "application/eflow-employee",
                                    member.id,
                                  );
                                  event.dataTransfer.setData(
                                    "text/plain",
                                    member.id,
                                  );
                                }}
                                onDragEnd={() => setMemberDragId(null)}
                                onClick={() => handleMemberToggle(member)}
                                className={`group relative inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-[12px] cursor-move transition-all ${isSelected ? "border-violet-300 bg-violet-50 text-violet-700 shadow-md ring-2 ring-violet-200" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300 hover:shadow-md"} ${memberDragId === member.id ? "opacity-60 scale-95" : ""}`}
                                title={`${member.name} · ${member.jobTitle} · Workload: ${member.currentWorkload}%`}
                              >
                                <span
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-['Lexend:SemiBold',_sans-serif] text-white ${member.currentWorkload >= 80 ? "bg-red-500" : member.currentWorkload >= 60 ? "bg-amber-500" : "bg-neutral-900"}`}
                                >
                                  {getInitials(member.name)}
                                </span>
                                <div className="flex flex-col gap-0">
                                  <span className="font-['Lexend:SemiBold',_sans-serif]">
                                    {member.name}
                                  </span>
                                  <span className="text-[9px] opacity-70">
                                    {member.jobTitle}
                                  </span>
                                </div>
                              </span>
                            );
                          })}
                          {team.members.length > 6 && (
                            <span className="px-2 py-1 text-[10px] text-neutral-500">
                              +{team.members.length - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4 text-[12px] text-neutral-500">
                    Waiting for Firebase employees to load.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search/filter bar */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <h2 className="text-[20px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
          Task Board
        </h2>
        <div className="relative flex items-center bg-white border border-neutral-200 rounded-xl h-[36px] w-[280px] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-200">
          <Search size={14} className="text-neutral-400 ml-3" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, teams, tags…"
            className="flex-1 bg-transparent px-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="pr-2.5 text-neutral-400 hover:text-neutral-700"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl shadow-sm border border-neutral-200 bg-white">
        <div
          className={`${taskGridClass} border-b border-neutral-200 bg-neutral-50 px-4 py-3 font-semibold text-neutral-600 text-sm sticky top-0 z-10`}
        >
          <div>Task Name</div>
          <div>Team / Lead</div>
          <div className="text-center">Status</div>
          <div>Deadline</div>
          <div className="text-center">Actions</div>
        </div>

        {Object.entries(groupedTasks).map(([status, items]) => (
          <div
            key={status}
            className={`mb-4 transition-colors ${dragOverStatus === status ? "bg-blue-50/60" : ""}`}
            onDragOver={(e) => handleDragOver(e, status)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, status as TaskStatus)}
          >
            <div className="px-4 py-2 bg-neutral-100 font-medium text-sm text-neutral-700 flex items-center border-y border-neutral-200">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${statusColors[status as TaskStatus].bg}`}
              />
              {statusColors[status as TaskStatus].label} ({items.length})
              {dragOverStatus === status && (
                <span className="ml-2 text-[10px] text-blue-500 animate-pulse">
                  Drop here
                </span>
              )}
            </div>

            {items.map((task) => {
              const recommendation =
                aiRecommendations[task.id] || buildImportRecommendation(task);
              const recommendedMembers = recommendation
                ? resolveMembersByIds(recommendation.recommendedEmployeeIds)
                : [];
              const draftMemberIds = getDraftMemberIds(task);
              const assignedMembers = resolveMembersByIds(draftMemberIds);
              const teamMembers =
                task.teamMemberNames && task.teamMemberNames.length > 0
                  ? task.teamMemberNames
                  : assignedMembers.map((member) => member.name);
              const teamLead =
                task.assigneeName ||
                assignedMembers[0]?.name ||
                teamMembers[0] ||
                "Unassigned";
              const teamLabel =
                task.teamName ||
                assignedMembers[0]?.departmentName ||
                assignedMembers[0]?.department ||
                "Custom Team";
              const canAutoAssign =
                role === "depthead" &&
                (!task.assigneeId || task.status === "pending_assignment");
              const dlInfo = getDeadlineInfo(task);
              const pBorder =
                priorityBorder[task.priority || ""] || "border-l-neutral-200";

              return (
                <React.Fragment key={task.id}>
                  <div
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={`${taskGridClass} border-b border-neutral-100 border-l-[3px] ${pBorder} px-4 py-3 items-start text-sm hover:bg-neutral-50/60 transition cursor-grab active:cursor-grabbing`}
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <GripVertical
                          size={12}
                          className="text-neutral-300 shrink-0"
                        />
                        <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">
                          {task.title}
                        </span>
                        {task.priority && (
                          <span
                            className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full font-['Lexend:Medium',_sans-serif] ${task.priority === "high" ? "bg-red-100 text-red-700" : task.priority === "medium" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            {task.priority}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <div className="mt-1 text-[11px] text-neutral-500 leading-relaxed">
                          {task.description}
                        </div>
                      )}
                      {task.tags && task.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {task.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-500"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                            Team / Lead
                          </div>
                          <div className="mt-0.5 text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                            {teamLabel}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            Lead · {teamLead}
                          </div>
                        </div>
                        {canAutoAssign && (
                          <button
                            onClick={() => handleAiAssign(task)}
                            disabled={
                              aiLoadingTaskId === task.id ||
                              !deptEmployees.length
                            }
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-violet-100 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              deptEmployees.length
                                ? "AI Auto Assign"
                                : "Waiting for employee data"
                            }
                          >
                            {aiLoadingTaskId === task.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Sparkles className="h-3.5 w-3.5" />
                            )}
                            AI Auto Assign
                          </button>
                        )}
                      </div>

                      {role === "depthead" && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] uppercase tracking-wider text-neutral-400">
                              Assign members
                            </label>
                            <button
                              onClick={() =>
                                setAssignmentPanels((prev) => ({
                                  ...prev,
                                  [task.id]: !prev[task.id],
                                }))
                              }
                              className="text-[10px] text-neutral-500 hover:text-neutral-800"
                            >
                              {assignmentPanels[task.id] ? "Hide" : "Edit"}
                            </button>
                          </div>

                          {assignmentPanels[task.id] && (
                            <div className="mt-2 rounded-xl border border-neutral-200 bg-white p-2">
                              <div className="max-h-[160px] space-y-1 overflow-y-auto">
                                {deptEmployees.map((member) => {
                                  const selected = draftMemberIds.includes(
                                    member.id,
                                  );
                                  return (
                                    <label
                                      key={member.id}
                                      className="flex items-center gap-2 text-[11px] text-neutral-700"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selected}
                                        onChange={() =>
                                          toggleAssignmentMember(
                                            task.id,
                                            member.id,
                                          )
                                        }
                                      />
                                      <span className="flex items-center gap-2">
                                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-['Lexend:Medium',_sans-serif] text-white">
                                          {getInitials(member.name)}
                                        </span>
                                        {member.name}
                                      </span>
                                    </label>
                                  );
                                })}
                              </div>
                              <button
                                onClick={() => applyAssignmentDraft(task)}
                                disabled={!draftMemberIds.length}
                                className="mt-2 w-full rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-['Lexend:Medium',_sans-serif] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                Apply Members
                              </button>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {teamMembers.slice(0, 3).map((memberName) => (
                          <span
                            key={memberName}
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-1 text-[10px] text-neutral-600"
                          >
                            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-['Lexend:Medium',_sans-serif] text-white">
                              {getInitials(memberName)}
                            </span>
                            {memberName}
                          </span>
                        ))}
                        {teamMembers.length > 3 && (
                          <span className="px-2 py-1 text-[10px] text-neutral-500">
                            +{teamMembers.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-center">
                      <span
                        className={`inline-flex w-full items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold ${statusColors[task.status].bg} ${statusColors[task.status].text}`}
                      >
                        {statusColors[task.status].label}
                      </span>
                    </div>

                    <div className="text-neutral-600">
                      <div className="text-[11px] uppercase tracking-wider text-neutral-400">
                        Deadline
                      </div>
                      <div className="mt-1 text-[13px] text-neutral-800">
                        {task.deadline || task.dueDate || "-"}
                      </div>
                      {dlInfo && task.status !== "completed" && (
                        <div
                          className={`mt-1 inline-flex items-center gap-1 text-[10px] font-['Lexend:Medium',_sans-serif] px-2 py-0.5 rounded-full border ${dlInfo.tone}`}
                        >
                          <Clock size={10} />
                          {dlInfo.label}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center gap-1.5">
                      {role === "depthead" && task.status === "for_review" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              if (onVerify) onVerify(task.id, true);
                            }}
                            className="rounded-lg bg-green-500 px-2.5 py-1 text-xs text-white transition hover:bg-green-600"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const msg = prompt("Reason for rejection:");
                              if (onVerify)
                                onVerify(task.id, false, msg || "Needs rework");
                            }}
                            className="rounded-lg bg-red-500 px-2.5 py-1 text-xs text-white transition hover:bg-red-600"
                          >
                            Reject
                          </button>
                        </div>
                      )}

                      {role === "employee" && task.status === "todo" && (
                        <button
                          onClick={async () => {
                            if (onExecute) onExecute(task.id);
                            else await updateTaskStatus(task.id, "in_progress");
                          }}
                          className="w-full rounded-lg bg-blue-500 px-3 py-1 text-xs text-white transition hover:bg-blue-600"
                        >
                          Start Work
                        </button>
                      )}
                      {role === "employee" && task.status === "in_progress" && (
                        <button
                          onClick={async () => {
                            if (onSubmit) onSubmit(task.id);
                            else await updateTaskStatus(task.id, "for_review");
                          }}
                          className="w-full rounded-lg bg-purple-500 px-3 py-1 text-xs text-white transition hover:bg-purple-600"
                        >
                          Submit for Review
                        </button>
                      )}

                      {task.status === "completed" && task.auditHash && (
                        <div
                          className="w-full cursor-help rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-[10px] text-neutral-500 truncate"
                          title={task.auditHash}
                        >
                          🔒 {task.auditHash.substring(0, 8)}...
                        </div>
                      )}
                      {task.feedback && task.status !== "completed" && (
                        <div className="w-full text-center text-[10px] italic text-red-500">
                          Note: {task.feedback}
                        </div>
                      )}
                    </div>
                  </div>

                  {aiOfflineTaskIds.has(task.id) && (
                    <div className="mx-4 mb-3 rounded-2xl border border-red-200 bg-red-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl border border-red-200 bg-white p-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                        </div>
                        <div className="flex-1">
                          <div className="text-[11px] uppercase tracking-wider text-red-700">
                            AI Recommendation Unavailable
                          </div>
                          <div className="mt-1 text-[13px] font-['Lexend:SemiBold',_sans-serif] text-red-900">
                            AI is currently offline or unavailable
                          </div>
                          <p className="mt-2 text-[11px] leading-relaxed text-red-800">
                            Please contact your IT department for help with this
                            feature.
                          </p>
                          <div className="mt-3 flex">
                            <button
                              onClick={() =>
                                setAiOfflineTaskIds((prev) => {
                                  const next = new Set(prev);
                                  next.delete(task.id);
                                  return next;
                                })
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-50"
                            >
                              <X className="h-3 w-3" /> Dismiss
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {recommendation && (
                    <div className="mx-4 mb-3 rounded-2xl border border-violet-200 bg-violet-50 p-4 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="rounded-xl border border-violet-200 bg-white p-2">
                          <Sparkles className="h-4 w-4 text-violet-600" />
                        </div>

                        <div className="flex-1">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div>
                              <div className="text-[11px] uppercase tracking-wider text-violet-700">
                                {recommendation.source === "import"
                                  ? "Imported Suggestion"
                                  : "AI Recommendation"}
                              </div>
                              <div className="mt-0.5 text-[13px] font-['Lexend:SemiBold',_sans-serif] text-violet-950">
                                {recommendedMembers.length
                                  ? `${recommendedMembers.length} member team`
                                  : "Recommended team"}
                              </div>
                            </div>
                            {recommendation.burnoutWarning && (
                              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2.5 py-1 text-[10px] font-medium text-amber-700">
                                <AlertCircle className="h-3 w-3" /> Burnout
                                warning
                              </span>
                            )}
                          </div>

                          <div className="mt-3 rounded-xl border border-violet-200 bg-white p-3">
                            <div className="text-[10px] uppercase tracking-wider text-violet-700">
                              Recommended Team
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {recommendedMembers.map((member) => (
                                <span
                                  key={member.id}
                                  className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-1 text-[10px] text-neutral-600"
                                >
                                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[9px] font-['Lexend:Medium',_sans-serif] text-white">
                                    {getInitials(member.name)}
                                  </span>
                                  {member.name}
                                </span>
                              ))}
                              {recommendedMembers.length === 0 && (
                                <span className="text-[11px] text-neutral-500">
                                  No members available.
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="mt-3 text-[11px] leading-relaxed text-violet-800">
                            {recommendation.reasoning}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <button
                              onClick={() =>
                                handleConfirmRecommendation(
                                  task,
                                  recommendation,
                                )
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-violet-700"
                            >
                              <Check className="h-3 w-3" /> Confirm Assignment
                            </button>
                            <button
                              onClick={() => dismissRecommendation(task.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50"
                            >
                              <X className="h-3 w-3" /> Reject
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </React.Fragment>
              );
            })}

            {items.length === 0 && (
              <div className="bg-white px-4 py-3 text-sm italic text-neutral-400">
                No items in this group.
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
