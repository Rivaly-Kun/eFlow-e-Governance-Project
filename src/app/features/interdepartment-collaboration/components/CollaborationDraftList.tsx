import { ArrowRight, Building2, CheckCircle2, Clock3, FileClock, FileText, Inbox, ShieldCheck } from "lucide-react";
import type { Organization } from "../../../types";
import { COLLABORATION_STATUS_LABELS } from "../constants";
import { isActiveCollaborationDraft } from "../selectors/draftVisibility";
import type { CollaborationDraft } from "../types";

export function CollaborationDraftList({ drafts, organizations, mode, currentOrgId, accessibleOrgIds = [], showAll = false, onOpen }: {
  drafts: CollaborationDraft[];
  organizations: Organization[];
  mode: "owned" | "incoming";
  currentOrgId: string;
  accessibleOrgIds?: string[];
  showAll?: boolean;
  onOpen: (draftId: string) => void;
}) {
  const updatedLabel = (updatedAt: number) => {
    const minutes = Math.max(0, Math.floor((Date.now() - updatedAt) / 60_000));
    if (minutes < 1) return "Updated just now";
    if (minutes < 60) return `Updated ${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Updated ${hours}h ago`;
    return `Updated ${Math.floor(hours / 24)}d ago`;
  };
  const accessible = new Set([currentOrgId, ...accessibleOrgIds].filter(Boolean));
  const activeDrafts = drafts.filter(isActiveCollaborationDraft);
  const rows = showAll ? activeDrafts : activeDrafts.filter((draft) => mode === "owned"
    ? draft.ownerOrgId === currentOrgId
    : draft.snapshot.organizations.some((org) => org.participationRole !== "owner" && accessible.has(org.orgId)));
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-12 text-center">
        {mode === "owned" ? <FileClock className="mx-auto text-neutral-300" size={28} /> : <Inbox className="mx-auto text-neutral-300" size={28} />}
        <div className="mt-3 text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-700">{mode === "owned" ? "No active collaboration drafts" : "No incoming review requests"}</div>
        <div className="mt-1 text-[11px] text-neutral-400">{mode === "owned" ? "Use Build work plan or Import PDF with AI to create one." : "Requests from participating organizations appear here."}</div>
      </div>
    );
  }
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{rows.map((draft) => {
    const owner = organizations.find((org) => org.id === draft.ownerOrgId);
    const participants = draft.snapshot.organizations.map((selection) => organizations.find((org) => org.id === selection.orgId)?.name).filter(Boolean);
    const reviewerCount = draft.snapshot.organizations.filter((selection) => selection.participationRole !== "owner").length;
    return (
      <button key={draft.id} type="button" onClick={() => onOpen(draft.id)} className="group rounded-2xl border border-neutral-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${draft.sourceType === "ai_pdf" ? "bg-violet-50 text-violet-700" : "bg-blue-50 text-blue-700"}`}>
            {draft.sourceType === "ai_pdf" ? <FileText size={17} /> : <Building2 size={17} />}
          </div>
          <span className={`rounded-full px-2 py-1 text-[9px] font-['Lexend:Medium',_sans-serif] uppercase ${draft.status === "ready_to_commit" ? "bg-emerald-50 text-emerald-700" : draft.status === "changes_requested" ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-600"}`}>{COLLABORATION_STATUS_LABELS[draft.status]}</span>
        </div>
        <h3 className="mt-3 line-clamp-2 text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{draft.title}</h3>
        <div className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400"><ShieldCheck size={11} /> Owner · {owner?.name || "Organization"}</div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[9px] text-neutral-500"><span className="rounded-md bg-neutral-100 px-1.5 py-1">Revision {draft.currentRevisionNumber || 1}</span><span className="inline-flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> {draft.approvedOrganizations || 0} / {draft.requiredOrganizations ?? reviewerCount} external approvals</span></div>
        <div className="mt-3 flex flex-wrap gap-1">{participants.slice(0, 4).map((name) => <span key={name} className="rounded-md border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[9px] text-neutral-600">{name}</span>)}{participants.length > 4 && <span className="text-[9px] text-neutral-400">+{participants.length - 4}</span>}</div>
        <div className="mt-4 flex items-center justify-between border-t border-neutral-100 pt-3 text-[10px] text-neutral-400"><span className="inline-flex items-center gap-1"><Clock3 size={10} /> {updatedLabel(draft.updatedAt)}</span><span className="inline-flex items-center gap-1 text-neutral-700 group-hover:text-violet-700">Open draft <ArrowRight size={11} /></span></div>
      </button>
    );
  })}</div>;
}
