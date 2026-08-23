import { useEffect, useMemo, useState } from "react";
import { Check, Crown, Search, ShieldAlert, UserMinus, UsersRound, X } from "lucide-react";
import type { UserProfile } from "../../../../types";
import type { Subtask } from "../../../../services/subtaskService";
import { useToast } from "../../../../components/ui/Toast";
import { getTaskLeadId, getTaskTeamMemberIds, getTaskTeamRemovalBlockers } from "../../selectors/teamMembership";
import { updateTaskTeamMembers } from "../../services/taskTeamService";
import type { Task } from "../../taskTypes";

interface TeamCandidate {
  id: string;
  name: string;
  role: string;
  organization: string;
  canBeAdded: boolean;
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "?";
const roleLabel = (role: string) => role.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function TaskTeamEditorDialog({
  task,
  profiles,
  subtasks,
  responsibleOrgId,
  onClose,
}: {
  task: Task | null;
  profiles: UserProfile[];
  subtasks: Subtask[];
  responsibleOrgId?: string;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const currentIds = useMemo(() => task ? getTaskTeamMemberIds(task) : [], [task]);
  const leadId = task ? getTaskLeadId(task) : undefined;
  const blockers = useMemo(() => task ? getTaskTeamRemovalBlockers(task, subtasks) : new Map(), [subtasks, task]);

  useEffect(() => {
    if (!task) return;
    setSelectedIds(getTaskTeamMemberIds(task));
    setSearch("");
    setError("");
  }, [task]);

  const candidates = useMemo<TeamCandidate[]>(() => {
    if (!task) return [];
    const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
    const taskNameById = new Map((task.teamMemberIds || []).map((id, index) => [id, task.teamMemberNames?.[index] || "Team Member"]));
    if (task.assigneeId && task.assigneeName) taskNameById.set(task.assigneeId, task.assigneeName);
    const ids = new Set([
      ...profiles.filter((profile) => profile.is_active && profile.role !== "super_admin" && (!responsibleOrgId || profile.org_id === responsibleOrgId || profile.departmentId === responsibleOrgId)).map((profile) => profile.id),
      ...currentIds,
    ]);
    return Array.from(ids).map((id) => {
      const profile = profileById.get(id);
      return {
        id,
        name: profile?.full_name || taskNameById.get(id) || "Team Member",
        role: profile?.role || "employee",
        organization: profile?.org_name || task.teamName || "Responsible organization",
        canBeAdded: currentIds.includes(id) || Boolean(profile?.is_active && (!responsibleOrgId || profile.org_id === responsibleOrgId || profile.departmentId === responsibleOrgId)),
      };
    }).sort((a, b) => Number(selectedIds.includes(b.id)) - Number(selectedIds.includes(a.id)) || a.name.localeCompare(b.name));
  }, [currentIds, profiles, responsibleOrgId, selectedIds, task]);

  const filtered = candidates.filter((candidate) => {
    const value = `${candidate.name} ${candidate.role} ${candidate.organization}`.toLowerCase();
    return value.includes(search.trim().toLowerCase());
  });

  const toggle = (candidate: TeamCandidate) => {
    const selected = selectedIds.includes(candidate.id);
    if (selected) {
      const blocker = blockers.get(candidate.id);
      if (blocker) {
        setError(`${blocker.reason}${blocker.subtaskTitles.length ? ` Active work: ${blocker.subtaskTitles.join(", ")}.` : ""}`);
        return;
      }
      setSelectedIds((ids) => ids.filter((id) => id !== candidate.id));
    } else if (candidate.canBeAdded) {
      setSelectedIds((ids) => [...ids, candidate.id]);
    }
    setError("");
  };

  const save = async () => {
    if (!task) return;
    setSaving(true);
    setError("");
    try {
      await updateTaskTeamMembers({ task, nextMemberIds: selectedIds, profiles, subtasks });
      toast("Task members updated.", "success");
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update task members.");
    } finally {
      setSaving(false);
    }
  };

  if (!task) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-label="Manage task members" className="flex max-h-[84vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <header className="flex items-start justify-between border-b border-neutral-100 px-5 py-4">
          <div><div className="text-[9px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Task team</div><h2 className="mt-1 text-[16px] font-semibold text-neutral-950">Manage members</h2><p className="mt-1 text-[10px] text-neutral-500">{task.title} · only active people from the responsible organization can be added.</p></div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"><X size={15} /></button>
        </header>

        <div className="border-b border-neutral-100 px-4 py-3">
          <label className="flex h-10 items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 focus-within:border-neutral-400 focus-within:bg-white"><Search size={14} className="text-neutral-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} autoFocus placeholder="Search members by name or role…" className="min-w-0 flex-1 bg-transparent text-[11.5px] outline-none" /></label>
          {error && <div className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] leading-relaxed text-amber-800"><ShieldAlert size={13} className="mt-0.5 shrink-0" /> {error}</div>}
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto p-3">
          {filtered.map((candidate) => {
            const selected = selectedIds.includes(candidate.id);
            const blocker = blockers.get(candidate.id);
            return <button key={candidate.id} type="button" onClick={() => toggle(candidate)} disabled={!selected && !candidate.canBeAdded} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selected ? "border-violet-200 bg-violet-50" : "border-transparent hover:border-neutral-200 hover:bg-neutral-50"} disabled:cursor-not-allowed disabled:opacity-40`}>
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-[10px] font-semibold text-white">{initials(candidate.name)}</span>
              <span className="min-w-0 flex-1"><span className="flex items-center gap-1.5 text-[11.5px] font-semibold text-neutral-900">{candidate.name}{candidate.id === leadId && <Crown size={11} className="text-amber-500" />}</span><span className="block truncate text-[9.5px] text-neutral-400">{roleLabel(candidate.role)} · {candidate.organization}</span>{blocker && selected && <span className="mt-0.5 block truncate text-[9px] text-amber-700">{candidate.id === leadId ? "Task Lead · change the lead before removing" : `Working on: ${blocker.subtaskTitles.join(", ")}`}</span>}</span>
              {selected ? blocker ? <span title={blocker.reason} className="rounded-lg bg-amber-100 p-1.5 text-amber-700"><ShieldAlert size={13} /></span> : <span className="rounded-lg p-1.5 text-neutral-400"><UserMinus size={13} /></span> : <span className="flex h-5 w-5 items-center justify-center rounded-md border border-neutral-300">{selected && <Check size={11} />}</span>}
            </button>;
          })}
          {!filtered.length && <div className="py-12 text-center text-[11px] text-neutral-400">No eligible members match your search.</div>}
        </div>

        <footer className="flex items-center justify-between border-t border-neutral-100 px-5 py-4"><span className="inline-flex items-center gap-1.5 text-[10.5px] text-neutral-500"><UsersRound size={13} /> {selectedIds.length} member{selectedIds.length === 1 ? "" : "s"} assigned</span><div className="flex gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-neutral-200 px-4 py-2 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50">Cancel</button><button type="button" disabled={saving} onClick={() => void save()} className="rounded-xl bg-neutral-950 px-4 py-2 text-[11px] font-semibold text-white hover:bg-neutral-800 disabled:opacity-50">{saving ? "Saving…" : "Save members"}</button></div></footer>
      </section>
    </div>
  );
}
