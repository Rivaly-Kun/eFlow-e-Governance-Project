// ─── eFlow Announcement Service (Supabase) ───────────────────────
// Structured announcements with explicit recipient records and read state —
// NOT ad-hoc chat messages. Publishing materializes announcement_recipients so
// each user gets an unread entry + a notification.

import { supabase } from '../../lib/supabase';
import { recordAudit } from './auditService';
import { createNotification } from './notificationService';

export type Audience = 'all' | 'org' | 'users';
export type AnnouncementStatus = 'draft' | 'published' | 'withdrawn';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  audience: Audience;
  orgId?: string;
  status: AnnouncementStatus;
  publishedAt?: number;
  expiresAt?: number;
  createdBy?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AnnouncementForUser extends Announcement {
  readAt?: number;
}

function rowToAnnouncement(row: Record<string, unknown>): Announcement {
  return {
    id: row.id as string,
    title: (row.title as string) || '',
    body: (row.body as string) || '',
    audience: (row.audience as Audience) || 'all',
    orgId: (row.org_id as string) || undefined,
    status: (row.status as AnnouncementStatus) || 'draft',
    publishedAt: row.published_at ? new Date(row.published_at as string).getTime() : undefined,
    expiresAt: row.expires_at ? new Date(row.expires_at as string).getTime() : undefined,
    createdBy: (row.created_by as string) || undefined,
    createdAt: new Date((row.created_at as string) || Date.now()).getTime(),
    updatedAt: new Date((row.updated_at as string) || Date.now()).getTime(),
  };
}

// ─── Admin authoring ─────────────────────────────────────────────
export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) {
    if (error.code === '42P01') return [];
    return [];
  }
  return (data || []).map(rowToAnnouncement);
}

export function subscribeToAnnouncements(callback: (a: Announcement[]) => void): () => void {
  const load = () => fetchAllAnnouncements().then(callback);
  load();
  const channelId = `announcements-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => load())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export interface AnnouncementDraft {
  title: string;
  body: string;
  audience: Audience;
  orgId?: string | null;
  userIds?: string[];
  expiresAt?: string | null;
}

export async function saveDraft(draft: AnnouncementDraft, id?: string): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  const row = {
    title: draft.title.trim(),
    body: draft.body,
    audience: draft.audience,
    org_id: draft.orgId || null,
    expires_at: draft.expiresAt || null,
  };
  if (id) {
    const { error } = await supabase.from('announcements').update(row).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...row, status: 'draft', created_by: user?.id || null })
    .select()
    .single();
  if (error) throw error;
  return data.id as string;
}

// Resolve the recipient user ids for an audience.
async function resolveRecipients(draft: { audience: Audience; orgId?: string | null; userIds?: string[] }): Promise<string[]> {
  if (draft.audience === 'users') return (draft.userIds || []).filter(Boolean);

  if (draft.audience === 'org' && draft.orgId) {
    // The org and everything under it (ltree path prefix).
    const { data: anchor } = await supabase.from('organizations').select('path').eq('id', draft.orgId).maybeSingle();
    if (!anchor) return [];
    const { data: orgs } = await supabase.from('organizations').select('id, path');
    const scoped = (orgs || [])
      .filter((o) => o.path === anchor.path || (o.path as string).startsWith(`${anchor.path}.`))
      .map((o) => o.id);
    const { data: profiles } = await supabase.from('profiles').select('id').in('org_id', scoped);
    return (profiles || []).map((p) => p.id as string);
  }

  // audience === 'all'
  const { data: profiles } = await supabase.from('profiles').select('id').eq('is_active', true);
  return (profiles || []).map((p) => p.id as string);
}

export async function publishAnnouncement(
  id: string,
  draft: AnnouncementDraft,
): Promise<void> {
  if (!draft.title.trim()) throw new Error('Announcement title is required.');

  // Persist latest content + mark published.
  await saveDraft(draft, id);
  const { error } = await supabase
    .from('announcements')
    .update({ status: 'published', published_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;

  // Materialize recipients + notifications.
  const recipients = await resolveRecipients(draft);
  if (recipients.length) {
    const rows = recipients.map((uid) => ({ announcement_id: id, user_id: uid }));
    await supabase.from('announcement_recipients').upsert(rows, { onConflict: 'announcement_id,user_id' });
    await Promise.all(
      recipients.map((uid) =>
        createNotification(uid, {
          type: 'assignment',
          title: 'New announcement',
          message: draft.title.trim(),
        }),
      ),
    );
  }

  await recordAudit({
    entityType: 'announcement',
    entityId: id,
    action: 'announcement.published',
    afterData: { title: draft.title, audience: draft.audience, recipients: recipients.length },
    orgId: draft.orgId || null,
  });
}

export async function withdrawAnnouncement(id: string, reason?: string): Promise<void> {
  const { error } = await supabase.from('announcements').update({ status: 'withdrawn' }).eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'announcement', entityId: id, action: 'announcement.withdrawn', reason });
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id);
  if (error) throw error;
  await recordAudit({ entityType: 'announcement', entityId: id, action: 'announcement.deleted' });
}

// ─── Recipient-side (Announcement Center) ────────────────────────
export async function fetchMyAnnouncements(userId: string): Promise<AnnouncementForUser[]> {
  const { data, error } = await supabase
    .from('announcement_recipients')
    .select('read_at, announcement:announcements(*)')
    .eq('user_id', userId);
  if (error) return [];

  const now = Date.now();
  const announcements = (data || []).reduce<AnnouncementForUser[]>(
    (rows, r: Record<string, unknown>) => {
      const a = r.announcement as Record<string, unknown> | null;
      if (!a) return rows;
      const base = rowToAnnouncement(a);
      const announcement: AnnouncementForUser = {
        ...base,
        readAt: r.read_at
          ? new Date(r.read_at as string).getTime()
          : undefined,
      };
      if (
        announcement.status === 'published' &&
        (!announcement.expiresAt || announcement.expiresAt > now)
      ) {
        rows.push(announcement);
      }
      return rows;
    },
    [],
  );
  return announcements.sort(
    (x, y) => (y.publishedAt || 0) - (x.publishedAt || 0),
  );
}

export function subscribeToMyAnnouncements(userId: string, callback: (a: AnnouncementForUser[]) => void): () => void {
  const load = () => fetchMyAnnouncements(userId).then(callback);
  load();
  const channelId = `my-announcements-${userId}-${Math.random().toString(36).slice(2)}`;
  const channel = supabase
    .channel(channelId)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_recipients', filter: `user_id=eq.${userId}` }, () => load())
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}

export async function markAnnouncementRead(userId: string, announcementId: string): Promise<void> {
  await supabase
    .from('announcement_recipients')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('announcement_id', announcementId);
}
