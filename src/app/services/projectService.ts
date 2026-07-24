// ─── eFlow Project Service (Supabase) ────────────────────────────
// Operational projects, members, and milestones for the Department Head /
// Admin workflow. Follows the app-wide "local listener Set + postgres_changes
// channel" realtime pattern so the UI updates immediately on local writes even
// if Postgres replication lags.
//
// Every mutation: validates → writes the record → appends an audit event →
// refreshes listeners. Writes rely on the authenticated actor (RLS enforces
// org-subtree scope on the server; these helpers add usability + audit).

import { supabase } from '../../lib/supabase';
import { recordAudit } from './auditService';

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high';
export type MilestoneStatus = 'auto' | 'not_started' | 'in_progress' | 'at_risk' | 'completed';

export interface Project {
  id: string;
  orgId?: string;
  title: string;
  description: string;
  ownerId?: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  startDate?: string;
  targetDate?: string;
  archivedAt?: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: 'owner' | 'member' | 'viewer';
}

export interface Milestone {
  id: string;
  projectId: string;
  title: string;
  description: string;
  dueDate?: string;
  status: MilestoneStatus;
  manualStatus?: MilestoneStatus;
  manualNote?: string;
  sortOrder: number;
  createdAt: number;
  updatedAt: number;
}

export interface CreateProjectInput {
  title: string;
  description?: string;
  orgId?: string | null;
  ownerId?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  targetDate?: string | null;
  memberIds?: string[];
  milestones?: { title: string; dueDate?: string | null }[];
}

// ─── Row mappers ─────────────────────────────────────────────────
function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    orgId: (row.org_id as string) || undefined,
    title: (row.title as string) || 'Untitled project',
    description: (row.description as string) || '',
    ownerId: (row.owner_id as string) || undefined,
    status: (row.status as ProjectStatus) || 'planning',
    priority: (row.priority as ProjectPriority) || 'medium',
    startDate: (row.start_date as string) || undefined,
    targetDate: (row.target_date as string) || undefined,
    archivedAt: row.archived_at ? new Date(row.archived_at as string).getTime() : undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: new Date((row.created_at as string) || Date.now()).getTime(),
    updatedAt: new Date((row.updated_at as string) || Date.now()).getTime(),
  };
}

function rowToMilestone(row: Record<string, unknown>): Milestone {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: (row.title as string) || 'Untitled milestone',
    description: (row.description as string) || '',
    dueDate: (row.due_date as string) || undefined,
    status: (row.status as MilestoneStatus) || 'auto',
    manualStatus: (row.manual_status as MilestoneStatus) || undefined,
    manualNote: (row.manual_note as string) || undefined,
    sortOrder: (row.sort_order as number) || 0,
    createdAt: new Date((row.created_at as string) || Date.now()).getTime(),
    updatedAt: new Date((row.updated_at as string) || Date.now()).getTime(),
  };
}

// ─── Local realtime listener system ──────────────────────────────
const projectListeners = new Set<(projects: Project[]) => void>();

export async function fetchAllProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    // Table may not exist yet (migration not applied) — degrade gracefully.
    if (error.code === '42P01') return [];
    console.error('Failed to fetch projects:', error);
    return [];
  }
  return (data || []).map(rowToProject);
}

async function notifyProjectListeners() {
  const projects = await fetchAllProjects();
  projectListeners.forEach((cb) => { try { cb(projects); } catch (e) { console.error(e); } });
}

