// ─── SubtasksWorkspace ──────────────────────────────────────────────
// Dedicated Subtasks Workspace for viewing, filtering, and checking off
// subtasks assigned to the user across all department projects and tasks.

import { useState, useEffect, useMemo } from "react";
import {
  ListChecks,
  CheckCircle2,
  Clock,
  Sparkles,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import { useTasksData } from "../../hooks/useSupabaseData";
import { type Subtask, toggleSubtask } from "../../services/subtaskService";
import type { Task } from "../../services/taskService";
import {
  PageHeader,
  StatCard,
  Card,
  SearchInput,
  WSelect,
  SectionEmpty,
  LoadingState,
} from "./primitives";
import { TaskStatusBadge, PriorityPill } from "./StatusBadges";
import { TaskDetailDrawer } from "./TaskDetailDrawer";

export function SubtasksWorkspace() {
  const { user } = useAuth();
  const { tasks: allTasks, loading: tasksLoading } = useTasksData();
  const [subtasks, setSubtasks] = useState<(Subtask & { parentTask?: Task })[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [activeTaskDetail, setActiveTaskDetail] = useState<Task | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    const loadSubtasks = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("subtasks")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        if (data) {
          // Filter subtasks where assigned_to_ids contains user.id or assigned_to === user.id
          const userSubtasks = data.filter((row: Record<string, unknown>) => {
            const ids = Array.isArray(row.assigned_to_ids)
              ? (row.assigned_to_ids as string[])
              : row.assigned_to
              ? [row.assigned_to as string]
              : [];
            return ids.includes(user.id);
          });

          // Map with parent task
          const taskMap = new Map(allTasks.map((t) => [t.id, t]));
          const mapped = userSubtasks.map((row: Record<string, unknown>) => {
            const rawIds = row.assigned_to_ids;
            const assignedToIds: string[] = Array.isArray(rawIds)
              ? (rawIds as string[])
              : row.assigned_to
              ? [row.assigned_to as string]
              : [];

            const st: Subtask = {
              id: row.id as string,
              taskId: row.task_id as string,
              title: row.title as string,
              isCompleted: (row.is_completed as boolean) || false,
              completedBy: (row.completed_by as string) || undefined,
              completedAt: row.completed_at ? new Date(row.completed_at as string).getTime() : undefined,
              assignedTo: (row.assigned_to as string) || (assignedToIds[0] || undefined),
              assignedToIds,
              position: (row.position as number) || 0,
              source: (row.source as "ai_extracted" | "template" | "manual") || "manual",
              createdBy: (row.created_by as string) || undefined,
              createdAt: new Date(row.created_at as string).getTime(),
              updatedAt: new Date(row.updated_at as string).getTime(),
            };

            return {
              ...st,
              parentTask: taskMap.get(st.taskId),
            };
          });

          setSubtasks(mapped);
        }
      } catch (err) {
        console.error("Failed to load user subtasks:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSubtasks();

    // Subscribe to realtime subtasks updates
    const channel = supabase
      .channel(`user-subtasks-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtasks" },
        () => loadSubtasks(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, allTasks]);

  const filtered = useMemo(() => {
    let rows = subtasks;
    if (statusFilter === "pending") rows = rows.filter((st) => !st.isCompleted);
    else if (statusFilter === "completed") rows = rows.filter((st) => st.isCompleted);

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (st) =>
          st.title.toLowerCase().includes(q) ||
          (st.parentTask?.title || "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [subtasks, statusFilter, query]);

  // Group subtasks by Parent Task
  const grouped = useMemo(() => {
    const map = new Map<string, { parentTask?: Task; subtasks: typeof filtered }>();
    filtered.forEach((st) => {
      const key = st.taskId;
      if (!map.has(key)) {
        map.set(key, { parentTask: st.parentTask, subtasks: [] });
      }
      map.get(key)!.subtasks.push(st);
    });
    return Array.from(map.values());
  }, [filtered]);

  const totalCount = subtasks.length;
  const completedCount = subtasks.filter((st) => st.isCompleted).length;
  const pendingCount = totalCount - completedCount;

  if (loading || tasksLoading) {
    return (
      <div className="p-8">
        <LoadingState label="Loading your assigned subtasks…" />
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 min-h-full font-['Lexend:Regular',_sans-serif]">
      <PageHeader
        eyebrow="My Workspace · Subtasks"
        title="My Subtask Checklist"
        subtitle="Track, check off, and manage all action items assigned to you across projects."
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          label="Total Subtasks"
          value={totalCount}
          icon={<ListChecks size={15} />}
        />
        <StatCard
          label="Pending Items"
          value={pendingCount}
          tone={pendingCount > 0 ? "warn" : "neutral"}
          icon={<Clock size={15} />}
        />
        <StatCard
          label="Completed"
          value={completedCount}
          tone="good"
          icon={<CheckCircle2 size={15} />}
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search subtasks or tasks…"
          className="w-[260px]"
        />
        <WSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Items" },
            { value: "pending", label: "Pending Only" },
            { value: "completed", label: "Completed" },
          ]}
        />
      </div>

      {/* Subtasks Grouped List */}
      {grouped.length === 0 ? (
        <Card bodyClassName="p-0">
          <SectionEmpty
            icon={<CheckCircle2 size={32} />}
            title="No subtasks found"
            description="You don't have any subtasks matching the current filter."
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => {
            const parent = group.parentTask;

            return (
              <Card key={group.parentTask?.id || Math.random().toString()} bodyClassName="p-4">
                {/* Parent Task Header */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 truncate">
                      {parent?.title || "Parent Task"}
                    </span>
                    {parent?.priority && <PriorityPill priority={parent.priority} />}
                    {parent?.status && <TaskStatusBadge status={parent.status} size="sm" />}
                  </div>

                  {parent && (
                    <button
                      onClick={() => setActiveTaskDetail(parent)}
                      className="text-[11px] font-['Lexend:Medium',_sans-serif] text-blue-600 hover:text-blue-700 flex items-center gap-1 shrink-0"
                    >
                      View Task Details <ChevronRight size={12} />
                    </button>
                  )}
                </div>

                {/* Subtask items */}
                <div className="space-y-2">
                  {group.subtasks.map((st) => (
                    <div
                      key={st.id}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        st.isCompleted
                          ? "bg-neutral-50/70 border-neutral-100"
                          : "bg-white border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={st.isCompleted}
                        onChange={(e) => toggleSubtask(st.id, e.target.checked, user?.id)}
                        className="h-4 w-4 rounded border-neutral-300 accent-emerald-600 cursor-pointer shrink-0"
                      />
                      <span
                        className={`flex-1 text-[13px] font-['Lexend:Regular',_sans-serif] ${
                          st.isCompleted
                            ? "text-neutral-400 line-through"
                            : "text-neutral-900"
                        }`}
                      >
                        {st.title}
                      </span>

                      {st.source === "ai_extracted" && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] uppercase tracking-wider text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full font-['Lexend:SemiBold',_sans-serif] shrink-0">
                          <Sparkles size={9} /> AI Extracted
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Task Drawer */}
      <TaskDetailDrawer
        task={activeTaskDetail}
        onClose={() => setActiveTaskDetail(null)}
        canPostProgress
        canDiscuss
        onChanged={() => {}}
      />
    </div>
  );
}
