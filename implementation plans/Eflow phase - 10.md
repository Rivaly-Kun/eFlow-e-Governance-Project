# eFlow — Phase 10: Voice/Video Calling
## Implementation Directive — Single-Pass Execution

---

## NON-NEGOTIABLES — READ BEFORE ANYTHING ELSE

- **Scope is 1-on-1 calls only.** Group video calls need an SFU server (LiveKit/mediasoup/Janus) — peer-to-peer mesh topology falls apart past ~4 participants. That's explicitly out of scope here; note it as a future stretch goal, don't attempt it.
- This phase reuses the `'direct'` value in `chat_channels.channel_type` — that value has existed in the CHECK constraint since Phase 8 but was never implemented. Do not add a new channel type; wire up the one already reserved.
- Every edit below is anchored to exact strings verified in earlier phases (`chatService.ts`, `ChatListDrawer.tsx`, `SidebarDemo.tsx`). If any don't match current file content, stop and report what you find.
- No new FastAPI endpoints are needed for this phase — signaling runs entirely through Supabase Realtime broadcast, media flows peer-to-peer once connected. If you find yourself wanting to add a server endpoint for call logic, stop — that's a sign of scope drift.
- Before reporting complete, run the SELF-VERIFICATION section at the end.

---

## PART A — MANUAL SETUP (you do this first)

WebRTC needs STUN (free, public, no signup) and TURN (needed when direct peer-to-peer connection fails — common behind restrictive office firewalls, which a government office network often has).

1. Sign up for a free TURN service — Metered.ca's free tier is the simplest (no self-hosting). Alternative: self-host `coturn` if you want zero external dependency, but that's real infrastructure to maintain on top of everything else already running on your laptop.
2. Get your TURN credentials (URL, username, password/credential).
3. Add to `.env`:
   ```
   VITE_STUN_URL=stun:stun.l.google.com:19302
   VITE_TURN_URL=turn:your-turn-server.metered.live:80
   VITE_TURN_USERNAME=your_username
   VITE_TURN_CREDENTIAL=your_credential
   ```

---

## PART B — CODE

---

### STEP 0 — RUN THIS SQL IN SUPABASE

```sql
CREATE TABLE calls (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id  UUID REFERENCES chat_channels(id) ON DELETE SET NULL,
  caller_id   UUID REFERENCES profiles(id),
  caller_name TEXT DEFAULT '',
  callee_id   UUID REFERENCES profiles(id),
  callee_name TEXT DEFAULT '',
  call_type   TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status      TEXT NOT NULL DEFAULT 'ringing'
                CHECK (status IN ('ringing', 'active', 'ended', 'declined', 'missed')),
  started_at  TIMESTAMPTZ DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ
);

CREATE INDEX ON calls (callee_id, status);
CREATE INDEX ON calls (caller_id, started_at DESC);

ALTER TABLE calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "calls_participants_only" ON calls FOR ALL
  USING (caller_id = auth.uid() OR callee_id = auth.uid());

ALTER PUBLICATION supabase_realtime ADD TABLE calls;
```

