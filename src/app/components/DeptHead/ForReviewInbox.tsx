// ─── ForReviewInbox ──────────────────────────────────────────────
// A dedicated review workspace, not a filtered Kanban column. Left: the queue
// of for_review tasks; right: the selected submission with full context
// (employee, project/milestone, submitted time, latest progress, attachments,
// prior rejection feedback) and the approve / request-changes actions.

import React, { useEffect, useMemo, useState } from "react";
import {
  Inbox,
  Clock,
  CheckCircle2,
  Search,
  Building2,
  Layers,
  ChevronRight,
  Gauge,
} from "lucide-react";
import { useTasks } from "../../hooks/useFirebaseData";
import { useScopedOrgIds } from "../../hooks/useSupabaseData";
import type { Task } from "../../services/taskService";
import {
  fetchProgressUpdates,
  type ProgressUpdate,
} from "../../services/taskDiscussionService";
import {
  PageHeader,
  SearchInput,
  WSelect,
  SectionEmpty,
  LoadingState,
  formatDate,
} from "../workflow/primitives";
import { InitialsAvatar, PriorityPill } from "../workflow/StatusBadges";
import { TaskReviewPanel } from "../workflow/TaskReviewPanel";
import { TaskActivityTimeline } from "../workflow/TaskActivityTimeline";

function timeAgo(ts: number): string {
  const h = Math.floor((Date.now() - ts) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function ForReviewInbox() {
  const { tasks, loading } = useTasks();
  const { scopedOrgIds, isSuperAdmin } = useScopedOrgIds();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("oldest");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressUpdate[]>([]);

  const queue = useMemo(() => {
    let rows = tasks.filter((t) => t.status === "for_review" && !t.archivedAt);
    if (!isSuperAdmin && scopedOrgIds.length > 0) {
      rows = rows.filter((t) => !t.orgId || scopedOrgIds.includes(t.orgId));
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          (t.assigneeName || "").toLowerCase().includes(q) ||
          (t.projectTitle || "").toLowerCase().includes(q),
      );
    }
    const submitAt = (t: Task) => t.latestSubmission?.submittedAt || t.updatedAt;
    rows.sort((a, b) =>
      sort === "oldest" ? submitAt(a) - submitAt(b) : submitAt(b) - submitAt(a),
    );
    return rows;
  }, [tasks, scopedOrgIds, isSuperAdmin, query, sort]);

  // Keep a valid selection.
  useEffect(() => {
    if (queue.length === 0) {
      setSelectedId(null);
    } else if (!selectedId || !queue.find((t) => t.id === selectedId)) {
      setSelectedId(queue[0].id);
    }
  }, [queue, selectedId]);

  const selected = queue.find((t) => t.id === selectedId) || null;

  useEffect(() => {
    if (!selected) { setProgress([]); return; }
    fetchProgressUpdates(selected.id).then(setProgress);
  }, [selected?.id]);

  const latestProgress = progress[0];

  if (loading) return <div className="p-8"><LoadingState label="Loading the review queue…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow={isSuperAdmin ? "Administration · Reviews" : "Dept. Head · Reviews"}
        title="For Review"
        subtitle="Validate submitted work and keep the pipeline moving."
        actions={
          <div className="inline-flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 text-[12px] font-['Lexend:Medium',_sans-serif] text-amber-700">
            <Inbox size={14} /> {queue.length} awaiting review
          </div>
        }
      />

      {queue.length === 0 && !query ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <SectionEmpty
            icon={<CheckCircle2 size={30} />}
            title="Inbox zero"
            description="No submissions are waiting for review. Great job keeping up!"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(300px,380px)_1fr] gap-4">
          {/* Queue */}
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col">
            <div className="p-3 border-b border-neutral-100 flex items-center gap-2">
              <SearchInput value={query} onChange={setQuery} placeholder="Search submissions…" className="flex-1" />
              <WSelect
                value={sort}
                onChange={setSort}
                options={[
                  { value: "oldest", label: "Oldest first" },
                  { value: "newest", label: "Newest first" },
                ]}
              />
            </div>
            <div className="divide-y divide-neutral-100 overflow-y-auto max-h-[calc(100vh-260px)]">
              {queue.length === 0 ? (
                <div className="py-10 text-center text-[12px] text-neutral-400">No matches for “{query}”.</div>
              ) : (
                queue.map((t) => {
                  const isSel = t.id === selectedId;
                  const submittedAt = t.latestSubmission?.submittedAt || t.updatedAt;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left p-3 flex gap-3 transition-colors ${isSel ? "bg-neutral-50" : "hover:bg-neutral-50/60"}`}
                    >
                      <InitialsAvatar name={t.assigneeName} size={32} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate flex-1">
                            {t.title}
                          </span>
                          <PriorityPill priority={t.priority} />
                        </div>
                        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate mt-0.5">
                          {t.assigneeName || "Unassigned"}
                          {t.projectTitle ? ` · ${t.projectTitle}` : ""}
                        </div>
                        <div className="flex items-center gap-1 text-[10.5px] text-neutral-400 mt-0.5">
                          <Clock size={10} /> {timeAgo(submittedAt)}
                          {t.rejectionNote && (
                            <span className="ml-1 text-rose-500 font-['Lexend:Medium',_sans-serif]">· resubmitted</span>
                          )}
                        </div>
                      </div>
                      <ChevronRight size={14} className={`self-center shrink-0 ${isSel ? "text-neutral-600" : "text-neutral-300"}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Detail */}
          <div className="min-w-0">
            {selected ? (
              <div className="space-y-4">
                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <h2 className="text-[17px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selected.title}</h2>
                      <div className="flex items-center gap-3 mt-1 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 flex-wrap">
                        <span className="flex items-center gap-1"><InitialsAvatar name={selected.assigneeName} size={18} /> {selected.assigneeName || "Unassigned"}</span>
                        {selected.teamName && <span className="flex items-center gap-1"><Building2 size={12} /> {selected.teamName}</span>}
                        {selected.projectTitle && <span className="flex items-center gap-1"><Layers size={12} /> {selected.projectTitle}</span>}
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(selected.latestSubmission?.submittedAt || selected.updatedAt)}</span>
                      </div>
                    </div>
                    <PriorityPill priority={selected.priority} />
                  </div>

                  {selected.description && (
                    <div className="text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-3 whitespace-pre-wrap">
                      {selected.description}
                    </div>
                  )}

                  {latestProgress && (
                    <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-2.5 mb-3">
                      <div className="flex items-center gap-1.5 text-[10.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wide text-blue-700 mb-1">
                        <Gauge size={12} /> Latest progress · {latestProgress.percentComplete ?? "—"}%
                      </div>
                      {latestProgress.nextStep && (
                        <div className="text-[12px] text-neutral-700"><b className="font-['Lexend:Medium',_sans-serif]">Next:</b> {latestProgress.nextStep}</div>
                      )}
                      {latestProgress.note && (
                        <div className="text-[12px] text-neutral-600">{latestProgress.note}</div>
                      )}
                    </div>
                  )}

                  <TaskReviewPanel task={selected} compact onDone={() => { /* realtime removes it from queue */ }} />
                </div>

                <div className="bg-white border border-neutral-200 rounded-xl p-4">
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 mb-2">Activity</div>
                  <TaskActivityTimeline taskId={selected.id} />
                </div>
              </div>
            ) : (
              <div className="bg-white border border-neutral-200 rounded-xl h-full flex items-center justify-center">
                <SectionEmpty icon={<Search size={26} />} title="Select a submission" description="Pick a task from the queue to review it." />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
