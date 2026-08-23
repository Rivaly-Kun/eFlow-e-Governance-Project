import * as React from "react";
import { Crown, Save, Sparkles, Users } from "lucide-react";
import type { Organization, UserProfile } from "../../../types";
import type { CollaborationDraftSnapshot } from "../types";
import type { CollaborationCandidateRecommendation } from "../services/collaborationCandidateService";

export function StaffingReviewPanel({ snapshot, organizations, profiles, editableOrgId, canEditAll, onSave, onRecommend }: {
  snapshot: CollaborationDraftSnapshot;
  organizations: Organization[];
  profiles: UserProfile[];
  editableOrgId?: string;
  canEditAll: boolean;
  onSave: (snapshot: CollaborationDraftSnapshot, summary: string) => Promise<void>;
  onRecommend?: () => Promise<CollaborationCandidateRecommendation[]>;
}) {
  const [working, setWorking] = React.useState(snapshot);
  const [saving, setSaving] = React.useState(false);
  const [recommending, setRecommending] = React.useState(false);
  React.useEffect(() => setWorking(snapshot), [snapshot]);
  const eligibleOrgIds = new Set(snapshot.organizations.filter((item) => item.staffingEnabled).map((item) => item.orgId));
  const eligibleProfiles = profiles.filter((profile) => profile.is_active && profile.role !== "super_admin" && eligibleOrgIds.has(profile.org_id || ""));
  const canModifyOrg = (orgId: string | null) => canEditAll || Boolean(orgId && orgId === editableOrgId);

  const toggleMember = (taskKey: string, profile: UserProfile) => setWorking((current) => ({ ...current, tasks: current.tasks.map((task) => {
    if (task.key !== taskKey || !canModifyOrg(profile.org_id)) return task;
    const selected = task.assignedMemberIds.includes(profile.id);
    const assignedMemberIds = selected ? task.assignedMemberIds.filter((id) => id !== profile.id) : [...task.assignedMemberIds, profile.id];
    return { ...task, assignedMemberIds, leadMemberId: task.leadMemberId === profile.id ? (assignedMemberIds[0] || null) : task.leadMemberId || profile.id };
  }) }));
  const dirty = JSON.stringify(working) !== JSON.stringify(snapshot);
  const save = async () => { setSaving(true); try { await onSave(working, `${canEditAll ? "Owner" : organizations.find((org) => org.id === editableOrgId)?.name || "Participant"} staffing updated`); } finally { setSaving(false); } };
  const recommend = async () => {
    if (!onRecommend) return;
    setRecommending(true);
    try {
      const recommendations = await onRecommend();
      setWorking((current) => ({ ...current, tasks: current.tasks.map((task) => {
        const items = recommendations.filter((item) => item.taskKey === task.key);
        if (items.length === 0) return task;
        const lead = items.find((item) => item.recommendedRole === "lead") || items[0];
        return { ...task, assignedMemberIds: Array.from(new Set(items.map((item) => item.employeeId))), leadMemberId: lead.employeeId, reasoning: items.map((item) => item.fitReason).join(" ") };
      }) }));
    } finally { setRecommending(false); }
  };

  return <div className="space-y-3">
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3"><div><div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Batch staffing review</div><div className="text-[10px] text-neutral-500">Proposed people remain unassigned until every approval passes and the draft is committed.</div></div><div className="flex gap-2">{canEditAll && onRecommend && <button type="button" onClick={recommend} disabled={recommending} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 text-[10px] font-['Lexend:Medium',_sans-serif] text-violet-700 disabled:opacity-40"><Sparkles size={12} />{recommending ? "Ranking…" : "AI recommend teams"}</button>}{(canEditAll || editableOrgId) && <button type="button" onClick={save} disabled={!dirty || saving} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-neutral-900 px-3 text-[10px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40"><Save size={12} />{saving ? "Publishing…" : "Publish staffing revision"}</button>}</div></div>
    {working.tasks.filter((task) => task.enabled).map((task) => {
      const selectedProfiles = task.assignedMemberIds.map((id) => profiles.find((profile) => profile.id === id)).filter((profile): profile is UserProfile => Boolean(profile));
      return <section key={task.key} className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-start gap-3"><div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-100 text-neutral-600"><Users size={14} /></div><div className="min-w-0 flex-1"><div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{task.title}</div><div className="mt-0.5 text-[9px] text-neutral-400">{task.activityTitle} · Primary {organizations.find((org) => org.id === task.primaryOrgId)?.name || "office"}</div></div></div>
        <div className="mt-3 flex flex-wrap gap-2">{selectedProfiles.map((profile) => { const editable = canModifyOrg(profile.org_id); const org = organizations.find((item) => item.id === profile.org_id); return <div key={profile.id} className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-2.5 py-2"><button type="button" disabled={!editable} onClick={() => setWorking((current) => ({ ...current, tasks: current.tasks.map((item) => item.key === task.key ? { ...item, leadMemberId: profile.id } : item) }))} className={task.leadMemberId === profile.id ? "text-amber-500" : "text-neutral-300"} title="Set Task Leader"><Crown size={12} /></button><div><div className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{profile.full_name}</div><div className="text-[8px] text-neutral-400">{org?.name} · {task.leadMemberId === profile.id ? "Proposed lead" : "Proposed support"}</div></div>{editable && <button type="button" onClick={() => toggleMember(task.key, profile)} className="ml-1 text-[9px] text-red-500">Remove</button>}</div>; })}{selectedProfiles.length === 0 && <div className="text-[10px] text-amber-700">No proposed team. Commit will be blocked.</div>}</div>
        {(canEditAll || editableOrgId) && <div className="mt-3 border-t border-neutral-100 pt-3"><div className="mb-2 text-[9px] uppercase tracking-wide text-neutral-400">Available from {canEditAll ? "participating staffing pools" : organizations.find((org) => org.id === editableOrgId)?.name}</div><div className="flex flex-wrap gap-1.5">{eligibleProfiles.filter((profile) => canEditAll || profile.org_id === editableOrgId).filter((profile) => !task.assignedMemberIds.includes(profile.id)).map((profile) => <button type="button" key={profile.id} onClick={() => toggleMember(task.key, profile)} className="rounded-lg border border-neutral-200 bg-white px-2 py-1 text-[9px] text-neutral-600 hover:border-violet-300 hover:text-violet-700">+ {profile.full_name}</button>)}</div></div>}
      </section>;
    })}
  </div>;
}
