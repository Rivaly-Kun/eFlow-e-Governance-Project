// ─── Admin Announcements ─────────────────────────────────────────
// Draft, preview, publish, expire, edit, and withdraw announcements. Publishing
// materializes recipient records + notifications (via announcementService).
// Not ad-hoc chat — every announcement is an addressable record with read
// state on the recipient side.

import React, { useEffect, useMemo, useState } from "react";
import {
  Megaphone,
  Plus,
  Send,
  Eye,
  Trash2,
  Archive,
  Users,
  Building2,
  Globe,
  X,
  Clock,
  Pencil,
  CheckCircle2,
} from "lucide-react";
import {
  subscribeToAnnouncements,
  saveDraft,
  publishAnnouncement,
  withdrawAnnouncement,
  deleteAnnouncement,
  type Announcement,
  type Audience,
  type AnnouncementDraft,
} from "../../services/announcementService";
import { useOrgs } from "../../hooks/useSupabaseData";
import { useUsers } from "../../hooks/useFirebaseData";
import { useToast } from "../ui/Toast";
import {
  PageHeader,
  WButton,
  Card,
  SectionEmpty,
  LoadingState,
  formatDate,
} from "../workflow/primitives";
import { InitialsAvatar } from "../workflow/StatusBadges";

const AUDIENCE_META: Record<Audience, { label: string; icon: React.ReactNode }> = {
  all: { label: "Everyone", icon: <Globe size={12} /> },
  org: { label: "Department", icon: <Building2 size={12} /> },
  users: { label: "Selected users", icon: <Users size={12} /> },
};

const STATUS_TONE: Record<string, string> = {
  draft: "bg-neutral-100 text-neutral-600",
  published: "bg-emerald-50 text-emerald-700",
  withdrawn: "bg-rose-50 text-rose-700",
};

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorFor, setEditorFor] = useState<Announcement | "new" | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToAnnouncements((a) => { setAnnouncements(a); setLoading(false); });
    return unsub;
  }, []);

  const stats = useMemo(() => ({
    published: announcements.filter((a) => a.status === "published").length,
    drafts: announcements.filter((a) => a.status === "draft").length,
  }), [announcements]);

  if (loading) return <div className="p-8"><LoadingState label="Loading announcements…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow="Administration · Communications"
        title="Announcements"
        subtitle="Broadcast to the whole LGU, a department subtree, or selected people."
        actions={<WButton icon={<Plus size={14} />} variant="primary" onClick={() => setEditorFor("new")}>New announcement</WButton>}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <Card><div className="text-[11px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">Published</div><div className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-emerald-600 tabular-nums">{stats.published}</div></Card>
        <Card><div className="text-[11px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">Drafts</div><div className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{stats.drafts}</div></Card>
        <Card><div className="text-[11px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">Total</div><div className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{announcements.length}</div></Card>
      </div>

      {announcements.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <SectionEmpty icon={<Megaphone size={30} />} title="No announcements yet" description="Create your first announcement to reach your teams." action={<WButton icon={<Plus size={14} />} variant="primary" onClick={() => setEditorFor("new")}>New announcement</WButton>} />
        </div>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <div key={a.id} className="bg-white border border-neutral-200 rounded-xl p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] rounded px-1.5 py-0.5 uppercase tracking-wide ${STATUS_TONE[a.status]}`}>{a.status}</span>
                    <span className="inline-flex items-center gap-1 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-500 bg-neutral-100 rounded px-1.5 py-0.5">
                      {AUDIENCE_META[a.audience].icon} {AUDIENCE_META[a.audience].label}
                    </span>
                    {a.publishedAt && <span className="text-[10.5px] text-neutral-400 flex items-center gap-1"><Clock size={10} /> {formatDate(a.publishedAt)}</span>}
                    {a.expiresAt && <span className="text-[10.5px] text-amber-500">Expires {formatDate(a.expiresAt)}</span>}
                  </div>
                  <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{a.title}</h3>
                  <p className="text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5 line-clamp-2">{a.body}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.status !== "published" && (
                    <button onClick={() => setEditorFor(a)} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100" title="Edit"><Pencil size={15} /></button>
                  )}
                  {a.status === "published" && (
                    <button onClick={async () => { await withdrawAnnouncement(a.id); toast("Announcement withdrawn.", "success"); }} className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50" title="Withdraw"><Archive size={15} /></button>
                  )}
                  <button onClick={async () => { if (window.confirm("Delete this announcement permanently?")) { await deleteAnnouncement(a.id); toast("Deleted.", "success"); } }} className="p-1.5 rounded-lg text-neutral-400 hover:text-red-600 hover:bg-red-50" title="Delete"><Trash2 size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editorFor && (
        <AnnouncementEditor
          existing={editorFor === "new" ? null : editorFor}
          onClose={() => setEditorFor(null)}
        />
      )}
    </div>
  );
}

