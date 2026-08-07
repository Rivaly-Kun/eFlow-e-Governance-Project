// ─── YouAreLeadingView ──────────────────────────────────────────────
// Dynamic "Pinned — You're Leading" view.
// Role-agnostic: any user (Employee, Dept Head, etc.) who is the assigned lead
// on a task sees their leading tasks here, can review progress, and can assign
// subtasks to any of their task members.

import { useState, useMemo } from "react";
import {
  Star,
  CheckCircle2,
  Clock,
  ListTodo,
  UserCheck,
  ChevronRight,
  RotateCcw,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useTasks } from "../../hooks/useFirebaseData";
import { type Task } from "../../services/taskService";
import { isTaskLead } from "../../services/taskSelectors";
import {
  PageHeader,
  StatCard,
  SearchInput,
  WSelect,
  Card,
  SectionEmpty,
  LoadingState,
  ProgressBar,
  formatDate,
  relativeDays,
} from "./primitives";
import { TaskStatusBadge, PriorityPill, InitialsAvatar } from "./StatusBadges";
import { TaskSubtasksWidget } from "./TaskSubtasksWidget";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

export function YouAreLeadingView() {
  const { user } = useAuth();
  const { tasks, loading } = useTasks();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Explicit lead assignments win; legacy tasks fall back to their first member.
  const leadingTasks = useMemo(() => {
    if (!user?.id) return [];
    return tasks.filter((t) => !t.archivedAt && isTaskLead(t, user.id));
  }, [tasks, user?.id]);

  const filteredTasks = useMemo(() => {
    let rows = leadingTasks;
    if (statusFilter === "active") rows = rows.filter((t) => t.status !== "completed");
    else if (statusFilter !== "all") rows = rows.filter((t) => t.status === statusFilter);

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.projectTitle || "").toLowerCase().includes(q) ||
          (t.teamMemberNames || []).some((m) => m.toLowerCase().includes(q)),
      );
    }
    return rows.sort((a, b) => {
      const da = new Date(a.deadline || a.dueDate || 0).getTime();
      const db = new Date(b.deadline || b.dueDate || 0).getTime();
      return da - db;
    });
  }, [leadingTasks, statusFilter, query]);

  const stats = useMemo(() => {
    const active = leadingTasks.filter((t) => t.status !== "completed");
    const inReview = leadingTasks.filter((t) => t.status === "for_review");
    const done = leadingTasks.filter((t) => t.status === "completed");
    return {
      total: leadingTasks.length,
      active: active.length,
      inReview: inReview.length,
      completed: done.length,
    };
  }, [leadingTasks]);

  if (loading) return <div className="p-8"><LoadingState label="Loading tasks you're leading…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow="Leader Workspace · Pinned"
        title="Pinned — You're Leading"
        subtitle="Manage, review, and assign subtasks for all initiatives where you are the Team Lead."
      />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Leading Tasks"
          value={stats.total}
          icon={<Star size={15} className="text-amber-500" />}
        />
        <StatCard
          label="Active Work"
          value={stats.active}
          tone="info"
          icon={<ListTodo size={15} />}
        />
        <StatCard
          label="Awaiting Your Review"
          value={stats.inReview}
          tone={stats.inReview ? "warn" : "neutral"}
          icon={<UserCheck size={15} />}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          tone="good"
          icon={<CheckCircle2 size={15} />}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search leading tasks, members, programs…"
          className="w-[280px]"
        />
        <WSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Leading Tasks" },
            { value: "active", label: "Active Only" },
            { value: "todo", label: "To Do" },
            { value: "in_progress", label: "In Progress" },
            { value: "for_review", label: "In Review" },
            { value: "changes_requested", label: "Needs Changes" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>

      {/* Tasks List */}
      {filteredTasks.length === 0 ? (
        <Card bodyClassName="p-0">
          <SectionEmpty
            icon={<Star size={32} className="text-amber-400" />}
            title="No tasks pinned"
            description="Tasks where you are designated as Team Lead will automatically appear here."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((t) => {
            const rel = relativeDays(t.deadline || t.dueDate);
            const pct = t.percentComplete ?? 0;
            const memberIds = t.teamMemberIds || [];
            const memberNames = t.teamMemberNames || [];

            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-neutral-200 shadow-sm p-4 hover:border-neutral-300 transition"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-[10px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Star size={10} className="fill-amber-400 text-amber-500" /> You're Lead
                      </span>
                      <TaskStatusBadge status={t.status} />
                      <PriorityPill priority={t.priority} />
                    </div>
                    <h3
                      onClick={() => setSelectedTask(t)}
                      className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 hover:text-blue-600 cursor-pointer transition truncate"
                    >
                      {t.title}
                    </h3>
                    {t.description && (
                      <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500 line-clamp-2 mt-0.5">
                        {t.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    <button
                      onClick={() => setSelectedTask(t)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 text-neutral-800 text-[11.5px] font-['Lexend:Medium',_sans-serif] transition"
                    >
                      View Details <ChevronRight size={13} />
                    </button>
                  </div>
                </div>

                {/* Rejection / Undo Reason Alert Banner */}
                {t.status !== "completed" &&
                  (t.status === "changes_requested" || t.rejectionNote || t.reopenReason) && (
                    <div className="mb-3 p-3 rounded-lg bg-rose-50/90 border border-rose-200 text-rose-900 shadow-sm">
                      <div className="flex items-center gap-1.5 font-['Lexend:SemiBold',_sans-serif] text-[11px] uppercase tracking-wider text-rose-700 mb-1">
                        <RotateCcw size={13} className="text-rose-600" />
                        {t.status === "changes_requested"
                          ? "Changes Requested / Rejected for Rework"
                          : "Task Reopened / Undone"}
                      </div>
                      <div className="text-[12.5px] font-['Lexend:Regular',_sans-serif] text-rose-900 leading-relaxed">
                        <span className="font-['Lexend:Medium',_sans-serif]">Reason:</span>{" "}
                        {t.rejectionNote || t.reopenReason || "Action required. Please review feedback and update task."}
                      </div>
                      {(t.rejectedAt || t.reopenedAt) && (
                        <div className="mt-1 text-[10.5px] text-rose-600 font-['Lexend:Regular',_sans-serif]">
                          {t.reopenedByName ? `Undone by ${t.reopenedByName} · ` : ""}
                          {formatDate(t.rejectedAt || t.reopenedAt)}
                        </div>
                      )}
                    </div>
                  )}

                {/* Progress bar & details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3 p-2.5 rounded-lg bg-neutral-50 border border-neutral-100">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif] mb-0.5">
                      Overall Progress
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <ProgressBar value={pct} tone={pct === 100 ? "good" : rel.overdue ? "bad" : "neutral"} />
                      </div>
                      <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 tabular-nums">
                        {pct}%
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif] mb-0.5">
                      Deadline
                    </div>
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800 flex items-center gap-1">
                      <Clock size={12} className={rel.overdue ? "text-red-500" : "text-neutral-400"} />
                      <span>{formatDate(t.deadline || t.dueDate)}</span>
                      <span className={`text-[10px] ${rel.overdue ? "text-red-600 font-semibold" : "text-neutral-400"}`}>
                        ({rel.label})
                      </span>
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif] mb-0.5">
                      Team Members ({memberIds.length || 1})
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {memberNames.length > 0 ? (
                        memberNames.map((name, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-neutral-200 text-[11px] text-neutral-700 font-['Lexend:Medium',_sans-serif]"
                          >
                            <InitialsAvatar name={name} size={14} />
                            {name}
                          </span>
                        ))
                      ) : (
                        <span className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                          {t.assigneeName || "No extra members"}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subtask Widget - Allows Lead to assign subtasks to any team member */}
                <div className="border-t border-neutral-100 pt-2">
                  <TaskSubtasksWidget
                    taskId={t.id}
                    allowedAssignees={memberIds.map((id, idx) => ({
                      id,
                      name: memberNames[idx] || "Team Member",
                    }))}
                    canManage
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Drawer */}
      <TaskDetailDrawer
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        canReview={selectedTask?.status === "for_review"}
        canPostProgress
        canDiscuss
        onChanged={() => {}}
      />
    </div>
  );
}
