import { supabase } from "../../../../lib/supabase";
import { refreshOrganizationDirectory } from "../../../../lib/supabaseService";

export interface OrganizationLeadershipInput {
  headUserId: string | null;
  assistantHeadUserId: string | null;
}

export async function assignOrganizationLeadership(
  organizationId: string,
  leadership: OrganizationLeadershipInput,
): Promise<void> {
  if (
    leadership.headUserId &&
    leadership.headUserId === leadership.assistantHeadUserId
  ) {
    throw new Error("Head and Assistant Head must be different people.");
  }

  const { error } = await supabase.rpc("set_organization_leadership", {
    p_org_id: organizationId,
    p_head_user_id: leadership.headUserId,
    p_assistant_head_user_id: leadership.assistantHeadUserId,
  });
  if (error) throw new Error(error.message);

  await refreshOrganizationDirectory();
}
