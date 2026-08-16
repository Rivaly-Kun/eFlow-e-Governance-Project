import { useEffect, useState } from "react";
import { Calendar, CheckCircle2, Eye, ListChecks, UsersRound, X } from "lucide-react";
import type { Task } from "../../../services/taskService";
import type { Subtask } from "../../../services/subtaskService";
import { formatDate, ProgressBar, relativeDays } from "../../../components/workflow/primitives";
import {
  fetchSubtask,
  fetchSubtaskProgressUpdates,
  fetchSubtaskSubmissions,
} from "../services/subtaskWorkflowService";
import type { SubtaskProgressUpdate, SubtaskSubmission } from "../types";
import { SubtaskProgressForm } from "./SubtaskProgressForm";
import { SubtaskProgressHistory } from "./SubtaskProgressHistory";
import { SubtaskSubmissionHistory } from "./SubtaskSubmissionHistory";

const statusMeta = {
  todo: { label: "To do", tone: "bg-neutral-100 text-neutral-700" },
  in_progress: { label: "In progress", tone: "bg-blue-50 text-blue-700" },
  for_review: { label: "For review", tone: "bg-amber-50 text-amber-700" },
  changes_requested: { label: "Changes requested", tone: "bg-rose-50 text-rose-700" },
  completed: { label: "Approved", tone: "bg-emerald-50 text-emerald-700" },
} as const;

export function SubtaskWorkDrawer({
  subtask,
  parentTask,
  readOnly = false,
  onClose,
}: {
  subtask: Subtask | null;
  parentTask?: Task;
  readOnly?: boolean;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(subtask);
  const [submissions, setSubmissions] = useState<SubtaskSubmission[]>([]);
  const [progressUpdates, setProgressUpdates] = useState<SubtaskProgressUpdate[]>([]);

  const reload = async () => {
    if (!subtask) return;
    const [nextSubtask, nextSubmissions, nextProgressUpdates] = await Promise.all([
      fetchSubtask(subtask.id),
      fetchSubtaskSubmissions(subtask.id),
      fetchSubtaskProgressUpdates(subtask.id),
    ]);
    setCurrent(nextSubtask || subtask);
    setSubmissions(nextSubmissions);
    setProgressUpdates(nextProgressUpdates);
  };
  useEffect(() => { setCurrent(subtask); void reload(); }, [subtask?.id]);
  if (!current) return null;

  const status = statusMeta[current.status] || statusMeta.todo;
  const due = parentTask ? relativeDays(parentTask.deadline || parentTask.dueDate) : undefined;
  const assignedNames = current.assignedToIds
    .map((id) => {
      const index = parentTask?.teamMemberIds?.indexOf(id) ?? -1;
      return index >= 0 ? parentTask?.teamMemberNames?.[index] : undefined;
    })
    .filter((name): name is string => Boolean(name));

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-neutral-900/25" onClick={onClose} />
      <aside className="fixed bottom-0 right-0 top-0 z-[61] flex w-full flex-col border-l border-neutral-200 bg-white shadow-2xl sm:w-[460px]">
        <header className="border-b border-neutral-100 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-['Lexend:Medium',_sans-serif] ${status.tone}`}>{status.label}</span>
              <h2 className="mt-2 text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{current.title}</h2>
              <p className="mt-0.5 truncate text-[11px] text-neutral-500">Subtask of {parentTask?.title || "parent task"}</p>
            </div>
            <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-800"><X size={18} /></button>
          </div>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-center justify-between text-[11px] text-neutral-500">
              <span className="flex items-center gap-1.5"><ListChecks size={13} /> Subtask progress</span>
              <span className="font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{current.percentComplete}%</span>
            </div>
            <div className="mt-2"><ProgressBar value={current.percentComplete} tone={current.status === "completed" ? "good" : "neutral"} /></div>
            <div className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <div className="text-neutral-400">Review rule</div>
                <div className="mt-0.5 flex items-center gap-1 text-neutral-700"><CheckCircle2 size={12} /> Leader approval required</div>
              </div>
              <div>
                <div className="text-neutral-400">Parent deadline</div>
                <div className="mt-0.5 flex items-center gap-1 text-neutral-700"><Calendar size={12} /> {formatDate(parentTask?.deadline || parentTask?.dueDate)} {due?.label ? `· ${due.label}` : ""}</div>
              </div>
            </div>
            <div className="mt-3 border-t border-neutral-200 pt-3 text-[11px]">
              <div className="text-neutral-400">Assigned contributors</div>
              <div className="mt-1 flex items-center gap-1.5 text-neutral-700">
                <UsersRound size={12} /> {assignedNames.join(", ") || "Assigned team member"}
              </div>
            </div>
          </div>

          {readOnly ? (
            <div className="flex gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-[11.5px] text-blue-800">
              <Eye size={14} className="mt-0.5 shrink-0" />
              <span><strong className="font-['Lexend:SemiBold',_sans-serif]">Team Leader view.</strong> Progress is read-only here; the assigned employee owns these updates.</span>
            </div>
          ) : (
            <SubtaskProgressForm subtask={current} onSaved={reload} />
          )}
          <SubtaskProgressHistory updates={progressUpdates} />
          <SubtaskSubmissionHistory submissions={submissions} />
        </div>
      </aside>
    </>
  );
}
