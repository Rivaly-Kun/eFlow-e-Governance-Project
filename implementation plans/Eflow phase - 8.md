# eFlow — Phase 8: Task Group Chat (Auto-Generated Channels)
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- Every edit below is anchored to an exact string, verified directly against the current codebase. If a target string does not exist verbatim, stop and output what you actually found instead of guessing.
- Make only the edits listed in this document. Do not refactor, rename, or touch anything outside the listed changes.
- Do not change any exported function signature unless explicitly shown here.
- Before reporting this phase complete, run the SELF-VERIFICATION section at the end.

---

## CONTEXT

Confirmed by direct inspection: no chat/messaging infrastructure exists anywhere in the codebase yet. This phase builds the core mechanism only — a channel automatically created and kept in sync for every task, membership always matching who's actually assigned. Standing department/section-wide channels and the document viewer come in the next phase; this one is scoped to task-based chat only.

**The membership-sync logic lives in a Postgres trigger, not client code.** Tasks get assigned from multiple places — `assignTask`, `reassignTask`, `ProposalImport`'s auto-assignment — and a trigger guarantees the channel stays correct no matter which path touches a task, the same reasoning behind the `subtask_count` trigger from Phase 4. Nobody has to remember to "also update the chat."

**Assumption stated explicitly:** the auto-created channel includes the assignee, everyone in `team_member_ids`, and the task's creator (so the dept head/team leader who assigned it is part of the conversation too). If you want the creator excluded, that's a one-line change to the trigger's array — flag it and it's a five-minute fix, not a redesign.

Two real UI entry points, both anchored to code confirmed to exist right now:
1. **Inside a task** — a Chat tab in the same task editor that already has Subtasks (`TaskSubtasksSection`, built in Phase 4, renders at a specific confirmed line in `MondayBoard.tsx`).
2. **Global icon** — mirrors exactly how `NotificationBell` already mounts in `SidebarDemo.tsx`, so a user can check any of their task channels without opening each task individually.

---

## STEP 0 — RUN THIS SQL IN SUPABASE FIRST

```sql
CREATE TABLE chat_channels (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type TEXT NOT NULL DEFAULT 'task' CHECK (channel_type IN ('task', 'org', 'direct')),
  task_id      UUID REFERENCES tasks(id) ON DELETE CASCADE,
  org_id       UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name         TEXT DEFAULT '',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- one channel per task, enforced at the DB level
CREATE UNIQUE INDEX idx_chat_channels_task_id ON chat_channels (task_id) WHERE task_id IS NOT NULL;

CREATE TABLE chat_channel_members (
  channel_id   UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (channel_id, user_id)
);
CREATE INDEX idx_chat_members_user ON chat_channel_members (user_id);

CREATE TABLE chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id   UUID REFERENCES profiles(id),
  sender_name TEXT DEFAULT '',
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_channel ON chat_messages (channel_id, created_at);

-- ─── Auto-create / sync channel membership whenever assignment changes ──
CREATE OR REPLACE FUNCTION sync_task_chat_channel()
RETURNS TRIGGER AS $$
DECLARE
  v_channel_id UUID;
  v_member_ids UUID[];
BEGIN
  v_member_ids := ARRAY(
    SELECT DISTINCT uid FROM unnest(
      ARRAY[NEW.assigned_to, NEW.created_by] || COALESCE(NEW.team_member_ids, '{}')
    ) AS uid WHERE uid IS NOT NULL
  );

  IF array_length(v_member_ids, 1) IS NULL THEN
    RETURN NEW; -- unassigned task, nobody to chat with yet
  END IF;

  SELECT id INTO v_channel_id FROM chat_channels WHERE task_id = NEW.id;
  IF v_channel_id IS NULL THEN
    INSERT INTO chat_channels (channel_type, task_id, name)
    VALUES ('task', NEW.id, NEW.title)
    RETURNING id INTO v_channel_id;
  ELSE
    UPDATE chat_channels SET name = NEW.title WHERE id = v_channel_id;
  END IF;

  DELETE FROM chat_channel_members
  WHERE channel_id = v_channel_id AND user_id != ALL(v_member_ids);

  INSERT INTO chat_channel_members (channel_id, user_id)
  SELECT v_channel_id, uid FROM unnest(v_member_ids) AS uid
  ON CONFLICT (channel_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_sync_chat_channel
  AFTER INSERT OR UPDATE OF assigned_to, team_member_ids ON tasks
  FOR EACH ROW EXECUTE FUNCTION sync_task_chat_channel();

-- ─── RLS — only channel members can read/write ──────────────────────
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_channel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "channels_member_read" ON chat_channels FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = chat_channels.id AND user_id = auth.uid()));

CREATE POLICY "members_read_own_channels" ON chat_channel_members FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_channel_members m2 WHERE m2.channel_id = chat_channel_members.channel_id AND m2.user_id = auth.uid()));

CREATE POLICY "members_update_own_read_state" ON chat_channel_members FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "messages_member_read" ON chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid()));

CREATE POLICY "messages_member_insert" ON chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid() AND
    EXISTS (SELECT 1 FROM chat_channel_members WHERE channel_id = chat_messages.channel_id AND user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
```

