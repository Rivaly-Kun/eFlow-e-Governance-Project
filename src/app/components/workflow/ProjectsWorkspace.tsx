// ─── ProjectsWorkspace (shared) ──────────────────────────────────
// Projects list + composer + detail, in one scope-parameterized surface reused
// by the Department Head (own subtree) and Super Admin (system-wide, with a
// cross-org filter). RLS enforces the real boundary; the `scope` prop drives
// which org options and default org the composer offers.

import React, { useEffect, useMemo, useState } from "react";
import {
  FolderKanban,
  Plus,
  Archive,
  ArchiveRestore,

  ChevronLeft,
  Calendar,
  Users,
  Target,
  Flag,
  Trash2,
  X,
  Milestone as MilestoneIcon,
  Building2,
  CheckCircle2,
  ListTodo,
  ChevronDown,
  FileText,
} from "lucide-react";
import ProposalImport from "../DeptHead/ProposalImport";
import {
  createProject,
  archiveProject,
  restoreProject,
  fetchProjectMembers,
  fetchMilestones,
  createMilestone,
  deleteMilestone,
  setMilestoneManualStatus,
  deriveMilestoneStatus,
  type Project,
  type Milestone,
  type ProjectMember,
} from "../../services/projectService";
import { useProjectsData } from "../../hooks/useSupabaseData";
import { useTasks, useUsers } from "../../hooks/useFirebaseData";
import { useOrgs } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../ui/Toast";
import type { Task } from "../../services/taskService";
import type { UserProfile, Organization } from "../../types";
import {
  PageHeader,
  StatCard,
  WButton,
  SearchInput,
  WSelect,
  Card,
  SectionEmpty,
  LoadingState,
  ProgressBar,
  formatDate,
  relativeDays,
} from "./primitives";
import { ProjectStatusBadge, PriorityPill, InitialsAvatar } from "./StatusBadges";
import { TaskStatusBadge } from "./StatusBadges";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

export interface ProjectScope {
  /** super admin sees all orgs; dept head is limited to their subtree. */
  isSuperAdmin: boolean;
  /** org ids the user may create/place projects in (empty = all for admin). */
  scopedOrgIds: string[];
}