export function subscribeToProjects(callback: (projects: Project[]) => void): () => void {
  projectListeners.add(callback);
  fetchAllProjects().then(callback);

  const channelId = `projects-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => notifyProjectListeners())
    .subscribe();

  return () => {
    projectListeners.delete(callback);
    supabase.removeChannel(channel);
  };
}

// ─── createProject ───────────────────────────────────────────────
export async function createProject(input: CreateProjectInput): Promise<Project> {
  const title = input.title.trim();
  if (!title) throw new Error('Project title is required.');

  const { data: { user } } = await supabase.auth.getUser();
  let orgId = input.orgId ?? null;
  if (orgId === null && user) {
    const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).maybeSingle();
    orgId = (profile?.org_id as string) || null;
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      title,
      description: input.description || '',
      org_id: orgId,
      owner_id: input.ownerId || user?.id || null,
      status: input.status || 'planning',
      priority: input.priority || 'medium',
      start_date: input.startDate || null,
      target_date: input.targetDate || null,
      created_by: user?.id || null,
    })
    .select()
    .single();
  if (error) throw error;
  const project = rowToProject(data);

  // Owner + members
  const memberRows: Record<string, unknown>[] = [];
  if (project.ownerId) memberRows.push({ project_id: project.id, user_id: project.ownerId, role: 'owner' });
  (input.memberIds || []).forEach((uid) => {
    if (uid && uid !== project.ownerId) memberRows.push({ project_id: project.id, user_id: uid, role: 'member' });
  });
  if (memberRows.length) {
    const { error: membersError } = await supabase
      .from('project_members')
      .insert(memberRows);
    if (membersError) throw membersError;
  }

  // Initial milestones
  const milestoneRows = (input.milestones || [])
    .filter((m) => m.title.trim())
    .map((m, i) => ({ project_id: project.id, title: m.title.trim(), due_date: m.dueDate || null, sort_order: i }));
  if (milestoneRows.length) {
    const { error: milestonesError } = await supabase
      .from('milestones')
      .insert(milestoneRows);
    if (milestonesError) throw milestonesError;
  }

  await recordAudit({
    entityType: 'project',
    entityId: project.id,
    action: 'project.created',
    afterData: { title: project.title, status: project.status, priority: project.priority },
    orgId,
  });

  await notifyProjectListeners();
  return project;
}

// ─── updateProject ───────────────────────────────────────────────
export async function updateProject(
  id: string,
  changes: Partial<Pick<Project, 'title' | 'description' | 'status' | 'priority' | 'startDate' | 'targetDate' | 'ownerId'>>,
): Promise<void> {
  const { data: before } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();

  const row: Record<string, unknown> = {};
  if (changes.title !== undefined) row.title = changes.title;
  if (changes.description !== undefined) row.description = changes.description;
  if (changes.status !== undefined) row.status = changes.status;
  if (changes.priority !== undefined) row.priority = changes.priority;
  if (changes.startDate !== undefined) row.start_date = changes.startDate || null;
  if (changes.targetDate !== undefined) row.target_date = changes.targetDate || null;
  if (changes.ownerId !== undefined) row.owner_id = changes.ownerId || null;

  const { error } = await supabase.from('projects').update(row).eq('id', id);
  if (error) throw error;

  await recordAudit({
    entityType: 'project',
    entityId: id,
    action: 'project.updated',
    beforeData: before ? { title: before.title, status: before.status, priority: before.priority } : undefined,
    afterData: changes,
    orgId: (before?.org_id as string) || null,
  });
  await notifyProjectListeners();
}

// ─── archiveProject / restoreProject ─────────────────────────────
export async function archiveProject(id: string, reason?: string): Promise<void> {
  const { data: before } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('projects')
    .update({ status: 'archived', archived_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  await recordAudit({
    entityType: 'project',
    entityId: id,
    action: 'project.archived',
    reason,
    beforeData: before ? { status: before.status } : undefined,
    afterData: { status: 'archived' },
    orgId: (before?.org_id as string) || null,
  });
  await notifyProjectListeners();
}

export async function restoreProject(id: string, reason?: string): Promise<void> {
  const { data: before } = await supabase.from('projects').select('*').eq('id', id).maybeSingle();
  const { error } = await supabase
    .from('projects')
    .update({ status: 'active', archived_at: null })
    .eq('id', id);
  if (error) throw error;

  await recordAudit({
    entityType: 'project',
    entityId: id,
    action: 'project.restored',
    reason,
    beforeData: before ? { status: before.status } : undefined,
    afterData: { status: 'active' },
    orgId: (before?.org_id as string) || null,
  });
  await notifyProjectListeners();
}

// ─── Members ─────────────────────────────────────────────────────
export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);
  if (error) return [];
  return (data || []).map((r) => ({
    projectId: r.project_id as string,
    userId: r.user_id as string,
    role: (r.role as ProjectMember['role']) || 'member',
  }));
}

export async function addProjectMember(projectId: string, userId: string, role: ProjectMember['role'] = 'member'): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .upsert({ project_id: projectId, user_id: userId, role }, { onConflict: 'project_id,user_id' });
  if (error) throw error;
  await recordAudit({ entityType: 'project', entityId: projectId, action: 'project.member_added', afterData: { userId, role } });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('project_members').delete().eq('project_id', projectId).eq('user_id', userId);
  if (error) throw error;
  await recordAudit({ entityType: 'project', entityId: projectId, action: 'project.member_removed', beforeData: { userId } });
}

// ─── Milestones ──────────────────────────────────────────────────
export async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const { data, error } = await supabase
    .from('milestones')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });
  if (error) return [];
  return (data || []).map(rowToMilestone);
}

export function subscribeToMilestones(projectId: string, callback: (m: Milestone[]) => void): () => void {
  const load = () => fetchMilestones(projectId).then(callback);
  load();
  const channelId = `milestones-${projectId}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'milestones', filter: `project_id=eq.${projectId}` }, () => load())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function createMilestone(projectId: string, title: string, dueDate?: string | null): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) throw new Error('Milestone title is required.');
  const existing = await fetchMilestones(projectId);
  const { error } = await supabase.from('milestones').insert({
    project_id: projectId,
    title: trimmed,
    due_date: dueDate || null,
    sort_order: existing.length,
  });
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: projectId, action: 'milestone.created', afterData: { title: trimmed } });
}

