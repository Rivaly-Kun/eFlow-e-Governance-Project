// ─── eFlow Supabase Service Layer ────────────────────────────────
// All Supabase reads/writes centralized here.
// Components never import supabase directly.

import { supabase } from './supabase';
import type { Organization, UserProfile, SystemConfig, OrgType } from '../app/types';

// ─── Local State Listener System ─────────────────────────────────
// Ensures the client UI updates immediately on local modifications
// even if Postgres Realtime replication is disabled or lagging.
const orgListeners = new Set<(orgs: Organization[]) => void>();
const profileListeners = new Set<(profiles: UserProfile[]) => void>();

async function notifyOrgListeners(forcedOrgs?: Organization[]) {
  try {
    const orgs = forcedOrgs || await fetchAllOrgs();
    orgListeners.forEach(cb => {
      try { cb(orgs); } catch (e) { console.error("Error in org listener:", e); }
    });
  } catch (err) {
    console.error("Error fetching orgs for notification:", err);
  }
}

async function notifyProfileListeners(forcedProfiles?: UserProfile[]) {
  try {
    const profiles = forcedProfiles || await fetchAllProfiles();
    profileListeners.forEach(cb => {
      try { cb(profiles); } catch (e) { console.error("Error in profile listener:", e); }
    });
  } catch (err) {
    console.error("Error fetching profiles for notification:", err);
  }
}

// ─── ORGANIZATION OPERATIONS ─────────────────────────────────────

export async function fetchAllOrgs(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from('organizations')
    .select('*')
    .order('path');

  if (error) throw error;
  return data as Organization[];
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

async function computePath(parent_id: string | null, slug: string): Promise<string> {
  if (!parent_id) return slug;
  const { data, error } = await supabase
    .from('organizations')
    .select('path')
    .eq('id', parent_id)
    .single();

  if (error || !data) throw new Error('Parent organization not found');
  return `${data.path}.${slug}`;
}

async function ensureUniqueSlug(slug: string): Promise<string> {
  let candidate = slug;
  let counter = 2;
  while (true) {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) break;
    candidate = `${slug}_${counter}`;
    counter++;
  }
  return candidate;
}

export async function createOrg(data: {
  name: string;
  slug?: string;
  parent_id: string | null;
  org_type: OrgType;
  description?: string;
}): Promise<Organization> {
  const baseSlug = data.slug || generateSlug(data.name);
  const slug = await ensureUniqueSlug(baseSlug);
  const path = await computePath(data.parent_id, slug);

  const { data: org, error } = await supabase
    .from('organizations')
    .insert({
      name: data.name,
      slug,
      parent_id: data.parent_id,
      path,
      org_type: data.org_type,
      description: data.description || '',
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  notifyOrgListeners();
  return org as Organization;
}

export async function recreateOrg(org: Organization): Promise<Organization> {
  const { data, error } = await supabase
    .from('organizations')
    .insert({
      id: org.id,
      name: org.name,
      slug: org.slug,
      parent_id: org.parent_id,
      path: org.path,
      org_type: org.org_type,
      description: org.description,
      head_user_id: org.head_user_id,
      is_active: org.is_active,
    })
    .select()
    .single();

  if (error) throw error;
  notifyOrgListeners();
  return data as Organization;
}

export async function updateOrg(id: string, partial: Partial<Organization>): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  notifyOrgListeners();
}

export async function deleteOrg(id: string): Promise<void> {
  const { count: childCount } = await supabase
    .from('organizations')
    .select('id', { count: 'exact', head: true })
    .eq('parent_id', id);

  if (childCount && childCount > 0) {
    throw new Error('Cannot delete organization with child departments. Remove or reassign children first.');
  }

  const { count: userCount } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('org_id', id);

  if (userCount && userCount > 0) {
    throw new Error('Cannot delete organization with assigned users. Reassign users first.');
  }

  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id);

  if (error) throw error;
  notifyOrgListeners();
}

export async function assignOrgHead(orgId: string, userId: string | null): Promise<void> {
  const { error } = await supabase
    .from('organizations')
    .update({ head_user_id: userId, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (error) throw error;
  notifyOrgListeners();
}

export function subscribeToOrgs(callback: (orgs: Organization[]) => void): () => void {
  orgListeners.add(callback);
  
  const channelId = `orgs_realtime_${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'organizations' },
      async () => {
        const orgs = await fetchAllOrgs();
        notifyOrgListeners(orgs);
      }
    )
    .subscribe();

  return () => {
    orgListeners.delete(callback);
    supabase.removeChannel(channel);
  };
}

// ─── PROFILE OPERATIONS ──────────────────────────────────────────

export async function fetchAllProfiles(): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('full_name');

  if (error) throw error;
  return data as UserProfile[];
}

export async function fetchProfileById(id: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as UserProfile | null;
}

export async function createProfile(data: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  org_id?: string;
  employee_id?: string;
}): Promise<UserProfile> {
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: data.email,
    password: data.password,
    email_confirm: true,
  });

  if (authError) throw authError;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: authData.user?.id,
      full_name: data.full_name,
      email: data.email,
      employee_id: data.employee_id || '',
      org_id: data.org_id || null,
      role: data.role,
      skills: {},
      workload: 0,
      burnout_level: 'low',
      is_active: true,
    })
    .select()
    .single();

  if (profileError) throw profileError;
  notifyProfileListeners();
  return profile as UserProfile;
}

export async function updateProfile(id: string, partial: Partial<UserProfile>): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ ...partial, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  notifyProfileListeners();
}

export async function assignUserToOrg(userId: string, orgId: string | null): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ org_id: orgId, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
  notifyProfileListeners();
}

export async function toggleUserActive(id: string, is_active: boolean): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
  notifyProfileListeners();
}

export function subscribeToProfiles(callback: (profiles: UserProfile[]) => void): () => void {
  profileListeners.add(callback);
  
  const channelId = `profiles_realtime_${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles' },
      async () => {
        const profiles = await fetchAllProfiles();
        notifyProfileListeners(profiles);
      }
    )
    .subscribe();

  return () => {
    profileListeners.delete(callback);
    supabase.removeChannel(channel);
  };
}

// ─── SYSTEM CONFIG OPERATIONS ────────────────────────────────────

export async function fetchConfig(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) throw error;
  return data?.value || null;
}

export async function updateConfig(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('system_config')
    .upsert({ key, value, updated_at: new Date().toISOString() });

  if (error) throw error;
}

export async function fetchAllConfig(): Promise<SystemConfig[]> {
  const { data, error } = await supabase
    .from('system_config')
    .select('*')
    .order('key');

  if (error) throw error;
  return data as SystemConfig[];
}
