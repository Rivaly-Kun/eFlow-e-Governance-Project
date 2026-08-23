import type { ReactNode } from "react";
import { ClipboardCheck, Columns3, FileText, GitPullRequest, Landmark, MessageSquare, Network, ReceiptText, ShieldCheck, Users } from "lucide-react";
import type { Organization } from "../../../types";
import { COLLABORATION_STATUS_LABELS } from "../constants";
import type { CollaborationDraft, CollaborationDraftSnapshot, CollaborationRevision } from "../types";

export type CollaborationWorkspaceTab = "overview" | "board" | "source" | "plan" | "budget" | "people" | "discussion" | "changes" | "approvals" | "governance" | "revisions";

const tabs: Array<{ id: CollaborationWorkspaceTab; label: string; icon: ReactNode }> = [
  { id: "overview", label: "Overview", icon: <Network size={12} /> },
  { id: "board", label: "Board", icon: <Columns3 size={12} /> },
  { id: "source", label: "Source PDF", icon: <FileText size={12} /> },
  { id: "plan", label: "Plan", icon: <ClipboardCheck size={12} /> },
  { id: "budget", label: "Budget", icon: <ReceiptText size={12} /> },
  { id: "people", label: "People", icon: <Users size={12} /> },
  { id: "discussion", label: "Discussion", icon: <MessageSquare size={12} /> },
  { id: "changes", label: "Changes", icon: <GitPullRequest size={12} /> },
  { id: "approvals", label: "Approvals", icon: <ShieldCheck size={12} /> },
  { id: "governance", label: "Governance", icon: <Landmark size={12} /> },
  { id: "revisions", label: "Revisions", icon: <GitPullRequest size={12} /> },
];

export function CollaborationWorkspaceHeader({
  draft,
  snapshot,
  currentRevision,
  owner,
  participantCount,
  openChangeCount,
  tab,
  onTabChange,
  readyToPublish,
  deliveryLabel,
  showDeliveryBoard = false,
  departmentOnly = false,
}: {
  draft: CollaborationDraft;
  snapshot: CollaborationDraftSnapshot;
  currentRevision?: CollaborationRevision;
  owner?: Organization;
  participantCount: number;
  openChangeCount: number;
  tab: CollaborationWorkspaceTab;
  onTabChange: (tab: CollaborationWorkspaceTab) => void;
  readyToPublish?: boolean;
  deliveryLabel?: string;
  showDeliveryBoard?: boolean;
  departmentOnly?: boolean;
}) {
  return (
    <header className="rounded-2xl bg-gradient-to-br from-neutral-950 to-neutral-800 p-5 text-white shadow-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-[9px] uppercase tracking-[0.2em] text-neutral-400">
            {draft.sourceType === "ai_pdf" ? "AI PDF proposal" : "Manual work plan"} · Revision {currentRevision?.revisionNumber || 1}
          </div>
          <h1 className="mt-2 text-[20px] font-['Lexend:SemiBold',_sans-serif]">{draft.title}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-neutral-300">
            <span>Owner · {owner?.name}</span><span>•</span>
            <span>{snapshot.tasks.filter((task) => task.enabled).length} {["committed", "archived"].includes(draft.status) ? "published" : "proposed"} tasks</span><span>•</span>
            <span>{participantCount} {participantCount === 1 ? "organization" : "organizations"}</span>
          </div>
        </div>
        <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[9px] uppercase tracking-wide">
          {["committed", "archived"].includes(draft.status) && deliveryLabel ? deliveryLabel : readyToPublish && !["committed", "archived"].includes(draft.status) ? "Ready to publish" : COLLABORATION_STATUS_LABELS[draft.status]}
        </span>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {tabs.filter((item) => (item.id !== "board" || showDeliveryBoard) && (!departmentOnly || (item.id !== "approvals" && item.id !== "governance"))).map((item) => (
          <button
            type="button"
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] transition ${tab === item.id ? "bg-white text-neutral-900" : "bg-white/5 text-neutral-300 hover:bg-white/10"}`}
          >
            {item.icon}{item.label}
            {item.id === "changes" && openChangeCount > 0 && <span className="rounded-full bg-amber-500 px-1.5 text-[8px] text-white">{openChangeCount}</span>}
          </button>
        ))}
      </div>
    </header>
  );
}