No schema change needed for `chat_channels`/`chat_channel_members` — `'direct'` is already a valid `channel_type`, and `chat_channel_members` already supports arbitrary membership pairs (that's exactly how task channels work today).

---

### 1. `src/app/services/chatService.ts` — NEW EXPORT

Add near the other channel functions:

```ts
// ─── getOrCreateDirectChannel ────────────────────────────────────────
// Direct channels aren't keyed by task_id or org_id like the other two
// types — they're keyed by the pair of members. Look up via
// chat_channel_members (the same table task channels already use for
// membership) rather than inventing a second membership mechanism.
export async function getOrCreateDirectChannel(
  userIdA: string,
  userIdB: string,
): Promise<string> {
  const { data: myDirectChannels } = await supabase
    .from("chat_channel_members")
    .select("channel_id, chat_channels!inner(channel_type)")
    .eq("user_id", userIdA)
    .eq("chat_channels.channel_type", "direct");

  const candidateIds = (myDirectChannels || []).map((row: any) => row.channel_id);

  if (candidateIds.length > 0) {
    const { data: shared } = await supabase
      .from("chat_channel_members")
      .select("channel_id")
      .eq("user_id", userIdB)
      .in("channel_id", candidateIds)
      .maybeSingle();

    if (shared?.channel_id) return shared.channel_id;
  }

  const { data: newChannel, error } = await supabase
    .from("chat_channels")
    .insert({ channel_type: "direct", name: "" })
    .select()
    .single();
  if (error) throw error;

  await supabase.from("chat_channel_members").insert([
    { channel_id: newChannel.id, user_id: userIdA },
    { channel_id: newChannel.id, user_id: userIdB },
  ]);

  return newChannel.id;
}
```

---

### 2. `src/app/services/callService.ts` — NEW FILE

All WebRTC and signaling logic lives here. Signaling uses Supabase Realtime **broadcast** (not `postgres_changes`) — SDP/ICE exchange is high-frequency and ephemeral, it doesn't belong in a table.

```ts
import { supabase } from "../../lib/supabase";

export type CallType = "audio" | "video";
export type CallStatus = "ringing" | "active" | "ended" | "declined" | "missed";

export interface ActiveCall {
  id: string;
  channelId: string;
  callerId: string;
  callerName: string;
  calleeId: string;
  calleeName: string;
  callType: CallType;
  status: CallStatus;
}

function getIceServers() {
  const servers = [{ urls: import.meta.env.VITE_STUN_URL }];
  if (import.meta.env.VITE_TURN_URL) {
    servers.push({
      urls: import.meta.env.VITE_TURN_URL,
      username: import.meta.env.VITE_TURN_USERNAME,
      credential: import.meta.env.VITE_TURN_CREDENTIAL,
    } as any);
  }
  return servers;
}

// ─── initiateCall ────────────────────────────────────────────────────
// Creates the `calls` row (this is what IncomingCallListener on the
// other end picks up via realtime) and returns the call id.
export async function initiateCall(
  channelId: string,
  callerId: string,
  callerName: string,
  calleeId: string,
  calleeName: string,
  callType: CallType,
): Promise<string> {
  const { data, error } = await supabase
    .from("calls")
    .insert({
      channel_id: channelId,
      caller_id: callerId,
      caller_name: callerName,
      callee_id: calleeId,
      callee_name: calleeName,
      call_type: callType,
      status: "ringing",
    })
    .select()
    .single();
  if (error) throw error;
  return data.id;
}

export async function answerCall(callId: string): Promise<void> {
  await supabase.from("calls").update({ status: "active", answered_at: new Date().toISOString() }).eq("id", callId);
}

export async function declineCall(callId: string): Promise<void> {
  await supabase.from("calls").update({ status: "declined", ended_at: new Date().toISOString() }).eq("id", callId);
}

export async function endCall(callId: string): Promise<void> {
  await supabase.from("calls").update({ status: "ended", ended_at: new Date().toISOString() }).eq("id", callId);
}

// ─── subscribeToIncomingCalls ────────────────────────────────────────
// Global listener — mounted once, high in the app tree, regardless of
// what panel the user is currently looking at.
export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: ActiveCall) => void,
): () => void {
  const channel = supabase
    .channel(`incoming-calls-${userId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "calls", filter: `callee_id=eq.${userId}` },
      (payload) => {
        const row = payload.new as any;
        if (row.status === "ringing") {
          callback({
            id: row.id,
            channelId: row.channel_id,
            callerId: row.caller_id,
            callerName: row.caller_name,
            calleeId: row.callee_id,
            calleeName: row.callee_name,
            callType: row.call_type,
            status: row.status,
          });
        }
      },
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

// ─── WebRTCSession ────────────────────────────────────────────────────
// Wraps RTCPeerConnection + the signaling broadcast channel for one
// call. Both caller and callee construct one of these; role determines
// who creates the offer vs. waits for one.
export class WebRTCSession {
  private pc: RTCPeerConnection;
  private signalChannel: ReturnType<typeof supabase.channel>;
  public onRemoteStream?: (stream: MediaStream) => void;
  public onHangup?: () => void;

  constructor(
    private callId: string,
    private isCaller: boolean,
  ) {
    this.pc = new RTCPeerConnection({ iceServers: getIceServers() as any });
    this.signalChannel = supabase.channel(`call-signal-${callId}`);

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalChannel.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate: event.candidate },
        });
      }
    };

    this.pc.ontrack = (event) => {
      this.onRemoteStream?.(event.streams[0]);
    };

    this.signalChannel
      .on("broadcast", { event: "offer" }, async ({ payload }) => {
        if (this.isCaller) return; // caller doesn't listen for offers
        await this.pc.setRemoteDescription(payload.sdp);
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.signalChannel.send({ type: "broadcast", event: "answer", payload: { sdp: answer } });
      })
      .on("broadcast", { event: "answer" }, async ({ payload }) => {
        if (!this.isCaller) return;
        await this.pc.setRemoteDescription(payload.sdp);
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        try {
          await this.pc.addIceCandidate(payload.candidate);
        } catch (err) {
          console.error("Failed to add ICE candidate:", err);
        }
      })
      .on("broadcast", { event: "hangup" }, () => {
        this.onHangup?.();
      })
      .subscribe();
  }

  async start(localStream: MediaStream): Promise<void> {
    localStream.getTracks().forEach((track) => this.pc.addTrack(track, localStream));
    if (this.isCaller) {
      const offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      this.signalChannel.send({ type: "broadcast", event: "offer", payload: { sdp: offer } });
    }
  }

  hangup(): void {
    this.signalChannel.send({ type: "broadcast", event: "hangup", payload: {} });
    this.pc.close();
    supabase.removeChannel(this.signalChannel);
  }
}

