import * as React from "react";
import type { Organization } from "../../../types";
import { PARTICIPATION_ROLE_LABELS } from "../constants";
import type { CollaborationDecision, CollaborationParticipant } from "../types";

export function CollaborationDecisionPanel({
  organizations,
  eligibleOrganizations,
  selectedOrgId,
  busy,
  onSelectOrg,
  onDecide,
}: {
  organizations: Organization[];
  eligibleOrganizations: CollaborationParticipant[];
  selectedOrgId?: string;
  busy: boolean;
  onSelectOrg: (orgId: string) => void;
  onDecide: (decision: CollaborationDecision, reason: string) => Promise<void>;
}) {
  const [decision, setDecision] = React.useState<CollaborationDecision | null>(null);
  const [reason, setReason] = React.useState("");
  const selected = eligibleOrganizations.find((item) => item.orgId === selectedOrgId) || eligibleOrganizations[0];
  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Organization decision</div>
        {eligibleOrganizations.length > 1 && <select value={selected?.orgId} onChange={(event) => onSelectOrg(event.target.value)} className="h-8 rounded-lg border border-neutral-200 bg-white px-2 text-[10px] text-neutral-700">{eligibleOrganizations.map((participant) => <option key={participant.orgId} value={participant.orgId}>{organizations.find((org) => org.id === participant.orgId)?.name} · {PARTICIPATION_ROLE_LABELS[participant.participationRole]}</option>)}</select>}
      </div>
      <div className="mt-2 text-[10px] text-neutral-500">Acting for {organizations.find((org) => org.id === selected?.orgId)?.name}</div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button data-testid="approve-collaboration-revision" onClick={() => setDecision("approved")} className="rounded-lg bg-emerald-600 px-3 py-2 text-[10px] font-['Lexend:Medium',_sans-serif] text-white">Approve current revision</button>
        <button onClick={() => setDecision("changes_requested")} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[10px] text-amber-800">Request changes</button>
        <button onClick={() => setDecision("declined")} className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[10px] text-red-700">Decline</button>
      </div>
      {decision && <div className="mt-3 rounded-xl bg-neutral-50 p-3"><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder={decision === "approved" ? "Optional endorsement note" : "Reason required"} className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[10px] outline-none" /><div className="mt-2 flex justify-end gap-2"><button onClick={() => { setDecision(null); setReason(""); }} className="px-3 py-2 text-[10px] text-neutral-500">Cancel</button><button data-testid="confirm-collaboration-decision" disabled={busy || !selected || (decision !== "approved" && !reason.trim())} onClick={async () => { await onDecide(decision, reason); setDecision(null); setReason(""); }} className="rounded-lg bg-neutral-900 px-3 py-2 text-[10px] text-white disabled:opacity-40">Confirm decision</button></div></div>}
    </section>
  );
}
