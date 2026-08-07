import * as React from "react";
import * as Icons from "lucide-react";
import { createProject } from "../../../services/projectService";
import { useUsers } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import type { Organization } from "../../../types";
import * as UI from "../../../components/workflow/primitives";
import * as Badges from "../../../components/workflow/StatusBadges";
import type { ProjectScope } from "./model";

export function ProjectComposer({
  scope,
  orgs,
  onClose,
  onCreated,
}: {
  scope: ProjectScope;
  orgs: Organization[];
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const { users } = useUsers();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [priority, setPriority] = React.useState("medium");
  const [orgId, setOrgId] = React.useState(userProfile?.org_id || "");
  const [ownerId, setOwnerId] = React.useState(userProfile?.id || "");
  const [startDate, setStartDate] = React.useState("");
  const [targetDate, setTargetDate] = React.useState("");
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [milestones, setMilestones] = React.useState<{ title: string; dueDate: string }[]>([]);
  const [msTitle, setMsTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  // Org options limited to scope.
  const allowedOrgs = React.useMemo(() => {
    if (scope.isSuperAdmin || scope.scopedOrgIds.length === 0) return orgs;
    return orgs.filter((o) => scope.scopedOrgIds.includes(o.id));
  }, [orgs, scope]);

  // Candidate members: within scoped orgs.
  const candidates = React.useMemo(() => {
    const scopedIds = scope.isSuperAdmin ? null : new Set(scope.scopedOrgIds);
    return users.filter((u) => u.role !== "super_admin" && (!scopedIds || (u.org_id && scopedIds.has(u.org_id))));
  }, [users, scope]);

  const submit = async () => {
    if (!title.trim()) { toast("Project title is required.", "error"); return; }
    setSaving(true);
    try {
      const project = await createProject({
        title,
        description,
        orgId: orgId || null,
        ownerId: ownerId || null,
        priority: priority as any,
        startDate: startDate || null,
        targetDate: targetDate || null,
        memberIds,
        milestones: milestones.map((m) => ({ title: m.title, dueDate: m.dueDate || null })),
      });
      toast("Project created.", "success");
      onCreated(project.id);
    } catch (e: any) {
      toast(e?.message || "Failed to create project.", "error");
      setSaving(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[520px] bg-white shadow-2xl z-50 flex flex-col animate-[slidein_0.25s_cubic-bezier(0.25,1.1,0.4,1)]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">New project</div>
            <h2 className="text-[17px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Project composer</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1"><Icons.X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <Labeled label="Title" required>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Coastal Road Rehabilitation" className={inputCls} />
          </Labeled>
          <Labeled label="Description">
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What is this project about?" className={`${inputCls} resize-none`} />
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Priority">
              <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputCls}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </Labeled>
            <Labeled label="Department">
              <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={inputCls}>
                <option value="">Unassigned</option>
                {allowedOrgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </Labeled>
          </div>

          <Labeled label="Owner">
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className={inputCls}>
              <option value="">Unassigned</option>
              {candidates.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </Labeled>

          <div className="grid grid-cols-2 gap-3">
            <Labeled label="Start date">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
            </Labeled>
            <Labeled label="Target date">
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={inputCls} />
            </Labeled>
          </div>

          {/* Members */}
          <Labeled label="Team members">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {memberIds.map((id) => {
                const u = users.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 bg-neutral-100 rounded-full pl-1 pr-2 py-0.5 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">
                    <Badges.InitialsAvatar name={u?.full_name} size={16} /> {u?.full_name?.split(" ")[0]}
                    <button onClick={() => setMemberIds(memberIds.filter((m) => m !== id))} className="text-neutral-400 hover:text-neutral-700"><Icons.X size={11} /></button>
                  </span>
                );
              })}
            </div>
            <select
              value=""
              onChange={(e) => { if (e.target.value && !memberIds.includes(e.target.value)) setMemberIds([...memberIds, e.target.value]); }}
              className={inputCls}
            >
              <option value="">Add a member…</option>
              {candidates.filter((u) => !memberIds.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
          </Labeled>

          {/* Milestones */}
          <Labeled label="Initial milestones">
            <div className="space-y-1.5 mb-2">
              {milestones.map((m, i) => (
                <div key={i} className="flex items-center gap-2 bg-neutral-50 rounded-lg px-2.5 py-1.5">
                  <Icons.Milestone size={12} className="text-neutral-400" />
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 flex-1 truncate">{m.title}</span>
                  <button onClick={() => setMilestones(milestones.filter((_, x) => x !== i))} className="text-neutral-400 hover:text-red-500"><Icons.X size={12} /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={msTitle}
                onChange={(e) => setMsTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && msTitle.trim()) { setMilestones([...milestones, { title: msTitle.trim(), dueDate: "" }]); setMsTitle(""); } }}
                placeholder="Milestone title, press Enter"
                className={inputCls}
              />
              <UI.WButton icon={<Icons.Plus size={14} />} onClick={() => { if (msTitle.trim()) { setMilestones([...milestones, { title: msTitle.trim(), dueDate: "" }]); setMsTitle(""); } }}>Add</UI.WButton>
            </div>
          </Labeled>
        </div>

        <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2">
          <UI.WButton onClick={onClose}>Cancel</UI.WButton>
          <UI.WButton variant="primary" onClick={submit} disabled={saving} icon={<Icons.FolderKanban size={14} />}>
            {saving ? "Creating…" : "Create project"}
          </UI.WButton>
        </div>
      </div>
    </>
  );
}

const inputCls = "w-full h-9 px-2.5 border border-neutral-200 rounded-lg text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 bg-white";

function Labeled({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
