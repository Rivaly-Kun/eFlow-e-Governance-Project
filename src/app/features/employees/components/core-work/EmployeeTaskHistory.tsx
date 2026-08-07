import { useMemo, useState } from 'react';
import { Archive, CheckCircle2, History, RotateCcw, XCircle } from 'lucide-react';
import type { Task } from '../../../../services/taskService';
import { Card, LoadingState, PageHeader, SectionEmpty, formatDate } from '../../../../components/workflow/primitives';
import { TaskStatusBadge } from '../../../../components/workflow/StatusBadges';
import { TaskDetailDrawer } from '../../../../components/workflow/TaskDetailDrawer';
import { useMyTasks } from './useMyTasks';

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
