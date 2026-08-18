import { useMemo, useState } from "react";
import { Plus, Trash2, UserRoundCog } from "lucide-react";
import type { UserProfile } from "../../../../types";
import { InitialsAvatar } from "../../../../components/workflow/StatusBadges";
import { useToast } from "../../../../components/ui/Toast";
import { addProjectMember, removeProjectMember, updateProjectMemberRole } from "../../services/projectService";
import type { ProjectMember } from "../../services/types";
import type { ProjectCommandData } from "./types";

export function ProjectPeopleTab({ data, profiles, canManage }: { data: ProjectCommandData; profiles: UserProfile[]; canManage: boolean }) {
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<ProjectMember["role"]>("member");
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const existingIds = new Set(data.members.map((member) => member.userId));
  const candidates = profiles.filter((profile) => profile.is_active && profile.role !== "super_admin" && !existingIds.has(profile.id) && (!data.project.orgId || profile.org_id === data.project.orgId));
  const editable = canManage && data.project.status !== "archived";

  const add = async () => {
    if (!userId) return;
    try {
      await addProjectMember(data.project.id, userId, role);
      await data.refreshMembers();
      setUserId("");
      toast("Project member added.", "success");
    } catch (error: any) { toast(error?.message || "Could not add member.", "error"); }
  };

  const remove = async (member: ProjectMember) => {
    try {
      await removeProjectMember(data.project.id, member.userId);
      await data.refreshMembers();
      toast("Project member removed.", "success");
    } catch (error: any) { toast(error?.message || "Could not remove member.", "error"); }
  };

  const changeRole = async (member: ProjectMember, nextRole: ProjectMember["role"]) => {
    try {
      await updateProjectMemberRole(data.project.id, member.userId, nextRole);
      await data.refreshMembers();
      toast("Project member role updated.", "success");
    } catch (error: any) { toast(error?.message || "Could not update the member role.", "error"); }
  };

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-blue-50 p-2 text-blue-700"><UserRoundCog size={17} /></span>
        <div><h3 className="text-[13px] font-semibold text-neutral-900">Project people</h3><p className="mt-0.5 text-[10px] text-neutral-400">Manage project-specific owner, member, and viewer access.</p></div>
      </div>

      {editable && (
        <div className="mt-4 grid gap-2 rounded-xl bg-neutral-50 p-3 sm:grid-cols-[1fr_140px_auto]">
          <select value={userId} onChange={(event) => setUserId(event.target.value)} className="eflow-control">
            <option value="">Choose a department member…</option>
            {candidates.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name} · {profile.role.replace(/_/g, " ")}</option>)}
          </select>
          <select value={role} onChange={(event) => setRole(event.target.value as ProjectMember["role"])} className="eflow-control">
            <option value="member">Member</option><option value="viewer">Viewer</option><option value="owner">Owner</option>
          </select>
          <button type="button" onClick={add} disabled={!userId} className="inline-flex items-center justify-center gap-1 rounded-lg bg-neutral-900 px-3 text-[10.5px] font-semibold text-white disabled:opacity-40"><Plus size={12} /> Add member</button>
        </div>
      )}

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        {data.members.map((member) => {
          const profile = profileMap.get(member.userId);
          return (
            <div key={member.userId} className="flex items-center gap-3 rounded-xl border border-neutral-200 p-3">
              <InitialsAvatar name={profile?.full_name || "User"} size={34} />
              <div className="min-w-0 flex-1"><div className="truncate text-[11.5px] font-semibold text-neutral-800">{profile?.full_name || "Unknown profile"}</div><div className="mt-0.5 text-[9.5px] capitalize text-neutral-400">{profile?.role.replace(/_/g, " ") || "profile unavailable"}</div></div>
              {editable ? (
                <select value={member.role} onChange={(event) => void changeRole(member, event.target.value as ProjectMember["role"])} className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[9.5px] capitalize text-neutral-600">
                  <option value="owner">Owner</option><option value="member">Member</option><option value="viewer">Viewer</option>
                </select>
              ) : <span className="text-[9.5px] capitalize text-neutral-400">{member.role}</span>}
              {editable && member.role !== "owner" && <button type="button" onClick={() => void remove(member)} className="rounded-lg p-2 text-neutral-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${profile?.full_name || "member"}`}><Trash2 size={13} /></button>}
            </div>
          );
        })}
        {data.members.length === 0 && <p className="rounded-xl border border-dashed border-neutral-200 py-8 text-center text-[10.5px] text-neutral-400 md:col-span-2">No explicit project members.</p>}
      </div>
    </section>
  );
}
