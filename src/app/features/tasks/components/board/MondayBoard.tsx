import { BarChart2, Columns, Layers, List, RotateCcw } from "lucide-react";
import { RecurringTaskTemplatesModal } from "../RecurringTaskTemplatesModal";
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
  // ── View & composer state ─────────────────────────────────────
  const controller = useMondayBoardController({
    tasks, employees, allEmployees, employeeNotes, role, departmentFilter,
    currentUserId, currentUserName, onAssign, onExecute, onSubmit, onVerify,
    onUpdateTask, onDeleteTask,
  });
  const {
    boardView, setBoardView, recurringTemplatesOpen, setRecurringTemplatesOpen,
    deptEmployees, employeeById, taskEditorOpen, taskEditorDraft,
    setTaskEditorDraft, taskEditorSaving, taskEditorError,
    taskEditorAssignOpen, setTaskEditorAssignOpen, submitModalOpen,
    submitModalTask, submitNote, setSubmitNote, submitFiles, setSubmitFiles,
    submitError, submitSaving, undoModalOpen, undoModalTask, undoReason,
    setUndoReason, undoError, undoSaving, deptTasks, editingTask,
    openTaskEditor, closeTaskEditor, openSubmitModal, closeSubmitModal,
    handleRemoveAttachment, handleSubmitConfirm, openUndoModal, closeUndoModal,
    handleUndoConfirm, handleTaskEditorSave, handleTaskDeleteRequest,
    handleTaskCancelRequest, handleTaskEditorDelete,
  } = controller;

  return (
    <div className="w-full flex flex-col gap-5 font-['Lexend:Regular',_sans-serif]">

      {/* ─── Task Board ──────────────────────────────────────────── */}
      <div>
        {/* View switcher header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
            Task Board
          </h2>
          <div className="flex items-center gap-2">
          {role === "depthead" && (
            <button
              onClick={() => setRecurringTemplatesOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50"
            >
              <RotateCcw size={13} /> Recurring templates
            </button>
          )}
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
        employees={allEmployees && allEmployees.length > 0 ? allEmployees : deptEmployees}
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

      <RecurringTaskTemplatesModal
        open={recurringTemplatesOpen}
        onClose={() => setRecurringTemplatesOpen(false)}
        employees={deptEmployees}
        orgId={departmentFilter}
      />


      {/* ─── Assignment Modal — Manual composer ──────────────────── */}
    </div>
  );
}
