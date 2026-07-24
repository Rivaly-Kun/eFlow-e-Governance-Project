// ─── Employee Core Work screens ──────────────────────────────────
// My Projects, My Tasks (with progress updates + discussion), Task History,
// Deadlines, and My Work Report. All scoped to the signed-in employee's own
// assigned / team tasks — they never see other employees' private outputs.

import React, { useMemo, useState } from "react";
import {
  FolderKanban,
  ListTodo,
  History,
  CalendarClock,
  FileText,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Archive,
  Clock,
  AlertTriangle,
  Inbox,
} from "lucide-react";
import { useProjectsData } from "../../hooks/useSupabaseData";
import { useCurrentUserTasks } from "../../hooks/useCurrentUserTasks";
import { useAuth } from "../../contexts/AuthContext";
import type { Task } from "../../services/taskService";
import { isActive } from "../../services/taskSelectors";
import { exportCsv, exportPdf, type ReportColumn } from "../../services/reportService";
import {
  PageHeader,
  StatCard,
  Card,
  SearchInput,
  WSelect,
  ExportMenu,
  SectionEmpty,
  LoadingState,
  ProgressBar,
  formatDate,
  relativeDays,
} from "../workflow/primitives";
import { TaskStatusBadge, ProjectStatusBadge, PriorityPill } from "../workflow/StatusBadges";
import { TaskDetailDrawer } from "../workflow/TaskDetailDrawer";

// Shared: is this task "mine" (assignee or team member)?
function useMyTasks() {
  const { tasks, loading } = useCurrentUserTasks();
  return { mine: tasks, loading };
}

