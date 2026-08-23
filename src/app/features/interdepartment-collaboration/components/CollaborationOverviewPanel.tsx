import { ShieldCheck } from "lucide-react";
import type { Organization } from "../../../types";
import { PARTICIPATION_ROLE_LABELS } from "../constants";
import type { CommittedProposalDeliverySummary } from "../selectors/deliveryProgress";
import type { CollaborationDraftSnapshot, CollaborationParticipant } from "../types";
import { CollaborationPlanPanel } from "./CollaborationPlanPanel";
import { CommittedProposalDeliveryPanel } from "./CommittedProposalDeliveryPanel";
import { OrganizationParticipantsPanel } from "./OrganizationParticipantsPanel";

export function CollaborationOverviewPanel({
  committed,
  delivery,
  canManageDelivery,
  busy,
  participants,
  organizations,
  snapshot,
  ownerOrgId,
  canEditOrganizations,
  onOpenProject,
  onMarkProjectsCompleted,
  onArchiveProjects,
  onSaveOrganizations,
  onSaveRevision,
}: {
  committed: boolean;
  delivery: CommittedProposalDeliverySummary;
  canManageDelivery: boolean;
  busy: boolean;
  participants: CollaborationParticipant[];
  organizations: Organization[];
  snapshot: CollaborationDraftSnapshot;
  ownerOrgId: string;
  canEditOrganizations: boolean;
  onOpenProject: (projectId: string) => void;
  onMarkProjectsCompleted: () => Promise<void>;
  onArchiveProjects: () => Promise<void>;
  onSaveOrganizations: (snapshot: CollaborationDraftSnapshot) => Promise<void>;
  onSaveRevision: (snapshot: CollaborationDraftSnapshot, summary: string) => Promise<void>;
}) {
  return (
    <div className="space-y-3">
      {committed && (
        <CommittedProposalDeliveryPanel
          summary={delivery}
          canManage={canManageDelivery}
          busy={busy}
          onOpenProject={onOpenProject}
          onMarkCompleted={onMarkProjectsCompleted}
          onArchive={onArchiveProjects}
        />
      )}

      <section className="rounded-2xl border border-neutral-200 bg-white p-5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Participating organizations</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {participants.map((participant) => {
            const organization = organizations.find((item) => item.id === participant.orgId);
            const governance = participant.participationRole === "governance";
            return (
              <div key={participant.orgId} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${governance ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700"}`}>
                  <ShieldCheck size={14} />
                </div>
                <div>
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{organization?.name || "Organization"}</div>
                  <div className="text-[9px] text-neutral-400">
                    {PARTICIPATION_ROLE_LABELS[participant.participationRole]} · {participant.staffingEnabled ? "Staffing enabled" : "Approval only"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <OrganizationParticipantsPanel
        snapshot={snapshot}
        ownerOrgId={ownerOrgId}
        organizations={organizations}
        editable={canEditOrganizations}
        onSave={onSaveOrganizations}
      />
      <CollaborationPlanPanel snapshot={snapshot} organizations={organizations} editable={false} onSave={onSaveRevision} />
    </div>
  );
}
