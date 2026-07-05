import React, { useState, useEffect, useMemo, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import {
  ChatChannelSummary,
  ChatMessage,
  subscribeToMyChannels,
  subscribeToChannelMessages,
  sendMessage,
  markChannelRead,
} from "../../services/chatService";
import { useOrgs } from "../../hooks/useSupabaseData";
import { getAncestorOrgIds } from "../../../lib/supabaseService";

export function ChatListDrawer({
  userId,
  userName,
  userOrgId,
}: {
  userId?: string;
  userName?: string;
  userOrgId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<ChatChannelSummary[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({});

  const { orgs } = useOrgs();
  const ancestorOrgIds = useMemo(
    () => getAncestorOrgIds(orgs, userOrgId),
    [orgs, userOrgId],
  );

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToMyChannels(userId, ancestorOrgIds, setChannels);
    return unsub;
  }, [userId, ancestorOrgIds]);

  useEffect(() => {
    if (!activeChannelId) return;
    const unsub = subscribeToChannelMessages(activeChannelId, setMessages);
    if (userId) markChannelRead(activeChannelId, userId);
    return unsub;
  }, [activeChannelId, userId]);

  // Position the panel dynamically to the right of the button
  useEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const panelHeight = activeChannelId ? 380 : 300;
    const spaceBelow = window.innerHeight - rect.top;
    const top =
      spaceBelow >= panelHeight
        ? rect.top
        : Math.max(8, rect.bottom - panelHeight);
    setPanelStyle({
      position: "fixed",
      top,
      left: rect.right + 12,
      zIndex: 9999,
      width: 320,
    });
  }, [open, activeChannelId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        !buttonRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const unreadTotal = channels.filter((c) => c.unread).length;

  const handleSend = async () => {
    if (!activeChannelId || !draft.trim() || !userId) return;
    await sendMessage(activeChannelId, userId, userName || "Someone", draft);
    setDraft("");
  };

  if (!userId) return null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        className="relative w-8 h-8 rounded-lg flex items-center justify-center text-neutral-500 hover:bg-neutral-100 transition-colors"
      >
        <MessageCircle size={17} />
        {unreadTotal > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center">
            {unreadTotal}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white rounded-xl border border-neutral-200 shadow-lg overflow-hidden"
        >
          {!activeChannelId ? (
            <div className="max-h-[380px] overflow-y-auto">
              <div className="px-3 py-2.5 border-b border-neutral-100 text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                Chats
              </div>
              {channels.filter((c) => c.orgId).length > 0 && (
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-50">
                  Standing Channels
                </div>
              )}
              {channels
                .filter((c) => c.orgId)
                .map((c) => (
                  <button
                    key={c.channelId}
                    onClick={() => setActiveChannelId(c.channelId)}
                    className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 border-b border-neutral-50 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] text-neutral-800 truncate font-['Lexend:Medium',_sans-serif]">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {c.lastMessage || "No messages yet"}
                      </div>
                    </div>
                    {c.unread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-2" />}
                  </button>
                ))}
              {channels.filter((c) => !c.orgId).length > 0 && (
                <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-50">
                  Task Chats
                </div>
              )}
              {channels
                .filter((c) => !c.orgId)
                .map((c) => (
                  <button
                    key={c.channelId}
                    onClick={() => setActiveChannelId(c.channelId)}
                    className="w-full text-left px-3 py-2.5 hover:bg-neutral-50 border-b border-neutral-50 flex items-center justify-between"
                  >
                    <div className="min-w-0">
                      <div className="text-[12px] text-neutral-800 truncate font-['Lexend:Medium',_sans-serif]">
                        {c.name}
                      </div>
                      <div className="text-[10px] text-neutral-400 truncate">
                        {c.lastMessage || "No messages yet"}
                      </div>
                    </div>
                    {c.unread && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-2" />}
                  </button>
                ))}
              {channels.length === 0 && (
                <div className="px-3 py-6 text-center text-[11px] text-neutral-400">
                  No chats yet.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-[380px]">
              <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between">
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700 truncate">
                  {channels.find((c) => c.channelId === activeChannelId)?.name}
                </span>
                <button onClick={() => setActiveChannelId(null)} className="text-neutral-400 hover:text-neutral-700">
                  <X size={14} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.map((m) => {
                  const mine = m.senderId === userId;
                  return (
                    <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                      {!mine && <span className="text-[9px] text-neutral-400 mb-0.5">{m.senderName}</span>}
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-1.5 text-[12px] ${
                          mine ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-800"
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="p-2 border-t border-neutral-100 flex items-center gap-2">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Message…"
                  className="flex-1 h-[32px] rounded-lg border border-neutral-200 px-2.5 text-[12px] outline-none focus:border-neutral-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="h-[32px] px-2.5 rounded-lg bg-neutral-900 text-white disabled:opacity-40"
                >
                  <MessageCircle size={13} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ChatListDrawer;
