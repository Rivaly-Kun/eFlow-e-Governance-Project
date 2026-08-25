// ─── TaskDetailDrawer ────────────────────────────────────────────
// Right slide-out task detail reused across Dept Head, Admin, and Employee
// surfaces. Tabs: Overview · Activity (immutable timeline) · Discussion ·
// Review (reviewers only). Which tabs/actions appear is driven by props so the
// same component serves every role.

import React, { useState } from "react";
import { X, Info, Activity, MessageSquare, ClipboardCheck, Calendar, User, Building2, Layers, Pencil, UsersRound } from "lucide-react";
import { updateTaskStatus, type Task } from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { TaskStatusBadge, PriorityPill, InitialsAvatar, ProjectStatusBadge } from "./StatusBadges";
import { formatDate, relativeDays, ProgressBar } from "./primitives";
import { TaskActivityTimeline } from "./TaskActivityTimeline";
import { TaskDiscussion } from "./TaskDiscussion";
import { TaskReviewPanel } from "./TaskReviewPanel";
import { ProgressUpdateForm } from "./ProgressUpdateForm";
import { TaskSubtasksWidget } from "./TaskSubtasksWidget";
import { SubmitForReviewForm } from "./SubmitForReviewForm";
import { useTasks } from "../../hooks/useFirebaseData";
import { useProfiles, useProjectsData } from "../../hooks/useSupabaseData";
import { isTaskLead } from "../../services/taskSelectors";
import { resolveTaskDetailCapabilities } from "../../features/tasks/components/taskDetailAccess";
import { TaskTeamEditorDialog } from "../../features/tasks/components/team/TaskTeamEditorDialog";
import { TaskTeamMemberList } from "../../features/tasks/components/team/TaskTeamMemberList";
import { getTaskTeamMemberIds } from "../../features/tasks/selectors/teamMembership";
import { useTaskSubtasks } from "../../features/subtasks/hooks/useTaskSubtasks";
import { WorkBudgetCard } from "../../features/budget";

type Tab = "overview" | "activity" | "discussion" | "review";

