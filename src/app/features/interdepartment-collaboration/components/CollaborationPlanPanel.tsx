import * as React from "react";
import { Check, ChevronDown, ChevronRight, Save } from "lucide-react";
import type { Organization } from "../../../types";
import type { CollaborationDraftSnapshot } from "../types";
import { CollaborationActivitySection } from "./CollaborationActivitySection";

export function CollaborationPlanPanel({ snapshot, organizations, editable, onSave }: {
  snapshot: CollaborationDraftSnapshot;
  organizations: Organization[];
  editable: boolean;
  onSave: (snapshot: CollaborationDraftSnapshot, summary: string) => Promise<void>;
}) {
  const [working, setWorking] = React.useState(snapshot);
  const [saving, setSaving] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Set<string>>(() => new Set(snapshot.tasks.map((task) => task.projectId)));
  React.useEffect(() => setWorking(snapshot), [snapshot]);
  const participating = working.organizations.filter((item) => item.participationRole === "owner" || item.participationRole === "participant");
  const projects = Array.from(new Set(working.tasks.map((task) => task.projectId))).map((projectId) => ({
    id: projectId,
    title: working.tasks.find((task) => task.projectId === projectId)?.projectTitle || "Project",
    tasks: working.tasks.filter((task) => task.projectId === projectId),
  }));
  const patchTask = (key: string, patch: Partial<(typeof working.tasks)[number]>) => setWorking((current) => ({ ...current, tasks: current.tasks.map((task) => task.key === key ? { ...task, ...patch } : task) }));
  const patchActivity = (activityId: string, patch: Pick<(typeof working.tasks)[number], "activityPrimaryOrgId" | "activitySupportingOrgIds">) => setWorking((current) => ({
    ...current,
    tasks: current.tasks.map((task) => task.activityId === activityId ? {
      ...task,
      ...patch,
      primaryOrgId: patch.activityPrimaryOrgId,
      supportingOrgIds: patch.activitySupportingOrgIds,
    } : task),
  }));
  const dirty = JSON.stringify(working) !== JSON.stringify(snapshot);
  const save = async () => { setSaving(true); try { await onSave(working, "Proposal plan and responsibilities updated"); } finally { setSaving(false); } };

  return <div className="space-y-3">
    {editable && <div className="flex items-center justify-between rounded-xl border border-violet-200 bg-violet-50 px-4 py-3"><div><div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-violet-900">Owner editing</div><div className="text-[10px] text-violet-600">Substantive changes publish a new revision and invalidate previous approvals.</div></div><button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-violet-700 px-3 text-[10px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40">{saving ? <Check size={12} /> : <Save size={12} />}{saving ? "Saving…" : "Publish revision"}</button></div>}
    {projects.map((project) => {
      const isOpen = expanded.has(project.id);
      return <section key={project.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
        <button type="button" onClick={() => setExpanded((current) => { const next = new Set(current); isOpen ? next.delete(project.id) : next.add(project.id); return next; })} className="flex w-full items-center gap-2 bg-neutral-50 px-4 py-3 text-left"><span className="text-neutral-400">{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span><div className="flex-1 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">{project.title}</div><span className="text-[9px] uppercase text-neutral-400">{project.tasks.length} task{project.tasks.length === 1 ? "" : "s"}</span></button>
        {isOpen && <div>{Array.from(new Set(project.tasks.map((task) => task.activityId))).map((activityId) => <CollaborationActivitySection key={activityId} tasks={project.tasks.filter((task) => task.activityId === activityId)} organizations={organizations} participating={participating} editable={editable} onPatchTask={patchTask} onPatchActivity={patchActivity} />)}</div>}
      </section>;
    })}
  </div>;
}
