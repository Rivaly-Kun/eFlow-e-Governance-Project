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
    orgId?: string;
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

    const channelIdUnique = `chat-${channelId}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelIdUnique)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `channel_id=eq.${channelId}` },
        () => load(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    ancestorOrgIds: string[],
    callback: (channels: ChatChannelSummary[]) => void,
  ): () => void {
    const load = async () => {
      // Task channels — unchanged from Phase 8
      const { data: memberships } = await supabase
        .from("chat_channel_members")
        .select("channel_id, last_read_at, chat_channels(id, name, task_id)")
        .eq("user_id", userId);

      const taskSummaries: ChatChannelSummary[] = await Promise.all(
        (memberships || []).map(async (m: any) => {
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
          };
        }),
      );

      // Org (standing) channels — NEW. No membership table to query;
      // resolve directly from the ancestor org ids the caller computed.
      let orgSummaries: ChatChannelSummary[] = [];
      if (ancestorOrgIds.length > 0) {
        const { data: orgChannels } = await supabase
          .from("chat_channels")
          .select("id, name, org_id")
          .eq("channel_type", "org")
          .in("org_id", ancestorOrgIds);

        orgSummaries = await Promise.all(
          (orgChannels || []).map(async (ch) => {
            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("content, created_at")
              .eq("channel_id", ch.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            return {
              channelId: ch.id,
              orgId: ch.org_id,
              name: ch.name,
              lastMessage: lastMsg?.content,
              lastMessageAt: lastMsg?.created_at ? new Date(lastMsg.created_at).getTime() : undefined,
              unread: false, // no per-user read tracking for standing channels
            };
          }),
        );
      }

      const all = [...orgSummaries, ...taskSummaries];
      all.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));
      callback(all);
    };
    load();

    const channelIdUnique = `my-channels-${userId}-${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelIdUnique)
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => load())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