export function TaskDetailDrawer({
  task,
  onClose,
  canReview = false,
  canPostProgress = false,
  canDiscuss = true,
  readOnly = false,
  onChanged,
}: {
  task: Task | null;
  onClose: () => void;
  canReview?: boolean;
  canPostProgress?: boolean;
  canDiscuss?: boolean;
  readOnly?: boolean;
  onChanged?: () => void;
}) {
  const [tab, setTab] = useState<Tab>("overview");
  const [resuming, setResuming] = useState(false);
  const [starting, setStarting] = useState(false);
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);
  const { user, userProfile } = useAuth();
  const { tasks } = useTasks();
  const { projects } = useProjectsData();
  const { profiles } = useProfiles();
  const { subtasks: taskSubtasks } = useTaskSubtasks(task?.id);

  if (!task) return null;
  const capabilities = resolveTaskDetailCapabilities(readOnly, {
    canReview,
    canPostProgress,
    canDiscuss,
  });
  const effectiveCanReview = capabilities.canReview && Boolean(user?.id);
  const dependencies = (task.dependencyIds || [])
    .map((id) => tasks.find((candidate) => candidate.id === id))
    .filter((dependency): dependency is Task => Boolean(dependency));
  const unresolvedDependencies = dependencies.filter(
    (dependency) => dependency.status !== "completed",
  );

  // Rework is now the first-class `changes_requested` state (plan §2.1).
  const rejected = task.status === "changes_requested";
  const currentUserIsLead = Boolean(user?.id && isTaskLead(task, user.id));
  const isOwnerOrLead = task.assigneeId === user?.id || currentUserIsLead;
  const canManageSubtasks = !readOnly && Boolean(
    isOwnerOrLead ||
    task.createdBy === user?.id ||
    userProfile?.role === "super_admin" ||
    userProfile?.role === "dept_head" ||
    userProfile?.role === "assistant_head" ||
    userProfile?.role === "department_head",
  );
  const canManageTaskTeam = canManageSubtasks && !["for_review", "completed", "cancelled"].includes(task.status);

  // The assignee resumes rework by transitioning changes_requested → in_progress.
  // Only offered to whoever can post progress (the owner surface).
  const canResume = rejected && capabilities.canPostProgress && isOwnerOrLead;
  const canStart = capabilities.canPostProgress && task.status === "todo";
  const canSubmit =
    capabilities.canPostProgress && isOwnerOrLead && task.status === "in_progress";
  const handleStart = async () => {
    setStarting(true);
    try {
      await updateTaskStatus(
        task.id,
        "in_progress",
        user?.id
          ? { id: user.id, name: userProfile?.full_name || "" }
          : undefined,
      );
      onChanged?.();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't start this task.");
    } finally {
      setStarting(false);
    }
  };
  const handleResume = async () => {
    setResuming(true);
    try {
      await updateTaskStatus(
        task.id,
        "in_progress",
        user?.id ? { id: user.id, name: userProfile?.full_name || "" } : undefined,
      );
      onChanged?.();
      onClose();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Couldn't resume this task.");
    } finally {
      setResuming(false);
    }
  };
  const rel = relativeDays(task.deadline || task.dueDate);
  const percent = task.percentComplete ?? 0;
  const operationalProject = task.linkedProjectId
    ? projects.find((project) => project.id === task.linkedProjectId)
    : undefined;

  const tabs: { id: Tab; label: string; icon: React.ReactNode; show: boolean }[] = [
    { id: "overview", label: "Overview", icon: <Info size={13} />, show: true },
    { id: "activity", label: "Activity", icon: <Activity size={13} />, show: true },
    { id: "discussion", label: "Discussion", icon: <MessageSquare size={13} />, show: true },
    { id: "review", label: "Review", icon: <ClipboardCheck size={13} />, show: effectiveCanReview && task.status === "for_review" },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900/20 z-40 animate-[fade_0.2s_ease-out]" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[440px] bg-white border-l border-neutral-200 shadow-2xl z-50 flex flex-col animate-[slidein_0.25s_cubic-bezier(0.25,1.1,0.4,1)]">
        {/* Header */}
        <div className="p-4 border-b border-neutral-100">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <TaskStatusBadge status={task.status} rejected={rejected} />
                <PriorityPill priority={task.priority} />
              </div>
              <h2 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-snug">
                {task.title}
              </h2>
            </div>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1 shrink-0">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-3 -mb-1">
            {tabs.filter((t) => t.show).map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] ${
                  tab === t.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === "overview" && (
            <div className="space-y-4">
              {readOnly && (
                <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/70 p-3">
                  <Info size={15} className="mt-0.5 shrink-0 text-blue-600" />
                  <div>
                    <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-blue-900">Read-only oversight record</div>
                    <p className="mt-0.5 text-[10.5px] leading-relaxed text-blue-700">Inspect delivery, evidence, discussion, and history here. Operational changes remain with the responsible organization.</p>
                  </div>
                </div>
              )}
              {task.description && (
                <div className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {task.description}
                </div>
              )}

              {task.status === "cancelled" && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wide text-neutral-500">Cancelled</div>
                  <div className="mt-0.5 text-[12.5px] text-neutral-700">
                    {task.cancellationReason || "No cancellation reason recorded."}
                  </div>
                </div>
              )}

              {(Boolean(task.acceptanceCriteria?.length) || task.definitionOfDone) && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wide text-neutral-500">Completion standard</div>
                  {task.acceptanceCriteria?.length ? (
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-[12px] text-neutral-700">
                      {task.acceptanceCriteria.map((criterion) => <li key={criterion}>{criterion}</li>)}
                    </ul>
                  ) : null}
                  {task.definitionOfDone && (
                    <div className="mt-2 text-[11.5px] text-neutral-600">Done when: {task.definitionOfDone}</div>
                  )}
                </div>
              )}

              {dependencies.length > 0 && (
                <div className={`rounded-xl border p-3 ${unresolvedDependencies.length ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wide text-neutral-600">
                    Dependencies · {dependencies.length - unresolvedDependencies.length}/{dependencies.length} complete
                  </div>
                  <div className="mt-1.5 space-y-1 text-[11.5px] text-neutral-700">
                    {dependencies.map((dependency) => (
                      <div key={dependency.id}>{dependency.status === "completed" ? "✓" : "○"} {dependency.title}</div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">Progress</span>
                  <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{percent}%</span>
                </div>
                <ProgressBar value={percent} tone={percent === 100 ? "good" : rel.overdue ? "bad" : "neutral"} />
              </div>

              <WorkBudgetCard task={task} canManage={canManageSubtasks} />

              {canStart && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-blue-900">
                    This task is ready to begin.
                  </div>
                  <p className="mt-0.5 text-[11px] text-blue-700">
                    Starting it updates every board view to In Progress.
                  </p>
                  <button
                    onClick={handleStart}
                    disabled={starting}
                    className="mt-2 rounded-lg bg-blue-700 px-3 py-1.5 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-white hover:bg-blue-800 disabled:opacity-50"
                  >
                    {starting ? "Starting…" : "Start work"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Field icon={<User size={13} />} label="Assignee" value={task.teamMemberNames && task.teamMemberNames.length > 0 ? task.teamMemberNames.join(", ") : task.assigneeName || "Unassigned"} />
                <Field icon={<Calendar size={13} />} label="Deadline" value={formatDate(task.deadline || task.dueDate)} hint={rel.label} hintTone={rel.overdue ? "bad" : undefined} />
                {task.teamName && <Field icon={<Building2 size={13} />} label="Team" value={task.teamName} />}
                {(operationalProject?.title || task.projectTitle) && (
                  <Field
                    icon={<Layers size={13} />}
                    label="Project"
                    value={operationalProject?.title || task.projectTitle || "—"}
                  />
                )}
                {task.programTitle && <Field icon={<Layers size={13} />} label="Program" value={task.programTitle} />}
              </div>

              <section className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wide text-neutral-500"><UsersRound size={12} /> Task members · {getTaskTeamMemberIds(task).length}</div>
                  {canManageTaskTeam && <button type="button" onClick={() => setTeamEditorOpen(true)} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-[9.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 hover:text-neutral-900"><Pencil size={10} /> Manage</button>}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5"><TaskTeamMemberList task={task} profiles={profiles} /></div>
              </section>

              <div className="border-t border-neutral-100 pt-3">
                <TaskSubtasksWidget
                  taskId={task.id}
                  allowedAssignees={getTaskTeamMemberIds(task).map((id) => ({
                    id,
                    name: profiles.find((profile) => profile.id === id)?.full_name
                      || (task.teamMemberIds || []).map((memberId, index) => [memberId, task.teamMemberNames?.[index]] as const).find(([memberId]) => memberId === id)?.[1]
                      || (id === task.assigneeId ? task.assigneeName : undefined)
                      || "Team Member",
                  }))}
                  canManage={canManageSubtasks}
                  parentTask={task}
                  startParentOnCreate={currentUserIsLead}
                />
              </div>

              {rejected && (
                <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-rose-700 uppercase tracking-wide mb-0.5">
                    Changes requested
                  </div>
                  {task.rejectionNote && (
                    <div className="text-[12.5px] font-['Lexend:Regular',_sans-serif] text-rose-900">{task.rejectionNote}</div>
                  )}
                  {canResume && (
                    <button
                      onClick={handleResume}
                      disabled={resuming}
                      className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-[11.5px] font-['Lexend:Medium',_sans-serif] hover:bg-rose-700 disabled:opacity-60"
                    >
                      {resuming ? "Resuming…" : "Resume work"}
                    </button>
                  )}
                </div>
              )}

              {task.latestSubmission && (
                <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <InitialsAvatar name={task.latestSubmission.submitterName} size={20} />
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                      {task.latestSubmission.submitterName}
                    </span>
                    <span className="text-[10.5px] text-neutral-400">submitted {formatDate(task.latestSubmission.submittedAt)}</span>
                  </div>
                  <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 whitespace-pre-wrap">
                    {task.latestSubmission.note}
                  </div>
                </div>
              )}

              {capabilities.canPostProgress && (
                <ProgressUpdateForm taskId={task.id} initialPercent={percent} onSaved={onChanged} />
              )}

              {canSubmit && (
                <SubmitForReviewForm
                  task={task}
                  subtasks={taskSubtasks}
                  onSubmitted={() => {
                    onChanged?.();
                    onClose();
                  }}
                />
              )}
            </div>
          )}

          {tab === "activity" && <TaskActivityTimeline taskId={task.id} />}
          {tab === "discussion" && <TaskDiscussion taskId={task.id} canParticipate={capabilities.canDiscuss} />}
          {tab === "review" && effectiveCanReview && (
            <TaskReviewPanel task={task} canReview={effectiveCanReview} onDone={() => { onChanged?.(); onClose(); }} />
          )}
        </div>
      </div>
      <TaskTeamEditorDialog
        task={teamEditorOpen ? task : null}
        profiles={profiles}
        subtasks={taskSubtasks}
        responsibleOrgId={task.orgId || operationalProject?.orgId}
        onClose={() => setTeamEditorOpen(false)}
      />
      <style>{`
        @keyframes slidein { from { transform: translateX(100%); } to { transform: translateX(0); } }
        @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
    </>
  );
}

function Field({
  icon,
  label,
  value,
  hint,
  hintTone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  hintTone?: "bad";
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-0.5">
        {icon} {label}
      </div>
      <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{value}</div>
      {hint && (
        <div className={`text-[10.5px] font-['Lexend:Regular',_sans-serif] ${hintTone === "bad" ? "text-red-600" : "text-neutral-400"}`}>
          {hint}
        </div>
      )}
    </div>
  );
}

export { ProjectStatusBadge };
