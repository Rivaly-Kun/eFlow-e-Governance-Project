import { GitCompareArrows, History } from "lucide-react";
import type { UserProfile } from "../../../types";
import { summarizeRevisionDiff } from "../selectors/revisionDiff";
import type { CollaborationRevision } from "../types";

export function RevisionTimeline({ revisions, profiles }: { revisions: CollaborationRevision[]; profiles: UserProfile[] }) {
  const sorted = [...revisions].sort((a, b) => b.revisionNumber - a.revisionNumber);
  return <div className="space-y-3">{sorted.map((revision, index) => {
    const previous = sorted[index + 1];
    const diff = previous ? summarizeRevisionDiff(previous.snapshot, revision.snapshot) : ["Initial proposal snapshot"];
    const author = profiles.find((profile) => profile.id === revision.createdBy);
    return <article key={revision.id} className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex items-start gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-700">{index === 0 ? <GitCompareArrows size={15} /> : <History size={15} />}</div><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Revision {revision.revisionNumber}</div>{index === 0 && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[8px] uppercase text-violet-700">Current</span>}</div><div className="mt-1 text-[10px] text-neutral-500">{revision.changeSummary}</div><div className="mt-2 space-y-1">{diff.map((item) => <div key={item} className="text-[9px] text-neutral-500">• {item}</div>)}</div><div className="mt-3 text-[9px] text-neutral-400">{author?.full_name || "User"} · {new Date(revision.createdAt).toLocaleString()}</div></div></div></article>;
  })}</div>;
}
