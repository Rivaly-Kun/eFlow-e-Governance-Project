import { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import {
  deleteAnnouncement,
  subscribeToAnnouncements,
  withdrawAnnouncement,
  type Announcement,
} from "../../../../services/announcementService";
import { useToast } from "../../../../components/ui/Toast";
import { formatDate } from "../../../../components/workflow/primitives";
import { AnnouncementEditor } from "./AnnouncementEditor";
import { AUDIENCE_META, STATUS_META } from "./announcementMeta";

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
            <Icons.Megaphone size={24} />
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
              <Icons.Sparkles size={12} /> Administration · Communications
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
            <Icons.Plus size={16} /> New Announcement
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
          <Icons.Search size={13} className="text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
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
              <Icons.X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* ─── Announcement List ─── */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-neutral-200/60">
            <Icons.Megaphone size={30} />
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
            <Icons.Plus size={14} /> Create Announcement
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
                          <Icons.Clock size={11} /> Published {formatDate(a.publishedAt)}
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
                        <Icons.Pencil size={15} />
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
                        <Icons.Archive size={15} />
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
                      <Icons.Trash2 size={15} />
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
