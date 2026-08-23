import { supabase } from "../../../../lib/supabase";
import type { CollaborationCommitResult } from "../types";
import { notifyCollaborationDraftsChanged } from "./collaborationDraftEvents";

export async function commitCollaborationDraft(draftId: string, revisionId: string): Promise<CollaborationCommitResult> {
  const { data, error } = await supabase.rpc("commit_collaboration_draft", {
    p_draft_id: draftId,
    p_revision_id: revisionId,
  });
  if (error) throw new Error(error.message);
  notifyCollaborationDraftsChanged();
  const value = data as Record<string, unknown>;
  return {
    draftId: String(value.draftId || value.draft_id || draftId),
    revisionId: String(value.revisionId || value.revision_id || revisionId),
    revisionNumber: Number(value.revisionNumber || value.revision_number || 0),
    projectIds: Array.isArray(value.projectIds || value.project_ids) ? (value.projectIds || value.project_ids) as string[] : [],
    projectCount: Number(value.projectCount || value.project_count || 0),
  };
}