export async function getLocalMedia(callType: CallType): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: callType === "video",
  });
}
```

---

### 3. `src/app/components/ui/CallModal.tsx` — NEW FILE

```tsx
import React, { useEffect, useRef, useState } from "react";
import { PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import {
  ActiveCall,
  WebRTCSession,
  getLocalMedia,
  answerCall,
  endCall,
} from "../../services/callService";

export function CallModal({
  call,
  isCaller,
  onClose,
}: {
  call: ActiveCall;
  isCaller: boolean;
  onClose: () => void;
}) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const sessionRef = useRef<WebRTCSession | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    let localStream: MediaStream;

    const setup = async () => {
      localStream = await getLocalMedia(call.callType);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStream;

      const session = new WebRTCSession(call.id, isCaller);
      sessionRef.current = session;
      session.onRemoteStream = (stream) => {
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = stream;
        setConnected(true);
      };
      session.onHangup = () => {
        endCall(call.id);
        onClose();
      };

      await session.start(localStream);
      if (!isCaller) await answerCall(call.id);
    };

    setup();

    return () => {
      localStream?.getTracks().forEach((t) => t.stop());
      sessionRef.current?.hangup();
    };
  }, [call.id]);

  const toggleMute = () => {
    // local stream tracks — mute/unmute audio track directly
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getAudioTracks().forEach((t) => (t.enabled = muted));
    setMuted(!muted);
  };

  const toggleCamera = () => {
    const stream = localVideoRef.current?.srcObject as MediaStream;
    stream?.getVideoTracks().forEach((t) => (t.enabled = cameraOff));
    setCameraOff(!cameraOff);
  };

  const otherPersonName = isCaller ? call.calleeName : call.callerName;

  return (
    <div className="fixed inset-0 bg-neutral-900 z-[100] flex flex-col items-center justify-center">
      {call.callType === "video" ? (
        <>
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="absolute inset-0 w-full h-full object-cover"
          />
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="absolute bottom-24 right-4 w-28 h-40 rounded-xl object-cover border border-white/20"
          />
        </>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-neutral-700 text-white flex items-center justify-center text-[28px] font-['Lexend:SemiBold',_sans-serif] mb-4">
            {otherPersonName?.[0] || "?"}
          </div>
          <video ref={localVideoRef} autoPlay playsInline muted className="hidden" />
        </div>
      )}

      <div className="absolute top-8 text-white text-center">
        <div className="text-[16px] font-['Lexend:Medium',_sans-serif]">{otherPersonName}</div>
        <div className="text-[12px] text-white/60">{connected ? "Connected" : "Connecting…"}</div>
      </div>

      <div className="absolute bottom-8 flex items-center gap-4">
        <button
          onClick={toggleMute}
          className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
        >
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        {call.callType === "video" && (
          <button
            onClick={toggleCamera}
            className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20"
          >
            {cameraOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}
        <button
          onClick={() => sessionRef.current?.hangup()}
          className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center hover:bg-red-700"
        >
          <PhoneOff size={20} />
        </button>
      </div>
    </div>
  );
}

export default CallModal;
```

---

### 4. `src/app/components/ui/IncomingCallListener.tsx` — NEW FILE

Global ringing-state UI — mirrors how `NotificationBell`/`ChatListDrawer` mount once and stay active regardless of what panel is open.

```tsx
import React, { useState, useEffect } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { ActiveCall, subscribeToIncomingCalls, declineCall } from "../../services/callService";
import { CallModal } from "./CallModal";

export function IncomingCallListener({ userId }: { userId?: string }) {
  const [incoming, setIncoming] = useState<ActiveCall | null>(null);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    if (!userId) return;
    const unsub = subscribeToIncomingCalls(userId, setIncoming);
    return unsub;
  }, [userId]);

  const handleAccept = () => {
    setActiveCall(incoming);
    setIncoming(null);
  };

  const handleDecline = () => {
    if (incoming) declineCall(incoming.id);
    setIncoming(null);
  };

  return (
    <>
      {incoming && (
        <div className="fixed top-4 right-4 z-[200] bg-white rounded-xl border border-neutral-200 shadow-xl p-4 w-[280px]">
          <div className="text-[12px] text-neutral-400 mb-1">
            Incoming {incoming.callType} call
          </div>
          <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 mb-3">
            {incoming.callerName}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAccept}
              className="flex-1 h-9 rounded-lg bg-emerald-600 text-white flex items-center justify-center gap-2 text-[12px] hover:bg-emerald-700"
            >
              <Phone size={14} /> Accept
            </button>
            <button
              onClick={handleDecline}
              className="flex-1 h-9 rounded-lg bg-red-600 text-white flex items-center justify-center gap-2 text-[12px] hover:bg-red-700"
            >
              <PhoneOff size={14} /> Decline
            </button>
          </div>
        </div>
      )}

      {activeCall && (
        <CallModal call={activeCall} isCaller={false} onClose={() => setActiveCall(null)} />
      )}
    </>
  );
}

