import * as React from "react";
import * as Icons from "lucide-react";
import {
  archiveProject,
  createMilestone,
  deleteMilestone,
  deriveMilestoneStatus,
  fetchMilestones,
  fetchProjectMembers,
  restoreProject,
  setMilestoneManualStatus,
  type Milestone,
  type Project,
  type ProjectMember,
} from "../../../services/projectService";
import { useTasks, useUsers } from "../../../hooks/useFirebaseData";
import { useToast } from "../../../components/ui/Toast";
import type { Task } from "../../../services/taskService";
import { tasksForProject } from "../../../services/taskSelectors";
import type { Organization, UserProfile } from "../../../types";
import * as UI from "../../../components/workflow/primitives";
import { formatDate, relativeDays } from "../../../components/workflow/primitives";
import * as Badges from "../../../components/workflow/StatusBadges";
import { TaskDetailDrawer } from "../../../components/workflow/TaskDetailDrawer";
import { MILESTONE_STATUS_META } from "./model";

export function ProjectDetail({
  project,
  onBack,
  orgs,
  canArchive,
}: {
  project: Project;
  onBack: () => void;
  orgs: Organization[];
  canArchive: boolean;
}) {
  const { tasks } = useTasks();
  const { users } = useUsers();
  const { toast } = useToast();
  const [tab, setTab] = React.useState<"overview" | "milestones" | "tasks" | "members">("overview");
  const [milestones, setMilestones] = React.useState<Milestone[]>([]);
  const [members, setMembers] = React.useState<ProjectMember[]>([]);
  const [openTask, setOpenTask] = React.useState<Task | null>(null);
  const [newMilestone, setNewMilestone] = React.useState("");
  const [newMsDate, setNewMsDate] = React.useState("");

  const pTasks = React.useMemo(() => tasksForProject(tasks, project.id), [tasks, project.id]);

  const load = () => {
    fetchMilestones(project.id).then(setMilestones);
    fetchProjectMembers(project.id).then(setMembers);
  };
  React.useEffect(() => { load(); }, [project.id]);

  const done = pTasks.filter((t) => t.status === "completed").length;
  const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
  const orgName = orgs.find((o) => o.id === project.orgId)?.name;
  const owner = users.find((u) => u.id === project.ownerId);
  const isArchived = project.status === "archived";

  const addMilestone = async () => {
    if (!newMilestone.trim()) return;
    try {
      await createMilestone(project.id, newMilestone, newMsDate || null);
      setNewMilestone("");
      setNewMsDate("");
      load();
      toast("Milestone added.", "success");
    } catch (e: any) {
      toast(e?.message || "Failed to add milestone.", "error");
    }
  };

  const memberProfiles = members
    .map((m) => ({ member: m, profile: users.find((u) => u.id === m.userId) }))
    .filter((x) => x.profile) as { member: ProjectMember; profile: UserProfile }[];

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <button onClick={onBack} className="inline-flex items-center gap-1 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-900 mb-3">
        <Icons.ChevronLeft size={15} /> Back to projects
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badges.ProjectStatusBadge status={project.status} />
            <Badges.PriorityPill priority={project.priority} />
            {orgName && <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 flex items-center gap-1"><Icons.Building2 size={11} /> {orgName}</span>}
          </div>
          <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{project.title}</h1>
          {project.description && (
            <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>
        {canArchive && (
          isArchived ? (
            <UI.WButton icon={<Icons.ArchiveRestore size={14} />} onClick={async () => { await restoreProject(project.id); toast("Project restored.", "success"); }}>
              Restore
            </UI.WButton>
          ) : (
            <UI.WButton
              icon={<Icons.Archive size={14} />}
              variant="danger"
              onClick={async () => {
                const reason = window.prompt("Reason for archiving (recorded in audit log):") || undefined;
                await archiveProject(project.id, reason);
                toast("Project archived. History preserved.", "success");
              }}
            >
              Archive
            </UI.WButton>
          )
        )}
      </div>

      {isArchived && (
        <div className="mb-4 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 flex items-center gap-2">
          <Icons.Archive size={13} /> This project is archived — read only. New work is blocked but history and reports remain available.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <UI.StatCard label="Completion" value={`${pct}%`} hint={`${done}/${pTasks.length} tasks`} tone="good" />
        <UI.StatCard label="Milestones" value={milestones.length} icon={<Icons.Milestone size={15} />} />
        <UI.StatCard label="Members" value={members.length} icon={<Icons.Users size={15} />} />
        <UI.StatCard label="Target date" value={formatDate(project.targetDate)} hint={relativeDays(project.targetDate).label} />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-neutral-200">
        {([
          { id: "overview", label: "Overview" },
          { id: "milestones", label: `Milestones (${milestones.length})` },
          { id: "tasks", label: `Tasks (${pTasks.length})` },
          { id: "members", label: `Members (${members.length})` },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-3 py-2 text-[12.5px] font-['Lexend:Medium',_sans-serif] border-b-2 -mb-px ${
              tab === t.id ? "border-neutral-900 text-neutral-900" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <UI.Card title="Progress overview">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">Overall completion</span>
                  <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{pct}%</span>
                </div>
                <UI.ProgressBar value={pct} tone={pct === 100 ? "good" : "neutral"} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(["pending_assignment", "todo", "in_progress", "changes_requested", "for_review", "completed"] as const).map((s) => (
                  <div key={s} className="bg-neutral-50 rounded-lg p-2.5 text-center">
                    <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">
                      {pTasks.filter((t) => t.status === s).length}
                    </div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 capitalize">{s.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            </UI.Card>
          </div>
          <UI.Card title="Details">
            <div className="space-y-3 text-[12.5px] font-['Lexend:Regular',_sans-serif]">
              <Row label="Owner" value={owner?.full_name || "—"} />
              <Row label="Status" value={<Badges.ProjectStatusBadge status={project.status} size="sm" />} />
              <Row label="Priority" value={<Badges.PriorityPill priority={project.priority} />} />
              <Row label="Start" value={formatDate(project.startDate)} />
              <Row label="Target" value={formatDate(project.targetDate)} />
              <Row label="Created" value={formatDate(project.createdAt)} />
            </div>
          </UI.Card>
        </div>
      )}

      {tab === "milestones" && (
        <UI.Card>
          {!isArchived && (
            <div className="flex items-end gap-2 mb-4 pb-4 border-b border-neutral-100">
              <label className="flex-1">
                <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 mb-1 block">New milestone</span>
                <input
                  value={newMilestone}
                  onChange={(e) => setNewMilestone(e.target.value)}
                  placeholder="Milestone title"
                  className="w-full h-9 px-2.5 border border-neutral-200 rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] focus:outline-none focus:border-neutral-400"
                />
              </label>
              <input
                type="date"
                value={newMsDate}
                onChange={(e) => setNewMsDate(e.target.value)}
                className="h-9 px-2.5 border border-neutral-200 rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] focus:outline-none focus:border-neutral-400"
              />
              <UI.WButton icon={<Icons.Plus size={14} />} variant="primary" onClick={addMilestone}>Add</UI.WButton>
            </div>
          )}
          {milestones.length === 0 ? (
            <UI.SectionEmpty icon={<Icons.Milestone size={26} />} title="No milestones" description="Break the project into milestones to track its state." />
          ) : (
            <div className="space-y-2">
              {milestones.map((m) => {
                const msTasks = pTasks.filter((t) => t.milestoneId === m.id);
                const derived = deriveMilestoneStatus(m, msTasks);
                const meta = MILESTONE_STATUS_META[derived.status] || MILESTONE_STATUS_META.not_started;
                const msDone = msTasks.filter((t) => t.status === "completed").length;
                const msPct = msTasks.length ? Math.round((msDone / msTasks.length) * 100) : 0;
                return (
                  <div key={m.id} className="border border-neutral-200 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{m.title}</span>
                          <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] rounded px-1.5 py-0.5 ${meta.tone}`}>
                            {meta.label}
                          </span>
                          {derived.source === "manual" && (
                            <span className="text-[9px] uppercase tracking-wide text-neutral-400">manual</span>
                          )}
                        </div>
                        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-0.5">
                          {m.dueDate ? `Due ${formatDate(m.dueDate)}` : m.description || ""} · {msDone}/{msTasks.length} tasks
                        </div>
                      </div>
                      {!isArchived && (
                        <>
                          <select
                            value={m.manualStatus || "auto"}
                            onChange={(e) => setMilestoneManualStatus(m.id, e.target.value as any, "").then(load)}
                            title="Override status"
                            className="h-8 px-2 border border-neutral-200 rounded-md text-[11px] font-['Lexend:Regular',_sans-serif] bg-white"
                          >
                            <option value="auto">Auto</option>
                            <option value="not_started">Not started</option>
                            <option value="in_progress">In progress</option>
                            <option value="at_risk">At risk</option>
                            <option value="completed">Completed</option>
                          </select>
                          <button
                            onClick={() => deleteMilestone(m.id).then(load)}
                            className="text-neutral-300 hover:text-red-500 p-1"
                          >
                            <Icons.Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    {msTasks.length > 0 && <div className="mt-2"><UI.ProgressBar value={msPct} tone={msPct === 100 ? "good" : "neutral"} /></div>}
                  </div>
                );
              })}
            </div>
          )}
        </UI.Card>
      )}

      {tab === "tasks" && (
        <UI.Card bodyClassName="p-0">
          {pTasks.length === 0 ? (
            <UI.SectionEmpty icon={<Icons.ListTodo size={26} />} title="No tasks linked" description="Tasks linked to this project appear here." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {pTasks.map((t) => {
                return (
                  <button key={t.id} onClick={() => setOpenTask(t)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{t.title}</div>
                      <div className="text-[10.5px] text-neutral-400 mt-0.5">{t.assigneeName || "Unassigned"}{t.teamMemberNames && t.teamMemberNames.length > 1 ? ` + ${t.teamMemberNames.length - 1}` : ""} · {formatDate(t.deadline || t.dueDate)}</div>
                    </div>
                    <Badges.TaskStatusBadge status={t.status} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </UI.Card>
      )}

      {tab === "members" && (
        <UI.Card>
          {memberProfiles.length === 0 ? (
            <UI.SectionEmpty icon={<Icons.Users size={26} />} title="No members yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {memberProfiles.map(({ member, profile }) => (
                <div key={member.userId} className="flex items-center gap-2.5 border border-neutral-200 rounded-lg p-2.5">
                  <Badges.InitialsAvatar name={profile.full_name} size={32} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{profile.full_name}</div>
                    <div className="text-[11px] text-neutral-400 capitalize">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </UI.Card>
      )}

      <TaskDetailDrawer task={openTask} onClose={() => setOpenTask(null)} canReview />
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-neutral-500">{label}</span>
      <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">{value}</span>
    </div>
  );
}

// ─── Composer ────────────────────────────────────────────────────
