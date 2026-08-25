import * as React from "react";
import {
  ArrowLeft, Loader2,
} from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";
import type { Organization, UserProfile } from "../../../types";
import { useToast } from "../../../components/ui/Toast";
import { useCollaborationDraft } from "../hooks/useCollaborationDraft";
import { commitCollaborationDraft, publishDepartmentProposal } from "../services/collaborationCommitService";
import { recommendCollaborationAssignments } from "../services/collaborationCandidateService";
import { deleteCollaborationDraft, fetchMyCollaborationMemberships, saveCollaborationRevision, saveCollaborationStaffingRevision, setCollaborationOrganizations } from "../services/collaborationDraftService";
import {
  createCollaborationChangeRequest, decideCollaborationReview, requestCollaborationReview,
  resolveCollaborationChangeRequest, sendCollaborationMessage,
} from "../services/collaborationReviewService";
import type { CollaborationDraftSnapshot } from "../types";
import type { Project } from "../../projects/services/types";
import type { Task } from "../../tasks";
import { isExternalReviewParticipant } from "../selectors/organizationEligibility";
import { ChangeRequestsPanel } from "./ChangeRequestsPanel";
import { CollaborationDiscussion } from "./CollaborationDiscussion";
import { CollaborationPlanPanel } from "./CollaborationPlanPanel";
import { CollaborationReadiness } from "./CollaborationReadiness";
import { RevisionTimeline } from "./RevisionTimeline";
import { StaffingReviewPanel } from "./StaffingReviewPanel";
import { CollaborationActionRail } from "./CollaborationActionRail";
import { CollaborationDecisionPanel } from "./CollaborationDecisionPanel";
import { CollaborationSourcePanel } from "./CollaborationSourcePanel";
import { CollaborationWorkspaceHeader, type CollaborationWorkspaceTab } from "./CollaborationWorkspaceHeader";
import { DELIVERY_STAGE_LABELS } from "./CommittedProposalDeliveryPanel";
import { CollaborationOverviewPanel } from "./CollaborationOverviewPanel";
import { CommittedProposalBoard } from "./CommittedProposalBoard";
import { buildCommittedProposalDeliverySummary } from "../selectors/deliveryProgress";
import { useProposalGovernance } from "../hooks/useProposalGovernance";
import { GovernanceWorkspace } from "./GovernanceWorkspace";
import { CollaborationBudgetPanel } from "../../budget";

