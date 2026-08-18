import type { Organization, UserProfile, UserRole } from "../../../types";

export type ManagedLeadershipRole = "dept_head" | "department_head" | "assistant_head";

export function isManagedLeadershipRole(role: UserRole | string): role is ManagedLeadershipRole {
  return role === "dept_head" || role === "department_head" || role === "assistant_head";
}

export function getLeadershipSlotConflict({
  role,
  orgId,
  currentUserId,
  organizations,
  profiles,
}: {
  role: UserRole | string;
  orgId: string;
  currentUserId?: string;
  organizations: Organization[];
  profiles: UserProfile[];
}): string | null {
  if (!isManagedLeadershipRole(role)) return null;
  if (!orgId) return `${role === "assistant_head" ? "Assistant Head" : "Head"} requires an organization.`;

  const organization = organizations.find((candidate) => candidate.id === orgId);
  if (!organization) return "Select a valid active organization.";
  const isAssistant = role === "assistant_head";
  const officialUserId = isAssistant ? organization.assistant_head_user_id : organization.head_user_id;
  const profileOccupant = profiles.find((profile) =>
    profile.id !== currentUserId
    && profile.is_active
    && profile.org_id === orgId
    && (isAssistant ? profile.role === "assistant_head" : ["dept_head", "department_head"].includes(profile.role)),
  );
  const occupantId = officialUserId && officialUserId !== currentUserId ? officialUserId : profileOccupant?.id;
  if (!occupantId) return null;

  const occupant = profiles.find((profile) => profile.id === occupantId);
  const position = isAssistant ? "Assistant Head" : "Head";
  return `${organization.name} already has ${occupant?.full_name || "an assigned user"} as ${position}. Replace that person through Organization Structure first.`;
}