---

## FILES TO CREATE / MODIFY

---

### 1. `src/app/services/chatService.ts` — NEW FILE

```ts
import { supabase } from "../../lib/supabase";

export interface ChatMessage {
  id: string;
  channelId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: number;
}

export interface ChatChannelSummary {
  channelId: string;
  taskId?: string;
  name: string;
  lastMessage?: string;
  lastMessageAt?: number;
  unread: boolean;
}

function rowToMessage(row: Record<string, unknown>): ChatMessage {
  return {
    id: row.id as string,
    channelId: row.channel_id as string,
    senderId: (row.sender_id as string) || "",
    senderName: (row.sender_name as string) || "",
    content: row.content as string,
    createdAt: new Date(row.created_at as string).getTime(),
  };
}

// ─── getChannelForTask ──────────────────────────────────────────────
// Returns null if the task has no assignee yet — the trigger only
// creates a channel once a task is actually assigned to someone.
export async function getChannelForTask(taskId: string): Promise<string | null> {
  const { data } = await supabase
    .from("chat_channels")
    .select("id")
    .eq("task_id", taskId)
    .maybeSingle();
  return data?.id || null;
}

// ─── subscribeToChannelMessages ─────────────────────────────────────
export function subscribeToChannelMessages(
  channelId: string,
  callback: (messages: ChatMessage[]) => void,
): () => void {
  const load = async () => {
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("channel_id", channelId)
      .order("created_at", { ascending: true });
    if (data) callback(data.map(rowToMessage));
  };
  load();

  const channel = supabase
    .channel(`chat-${channelId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
      () => load(),
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}

// ─── sendMessage ─────────────────────────────────────────────────────
export async function sendMessage(
  channelId: string,
  senderId: string,
  senderName: string,
  content: string,
): Promise<void> {
  const trimmed = content.trim();
  if (!trimmed) return;
  const { error } = await supabase.from("chat_messages").insert({
    channel_id: channelId,
    sender_id: senderId,
    sender_name: senderName,
    content: trimmed,
  });
  if (error) throw error;
}

// ─── markChannelRead ─────────────────────────────────────────────────
export async function markChannelRead(channelId: string, userId: string): Promise<void> {
  await supabase
    .from("chat_channel_members")
    .update({ last_read_at: new Date().toISOString() })
    .eq("channel_id", channelId)
    .eq("user_id", userId);
}

