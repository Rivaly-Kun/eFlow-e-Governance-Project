import * as React from "react";
import { AlertTriangle, Check, Plus, X } from "lucide-react";
import type { Organization, UserProfile } from "../../../types";
import type { CollaborationChangeRequest, CollaborationTargetType } from "../types";

export function ChangeRequestsPanel({ requests, organizations, profiles, canRequest, canResolve, onCreate, onResolve }: {
  requests: CollaborationChangeRequest[];
  organizations: Organization[];
  profiles: UserProfile[];
  canRequest: boolean;
  canResolve: boolean;
  onCreate: (input: { targetType: CollaborationTargetType; targetKey: string; reason: string }) => Promise<void>;
  onResolve: (id: string, status: "accepted" | "rejected" | "withdrawn") => Promise<void>;
}) {
  const [creating, setCreating] = React.useState(false);
  const [targetType, setTargetType] = React.useState<CollaborationTargetType>("proposal");
  const [targetKey, setTargetKey] = React.useState("proposal");
  const [reason, setReason] = React.useState("");
  const submit = async () => { if (!reason.trim() || !targetKey.trim()) return; await onCreate({ targetType, targetKey, reason: reason.trim() }); setCreating(false); setReason(""); };
  return <div className="space-y-3">
    <div className="flex items-center justify-between"><div><div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Structured change requests</div><div className="text-[10px] text-neutral-400">Open requirements block final commit.</div></div>{canRequest && <button type="button" onClick={() => setCreating((value) => !value)} className="inline-flex h-8 items-center gap-1 rounded-lg border border-neutral-200 px-3 text-[10px] text-neutral-700"><Plus size={12} /> Request change</button>}</div>
    {creating && <div className="grid gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4 sm:grid-cols-[140px_1fr]"><select value={targetType} onChange={(event) => setTargetType(event.target.value as CollaborationTargetType)} className="h-9 rounded-lg border border-amber-200 bg-white px-2 text-[10px]"><option value="proposal">Proposal</option><option value="program">Program</option><option value="project">Project</option><option value="activity">Activity</option><option value="task">Task</option><option value="staff_assignment">Staff assignment</option></select><input value={targetKey} onChange={(event) => setTargetKey(event.target.value)} placeholder="Target name or key" className="h-9 rounded-lg border border-amber-200 bg-white px-3 text-[10px] outline-none" /><textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="Explain the required change…" className="sm:col-span-2 resize-none rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] outline-none" /><div className="sm:col-span-2 flex justify-end gap-2"><button type="button" onClick={() => setCreating(false)} className="px-3 py-2 text-[10px] text-neutral-500">Cancel</button><button type="button" onClick={submit} disabled={!reason.trim()} className="rounded-lg bg-amber-700 px-3 py-2 text-[10px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40">Submit requirement</button></div></div>}
    {requests.map((request) => { const requester = profiles.find((profile) => profile.id === request.requestedBy); const org = organizations.find((item) => item.id === request.requestingOrgId); return <article key={request.id} className={`rounded-2xl border p-4 ${request.status === "open" ? "border-amber-200 bg-amber-50/40" : "border-neutral-200 bg-white"}`}><div className="flex items-start gap-3"><div className={`flex h-8 w-8 items-center justify-center rounded-lg ${request.status === "open" ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-500"}`}>{request.status === "open" ? <AlertTriangle size={14} /> : <Check size={14} />}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{request.targetType.replace("_", " ")} · {request.targetKey}</span><span className="rounded-full bg-white px-2 py-0.5 text-[8px] uppercase text-neutral-500">{request.status}</span></div><div className="mt-1 text-[11px] text-neutral-600">{request.reason}</div><div className="mt-2 text-[9px] text-neutral-400">{requester?.full_name || "Approver"} · {org?.name} · {new Date(request.createdAt).toLocaleString()}</div></div>{request.status === "open" && <div className="flex gap-1">{canResolve && <><button type="button" onClick={() => onResolve(request.id, "accepted")} className="rounded-lg bg-emerald-50 p-2 text-emerald-700" title="Accept"><Check size={12} /></button><button type="button" onClick={() => onResolve(request.id, "rejected")} className="rounded-lg bg-red-50 p-2 text-red-600" title="Reject"><X size={12} /></button></>}</div>}</div></article>; })}
    {requests.length === 0 && <div className="rounded-2xl border border-dashed border-neutral-200 py-10 text-center text-[11px] text-neutral-400">No formal change requests.</div>}
  </div>;
}
