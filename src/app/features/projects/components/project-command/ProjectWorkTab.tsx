import { AlertTriangle, ChevronRight, CircleDot, GitBranch, ListTree, Paperclip, UsersRound } from "lucide-react";
import type { UserProfile } from "../../../../types";
import { useToast } from "../../../../components/ui/Toast";
import { PriorityPill, TaskStatusBadge } from "../../../../components/workflow/StatusBadges";
import { formatDate, ProgressBar } from "../../../../components/workflow/primitives";
import { updateTask, type Task } from "../../../tasks";
import type { ProjectCommandData } from "./types";

export function ProjectWorkTab({ data, profiles, onOpenTask, canManage = false }: { data: ProjectCommandData; profiles: UserProfile[]; onOpenTask: (taskId: string) => void; canManage?: boolean }) {
  const { toast } = useToast();
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const groups = [
    ...data.milestones.map((milestone) => ({ id: milestone.id, title: milestone.title, dueDate: milestone.dueDate, tasks: data.tasks.filter((task) => task.milestoneId === milestone.id) })),
    { id: "unplanned", title: "Unscheduled work", dueDate: undefined, tasks: data.tasks.filter((task) => !task.milestoneId || !data.milestones.some((milestone) => milestone.id === task.milestoneId)) },
  ].filter((group) => group.tasks.length > 0);

  const updateMilestoneLink = async (task: Task, milestoneId: string) => {
    try {
      await updateTask(task.id, { linkedProjectId: data.project.id, milestoneId });
      toast("Task milestone updated.", "success");
    } catch (error: any) { toast(error?.message || "Could not update the milestone link.", "error"); }
  };

  if (!groups.length) return <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-16 text-center text-[11px] text-neutral-400">No tasks are linked to this project.</div>;

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <section key={group.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          <header className="flex items-center justify-between border-b border-neutral-100 bg-neutral-50/80 px-4 py-3">
            <div className="flex items-center gap-2"><ListTree size={15} className="text-neutral-500" /><div><h3 className="text-[12px] font-semibold text-neutral-900">{group.title}</h3><p className="text-[9.5px] text-neutral-400">{group.tasks.length} task(s){group.dueDate ? ` · due ${formatDate(group.dueDate)}` : ""}</p></div></div>
          </header>
          <div className="divide-y divide-neutral-100">
            {group.tasks.map((task) => (
              <ProjectTaskRow
                key={task.id}
                task={task}
                data={data}
                profileMap={profileMap}
                canManage={canManage && data.project.status !== "archived"}
                onOpen={() => onOpenTask(task.id)}
                onMilestoneChange={(milestoneId) => void updateMilestoneLink(task, milestoneId)}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ProjectTaskRow({ task, data, profileMap, canManage, onOpen, onMilestoneChange }: { task: Task; data: ProjectCommandData; profileMap: Map<string, UserProfile>; canManage: boolean; onOpen: () => void; onMilestoneChange: (milestoneId: string) => void }) {
  const subtasks = data.facts.subtasks.filter((subtask) => subtask.taskId === task.id).sort((a, b) => a.position - b.position);
  const latest = data.facts.progress.find((item) => item.kind === "task" && item.taskId === task.id);
  const pending = data.facts.submissions.find((item) => item.kind === "task" && item.taskId === task.id && item.status === "pending");
  const lead = profileMap.get(task.recommendationLeadId || task.assigneeId || "");
  const evidenceCount = data.facts.evidence.filter((item) => item.taskId === task.id).length;

  return (
    <article className="p-4">
      <button type="button" onClick={onOpen} className="flex w-full items-start gap-3 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2"><TaskStatusBadge status={task.status} size="sm" /><PriorityPill priority={task.priority || "medium"} /><h4 className="text-[12.5px] font-semibold text-neutral-900">{task.title}</h4></div>
          <div className="mt-2 grid gap-2 text-[9.5px] text-neutral-400 sm:grid-cols-4">
            <span className="inline-flex items-center gap-1"><UsersRound size={11} /> {lead?.full_name || task.assigneeName || "Unassigned lead"}</span>
            <span>{formatDate(task.deadline || task.dueDate)}</span>
            <span className="inline-flex items-center gap-1"><GitBranch size={11} /> {task.dependencyIds?.length || 0} dependencies</span>
            <span className="inline-flex items-center gap-1"><Paperclip size={11} /> {evidenceCount} evidence files</span>
          </div>
          {latest?.blocker && <p className="mt-2 inline-flex items-start gap-1 rounded-lg bg-red-50 px-2 py-1 text-[9.5px] text-red-700"><AlertTriangle size={11} className="mt-0.5" /> {latest.blocker}</p>}
          <div className="mt-2"><ProgressBar value={task.status === "completed" ? 100 : task.percentComplete || 0} tone={task.status === "completed" ? "good" : "neutral"} /></div>
        </div>
        <div className="flex items-center gap-2">{pending && <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold text-amber-700">Head review waiting</span>}<ChevronRight size={15} className="text-neutral-300" /></div>
      </button>

      {canManage && (
        <label className="mt-3 ml-3 flex max-w-sm items-center gap-2 border-l border-neutral-200 pl-4 text-[9.5px] text-neutral-500">
          <span className="shrink-0">Milestone link</span>
          <select value={task.milestoneId || ""} onChange={(event) => onMilestoneChange(event.target.value)} className="h-8 min-w-0 flex-1 rounded-lg border border-neutral-200 bg-white px-2 text-[10px]">
            <option value="">Unscheduled work</option>
            {data.milestones.map((milestone) => <option key={milestone.id} value={milestone.id}>{milestone.title}</option>)}
          </select>
        </label>
      )}

      {subtasks.length ? (
        <div className="mt-3 ml-3 space-y-1.5 border-l border-neutral-200 pl-4">
          {subtasks.map((subtask) => {
            const progress = data.facts.progress.find((item) => item.kind === "subtask" && item.subtaskId === subtask.id);
            const submission = data.facts.submissions.find((item) => item.kind === "subtask" && item.subtaskId === subtask.id);
            return <div key={subtask.id} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2"><span className="rounded-md border border-neutral-200 bg-white px-1.5 py-0.5 text-[8px] font-semibold uppercase text-neutral-500">Step {subtask.position + 1}</span><CircleDot size={11} className={subtask.status === "completed" ? "text-emerald-600" : "text-neutral-400"} /><span className="min-w-0 flex-1 truncate text-[10.5px] text-neutral-700">{subtask.title}</span><span className="text-[9px] text-neutral-400">{progress?.blocker ? "Blocked" : submission?.status === "pending" ? "Leader review" : subtask.status.replace(/_/g, " ")} · {subtask.percentComplete}%</span></div>;
          })}
        </div>
      ) : <p className="mt-3 ml-3 border-l border-neutral-200 py-2 pl-4 text-[9.5px] text-neutral-400">No subtasks have been defined.</p>}
    </article>
  );
}