// ─── subscribeToMyChannels ───────────────────────────────────────────
// Powers the global chat icon's channel list. Unread = any message in
// the channel newer than this user's last_read_at for that channel.
export function subscribeToMyChannels(
  userId: string,
  callback: (channels: ChatChannelSummary[]) => void,
): () => void {
  const load = async () => {
    const { data: memberships } = await supabase
      .from("chat_channel_members")
      .select("channel_id, last_read_at, chat_channels(id, name, task_id)")
      .eq("user_id", userId);

    if (!memberships) {
      callback([]);
      return;
    }

    const summaries = await Promise.all(
      memberships.map(async (m: any) => {
        const { data: lastMsg } = await supabase
          .from("chat_messages")
          .select("content, created_at")
          .eq("channel_id", m.channel_id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        return {
          channelId: m.channel_id,
          taskId: m.chat_channels?.task_id || undefined,
          name: m.chat_channels?.name || "Untitled",
          lastMessage: lastMsg?.content,
          lastMessageAt: lastMsg?.created_at ? new Date(lastMsg.created_at).getTime() : undefined,
          unread: lastMsg?.created_at
            ? new Date(lastMsg.created_at) > new Date(m.last_read_at)
            : false,
        } as ChatChannelSummary;
      }),
    );

    summaries.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
    callback(summaries);
  };
  load();

  const channel = supabase
    .channel(`my-channels-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => load())
    .subscribe();

  return () => supabase.removeChannel(channel);
}
```

---

### 2. `src/app/components/ui/MondayBoard.tsx` — TARGETED EDIT

**2a. Import.** Add near the existing `subtaskService` import:
```ts
import {
  ChatMessage,
  getChannelForTask,
  subscribeToChannelMessages,
  sendMessage,
  markChannelRead,
} from "../../services/chatService";
```
Add `MessageCircle` to the existing `lucide-react` import block.

**2b. New component.** Place directly above `TaskSubtasksSection` (confirmed to exist in this file):

```tsx
function TaskChatSection({
  taskId,
  currentUserId,
  currentUserName,
}: {
  taskId: string;
  currentUserId?: string;
  currentUserName?: string;
}) {
  const [channelId, setChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    getChannelForTask(taskId).then(setChannelId);
  }, [taskId]);

  useEffect(() => {
    if (!channelId) return;
    const unsub = subscribeToChannelMessages(channelId, setMessages);
    if (currentUserId) markChannelRead(channelId, currentUserId);
    return unsub;
  }, [channelId, currentUserId]);

  const handleSend = async () => {
    if (!channelId || !draft.trim() || !currentUserId) return;
    setSending(true);
    try {
      await sendMessage(channelId, currentUserId, currentUserName || "Someone", draft);
      setDraft("");
    } finally {
      setSending(false);
    }
  };

  if (!channelId) {
    return (
      <div className="pt-2 text-[11px] text-neutral-400 italic">
        Chat opens automatically once this task is assigned to someone.
      </div>
    );
  }

  return (
    <div className="pt-2">
      <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400 mb-2 block">
        Task Chat
      </label>
      <div className="max-h-[220px] overflow-y-auto space-y-2 mb-2 pr-1">
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && (
                <span className="text-[9px] text-neutral-400 mb-0.5">{m.senderName}</span>
              )}
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
        {messages.length === 0 && (
          <div className="text-[11px] text-neutral-400 italic py-2">No messages yet.</div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          placeholder="Message the team…"
          className="flex-1 h-[34px] rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] outline-none focus:border-neutral-400"
        />
        <button
          onClick={handleSend}
          disabled={sending || !draft.trim()}
          className="h-[34px] px-3 rounded-lg bg-neutral-900 text-white text-[11px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
        >
          <MessageCircle size={13} />
        </button>
      </div>
    </div>
  );
}
```

**2c. Mount it.** Find this exact line:
```tsx
          <TaskSubtasksSection taskId={task.id} />
```
Add directly after it:
```tsx
          <TaskChatSection
            taskId={task.id}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
```
If `TaskEditorModal` (the component containing this line) doesn't already have `currentUserId`/`currentUserName` in scope as props or variables, trace how `TaskSubtasksSection` itself gets the equivalent — it's rendered in the same component, so whatever identity values are already available there are the ones to reuse here too.

---

### 3. `src/app/components/ui/ChatListDrawer.tsx` — NEW FILE

A global entry point mirroring `NotificationBell`'s mount pattern — a small icon that opens a dropdown of the user's channels.

```tsx
import React, { useState, useEffect, useRef } from "react";
import { MessageCircle, X } from "lucide-react";
import {
  ChatChannelSummary,
  ChatMessage,
  subscribeToMyChannels,
  subscribeToChannelMessages,
  sendMessage,
  markChannelRead,
} from "../../services/chatService";

export function ChatListDrawer({
  userId,
  userName,
}: {
  userId?: string;
  userName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [channels, setChannels] = useState<ChatChannelSummary[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToMyChannels(userId, setChannels);
    return unsub;
  }, [userId]);

  useEffect(() => {
    if (!activeChannelId) return;
    const unsub = subscribeToChannelMessages(activeChannelId, setMessages);
    if (userId) markChannelRead(activeChannelId, userId);
    return unsub;
  }, [activeChannelId, userId]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const unreadTotal = channels.filter((c) => c.unread).length;

  const handleSend = async () => {
    if (!activeChannelId || !draft.trim() || !userId) return;
    await sendMessage(activeChannelId, userId, userName || "Someone", draft);
    setDraft("");
  };

  if (!userId) return null;

  return (
    <div className="relative" ref={ref}>
      <button
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
        <div className="absolute right-0 top-10 w-[320px] bg-white rounded-xl border border-neutral-200 shadow-lg z-50 overflow-hidden">
          {!activeChannelId ? (
            <div className="max-h-[380px] overflow-y-auto">
              <div className="px-3 py-2.5 border-b border-neutral-100 text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                Task Chats
              </div>
              {channels.map((c) => (
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
                  No chats yet — they appear once you're assigned a task.
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
```

---

### 4. `src/app/components/Layout/SidebarDemo.tsx` — TARGETED EDIT

**4a. Import.** Find this exact line:
```ts
import { NotificationBell } from "../ui/NotificationBell";
```
Add directly after it:
```ts
import { ChatListDrawer } from "../ui/ChatListDrawer";
```

**4b. Mount.** Find this exact line:
```tsx
        {user?.id && <NotificationBell userId={user.id} compact />}
```
Add directly after it:
```tsx
        {user?.id && <ChatListDrawer userId={user.id} userName={userProfile?.fullName} />}
```
If `userProfile` isn't already in scope at this point in the file, use whatever identity source `NotificationBell`'s neighboring code already relies on for the display name — do not introduce a new context read if one already exists nearby.

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Did you run the Step 0 SQL completely — three tables, the trigger function, the trigger itself, and all RLS policies?
- [ ] Does assigning a task to someone (via any existing assignment path) actually create a row in `chat_channels` — verified by checking the table after a real assignment, not just by reading the trigger code?
- [ ] Does reassigning a task update `chat_channel_members` — old assignee removed, new one added — rather than just adding the new one on top?
- [ ] Does `TaskChatSection` render inside the task editor directly below the existing Subtasks section, not replacing it?
- [ ] Does `ChatListDrawer` mount in `SidebarDemo.tsx` right next to `NotificationBell`, following the exact same conditional-render pattern?
- [ ] Do messages sent from the in-task chat and the global drawer both land in the same `chat_messages` rows — i.e., is `getChannelForTask` returning the same channel id the trigger created, not a duplicate?
- [ ] Did you touch any file, function, or import not explicitly listed in this document? If yes, revert those changes.
- [ ] Does the project still build with no new errors introduced?

---

## TESTING CHECKLIST

- [ ] Assign a task to an employee → check Supabase → a `chat_channels` row exists for that task, with the assignee, the creator, and any team members all in `chat_channel_members`
- [ ] Open that task in MondayBoard → Chat section shows (not the "opens automatically once assigned" placeholder, since it's now assigned)
- [ ] Send a message from the task's Chat tab → open the same task in a second browser tab (or as the employee) → message appears in real time
- [ ] Send a message from the global chat icon's thread view instead → confirm it's the exact same conversation as the in-task one, not a separate thread
- [ ] Reassign the task to a different employee → old assignee's `chat_channel_members` row is gone, new assignee's exists, chat history is still intact (messages aren't deleted, just membership changes)
- [ ] Global chat icon shows an unread badge when a new message arrives in any of your channels, and it clears after opening that channel
- [ ] Create a brand-new, unassigned task → confirm no chat channel exists yet, and the in-task Chat section shows the "opens automatically" placeholder rather than erroring