export async function setMilestoneManualStatus(
  id: string,
  manualStatus: MilestoneStatus | null,
  note?: string,
): Promise<void> {
  const { error } = await supabase
    .from('milestones')
    .update({
      manual_status: manualStatus === 'auto' ? null : manualStatus,
      status: manualStatus && manualStatus !== 'auto' ? manualStatus : 'auto',
      manual_note: note || null,
    })
    .eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: id, action: 'milestone.status_override', afterData: { manualStatus, note } });
}

export async function deleteMilestone(id: string): Promise<void> {
  const { error } = await supabase.from('milestones').delete().eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'milestone', entityId: id, action: 'milestone.deleted' });
}

// ─── Derived milestone status from its tasks ─────────────────────
// A milestone's effective status is calculated from its tasks unless a manual
// override is set. Callers pass the tasks already scoped to the milestone.
export function deriveMilestoneStatus(
  milestone: Milestone,
  tasks: { status: string; deadline?: string; dueDate?: string }[],
): { status: MilestoneStatus; source: 'manual' | 'auto' } {
  if (milestone.manualStatus) return { status: milestone.manualStatus, source: 'manual' };
  if (tasks.length === 0) return { status: 'not_started', source: 'auto' };

  const done = tasks.filter((t) => t.status === 'completed').length;
  if (done === tasks.length) return { status: 'completed', source: 'auto' };

  const now = Date.now();
  const overdue = tasks.some((t) => {
    const dl = t.deadline || t.dueDate;
    return dl && t.status !== 'completed' && new Date(dl).getTime() < now;
  });
  if (overdue) return { status: 'at_risk', source: 'auto' };

  const started = tasks.some((t) => t.status !== 'pending_assignment' && t.status !== 'todo');
  return { status: started ? 'in_progress' : 'not_started', source: 'auto' };
}
