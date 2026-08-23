import * as React from "react";
import { Clock3, UserRoundCog } from "lucide-react";
import type { Organization, UserProfile } from "../../../types";
import type { Task } from "../../tasks";
import type { CollaborationApproval, CollaborationChangeRequest, CollaborationDraft, CollaborationDraftSnapshot, CollaborationParticipant, CollaborationRevision, ProposalGovernanceState } from "../types";
import { archiveProposalDelivery, completeProposalDelivery, decideProposalCloseout, getGovernanceMinutesUrl, recuseAndDelegateReview, requestProposalCloseout, saveGovernanceConfiguration, saveGovernanceRecord, setTaskGovernanceRoute } from "../services/governanceService";
import { openGovernanceDecisionPacket } from "../services/governanceDecisionPacket";
import { GovernanceRosterPanel } from "./governance/GovernanceRosterPanel";
import { GovernanceCloseoutPanel } from "./governance/GovernanceCloseoutPanel";
import { GovernanceRecordPanel } from "./governance/GovernanceRecordPanel";
import { TaskGovernanceRoutingPanel } from "./governance/TaskGovernanceRoutingPanel";
import { GovernanceTimelinePanel } from "./governance/GovernanceTimelinePanel";

export function GovernanceWorkspace({ draft, snapshot, revision, revisions, participants, approvals, changeRequests, governance, organizations, profiles, operationalTasks, isOwner, actingOrgId, busy, onAct, onRefresh, onSaveRevision }: {
  draft: CollaborationDraft;
  snapshot: CollaborationDraftSnapshot;
  revision?: CollaborationRevision;
  revisions: CollaborationRevision[];
  participants: CollaborationParticipant[];
  approvals: CollaborationApproval[];
  changeRequests: CollaborationChangeRequest[];
  governance: ProposalGovernanceState;
  organizations: Organization[];
  profiles: UserProfile[];
  operationalTasks: Task[];
  isOwner: boolean;
  actingOrgId?: string;
  busy: boolean;
  onAct: (operation: () => Promise<void>, success: string) => Promise<void>;
  onRefresh: () => Promise<void>;
  onSaveRevision: (snapshot: CollaborationDraftSnapshot, summary: string) => Promise<void>;
}) {
  const published = draft.status === "committed" || draft.status === "archived";
  const allTasksApproved = operationalTasks.length > 0 && operationalTasks.every((task) => task.status === "completed" || task.status === "cancelled" || Boolean(task.archivedAt));
  const [recusalOpen, setRecusalOpen] = React.useState(false);
  const [recusalReason, setRecusalReason] = React.useState("");
  const [delegateId, setDelegateId] = React.useState("");
  const actingCandidates = profiles.filter((profile) => profile.is_active && profile.org_id === actingOrgId);
  const refreshBoth = async () => { await onRefresh(); };
  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="Required organizations" value={participants.filter((item) => ["participant", "governance"].includes(item.participationRole)).length} /><Metric label="Named decision makers" value={governance.assignments.filter((item) => ["primary_approver", "backup_approver", "delegate"].includes(item.role)).length} /><Metric label="Current sign-offs" value={governance.signoffs.filter((item) => item.revisionId === draft.currentRevisionId && item.decision === "approved").length} /><Metric label="Closeout" value={governance.closeout?.status.replace("_", " ") || (published ? "Not requested" : "After delivery")} /></div>

    <GovernanceRosterPanel participants={participants} assignments={governance.assignments} organizations={organizations} profiles={profiles} editable={isOwner && !published} busy={busy} onSave={(organizationConfig, assignments) => onAct(async () => { await saveGovernanceConfiguration({ draftId: draft.id, organizations: organizationConfig, assignments }); await refreshBoth(); }, "Governance roster and approval policy saved.")} />

    <TaskGovernanceRoutingPanel snapshot={snapshot} participants={participants} organizations={organizations} operationalTasks={operationalTasks} editableDraft={isOwner && !published} canManagePublished={isOwner && draft.status === "committed"} busy={busy} onSaveDraft={(next) => onSaveRevision(next, "Task governance routing updated")} onSetPublishedRoute={(taskId, mode, orgId) => onAct(async () => { await setTaskGovernanceRoute(taskId, mode, orgId); await refreshBoth(); }, "Task review route updated.")} />

    {actingOrgId && !published && <section className="rounded-2xl border border-neutral-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><div className="flex items-center gap-2 text-[11px] font-medium"><UserRoundCog size={14} /> Conflict, recusal, and temporary delegation</div><p className="mt-1 text-[9px] text-neutral-500">If you have a conflict, record it instead of sharing credentials or silently passing the decision.</p></div><button type="button" onClick={() => setRecusalOpen((value) => !value)} className="rounded-lg border border-neutral-200 px-3 py-2 text-[9px] text-neutral-600">{recusalOpen ? "Cancel" : "Recuse or delegate"}</button></div>{recusalOpen && <div className="mt-3 grid gap-2 rounded-xl border border-violet-200 bg-violet-50 p-3 sm:grid-cols-[1fr_220px_auto]"><input value={recusalReason} onChange={(event) => setRecusalReason(event.target.value)} placeholder="Required conflict or recusal reason" className="h-9 rounded-lg border border-violet-200 bg-white px-3 text-[10px] outline-none" /><select value={delegateId} onChange={(event) => setDelegateId(event.target.value)} className="h-9 rounded-lg border border-violet-200 bg-white px-2 text-[10px]"><option value="">Recuse without delegate</option>{actingCandidates.map((profile) => <option key={profile.id} value={profile.id}>{profile.full_name}</option>)}</select><button type="button" disabled={busy || !recusalReason.trim()} onClick={() => void onAct(async () => { await recuseAndDelegateReview({ draftId: draft.id, organizationId: actingOrgId, reason: recusalReason, delegateTo: delegateId }); setRecusalOpen(false); setRecusalReason(""); setDelegateId(""); await refreshBoth(); }, "Recusal recorded and delegation updated.")} className="rounded-lg bg-violet-700 px-3 py-2 text-[9px] text-white disabled:opacity-40">Record recusal</button></div>}</section>}

    {published && <GovernanceCloseoutPanel closeout={governance.closeout} decisions={governance.closeoutDecisions} participants={participants} organizations={organizations} allTasksApproved={allTasksApproved} canManage={isOwner} decisionOrgId={actingOrgId && participants.some((item) => item.orgId === actingOrgId && item.participationRole === "governance") ? actingOrgId : undefined} busy={busy} onRequest={(note) => onAct(async () => { await requestProposalCloseout(draft.id, note); await refreshBoth(); }, "Proposal closeout requested.")} onDecide={(decision, reason, resolutionNumber, meetingDate) => onAct(async () => { await decideProposalCloseout({ draftId: draft.id, organizationId: actingOrgId!, decision, reason, resolutionNumber, meetingDate }); await refreshBoth(); }, "Closeout decision recorded.")} onComplete={(note) => onAct(async () => { await completeProposalDelivery(draft.id, note); await refreshBoth(); }, "Proposal delivery completed atomically.")} onArchive={(reason) => onAct(async () => { await archiveProposalDelivery(draft.id, reason); await refreshBoth(); }, "Proposal archived. Linked tasks were removed from active Task Boards.")} />}

    <GovernanceRecordPanel records={governance.records} signoffs={governance.signoffs} organizations={organizations} profiles={profiles} actingOrgId={actingOrgId} busy={busy} onSaveRecord={(input) => onAct(async () => { await saveGovernanceRecord({ draftId: draft.id, organizationId: actingOrgId!, ...input }); await refreshBoth(); }, "Formal governance record saved.")} onOpenMinutes={async (path) => { window.open(await getGovernanceMinutesUrl(path), "_blank", "noopener,noreferrer"); }} onDownloadPacket={() => openGovernanceDecisionPacket({ draft, revision, organizations, profiles, assignments: governance.assignments, approvals, signoffs: governance.signoffs, records: governance.records, closeout: governance.closeout, closeoutDecisions: governance.closeoutDecisions, tasks: operationalTasks })} />

    <GovernanceTimelinePanel revisions={revisions} approvals={approvals} changes={changeRequests} signoffs={governance.signoffs} records={governance.records} closeout={governance.closeout} closeoutDecisions={governance.closeoutDecisions} tasks={operationalTasks} organizations={organizations} profiles={profiles} />

  </div>;
}

function Metric({ label, value }: { label: string; value: string | number }) { return <div className="rounded-xl border border-neutral-200 bg-white p-3"><div className="flex items-center gap-1.5 text-[8.5px] uppercase tracking-wide text-neutral-400"><Clock3 size={10} />{label}</div><div className="mt-1 text-[17px] font-semibold capitalize text-neutral-900">{value}</div></div>; }
