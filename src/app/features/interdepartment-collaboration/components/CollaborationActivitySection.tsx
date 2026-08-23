import { CalendarDays } from "lucide-react";
import type { Organization } from "../../../types";
import type { CollaborationOrganizationSelection, CollaborationSnapshotTask } from "../types";
import { ResponsibilityEditor } from "./ResponsibilityEditor";

export function CollaborationActivitySection({ tasks, organizations, participating, editable, onPatchTask, onPatchActivity }: {
  tasks: CollaborationSnapshotTask[];
  organizations: Organization[];
  participating: CollaborationOrganizationSelection[];
  editable: boolean;
  onPatchTask: (key: string, patch: Partial<CollaborationSnapshotTask>) => void;
  onPatchActivity: (activityId: string, patch: Pick<CollaborationSnapshotTask, "activityPrimaryOrgId" | "activitySupportingOrgIds">) => void;
}) {
  const activity = tasks[0];
  if (!activity) return null;
  return <section className="border-t border-neutral-100 first:border-t-0">
    <div className="bg-neutral-50/60 px-4 py-3">
      <div className="mb-2 flex items-center justify-between gap-3"><div className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-700">{activity.activityTitle}</div><span className="text-[8px] uppercase tracking-wide text-neutral-400">{tasks.length} task{tasks.length === 1 ? "" : "s"}</span></div>
      <ResponsibilityEditor task={activity} organizations={organizations} participating={participating} editable={editable} onPatchActivity={(patch) => onPatchActivity(activity.activityId, patch)} />
    </div>
    <div className="divide-y divide-neutral-100">{tasks.map((task) => <div key={task.key} className="p-4">
      <div className="flex flex-wrap items-start gap-3"><div className="min-w-[220px] flex-1">{editable ? <input value={task.title} onChange={(event) => onPatchTask(task.key, { title: event.target.value })} className="w-full border-0 bg-transparent text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 outline-none" /> : <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{task.title}</div>}{editable ? <textarea value={task.description} onChange={(event) => onPatchTask(task.key, { description: event.target.value })} rows={2} className="mt-1 w-full resize-none rounded-lg border border-neutral-100 bg-neutral-50 px-2 py-1.5 text-[10px] text-neutral-600 outline-none" /> : <div className="mt-1 text-[10px] leading-relaxed text-neutral-500">{task.description || "No description"}</div>}</div><div className="flex min-w-[210px] flex-col gap-2">
        <label className="flex items-center gap-2 text-[9px] uppercase text-neutral-400"><CalendarDays size={11} /> Target {editable ? <input type="date" value={task.deadline.slice(0, 10)} onChange={(event) => onPatchTask(task.key, { deadline: event.target.value })} className="ml-auto h-7 rounded-lg border border-neutral-200 bg-white px-2 text-[10px] normal-case text-neutral-700" /> : <span className="ml-auto normal-case text-neutral-700">{task.deadline || "Not scheduled"}</span>}</label>
      </div></div>
    </div>)}</div>
  </section>;
}
