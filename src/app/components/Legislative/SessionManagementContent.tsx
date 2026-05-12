import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  CheckmarkOutline,
  Warning,
  Download,
  Filter,
  Search,
  DocumentExport,
  View,
  Renew,
  Time,
  User,
  Analytics,
  ChevronDown,
  ChevronRight,
  Flag,
  Task,
  Report,
  DocumentAdd,
  Play,
  Send,
  Pending,
  Group,
  Microphone,
  StopFilled,
  Edit,
  Locked,
  Archive,
  Share,
  Add,
  Close,
  DragVertical,
  Save,
  Pause,
  Undo,
  Checkbox,
  CheckboxCheckedFilled,
  EventSchedule,
  ListChecked,
} from "@carbon/icons-react";


// ==================== SHARED ====================
const pillColors: Record<string, string> = {
  "LIVE SESSION ACTIVE": "bg-red-500 text-white animate-pulse",
  Completed: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Broadcasting: "bg-emerald-100 text-emerald-700 border border-emerald-300",
  "Up Next": "bg-blue-100 text-blue-700",
  Paused: "bg-yellow-100 text-yellow-700 border border-yellow-300",
  Deferred: "bg-amber-100 text-amber-700",
  Done: "bg-emerald-100 text-emerald-700",
  Skipped: "bg-neutral-100 text-neutral-500",
  Published: "bg-emerald-100 text-emerald-700",
  Draft: "bg-amber-100 text-amber-700",
  "AI Generated": "bg-blue-100 text-blue-700",
  Finalized: "bg-emerald-100 text-emerald-700",
  "Unfinished Business": "bg-orange-100 text-orange-700",
};

function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] whitespace-nowrap ${pillColors[status] || "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Sangguniang Panlungsod · Ormoc City"}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Btn({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success" | "live" }) {
  const s: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
    live: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
  };
  return (
    <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${s[variant]}`}>
      {icon}{label}
    </button>
  );
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat" }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex-1 min-w-[155px]">
      <p className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-1">{value}</p>
      {sub && (
        <p className={`text-[11px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-neutral-500"}`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </p>
      )}
    </div>
  );
}

// ==================== BROADCAST HISTORY ====================
interface BroadcastEvent {
  id: number;
  itemId: number;
  itemTitle: string;
  itemRef?: string;
  action: "broadcast" | "paused" | "resumed" | "concluded" | "suspended" | "session_resumed" | "adjourned" | "undo_adjourn";
  timestamp: string;
}

function getCurrentTimestamp(): string {
  const now = new Date();
  return now.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

const actionStyles: Record<BroadcastEvent["action"], { color: string; bg: string; border: string; icon: string; label: string }> = {
  broadcast: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "📡", label: "Broadcast" },
  paused: { color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", icon: "⏸", label: "Paused" },
  resumed: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", icon: "▶️", label: "Resumed" },
  concluded: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "✓", label: "Concluded" },
  suspended: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", icon: "⏸", label: "Session Suspended" },
  session_resumed: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "▶️", label: "Session Resumed" },
  adjourned: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", icon: "🛑", label: "Session Adjourned" },
  undo_adjourn: { color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: "↩️", label: "Adjournment Undone" },
};

