// ─── eFlow Permission Service (Supabase) ─────────────────────────
// A small, comprehensible capability set. The effective answer for a user is:
//   user override (if any)  ELSE  role default.
// UI checks (the can() helper on the auth context) improve usability, but the
// database RLS policies remain the real enforcement boundary.

import { supabase } from '../../lib/supabase';
import { recordAudit } from './auditService';

// The canonical capability list surfaced in the Admin permission UI.
export const PERMISSION_KEYS = [
  'projects.create',
  'projects.archive',
  'tasks.assign',
  'tasks.verify',
  'reports.export',
  'announcements.publish',
  'users.manage',
  'audit.read',
  'settings.manage',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  'projects.create': 'Create projects',
  'projects.archive': 'Archive / restore projects',
  'tasks.assign': 'Assign & reassign tasks',
  'tasks.verify': 'Review & verify submissions',
  'reports.export': 'Export reports (CSV / PDF)',
  'announcements.publish': 'Publish announcements',
  'users.manage': 'Manage users & accounts',
  'audit.read': 'Read the audit log',
  'settings.manage': 'Manage system settings',
};

// Fallback defaults used before the role_permissions table is read (or if the
// migration has not been applied). Mirrors the seeded matrix.
const FALLBACK_DEFAULTS: Record<string, PermissionKey[]> = {
  super_admin: [...PERMISSION_KEYS],
  dept_head: ['projects.create', 'projects.archive', 'tasks.assign', 'tasks.verify', 'reports.export'],
  employee: ['reports.export'],
};

export interface RolePermissionRow {
  role: string;
  permission: string;
  allowed: boolean;
}

export interface UserOverrideRow {
  userId: string;
  permission: string;
  allowed: boolean;
}

export async function fetchRolePermissions(): Promise<RolePermissionRow[]> {
  const { data, error } = await supabase.from('role_permissions').select('*');
  if (error) return [];
  return (data || []).map((r) => ({
    role: r.role as string,
    permission: r.permission as string,
    allowed: !!r.allowed,
  }));
}

export async function fetchUserOverrides(userId: string): Promise<UserOverrideRow[]> {
  const { data, error } = await supabase
    .from('user_permission_overrides')
    .select('*')
    .eq('user_id', userId);
  if (error) return [];
  return (data || []).map((r) => ({
    userId: r.user_id as string,
    permission: r.permission as string,
    allowed: !!r.allowed,
  }));
}

// Resolve the effective permission set for a role + overrides.
export function resolvePermissions(
  role: string,
  rolePerms: RolePermissionRow[],
  overrides: UserOverrideRow[],
): Set<string> {
  const result = new Set<string>();

  const roleRows = rolePerms.filter((r) => r.role === role);
  if (roleRows.length > 0) {
    roleRows.forEach((r) => { if (r.allowed) result.add(r.permission); });
  } else {
    // No DB rows yet — fall back to the built-in defaults.
    (FALLBACK_DEFAULTS[role] || []).forEach((p) => result.add(p));
  }

  overrides.forEach((o) => {
    if (o.allowed) result.add(o.permission);
    else result.delete(o.permission);
  });

  return result;
}

// Load the effective set for the currently-signed-in user (role from profile).
export async function fetchEffectivePermissions(
  userId: string,
  role: string,
): Promise<Set<string>> {
  const [rolePerms, overrides] = await Promise.all([
    fetchRolePermissions(),
    fetchUserOverrides(userId),
  ]);
  return resolvePermissions(role, rolePerms, overrides);
}

// ─── Admin mutations ─────────────────────────────────────────────
export async function setRolePermission(role: string, permission: string, allowed: boolean): Promise<void> {
  const { error } = await supabase
    .from('role_permissions')
    .upsert({ role, permission, allowed, updated_at: new Date().toISOString() }, { onConflict: 'role,permission' });
  if (error) throw error;
  await recordAudit({
    entityType: 'role_permission',
    entityId: `${role}:${permission}`,
    action: 'permission.role_changed',
    afterData: { role, permission, allowed },
  });
}

export async function setUserOverride(
  userId: string,
  permission: string,
  allowed: boolean | null,
  setBy: string,
): Promise<void> {
  if (allowed === null) {
    // Clear the override → fall back to role default.
    const { error } = await supabase
      .from('user_permission_overrides')
      .delete()
      .eq('user_id', userId)
      .eq('permission', permission);
    if (error) throw error;
    await recordAudit({
      entityType: 'user_permission_override',
      entityId: `${userId}:${permission}`,
      action: 'permission.override_cleared',
      afterData: { userId, permission },
    });
    return;
  }

  const { error } = await supabase
    .from('user_permission_overrides')
    .upsert({ user_id: userId, permission, allowed, set_by: setBy }, { onConflict: 'user_id,permission' });
  if (error) throw error;
  await recordAudit({
    entityType: 'user_permission_override',
    entityId: `${userId}:${permission}`,
    action: 'permission.override_set',
    afterData: { userId, permission, allowed },
  });
}