function AnnouncementEditor({ existing, onClose }: { existing: Announcement | null; onClose: () => void }) {
  const { orgs } = useOrgs();
  const { users } = useUsers();
  const { toast } = useToast();
  const [title, setTitle] = useState(existing?.title || "");
  const [body, setBody] = useState(existing?.body || "");
  const [audience, setAudience] = useState<Audience>(existing?.audience || "all");
  const [orgId, setOrgId] = useState(existing?.orgId || "");
  const [userIds, setUserIds] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);

  const draft: AnnouncementDraft = { title, body, audience, orgId: orgId || null, userIds, expiresAt: expiresAt || null };

  const doSaveDraft = async () => {
    if (!title.trim()) { toast("Title is required.", "error"); return; }
    setBusy(true);
    try { await saveDraft(draft, existing?.id); toast("Draft saved.", "success"); onClose(); }
    catch (e: any) { toast(e?.message || "Failed to save.", "error"); }
    finally { setBusy(false); }
  };

  const doPublish = async () => {
    if (!title.trim()) { toast("Title is required.", "error"); return; }
    if (audience === "org" && !orgId) { toast("Choose a department for this audience.", "error"); return; }
    if (audience === "users" && userIds.length === 0) { toast("Select at least one recipient.", "error"); return; }
    setBusy(true);
    try {
      const id = existing?.id || (await saveDraft(draft));
      await publishAnnouncement(id, draft);
      toast("Announcement published.", "success");
      onClose();
    } catch (e: any) { toast(e?.message || "Failed to publish.", "error"); }
    finally { setBusy(false); }
  };

  const candidates = users.filter((u) => u.role !== "super_admin");

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900/30 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[540px] bg-white shadow-2xl z-50 flex flex-col animate-[slidein_0.25s_cubic-bezier(0.25,1.1,0.4,1)]">
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{existing ? "Edit announcement" : "New announcement"}</h2>
          <div className="flex items-center gap-1">
            <button onClick={() => setPreview(!preview)} className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] ${preview ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-100"}`}>
              <Eye size={13} /> Preview
            </button>
            <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1"><X size={18} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {preview ? (
            <div className="bg-gradient-to-b from-neutral-50 to-white border border-neutral-200 rounded-xl p-5">
              <div className="inline-flex items-center gap-1.5 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-blue-700 bg-blue-50 rounded-full px-2 py-0.5 mb-2">
                <Megaphone size={12} /> Announcement · {AUDIENCE_META[audience].label}
              </div>
              <h1 className="text-[19px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title || "Untitled announcement"}</h1>
              <div className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-2 whitespace-pre-wrap leading-relaxed">{body || "No content yet."}</div>
              {expiresAt && <div className="text-[11px] text-amber-600 mt-3">Expires {formatDate(expiresAt)}</div>}
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block">
                <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1 block">Title <span className="text-red-500">*</span></span>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" className={inputCls} />
              </label>
              <label className="block">
                <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1 block">Message</span>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={6} placeholder="Write your announcement…" className={`${inputCls} h-auto resize-none`} />
              </label>

              <div>
                <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1.5 block">Audience</span>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(AUDIENCE_META) as Audience[]).map((a) => (
                    <button
                      key={a}
                      onClick={() => setAudience(a)}
                      className={`flex flex-col items-center gap-1 py-2.5 rounded-lg border text-[11.5px] font-['Lexend:Medium',_sans-serif] ${audience === a ? "border-neutral-900 bg-neutral-50 text-neutral-900" : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"}`}
                    >
                      {AUDIENCE_META[a].icon} {AUDIENCE_META[a].label}
                    </button>
                  ))}
                </div>
              </div>

              {audience === "org" && (
                <label className="block">
                  <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1 block">Department (includes sub-units)</span>
                  <select value={orgId} onChange={(e) => setOrgId(e.target.value)} className={inputCls}>
                    <option value="">Choose a department…</option>
                    {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                </label>
              )}

              {audience === "users" && (
                <div>
                  <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1 block">Recipients ({userIds.length})</span>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {userIds.map((id) => {
                      const u = users.find((x) => x.id === id);
                      return (
                        <span key={id} className="inline-flex items-center gap-1 bg-neutral-100 rounded-full pl-1 pr-2 py-0.5 text-[11px]">
                          <InitialsAvatar name={u?.full_name} size={16} /> {u?.full_name?.split(" ")[0]}
                          <button onClick={() => setUserIds(userIds.filter((x) => x !== id))}><X size={11} /></button>
                        </span>
                      );
                    })}
                  </div>
                  <select value="" onChange={(e) => { if (e.target.value && !userIds.includes(e.target.value)) setUserIds([...userIds, e.target.value]); }} className={inputCls}>
                    <option value="">Add a recipient…</option>
                    {candidates.filter((u) => !userIds.includes(u.id)).map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </div>
              )}

              <label className="block">
                <span className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1 block">Expiry (optional)</span>
                <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className={inputCls} />
              </label>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-neutral-100 flex items-center justify-between gap-2">
          <WButton onClick={doSaveDraft} disabled={busy}>Save draft</WButton>
          <WButton variant="primary" icon={<Send size={14} />} onClick={doPublish} disabled={busy}>
            {busy ? "Publishing…" : "Publish"}
          </WButton>
        </div>
      </div>
    </>
  );
}

const inputCls = "w-full h-9 px-2.5 border border-neutral-200 rounded-lg text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 bg-white";