// ==================== AUDIT TIMELINE COMPONENT ====================
function BroadcastTimeline({ events, isCollapsed, onToggle }: { events: BroadcastEvent[]; isCollapsed: boolean; onToggle: () => void }) {
  if (events.length === 0) return null;

  // Group consecutive events by itemId to show flow
  const recentEvents = events.slice(-30); // show last 30 events

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mt-5">
      <button
        onClick={onToggle}
        className="w-full px-5 py-3 flex items-center gap-3 border-b border-neutral-100 cursor-pointer hover:bg-neutral-50/50 transition-colors"
      >
        <EventSchedule size={16} className="text-slate-600" />
        <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Broadcast Audit Trail</span>
        <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-slate-100 text-slate-600 rounded-full px-2 py-0.5">{events.length} events</span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Real-time session activity log</span>
          {isCollapsed ? <ChevronRight size={14} className="text-neutral-400" /> : <ChevronDown size={14} className="text-neutral-400" />}
        </div>
      </button>
      {!isCollapsed && (
        <div className="px-5 py-4 max-h-[320px] overflow-y-auto">
          <div className="relative">
            {/* Vertical timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-neutral-200" />
            <div className="space-y-0">
              {recentEvents.map((event, idx) => {
                const style = actionStyles[event.action];
                const isSessionLevel = ["suspended", "session_resumed", "adjourned", "undo_adjourn"].includes(event.action);
                return (
                  <div key={event.id} className="flex items-start gap-3 relative group">
                    {/* Timeline dot */}
                    <div className={`w-[23px] h-[23px] rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center text-[10px] z-10 shrink-0 mt-1`}>
                      {style.icon}
                    </div>
                    {/* Content */}
                    <div className={`flex-1 py-1.5 ${idx < recentEvents.length - 1 ? "border-b border-neutral-50" : ""}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-['Lexend:SemiBold',_sans-serif] ${style.color} uppercase tracking-wide`}>{style.label}</span>
                        <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-neutral-400">{event.timestamp}</span>
                      </div>
                      {isSessionLevel ? (
                        <p className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mt-0.5">
                          {event.action === "suspended" ? "Session recessed by Presiding Officer" :
                           event.action === "session_resumed" ? "Session resumed from recess" :
                           event.action === "adjourned" ? "Session officially adjourned" :
                           "Adjournment reversed — session restored"}
                        </p>
                      ) : (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{event.itemTitle}</span>
                          {event.itemRef && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-blue-500">{event.itemRef}</span>}
                        </div>
                      )}
                    </div>
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

// ==================== BATCH CONCLUDE MODAL ====================
function BatchConcludeModal({
  items,
  groupName,
  onConfirm,
  onCancel,
}: {
  items: AgendaItem[];
  groupName: string;
  onConfirm: (ids: number[]) => void;
  onCancel: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(items.map(i => i.id)));

  const toggleId = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-emerald-600 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <ListChecked size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-white">Batch Conclude Items</h3>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-emerald-100 mt-0.5">{groupName}</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-3">
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
            Select items to mark as officially concluded. This is typically used for procedural items (Roll Call, Approval of Minutes, etc.) that have clearly finished.
          </p>
          
          {/* Select All */}
          <button onClick={toggleAll} className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer">
            {selectedIds.size === items.length
              ? <CheckboxCheckedFilled size={18} className="text-emerald-600" />
              : <Checkbox size={18} className="text-neutral-400" />}
            <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">Select All ({items.length})</span>
          </button>
          
          <div className="border-t border-neutral-100" />
          
          {/* Item list */}
          <div className="max-h-[240px] overflow-y-auto space-y-1">
            {items.map(item => (
              <button
                key={item.id}
                onClick={() => toggleId(item.id)}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg hover:bg-neutral-50 transition-colors cursor-pointer text-left"
              >
                {selectedIds.has(item.id)
                  ? <CheckboxCheckedFilled size={18} className="text-emerald-600 shrink-0" />
                  : <Checkbox size={18} className="text-neutral-300 shrink-0" />}
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 block truncate">{item.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {item.ref && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-blue-500">{item.ref}</span>}
                    <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{item.type}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-['Lexend:Medium',_sans-serif] px-2 py-0.5 rounded-full ${
                  item.status === "broadcasting" ? "bg-emerald-100 text-emerald-700" :
                  item.status === "paused" ? "bg-yellow-100 text-yellow-700" :
                  "bg-neutral-100 text-neutral-500"
                }`}>
                  {item.status === "broadcasting" ? "On Floor" : item.status === "paused" ? "Paused" : "Pending"}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-600 bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(Array.from(selectedIds))}
            disabled={selectedIds.size === 0}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] transition-colors ${
              selectedIds.size > 0
                ? "bg-emerald-600 text-white cursor-pointer hover:bg-emerald-700 shadow-md shadow-emerald-200"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            <CheckmarkOutline size={14} /> Conclude {selectedIds.size} Item{selectedIds.size !== 1 ? "s" : ""}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== END-OF-SESSION CHECKLIST ====================
function EndOfSessionChecklist({
  pausedItems,
  pendingItems,
  broadcastingItem,
  onProceed,
  onCancel,
  formatTime,
}: {
  pausedItems: AgendaItem[];
  pendingItems: AgendaItem[];
  broadcastingItem: AgendaItem | null;
  onProceed: () => void;
  onCancel: () => void;
  formatTime: (id: number) => string;
}) {
  const hasIssues = pausedItems.length > 0 || broadcastingItem !== null;

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[520px] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={`px-6 py-4 flex items-center gap-3 ${hasIssues ? "bg-amber-500" : "bg-emerald-600"}`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            {hasIssues ? <Warning size={20} className="text-white" /> : <CheckmarkOutline size={20} className="text-white" />}
          </div>
          <div>
            <h3 className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-white">
              {hasIssues ? "Pre-Adjournment Checklist" : "Session Ready for Adjournment"}
            </h3>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-white/80 mt-0.5">
              {hasIssues ? "Review incomplete items before proceeding" : "All active items have been resolved"}
            </p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Broadcasting item warning */}
          {broadcastingItem && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700 uppercase tracking-wide">Currently Broadcasting</span>
              </div>
              <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{broadcastingItem.title}</p>
              <div className="flex items-center gap-2 mt-1">
                {broadcastingItem.ref && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-emerald-600">{broadcastingItem.ref}</span>}
                <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-emerald-600">⏱ {formatTime(broadcastingItem.id)}</span>
              </div>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-amber-700 mt-2 bg-amber-50 rounded-lg px-2 py-1 border border-amber-200">
                ⚠️ This item is still on floor. It will be auto-deferred if you adjourn.
              </p>
            </div>
          )}

          {/* Paused items */}
          {pausedItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2">
                <Pause size={14} className="text-yellow-600" />
                <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-yellow-700 uppercase tracking-wide">
                  {pausedItems.length} Paused Item{pausedItems.length !== 1 ? "s" : ""} — Timer Frozen
                </span>
              </div>
              <div className="space-y-2">
                {pausedItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-yellow-100">
                    <Pause size={12} className="text-yellow-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 block truncate">{item.title}</span>
                      {item.ref && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-blue-500">{item.ref}</span>}
                    </div>
                    <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-yellow-600 tabular-nums shrink-0">⏱ {formatTime(item.id)}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-yellow-700 mt-2">
                These items were paused mid-debate. Adjourning will defer them as Unfinished Business for the next session.
              </p>
            </div>
          )}

          {/* Pending items count */}
          {pendingItems.length > 0 && (
            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">
                📋 {pendingItems.length} pending item{pendingItems.length !== 1 ? "s" : ""} not yet reached — will be auto-deferred
              </span>
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-700">
              {hasIssues
                ? "⚠️ Proceeding will trigger the Adjourn Friction Modal. All paused and pending items will be moved to Unfinished Business."
                : "✅ No items are currently broadcasting or paused. You may proceed safely."}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-600 bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            Go Back — Review Items
          </button>
          <button
            onClick={onProceed}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer transition-colors shadow-md ${
              hasIssues
                ? "bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200"
                : "bg-red-600 text-white hover:bg-red-700 shadow-red-200"
            }`}
          >
            <StopFilled size={14} /> Proceed to Adjourn
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== MOCK DATA ====================

interface AgendaItem {
  id: number;
  title: string;
  type: string;
  ref?: string;
  author?: string;
  status: "done" | "broadcasting" | "pending" | "deferred" | "paused";
  group: string;
  duration?: string;
}

const agendaItems: AgendaItem[] = [
  // Preliminary Matters
  { id: 1, title: "Call to Order", type: "Procedural", status: "done", group: "Preliminary Matters", duration: "2 min" },
  { id: 2, title: "Roll Call & Determination of Quorum", type: "Procedural", status: "done", group: "Preliminary Matters", duration: "3 min" },
  { id: 3, title: "Approval of Minutes — 141st Regular Session", type: "Procedural", ref: "MIN-2026-141", status: "done", group: "Preliminary Matters", duration: "5 min" },
  // Reference of Business
  { id: 4, title: "ORD-2026-046: Digital Governance and eFlow Implementation Fund", type: "First Reading", ref: "ORD-2026-046", author: "Hon. B. Navarro", status: "broadcasting", group: "Reference of Business (First Readings)" },
  { id: 5, title: "RES-2026-019: Commending the Ormoc City Fire Department", type: "First Reading", ref: "RES-2026-019", author: "Hon. A. Reyes", status: "pending", group: "Reference of Business (First Readings)" },
  { id: 6, title: "ORD-2026-047: City-Wide CCTV Surveillance Network", type: "First Reading", ref: "ORD-2026-047", author: "Hon. P. Garcia", status: "pending", group: "Reference of Business (First Readings)" },
  { id: 7, title: "RES-2026-020: Urging DPWH — Ormoc-Kananga Road Widening", type: "First Reading", ref: "RES-2026-020", author: "Hon. R. Almario", status: "pending", group: "Reference of Business (First Readings)" },
  // Committee Reports
  { id: 8, title: "Committee Report: Favorable — ORD-2026-044 Marine Litter Interception", type: "Committee Report", ref: "CR-2026-017", author: "Committee on Appropriations", status: "pending", group: "Committee Reports" },
  // Second Reading
  { id: 9, title: "ORD-2026-044: Marine Litter Interception Program (Amended)", type: "Second Reading", ref: "ORD-2026-044", author: "Hon. L. Santos", status: "pending", group: "Second Reading (Floor Debate)" },
  // Third Reading
  { id: 10, title: "ORD-2026-043: Regulating Single-Use Plastics", type: "Third Reading", ref: "ORD-2026-043", author: "Hon. M. Delgado", status: "pending", group: "Third Reading (Final Vote)" },
  // Unfinished Business
  { id: 11, title: "ORD-2026-041: Barangay Disaster Preparedness Training (Deferred from 141st)", type: "Unfinished Business", ref: "ORD-2026-041", status: "deferred", group: "Unfinished Business" },
  // Closing
  { id: 12, title: "Privilege Speeches", type: "Procedural", status: "pending", group: "Closing Matters" },
  { id: 13, title: "Adjournment", type: "Procedural", status: "pending", group: "Closing Matters" },
];

const groupOrder = [
  "Preliminary Matters",
  "Reference of Business (First Readings)",
  "Committee Reports",
  "Second Reading (Floor Debate)",
  "Third Reading (Final Vote)",
  "Unfinished Business",
  "Closing Matters",
];

const groupColors: Record<string, string> = {
  "Preliminary Matters": "#94A3B8",
  "Reference of Business (First Readings)": "#3B82F6",
  "Committee Reports": "#8B5CF6",
  "Second Reading (Floor Debate)": "#F59E0B",
  "Third Reading (Final Vote)": "#F97316",
  "Unfinished Business": "#EF4444",
  "Closing Matters": "#6B7280",
};

// Transcript data
interface TranscriptEntry {
  id: number;
  speaker: string;
  initials: string;
  role: string;
  text: string;
  timestamp: string;
  isOfficial?: boolean;
  editedBySecretariat?: boolean;
}

const liveTranscript: TranscriptEntry[] = [
  { id: 1, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "The 142nd Regular Session of the Sangguniang Panlungsod ng Ormoc City is hereby called to order. Madam Secretary, kindly call the roll.", timestamp: "10:00:12" },
  { id: 2, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "Thank you, Your Honor. Calling the roll… Hon. Almario?", timestamp: "10:00:28" },
  { id: 3, speaker: "Hon. R. Almario", initials: "RA", role: "Councilor", text: "Present.", timestamp: "10:00:35" },
  { id: 4, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "Hon. Delgado?", timestamp: "10:00:37" },
  { id: 5, speaker: "Hon. M. Delgado", initials: "MD", role: "Councilor", text: "Present.", timestamp: "10:00:39" },
  { id: 6, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "Your Honor, all 12 members are present. We have a quorum.", timestamp: "10:01:15" },
  { id: 7, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "Very well. The Chair recognizes the presence of a quorum. We shall now proceed to the approval of the minutes from the 141st Regular Session. Are there any corrections or amendments? Hearing none, the minutes are deemed approved.", timestamp: "10:01:32" },
  { id: 8, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "We now move to the Reference of Business. Madam Secretary, please read the first measure.", timestamp: "10:04:55" },
  { id: 9, speaker: "Sec. A. Mendoza", initials: "AM", role: "SP Secretary", text: "First measure: Proposed Ordinance Number 2026-046, authored by Honorable B. Navarro, entitled — An Ordinance Creating the Ormoc City Digital Governance and eFlow Implementation Fund, appropriating Eight Million Pesos therefor.", timestamp: "10:05:08" },
  { id: 10, speaker: "Hon. B. Navarro", initials: "BN", role: "Councilor", text: "Mr. Presiding Officer, I respectfully move that Proposed Ordinance 2026-046 be referred to the Committee on Appropriations and the Committee on Good Government for joint deliberation.", timestamp: "10:05:42" },
  { id: 11, speaker: "Hon. L. Santos", initials: "LS", role: "Councilor", text: "I second the motion, Your Honor.", timestamp: "10:05:58" },
  { id: 12, speaker: "Vice Mayor F. Reyes", initials: "FR", role: "Presiding Officer", text: "It has been moved and duly seconded. Is there any objection? Hearing none, the motion is approved. ORD-2026-046 is hereby referred to the Committee on Appropriations and the Committee on Good Government.", timestamp: "10:06:05", isOfficial: true },
];

// Session summaries
const sessionSummaries = [
  {
    id: "SUM-142",
    session: "142nd Regular Session",
    date: "2026-04-16",
    status: "AI Generated" as const,
    duration: "3h 42m",
    motionsPassed: [
      "Referral of ORD-2026-046 (eFlow Fund) to Committee on Appropriations",
      "Referral of RES-2026-019 (Fire Dept. Commendation) to Committee on Good Government",
      "Referral of ORD-2026-047 (CCTV Network) to Committee on Public Safety",
      "Committee Report CR-2026-017 received and noted (Favorable for Marine Litter Interception)",
      "ORD-2026-044 (Marine Litter) passed on Second Reading with 3 amendments",
      "ORD-2026-043 (Single-Use Plastics) passed on Third Reading — Vote: 9-2-1",
    ],
    measuresDeferred: [
      "ORD-2026-041 (Barangay Disaster Preparedness) — deferred to 143rd Session due to pending DILG consultation",
    ],
    keyDebates: [
      { topic: "Marine Litter Appropriation Increase", summary: "Hon. Santos proposed increasing appropriation from ₱5M to ₱7.5M to cover Ormoc Bay coastal operations. Hon. Cruz raised fiscal concerns citing Q2 revenue shortfall. Motion to increase carried 8-3-1.", dissenting: "Hon. Cruz, Hon. Ong, Hon. Tan" },
      { topic: "CCTV Surveillance Privacy Concerns", summary: "Hon. Lim raised concerns about civil liberties and data retention periods. Requested the inclusion of a data destruction clause in committee deliberations.", dissenting: "Motion to defer was defeated 4-7-1" },
    ],
    attendees: 12,
    totalAttendees: 12,
  },
  {
    id: "SUM-141",
    session: "141st Regular Session",
    date: "2026-04-09",
    status: "Finalized" as const,
    duration: "4h 15m",
    motionsPassed: [
      "ORD-2026-042 (Sustainable Tourism & Eco-Park) passed on Third Reading — Vote: 9-2-1",
      "Referral of ORD-2026-048 (Disaster Preparedness) to Committee on Public Safety",
    ],
    measuresDeferred: [
      "ORD-2026-041 (Barangay Disaster Preparedness) — deferred pending DILG input",
    ],
    keyDebates: [
      { topic: "Eco-Park Budget Allocation", summary: "Extended debate on the ₱450M multi-year commitment. Committee on Appropriations presented fiscal impact assessment. AI NPV analysis cited favorably by the Committee Chair.", dissenting: "Hon. Cruz (fiscal concerns), Hon. Ong (timeline concerns)" },
    ],
    attendees: 12,
    totalAttendees: 12,
  },
];

// Archived sessions for search
const archivedSessions = [
  { session: "140th", date: "2026-04-02", measures: 8, duration: "3h 18m" },
  { session: "139th", date: "2026-03-26", measures: 6, duration: "2h 55m" },
  { session: "138th", date: "2026-03-19", measures: 11, duration: "4h 42m" },
  { session: "137th", date: "2026-03-12", measures: 7, duration: "3h 05m" },
  { session: "136th", date: "2026-03-05", measures: 9, duration: "3h 38m" },
  { session: "135th", date: "2026-02-26", measures: 5, duration: "2h 20m" },
];

// ==================== ORDER OF BUSINESS ====================

// Councilor data for dropdowns
const councilorAvatars = [
  { name: "Hon. R. Almario", initials: "RA" },
  { name: "Hon. M. Delgado", initials: "MD" },
  { name: "Hon. L. Santos", initials: "LS" },
  { name: "Hon. C. Torres", initials: "CT" },
  { name: "Hon. J. Cruz", initials: "JC" },
  { name: "Hon. B. Navarro", initials: "BN" },
  { name: "Hon. A. Reyes", initials: "AR" },
  { name: "Hon. P. Garcia", initials: "PG" },
  { name: "Hon. E. Lim", initials: "EL" },
  { name: "Hon. D. Fernandez", initials: "DF" },
  { name: "Hon. S. Ong", initials: "SO" },
  { name: "Hon. G. Tan", initials: "GT" },
];

const drawerItemTypes = ["Procedural", "First Reading", "Committee Report", "Second Reading", "Third Reading", "Unfinished Business", "Privilege Speech", "Resolution"];

// Per-item accumulated timer system — tracks elapsed seconds per item, resumes on re-broadcast
function useItemTimers(items: AgendaItem[], sessionActive: boolean) {
  // accumulated[id] = total seconds this item has been on floor across all broadcast windows
  const [accumulated, setAccumulated] = useState<Record<number, number>>({});
  const intervalRef = useRef<number | null>(null);

  // Find the currently broadcasting item
  const broadcastingId = items.find(i => i.status === "broadcasting")?.id ?? null;

  useEffect(() => {
    if (broadcastingId !== null && sessionActive) {
      intervalRef.current = window.setInterval(() => {
        setAccumulated(prev => ({
          ...prev,
          [broadcastingId]: (prev[broadcastingId] || 0) + 1,
        }));
      }, 1000);
    } else {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [broadcastingId, sessionActive]);

  const formatTime = (id: number) => {
    const secs = accumulated[id] || 0;
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  };

  return { accumulated, formatTime, broadcastingId };
}

// Interruption Warning Modal — fires when switching broadcast while another item is still active/paused
function InterruptionWarningModal({
  currentItem,
  targetItem,
  currentElapsed,
  onConfirm,
  onCancel,
}: {
  currentItem: AgendaItem;
  targetItem: AgendaItem;
  currentElapsed: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[440px] overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="bg-amber-500 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Warning size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-white">Active Item on Floor</h3>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-amber-100 mt-0.5">Broadcast interruption detected</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {/* Current item */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700 uppercase tracking-wide mb-1">Currently on Floor</p>
            <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{currentItem.title}</p>
            <div className="flex items-center gap-2 mt-1">
              {currentItem.ref && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-emerald-600">{currentItem.ref}</span>}
              <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-emerald-600">⏱ {currentElapsed}</span>
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center">
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              ↓ will be paused and replaced by ↓
            </div>
          </div>

          {/* Target item */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <p className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-blue-700 uppercase tracking-wide mb-1">Switch Broadcast To</p>
            <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{targetItem.title}</p>
            {targetItem.ref && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-blue-600 mt-1 block">{targetItem.ref}</span>}
          </div>

          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
            The current item will be <strong className="text-yellow-700">paused</strong> (not concluded). Its timer will freeze and can be resumed later.
          </p>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-600 bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            Cancel — Keep Current
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] bg-amber-500 text-white cursor-pointer hover:bg-amber-600 transition-colors shadow-md shadow-amber-200"
          >
            <Play size={14} /> Switch Broadcast
          </button>
        </div>
      </div>
    </div>
  );
}

// Draggable Agenda Row (native HTML5 drag)
function DraggableAgendaRow({
  item,
  globalIndex,
  moveItem,
  isLive,
  sessionState,
  isBroadcasting,
  isPaused,
  isDone,
  isDeferred,
  onBroadcast,
  onConclude,
  onUpdateTitle,
  itemElapsed,
  draggedIdx,
  setDraggedIdx,
}: {
  item: AgendaItem;
  globalIndex: number;
  moveItem: (fromGlobal: number, toGlobal: number) => void;
  isLive: boolean;
  sessionState: SessionState;
  isBroadcasting: boolean;
  isPaused: boolean;
  isDone: boolean;
  isDeferred: boolean;
  onBroadcast: () => void;
  onConclude: () => void;
  onUpdateTitle: (newTitle: string) => void;
  itemElapsed: string;
  draggedIdx: number | null;
  setDraggedIdx: (idx: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(item.title);
  const [isOver, setIsOver] = useState(false);
  const isDragging = draggedIdx === globalIndex;
  const isSuspended = sessionState === "suspended";

  const handleDoubleClick = useCallback(() => {
    if (sessionState === "pre" && !isDone) {
      setIsEditingTitle(true);
      setEditTitle(item.title);
    }
  }, [sessionState, isDone, item.title]);

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== item.title) {
      onUpdateTitle(editTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <div
      ref={ref}
      draggable={sessionState === "pre"}
      onDragStart={(e) => {
        if (sessionState !== "pre") { e.preventDefault(); return; }
        setDraggedIdx(globalIndex);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e) => {
        if (sessionState !== "pre") return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        if (draggedIdx !== null && draggedIdx !== globalIndex) {
          moveItem(draggedIdx, globalIndex);
        }
        setDraggedIdx(null);
      }}
      onDragEnd={() => { setDraggedIdx(null); setIsOver(false); }}
      className={`flex items-center gap-3 px-5 py-3.5 border-b last:border-b-0 transition-all duration-300 ${
        isDragging ? "opacity-40" : "opacity-100"
      } ${
        isOver && !isLive ? "bg-blue-50 border-b-blue-100" : ""
      } ${
        isBroadcasting ? "bg-emerald-50/70 border-l-4 border-l-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.08)]" :
        isPaused ? "bg-yellow-50/50 border-l-4 border-l-yellow-400" :
        isDone ? "bg-neutral-50/30 border-b-neutral-50" :
        isDeferred ? "bg-orange-50/30 border-b-orange-50" :
        "border-b-neutral-50 hover:bg-blue-50/20"
      }`}
    >
      {/* Drag grip — only visible pre-session */}
      {sessionState === "pre" && (
        <div
          className="cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-500 transition-colors shrink-0"
          title="Drag to reorder"
        >
          <DragVertical size={16} />
        </div>
      )}

      {/* Item number */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[12px] font-['Lexend:SemiBold',_sans-serif] shrink-0 ${
        isDone ? "bg-emerald-100 text-emerald-700" :
        isBroadcasting ? "bg-emerald-500 text-white" :
        isPaused ? "bg-yellow-100 text-yellow-700" :
        isDeferred ? "bg-orange-100 text-orange-700" :
        "bg-neutral-100 text-neutral-600"
      }`}>
        {isDone ? <CheckmarkOutline size={14} /> : isPaused ? <Pause size={14} /> : item.id}
      </div>

      {/* Content — inline editable */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 flex-1">
              <input
                type="text"
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleTitleSave(); if (e.key === "Escape") setIsEditingTitle(false); }}
                onBlur={handleTitleSave}
                className="flex-1 px-2 py-1 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 border border-blue-300 rounded-lg outline-none bg-blue-50/50"
              />
              <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400 whitespace-nowrap">Enter to save · Esc to cancel</span>
            </div>
          ) : (
            <span
              className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${isDone ? "text-neutral-500 line-through" : "text-neutral-900"} ${sessionState === "pre" && !isDone ? "cursor-text hover:bg-blue-50/50 hover:px-1 hover:rounded transition-all" : ""}`}
              onDoubleClick={handleDoubleClick}
              title={sessionState === "pre" && !isDone ? "Double-click to edit" : undefined}
            >
              {item.title}
            </span>
          )}
          {isBroadcasting && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500 text-white text-[9px] font-['Lexend:SemiBold',_sans-serif]">
              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> ON FLOOR
            </span>
          )}
          {isPaused && (
            <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-400 text-yellow-900 text-[9px] font-['Lexend:SemiBold',_sans-serif]">
              <Pause size={10} /> PAUSED
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {item.ref && <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-blue-500">{item.ref}</span>}
          {item.author && <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{item.author}</span>}
          {item.duration && <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">~{item.duration}</span>}
          {(isBroadcasting || isPaused) && (
            <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] ml-2 tabular-nums ${isBroadcasting ? "text-emerald-600" : "text-yellow-600"}`}>
              ⏱ {itemElapsed}{isPaused ? " (paused)" : ""}
            </span>
          )}
        </div>
      </div>

      {/* Status/Type */}
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-neutral-50 text-neutral-500 rounded-full px-2 py-0.5 border border-neutral-100">{item.type}</span>
      </div>

      {/* Action zone — View State decoupled from Completion State */}
      <div className="shrink-0 flex items-center gap-2">
        {/* Pending items: show Broadcast button (only when live, not done/deferred) */}
        {isLive && !isDone && !isBroadcasting && !isPaused && !isDeferred && (
          <button
            onClick={onBroadcast}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-[11px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-emerald-700 transition-colors shadow-sm"
          >
            <Play size={12} /> Broadcast to Floor
          </button>
        )}

        {/* Paused items: show Resume + Conclude */}
        {isLive && isPaused && (
          <div className="flex items-center gap-2">
            <button
              onClick={onBroadcast}
              className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white rounded-lg text-[11px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-yellow-600 transition-colors shadow-sm"
            >
              <Play size={12} /> Resume
            </button>
            <button
              onClick={onConclude}
              className="flex items-center gap-1 px-2.5 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-emerald-700 transition-colors"
            >
              <CheckmarkOutline size={12} /> Conclude Item
            </button>
            <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-yellow-600 tabular-nums">{itemElapsed}</span>
          </div>
        )}

        {/* Broadcasting items: show LIVE indicator + Conclude */}
        {isBroadcasting && (
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-100 border-2 border-emerald-400"
              style={{ boxShadow: "0 0 12px rgba(16,185,129,0.25)" }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700">LIVE</span>
              <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-emerald-600 tabular-nums">{itemElapsed}</span>
            </div>
            <button
              onClick={onConclude}
              className="flex items-center gap-1 px-2.5 py-2 bg-emerald-600 text-white rounded-lg text-[10px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <CheckmarkOutline size={12} /> Conclude Item
            </button>
          </div>
        )}

        {/* Done items */}
        {isDone && (isLive || isSuspended) && (
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-emerald-500">✓ Concluded · {itemElapsed}</span>
        )}
        {isDone && !isLive && !isSuspended && (
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-emerald-500">✓ Done</span>
        )}
        {isDeferred && (
          <Pill status="Unfinished Business" />
        )}
        {!isLive && isPaused && (
          <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-yellow-600">
            ⏸ Paused · {itemElapsed}
          </span>
        )}
        {!isLive && !isDone && !isDeferred && !isPaused && (
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-300 italic">
            {sessionState === "suspended" ? "⏸ Recessed" : sessionState === "grace" || sessionState === "adjourned" ? "Adjourned" : "Pre-session"}
          </span>
        )}
      </div>
    </div>
  );
}

// Session states: "pre" = not started, "live" = active, "suspended" = recessed, "adjourned" = ended, "grace" = undo window
type SessionState = "pre" | "live" | "suspended" | "adjourned" | "grace";

function AdjournFrictionModal({
  pendingCount,
  pendingItems,
  sessionLabel,
  onConfirm,
  onCancel,
}: {
  pendingCount: number;
  pendingItems: AgendaItem[];
  sessionLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [typedText, setTypedText] = useState("");
  const isUnlocked = typedText.toUpperCase() === "ADJOURN";

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-[480px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Red header */}
        <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Warning size={20} className="text-white" />
          </div>
          <div>
            <h3 className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-white">Destructive Action — Confirm Adjournment</h3>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-100 mt-0.5">This action triggers the BPA Auto-Deferral Engine</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-amber-900">
              ⚠️ You are about to officially adjourn the <strong>{sessionLabel}</strong>.
            </p>
            {pendingCount > 0 && (
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-amber-800 mt-2">
                You have <strong className="text-red-700">{pendingCount} pending item{pendingCount !== 1 ? "s" : ""}</strong>. If you proceed, these items will be <strong>permanently moved to Unfinished Business</strong> for the next session.
              </p>
            )}
            {pendingCount === 0 && (
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-amber-800 mt-2">
                All agenda items have been concluded. The session record will be sealed.
              </p>
            )}
          </div>

          {/* Items that will be deferred */}
          {pendingCount > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-3 max-h-[120px] overflow-y-auto">
              <p className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-red-700 uppercase tracking-wide mb-2">Items to be auto-deferred:</p>
              <div className="space-y-1">
                {pendingItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-[11px] font-['Lexend:Regular',_sans-serif] text-red-800">
                    <span className="text-red-400">→</span>
                    <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-red-500">{item.ref || "—"}</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Type-to-confirm lock */}
          <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50">
            <p className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-2">
              To confirm, type <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] bg-neutral-200 px-1.5 py-0.5 rounded text-red-700 text-[12px]">ADJOURN</span> below:
            </p>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder="Type ADJOURN to unlock…"
              autoFocus
              className="w-full px-3 py-2.5 rounded-lg border-2 text-[14px] font-['JetBrains_Mono',_'Fira_Code',_monospace] text-center tracking-[0.2em] outline-none transition-colors placeholder:text-neutral-300 placeholder:tracking-normal placeholder:font-['Lexend:Regular',_sans-serif] placeholder:text-[12px]"
              style={{
                borderColor: typedText === "" ? "#e5e7eb" : isUnlocked ? "#10b981" : "#ef4444",
                backgroundColor: isUnlocked ? "#ecfdf5" : "white",
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center gap-3 bg-neutral-50/50">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600 bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            Cancel — Keep Session Live
          </button>
          <button
            onClick={onConfirm}
            disabled={!isUnlocked}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] transition-all ${
              isUnlocked
                ? "bg-red-600 text-white cursor-pointer hover:bg-red-700 shadow-md shadow-red-200"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            <StopFilled size={14} /> Confirm Adjournment
          </button>
        </div>
      </div>
    </div>
  );
}

function GracePeriodBanner({
  secondsLeft,
  onUndo,
  deferredCount,
}: {
  secondsLeft: number;
  onUndo: () => void;
  deferredCount: number;
}) {
  const minutes = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;
  const pct = (secondsLeft / 300) * 100;
  const isUrgent = secondsLeft <= 60;

  return (
    <div className={`border rounded-xl p-4 mb-5 transition-colors ${isUrgent ? "bg-red-50 border-red-300" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isUrgent ? "bg-red-100" : "bg-amber-100"}`}>
          <Undo size={20} className={isUrgent ? "text-red-600" : "text-amber-700"} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-[13px] font-['Lexend:SemiBold',_sans-serif] ${isUrgent ? "text-red-800" : "text-amber-800"}`}>
              Session Adjourned — Grace Period Active
            </span>
            <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[14px] tabular-nums px-2 py-0.5 rounded-md ${
              isUrgent ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
            }`}>
              {minutes}:{secs.toString().padStart(2, "0")}
            </span>
          </div>
          <p className={`text-[11px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${isUrgent ? "text-red-700" : "text-amber-700"}`}>
            {deferredCount} item{deferredCount !== 1 ? "s were" : " was"} moved to Unfinished Business.{" "}
            {isUrgent
              ? "Less than 1 minute remaining — act now!"
              : "Click Undo to reverse the adjournment and restore all items."}
          </p>
          {/* Progress bar */}
          <div className="mt-2 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isUrgent ? "bg-red-500" : "bg-amber-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <button
          onClick={onUndo}
          className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-emerald-400 text-emerald-700 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-emerald-50 transition-colors shadow-sm shrink-0"
        >
          <Undo size={14} /> Undo Adjournment
        </button>
      </div>
    </div>
  );
}

function OrderOfBusiness() {
  const [items, setItems] = useState(agendaItems);
  const [sessionState, setSessionState] = useState<SessionState>("live");
  const [broadcastId, setBroadcastId] = useState<number | null>(4);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [flashId, setFlashId] = useState<number | null>(null);

  // Fail-safe state
  const [showAdjournModal, setShowAdjournModal] = useState(false);
  const [graceSecondsLeft, setGraceSecondsLeft] = useState(300);
  const graceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoDeferredRef = useRef<{ id: number; originalGroup: string; originalStatus: AgendaItem["status"] }[]>([]);
  const preAdjournItemsRef = useRef<AgendaItem[]>([]);
  const preSuspendBroadcastRef = useRef<number | null>(null);

  // Drawer form state
  const [drawerType, setDrawerType] = useState("First Reading");
  const [drawerRef, setDrawerRef] = useState("");
  const [drawerTitle, setDrawerTitle] = useState("");
  const [drawerSponsor, setDrawerSponsor] = useState("");
  const [drawerDuration, setDrawerDuration] = useState("15 mins");
  const [drawerGroup, setDrawerGroup] = useState("Reference of Business (First Readings)");
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  // Interruption modal state
  const [interruptTarget, setInterruptTarget] = useState<number | null>(null);

  // Broadcast audit trail
  const [broadcastHistory, setBroadcastHistory] = useState<BroadcastEvent[]>([
    { id: 1, itemId: 1, itemTitle: "Call to Order", action: "broadcast", timestamp: "10:00:00" },
    { id: 2, itemId: 1, itemTitle: "Call to Order", action: "concluded", timestamp: "10:02:12" },
    { id: 3, itemId: 2, itemTitle: "Roll Call & Determination of Quorum", itemRef: undefined, action: "broadcast", timestamp: "10:02:15" },
    { id: 4, itemId: 2, itemTitle: "Roll Call & Determination of Quorum", action: "concluded", timestamp: "10:05:08" },
    { id: 5, itemId: 3, itemTitle: "Approval of Minutes — 141st Regular Session", itemRef: "MIN-2026-141", action: "broadcast", timestamp: "10:05:12" },
    { id: 6, itemId: 3, itemTitle: "Approval of Minutes — 141st Regular Session", itemRef: "MIN-2026-141", action: "concluded", timestamp: "10:10:05" },
    { id: 7, itemId: 4, itemTitle: "ORD-2026-046: Digital Governance and eFlow Implementation Fund", itemRef: "ORD-2026-046", action: "broadcast", timestamp: "10:10:08" },
  ]);
  const [timelineCollapsed, setTimelineCollapsed] = useState(true);
  const eventIdRef = useRef(8);

  // Batch conclude modal
  const [batchConcludeGroup, setBatchConcludeGroup] = useState<string | null>(null);

  // End-of-session checklist
  const [showChecklist, setShowChecklist] = useState(false);

  const isLive = sessionState === "live";
  const isSuspended = sessionState === "suspended";
  const isAdjourned = sessionState === "adjourned";
  const isGrace = sessionState === "grace";
  const isPreSession = sessionState === "pre";

  const { formatTime, broadcastingId } = useItemTimers(items, isLive);

  const logEvent = useCallback((action: BroadcastEvent["action"], item?: AgendaItem) => {
    const ev: BroadcastEvent = {
      id: eventIdRef.current++,
      itemId: item?.id ?? 0,
      itemTitle: item?.title ?? "—",
      itemRef: item?.ref,
      action,
      timestamp: getCurrentTimestamp(),
    };
    setBroadcastHistory(prev => [...prev, ev]);
  }, []);

  const pendingCount = useMemo(() => items.filter(i => i.status === "pending" || i.status === "broadcasting" || i.status === "paused").length, [items]);

  // Grace period countdown
  useEffect(() => {
    if (isGrace) {
      setGraceSecondsLeft(300);
      graceTimerRef.current = setInterval(() => {
        setGraceSecondsLeft(prev => {
          if (prev <= 1) {
            if (graceTimerRef.current) clearInterval(graceTimerRef.current);
            setSessionState("adjourned");
            autoDeferredRef.current = [];
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (graceTimerRef.current) clearInterval(graceTimerRef.current);
      };
    }
  }, [isGrace]);

  // === DECOUPLED BROADCAST: Just switches the projector, doesn't finalize anything ===
  const executeBroadcastSwitch = useCallback((id: number) => {
    setItems(prev => {
      const currentBroadcasting = prev.find(i => i.status === "broadcasting");
      const targetItem = prev.find(i => i.id === id);
      // Log pause of current item
      if (currentBroadcasting && currentBroadcasting.id !== id) {
        logEvent("paused", currentBroadcasting);
      }
      // Log broadcast (or resume if it was paused)
      if (targetItem) {
        logEvent(targetItem.status === "paused" ? "resumed" : "broadcast", targetItem);
      }
      return prev.map(item => ({
        ...item,
        status: item.id === id ? "broadcasting" as const :
          item.status === "broadcasting" ? "paused" as const : item.status,
      }));
    });
    setBroadcastId(id);
    setInterruptTarget(null);
  }, [logEvent]);

  const handleBroadcast = useCallback((id: number) => {
    // Check if there's an active item on the floor (broadcasting or paused but still live)
    const currentBroadcasting = items.find(i => i.status === "broadcasting");
    if (currentBroadcasting && currentBroadcasting.id !== id) {
      // Trigger interruption warning
      setInterruptTarget(id);
      return;
    }
    executeBroadcastSwitch(id);
  }, [items, executeBroadcastSwitch]);

  // === SEPARATE CONCLUDE: The only way to legally finish an item ===
  const handleConclude = useCallback((id: number) => {
    const item = items.find(i => i.id === id);
    if (item) logEvent("concluded", item);
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, status: "done" as const } : item
    ));
    if (broadcastId === id) setBroadcastId(null);
  }, [broadcastId, items, logEvent]);

  // === BATCH CONCLUDE ===
  const handleBatchConclude = useCallback((ids: number[]) => {
    ids.forEach(id => {
      const item = items.find(i => i.id === id);
      if (item) logEvent("concluded", item);
    });
    setItems(prev => prev.map(item =>
      ids.includes(item.id) ? { ...item, status: "done" as const } : item
    ));
    if (broadcastId !== null && ids.includes(broadcastId)) setBroadcastId(null);
    setBatchConcludeGroup(null);
  }, [broadcastId, items, logEvent]);

  const handleUpdateTitle = useCallback((id: number, newTitle: string) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, title: newTitle } : item
    ));
  }, []);

  // ===== FAIL-SAFE 1: Suspend / Recess =====
  const handleSuspend = useCallback(() => {
    preSuspendBroadcastRef.current = broadcastId;
    logEvent("suspended");
    setSessionState("suspended");
  }, [broadcastId, logEvent]);

  const handleResume = useCallback(() => {
    logEvent("session_resumed");
    setSessionState("live");
  }, [logEvent]);

  // ===== FAIL-SAFE 2: Adjourn (opens checklist first, then friction modal) =====
  const handleAdjournClick = useCallback(() => {
    const hasPaused = items.some(i => i.status === "paused");
    const hasBroadcasting = items.some(i => i.status === "broadcasting");
    if (hasPaused || hasBroadcasting) {
      setShowChecklist(true);
    } else {
      setShowAdjournModal(true);
    }
  }, [items]);

  const handleAdjournConfirm = useCallback(() => {
    // Save snapshot for undo
    preAdjournItemsRef.current = items.map(i => ({ ...i }));
    
    // Track what we're deferring
    const deferred: typeof autoDeferredRef.current = [];
    setItems(prev => prev.map(item => {
      if (item.status === "pending" || item.status === "broadcasting" || item.status === "paused") {
        deferred.push({ id: item.id, originalGroup: item.group, originalStatus: item.status });
        return { ...item, status: "deferred" as const, group: "Unfinished Business" };
      }
      return item;
    }));
    autoDeferredRef.current = deferred;
    logEvent("adjourned");
    setBroadcastId(null);
    setShowAdjournModal(false);
    setSessionState("grace"); // Start 5-min undo window
  }, [items, logEvent]);

  // ===== FAIL-SAFE 3: Undo Adjournment (grace period) =====
  const handleUndoAdjourn = useCallback(() => {
    if (graceTimerRef.current) clearInterval(graceTimerRef.current);
    // Restore items from snapshot
    setItems(preAdjournItemsRef.current);
    setBroadcastId(preSuspendBroadcastRef.current);
    logEvent("undo_adjourn");
    autoDeferredRef.current = [];
    setSessionState("live");
  }, [logEvent]);

  // Start session from pre-session
  const handleStartSession = useCallback(() => {
    setSessionState("live");
  }, []);

  // Move item (drag and drop)
  const moveItem = useCallback((fromIndex: number, toIndex: number) => {
    setItems(prev => {
      const flat = groupOrder.flatMap(g => prev.filter(i => i.group === g));
      const newFlat = [...flat];
      const [removed] = newFlat.splice(fromIndex, 1);
      newFlat.splice(toIndex, 0, removed);
      return newFlat;
    });
  }, []);

  // Add new agenda item from drawer
  const handleAddItem = () => {
    if (!drawerTitle.trim()) return;
    const newItem: AgendaItem = {
      id: items.length + 1,
      title: drawerTitle.trim(),
      type: drawerType,
      ref: drawerRef || undefined,
      author: drawerSponsor || undefined,
      status: "pending",
      group: drawerGroup,
      duration: drawerDuration || undefined,
    };
    setItems(prev => [...prev, newItem]);
    setFlashId(newItem.id);
    setTimeout(() => setFlashId(null), 1500);
    setDrawerOpen(false);
    setDrawerTitle("");
    setDrawerRef("");
    setDrawerSponsor("");
    setDrawerDuration("15 mins");
  };

  const doneCount = items.filter(i => i.status === "done").length;
  const totalCount = items.length;
  const currentItem = items.find(i => i.status === "broadcasting");

  let globalIdx = 0;

  return (
    <>
      <div className={`relative transition-all duration-500 ${drawerOpen ? "mr-[400px]" : ""}`} style={{ transitionTimingFunction: "cubic-bezier(0.25, 1.1, 0.4, 1)" }}>
        <PageHeader
          title="142nd Regular Session — Order of Business"
          subtitle="Session Management · SP Secretariat Control Panel"
          actions={<>
            {/* Session control buttons based on state */}
            {isPreSession && (
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200"
              >
                <Play size={14} /> Start Live Session
              </button>
            )}
            {isLive && (
              <>
                {/* Suspend / Recess — safe, non-destructive */}
                <button
                  onClick={handleSuspend}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer transition-all bg-amber-500 text-white hover:bg-amber-600 shadow-md shadow-amber-200"
                >
                  <Pause size={14} /> Suspend / Recess
                </button>
                {/* Adjourn — destructive, opens friction modal */}
                <button
                  onClick={handleAdjournClick}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer transition-all bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200"
                >
                  <StopFilled size={14} /> Adjourn Session
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-white">LIVE</span>
                </div>
              </>
            )}
            {isSuspended && (
              <>
                <button
                  onClick={handleResume}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer transition-all bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-200 animate-pulse"
                >
                  <Play size={14} /> Resume Session
                </button>
                <button
                  onClick={handleAdjournClick}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer transition-all bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-200"
                >
                  <StopFilled size={14} /> Adjourn Session
                </button>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 rounded-lg">
                  <Pause size={12} className="text-white" />
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-white">RECESSED</span>
                </div>
              </>
            )}
            {(isGrace || isAdjourned) && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-700 rounded-lg">
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-white">ADJOURNED</span>
              </div>
            )}
            {!isAdjourned && !isGrace && (
              <button
                onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <Add size={14} /> Add Agenda Item
              </button>
            )}
            <Btn icon={<DocumentExport size={14} />} label="Export Agenda PDF" />
          </>}
        />

        {/* Grace Period Banner — Fail-Safe 3 */}
        {isGrace && (
          <GracePeriodBanner
            secondsLeft={graceSecondsLeft}
            onUndo={handleUndoAdjourn}
            deferredCount={autoDeferredRef.current.length}
          />
        )}

        {/* Sealed record banner */}
        {isAdjourned && (
          <div className="bg-neutral-100 border border-neutral-300 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <Locked size={16} className="text-neutral-600" />
            <div>
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">SESSION ADJOURNED — Record Sealed</span>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-0.5">
                The 142nd Regular Session has been officially adjourned. The undo grace period has expired. Session data is now immutable.
              </p>
            </div>
          </div>
        )}

        {/* Suspended / Recess banner */}
        {isSuspended && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Pause size={16} className="text-amber-600" />
                <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-amber-800">SESSION SUSPENDED — Recess in Progress</span>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-amber-700">All items preserved · Click <strong>[Resume]</strong> to continue</span>
              </div>
            </div>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-amber-700 mt-1.5">
              The agenda board is locked during recess. No items have been moved or deferred. The session timer is paused.
            </p>
          </div>
        )}

        {/* Real-time sync banner */}
        {isLive && (
          <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 mb-5">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-emerald-300">SYNCED</span>
              </div>
              <div className="h-4 w-px bg-slate-600" />
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-300">
                13 devices connected — Mayor · Vice Mayor · 12 Councilors · SP Secretary
              </span>
              <div className="ml-auto flex items-center gap-3">
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400">Session Duration: <strong className="text-white">1h 42m</strong></span>
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400">Progress: <strong className="text-white">{doneCount}/{totalCount}</strong></span>
              </div>
            </div>
            {currentItem && (
              <div className="mt-2 pt-2 border-t border-slate-700 flex items-center gap-2">
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-400 uppercase tracking-wide">Now Broadcasting →</span>
                <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-white">{currentItem.title}</span>
                <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-emerald-300 ml-2 tabular-nums">⏱ {currentItem ? formatTime(currentItem.id) : "00:00"}</span>
              </div>
            )}
          </div>
        )}

        {/* Pre-session mode indicator */}
        {isPreSession && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5 flex items-center gap-3">
            <Edit size={16} className="text-amber-600" />
            <div>
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-amber-800">PRE-SESSION MODE · Agenda Builder Active</span>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-amber-700 mt-0.5">
                Drag items to reorder (⋮⋮) · Double-click any title to edit inline · Add items via the <strong>[+ Add Agenda Item]</strong> drawer. Click <strong>[Start Live Session]</strong> to lock the agenda and arm broadcast buttons.
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mb-5 flex-wrap">
          <StatCard label="Agenda Items" value={`${totalCount}`} sub="Total for session" />
          <StatCard label="Completed" value={`${doneCount}`} sub={`${totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0}% complete`} trend="up" />
          <StatCard label="Pending" value={`${items.filter(i => i.status === "pending" || i.status === "paused").length}`} sub={`${items.filter(i => i.status === "paused").length} paused`} />
          <StatCard label="Deferred" value={`${items.filter(i => i.status === "deferred").length}`} sub="Moved to next session" trend={items.filter(i => i.status === "deferred").length > 0 ? "down" : "flat"} />
        </div>

        {/* Agenda Board */}
        <div className="space-y-4">
          {groupOrder.map(group => {
            const groupItems = items.filter(i => i.group === group);
            if (groupItems.length === 0) return null;
            const allDone = groupItems.every(i => i.status === "done");
            return (
              <div key={group} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                <div className="px-5 py-3 flex items-center gap-3 border-b border-neutral-100" style={{ borderLeft: `4px solid ${groupColors[group]}` }}>
                  <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{group}</span>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5">{groupItems.length}</span>
                  {allDone && (
                    <div className="flex items-center gap-1 ml-auto">
                      <CheckmarkOutline size={14} className="text-emerald-500" />
                      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-600">Complete</span>
                    </div>
                  )}
                  {!allDone && (isLive || isSuspended) && (
                    <div className="flex items-center gap-2 ml-auto">
                      <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
                        {groupItems.filter(i => i.status === "done").length}/{groupItems.length} concluded
                        {groupItems.some(i => i.status === "paused") && <span className="text-yellow-600 ml-1">· {groupItems.filter(i => i.status === "paused").length} paused</span>}
                      </span>
                      {/* Batch Conclude — show for groups with concludable items */}
                      {isLive && groupItems.filter(i => i.status !== "done" && i.status !== "deferred").length >= 2 && (
                        <button
                          onClick={() => setBatchConcludeGroup(group)}
                          className="flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700 bg-emerald-50 border border-emerald-200 cursor-pointer hover:bg-emerald-100 transition-colors"
                        >
                          <ListChecked size={12} /> Batch Conclude
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  {groupItems.map((item) => {
                    const currentGlobal = globalIdx++;
                    return (
                      <DraggableAgendaRow
                        key={item.id}
                        item={item}
                        globalIndex={currentGlobal}
                        moveItem={moveItem}
                        isLive={isLive}
                        sessionState={sessionState}
                        isBroadcasting={item.status === "broadcasting"}
                        isPaused={item.status === "paused"}
                        isDone={item.status === "done"}
                        isDeferred={item.status === "deferred"}
                        onBroadcast={() => handleBroadcast(item.id)}
                        onConclude={() => handleConclude(item.id)}
                        onUpdateTitle={(t) => handleUpdateTitle(item.id, t)}
                        itemElapsed={formatTime(item.id)}
                        draggedIdx={draggedIdx}
                        setDraggedIdx={setDraggedIdx}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Broadcast Audit Trail */}
        <BroadcastTimeline
          events={broadcastHistory}
          isCollapsed={timelineCollapsed}
          onToggle={() => setTimelineCollapsed(prev => !prev)}
        />

        {/* BPA Automation notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-5">
          <div className="flex items-start gap-3">
            <Renew size={16} className="text-blue-600 mt-0.5 shrink-0" />
            <div>
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-blue-800">BPA Engine — Decoupled Broadcast + Triple Fail-Safe</span>
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-blue-700 mt-0.5">
                <strong>📡 Broadcast</strong> is a projector switch only — it never finalizes items. Use <strong>[✓ Conclude Item]</strong> to legally close an item.{" "}
                Switching broadcast shows an <strong>interruption warning</strong> and pauses the current item.{" "}
                <strong>⏸ Suspend/Recess</strong> freezes the board.{" "}
                <strong>🛑 Adjourn</strong> requires typing "ADJOURN" + 5-min grace period.
              </p>
            </div>
          </div>
        </div>

        {/* Interruption Warning Modal — Broadcast Switch Fail-Safe */}
        {interruptTarget !== null && (() => {
          const currentBroadcasting = items.find(i => i.status === "broadcasting");
          const targetItem = items.find(i => i.id === interruptTarget);
          if (!currentBroadcasting || !targetItem) return null;
          return (
            <InterruptionWarningModal
              currentItem={currentBroadcasting}
              targetItem={targetItem}
              currentElapsed={formatTime(currentBroadcasting.id)}
              onConfirm={() => executeBroadcastSwitch(interruptTarget)}
              onCancel={() => setInterruptTarget(null)}
            />
          );
        })()}

        {/* End-of-Session Checklist — Pre-Adjournment Review */}
        {showChecklist && (
          <EndOfSessionChecklist
            pausedItems={items.filter(i => i.status === "paused")}
            pendingItems={items.filter(i => i.status === "pending")}
            broadcastingItem={items.find(i => i.status === "broadcasting") ?? null}
            formatTime={formatTime}
            onProceed={() => {
              setShowChecklist(false);
              setShowAdjournModal(true);
            }}
            onCancel={() => setShowChecklist(false)}
          />
        )}

        {/* Batch Conclude Modal */}
        {batchConcludeGroup !== null && (() => {
          const groupItems = items.filter(i => i.group === batchConcludeGroup && i.status !== "done" && i.status !== "deferred");
          if (groupItems.length === 0) return null;
          return (
            <BatchConcludeModal
              items={groupItems}
              groupName={batchConcludeGroup}
              onConfirm={handleBatchConclude}
              onCancel={() => setBatchConcludeGroup(null)}
            />
          );
        })()}

        {/* Friction Modal — Fail-Safe 2 */}
        {showAdjournModal && (
          <AdjournFrictionModal
            pendingCount={pendingCount}
            pendingItems={items.filter(i => i.status === "pending" || i.status === "broadcasting" || i.status === "paused")}
            sessionLabel="142nd Regular Session"
            onConfirm={handleAdjournConfirm}
            onCancel={() => setShowAdjournModal(false)}
          />
        )}
      </div>

      {/* ===== SLIDE-OUT DRAWER ===== */}
      <div
        className={`fixed top-0 right-0 h-full w-[400px] bg-white border-l border-neutral-200 shadow-2xl z-50 flex flex-col transition-transform duration-500 ${
          drawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ transitionTimingFunction: "cubic-bezier(0.25, 1.1, 0.4, 1)" }}
      >
        {/* Drawer Header */}
        <div className="px-6 py-5 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Add Agenda Item</h3>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">142nd Regular Session</p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-neutral-100 transition-colors cursor-pointer"
          >
            <Close size={16} className="text-neutral-500" />
          </button>
        </div>

        {/* Drawer Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Item Type */}
          <div>
            <label className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 block mb-1.5">Item Type</label>
            <select
              value={drawerType}
              onChange={(e) => setDrawerType(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 outline-none focus:border-blue-300 bg-white appearance-none"
            >
              {drawerItemTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          {/* Measure Tracking No */}
          <div>
            <label className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 block mb-1.5">Measure Tracking No.</label>
            <div className="relative">
              <input
                type="text"
                value={drawerRef}
                onChange={(e) => setDrawerRef(e.target.value)}
                placeholder="e.g. ORD-2026-049"
                className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-[12px] font-['JetBrains_Mono',_'Fira_Code',_monospace] text-neutral-800 outline-none focus:border-blue-300 placeholder:text-neutral-400 placeholder:font-['Lexend:Regular',_sans-serif]"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-300" />
            </div>
            <p className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">Auto-completes from active measures database</p>
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 block mb-1.5">Title / Description</label>
            <textarea
              value={drawerTitle}
              onChange={(e) => setDrawerTitle(e.target.value)}
              placeholder="Full title of the agenda item…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 outline-none focus:border-blue-300 resize-none placeholder:text-neutral-400"
            />
          </div>

          {/* Sponsoring Councilor */}
          <div>
            <label className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 block mb-1.5">Sponsoring Councilor</label>
            <select
              value={drawerSponsor}
              onChange={(e) => setDrawerSponsor(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 outline-none focus:border-blue-300 bg-white appearance-none"
            >
              <option value="">Select councilor…</option>
              {councilorAvatars.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
            {drawerSponsor && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-neutral-50 rounded-lg border border-neutral-100">
                <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-['Lexend:SemiBold',_sans-serif] text-white">
                  {councilorAvatars.find(c => c.name === drawerSponsor)?.initials}
                </div>
                <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{drawerSponsor}</span>
              </div>
            )}
          </div>

          {/* Estimated Duration */}
          <div>
            <label className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 block mb-1.5">Estimated Duration</label>
            <input
              type="text"
              value={drawerDuration}
              onChange={(e) => setDrawerDuration(e.target.value)}
              placeholder="e.g. 15 mins"
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 outline-none focus:border-blue-300 placeholder:text-neutral-400"
            />
          </div>

          {/* Agenda Group */}
          <div>
            <label className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 block mb-1.5">Agenda Group</label>
            <select
              value={drawerGroup}
              onChange={(e) => setDrawerGroup(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 outline-none focus:border-blue-300 bg-white appearance-none"
            >
              {groupOrder.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-4 border-t border-neutral-100 flex items-center gap-3 shrink-0 bg-neutral-50/50">
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex-1 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600 bg-white border border-neutral-200 cursor-pointer hover:bg-neutral-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAddItem}
            disabled={!drawerTitle.trim()}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] transition-colors ${
              drawerTitle.trim()
                ? "bg-blue-600 text-white cursor-pointer hover:bg-blue-700"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            <Save size={14} /> Save to Agenda
          </button>
        </div>
      </div>

      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/10 z-40 transition-opacity"
          onClick={() => setDrawerOpen(false)}
        />
      )}
    </>
  );
}

// ==================== NLP TRANSCRIPTION ====================

function NLPTranscription() {
  const [entries, setEntries] = useState(liveTranscript);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState("");
  const [officialNote, setOfficialNote] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleEdit = (id: number, text: string) => {
    setEditingId(id);
    setEditText(text);
  };

  const saveEdit = (id: number) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, text: editText, editedBySecretariat: true } : e));
    setEditingId(null);
    setEditText("");
  };

  const insertOfficialNote = () => {
    if (!officialNote.trim()) return;
    const newEntry: TranscriptEntry = {
      id: entries.length + 1,
      speaker: "Sec. A. Mendoza",
      initials: "AM",
      role: "SP Secretary",
      text: officialNote,
      timestamp: "10:06:32",
      isOfficial: true,
    };
    setEntries(prev => [...prev, newEntry]);
    setOfficialNote("");
  };

  const roleColors: Record<string, string> = {
    "Presiding Officer": "bg-cyan-700",
    "SP Secretary": "bg-violet-700",
    Councilor: "bg-slate-700",
  };

  return (
    <div>
      <PageHeader
        title="Live Floor Transcript"
        subtitle="Session Management · NLP Transcription (AI Stenographer)"
        actions={<>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 rounded-lg">
            <Microphone size={14} className="text-white" />
            <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-white">RECORDING</span>
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
          </div>
          <Btn icon={<Download size={14} />} label="Export Transcript" />
        </>}
      />

      {/* Status bar */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 mb-5 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Microphone size={16} className="text-red-400" />
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-red-300">LIVE TRANSCRIPTION</span>
        </div>
        <div className="h-4 w-px bg-slate-600" />
        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-300">Speech-to-Text: <strong className="text-emerald-300">Active</strong></span>
        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-300">Speaker Diarization: <strong className="text-emerald-300">Online</strong></span>
        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-300">Accuracy: <strong className="text-cyan-300">96.2%</strong></span>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400">{entries.length} blocks captured</span>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Transcript Blocks" value={`${entries.length}`} sub="Auto-captured" />
        <StatCard label="Speakers Identified" value={`${[...new Set(entries.map(e => e.speaker))].length}`} sub="AI diarization" trend="up" />
        <StatCard label="Secretariat Edits" value={`${entries.filter(e => e.editedBySecretariat).length}`} sub="Manual corrections" />
        <StatCard label="Official Notes" value={`${entries.filter(e => e.isOfficial).length}`} sub="Inserted by secretary" />
      </div>

      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Chat-style transcript feed */}
        <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden flex flex-col" style={{ maxHeight: 640 }}>
          <div className="px-5 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2 shrink-0">
            <Microphone size={14} className="text-red-500" />
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Live Transcript Feed</span>
            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">· 142nd Regular Session</span>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-red-500">LIVE</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {entries.map(entry => (
              <div key={entry.id} className={`flex gap-3 ${entry.isOfficial ? "bg-blue-50/50 -mx-2 px-2 py-2 rounded-lg border border-blue-100" : ""}`}>
                <div className={`w-8 h-8 rounded-full ${roleColors[entry.role] || "bg-slate-700"} flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-white shrink-0 mt-0.5`}>
                  {entry.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{entry.speaker}</span>
                    <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{entry.role}</span>
                    <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[9px] text-neutral-400 ml-auto">{entry.timestamp}</span>
                    {entry.editedBySecretariat && (
                      <span className="text-[8px] font-['Lexend:Medium',_sans-serif] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">edited</span>
                    )}
                    {entry.isOfficial && (
                      <span className="text-[8px] font-['Lexend:Medium',_sans-serif] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">official note</span>
                    )}
                  </div>
                  {editingId === entry.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full p-2 text-[12px] font-['Lexend:Regular',_sans-serif] border border-blue-300 rounded-lg outline-none bg-blue-50/50 text-neutral-800 resize-none"
                        rows={3}
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={() => saveEdit(entry.id)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-blue-700">Save</button>
                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 bg-neutral-100 text-neutral-600 rounded-lg text-[10px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-neutral-200">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <div className="group relative">
                      <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
                        "{entry.text}"
                      </p>
                      <button
                        onClick={() => handleEdit(entry.id, entry.text)}
                        className="absolute -right-1 top-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded bg-white border border-neutral-200 shadow-sm cursor-pointer"
                        title="Edit for legal accuracy"
                      >
                        <Edit size={12} className="text-neutral-500" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            <div className="flex gap-3 items-center opacity-60">
              <div className="w-8 h-8 rounded-full bg-neutral-300 flex items-center justify-center shrink-0">
                <Microphone size={12} className="text-neutral-500" />
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 rounded-full bg-neutral-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 ml-1">Listening for speech…</span>
              </div>
            </div>
          </div>

          {/* Insert official note */}
          <div className="shrink-0 px-4 py-3 border-t border-neutral-200 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-2.5 focus-within:border-blue-300">
                <DocumentAdd size={14} className="text-neutral-400 shrink-0" />
                <input
                  type="text"
                  value={officialNote}
                  onChange={(e) => setOfficialNote(e.target.value)}
                  placeholder="Insert official note…"
                  onKeyDown={(e) => e.key === "Enter" && insertOfficialNote()}
                  className="flex-1 bg-transparent outline-none text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400"
                />
              </div>
              <button
                onClick={insertOfficialNote}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg text-[11px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-blue-700 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right panel — Speaker stats & controls */}
        <div className="space-y-4">
          {/* Speaker diarization panel */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Speaker Diarization</h4>
            <div className="space-y-2.5">
              {[...new Set(entries.map(e => e.speaker))].map(speaker => {
                const speakerEntries = entries.filter(e => e.speaker === speaker);
                const entry = speakerEntries[0];
                const words = speakerEntries.reduce((sum, e) => sum + e.text.split(" ").length, 0);
                return (
                  <div key={speaker} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-neutral-50 transition-colors">
                    <div className={`w-7 h-7 rounded-full ${roleColors[entry.role] || "bg-slate-700"} flex items-center justify-center text-[8px] font-['Lexend:SemiBold',_sans-serif] text-white shrink-0`}>
                      {entry.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 block truncate">{speaker}</span>
                      <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{speakerEntries.length} blocks · ~{words} words</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Session metadata */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Session Info</h4>
            <div className="space-y-2">
              {[
                ["Session", "142nd Regular Session"],
                ["Date", "April 16, 2026"],
                ["Presiding", "Vice Mayor F. Reyes"],
                ["Quorum", "12/12 present"],
                ["Duration", "1h 42m (ongoing)"],
                ["Mic Channels", "4 active"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500">{k}</span>
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-800">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* NLP accuracy */}
          <div className="bg-white rounded-xl border border-neutral-200 p-4">
            <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">AI Model Performance</h4>
            <div className="space-y-3">
              {[
                { label: "Speech-to-Text Accuracy", value: 96.2, color: "bg-emerald-400" },
                { label: "Speaker ID Confidence", value: 92.8, color: "bg-blue-400" },
                { label: "Filipino/Bisaya Detection", value: 88.5, color: "bg-violet-400" },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{item.label}</span>
                    <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{item.value}%</span>
                  </div>
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== SESSION SUMMARIES ====================

function SessionSummaries() {
  const [selectedSummary, setSelectedSummary] = useState(sessionSummaries[0]);

  return (
    <div>
      <PageHeader
        title="AI Generated Summaries"
        subtitle="Session Management · Minutes & Transcripts"
        actions={<>
          <Btn icon={<Share size={14} />} label="Publish to Transparency Portal" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export PDF" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Sessions Summarized" value={`${sessionSummaries.length}`} sub="AI-generated briefs" />
        <StatCard label="Avg. Compression" value="96%" sub="50 pages → 2 pages" trend="up" />
        <StatCard label="Published" value={`${sessionSummaries.filter(s => s.status === "Finalized").length}`} sub="On transparency portal" />
        <StatCard label="Latest" value="142nd" sub="AI processing complete" />
      </div>

      {/* Session selector */}
      <div className="flex gap-3 mb-5">
        {sessionSummaries.map(s => (
          <button
            key={s.id}
            onClick={() => setSelectedSummary(s)}
            className={`px-4 py-2.5 rounded-xl text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${
              selectedSummary.id === s.id
                ? "bg-blue-600 text-white"
                : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            {s.session} · {s.date}
          </button>
        ))}
      </div>

      {/* Summary content */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-6 py-4 bg-neutral-50/50 border-b border-neutral-100">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selectedSummary.session}</h3>
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
                {selectedSummary.date} · Duration: {selectedSummary.duration} · Attendance: {selectedSummary.attendees}/{selectedSummary.totalAttendees}
              </p>
            </div>
            <Pill status={selectedSummary.status} />
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* NLP compression indicator */}
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="flex items-start gap-3">
              <Analytics size={16} className="text-blue-600 mt-0.5 shrink-0" />
              <div>
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-blue-800">NLP Auto-Summary</span>
                <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-blue-700 mt-0.5">
                  This {selectedSummary.duration} session produced ~{parseInt(selectedSummary.duration) * 12} pages of raw transcript.
                  The NLP engine compressed it into this concise executive brief immediately after <strong>[End Session]</strong> was pressed.
                </p>
              </div>
            </div>
          </div>

          {/* Motions Passed */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center">
                <CheckmarkOutline size={14} className="text-emerald-600" />
              </div>
              <h4 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Motions Passed</h4>
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">{selectedSummary.motionsPassed.length}</span>
            </div>
            <div className="space-y-2 pl-8">
              {selectedSummary.motionsPassed.map((motion, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">{motion}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Measures Deferred */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center">
                <Time size={14} className="text-amber-600" />
              </div>
              <h4 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Measures Deferred</h4>
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">{selectedSummary.measuresDeferred.length}</span>
            </div>
            <div className="space-y-2 pl-8">
              {selectedSummary.measuresDeferred.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Debates & Dissenting Opinions */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-orange-100 flex items-center justify-center">
                <Flag size={14} className="text-orange-600" />
              </div>
              <h4 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Key Debates & Dissenting Opinions</h4>
            </div>
            <div className="space-y-3 pl-8">
              {selectedSummary.keyDebates.map((debate, i) => (
                <div key={i} className="bg-neutral-50 rounded-lg p-4 border border-neutral-100">
                  <h5 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1.5">{debate.topic}</h5>
                  <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed mb-2">{debate.summary}</p>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-neutral-500">Dissenting:</span>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-red-600">{debate.dissenting}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ARCHIVED MINUTES ====================

interface SearchResult {
  session: string;
  date: string;
  timestamp: string;
  speaker: string;
  text: string;
  highlight: string;
  relevance: number;
}

const sampleSearchResults: SearchResult[] = [
  {
    session: "138th Regular Session",
    date: "2026-03-19",
    timestamp: "11:22:45",
    speaker: "Hon. M. Delgado",
    text: "Mr. Presiding Officer, I wish to bring to the attention of this body the alarming state of our beaches. The garbage collected from Brgy. Cogon alone fills three dump trucks per week. We need a systematic approach to beach garbage collection before the tourism season.",
    highlight: "beach garbage",
    relevance: 94,
  },
  {
    session: "136th Regular Session",
    date: "2026-03-05",
    timestamp: "14:08:12",
    speaker: "Hon. R. Almario",
    text: "The Eco-Park shoreline restoration project cannot proceed unless we address the marine debris problem. I have personally inspected the coastal area and the situation is dire — plastic waste from upstream barangays is destroying our coral rehabilitation efforts.",
    highlight: "marine debris",
    relevance: 89,
  },
  {
    session: "135th Regular Session",
    date: "2026-02-26",
    timestamp: "10:35:08",
    speaker: "Hon. L. Santos",
    text: "On the matter of the supplemental budget, I propose we allocate an additional ₱2.5 million for shore cleanup operations. The DENR has offered to co-fund this initiative if we demonstrate a local government match of at least 40%.",
    highlight: "shore cleanup operations",
    relevance: 78,
  },
  {
    session: "132nd Regular Session",
    date: "2026-02-05",
    timestamp: "15:15:33",
    speaker: "Hon. E. Lim",
    text: "I would like to move for a privilege speech regarding the waste management crisis in our coastal barangays. The tide brings in debris from neighboring municipalities and we have no mechanism to hold them accountable. This is fundamentally a regional problem that requires inter-LGU coordination.",
    highlight: "waste management crisis",
    relevance: 72,
  },
];

function ArchivedMinutes() {
  const [searchQuery, setSearchQuery] = useState("coastal cleanup arguments");
  const [hasSearched, setHasSearched] = useState(true);

  return (
    <div>
      <PageHeader
        title="Historical Transcript Database"
        subtitle="Session Management · Archived Minutes (Semantic Search)"
        actions={<>
          <Btn icon={<Download size={14} />} label="Export Archive" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Sessions Archived" value={`${archivedSessions.length + 2}`} sub="Full transcripts stored" />
        <StatCard label="Total Transcript Blocks" value="4,280" sub="NLP-indexed" trend="up" />
        <StatCard label="Speakers Indexed" value="18" sub="Across all sessions" />
        <StatCard label="Avg. Search Time" value="0.6s" sub="Semantic query" trend="up" />
      </div>

      {/* Semantic search */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Analytics size={20} className="text-violet-600" />
            <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Semantic Transcript Search</span>
          </div>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-4">
            Search using natural language. The AI understands context — searching "coastal cleanup" will also find "beach garbage," "marine debris," and "shore cleanup" across years of transcripts.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus-within:border-violet-300 focus-within:bg-white transition-colors">
              <Search size={18} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='e.g. "Arguments about the coastal cleanup"'
                className="flex-1 bg-transparent outline-none text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400"
              />
            </div>
            <button
              onClick={() => setHasSearched(true)}
              className="px-5 py-3 bg-violet-600 text-white rounded-xl text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-violet-700 transition-colors"
            >
              Search
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Semantic expansion:</span>
            {["coastal cleanup", "beach garbage", "marine debris", "shore cleanup", "waste management"].map(term => (
              <span key={term} className="text-[9px] font-['Lexend:Medium',_sans-serif] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-100">{term}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Search results */}
      {hasSearched && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{sampleSearchResults.length} results found across {[...new Set(sampleSearchResults.map(r => r.session))].length} sessions — 0.6 seconds</span>
          </div>

          {sampleSearchResults.map((result, idx) => (
            <div key={idx} className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-violet-200 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{result.session}</span>
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{result.date}</span>
                  <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-violet-600">⏱ {result.timestamp}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-violet-500" style={{ width: `${result.relevance}%` }} />
                  </div>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-violet-600">{result.relevance}%</span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-['Lexend:SemiBold',_sans-serif] text-white shrink-0 mt-0.5">
                  {result.speaker.split(" ").slice(-1)[0][0]}{result.speaker.split(" ").slice(-2)[0][0]}
                </div>
                <div className="flex-1">
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{result.speaker}</span>
                  <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100 mt-1.5">
                    <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
                      "{result.text.split(result.highlight).map((part, i, arr) => (
                        <React.Fragment key={i}>
                          {part}
                          {i < arr.length - 1 && <mark className="bg-yellow-200 px-0.5 rounded font-['Lexend:SemiBold',_sans-serif]">{result.highlight}</mark>}
                        </React.Fragment>
                      ))}"
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3 pl-10">
                <Btn icon={<Play size={12} />} label="Jump to Timestamp" />
                <Btn icon={<View size={12} />} label="Full Session Transcript" />
                <Btn icon={<DocumentExport size={12} />} label="Cite" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Archived sessions index */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden mt-5">
        <div className="px-5 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2">
          <Archive size={14} className="text-neutral-500" />
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Session Archive Index</span>
        </div>
        <div className="grid grid-cols-[120px_1fr_80px_80px] gap-0 px-5 py-2.5 bg-neutral-50/30 border-b border-neutral-100">
          {["Session", "Date", "Measures", "Duration"].map(h => (
            <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {archivedSessions.map(s => (
          <div key={s.session} className="grid grid-cols-[120px_1fr_80px_80px] gap-0 px-5 py-3 border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors items-center cursor-pointer">
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{s.session} Session</span>
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{s.date}</span>
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{s.measures} items</span>
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{s.duration}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== EXPORTS ====================
export const sessionPages: Record<string, Record<string, React.ComponentType>> = {
  session: {
    "Order of Business": OrderOfBusiness,
    "NLP Transcription": NLPTranscription,
    "Session Summaries": SessionSummaries,
    "Archived Minutes": ArchivedMinutes,
  },
};

export const sessionDefaultPages: Record<string, string> = {
  session: "Order of Business",
};