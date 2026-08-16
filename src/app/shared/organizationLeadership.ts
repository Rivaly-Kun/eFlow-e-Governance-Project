export interface LeadershipReviewerResolution {
  reviewerId: string | null;
  reviewerRole: "head" | "assistant_head";
}

export function resolveLeadershipReviewer(
  taskLeadId: string | null | undefined,
  headUserId: string | null | undefined,
  assistantHeadUserId: string | null | undefined,
): LeadershipReviewerResolution | null {
  if (!taskLeadId) return null;
  if (taskLeadId === headUserId) {
    return { reviewerId: assistantHeadUserId || null, reviewerRole: "assistant_head" };
  }
  if (taskLeadId === assistantHeadUserId) {
    return { reviewerId: headUserId || null, reviewerRole: "head" };
  }
  return null;
}
