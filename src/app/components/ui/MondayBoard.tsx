import React, { useMemo, useState } from "react";
import {
  Task,
  TaskStatus,
  TaskAssignmentDetails,
} from "../../services/taskService";
import { Employee } from "../../services/employeeService";
import {
  recommendAssignee,
  LLMRecommendation,
} from "../../services/llmService";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

interface MondayBoardProps {
  tasks: Task[];
  employees?: Employee[];
  role: "depthead" | "employee";
  onAssign?: (
    taskId: string,
    assigneeId: string,
    assigneeName: string,
    assignment?: TaskAssignmentDetails,
  ) => void;
  onExecute?: (taskId: string) => void;
  onSubmit?: (taskId: string) => void;
  onVerify?: (taskId: string, approve: boolean, feedback?: string) => void;
  onCreateTask?: (title: string, description: string, deadline: string) => void;
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
  role,
  onAssign,
  onExecute,
  onSubmit,
  onVerify,
  onCreateTask,
}: MondayBoardProps) {
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskDeadline, setNewTaskDeadline] = useState("");
  const [composerOpen, setComposerOpen] = useState(true);
  const [teamPoolOpen, setTeamPoolOpen] = useState(true);
  const [aiLoadingTaskId, setAiLoadingTaskId] = useState<string | null>(null);
  const [aiRecommendations, setAiRecommendations] = useState<
    Record<string, LLMRecommendation>
  >({});
  const [aiOfflineTaskIds, setAiOfflineTaskIds] = useState<Set<string>>(
    new Set(),
  );

  const teamGroups = useMemo<TeamGroup[]>(() => {
    const groups = new Map<string, TeamGroup>();

    employees.forEach((employee) => {
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
  }, [employees]);

  const teamGroupById = useMemo<Record<string, TeamGroup>>(
    () =>
      Object.fromEntries(teamGroups.map((team) => [team.key, team])) as Record<
        string,
        TeamGroup
      >,
    [teamGroups],
  );

  const employeeById = useMemo<Record<string, Employee>>(
    () =>
      Object.fromEntries(
        employees.map((employee) => [employee.id, employee]),
      ) as Record<string, Employee>,
    [employees],
  );

  const clearRecommendation = (taskId: string) => {
    setAiRecommendations((prev) => {
      const next = { ...prev };
      delete next[taskId];
      return next;
    });
  };

  const resolveTeamForEmployee = (employee: Employee): TeamGroup => {
    const key = teamKeyForEmployee(employee);
    return (
      teamGroupById[key] ?? {
        key,
        label: teamLabelForEmployee(employee),
        members: [employee],
        avgWorkload: employee.currentWorkload,
      }
    );
  };

  const assignTaskToTeam = (
    task: Task,
    team: TeamGroup,
    leadOverride?: Employee,
  ) => {
    const lead =
      leadOverride ??
      [...team.members].sort(
        (left, right) => left.currentWorkload - right.currentWorkload,
      )[0] ??
      team.members[0];

    if (!lead || !onAssign) return;

    onAssign(task.id, lead.id, lead.name, {
      teamId: team.key,
      teamName: team.label,
      teamMemberIds: team.members.map((member) => member.id),
      teamMemberNames: team.members.map((member) => member.name),
    });

    clearRecommendation(task.id);
  };

  const handleAiAssign = async (task: Task) => {
    setAiLoadingTaskId(task.id);
    // Clear any previous offline message for this task
    setAiOfflineTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(task.id);
      return next;
    });
    try {
      const recommendation = await recommendAssignee(task, employees);
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

    onCreateTask(
      newTaskTitle.trim(),
      newTaskDescription.trim() || "No description provided.",
      newTaskDeadline,
    );
    setNewTaskTitle("");
    setNewTaskDescription("");
    setNewTaskDeadline("");
  };

  const handleTeamSelect = (task: Task, teamId: string) => {
    const team = teamGroupById[teamId];
    if (team) assignTaskToTeam(task, team);
  };

  const handleConfirmRecommendation = (
    task: Task,
    recommendation: LLMRecommendation,
  ) => {
    const recommendedEmployee =
      employeeById[recommendation.recommendedEmployeeId];
    if (!recommendedEmployee) return;

    assignTaskToTeam(
      task,
      resolveTeamForEmployee(recommendedEmployee),
      recommendedEmployee,
    );
  };

  const groupTasksByStatus = () => {
    const groups: Record<TaskStatus, Task[]> = {
      pending_assignment: [],
      todo: [],
      in_progress: [],
      for_review: [],
      completed: [],
    };

    tasks.forEach((task) => {
      if (groups[task.status]) groups[task.status].push(task);
    });

    return groups;
  };

  const groupedTasks = groupTasksByStatus();
  const taskGridClass =
    "grid min-w-[1100px] grid-cols-[minmax(260px,1.7fr)_minmax(320px,1.35fr)_minmax(140px,0.7fr)_minmax(150px,0.8fr)_minmax(140px,0.55fr)] gap-4";

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
                  rows={3}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Add location, context, or constraints so the AI can pick the right team."
                  className="mt-3 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-900 outline-none transition focus:border-neutral-400 focus:bg-white"
                />

                <div className="mt-3 flex items-center justify-between text-[11px] text-neutral-500">
                  <span>
                    New tasks enter the pending assignment queue until a team is
                    picked.
                  </span>
                  <span>{teamGroups.length} live teams available</span>
                </div>
              </>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.24em] text-neutral-400">
                  Team Pool
                </div>
                <h3 className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-1">
                  Live departments from Firebase
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
                  {employees.length} members
                </div>
              </div>
            </div>

            {teamPoolOpen && (
              <div className="mt-4 space-y-2.5">
                {teamGroups.length > 0 ? (
                  teamGroups.map((team) => (
                    <div
                      key={team.key}
                      className="rounded-2xl border border-neutral-200 bg-white p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                            {team.label}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            {team.members.length} teammates · avg workload{" "}
                            {team.avgWorkload}%
                          </div>
                        </div>
                        <div className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-neutral-500">
                          {team.key}
                        </div>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {team.members.slice(0, 4).map((member) => (
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
                        {team.members.length > 4 && (
                          <span className="px-2 py-1 text-[10px] text-neutral-500">
                            +{team.members.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>
                  ))
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

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-neutral-800">Task Board</h2>
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
          <div key={status} className="mb-4">
            <div className="px-4 py-2 bg-neutral-100 font-medium text-sm text-neutral-700 flex items-center border-y border-neutral-200">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${statusColors[status as TaskStatus].bg}`}
              />
              {statusColors[status as TaskStatus].label} ({items.length})
            </div>

            {items.map((task) => {
              const recommendation = aiRecommendations[task.id];
              const selectedTeamKey =
                task.teamId ||
                teamGroups.find((team) => team.label === task.teamName)?.key ||
                task.department ||
                "";
              const assignedTeam = selectedTeamKey
                ? teamGroupById[selectedTeamKey]
                : undefined;
              const teamMembers =
                task.teamMemberNames && task.teamMemberNames.length > 0
                  ? task.teamMemberNames
                  : (assignedTeam?.members.map((member) => member.name) ??
                    (task.assigneeName ? [task.assigneeName] : []));
              const teamLead =
                task.assigneeName || teamMembers[0] || "Unassigned";
              const canAutoAssign =
                role === "depthead" &&
                (!task.assigneeId || task.status === "pending_assignment");

              return (
                <React.Fragment key={task.id}>
                  <div
                    className={`${taskGridClass} border-b border-neutral-100 px-4 py-3 items-start text-sm hover:bg-neutral-50/60 transition`}
                  >
                    <div>
                      <div className="font-['Lexend:Medium',_sans-serif] text-neutral-900">
                        {task.title}
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
                            {assignedTeam?.label || task.teamName || teamLead}
                          </div>
                          <div className="text-[11px] text-neutral-500">
                            Lead · {teamLead}
                          </div>
                        </div>
                        {canAutoAssign && (
                          <button
                            onClick={() => handleAiAssign(task)}
                            disabled={
                              aiLoadingTaskId === task.id || !employees.length
                            }
                            className="inline-flex h-8 items-center justify-center gap-1 rounded-full bg-violet-100 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-violet-800 transition hover:bg-violet-200 disabled:cursor-not-allowed disabled:opacity-50"
                            title={
                              employees.length
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
                          <label className="text-[10px] uppercase tracking-wider text-neutral-400">
                            Reassign team
                          </label>
                          <select
                            className="mt-1 h-9 w-full rounded-xl border border-neutral-200 bg-white px-2.5 text-[12px] outline-none transition focus:border-neutral-400"
                            value={selectedTeamKey}
                            onChange={(e) =>
                              handleTeamSelect(task, e.target.value)
                            }
                            disabled={!teamGroups.length}
                          >
                            <option value="">Select team...</option>
                            {teamGroups.map((team) => (
                              <option key={team.key} value={team.key}>
                                {team.label}
                              </option>
                            ))}
                          </select>
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
                          onClick={() => {
                            if (onExecute) onExecute(task.id);
                          }}
                          className="w-full rounded-lg bg-blue-500 px-3 py-1 text-xs text-white transition hover:bg-blue-600"
                        >
                          Start Work
                        </button>
                      )}
                      {role === "employee" && task.status === "in_progress" && (
                        <button
                          onClick={() => {
                            if (onSubmit) onSubmit(task.id);
                          }}
                          className="w-full rounded-lg bg-purple-500 px-3 py-1 text-xs text-white transition hover:bg-purple-600"
                        >
                          Submit Proof
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
                            Please contact your IT department for help with this feature.
                          </p>
                          <div className="mt-3 flex">
                            <button
                              onClick={() => setAiOfflineTaskIds((prev) => {
                                const next = new Set(prev);
                                next.delete(task.id);
                                return next;
                              })}
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
                                AI Recommendation
                              </div>
                              <div className="mt-0.5 text-[13px] font-['Lexend:SemiBold',_sans-serif] text-violet-950">
                                {employeeById[
                                  recommendation.recommendedEmployeeId
                                ]?.name || "Unknown Employee"}
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
                            <div className="mt-1 text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                              {
                                resolveTeamForEmployee(
                                  employeeById[
                                    recommendation.recommendedEmployeeId
                                  ] ||
                                    employees[0] || {
                                      id: "",
                                      name: "",
                                      jobTitle: "",
                                      jobDescription: "",
                                      currentWorkload: 0,
                                    },
                                ).label
                              }
                            </div>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {resolveTeamForEmployee(
                                employeeById[
                                  recommendation.recommendedEmployeeId
                                ] ||
                                  employees[0] || {
                                    id: "",
                                    name: "",
                                    jobTitle: "",
                                    jobDescription: "",
                                    currentWorkload: 0,
                                  },
                              ).members.map((member) => (
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
                              onClick={() => clearRecommendation(task.id)}
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
