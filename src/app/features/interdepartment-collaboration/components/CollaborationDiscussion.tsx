import * as React from "react";
import { MessageSquare, Send } from "lucide-react";
import type { Organization, UserProfile } from "../../../types";
import type { CollaborationMessage } from "../types";

export function CollaborationDiscussion({ messages, organizations, profiles, onSend }: {
  messages: CollaborationMessage[];
  organizations: Organization[];
  profiles: UserProfile[];
  onSend: (message: string) => Promise<void>;
}) {
  const [message, setMessage] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const send = async () => { if (!message.trim()) return; setSending(true); try { await onSend(message.trim()); setMessage(""); } finally { setSending(false); } };
  return <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
    <div className="border-b border-neutral-100 px-4 py-3"><div className="flex items-center gap-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900"><MessageSquare size={14} /> Shared discussion</div><div className="mt-0.5 text-[10px] text-neutral-400">Comments do not create revisions. Use a formal change request for required action.</div></div>
    <div className="max-h-[420px] space-y-3 overflow-y-auto p-4">{messages.map((item) => {
      const profile = profiles.find((candidate) => candidate.id === item.authorId);
      const org = organizations.find((candidate) => candidate.id === (item.authorOrgId || profile?.org_id));
      return <div key={item.id} className={`rounded-xl px-3 py-2.5 ${item.messageType === "system" ? "border border-violet-100 bg-violet-50" : "bg-neutral-50"}`}><div className="flex items-center justify-between gap-3"><div className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{item.authorName || profile?.full_name || "eFlow"}<span className="ml-2 text-[9px] font-normal text-neutral-400">{org?.name}</span></div><time className="text-[8px] text-neutral-400">{new Date(item.createdAt).toLocaleString()}</time></div><div className="mt-1 text-[11px] leading-relaxed text-neutral-600">{item.message}</div></div>;
    })}{messages.length === 0 && <div className="py-10 text-center text-[11px] text-neutral-400">No discussion yet.</div>}</div>
    <div className="flex gap-2 border-t border-neutral-100 p-3"><textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={2} placeholder="Write a collaboration note…" className="min-w-0 flex-1 resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-[11px] outline-none focus:border-violet-400" /><button type="button" onClick={send} disabled={!message.trim() || sending} className="inline-flex w-10 items-center justify-center rounded-xl bg-neutral-900 text-white disabled:opacity-40"><Send size={14} /></button></div>
  </section>;
}
