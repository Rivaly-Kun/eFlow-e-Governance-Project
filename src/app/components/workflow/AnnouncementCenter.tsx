// ─── Announcement Center ─────────────────────────────────────────
// Recipient-side inbox with unread/read state. Shown to Employees and Dept
// Heads. Reads from announcement_recipients via announcementService.

import React, { useEffect, useState } from "react";
import { Megaphone, Check, Clock, Globe, Building2, Users, Mail, MailOpen } from "lucide-react";
import {
  subscribeToMyAnnouncements,
  markAnnouncementRead,
  type AnnouncementForUser,
} from "../../services/announcementService";
import { useAuth } from "../../contexts/AuthContext";
import {
  PageHeader,
  SectionEmpty,
  LoadingState,
  formatDate,
} from "./primitives";

const AUD_ICON: Record<string, React.ReactNode> = {
  all: <Globe size={11} />,
  org: <Building2 size={11} />,
  users: <Users size={11} />,
};

export function AnnouncementCenter({ eyebrow = "My Workspace · Updates" }: { eyebrow?: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<AnnouncementForUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const unsub = subscribeToMyAnnouncements(user.id, (a) => { setItems(a); setLoading(false); });
    return unsub;
  }, [user?.id]);

  const unread = items.filter((a) => !a.readAt);
  const shown = filter === "unread" ? unread : items;

  const open = async (a: AnnouncementForUser) => {
    setOpenId(openId === a.id ? null : a.id);
    if (!a.readAt && user?.id) {
      await markAnnouncementRead(user.id, a.id);
    }
  };

  if (loading) return <div className="p-8"><LoadingState label="Loading announcements…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow={eyebrow}
        title="Announcement Center"
        subtitle="Official updates addressed to you."
        actions={
          <div className="inline-flex items-center bg-white border border-neutral-200 rounded-lg p-0.5">
            {(["all", "unread"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-[11.5px] font-['Lexend:Medium',_sans-serif] ${filter === f ? "bg-neutral-900 text-white" : "text-neutral-600"}`}
              >
                {f === "all" ? "All" : `Unread${unread.length ? ` (${unread.length})` : ""}`}
              </button>
            ))}
          </div>
        }
      />

      {shown.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <SectionEmpty
            icon={<Megaphone size={30} />}
            title={filter === "unread" ? "You're all caught up" : "No announcements"}
            description={filter === "unread" ? "No unread announcements right now." : "New announcements will appear here."}
          />
        </div>
      ) : (
        <div className="space-y-2 max-w-3xl">
          {shown.map((a) => {
            const isOpen = openId === a.id;
            const isUnread = !a.readAt;
            return (
              <button
                key={a.id}
                onClick={() => open(a)}
                className={`w-full text-left bg-white border rounded-xl p-4 transition-all ${isUnread ? "border-blue-200 shadow-sm" : "border-neutral-200"} hover:border-neutral-300`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isUnread ? "bg-blue-50 text-blue-600" : "bg-neutral-100 text-neutral-400"}`}>
                    {isUnread ? <Mail size={16} /> : <MailOpen size={16} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className={`text-[14px] font-['Lexend:SemiBold',_sans-serif] ${isUnread ? "text-neutral-900" : "text-neutral-700"}`}>{a.title}</h3>
                      {isUnread && <span className="w-2 h-2 rounded-full bg-blue-500" />}
                    </div>
                    <div className="flex items-center gap-2 text-[10.5px] text-neutral-400 mt-0.5">
                      <span className="inline-flex items-center gap-1 bg-neutral-100 rounded px-1.5 py-0.5">{AUD_ICON[a.audience]} {a.audience}</span>
                      <span className="flex items-center gap-1"><Clock size={10} /> {formatDate(a.publishedAt)}</span>
                    </div>
                    <p className={`text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-2 whitespace-pre-wrap ${isOpen ? "" : "line-clamp-2"}`}>
                      {a.body}
                    </p>
                    {a.readAt && <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-2"><Check size={10} /> Read</div>}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
