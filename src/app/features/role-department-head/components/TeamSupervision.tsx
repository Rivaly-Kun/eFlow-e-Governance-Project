import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Users } from "lucide-react";
import type { Employee } from "../../../services/employeeService";
import { assignTask, type Task } from "../../../services/taskService";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useDeptDirectoryEmployees } from "../../employees";
import { DepartmentPageHeader as PageHeader } from "./PageHeader";

function SubordinateManager({
  employees = [],
}: {
  employees?: Employee[];
}) {
  const { tasks, loading: tasksLoading } = useTasks();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [replacementByTask, setReplacementByTask] = useState<
    Record<string, string>
  >({});
  const [reassigningIds, setReassigningIds] = useState<Set<string>>(new Set());
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    setSelectedEmployeeId((current) => {
      if (current && employees.some((employee) => employee.id === current)) {
        return current;
      }
      return undefined;
    });
  }, [employees]);

  const selectedEmployee = employees.find(
    (employee) => employee.id === selectedEmployeeId,
  );
  const activeTasks = useMemo(
    () =>
      selectedEmployee
        ? tasks.filter(
            (task) =>
              task.status !== "completed" &&
              (task.assigneeId === selectedEmployee.id ||
                (task.teamMemberIds || []).includes(selectedEmployee.id)),
          )
        : [],
    [selectedEmployee, tasks],
  );
  const statusCounts = useMemo(
    () => ({
      todo: activeTasks.filter((task) => task.status === "todo").length,
      inProgress: activeTasks.filter((task) => task.status === "in_progress")
        .length,
      forReview: activeTasks.filter((task) => task.status === "for_review")
        .length,
    }),
    [activeTasks],
  );

  const reassignTask = async (task: Task) => {
    const replacementId = replacementByTask[task.id];
    const replacement = employees.find(
      (employee) => employee.id === replacementId,
    );
    if (!replacement) return;

    setActionError("");
    setReassigningIds((current) => new Set(current).add(task.id));
    try {
      const teamMemberIds = (task.teamMemberIds || []).map((memberId) =>
        memberId === selectedEmployee?.id ? replacement.id : memberId,
      );
      const teamMemberNames = (task.teamMemberNames || []).map(
        (memberName, index) =>
          task.teamMemberIds?.[index] === selectedEmployee?.id
            ? replacement.name
            : memberName,
      );
      await assignTask(
        task.id,
        replacement.id,
        replacement.name,
        teamMemberIds.length > 0
          ? {
              teamId: task.teamId,
              teamName: task.teamName,
              teamMemberIds,
              teamMemberNames,
            }
          : undefined,
      );
      setReplacementByTask((current) => {
        const next = { ...current };
        delete next[task.id];
        return next;
      });
    } catch (error) {
      console.error("Unable to reassign task", error);
      setActionError("The task could not be reassigned. Please try again.");
    } finally {
      setReassigningIds((current) => {
        const next = new Set(current);
        next.delete(task.id);
        return next;
      });
    }
  };

  const statusLabel: Record<Task["status"], string> = {
    pending_assignment: "Awaiting assignment",
    todo: "To do",
    in_progress: "In progress",
    changes_requested: "Changes requested",
    for_review: "For review",
    completed: "Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Team Supervision"
        subtitle="Review active workloads and rebalance assignments before capacity becomes a risk"
      />
      <div className="mt-6 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-5 items-start">
        {employees.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No employees found in your department.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {employees.map((employee) => {
              const isSelected = employee.id === selectedEmployeeId;
              const isOverloaded = employee.currentWorkload > 80;
              return (
                <button
                  type="button"
                  key={employee.id}
                  onClick={() => setSelectedEmployeeId(employee.id)}
                  className={`text-left bg-white border rounded-xl p-4 transition focus:outline-none focus:ring-2 focus:ring-neutral-300 ${
                    isSelected
                      ? "border-neutral-900 shadow-sm"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[12px] font-['Lexend:SemiBold',_sans-serif] shrink-0">
                      {employee.initials || "??"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="truncate text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                            {employee.name}
                          </h4>
                          <p className="truncate text-[11px] text-neutral-500 mt-0.5">
                            {employee.jobTitle}
                          </p>
                        </div>
                        {isOverloaded && (
                          <AlertTriangle size={15} className="text-red-500 shrink-0" />
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100">
                          <div
                            className={isOverloaded ? "h-full bg-red-500" : "h-full bg-emerald-500"}
                            style={{ width: `${Math.min(employee.currentWorkload, 100)}%` }}
                          />
                        </div>
                        <span className={isOverloaded ? "text-[11px] font-medium text-red-600" : "text-[11px] font-medium text-neutral-600"}>
                          {employee.currentWorkload}%
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        <aside className="min-h-[410px] rounded-xl border border-neutral-200 bg-white p-5 xl:sticky xl:top-4">
          {!selectedEmployee ? (
            <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-center">
              <Users size={28} className="text-neutral-300 mb-3" />
              <p className="text-[13px] text-neutral-600">Select a team member</p>
              <p className="mt-1 text-[11px] text-neutral-400">Their current assignments and workload will appear here.</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 border-b border-neutral-100 pb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-11 w-11 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[13px] font-['Lexend:SemiBold',_sans-serif] shrink-0">
                    {selectedEmployee.initials || "??"}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selectedEmployee.name}</h2>
                    <p className="truncate text-[11px] text-neutral-500">{selectedEmployee.jobTitle}</p>
                  </div>
                </div>
                <span className={selectedEmployee.currentWorkload > 80 ? "rounded-full bg-red-50 px-2 py-1 text-[10px] font-medium text-red-700" : "rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700"}>
                  {selectedEmployee.currentWorkload > 80 ? "Overloaded" : "Healthy load"}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1.5">
                  <span>Workload distribution</span>
                  <span className="font-medium text-neutral-800">{selectedEmployee.currentWorkload}% capacity</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div className={selectedEmployee.currentWorkload > 80 ? "h-full bg-red-500" : "h-full bg-neutral-800"} style={{ width: `${Math.min(selectedEmployee.currentWorkload, 100)}%` }} />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {[
                    ["To do", statusCounts.todo, "bg-slate-400"],
                    ["In progress", statusCounts.inProgress, "bg-blue-500"],
                    ["For review", statusCounts.forReview, "bg-amber-500"],
                  ].map(([label, count, color]) => (
                    <div key={label as string} className="rounded-lg bg-neutral-50 p-2">
                      <div className={`h-1 rounded-full ${color as string}`} />
                      <div className="mt-1.5 text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{count as number}</div>
                      <div className="text-[9px] uppercase tracking-wide text-neutral-400">{label as string}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">Active tasks</h3>
                  <span className="text-[10px] text-neutral-400">{tasksLoading ? "Loading..." : `${activeTasks.length} open`}</span>
                </div>
                {actionError && <p className="mb-2 rounded-lg bg-red-50 px-2.5 py-2 text-[10px] text-red-700">{actionError}</p>}
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
                  {activeTasks.map((task) => {
                    const isReassigning = reassigningIds.has(task.id);
                    return (
                      <div key={task.id} className="rounded-lg border border-neutral-200 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-neutral-800">{task.title}</p>
                            <p className="mt-1 text-[10px] text-neutral-400">{statusLabel[task.status]} · {task.priority || "medium"} priority · {task.deadline || task.dueDate || "No deadline"}</p>
                          </div>
                          <span className="shrink-0 rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] text-neutral-600">{task.status.replace(/_/g, " ")}</span>
                        </div>
                        {selectedEmployee.currentWorkload > 80 && (
                          <div className="mt-2 flex gap-1.5">
                            <select
                              value={replacementByTask[task.id] || ""}
                              onChange={(event) => setReplacementByTask((current) => ({ ...current, [task.id]: event.target.value }))}
                              className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-white px-2 text-[10px] text-neutral-700 outline-none focus:border-neutral-400"
                              aria-label={`Reassign ${task.title}`}
                            >
                              <option value="">Choose a teammate</option>
                              {employees.filter((employee) => employee.id !== selectedEmployee.id).map((employee) => (
                                <option key={employee.id} value={employee.id}>{employee.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!replacementByTask[task.id] || isReassigning}
                              onClick={() => reassignTask(task)}
                              className="rounded-md bg-neutral-900 px-2 py-1.5 text-[10px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {isReassigning ? "Moving..." : "Reassign"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {!tasksLoading && activeTasks.length === 0 && (
                    <p className="rounded-lg bg-neutral-50 px-3 py-5 text-center text-[11px] text-neutral-400">No active tasks assigned.</p>
                  )}
                </div>
                {selectedEmployee.currentWorkload <= 80 && (
                  <p className="mt-3 text-[10px] leading-relaxed text-neutral-400">Reassignment controls appear automatically when workload exceeds 80%.</p>
                )}
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export function TeamSupervision() {
  const { deptEmployees, directoryLoading } = useDeptDirectoryEmployees();

  if (directoryLoading) {
    return (
      <div className="p-8 min-h-full bg-neutral-50 flex items-center justify-center">
        <div className="text-[12px] text-neutral-500">Loading team members...</div>
      </div>
    );
  }

  return <SubordinateManager employees={deptEmployees} />;
}

// ==================== EMPLOYEE INSIGHTS ====================
