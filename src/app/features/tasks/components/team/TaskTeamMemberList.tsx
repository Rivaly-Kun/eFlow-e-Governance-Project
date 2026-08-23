import { Crown } from "lucide-react";
import type { UserProfile } from "../../../../types";
import { getTaskLeadId, getTaskTeamMemberIds } from "../../selectors/teamMembership";
import type { Task } from "../../taskTypes";

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";

export function TaskTeamMemberList({ task, profiles }: { task: Task; profiles: UserProfile[] }) {
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const leadId = getTaskLeadId(task);
  const memberIds = getTaskTeamMemberIds(task);
  const taskNameById = new Map((task.teamMemberIds || []).map((id, index) => [id, task.teamMemberNames?.[index] || "Team Member"]));
  if (task.assigneeId && task.assigneeName) taskNameById.set(task.assigneeId, task.assigneeName);

  if (!memberIds.length) return <span className="text-[9.5px] text-neutral-400">No task members assigned.</span>;
  return <>{memberIds.map((memberId) => {
    const name = profileMap.get(memberId)?.full_name || taskNameById.get(memberId) || "Team Member";
    return <span key={memberId} className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-white px-2 py-1 text-[9.5px] text-neutral-700"><span className="flex h-4 w-4 items-center justify-center rounded-full bg-neutral-900 text-[7px] font-semibold text-white">{initials(name)}</span>{name}{memberId === leadId && <><Crown size={9} className="text-amber-500" /><span className="text-[8px] font-semibold uppercase text-amber-600">Lead</span></>}</span>;
  })}</>;
}