const MILESTONE_STATUS_META: Record<string, { label: string; tone: string }> = {
  not_started: { label: "Not started", tone: "bg-neutral-100 text-neutral-600" },
  in_progress: { label: "In progress", tone: "bg-blue-50 text-blue-700" },
  at_risk: { label: "At risk", tone: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", tone: "bg-emerald-50 text-emerald-700" },
};

// ─── Main ProjectsWorkspace ───────────────────────────────────────
export function ProjectsWorkspace({ scope, eyebrow }: { scope: ProjectScope; eyebrow: string }) {
  const { projects: dbProjects, loading: projectsLoading } = useProjectsData();
  const { loading: tasksLoading } = useTasks();
  const { orgs } = useOrgs();
  const { can } = useAuth();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [orgFilter, setOrgFilter] = useState("all");

  const inScope = useMemo(() => {
    if (scope.isSuperAdmin || scope.scopedOrgIds.length === 0) return dbProjects;
    return dbProjects.filter((p) => !p.orgId || scope.scopedOrgIds.includes(p.orgId));
  }, [dbProjects, scope]);

  const filtered = useMemo(() => {
    let rows = inScope;
    if (statusFilter === "active") rows = rows.filter((p) => p.status !== "archived");
    else if (statusFilter === "archived") rows = rows.filter((p) => p.status === "archived");
    else if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (scope.isSuperAdmin && orgFilter !== "all") rows = rows.filter((p) => p.orgId === orgFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return rows;
  }, [inScope, statusFilter, orgFilter, query, scope.isSuperAdmin]);

  const detail = detailId ? dbProjects.find((p) => p.id === detailId) : null;
  const loading = projectsLoading || tasksLoading;

  if (loading) return <div className="p-8"><LoadingState label="Loading projects…" /></div>;

  if (detail) {
    return <ProjectDetail project={detail} onBack={() => setDetailId(null)} orgs={orgs} canArchive={can("projects.archive")} />;
  }

  const active = inScope.filter((p) => p.status !== "archived");
  const orgOptions = [{ value: "all", label: "All departments" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))];

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow={eyebrow}
        title="Projects"
        subtitle="Create, track, and manage all your projects and proposal programmes."
        actions={
          can("projects.create") ? (
            <div className="relative inline-flex items-center">
              {/* Primary Action: New project */}
              <button
                onClick={() => setComposerOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer border-r border-neutral-700 h-[34px]"
              >
                <Plus size={14} />
                New project
              </button>

              {/* Dropdown Toggle */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center justify-center px-2 py-2 rounded-r-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer h-[34px]"
              >
                <ChevronDown size={14} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-[38px] z-20 w-[180px] bg-white border border-neutral-200 rounded-lg shadow-lg py-1 mt-1 origin-top-right transition-all">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setImportOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-neutral-700 hover:bg-neutral-50 transition-colors text-left font-['Lexend:Regular',_sans-serif]"
                    >
                      <FileText size={14} className="text-neutral-400" />
                      Import Proposal PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Active" value={active.filter((p) => p.status === "active").length} tone="info" icon={<FolderKanban size={15} />} />
        <StatCard label="Planning" value={active.filter((p) => p.status === "planning").length} icon={<Flag size={15} />} />
        <StatCard label="On hold" value={active.filter((p) => p.status === "on_hold").length} tone="warn" icon={<Target size={15} />} />
        <StatCard label="Completed" value={inScope.filter((p) => p.status === "completed").length} tone="good" icon={<CheckCircle2 size={15} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search projects…" className="w-[260px]" />
        <WSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "active", label: "Active" },
            { value: "planning", label: "Planning" },
            { value: "on_hold", label: "On hold" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All statuses" },
          ]}
        />
        {scope.isSuperAdmin && <WSelect value={orgFilter} onChange={setOrgFilter} options={orgOptions} />}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <SectionEmpty
            icon={<FolderKanban size={30} />}
            title={query ? "No matching projects" : "No projects yet"}
            description={query ? "Try a different search." : "Create your first project to organize milestones and tasks."}
            action={
              can("projects.create") && !query ? (
                <div className="flex items-center gap-2">
                  <WButton icon={<Plus size={14} />} variant="primary" onClick={() => setComposerOpen(true)}>
                    New project
                  </WButton>
                  <WButton icon={<FileText size={14} />} variant="secondary" onClick={() => setImportOpen(true)}>
                    Import Proposal PDF
                  </WButton>
                </div>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} orgs={orgs} onOpen={() => setDetailId(p.id)} />
          ))}
        </div>
      )}

      {composerOpen && (
        <ProjectComposer scope={scope} orgs={orgs} onClose={() => setComposerOpen(false)} onCreated={(id) => { setComposerOpen(false); setDetailId(id); }} />
      )}

      {importOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close button in top right of modal */}
            <button
              onClick={() => setImportOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            {/* Importer View */}
            <div className="flex-1 overflow-y-auto">
              <ProposalImport onClose={() => setImportOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Project card ────────────────────────────────────────────────
function ProjectCard({ project, orgs, onOpen }: { project: Project; orgs: Organization[]; onOpen: () => void }) {
  const { tasks } = useTasks();
  const pTasks = tasks.filter((t) => (t.linkedProjectId === project.id || t.projectId === project.id) && !t.archivedAt);
  const done = pTasks.filter((t) => t.status === "completed").length;
  const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
  const orgName = orgs.find((o) => o.id === project.orgId)?.name;
  const rel = relativeDays(project.targetDate);

  return (
    <button
      onClick={onOpen}
      className="text-left bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm hover:border-neutral-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <ProjectStatusBadge status={project.status} size="sm" />
          {project.description?.toLowerCase().includes("proposal") && (
            <span className="bg-blue-50 text-blue-700 text-[10px] font-['Lexend:SemiBold',_sans-serif] px-1.5 py-0.5 rounded">
              Proposal
            </span>
          )}
        </div>
        <PriorityPill priority={project.priority} />
      </div>
      <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-snug line-clamp-2">
        {project.title}
      </h3>
      {orgName && (
        <div className="flex items-center gap-1 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">
          <Building2 size={11} /> {orgName}
        </div>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-500 mb-1">
          <span>{done}/{pTasks.length} tasks</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <ProgressBar value={pct} tone={pct === 100 ? "good" : "neutral"} />
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
        {project.targetDate && (
          <span className={`flex items-center gap-1 ${rel.overdue ? "text-red-500" : ""}`}>
            <Calendar size={11} /> {formatDate(project.targetDate)}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Project detail ──────────────────────────────────────────────
function ProjectDetail({
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
  const [tab, setTab] = useState<"overview" | "milestones" | "tasks" | "members">("overview");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [openTask, setOpenTask] = useState<Task | null>(null);
  const [newMilestone, setNewMilestone] = useState("");
  const [newMsDate, setNewMsDate] = useState("");

  const pTasks = useMemo(() => tasks.filter((t) => (t.linkedProjectId === project.id || t.projectId === project.id) && !t.archivedAt), [tasks, project.id]);

  const load = () => {
    fetchMilestones(project.id).then(setMilestones);
    fetchProjectMembers(project.id).then(setMembers);
  };
  useEffect(() => { load(); }, [project.id]);

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
        <ChevronLeft size={15} /> Back to projects
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <ProjectStatusBadge status={project.status} />
            <PriorityPill priority={project.priority} />
            {orgName && <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 flex items-center gap-1"><Building2 size={11} /> {orgName}</span>}
          </div>
          <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{project.title}</h1>
          {project.description && (
            <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>
        {canArchive && (
          isArchived ? (
            <WButton icon={<ArchiveRestore size={14} />} onClick={async () => { await restoreProject(project.id); toast("Project restored.", "success"); }}>
              Restore
            </WButton>
          ) : (
            <WButton
              icon={<Archive size={14} />}
              variant="danger"
              onClick={async () => {
                const reason = window.prompt("Reason for archiving (recorded in audit log):") || undefined;
                await archiveProject(project.id, reason);
                toast("Project archived. History preserved.", "success");
              }}
            >
              Archive
            </WButton>
          )
        )}
      </div>

      {isArchived && (
        <div className="mb-4 bg-neutral-100 border border-neutral-200 rounded-lg px-3 py-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 flex items-center gap-2">
          <Archive size={13} /> This project is archived — read only. New work is blocked but history and reports remain available.
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Completion" value={`${pct}%`} hint={`${done}/${pTasks.length} tasks`} tone="good" />
        <StatCard label="Milestones" value={milestones.length} icon={<MilestoneIcon size={15} />} />
        <StatCard label="Members" value={members.length} icon={<Users size={15} />} />
        <StatCard label="Target date" value={formatDate(project.targetDate)} hint={relativeDays(project.targetDate).label} />
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
            <Card title="Progress overview">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">Overall completion</span>
                  <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{pct}%</span>
                </div>
                <ProgressBar value={pct} tone={pct === 100 ? "good" : "neutral"} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(["todo", "in_progress", "for_review", "completed"] as const).map((s) => (
                  <div key={s} className="bg-neutral-50 rounded-lg p-2.5 text-center">
                    <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">
                      {pTasks.filter((t) => t.status === s).length}
                    </div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 capitalize">{s.replace("_", " ")}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
          <Card title="Details">
            <div className="space-y-3 text-[12.5px] font-['Lexend:Regular',_sans-serif]">
              <Row label="Owner" value={owner?.full_name || "—"} />
              <Row label="Status" value={<ProjectStatusBadge status={project.status} size="sm" />} />
              <Row label="Priority" value={<PriorityPill priority={project.priority} />} />
              <Row label="Start" value={formatDate(project.startDate)} />
              <Row label="Target" value={formatDate(project.targetDate)} />
              <Row label="Created" value={formatDate(project.createdAt)} />
            </div>
          </Card>
        </div>
      )}

      {tab === "milestones" && (
        <Card>
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
              <WButton icon={<Plus size={14} />} variant="primary" onClick={addMilestone}>Add</WButton>
            </div>
          )}
          {milestones.length === 0 ? (
            <SectionEmpty icon={<MilestoneIcon size={26} />} title="No milestones" description="Break the project into milestones to track its state." />
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
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                    {msTasks.length > 0 && <div className="mt-2"><ProgressBar value={msPct} tone={msPct === 100 ? "good" : "neutral"} /></div>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "tasks" && (
        <Card bodyClassName="p-0">
          {pTasks.length === 0 ? (
            <SectionEmpty icon={<ListTodo size={26} />} title="No tasks linked" description="Tasks linked to this project appear here." />
          ) : (
            <div className="divide-y divide-neutral-100">
              {pTasks.map((t) => {
                const rejected = !!t.rejectionNote && t.status === "in_progress";
                return (
                  <button key={t.id} onClick={() => setOpenTask(t)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{t.title}</div>
                      <div className="text-[10.5px] text-neutral-400 mt-0.5">{t.assigneeName || "Unassigned"} · {formatDate(t.deadline || t.dueDate)}</div>
                    </div>
                    <TaskStatusBadge status={t.status} rejected={rejected} size="sm" />
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      )}

      {tab === "members" && (
        <Card>
          {memberProfiles.length === 0 ? (
            <SectionEmpty icon={<Users size={26} />} title="No members yet" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {memberProfiles.map(({ member, profile }) => (
                <div key={member.userId} className="flex items-center gap-2.5 border border-neutral-200 rounded-lg p-2.5">
                  <InitialsAvatar name={profile.full_name} size={32} />
                  <div className="min-w-0">
                    <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{profile.full_name}</div>
                    <div className="text-[11px] text-neutral-400 capitalize">{member.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
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
function ProjectComposer({
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [orgId, setOrgId] = useState(userProfile?.org_id || "");
  const [ownerId, setOwnerId] = useState(userProfile?.id || "");
  const [startDate, setStartDate] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [milestones, setMilestones] = useState<{ title: string; dueDate: string }[]>([]);
  const [msTitle, setMsTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Org options limited to scope.
  const allowedOrgs = useMemo(() => {
    if (scope.isSuperAdmin || scope.scopedOrgIds.length === 0) return orgs;
    return orgs.filter((o) => scope.scopedOrgIds.includes(o.id));
  }, [orgs, scope]);

  // Candidate members: within scoped orgs.
  const candidates = useMemo(() => {
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
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1"><X size={18} /></button>
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
                    <InitialsAvatar name={u?.full_name} size={16} /> {u?.full_name?.split(" ")[0]}
                    <button onClick={() => setMemberIds(memberIds.filter((m) => m !== id))} className="text-neutral-400 hover:text-neutral-700"><X size={11} /></button>
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
                  <MilestoneIcon size={12} className="text-neutral-400" />
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 flex-1 truncate">{m.title}</span>
                  <button onClick={() => setMilestones(milestones.filter((_, x) => x !== i))} className="text-neutral-400 hover:text-red-500"><X size={12} /></button>
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
              <WButton icon={<Plus size={14} />} onClick={() => { if (msTitle.trim()) { setMilestones([...milestones, { title: msTitle.trim(), dueDate: "" }]); setMsTitle(""); } }}>Add</WButton>
            </div>
          </Labeled>
        </div>

        <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2">
          <WButton onClick={onClose}>Cancel</WButton>
          <WButton variant="primary" onClick={submit} disabled={saving} icon={<FolderKanban size={14} />}>
            {saving ? "Creating…" : "Create project"}
          </WButton>
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
