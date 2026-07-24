// ─── Admin Tasks (system-wide) ───────────────────────────────────
// Cross-organization task inspector. Surfaces unassigned, overdue, orphaned,
// and blocked tasks, and opens any task's full review/activity history. Reuses
// the shared TaskDetailDrawer — no second task board.

import React, { useMemo, useState } from "react";
import {
  ListTodo,
  AlertTriangle,
  UserX,
  Inbox,
  Building2,
} from "lucide-react";
import { useTasks } from "../../hooks/useFirebaseData";
import { useOrgs } from "../../hooks/useSupabaseData";
import type { Task } from "../../services/taskService";
import { isOverdue, isUnassigned } from "../../services/taskSelectors";
import {
  PageHeader,
  StatCard,
  SearchInput,
  WSelect,
  Card,
  SectionEmpty,
  LoadingState,
  formatDate,
  relativeDays,
} from "../workflow/primitives";
import { TaskStatusBadge, PriorityPill } from "../workflow/StatusBadges";
import { TaskDetailDrawer } from "../workflow/TaskDetailDrawer";

export function AdminTasks() {
  const { tasks, loading } = useTasks();
  const { orgs } = useOrgs();
  const [query, setQuery] = useState("");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [special, setSpecial] = useState<"none" | "unassigned" | "overdue" | "orphaned" | "review">("none");
  const [open, setOpen] = useState<Task | null>(null);

  const active = useMemo(() => tasks.filter((t) => !t.archivedAt), [tasks]);
  const orgIds = useMemo(() => new Set(orgs.map((o) => o.id)), [orgs]);

  const filtered = useMemo(() => {
    let rows = active;
    if (orgFilter !== "all") rows = rows.filter((t) => t.orgId === orgFilter);
    if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);
    if (special === "unassigned") rows = rows.filter(isUnassigned);
    if (special === "overdue") rows = rows.filter(isOverdue);
    if (special === "orphaned") rows = rows.filter((t) => t.orgId && !orgIds.has(t.orgId));
    if (special === "review") rows = rows.filter((t) => t.status === "for_review");
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((t) => t.title.toLowerCase().includes(q) || (t.assigneeName || "").toLowerCase().includes(q));
    }
    return rows.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [active, orgFilter, statusFilter, special, query, orgIds]);

  const counts = useMemo(() => ({
    unassigned: active.filter((t) => !t.assigneeId || t.status === "pending_assignment").length,
    overdue: active.filter(isOverdue).length,
    review: active.filter((t) => t.status === "for_review").length,
    orphaned: active.filter((t) => t.orgId && !orgIds.has(t.orgId)).length,
  }), [active, orgIds]);

  if (loading) return <div className="p-8"><LoadingState label="Loading all tasks…" /></div>;

  const orgName = (id?: string) => (id ? orgs.find((o) => o.id === id)?.name || "Unknown org" : "—");

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow="Administration · Operations"
        title="All Tasks"
        subtitle="Inspect any task across every department, with its complete history."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <StatCard label="Unassigned" value={counts.unassigned} tone={counts.unassigned ? "info" : "neutral"} icon={<UserX size={15} />} onClick={() => setSpecial(special === "unassigned" ? "none" : "unassigned")} active={special === "unassigned"} />
        <StatCard label="Overdue" value={counts.overdue} tone={counts.overdue ? "bad" : "good"} icon={<AlertTriangle size={15} />} onClick={() => setSpecial(special === "overdue" ? "none" : "overdue")} active={special === "overdue"} />
        <StatCard label="In review" value={counts.review} tone={counts.review ? "warn" : "neutral"} icon={<Inbox size={15} />} onClick={() => setSpecial(special === "review" ? "none" : "review")} active={special === "review"} />
        <StatCard label="Orphaned" value={counts.orphaned} tone={counts.orphaned ? "bad" : "good"} icon={<Building2 size={15} />} onClick={() => setSpecial(special === "orphaned" ? "none" : "orphaned")} active={special === "orphaned"} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search tasks…" className="w-[240px]" />
        <WSelect value={orgFilter} onChange={setOrgFilter} options={[{ value: "all", label: "All departments" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))]} />
        <WSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All statuses" },
            { value: "pending_assignment", label: "Unassigned" },
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "for_review", label: "For Review" },
            { value: "completed", label: "Completed" },
          ]}
        />
        {special !== "none" && (
          <button onClick={() => setSpecial("none")} className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-900 underline">
            Clear quick filter
          </button>
        )}
      </div>

      <Card bodyClassName="p-0">
        {filtered.length === 0 ? (
          <SectionEmpty icon={<ListTodo size={30} />} title="No tasks match" description="Adjust the filters to see tasks." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  {["Task", "Assignee", "Department", "Status", "Deadline"].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.slice(0, 200).map((t) => {
                  const rel = relativeDays(t.deadline || t.dueDate);
                  const rejected = !!t.rejectionNote && t.status === "in_progress";
                  return (
                    <tr key={t.id} onClick={() => setOpen(t)} className="border-b border-neutral-50 hover:bg-neutral-50/70 cursor-pointer">
                      <td className="px-4 py-2.5">
                        <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 flex items-center gap-2">
                          {t.title}
                          <PriorityPill priority={t.priority} />
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-[12px] text-neutral-600">{t.assigneeName || "Unassigned"}</td>
                      <td className="px-4 py-2.5 text-[12px] text-neutral-500">{orgName(t.orgId)}</td>
                      <td className="px-4 py-2.5"><TaskStatusBadge status={t.status} rejected={rejected} size="sm" /></td>
                      <td className={`px-4 py-2.5 text-[12px] ${rel.overdue ? "text-red-600 font-['Lexend:Medium',_sans-serif]" : "text-neutral-600"}`}>{formatDate(t.deadline || t.dueDate)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TaskDetailDrawer task={open} onClose={() => setOpen(null)} canReview />
    </div>
  );
}