export default IncomingCallListener;
```

---

### 5. `src/app/components/Layout/SidebarDemo.tsx` — TARGETED EDIT

Find the exact `ChatListDrawer` mount from Phase 9:
```tsx
        {user?.id && (
          <ChatListDrawer
            userId={user.id}
            userName={userProfile?.fullName}
            userOrgId={userProfile?.departmentId}
          />
        )}
```
Add directly after it:
```tsx
        {user?.id && <IncomingCallListener userId={user.id} />}
```
Add the import alongside the `ChatListDrawer` import:
```ts
import { IncomingCallListener } from "../ui/IncomingCallListener";
```

---

### 6. `src/app/components/ui/ChatListDrawer.tsx` — TARGETED ADDITION

Add call-initiation buttons wherever a `'direct'`-type channel's thread view renders (the same message-thread UI already built in Phase 8, now also handling `channel_type === 'direct'`). In the thread header (next to the channel name / close button), add:

```tsx
import { Phone, Video } from "lucide-react";
import { initiateCall } from "../../services/callService";
import { CallModal } from "./CallModal";
```

Add state for an active outgoing call:
```ts
const [outgoingCall, setOutgoingCall] = useState<ActiveCall | null>(null);
```

Add call buttons to the thread header (only render for direct channels — task/org group channels don't support calling in this phase):
```tsx
{activeChannelIsDirect && (
  <div className="flex items-center gap-1">
    <button
      onClick={async () => {
        const callId = await initiateCall(activeChannelId, userId, userName, otherUserId, otherUserName, "audio");
        setOutgoingCall({ id: callId, channelId: activeChannelId, callerId: userId, callerName: userName, calleeId: otherUserId, calleeName: otherUserName, callType: "audio", status: "ringing" });
      }}
      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
    >
      <Phone size={14} />
    </button>
    <button
      onClick={async () => {
        const callId = await initiateCall(activeChannelId, userId, userName, otherUserId, otherUserName, "video");
        setOutgoingCall({ id: callId, channelId: activeChannelId, callerId: userId, callerName: userName, calleeId: otherUserId, calleeName: otherUserName, callType: "video", status: "ringing" });
      }}
      className="p-1.5 rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
    >
      <Video size={14} />
    </button>
  </div>
)}
{outgoingCall && (
  <CallModal call={outgoingCall} isCaller={true} onClose={() => setOutgoingCall(null)} />
)}
```

You'll need to derive `activeChannelIsDirect` and `otherUserId`/`otherUserName` from whatever channel-membership data is already available in this component — verify the exact current shape of `ChatChannelSummary` and the channel list before wiring this up, since Phase 9 added `orgId` to that interface and this needs a similar small addition (`otherUserId?: string` for direct channels) if it isn't already resolvable from what's there.

---

## SELF-VERIFICATION — RUN THIS BEFORE DECLARING THE PHASE COMPLETE

- [ ] Did you complete Part A (TURN credentials) before testing anything?
- [ ] Does `getOrCreateDirectChannel` correctly return the SAME channel id on a second call for the same two users, rather than creating a duplicate?
- [ ] Does starting a call insert a row into `calls` with `status = 'ringing'`, visible to `IncomingCallListener` on the recipient's side in real time?
- [ ] Does accepting a call actually establish a peer-to-peer connection — confirmed by seeing the *other* person's video/hearing their audio, not just your own local preview?
- [ ] Does hangup on either side end the call for both sides, not just the one who clicked it?
- [ ] Is media (audio/video track) actually released (camera/mic light turns off) after a call ends — confirmed the `getTracks().forEach(t => t.stop())` cleanup actually runs?
- [ ] Did you avoid adding any new FastAPI endpoint for this phase?
- [ ] Did you attempt group calling anywhere? (Should be no — explicitly out of scope.)
- [ ] Does the project still build with no new errors introduced?

---

## TESTING CHECKLIST

- [ ] Start a direct chat with a colleague for the first time → confirm a new `'direct'` channel is created
- [ ] Message them again later → confirm the SAME channel is reused, not a new one each time
- [ ] Place an audio call → recipient sees the incoming-call popup within a couple seconds
- [ ] Accept → confirm two-way audio actually works (test with two real devices/browsers, not two tabs on one machine, since local echo can mask real connection issues)
- [ ] Place a video call → confirm both local preview and remote video render correctly
- [ ] Test from two devices on genuinely different networks (e.g., one on office WiFi, one on mobile data) — this is what actually exercises whether your TURN server is doing its job, since two devices on the same LAN will often connect fine via STUN alone even if TURN is misconfigured
- [ ] Decline an incoming call → caller's UI reflects the decline, doesn't hang waiting
- [ ] Hang up mid-call from either side → confirm the OTHER side's call screen also closes, not just the one who hung up
- [ ] Check the `calls` table after a few test calls — `status`, `answered_at`, `ended_at` all populate sensibly, giving you a real call history for free