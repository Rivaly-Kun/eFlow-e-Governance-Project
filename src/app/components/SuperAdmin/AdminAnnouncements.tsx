// ─── Admin Announcements ─────────────────────────────────────────
// Draft, preview, publish, expire, edit, and withdraw announcements. Publishing
// materializes recipient records + notifications (via announcementService).

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
  Search,
  Sparkles,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileEdit,
  Calendar,
  Check,
  User,
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
import { formatDate } from "../workflow/primitives";
import { InitialsAvatar } from "../workflow/StatusBadges";

const AUDIENCE_META: Record<Audience, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: "Everyone (Entire LGU)", icon: <Globe size={13} />, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  org: { label: "Department Subtree", icon: <Building2 size={13} />, color: "bg-blue-50 text-blue-700 border-blue-200" },
  users: { label: "Selected Users", icon: <Users size={13} />, color: "bg-purple-50 text-purple-700 border-purple-200" },
};

const STATUS_META: Record<string, { label: string; tone: string }> = {
  draft: { label: "Draft", tone: "bg-neutral-100 text-neutral-700 border-neutral-200" },
  published: { label: "Published", tone: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  withdrawn: { label: "Withdrawn", tone: "bg-rose-50 text-rose-700 border-rose-200" },
};

export function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [editorFor, setEditorFor] = useState<Announcement | "new" | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft" | "withdrawn">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    const unsub = subscribeToAnnouncements((a) => {
      setAnnouncements(a);
      setLoading(false);
    });
    return unsub;
  }, []);

  const stats = useMemo(
    () => ({
      published: announcements.filter((a) => a.status === "published").length,
      drafts: announcements.filter((a) => a.status === "draft").length,
      withdrawn: announcements.filter((a) => a.status === "withdrawn").length,
      total: announcements.length,
    }),
    [announcements]
  );

  const filteredAnnouncements = useMemo(() => {
    let list = announcements;
    if (statusFilter !== "all") {
      list = list.filter((a) => a.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
    }
    return list;
  }, [announcements, statusFilter, searchQuery]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-neutral-400 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <Megaphone size={24} />
          </div>
          <p className="text-[13px] font-['Lexend:Medium',_sans-serif]">Loading announcement control panel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 min-h-full max-w-7xl mx-auto space-y-6">
      {/* ─── Hero Header & Management Banner ─── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-800 to-slate-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-800">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -top-10 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-300 border border-white/10 uppercase tracking-wider mb-3">
              <Sparkles size={12} /> Administration · Communications
            </div>
            <h1 className="text-2xl sm:text-3xl font-['Lexend:SemiBold',_sans-serif] tracking-tight">
              Announcement Management
            </h1>
            <p className="text-[13.5px] font-['Lexend:Regular',_sans-serif] text-neutral-300 mt-1 max-w-xl leading-relaxed">
              Publish executive broadcasts across the entire LGU, target specific department subtrees, or notify individual personnel.
            </p>
          </div>

          <button
            onClick={() => setEditorFor("new")}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-['Lexend:SemiBold',_sans-serif] text-[13px] shadow-lg shadow-blue-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0 cursor-pointer"
          >
            <Plus size={16} /> New Announcement
          </button>
        </div>
      </div>

      {/* ─── Metrics Cards ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">
            Published
          </div>
          <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-emerald-600 mt-0.5 tabular-nums">
            {stats.published}
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">
            Drafts
          </div>
          <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5 tabular-nums">
            {stats.drafts}
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">
            Withdrawn
          </div>
          <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-rose-600 mt-0.5 tabular-nums">
            {stats.withdrawn}
          </div>
        </div>

        <div className="bg-white border border-neutral-200/80 rounded-xl p-4 shadow-xs">
          <div className="text-[10.5px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">
            Total Created
          </div>
          <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5 tabular-nums">
            {stats.total}
          </div>
        </div>
      </div>

      {/* ─── Filter & Search Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "published", "draft", "withdrawn"] as const).map((s) => {
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3.5 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-all capitalize shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {s}
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative sm:w-72">
          <Search size={13} className="text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter announcements…"
            className="w-full pl-8 pr-7 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Announcement List ─── */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-neutral-200/60">
            <Megaphone size={30} />
          </div>
          <h3 className="text-base font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
            No announcements found
          </h3>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1 max-w-sm mx-auto mb-4">
            {searchQuery
              ? `No announcements match "${searchQuery}".`
              : "Draft your first official announcement to send broadcasts."}
          </p>
          <button
            onClick={() => setEditorFor("new")}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[12.5px] font-['Lexend:Medium',_sans-serif] transition-colors cursor-pointer"
          >
            <Plus size={14} /> Create Announcement
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredAnnouncements.map((a) => {
            const aud = AUDIENCE_META[a.audience] || AUDIENCE_META.all;
            const st = STATUS_META[a.status] || STATUS_META.draft;

            return (
              <div
                key={a.id}
                className="bg-white border border-neutral-200/90 hover:border-neutral-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {/* Status Badge */}
                      <span
                        className={`text-[10.5px] font-['Lexend:SemiBold',_sans-serif] rounded-full px-2.5 py-0.5 border uppercase tracking-wider ${st.tone}`}
                      >
                        {st.label}
                      </span>

                      {/* Audience Badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-['Lexend:Medium',_sans-serif] rounded-full px-2.5 py-0.5 border ${aud.color}`}
                      >
                        {aud.icon} {aud.label}
                      </span>

                      {/* Dates */}
                      {a.publishedAt && (
                        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 flex items-center gap-1">
                          <Clock size={11} /> Published {formatDate(a.publishedAt)}
                        </span>
                      )}

                      {a.expiresAt && (
                        <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.2">
                          Expires {formatDate(a.expiresAt)}
                        </span>
                      )}
                    </div>

                    <h3 className="text-[15.5px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tracking-tight">
                      {a.title}
                    </h3>
                    <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                      {a.body}
                    </p>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex items-center gap-1 shrink-0 bg-neutral-50 border border-neutral-200/80 rounded-xl p-1">
                    {a.status !== "published" && (
                      <button
                        onClick={() => setEditorFor(a)}
                        className="p-2 rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
                        title="Edit draft"
                      >
                        <Pencil size={15} />
                      </button>
                    )}

                    {a.status === "published" && (
                      <button
                        onClick={async () => {
                          await withdrawAnnouncement(a.id);
                          toast("Announcement withdrawn.", "success");
                        }}
                        className="p-2 rounded-lg text-neutral-600 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Withdraw announcement"
                      >
                        <Archive size={15} />
                      </button>
                    )}

                    <button
                      onClick={async () => {
                        if (window.confirm("Delete this announcement permanently?")) {
                          await deleteAnnouncement(a.id);
                          toast("Deleted.", "success");
                        }
                      }}
                      className="p-2 rounded-lg text-neutral-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      title="Delete permanently"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Slide-over Drawer / Editor Modal ─── */}
      {editorFor && (
        <AnnouncementEditor
          existing={editorFor === "new" ? null : editorFor}
          onClose={() => setEditorFor(null)}
        />
      )}
    </div>
  );
}

function AnnouncementEditor({
  existing,
  onClose,
}: {
  existing: Announcement | null;
  onClose: () => void;
}) {
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

  const draft: AnnouncementDraft = {
    title,
    body,
    audience,
    orgId: orgId || null,
    userIds,
    expiresAt: expiresAt || null,
  };

  const doSaveDraft = async () => {
    if (!title.trim()) {
      toast("Title is required.", "error");
      return;
    }
    setBusy(true);
    try {
      await saveDraft(draft, existing?.id);
      toast("Draft saved.", "success");
      onClose();
    } catch (e: any) {
      toast(e?.message || "Failed to save draft.", "error");
    } finally {
      setBusy(false);
    }
  };

  const doPublish = async () => {
    if (!title.trim()) {
      toast("Title is required.", "error");
      return;
    }
    if (audience === "org" && !orgId) {
      toast("Choose a department for this audience.", "error");
      return;
    }
    if (audience === "users" && userIds.length === 0) {
      toast("Select at least one recipient.", "error");
      return;
    }
    setBusy(true);
    try {
      const id = existing?.id || (await saveDraft(draft));
      await publishAnnouncement(id, draft);
      toast("Announcement published to all recipients.", "success");
      onClose();
    } catch (e: any) {
      toast(e?.message || "Failed to publish announcement.", "error");
    } finally {
      setBusy(false);
    }
  };

  const candidates = users.filter((u) => u.role !== "super_admin");

  return (
    <>
      <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[580px] bg-white shadow-2xl z-50 flex flex-col border-l border-neutral-200 animate-[slidein_0.25s_cubic-bezier(0.25,1.1,0.4,1)]">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-neutral-900 text-white flex items-center justify-center">
              <Megaphone size={18} />
            </div>
            <div>
              <h2 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {existing ? "Edit Announcement" : "Create New Announcement"}
              </h2>
              <p className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                Draft official broadcast directives
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setPreview(!preview)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-colors cursor-pointer ${
                preview ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200"
              }`}
            >
              <Eye size={13} /> {preview ? "Edit Form" : "Preview"}
            </button>
            <button
              onClick={onClose}
              className="text-neutral-400 hover:text-neutral-800 p-1.5 rounded-lg hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {preview ? (
            <div className="space-y-4">
              <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                Recipient Live Preview
              </div>
              <div className="bg-gradient-to-br from-neutral-50 via-white to-neutral-50 border border-neutral-200/90 rounded-2xl p-6 shadow-sm">
                <div className="inline-flex items-center gap-1.5 text-[11px] font-['Lexend:Medium',_sans-serif] text-blue-700 bg-blue-50 border border-blue-200 rounded-full px-3 py-0.5 mb-3">
                  <Megaphone size={12} /> Announcement · {(AUDIENCE_META[audience] || AUDIENCE_META.all).label}
                </div>
                <h1 className="text-xl font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                  {title || "Untitled Announcement"}
                </h1>
                <div className="text-[13.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 mt-3 whitespace-pre-wrap leading-relaxed">
                  {body || "No message body typed yet."}
                </div>
                {expiresAt && (
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-amber-600 mt-4 pt-3 border-t border-neutral-100 flex items-center gap-1">
                    <Clock size={12} /> Expiration date set for {formatDate(expiresAt)}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Title Input */}
              <div>
                <label className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-1.5 flex items-center justify-between">
                  <span>Announcement Title <span className="text-red-500">*</span></span>
                  <span className="text-[10.5px] text-neutral-400 font-normal">{title.length}/100</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Executive Advisory: Office Hours Adjustment"
                  className={inputCls}
                />
              </div>

              {/* Message Body */}
              <div>
                <label className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-1.5 block">
                  Announcement Message
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={6}
                  placeholder="Write official message guidelines or announcement content…"
                  className={`${inputCls} h-auto resize-none leading-relaxed py-2.5`}
                />
              </div>

              {/* Audience Cards Selector */}
              <div>
                <label className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-2 block">
                  Target Audience Scope
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  {(Object.keys(AUDIENCE_META) as Audience[]).map((a) => {
                    const isSelected = audience === a;
                    const meta = AUDIENCE_META[a];
                    return (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAudience(a)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "border-neutral-900 bg-neutral-900 text-white shadow-sm"
                            : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:border-neutral-300"
                        }`}
                      >
                        <div className="mb-1.5">{meta.icon}</div>
                        <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-center leading-tight">
                          {a === "all" ? "Everyone" : a === "org" ? "Department" : "Selected Users"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Audience Details Picker */}
              {audience === "org" && (
                <div className="bg-blue-50/50 border border-blue-200/80 rounded-xl p-4 space-y-2">
                  <label className="text-[12px] font-['Lexend:Medium',_sans-serif] text-blue-900 block">
                    Select Target Department (Includes Sub-units)
                  </label>
                  <select
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Choose a department…</option>
                    {orgs.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {audience === "users" && (
                <div className="bg-purple-50/50 border border-purple-200/80 rounded-xl p-4 space-y-3">
                  <label className="text-[12px] font-['Lexend:Medium',_sans-serif] text-purple-900 block">
                    Selected Recipient Personnel ({userIds.length})
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {userIds.map((id) => {
                      const u = users.find((x) => x.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1.5 bg-white border border-purple-200 rounded-full pl-1.5 pr-2.5 py-1 text-[11.5px] font-['Lexend:Medium',_sans-serif] shadow-2xs"
                        >
                          <InitialsAvatar name={u?.full_name} size={16} />
                          {u?.full_name?.split(" ")[0]}
                          <button
                            type="button"
                            onClick={() => setUserIds(userIds.filter((x) => x !== id))}
                            className="text-neutral-400 hover:text-red-600"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>

                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value && !userIds.includes(e.target.value)) {
                        setUserIds([...userIds, e.target.value]);
                      }
                    }}
                    className={inputCls}
                  >
                    <option value="">Add recipient user…</option>
                    {candidates
                      .filter((u) => !userIds.includes(u.id))
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name} ({u.job_title || u.role})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Expiry Input */}
              <div>
                <label className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-1.5 block">
                  Expiration Date (Optional)
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={doSaveDraft}
            disabled={busy}
            className="px-4 py-2 bg-white hover:bg-neutral-100 border border-neutral-200 text-neutral-700 rounded-xl text-[12.5px] font-['Lexend:Medium',_sans-serif] transition-colors cursor-pointer disabled:opacity-50"
          >
            Save Draft
          </button>

          <button
            type="button"
            onClick={doPublish}
            disabled={busy}
            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-[12.5px] font-['Lexend:SemiBold',_sans-serif] shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            <Send size={14} /> {busy ? "Publishing…" : "Publish Announcement"}
          </button>
        </div>
      </div>
    </>
  );
}

const inputCls =
  "w-full h-10 px-3 bg-neutral-50/80 border border-neutral-200/80 rounded-xl text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-400 focus:bg-white transition-all";
