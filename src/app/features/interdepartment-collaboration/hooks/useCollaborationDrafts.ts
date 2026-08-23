import * as React from "react";
import { fetchCollaborationDrafts, subscribeToCollaborationDraftChanges } from "../services/collaborationDraftService";
import type { CollaborationDraft } from "../types";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchMyCollaborationMemberships } from "../services/collaborationDraftService";
import { runGovernanceEscalations } from "../services/governanceService";

export function useCollaborationDrafts() {
  const { userProfile } = useAuth();
  const [drafts, setDrafts] = React.useState<CollaborationDraft[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [membershipOrgIds, setMembershipOrgIds] = React.useState<string[]>([]);
  const refreshSequence = React.useRef(0);

  const refresh = React.useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const nextDrafts = await fetchCollaborationDrafts();
      if (sequence !== refreshSequence.current) return;
      setDrafts(nextDrafts);
      setError(null);
    } catch (reason) {
      if (sequence !== refreshSequence.current) return;
      setError(reason instanceof Error ? reason.message : "Could not load collaboration drafts.");
    } finally {
      if (sequence === refreshSequence.current) setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void refresh();
    return subscribeToCollaborationDraftChanges(() => { void refresh(); });
  }, [refresh]);

  React.useEffect(() => {
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [refresh]);

  React.useEffect(() => {
    if (!userProfile?.id) return;
    void runGovernanceEscalations().catch(() => undefined);
    void fetchMyCollaborationMemberships(userProfile.id)
      .then((rows) => setMembershipOrgIds(rows.map((row) => row.organizationId)))
      .catch(() => setMembershipOrgIds([]));
  }, [userProfile?.id]);

  return { drafts, loading, error, refresh, membershipOrgIds };
}