// ══════════════════════ My Tasks ══════════════════════════════════
// Active work with a detail drawer that exposes progress updates + discussion.
export function EmployeeMyTasks() {
  const { mine, loading } = useMyTasks();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [open, setOpen] = useState<Task | null>(null);

  const active = useMemo(() => mine.filter((t) => !t.archivedAt), [mine]);
  const filtered = useMemo(() => {
    let rows = active;
    if (statusFilter === "active") rows = rows.filter((t) => t.status !== "completed");
    else if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((t) => t.title.toLowerCase().includes(q));
    }
    return rows.sort((a, b) => {
      const da = new Date(a.deadline || a.dueDate || 0).getTime();
      const db = new Date(b.deadline || b.dueDate || 0).getTime();
      return da - db;
    });
  }, [active, statusFilter, query]);

  // "Needs changes" is now the first-class changes_requested state (not an
  // in_progress task carrying a note), so history/reports separate rework from
  // ordinary work.
  const rejected = active.filter((t) => t.status === "changes_requested");

  if (loading) return <div className="p-8"><LoadingState label="Loading your tasks…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader eyebrow="My Workspace · Tasks" title="My Tasks" subtitle="Post progress, discuss, and submit your work." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Active" value={active.filter((t) => t.status !== "completed").length} icon={<ListTodo size={15} />} />
        <StatCard label="In progress" value={active.filter((t) => t.status === "in_progress").length} tone="info" />
        <StatCard label="In review" value={active.filter((t) => t.status === "for_review").length} tone="warn" />
        <StatCard label="Needs changes" value={rejected.length} tone={rejected.length ? "bad" : "good"} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search my tasks…" className="w-[240px]" />
        <WSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "active", label: "Active" },
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "changes_requested", label: "Needs Changes" },
            { value: "for_review", label: "In Review" },
            { value: "all", label: "All" },
          ]}
        />
      </div>

      <Card bodyClassName="p-0">
        {filtered.length === 0 ? (
          <SectionEmpty icon={<CheckCircle2 size={30} />} title="Nothing here" description="No tasks match — enjoy the clear queue!" />
        ) : (
          <div className="divide-y divide-neutral-100">
            {filtered.map((t) => {
              const rel = relativeDays(t.deadline || t.dueDate);
              const pct = t.percentComplete ?? 0;
              return (
                <button key={t.id} onClick={() => setOpen(t)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{t.title}</span>
                      <PriorityPill priority={t.priority} />
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-24"><ProgressBar value={pct} tone={pct === 100 ? "good" : rel.overdue ? "bad" : "neutral"} /></div>
                      <span className="text-[10.5px] text-neutral-400 tabular-nums">{pct}%</span>
                      <span className={`text-[10.5px] ${rel.overdue ? "text-red-600" : "text-neutral-400"}`}>{rel.label}</span>
                    </div>
                  </div>
                  <TaskStatusBadge status={t.status} size="sm" />
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <TaskDetailDrawer task={open} onClose={() => setOpen(null)} canPostProgress canDiscuss onChanged={() => {}} />
    </div>
  );
}

// ══════════════════════ My Projects ═══════════════════════════════
export function EmployeeMyProjects() {
  const { mine } = useMyTasks();
  const { projects, loading } = useProjectsData();
  const [open, setOpen] = useState<Task | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Projects I have tasks in (via linked_project_id) — no confidential data.
  const myProjectIds = useMemo(() => new Set(mine.map((t) => t.linkedProjectId).filter(Boolean) as string[]), [mine]);
  const myProjects = useMemo(() => projects.filter((p) => myProjectIds.has(p.id)), [projects, myProjectIds]);

  if (loading) return <div className="p-8"><LoadingState label="Loading your projects…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader eyebrow="My Workspace · Projects" title="My Projects" subtitle="Projects you're contributing to." />

      {myProjects.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <SectionEmpty icon={<FolderKanban size={30} />} title="No projects yet" description="Projects you're assigned tasks in will appear here." />
        </div>
      ) : (
        <div className="space-y-3">
          {myProjects.map((p) => {
            const pTasks = mine.filter((t) => t.linkedProjectId === p.id && !t.archivedAt);
            const done = pTasks.filter((t) => t.status === "completed").length;
            const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
            const isExp = expandedId === p.id;
            return (
              <div key={p.id} className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
                <button onClick={() => setExpandedId(isExp ? null : p.id)} className="w-full text-left p-4 hover:bg-neutral-50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1"><ProjectStatusBadge status={p.status} size="sm" /><PriorityPill priority={p.priority} /></div>
                      <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{p.title}</h3>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{pct}%</div>
                      <div className="text-[10px] text-neutral-400">{done}/{pTasks.length} my tasks</div>
                    </div>
                  </div>
                  <div className="mt-2"><ProgressBar value={pct} tone={pct === 100 ? "good" : "neutral"} /></div>
                </button>
                {isExp && (
                  <div className="border-t border-neutral-100 divide-y divide-neutral-50">
                    {pTasks.map((t) => {
                      const rel = relativeDays(t.deadline || t.dueDate);
                      return (
                        <button key={t.id} onClick={() => setOpen(t)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                          <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 truncate flex-1">{t.title}</span>
                          <span className={`text-[10.5px] ${rel.overdue ? "text-red-600" : "text-neutral-400"}`}>{formatDate(t.deadline || t.dueDate)}</span>
                          <TaskStatusBadge status={t.status} size="sm" />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <TaskDetailDrawer task={open} onClose={() => setOpen(null)} canPostProgress canDiscuss />
    </div>
  );
}

// ══════════════════════ Task History ══════════════════════════════
export function EmployeeTaskHistory() {
  const { mine, loading } = useMyTasks();
  const [tab, setTab] = useState<"completed" | "rejected" | "reopened" | "archived">("completed");
  const [open, setOpen] = useState<Task | null>(null);

  const buckets = useMemo(() => ({
    completed: mine.filter((t) => t.status === "completed" && !t.archivedAt),
    rejected: mine.filter((t) => t.status === "changes_requested" && !t.archivedAt),
    reopened: mine.filter((t) => t.reopenReason && !t.archivedAt),
    archived: mine.filter((t) => !!t.archivedAt),
  }), [mine]);

  if (loading) return <div className="p-8"><LoadingState label="Loading your history…" /></div>;

  const rows = buckets[tab];
  const tabMeta = [
    { id: "completed", label: "Completed", icon: <CheckCircle2 size={13} /> },
    { id: "rejected", label: "Needs changes", icon: <XCircle size={13} /> },
    { id: "reopened", label: "Reopened", icon: <RotateCcw size={13} /> },
    { id: "archived", label: "Archived", icon: <Archive size={13} /> },
  ] as const;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader eyebrow="My Workspace · History" title="Task History" subtitle="Your finished and past work, kept out of your active queue." />

      <div className="flex items-center gap-1 mb-4 flex-wrap">
        {tabMeta.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] ${tab === t.id ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
          >
            {t.icon} {t.label} <span className="tabular-nums opacity-70">({buckets[t.id].length})</span>
          </button>
        ))}
      </div>

      <Card bodyClassName="p-0">
        {rows.length === 0 ? (
          <SectionEmpty icon={<History size={30} />} title="Nothing here yet" description="This history bucket is empty." />
        ) : (
          <div className="divide-y divide-neutral-100">
            {rows.map((t) => (
              <button key={t.id} onClick={() => setOpen(t)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{t.title}</div>
                  <div className="text-[10.5px] text-neutral-400 mt-0.5">
                    {tab === "completed" ? `Completed ${formatDate(t.updatedAt)}` :
                     tab === "rejected" ? `Feedback: ${t.rejectionNote}` :
                     tab === "reopened" ? `Reopened: ${t.reopenReason}` :
                     `Archived ${formatDate(t.archivedAt)}`}
                  </div>
                </div>
                <TaskStatusBadge status={t.archivedAt ? "archived" : t.status} size="sm" />
              </button>
            ))}
          </div>
        )}
      </Card>

      <TaskDetailDrawer task={open} onClose={() => setOpen(null)} canDiscuss={false} />
    </div>
  );
}

// ══════════════════════ Deadlines ═════════════════════════════════
export function EmployeeDeadlines() {
  const { mine, loading } = useMyTasks();
  const [open, setOpen] = useState<Task | null>(null);

  const active = useMemo(() => mine.filter(isActive), [mine]);

  const groups = useMemo(() => {
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endToday = startToday + 86400000;
    const overdue: Task[] = [], today: Task[] = [], upcoming: Task[] = [], awaiting: Task[] = [];
    active.forEach((t) => {
      if (t.status === "for_review") { awaiting.push(t); return; }
      const dl = t.deadline || t.dueDate;
      if (!dl || (typeof dl === "string" && /month|phase|week|quarter|ongoing|tbd|q[1-4]/i.test(dl))) { upcoming.push(t); return; }
      const d = new Date(dl);
      if (isNaN(d.getTime())) { upcoming.push(t); return; }
      const time = d.getTime();
      if (time < startToday) overdue.push(t);
      else if (time < endToday) today.push(t);
      else upcoming.push(t);
    });
    const byDate = (a: Task, b: Task) => new Date(a.deadline || a.dueDate || 0).getTime() - new Date(b.deadline || b.dueDate || 0).getTime();
    return { overdue: overdue.sort(byDate), today: today.sort(byDate), upcoming: upcoming.sort(byDate), awaiting };
  }, [active]);

  if (loading) return <div className="p-8"><LoadingState label="Loading deadlines…" /></div>;

  const section = (title: string, tasks: Task[], tone: "bad" | "warn" | "neutral" | "info", _icon: React.ReactNode) => (
    <Card title={`${title} (${tasks.length})`} bodyClassName="p-0" className="mb-3">
      {tasks.length === 0 ? (
        <div className="px-4 py-5 text-[12px] text-neutral-400 text-center">Nothing here.</div>
      ) : (
        <div className="divide-y divide-neutral-100">
          {tasks.map((t) => {
            const rel = relativeDays(t.deadline || t.dueDate);
            return (
              <button key={t.id} onClick={() => setOpen(t)} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-neutral-50">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${tone === "bad" ? "bg-red-500" : tone === "warn" ? "bg-amber-500" : tone === "info" ? "bg-blue-500" : "bg-neutral-400"}`} />
                <span className="text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 truncate flex-1">{t.title}</span>
                <span className={`text-[10.5px] font-['Lexend:Medium',_sans-serif] ${rel.overdue ? "text-red-600" : "text-neutral-400"}`}>{t.status === "for_review" ? "Awaiting review" : rel.label}</span>
                <TaskStatusBadge status={t.status} size="sm" />
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader eyebrow="My Workspace · Deadlines" title="Deadlines" subtitle="Stay ahead of what's due and what's waiting on review." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Overdue" value={groups.overdue.length} tone={groups.overdue.length ? "bad" : "good"} icon={<AlertTriangle size={15} />} />
        <StatCard label="Due today" value={groups.today.length} tone={groups.today.length ? "warn" : "neutral"} icon={<Clock size={15} />} />
        <StatCard label="Upcoming" value={groups.upcoming.length} tone="info" icon={<CalendarClock size={15} />} />
        <StatCard label="Awaiting review" value={groups.awaiting.length} icon={<Inbox size={15} />} />
      </div>

      {section("Overdue", groups.overdue, "bad", null)}
      {section("Due today", groups.today, "warn", null)}
      {section("Awaiting review", groups.awaiting, "neutral", null)}
      {section("Upcoming", groups.upcoming, "info", null)}

      <TaskDetailDrawer task={open} onClose={() => setOpen(null)} canPostProgress canDiscuss />
    </div>
  );
}

// ══════════════════════ My Work Report ════════════════════════════
export function EmployeeWorkReport() {
  const { mine, loading } = useMyTasks();
  const { userProfile } = useAuth();
  const [statusFilter, setStatusFilter] = useState("all");
  const [period, setPeriod] = useState("30");

  const rows = useMemo(() => {
    let r = mine;
    if (statusFilter !== "all") r = r.filter((t) => t.status === statusFilter);
    const days = Number(period);
    if (days > 0) {
      const since = Date.now() - days * 86400000;
      r = r.filter((t) => t.createdAt >= since || t.updatedAt >= since);
    }
    return r;
  }, [mine, statusFilter, period]);

  const completed = rows.filter((t) => t.status === "completed").length;
  const rate = rows.length ? Math.round((completed / rows.length) * 100) : 0;

  const doExport = (kind: "csv" | "pdf") => {
    const cols: ReportColumn<Task>[] = [
      { key: "title", header: "Task", value: (t) => t.title },
      { key: "status", header: "Status", value: (t) => t.status },
      { key: "priority", header: "Priority", value: (t) => t.priority || "medium" },
      { key: "percent", header: "% complete", value: (t) => t.percentComplete ?? 0 },
      { key: "deadline", header: "Deadline", value: (t) => formatDate(t.deadline || t.dueDate) },
      { key: "updated", header: "Last update", value: (t) => formatDate(t.updatedAt) },
    ];
    const meta = {
      title: `My work report — ${userProfile?.full_name || "Me"}`,
      subtitle: "My Workspace · Personal report",
      filters: { Status: statusFilter === "all" ? "All" : statusFilter, Period: period === "0" ? "All time" : `Last ${period} days` },
      totals: { Tasks: rows.length, Completed: completed, "Completion rate": `${rate}%` },
    };
    kind === "csv" ? exportCsv(rows, cols, meta) : exportPdf(rows, cols, meta);
  };

  if (loading) return <div className="p-8"><LoadingState label="Preparing your report…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow="My Workspace · Report"
        title="My Work Report"
        subtitle="A personal summary of your tasks and progress — export anytime."
        actions={<ExportMenu onCsv={() => doExport("csv")} onPdf={() => doExport("pdf")} disabled={rows.length === 0} />}
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <WSelect value={statusFilter} onChange={setStatusFilter} options={[
          { value: "all", label: "All statuses" },
          { value: "in_progress", label: "In Progress" },
          { value: "for_review", label: "In Review" },
          { value: "completed", label: "Completed" },
        ]} />
        <WSelect value={period} onChange={setPeriod} options={[
          { value: "7", label: "Last 7 days" },
          { value: "30", label: "Last 30 days" },
          { value: "90", label: "Last 90 days" },
          { value: "0", label: "All time" },
        ]} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <StatCard label="Tasks" value={rows.length} icon={<FileText size={15} />} />
        <StatCard label="Completed" value={completed} tone="good" />
        <StatCard label="Completion rate" value={`${rate}%`} tone="good" />
      </div>

      <Card bodyClassName="p-0">
        {rows.length === 0 ? (
          <SectionEmpty icon={<FileText size={30} />} title="No tasks in range" description="Adjust the filters to include more of your work." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {["Task", "Status", "% complete", "Deadline", "Last update"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-neutral-50">
                    <td className="px-4 py-2.5 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.title}</td>
                    <td className="px-4 py-2.5"><TaskStatusBadge status={t.status} size="sm" /></td>
                    <td className="px-4 py-2.5 text-[12px] text-neutral-600 tabular-nums">{t.percentComplete ?? 0}%</td>
                    <td className="px-4 py-2.5 text-[12px] text-neutral-600">{formatDate(t.deadline || t.dueDate)}</td>
                    <td className="px-4 py-2.5 text-[12px] text-neutral-500">{formatDate(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
