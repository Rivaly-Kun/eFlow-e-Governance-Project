import { useMemo, useState } from "react";
import { Archive, BarChart2, Columns, Layers, List } from "lucide-react";
import { uniqueValues, type BoardView, type MondayBoardProps } from "./model";
import { AssignmentModal } from "./AssignmentModal";
import { TaskEditorModal } from "./TaskEditorModal";
import { SubmitForReviewModal, UndoCompletedModal } from "./TaskSubmissionModals";
import { HierarchyBoardView } from "./HierarchyBoardView";
import { KanbanBoardView } from "./KanbanBoardView";
import { ListBoardView } from "./ListBoardView";
import { TimelineView } from "./TimelineView";
import { useMondayBoardController } from "./useMondayBoardController";

export function MondayBoard({
  tasks,
  employees = [],
  allEmployees = [],
  employeeNotes,
  role,
  departmentFilter,
  currentUserId,
  currentUserName,
  onAssign,
  onExecute,
  onSubmit,
  onVerify,
  onUpdateTask,
  onDeleteTask,
}: MondayBoardProps) {
  const [recordScope, setRecordScope] = useState<"active" | "archived">("active");
  const scopedTasks = useMemo(
    () => tasks.filter((task) => recordScope === "archived" ? Boolean(task.archivedAt) : !task.archivedAt),
    [recordScope, tasks],
  );
  // ── View & composer state ─────────────────────────────────────
  const controller = useMondayBoardController({
    tasks: scopedTasks, employees, allEmployees, employeeNotes, role, departmentFilter,
    currentUserId, currentUserName, onAssign, onExecute, onSubmit, onVerify,
    onUpdateTask, onDeleteTask,
  });
  const {
    boardView, setBoardView,
    deptEmployees, employeeById, taskEditorOpen, taskEditorDraft,
    setTaskEditorDraft, taskEditorSaving, taskEditorError,
    taskEditorAssignOpen, setTaskEditorAssignOpen, submitModalOpen,
    submitModalTask, submitNote, setSubmitNote, submitFiles, setSubmitFiles,
    submitError, submitSaving, undoModalOpen, undoModalTask, undoReason,
    setUndoReason, undoError, undoSaving, deptTasks, editingTask,
    openTaskEditor, closeTaskEditor, openSubmitModal, closeSubmitModal,
    handleRemoveAttachment, handleSubmitConfirm, openUndoModal, closeUndoModal,
    handleUndoConfirm, handleTaskEditorSave, handleTaskDeleteRequest,
    handleTaskCancelRequest, handleTaskArchiveRequest, handleTaskEditorDelete,
  } = controller;

  return (
    <div className="w-full flex flex-col gap-5 font-['Lexend:Regular',_sans-serif]">

      {/* ─── Task Board ──────────────────────────────────────────── */}
      <div>
        {/* View switcher header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-[11.5px] text-neutral-500">
            <Archive size={13} />
            <select value={recordScope} onChange={(event) => setRecordScope(event.target.value as typeof recordScope)} className="h-8 rounded-lg border border-neutral-200 bg-white px-2.5 text-[11px] text-neutral-700 outline-none">
              <option value="active">Active work</option>
              <option value="archived">Archived work</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-xl p-0.5">
            {(
              [
                {
                  id: "list" as BoardView,
                  icon: <List size={13} />,
                  label: "List",
                },
                {
                  id: "kanban" as BoardView,
                  icon: <Columns size={13} />,
                  label: "Kanban",
                },
                {
                  id: "timeline" as BoardView,
                  icon: <BarChart2 size={13} />,
                  label: "Timeline",
                },
                {
                  id: "hierarchy" as BoardView,
                  icon: <Layers size={13} />,
                  label: "Hierarchy",
                },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => setBoardView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition ${
                  boardView === v.id
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>
          </div>
        </div>

        {boardView === "list" && (
          <ListBoardView
            tasks={deptTasks}
            role={role}
            employees={deptEmployees}
            employeeNotes={employeeNotes}
            onAssign={onAssign}
            onUpdateTask={onUpdateTask}
            onVerify={onVerify}
            onExecute={onExecute}
            onSubmitRequest={openSubmitModal}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
            onDeleteTaskRequest={
              role === "depthead" ? handleTaskDeleteRequest : undefined
            }
            onArchiveTaskRequest={role === "depthead" ? handleTaskArchiveRequest : undefined}
            onCancelTaskRequest={role === "depthead" ? handleTaskCancelRequest : undefined}
            departmentFilter={departmentFilter}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onUndoRequest={role === "depthead" ? openUndoModal : undefined}
          />
        )}
        {boardView === "kanban" && (
          <KanbanBoardView
            tasks={deptTasks}
            employees={deptEmployees}
            role={role}
            onVerify={onVerify}
            onExecute={onExecute}
            onSubmitRequest={openSubmitModal}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
            onDeleteTaskRequest={
              role === "depthead" ? handleTaskDeleteRequest : undefined
            }
            onArchiveTaskRequest={role === "depthead" ? handleTaskArchiveRequest : undefined}
            onCancelTaskRequest={role === "depthead" ? handleTaskCancelRequest : undefined}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onUndoRequest={role === "depthead" ? openUndoModal : undefined}
          />
        )}
        {boardView === "timeline" && (
          <TimelineView
            tasks={deptTasks}
            role={role}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
          />
        )}
        {boardView === "hierarchy" && (
          <HierarchyBoardView
            tasks={deptTasks}
            employees={deptEmployees}
            role={role}
            onVerify={onVerify}
            onExecute={onExecute}
            onSubmitRequest={openSubmitModal}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
            onDeleteTaskRequest={
              role === "depthead" ? handleTaskDeleteRequest : undefined
            }
            onArchiveTaskRequest={role === "depthead" ? handleTaskArchiveRequest : undefined}
            onCancelTaskRequest={role === "depthead" ? handleTaskCancelRequest : undefined}
            currentUserId={currentUserId}
            onUndoRequest={role === "depthead" ? openUndoModal : undefined}
          />
        )}
      </div>

      {/* ─── Assignment Modal — PDF draft tasks ──────────────────── */}
      <TaskEditorModal
        open={taskEditorOpen}
        task={editingTask}
        draft={taskEditorDraft}
        onChange={(patch) =>
          setTaskEditorDraft((prev) => (prev ? { ...prev, ...patch } : prev))
        }
        onClose={closeTaskEditor}
        onSave={handleTaskEditorSave}
        onDelete={handleTaskEditorDelete}
        onCancelTask={() => editingTask && handleTaskCancelRequest(editingTask)}
        onOpenTeamEditor={() => setTaskEditorAssignOpen(true)}
        saving={taskEditorSaving}
        error={taskEditorError}
        employees={deptEmployees}
        availableTasks={deptTasks}
        employeeById={employeeById}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

      <SubmitForReviewModal
        open={submitModalOpen}
        task={submitModalTask}
        note={submitNote}
        attachments={submitFiles}
        onNoteChange={setSubmitNote}
        onAttachmentsChange={setSubmitFiles}
        onRemoveAttachment={handleRemoveAttachment}
        onClose={closeSubmitModal}
        onSubmit={handleSubmitConfirm}
        submitting={submitSaving}
        error={submitError}
      />

      <UndoCompletedModal
        open={undoModalOpen}
        task={undoModalTask}
        reason={undoReason}
        onReasonChange={setUndoReason}
        onClose={closeUndoModal}
        onSubmit={handleUndoConfirm}
        saving={undoSaving}
        error={undoError}
      />

      <AssignmentModal
        open={taskEditorAssignOpen && taskEditorOpen}
        onClose={() => setTaskEditorAssignOpen(false)}
        employees={deptEmployees}
        employeeNotes={employeeNotes}
        selectedIds={taskEditorDraft?.teamMemberIds || []}
        leadId={taskEditorDraft?.leadMemberId || null}
        onConfirm={(memberIds, leadId) => {
          setTaskEditorDraft((prev) =>
            prev
              ? {
                  ...prev,
                  teamMemberIds: uniqueValues(memberIds),
                  leadMemberId: leadId,
                }
              : prev,
          );
        }}
      />

      {/* ─── Assignment Modal — Manual composer ──────────────────── */}
    </div>
  );
}
