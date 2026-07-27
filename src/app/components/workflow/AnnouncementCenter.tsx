// ─── Announcement Center ─────────────────────────────────────────
// Premium recipient-side inbox with unread/read state & detailed view.
// Shown to Employees and Dept Heads. Reads live from announcementService.

import React, { useEffect, useState, useMemo } from "react";
import {
  Megaphone,
  Check,
  Clock,
  Globe,
  Building2,
  Users,
  Mail,
  MailOpen,
  Search,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  X,
  Bell,
  Inbox,
  Filter,
  Calendar,
  Layers,
  Info,
} from "lucide-react";
import {
  subscribeToMyAnnouncements,
  markAnnouncementRead,
  type AnnouncementForUser,
  type Audience,
} from "../../services/announcementService";
import { useAuth } from "../../contexts/AuthContext";
import { formatDate } from "./primitives";

const AUDIENCE_META: Record<Audience, { label: string; icon: React.ReactNode; color: string }> = {
  all: {
    label: "Entire LGU",
    icon: <Globe size={11} />,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  org: {
    label: "Department Scope",
    icon: <Building2 size={11} />,
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  users: {
    label: "Direct Announcement",
    icon: <Users size={11} />,
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export function AnnouncementCenter({ eyebrow = "My Workspace · Updates" }: { eyebrow?: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AnnouncementForUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementForUser | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToMyAnnouncements(user.id, (a) => {
      setItems(a);
      setLoading(false);
    });
    return unsub;
  }, [user?.id]);

  const unreadList = useMemo(() => items.filter((a) => !a.readAt), [items]);
  const readList = useMemo(() => items.filter((a) => a.readAt), [items]);

  const filteredItems = useMemo(() => {
    let list = items;
    if (filter === "unread") list = unreadList;
    if (filter === "read") list = readList;
    if (audienceFilter !== "all") {
      list = list.filter((a) => a.audience === audienceFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q)
      );
    }
    return list;
  }, [items, filter, unreadList, readList, audienceFilter, searchQuery]);

  const openAnnouncement = async (a: AnnouncementForUser) => {
    setSelectedAnnouncement(a);
    if (!a.readAt && user?.id) {
      await markAnnouncementRead(user.id, a.id);
    }
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    for (const a of unreadList) {
      await markAnnouncementRead(user.id, a.id);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-neutral-400 animate-pulse">
          <div className="w-12 h-12 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400">
            <Megaphone size={24} />
          </div>
          <p className="text-[13px] font-['Lexend:Medium',_sans-serif]">Loading announcement center…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8 min-h-full max-w-7xl mx-auto space-y-6">
      {/* ─── Hero Header & Stats Banner ─── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-neutral-900 via-neutral-800 to-indigo-950 text-white rounded-2xl p-6 sm:p-8 shadow-xl border border-neutral-800">
        {/* Glow backdrop graphics */}
        <div className="absolute -right-12 -bottom-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute right-32 -top-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[11px] font-['Lexend:Medium',_sans-serif] text-blue-200 border border-white/10 uppercase tracking-wider mb-3">
              <Sparkles size={12} /> {eyebrow}
            </div>
            <h1 className="text-2xl sm:text-3xl font-['Lexend:SemiBold',_sans-serif] tracking-tight">
              Announcement Center
            </h1>
            <p className="text-[13.5px] font-['Lexend:Regular',_sans-serif] text-neutral-300 mt-1 max-w-xl leading-relaxed">
              Official executive directives, departmental updates, and urgent broadcasts addressed to your workspace.
            </p>
          </div>

          {/* Quick Metrics Cards */}
          <div className="flex items-center gap-3 self-start md:self-auto shrink-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-xl px-4 py-3 min-w-[100px]">
              <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                Total
              </div>
              <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-white mt-0.5 tabular-nums">
                {items.length}
              </div>
            </div>
            <div className="bg-blue-500/10 backdrop-blur-md border border-blue-400/20 rounded-xl px-4 py-3 min-w-[100px]">
              <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-blue-300">
                Unread
              </div>
              <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-blue-200 mt-0.5 tabular-nums">
                {unreadList.length}
              </div>
            </div>
            <div className="bg-emerald-500/10 backdrop-blur-md border border-emerald-400/20 rounded-xl px-4 py-3 min-w-[100px]">
              <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-emerald-300">
                Completed
              </div>
              <div className="text-2xl font-['Lexend:SemiBold',_sans-serif] text-emerald-200 mt-0.5 tabular-nums">
                {readList.length}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Search & Controls Bar ─── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white border border-neutral-200/80 rounded-xl p-2.5 shadow-sm">
        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {(["all", "unread", "read"] as const).map((f) => {
            const count = f === "all" ? items.length : f === "unread" ? unreadList.length : readList.length;
            const isActive = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                {f === "all" && <Inbox size={13} />}
                {f === "unread" && <Mail size={13} />}
                {f === "read" && <CheckCircle2 size={13} />}
                <span className="capitalize">{f}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-['Lexend:SemiBold',_sans-serif] tabular-nums ${
                    isActive ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <div className="w-px h-5 bg-neutral-200 mx-1 shrink-0" />

          {/* Audience Filter Select */}
          <div className="relative flex items-center shrink-0">
            <Filter size={12} className="text-neutral-400 absolute left-2.5 pointer-events-none" />
            <select
              value={audienceFilter}
              onChange={(e) => setAudienceFilter(e.target.value)}
              className="pl-7 pr-7 py-1.5 bg-neutral-50 border border-neutral-200 rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 focus:outline-none focus:border-neutral-400 cursor-pointer appearance-none"
            >
              <option value="all">All Audiences</option>
              <option value="all">Globe (Entire LGU)</option>
              <option value="org">Department</option>
              <option value="users">Direct</option>
            </select>
          </div>
        </div>

        {/* Search Bar & Mark Read Action */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search size={13} className="text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search announcements…"
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

          {unreadList.length > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] transition-colors shrink-0 cursor-pointer"
              title="Mark all announcements as read"
            >
              <CheckCircle2 size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* ─── Announcements List ─── */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto mb-4 border border-neutral-200/60">
            <Megaphone size={30} />
          </div>
          <h3 className="text-base font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
            {filter === "unread" ? "You're all caught up!" : "No announcements found"}
          </h3>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1 max-w-sm mx-auto">
            {filter === "unread"
              ? "There are no unread announcements in your inbox right now."
              : searchQuery
              ? `No announcements match "${searchQuery}". Try a different term.`
              : "New official directives and announcements will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredItems.map((a) => {
            const isUnread = !a.readAt;
            const aud = AUDIENCE_META[a.audience] || AUDIENCE_META.all;

            return (
              <div
                key={a.id}
                onClick={() => openAnnouncement(a)}
                className={`group relative bg-white border rounded-2xl p-5 transition-all cursor-pointer shadow-sm hover:shadow-md ${
                  isUnread
                    ? "border-blue-300 ring-1 ring-blue-100 bg-gradient-to-r from-blue-50/40 via-white to-white"
                    : "border-neutral-200/90 hover:border-neutral-300"
                }`}
              >
                {/* Unread Accent Indicator */}
                {isUnread && (
                  <div className="absolute left-0 top-4 bottom-4 w-1.5 bg-blue-500 rounded-r-full" />
                )}

                <div className="flex items-start gap-4">
                  {/* Status Icon Container */}
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                      isUnread
                        ? "bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20 group-hover:scale-105"
                        : "bg-neutral-100 text-neutral-500 border-neutral-200"
                    }`}
                  >
                    {isUnread ? <Mail size={18} /> : <MailOpen size={18} />}
                  </div>

                  {/* Main Content Area */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1.5 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Audience Badge */}
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] border ${aud.color}`}
                        >
                          {aud.icon} {aud.label}
                        </span>

                        {/* Unread Pill */}
                        {isUnread && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-['Lexend:SemiBold',_sans-serif] bg-blue-500 text-white shadow-xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" /> NEW
                          </span>
                        )}

                        {/* Read Badge */}
                        {a.readAt && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5">
                            <Check size={11} /> Read
                          </span>
                        )}
                      </div>

                      {/* Published Date */}
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 flex items-center gap-1 shrink-0">
                        <Clock size={11} /> {formatDate(a.publishedAt)}
                      </span>
                    </div>

                    {/* Announcement Title */}
                    <h3
                      className={`text-[15px] font-['Lexend:SemiBold',_sans-serif] tracking-tight ${
                        isUnread ? "text-neutral-900" : "text-neutral-800"
                      }`}
                    >
                      {a.title}
                    </h3>

                    {/* Body Snippet */}
                    <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-1 line-clamp-2 leading-relaxed">
                      {a.body}
                    </p>

                    {/* Footer Info */}
                    {a.expiresAt && (
                      <div className="mt-3 flex items-center gap-1 text-[11px] text-amber-600 font-['Lexend:Medium',_sans-serif]">
                        <Info size={12} /> Valid until {formatDate(a.expiresAt)}
                      </div>
                    )}
                  </div>

                  <div className="self-center pl-2 shrink-0 text-neutral-300 group-hover:text-neutral-600 group-hover:translate-x-0.5 transition-all">
                    <ChevronRight size={18} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Detail Modal / Drawer View ─── */}
      {selectedAnnouncement && (
        <>
          <div
            className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-40 transition-opacity"
            onClick={() => setSelectedAnnouncement(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[600px] bg-white shadow-2xl z-50 flex flex-col border-l border-neutral-200 animate-[slidein_0.25s_cubic-bezier(0.25,1.1,0.4,1)]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Megaphone size={16} />
                </div>
                <div>
                  <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-400 uppercase tracking-wider">
                    Official Directive
                  </div>
                  <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                    Announcement Detail
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11.5px] font-['Lexend:Medium',_sans-serif] border ${
                      (AUDIENCE_META[selectedAnnouncement.audience] || AUDIENCE_META.all).color
                    }`}
                  >
                    {(AUDIENCE_META[selectedAnnouncement.audience] || AUDIENCE_META.all).icon}{" "}
                    {(AUDIENCE_META[selectedAnnouncement.audience] || AUDIENCE_META.all).label}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
                    <Calendar size={12} /> Published {formatDate(selectedAnnouncement.publishedAt)}
                  </span>
                </div>

                <h1 className="text-xl font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-snug">
                  {selectedAnnouncement.title}
                </h1>
              </div>

              <div className="h-px bg-neutral-100" />

              {/* Message Content */}
              <div className="bg-neutral-50/80 border border-neutral-200/60 rounded-2xl p-5 text-[14px] font-['Lexend:Regular',_sans-serif] text-neutral-800 whitespace-pre-wrap leading-relaxed shadow-xs">
                {selectedAnnouncement.body}
              </div>

              {selectedAnnouncement.expiresAt && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-amber-800">
                  <Info size={16} className="text-amber-600 shrink-0 mt-0.5" />
                  <div className="text-[12px] font-['Lexend:Regular',_sans-serif]">
                    This announcement has a set expiration date of{" "}
                    <strong className="font-['Lexend:SemiBold',_sans-serif]">
                      {formatDate(selectedAnnouncement.expiresAt)}
                    </strong>
                    .
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-100 bg-neutral-50/50 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-emerald-600">
                <CheckCircle2 size={15} /> Marked as read
              </div>
              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-[12.5px] font-['Lexend:Medium',_sans-serif] transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
