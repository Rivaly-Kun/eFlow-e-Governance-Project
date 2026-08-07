// ─── Admin Audit Log ─────────────────────────────────────────────
// Read-only view over the append-only audit_events table. Filters by actor,
// action, entity type, date, and entity id. The detail drawer shows a safe,
// redacted field-by-field before/after diff.

import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollText,
  Filter,
  X,
  User,
  Clock,
  ChevronRight,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  subscribeToAuditEvents,
  buildDiff,
  type AuditEvent,
  type DiffRow,
} from "../../services/auditService";
import {
  PageHeader,
  SearchInput,
  WSelect,
  SectionEmpty,
  LoadingState,
} from "../workflow/primitives";
import { InitialsAvatar } from "../workflow/StatusBadges";

const ACTION_TONE: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700",
  approved: "bg-emerald-50 text-emerald-700",
  updated: "bg-blue-50 text-blue-700",
  archived: "bg-neutral-100 text-neutral-600",
  rejected: "bg-rose-50 text-rose-700",
  reopened: "bg-amber-50 text-amber-700",
  published: "bg-violet-50 text-violet-700",
  moderated: "bg-rose-50 text-rose-700",
};

function toneFor(action: string): string {
  const key = Object.keys(ACTION_TONE).find((k) => action.includes(k));
  return key ? ACTION_TONE[key] : "bg-neutral-100 text-neutral-600";
}

function fullTime(ts: number): string {
  return new Date(ts).toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function AdminAuditLog() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [entityType, setEntityType] = useState("all");
  const [action, setAction] = useState("all");
  const [selected, setSelected] = useState<AuditEvent | null>(null);

  useEffect(() => {
    const unsub = subscribeToAuditEvents((e) => { setEvents(e); setLoading(false); }, { limit: 500 });
    return unsub;
  }, []);

  const entityTypes = useMemo(() => Array.from(new Set(events.map((e) => e.entityType))).sort(), [events]);
  const actions = useMemo(() => Array.from(new Set(events.map((e) => e.action))).sort(), [events]);

  const filtered = useMemo(() => {
    let rows = events;
    if (entityType !== "all") rows = rows.filter((e) => e.entityType === entityType);
    if (action !== "all") rows = rows.filter((e) => e.action === action);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((e) =>
        e.actorName.toLowerCase().includes(q) ||
        e.action.toLowerCase().includes(q) ||
        (e.entityId || "").toLowerCase().includes(q) ||
        (e.reason || "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [events, entityType, action, query]);

  if (loading) return <div className="p-8"><LoadingState label="Loading audit log…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow="Administration · Security"
        title="Audit Log"
        subtitle="Append-only record of every state-changing action across the system."
        actions={
          <div className="inline-flex items-center gap-1.5 bg-neutral-100 rounded-lg px-3 py-1.5 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600">
            <ShieldCheck size={14} /> {events.length} events
          </div>
        }
      />

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <SearchInput value={query} onChange={setQuery} placeholder="Search actor, action, entity, reason…" className="w-[280px]" />
        <WSelect value={entityType} onChange={setEntityType} options={[{ value: "all", label: "All entities" }, ...entityTypes.map((t) => ({ value: t, label: t }))]} />
        <WSelect value={action} onChange={setAction} options={[{ value: "all", label: "All actions" }, ...actions.map((a) => ({ value: a, label: a }))]} />
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <SectionEmpty icon={<ScrollText size={30} />} title="No audit events" description={events.length ? "No events match these filters." : "Audit events will appear here as users act on the system."} />
        </div>
      ) : (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="divide-y divide-neutral-100 max-h-[calc(100vh-240px)] overflow-y-auto">
            {filtered.map((e) => (
              <button key={e.id} onClick={() => setSelected(e)} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-neutral-50">
                <InitialsAvatar name={e.actorName} size={30} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{e.actorName}</span>
                    <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] rounded px-1.5 py-0.5 ${toneFor(e.action)}`}>{e.action}</span>
                    <span className="text-[11px] text-neutral-400">{e.entityType}</span>
                  </div>
                  {e.reason && <div className="text-[11.5px] text-neutral-500 truncate mt-0.5">“{e.reason}”</div>}
                </div>
                <span className="text-[10.5px] text-neutral-400 flex items-center gap-1 shrink-0"><Clock size={10} /> {fullTime(e.createdAt)}</span>
                <ChevronRight size={14} className="text-neutral-300 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && <AuditDetailDrawer event={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function AuditDetailDrawer({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  const diff: DiffRow[] = buildDiff(event.beforeData, event.afterData);

  const renderVal = (v: unknown) => {
    if (v === undefined || v === null || v === "") return <span className="text-neutral-300">—</span>;
    if (typeof v === "object") return <code className="text-[11px]">{JSON.stringify(v)}</code>;
    return String(v);
  };

  return (
    <>
      <div className="fixed inset-0 bg-neutral-900/25 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[460px] bg-white shadow-2xl z-50 flex flex-col animate-[slidein_0.25s_cubic-bezier(0.25,1.1,0.4,1)]">
        <div className="p-4 border-b border-neutral-100 flex items-start justify-between">
          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">Audit event</div>
            <h2 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">{event.action}</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-800 p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-2 text-[12.5px] font-['Lexend:Regular',_sans-serif]">
            <Row icon={<User size={13} />} label="Actor" value={event.actorName} />
            <Row icon={<Clock size={13} />} label="When" value={fullTime(event.createdAt)} />
            <Row icon={<ScrollText size={13} />} label="Entity" value={`${event.entityType}${event.entityId ? ` · ${event.entityId}` : ""}`} />
            {event.reason && <Row icon={<Filter size={13} />} label="Reason" value={event.reason} />}
          </div>

          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">Field changes</div>
            {diff.length === 0 ? (
              <div className="text-[12px] text-neutral-400">No before/after data recorded.</div>
            ) : (
              <div className="border border-neutral-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_auto_1fr] bg-neutral-50 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wide text-neutral-400">
                  <div className="px-3 py-1.5">Before</div>
                  <div className="px-1 py-1.5" />
                  <div className="px-3 py-1.5">After</div>
                </div>
                {diff.map((d) => (
                  <div key={d.key} className={`grid grid-cols-[1fr_auto_1fr] items-center border-t border-neutral-100 text-[12px] ${d.changed ? "bg-amber-50/30" : ""}`}>
                    <div className="px-3 py-2 min-w-0">
                      <div className="text-[9.5px] text-neutral-400 uppercase tracking-wide">{d.key}</div>
                      <div className="text-neutral-700 truncate">{renderVal(d.before)}</div>
                    </div>
                    <ArrowRight size={12} className={`mx-1 ${d.changed ? "text-amber-500" : "text-neutral-300"}`} />
                    <div className="px-3 py-2 min-w-0">
                      <div className="text-[9.5px] text-neutral-400 uppercase tracking-wide">{d.key}</div>
                      <div className={`truncate ${d.changed ? "text-neutral-900 font-['Lexend:Medium',_sans-serif]" : "text-neutral-700"}`}>{renderVal(d.after)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {event.metadata && (
            <div>
              <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">Metadata</div>
              <pre className="bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 text-[11px] text-neutral-600 overflow-x-auto">{JSON.stringify(event.metadata, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-neutral-400">{icon}</span>
      <span className="text-neutral-500 w-16 shrink-0">{label}</span>
      <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">{value}</span>
    </div>
  );
}
