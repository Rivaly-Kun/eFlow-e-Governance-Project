import { supabase } from '../../../../lib/supabase';
import { recordAudit } from '../../../services/auditService';
import { rowToProject } from './projectMappers';
import { notifyProjectListeners } from './projectQueryService';
import type { CreateProjectInput, Project } from './types';

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
