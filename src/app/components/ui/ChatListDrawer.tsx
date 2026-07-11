import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  MessageCircle,
  X,
  Phone,
  Video,
  Star,
  Send,
  Smile,
  CornerUpLeft,
  MoreVertical,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  ChatChannelSummary,
  ChatMessage,
  subscribeToMyChannels,
  subscribeToChannelMessages,
  sendMessageWithMentions,
  markChannelRead,
  deleteMessage,
  updateMessageContent,
} from "../../services/chatService";
import { initiateCall, ActiveCall } from "../../services/callService";
import { CallModal } from "./CallModal";
import { useOrgs } from "../../hooks/useSupabaseData";
import { getAncestorOrgIds } from "../../../lib/supabaseService";

interface ParsedMessage {
  text: string;
  replyToName?: string;
  replyToText?: string;
  reactions?: Record<string, string[]>;
}

function parseMessage(content: string): ParsedMessage {
  try {
    if (content.startsWith("{") && content.endsWith("}")) {
      const parsed = JSON.parse(content);
      if (typeof parsed === "object" && parsed !== null && "text" in parsed) {
        return parsed;
      }
    }
  } catch (e) {
    // Ignore
  }
  return { text: content };
}

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
  const [outgoingCall, setOutgoingCall] = useState<ActiveCall | null>(null);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeReactionMenuFor, setActiveReactionMenuFor] = useState<
    string | null
  >(null);
  const [activeMoreMenuFor, setActiveMoreMenuFor] = useState<string | null>(
    null,
  );
  const [reactionsModalContent, setReactionsModalContent] = useState<{
    all: Array<{ name: string; emoji: string }>;
    byEmoji: Record<string, string[]>;
  } | null>(null);
  const [activeReactionTab, setActiveReactionTab] = useState<string>("all");

  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ── Free-form panel position/size ────────────────────────────────────
  const [panelPos, setPanelPos] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [panelSize, setPanelSize] = useState<{ w: number; h: number }>({
    w: 320,
    h: 420,
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragState = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const resizeState = useRef<{
    startX: number;
    startY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const startDrag = useCallback(
    (e: React.MouseEvent) => {
      if (isFullscreen) return;
      e.preventDefault();
      const pos = panelPos ?? { x: 80, y: 80 };
      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: pos.x,
        origY: pos.y,
      };
      const onMove = (ev: MouseEvent) => {
        if (!dragState.current) return;
        const dx = ev.clientX - dragState.current.startX;
        const dy = ev.clientY - dragState.current.startY;
        setPanelPos({
          x: dragState.current.origX + dx,
          y: dragState.current.origY + dy,
        });
      };
      const onUp = () => {
        dragState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [isFullscreen, panelPos],
  );

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      if (isFullscreen) return;
      e.preventDefault();
      e.stopPropagation();
      resizeState.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: panelSize.w,
        origH: panelSize.h,
      };
      const onMove = (ev: MouseEvent) => {
        if (!resizeState.current) return;
        const dw = ev.clientX - resizeState.current.startX;
        const dh = ev.clientY - resizeState.current.startY;
        setPanelSize({
          w: Math.max(280, resizeState.current.origW + dw),
          h: Math.max(320, resizeState.current.origH + dh),
        });
      };
      const onUp = () => {
        resizeState.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [isFullscreen, panelSize],
  );

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

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Seed initial panel position from button location on first open
  useEffect(() => {
    if (!open || panelPos !== null || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const left = rect.right > 0 ? rect.right + 12 : 80;
    const top = Math.max(8, rect.top - 350);
    setPanelPos({ x: left, y: top });
  }, [open, panelPos]);

  // Reset position when panel is closed
  useEffect(() => {
    if (!open) {
      setPanelPos(null);
      setIsFullscreen(false);
    }
  }, [open]);

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

    let contentToSend = draft;
    if (replyingTo) {
      const payload = {
        text: draft,
        replyToName: replyingTo.senderName,
        replyToText: parseMessage(replyingTo.content).text,
      };
      contentToSend = JSON.stringify(payload);
    }

    await sendMessageWithMentions(
      activeChannelId,
      userId,
      userName || "Someone",
      contentToSend,
    );
    setDraft("");
    setReplyingTo(null);
  };

  const handleToggleReaction = async (msg: ChatMessage, emoji: string) => {
    const parsed = parseMessage(msg.content);
    const reactions = parsed.reactions || {};
    const users = reactions[emoji] || [];
    const displayName = userName || "Someone";

    console.log(
      "[ChatListDrawer] Reacting to message:",
      msg.id,
      "with emoji:",
      emoji,
      "as user:",
      displayName,
    );

    let newUsers: string[];
    if (users.includes(displayName)) {
      newUsers = users.filter((u) => u !== displayName);
    } else {
      newUsers = [...users, displayName];
    }

    const newReactions = { ...reactions, [emoji]: newUsers };
    const updatedContent = JSON.stringify({
      ...parsed,
      reactions: newReactions,
    });

    console.log(
      "[ChatListDrawer] Calculated new reactions payload:",
      newReactions,
    );

    // Optimistic UI Update: update state instantly
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, content: updatedContent } : m,
      ),
    );

    try {
      await updateMessageContent(msg.id, updatedContent);
      console.log("[ChatListDrawer] Reaction successfully saved to Supabase!");
    } catch (err) {
      console.error(
        "[ChatListDrawer] Failed to save reaction to Supabase:",
        err,
      );
      // Rollback on error
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, content: msg.content } : m)),
      );
    }

    setActiveReactionMenuFor(null);
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
          style={
            isFullscreen
              ? {
                  position: "fixed",
                  inset: 0,
                  width: "100vw",
                  height: "100vh",
                  zIndex: 9999,
                  borderRadius: 0,
                }
              : {
                  position: "fixed",
                  left: panelPos?.x ?? 80,
                  top: panelPos?.y ?? 80,
                  width: panelSize.w,
                  height: panelSize.h,
                  zIndex: 9999,
                  minWidth: 280,
                  minHeight: 320,
                }
          }
          className="bg-white border border-neutral-200 shadow-2xl overflow-hidden flex flex-col rounded-xl"
        >
          {!activeChannelId ? (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Drag Handle — centered pill bar like notifications */}
              <div
                onMouseDown={startDrag}
                className="h-5 flex items-center justify-center bg-white border-b border-neutral-100 cursor-grab active:cursor-grabbing shrink-0 select-none group"
                title="Drag to move"
              >
                <span className="w-8 h-0.5 rounded-full bg-neutral-400 opacity-30 group-hover:opacity-70 transition-opacity" />
              </div>
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 bg-white shrink-0">
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">Chats</span>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => setIsFullscreen((v) => !v)}
                  className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition"
                >
                  {isFullscreen ? <Minimize2 size={11} /> : <Maximize2 size={11} />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {channels.filter((c) => c.channelType === "direct").length >
                  0 && (
                  <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-50">
                    Direct Messages
                  </div>
                )}
                {channels
                  .filter((c) => c.channelType === "direct")
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
                          {c.lastMessage
                            ? parseMessage(c.lastMessage).text
                            : "No messages yet"}
                        </div>
                      </div>
                      {c.unread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                {channels.filter((c) => c.isLeadOf).length > 0 && (
                  <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-amber-700 bg-amber-50 border-l-2 border-amber-500 flex items-center gap-1">
                    <Star size={10} className="fill-amber-500 text-amber-500" />
                    Pinned — You're Leading
                  </div>
                )}
                {channels
                  .filter((c) => c.isLeadOf)
                  .map((c) => (
                    <button
                      key={c.channelId}
                      onClick={() => setActiveChannelId(c.channelId)}
                      className="w-full text-left px-3 py-2.5 hover:bg-amber-50/50 border-b border-amber-100/50 flex items-center justify-between bg-amber-50/30"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] text-neutral-800 truncate font-['Lexend:Medium',_sans-serif] flex items-center gap-1.5">
                          <Star
                            size={10}
                            className="fill-amber-400 text-amber-400 shrink-0"
                          />
                          {c.name}
                        </div>
                        <div className="text-[10px] text-neutral-400 truncate">
                          {c.lastMessage
                            ? parseMessage(c.lastMessage).text
                            : "No messages yet"}
                        </div>
                      </div>
                      {c.unread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
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
                          {c.lastMessage
                            ? parseMessage(c.lastMessage).text
                            : "No messages yet"}
                        </div>
                      </div>
                      {c.unread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                {channels.filter((c) => c.taskId && !c.isLeadOf).length > 0 && (
                  <div className="px-3 py-1.5 text-[9px] uppercase tracking-wider text-neutral-400 bg-neutral-50">
                    Task Chats
                  </div>
                )}
                {channels
                  .filter((c) => c.taskId && !c.isLeadOf)
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
                          {c.lastMessage
                            ? parseMessage(c.lastMessage).text
                            : "No messages yet"}
                        </div>
                      </div>
                      {c.unread && (
                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                {channels.length === 0 && (
                  <div className="px-3 py-6 text-center text-[11px] text-neutral-400">
                    No chats yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 bg-neutral-50/20">
              {/* Chat Drag Handle — centered pill bar like notifications */}
              <div
                onMouseDown={startDrag}
                className="h-5 flex items-center justify-center bg-white border-b border-neutral-100 cursor-grab active:cursor-grabbing shrink-0 select-none group"
                title="Drag to move"
              >
                <span className="w-8 h-0.5 rounded-full bg-neutral-400 opacity-30 group-hover:opacity-70 transition-opacity" />
              </div>
              <div className="px-3.5 py-3 border-b border-neutral-100 bg-white flex items-center justify-between shadow-sm shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 text-[10px] font-['Lexend:SemiBold',_sans-serif] flex items-center justify-center shrink-0 border border-blue-100">
                    {(
                      channels.find((c) => c.channelId === activeChannelId)
                        ?.name || "?"
                    )
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 truncate">
                      {
                        channels.find((c) => c.channelId === activeChannelId)
                          ?.name
                      }
                    </div>
                    <div className="text-[9px] text-neutral-400 font-['Lexend:Regular',_sans-serif] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>Active now</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {channels.find((c) => c.channelId === activeChannelId)
                    ?.channelType === "direct" && (
                    <>
                      <button
                        onClick={async () => {
                          const ch = channels.find(
                            (c) => c.channelId === activeChannelId,
                          );
                          if (!ch || !userId) return;
                          const callId = await initiateCall(
                            activeChannelId,
                            userId,
                            userName || "Someone",
                            ch.otherUserId || "",
                            ch.otherUserName || "Unknown",
                            "audio",
                          );
                          setOutgoingCall({
                            id: callId,
                            channelId: activeChannelId,
                            callerId: userId,
                            callerName: userName || "Someone",
                            calleeId: ch.otherUserId || "",
                            calleeName: ch.otherUserName || "Unknown",
                            callType: "audio",
                            status: "ringing",
                          });
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition"
                      >
                        <Phone size={13} />
                      </button>
                      <button
                        onClick={async () => {
                          const ch = channels.find(
                            (c) => c.channelId === activeChannelId,
                          );
                          if (!ch || !userId) return;
                          const callId = await initiateCall(
                            activeChannelId,
                            userId,
                            userName || "Someone",
                            ch.otherUserId || "",
                            ch.otherUserName || "Unknown",
                            "video",
                          );
                          setOutgoingCall({
                            id: callId,
                            channelId: activeChannelId,
                            callerId: userId,
                            callerName: userName || "Someone",
                            calleeId: ch.otherUserId || "",
                            calleeName: ch.otherUserName || "Unknown",
                            callType: "video",
                            status: "ringing",
                          });
                        }}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700 transition"
                      >
                        <Video size={13} />
                      </button>
                    </>
                  )}
                  <button
                    onMouseDown={(e) => e.stopPropagation()}
                    onClick={() => setIsFullscreen((v) => !v)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                  >
                    {isFullscreen ? (
                      <Minimize2 size={13} />
                    ) : (
                      <Maximize2 size={13} />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveChannelId(null)}
                    className="w-7 h-7 flex items-center justify-center rounded-full text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f0f2f5]">
                {messages.map((m, idx) => {
                  const mine = m.senderId === userId;
                  const parsed = parseMessage(m.content);
                  const reactionsMap = parsed.reactions || {};
                  const hasReactions = Object.values(reactionsMap).some(
                    (users) => users.length > 0,
                  );

                  const myInitials =
                    userName
                      ?.split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "ME";
                  const senderInitials =
                    m.senderName
                      ?.split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "?";
                  const isNearTop = idx < 2;

                  // Re-usable hover actions element
                  const hoverActions = (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-150 shrink-0 relative z-20">
                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveReactionMenuFor(
                              activeReactionMenuFor === m.id ? null : m.id,
                            )
                          }
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow hover:bg-neutral-50 text-neutral-500 transition-colors cursor-pointer"
                          title="React"
                        >
                          <Smile size={12} />
                        </button>
                        {activeReactionMenuFor === m.id && (
                          <div
                            className={`absolute ${isNearTop ? "top-8" : "bottom-8"} left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white border border-neutral-200 rounded-full shadow-xl p-1.5 z-50`}
                          >
                            {["👍", "❤️", "😂", "😮", "😢", "😡"].map(
                              (emoji) => (
                                <button
                                  key={emoji}
                                  onClick={() => handleToggleReaction(m, emoji)}
                                  className="text-[16px] hover:scale-130 transition-transform p-0.5 hover:drop-shadow cursor-pointer"
                                >
                                  {emoji}
                                </button>
                              ),
                            )}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setReplyingTo(m)}
                        className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow hover:bg-neutral-50 text-neutral-500 transition-colors cursor-pointer"
                        title="Reply"
                      >
                        <CornerUpLeft size={12} />
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setActiveMoreMenuFor(
                              activeMoreMenuFor === m.id ? null : m.id,
                            )
                          }
                          className="w-6 h-6 flex items-center justify-center rounded-full bg-white shadow hover:bg-neutral-50 text-neutral-500 transition-colors cursor-pointer"
                          title="More"
                        >
                          <MoreVertical size={12} />
                        </button>
                        {activeMoreMenuFor === m.id && (
                          <div
                            className={`absolute z-50 ${isNearTop ? "top-8" : "bottom-8"} bg-white rounded-xl border border-neutral-200 shadow-xl py-1.5 w-28 ${mine ? "right-0" : "left-0"}`}
                          >
                            <button
                              onClick={() => {
                                deleteMessage(m.id);
                                setActiveMoreMenuFor(null);
                              }}
                              className="w-full text-left px-3 py-1.5 text-[11px] text-red-500 hover:bg-red-50 font-semibold cursor-pointer"
                            >
                              Remove
                            </button>
                            {["Forward", "Pin", "Report"].map((opt) => (
                              <button
                                key={opt}
                                onClick={() => {
                                  alert(`${opt}!`);
                                  setActiveMoreMenuFor(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-[11px] text-neutral-700 hover:bg-neutral-50 cursor-pointer"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );

                  return (
                    <div
                      key={m.id}
                      className={`flex items-end gap-2 group ${mine ? "justify-end" : "justify-start"}`}
                    >
                      {/* Left Side elements */}
                      {mine && hoverActions}
                      {!mine && (
                        <div className="w-7 h-7 rounded-full bg-neutral-300 text-neutral-700 text-[9px] flex items-center justify-center shrink-0 font-bold border-2 border-white shadow-sm">
                          {senderInitials}
                        </div>
                      )}

                      {/* Bubble Container */}
                      <div
                        className={`flex flex-col ${mine ? "items-end" : "items-start"} max-w-[72%] relative`}
                      >
                        {!mine && (
                          <span className="text-[9px] text-neutral-500 ml-2 mb-0.5 font-semibold">
                            {m.senderName}
                          </span>
                        )}

                        {parsed.replyToText && (
                          <div
                            className={`mb-1 text-[9px] text-neutral-500 bg-white/70 rounded-xl px-2.5 py-1.5 max-w-[90%] border-l-2 border-blue-400 shadow-xs ${mine ? "self-end" : "self-start"}`}
                          >
                            <span className="font-bold text-blue-600 block">
                              {parsed.replyToName}
                            </span>
                            <span className="italic text-neutral-400 block truncate">
                              {parsed.replyToText}
                            </span>
                          </div>
                        )}

                        <div className="relative pb-1">
                          <div
                            className={`rounded-2xl px-3.5 py-2 text-[12.5px] leading-relaxed break-words ${
                              mine
                                ? "bg-blue-600 text-white rounded-br-sm shadow-sm"
                                : "bg-white text-neutral-800 rounded-bl-sm shadow-sm"
                            }`}
                          >
                            {parsed.text}
                          </div>

                          {hasReactions && (
                            <button
                              onClick={() => {
                                const list: Array<{
                                  name: string;
                                  emoji: string;
                                }> = [];
                                Object.entries(reactionsMap).forEach(
                                  ([emoji, users]) => {
                                    (users as string[]).forEach((username) => {
                                      list.push({ name: username, emoji });
                                    });
                                  },
                                );
                                setReactionsModalContent({
                                  all: list,
                                  byEmoji: reactionsMap,
                                });
                                setActiveReactionTab("all");
                              }}
                              className="absolute -bottom-2.5 right-2 flex items-center gap-0.5 bg-white border border-neutral-200 px-1.5 py-0.5 rounded-full shadow text-[10px] z-10 cursor-pointer hover:bg-neutral-50 active:scale-95 transition-all"
                            >
                              {Object.entries(reactionsMap).map(
                                ([emoji, users]) => {
                                  if ((users as string[]).length === 0)
                                    return null;
                                  return (
                                    <span
                                      key={emoji}
                                      title={(users as string[]).join(", ")}
                                    >
                                      {emoji}
                                      <span className="text-[8px] text-neutral-400 font-bold ml-0.5">
                                        {(users as string[]).length}
                                      </span>
                                    </span>
                                  );
                                },
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Right Side elements */}
                      {mine && (
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-[9px] flex items-center justify-center shrink-0 font-bold border-2 border-white shadow-sm">
                          {myInitials}
                        </div>
                      )}
                      {!mine && hoverActions}
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full py-8 gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <MessageCircle size={18} className="text-blue-400" />
                    </div>
                    <p className="text-[11px] text-neutral-400 text-center">
                      No messages yet.
                      <br />
                      Say hello! 👋
                    </p>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {replyingTo && (
                <div className="px-3.5 py-1.5 bg-neutral-100 border-t border-neutral-200 flex items-center justify-between text-[10px] text-neutral-500 shrink-0 font-['Lexend:Regular',_sans-serif]">
                  <span className="truncate">
                    Replying to{" "}
                    <span className="font-semibold">
                      {replyingTo.senderName}
                    </span>
                    : "{parseMessage(replyingTo.content).text.slice(0, 40)}"
                  </span>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}

              <div className="p-3 border-t border-neutral-100 bg-white flex items-center gap-2 shrink-0">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Message…"
                  className="flex-1 h-[36px] rounded-full border border-neutral-200 bg-neutral-50 px-4 text-[12px] outline-none focus:border-neutral-300 focus:bg-white transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center disabled:opacity-40 disabled:bg-neutral-200 hover:bg-blue-700 active:scale-95 transition-all shrink-0 shadow-sm"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>
          )}
          {/* Resize Handle Ball */}
          {!isFullscreen && (
            <div
              onMouseDown={startResize}
              className="absolute bottom-1.5 right-1.5 w-4 h-4 rounded-full bg-neutral-300 hover:bg-blue-400 cursor-nwse-resize flex items-center justify-center transition-colors shadow z-50 select-none"
              title="Drag to resize"
            >
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="6" cy="6" r="1.2" fill="white" opacity="0.9" />
                <circle cx="3" cy="6" r="1.2" fill="white" opacity="0.6" />
                <circle cx="6" cy="3" r="1.2" fill="white" opacity="0.6" />
              </svg>
            </div>
          )}
        </div>
      )}
      {outgoingCall && (
        <CallModal
          call={outgoingCall}
          isCaller={true}
          onClose={() => setOutgoingCall(null)}
        />
      )}

      {/* Detailed Reactions Modal */}
      {reactionsModalContent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-[100000] p-4 animate-fade-in">
          <div className="bg-[#242526] text-white rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[400px] border border-neutral-800 overflow-hidden font-['Lexend:Regular',_sans-serif]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800 bg-[#242526]">
              <span className="text-[14px] font-bold">Message reactions</span>
              <button
                onClick={() => setReactionsModalContent(null)}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-neutral-800 text-neutral-400 hover:bg-neutral-700 transition cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 px-4 border-b border-neutral-800 bg-[#18191a] shrink-0 overflow-x-auto">
              <button
                onClick={() => setActiveReactionTab("all")}
                className={`py-2.5 px-1 text-[12px] font-semibold border-b-2 transition-all cursor-pointer ${
                  activeReactionTab === "all"
                    ? "border-blue-500 text-blue-500"
                    : "border-transparent text-neutral-400 hover:text-neutral-200"
                }`}
              >
                All {reactionsModalContent.all.length}
              </button>
              {Object.entries(reactionsModalContent.byEmoji).map(
                ([emoji, users]) => {
                  const count = (users as string[]).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={emoji}
                      onClick={() => setActiveReactionTab(emoji)}
                      className={`py-2.5 px-1 text-[12px] font-semibold border-b-2 transition-all flex items-center gap-1 cursor-pointer ${
                        activeReactionTab === emoji
                          ? "border-blue-500 text-blue-500"
                          : "border-transparent text-neutral-400 hover:text-neutral-200"
                      }`}
                    >
                      <span className="text-[14px]">{emoji}</span>
                      <span>{count}</span>
                    </button>
                  );
                },
              )}
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#242526]">
              {(activeReactionTab === "all"
                ? reactionsModalContent.all
                : reactionsModalContent.all.filter(
                    (item: any) => item.emoji === activeReactionTab,
                  )
              ).map((item: any, idx: number) => {
                const initials =
                  item.name
                    .split(" ")
                    .map((p: string) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase() || "?";
                return (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-neutral-750 text-neutral-200 text-[10px] font-bold flex items-center justify-center border border-neutral-700 shadow-xs">
                        {initials}
                      </div>
                      <div>
                        <div className="text-[12.5px] font-bold text-neutral-100">
                          {item.name}
                        </div>
                        <div className="text-[9px] text-neutral-400">
                          Click to view profile
                        </div>
                      </div>
                    </div>
                    <span className="text-[18px]">{item.emoji}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ChatListDrawer;
