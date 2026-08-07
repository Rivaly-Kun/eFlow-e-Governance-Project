import { ChevronDown, ChevronRight, Search, X } from "lucide-react";
import type { Employee } from "../../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type { Task, TaskStatus, UpdateTaskPayload } from "../../../../services/taskService";
import { getTaskMemberIds, statusMeta, uniqueValues } from "./model";
import type { MondayBoardProps } from "./model";
import { AssignmentModal } from "./AssignmentModal";
import { useListBoardController } from "./useListBoardController";
import { ListTaskRow } from "./ListTaskRow";

export function ListBoardView({
  tasks,
  role,
  employees,
  employeeNotes,
  onAssign,
  onUpdateTask,
  onVerify,
  onExecute,
  onSubmitRequest,
  onOpenTaskEditor,
  onDeleteTaskRequest,
  departmentFilter,
  currentUserId,
  currentUserName,
  onUndoRequest,
}: {
  tasks: Task[];
  role: "depthead" | "employee";
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  onAssign?: MondayBoardProps["onAssign"];
  onUpdateTask?: MondayBoardProps["onUpdateTask"];
  onVerify?: MondayBoardProps["onVerify"];
  onExecute?: MondayBoardProps["onExecute"];
  onSubmitRequest?: (task: Task) => void;
  onOpenTaskEditor?: (task: Task) => void;
  onDeleteTaskRequest?: (task: Task) => void;
  departmentFilter?: string;
  currentUserId?: string;
  currentUserName?: string;
  onUndoRequest?: (task: Task) => void;
}) {
  const {
    collapsedGroups, setCollapsedGroups, searchQuery, setSearchQuery,
    dragOverStatus, setDragOverStatus, listAssignModal, setListAssignModal,
    employeeById, filteredTasks, grouped, handleDrop,
  } = useListBoardController({ tasks, employees, role, currentUserId, currentUserName });

  return (
    <div className="w-full flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center bg-white border border-neutral-200 rounded-xl h-[36px] flex-1 max-w-[380px] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-100 transition">
          <Search size={14} className="text-neutral-400 ml-3 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, teams, tags…"
            className="flex-1 bg-transparent px-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="pr-2.5 text-neutral-400"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="text-[12px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-[20px_1fr_180px_90px_150px_120px] gap-0 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-[0.12em] text-neutral-400 sticky top-0 z-10">
          <div />
          <div className="pl-3">Task</div>
          <div>Team / Lead</div>
          <div className="text-center">Priority</div>
          <div>Due Date</div>
          <div className="text-center">Status</div>
        </div>

        {grouped.map(({ status, tasks: items }) => {
          const meta = statusMeta[status];
          const collapsed = collapsedGroups.has(status);
          return (
            <div
              key={status}
              className={`transition-colors ${dragOverStatus === status ? "bg-blue-50/40" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(status);
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, status as TaskStatus)}
            >
              {/* Group header */}
              <button
                onClick={() =>
                  setCollapsedGroups((prev) => {
                    const next = new Set(prev);
                    next.has(status) ? next.delete(status) : next.add(status);
                    return next;
                  })
                }
                className="w-full flex items-center gap-2 px-4 py-2 bg-neutral-50 border-y border-neutral-100 hover:bg-neutral-100/70 transition text-left"
              >
                {collapsed ? (
                  <ChevronRight size={12} className="text-neutral-400" />
                ) : (
                  <ChevronDown size={12} className="text-neutral-400" />
                )}
                <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                  {meta.label}
                </span>
                <span className="text-[11px] text-neutral-400">
                  ({items.length})
                </span>
                {dragOverStatus === status && (
                  <span className="ml-auto text-[10px] text-blue-500 animate-pulse">
                    Drop here
                  </span>
                )}
              </button>

              {!collapsed &&
                items.map((task) => (
                  <ListTaskRow
                    key={task.id}
                    task={task}
                    role={role}
                    employeeById={employeeById}
                    currentUserId={currentUserId}
                    onEditTeam={(selectedTask) => setListAssignModal({ open: true, task: selectedTask })}
                    onOpenTaskEditor={onOpenTaskEditor}
                    onDeleteTaskRequest={onDeleteTaskRequest}
                    onSubmitRequest={onSubmitRequest}
                    onUndoRequest={onUndoRequest}
                    onVerify={onVerify}
                    onExecute={onExecute}
                  />
                ))}

              {!collapsed && items.length === 0 && (
                <div className="px-4 py-4 text-[12px] text-neutral-300 italic text-center">
                  Drop tasks here or no tasks in this status.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* List view assign modal */}
      {listAssignModal.open && listAssignModal.task && (
        <AssignmentModal
          open={listAssignModal.open}
          onClose={() => setListAssignModal({ open: false, task: null })}
          employees={employees}
          employeeNotes={employeeNotes}
          selectedIds={getTaskMemberIds(listAssignModal.task)}
          leadId={
            listAssignModal.task.assigneeId ||
            getTaskMemberIds(listAssignModal.task)[0] ||
            null
          }
          onConfirm={async (memberIds, leadId) => {
            if (!listAssignModal.task) return;
            const normalizedMemberIds = uniqueValues(memberIds);
            const resolvedLeadId =
              (leadId && normalizedMemberIds.includes(leadId) && leadId) ||
              normalizedMemberIds[0] ||
              "";
            const lead = employees.find(
              (employee) => employee.id === resolvedLeadId,
            );
            const teamMemberNames = normalizedMemberIds
              .map(
                (id) =>
                  employees.find((employee) => employee.id === id)?.name || "",
              )
              .filter(Boolean);

            if (onUpdateTask) {
              const payload: UpdateTaskPayload = {
                teamMemberIds: normalizedMemberIds,
                teamMemberNames,
                assigneeId: resolvedLeadId,
                assigneeName: lead?.name || "",
                recommendedEmployeeIds: normalizedMemberIds,
                teamId: normalizedMemberIds.length
                  ? lead?.department ||
                    listAssignModal.task.teamId ||
                    departmentFilter ||
                    ""
                  : "",
                teamName: normalizedMemberIds.length
                  ? lead?.departmentName ||
                    lead?.department ||
                    listAssignModal.task.teamName ||
                    departmentFilter ||
                    ""
                  : "",
              };
              if (
                listAssignModal.task.status === "pending_assignment" &&
                normalizedMemberIds.length > 0
              ) {
                payload.status = "todo";
              }
              await onUpdateTask(listAssignModal.task.id, payload);
              return;
            }

            if (onAssign && lead && listAssignModal.task) {
              onAssign(listAssignModal.task.id, lead.id, lead.name, {
                teamMemberIds: normalizedMemberIds,
                teamMemberNames,
              });
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Kanban Board View ────────────────────────────────────────────