export function CollaborationDraftWorkspace({ draftId, organizations, profiles, operationalProjects, operationalTasks, readOnly = false, onBack, onCommitted, onOpenProject, onMarkProjectsCompleted, onArchiveProjects }: {
  draftId: string;
  organizations: Organization[];
  profiles: UserProfile[];
  operationalProjects: Project[];
  operationalTasks: Task[];
  readOnly?: boolean;
  onBack: () => void;
  onCommitted: () => void;
  onOpenProject: (projectId: string) => void;
  onMarkProjectsCompleted: (draftId: string) => Promise<void>;
  onArchiveProjects: (draftId: string) => Promise<void>;
}) {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const state = useCollaborationDraft(draftId);
  const governance = useProposalGovernance(draftId);
  const [tab, setTab] = React.useState<CollaborationWorkspaceTab>("overview");
  const [busy, setBusy] = React.useState(false);
  const [memberships, setMemberships] = React.useState<Array<{ organizationId: string; membershipRole: string }>>([]);
  const [actingOrgId, setActingOrgId] = React.useState("");
  React.useEffect(() => { if (userProfile?.id) void fetchMyCollaborationMemberships(userProfile.id).then(setMemberships).catch(() => setMemberships([])); }, [userProfile?.id]);
  const homeOrgId = userProfile?.org_id || userProfile?.departmentId || "";
  const approverOrgIds = React.useMemo(() => new Set([
    ...(["dept_head", "department_head", "assistant_head"].includes(userProfile?.role || "") ? [homeOrgId] : []),
    ...memberships.filter((item) => item.membershipRole !== "member").map((item) => item.organizationId),
    ...governance.assignments.filter((item) => item.userId === userProfile?.id && ["primary_approver", "backup_approver", "delegate"].includes(item.role)).map((item) => item.organizationId),
  ].filter(Boolean)), [governance.assignments, homeOrgId, memberships, userProfile?.id, userProfile?.role]);
  const eligibleReviewOrganizations = React.useMemo(
    () => state.participants.filter((participant) => isExternalReviewParticipant(participant) && approverOrgIds.has(participant.orgId)),
    [approverOrgIds, state.participants],
  );
  React.useEffect(() => {
    if (eligibleReviewOrganizations.length > 0 && !eligibleReviewOrganizations.some((item) => item.orgId === actingOrgId)) {
      setActingOrgId(eligibleReviewOrganizations[0].orgId);
    }
  }, [actingOrgId, eligibleReviewOrganizations]);
  const reviewOrganization = eligibleReviewOrganizations.find((participant) => participant.orgId === actingOrgId) || eligibleReviewOrganizations[0];
  const isOwner = Boolean(state.draft && state.draft.ownerOrgId === homeOrgId && ["dept_head", "department_head", "assistant_head"].includes(userProfile?.role || ""));
  const currentOrganizationApproval = state.approvals.find((approval) => approval.revisionId === state.draft?.currentRevisionId && approval.organizationId === reviewOrganization?.orgId);
  const canDecide = Boolean(reviewOrganization && !currentOrganizationApproval?.decision.includes("approved") && state.draft && ["in_review", "changes_requested", "ready_to_commit"].includes(state.draft.status));
  const departmentOnly = state.participants.length === 1 && state.participants[0]?.participationRole === "owner";
  React.useEffect(() => {
    if (departmentOnly && (tab === "approvals" || tab === "governance")) setTab("overview");
  }, [departmentOnly, tab]);

  const act = async (operation: () => Promise<void>, success: string) => {
    setBusy(true);
    try { await operation(); await state.refresh(); toast(success, "success"); }
    catch (error) { toast(error instanceof Error ? error.message : "The action could not be completed.", "error"); }
    finally { setBusy(false); }
  };
  const saveRevision = async (snapshot: CollaborationDraftSnapshot, summary: string) => act(async () => { await saveCollaborationRevision(draftId, snapshot, summary); }, "A new proposal revision was published. Existing approvals must be renewed.");
  const saveStaffingRevision = async (snapshot: CollaborationDraftSnapshot, summary: string) => {
    if (isOwner) return saveRevision(snapshot, summary);
    if (!reviewOrganization) throw new Error("No organization is selected for this staffing review.");
    return act(async () => { await saveCollaborationStaffingRevision(draftId, reviewOrganization.orgId, snapshot, summary); }, "Your staffing changes were published as a new proposal revision.");
  };

  if (state.loading) return <div className="flex min-h-[420px] items-center justify-center"><Loader2 className="animate-spin text-violet-600" size={24} /></div>;
  if (!state.draft || state.error) return <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-[12px] text-red-700">{state.error || "Collaboration draft not found."}<button onClick={onBack} className="ml-3 underline">Back</button></div>;
  const draft = state.draft;
  const currentRevision = state.revisions.find((revision) => revision.id === draft.currentRevisionId);
  const snapshot = draft.status === "draft" ? draft.snapshot : currentRevision?.snapshot || draft.snapshot;
  const ownerOrg = organizations.find((org) => org.id === draft.ownerOrgId);
  const delivery = buildCommittedProposalDeliverySummary(draft.id, operationalProjects, operationalTasks);
  const committed = draft.status === "committed" || draft.status === "archived";
  return <div className="min-h-full bg-neutral-50 p-6 sm:p-8">
    <button type="button" onClick={onBack} className="mb-4 inline-flex items-center gap-1.5 text-[11px] text-neutral-500 hover:text-neutral-900"><ArrowLeft size={13} /> Back to Plans &amp; Projects</button>
    <CollaborationWorkspaceHeader
      draft={draft}
      snapshot={snapshot}
      currentRevision={currentRevision}
      owner={ownerOrg}
      participantCount={state.participants.length}
      openChangeCount={state.changeRequests.filter((request) => request.status === "open").length}
      tab={tab}
      onTabChange={setTab}
      readyToPublish={Boolean(state.readiness?.ready)}
      deliveryLabel={committed ? DELIVERY_STAGE_LABELS[delivery.stage] : undefined}
      showDeliveryBoard={committed}
      departmentOnly={departmentOnly}
    />

    <div className={`mt-4 grid gap-4 ${committed ? "grid-cols-1" : "xl:grid-cols-[minmax(0,1fr)_300px]"}`}>
      <main>
        {tab === "overview" && (
          <CollaborationOverviewPanel
            committed={committed}
            delivery={delivery}
            canManageDelivery={isOwner && !state.participants.some((participant) => participant.participationRole === "governance")}
            busy={busy}
            participants={state.participants}
            organizations={organizations}
            snapshot={snapshot}
            ownerOrgId={draft.ownerOrgId}
            canEditOrganizations={isOwner && !committed}
            onOpenProject={onOpenProject}
            onMarkProjectsCompleted={() => act(
              async () => {
                await onMarkProjectsCompleted(draftId);
              },
              "Proposal projects marked completed.",
            )}
            onArchiveProjects={() => act(
              async () => {
                await onArchiveProjects(draftId);
              },
              "Completed proposal archived.",
            )}
            onSaveOrganizations={(next) => act(
              async () => {
                await setCollaborationOrganizations(draftId, next.organizations, next);
              },
              "Collaboration scope updated. A new revision was published.",
            )}
            onSaveRevision={saveRevision}
          />
        )}
        {tab === "board" && committed && <CommittedProposalBoard delivery={delivery} profiles={profiles} readOnly={readOnly} />}
        {tab === "source" && <CollaborationSourcePanel draft={draft} canUpload={isOwner && !["committed", "archived", "deleted"].includes(draft.status)} onUploaded={state.refresh} />}
        {tab === "plan" && <CollaborationPlanPanel snapshot={snapshot} organizations={organizations} editable={isOwner && !["committed", "archived", "deleted"].includes(draft.status)} onSave={saveRevision} />}
        {tab === "budget" && <CollaborationBudgetPanel snapshot={snapshot} fundingOwnerName={ownerOrg?.name} editable={isOwner && !["committed", "archived", "deleted"].includes(draft.status)} onSave={saveRevision} />}
        {tab === "people" && <StaffingReviewPanel snapshot={snapshot} organizations={organizations} profiles={profiles} editableOrgId={reviewOrganization?.orgId} canEditAll={isOwner} onSave={saveStaffingRevision} onRecommend={isOwner && draft.status === "draft" ? async () => (await recommendCollaborationAssignments(draftId)).recommendations : undefined} />}
        {tab === "discussion" && <CollaborationDiscussion messages={state.messages} organizations={organizations} profiles={profiles} onSend={(message) => act(async () => { await sendCollaborationMessage({ draftId, message }); }, "Message sent.")} />}
        {tab === "changes" && <ChangeRequestsPanel requests={state.changeRequests} organizations={organizations} profiles={profiles} canRequest={canDecide && !isOwner} canResolve={isOwner} onCreate={(input) => act(async () => { await createCollaborationChangeRequest({ draftId, organizationId: reviewOrganization?.orgId, ...input }); }, "Formal change request submitted.")} onResolve={(id, status) => act(async () => { await resolveCollaborationChangeRequest(id, status); }, `Change request ${status}.`)} />}
        {tab === "approvals" && !departmentOnly && <div className="space-y-3"><CollaborationReadiness participants={state.participants} approvals={state.approvals} currentRevisionId={draft.currentRevisionId} readiness={state.readiness} organizations={organizations} profiles={profiles} committed={committed} />{canDecide && <CollaborationDecisionPanel organizations={organizations} eligibleOrganizations={eligibleReviewOrganizations} selectedOrgId={reviewOrganization?.orgId} busy={busy} onSelectOrg={setActingOrgId} onDecide={(decision, reason) => act(async () => { await decideCollaborationReview({ draftId, organizationId: reviewOrganization!.orgId, decision, reason }); }, "Your organization decision was recorded.")} />}</div>}
        {tab === "revisions" && <RevisionTimeline revisions={state.revisions} profiles={profiles} />}
        {tab === "governance" && !departmentOnly && <GovernanceWorkspace draft={draft} snapshot={snapshot} revision={currentRevision} revisions={state.revisions} participants={state.participants} approvals={state.approvals} changeRequests={state.changeRequests} governance={governance} organizations={organizations} profiles={profiles} operationalTasks={delivery.tasks} isOwner={isOwner} actingOrgId={reviewOrganization?.orgId} busy={busy} onAct={act} onRefresh={async () => { await Promise.all([state.refresh(), governance.refresh()]); }} onSaveRevision={saveRevision} />}
      </main>
      {!committed && <aside className="space-y-3">{tab !== "approvals" && <CollaborationReadiness participants={state.participants} approvals={state.approvals} currentRevisionId={draft.currentRevisionId} readiness={state.readiness} organizations={organizations} departmentOnly={departmentOnly} />}
        <CollaborationActionRail departmentOnly={departmentOnly} isOwner={isOwner} ownerName={ownerOrg?.name} status={draft.status} readiness={state.readiness} busy={busy} hasRevision={Boolean(draft.currentRevisionId)} onRequestReview={() => act(async () => { await requestCollaborationReview(draftId); }, "Collaboration review requested.")} onCommit={() => act(async () => { if (departmentOnly) await publishDepartmentProposal(draftId); else await commitCollaborationDraft(draftId, draft.currentRevisionId!); onCommitted(); }, departmentOnly ? "Department proposal published. Operational projects and tasks are now available." : "Proposal published. Operational projects and tasks are now available.")} onDelete={(reason) => act(async () => { await deleteCollaborationDraft(draftId, reason); onBack(); }, departmentOnly ? "Department proposal draft deleted." : "Collaboration draft deleted with its governance history retained.")} />
      </aside>}
    </div>
  </div>;
}
