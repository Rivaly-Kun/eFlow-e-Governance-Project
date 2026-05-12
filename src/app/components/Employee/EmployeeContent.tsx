import React, { useState, useEffect } from "react";
import { MondayBoard } from "../ui/MondayBoard";
import {
  subscribeToTasks,
  seedTasksIfEmpty,
  updateTaskStatus,
  Task,
} from "../../services/taskService";
import {
  Settings,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Bot,
  MapPin,
  Upload,
  Bell,
  Mic,
  Square,
  Languages,
  Sparkles,
  QrCode,
  MessageCircle,
  Wifi,
  WifiOff,
  CloudUpload,
  ShieldCheck,
  Image as ImageIcon,
  Paperclip,
  Send,
  Play,
  Pause,
  ChevronRight,
  Wallet,
  Scan,
  Lock,
  Calculator,
  Receipt,
  Plus,
  Link2,
  ShieldAlert,
  FileCheck2,
  Trophy,
  Heart,
  Users,
  Target,
  Star,
  BookOpen,
  HelpCircle,
  Volume2,
  Camera,
  RotateCw,
  Award,
  Flame,
  ThumbsUp,
} from "lucide-react";

// ==================== SHARED ====================
function Header({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <div className="text-[11px] tracking-widest text-neutral-400 uppercase mb-1">
          My Workspace · Basecamp
        </div>
        <h1 className="text-[22px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] text-neutral-500 mt-1 font-['Lexend:Regular',_sans-serif]">
            {subtitle}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "red" | "amber" | "green" | "blue" | "purple";
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-700 border-neutral-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    green: "bg-emerald-50 text-emerald-700 border-emerald-200",
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    purple: "bg-violet-50 text-violet-700 border-violet-200",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-['Lexend:Medium',_sans-serif] ${map[tone]}`}
    >
      {children}
    </span>
  );
}

// ==================== 19.1 GA-DELEGATED ASSIGNMENTS ====================
type TaskStatus = "To Do" | "In Progress" | "Stuck" | "Done";
const STATUS_TONE: Record<TaskStatus, "neutral" | "blue" | "red" | "green"> = {
  "To Do": "neutral",
  "In Progress": "blue",
  Stuck: "red",
  Done: "green",
};

const TASKS_SEED = [
  {
    id: "T-402",
    name: "Inspect Market Drainage — Alley B",
    origin: "GA",
    status: "In Progress" as TaskStatus,
    loc: "Public Market",
    sla: "Due in 4h 12m",
    slaTone: "amber" as const,
  },
  {
    id: "T-404",
    name: "Pothole Patch — Brgy. Linao St. 3",
    origin: "GA",
    status: "Done" as TaskStatus,
    loc: "Brgy. Linao",
    sla: "Closed 09:14",
    slaTone: "green" as const,
  },
  {
    id: "T-407",
    name: "Streetlight Replacement — Plaza Node 12",
    origin: "GA",
    status: "To Do" as TaskStatus,
    loc: "Ormoc Plaza",
    sla: "Due in 1d 2h",
    slaTone: "neutral" as const,
  },
  {
    id: "T-411",
    name: "Fix Broken Pipe — Mountain Barangay",
    origin: "Dispatch",
    status: "Stuck" as TaskStatus,
    loc: "Brgy. Margen",
    sla: "Overdue 45m",
    slaTone: "red" as const,
  },
  {
    id: "T-418",
    name: "Water Meter Audit — Zone 4",
    origin: "GA",
    status: "To Do" as TaskStatus,
    loc: "Zone 4",
    sla: "Due in 6h",
    slaTone: "neutral" as const,
  },
  {
    id: "T-423",
    name: "Sign Post Install — Downtown Loop",
    origin: "Manual",
    status: "In Progress" as TaskStatus,
    loc: "Downtown",
    sla: "Due in 2h 30m",
    slaTone: "amber" as const,
  },
];

function StatusPill({
  status,
  onChange,
}: {
  status: TaskStatus;
  onChange: (s: TaskStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const toneMap: Record<TaskStatus, string> = {
    "To Do": "bg-neutral-200 text-neutral-700",
    "In Progress": "bg-blue-500 text-white",
    Stuck: "bg-red-500 text-white",
    Done: "bg-emerald-500 text-white",
  };
  const opts: TaskStatus[] = ["To Do", "In Progress", "Stuck", "Done"];
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-2.5 py-1 rounded-md text-[11px] font-['Lexend:SemiBold',_sans-serif] tracking-wide w-[110px] text-center ${toneMap[status]}`}
      >
        {status}
      </button>
      {open && (
        <div className="absolute z-20 mt-1 left-0 bg-white border border-neutral-200 rounded-lg shadow-lg p-1 w-[130px]">
          {opts.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o);
                setOpen(false);
              }}
              className={`w-full text-left px-2 py-1 rounded text-[11px] font-['Lexend:Medium',_sans-serif] ${toneMap[o]} mb-0.5 last:mb-0`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ActiveTasks() {
  const [rows, setRows] = useState(TASKS_SEED);
  const setStatus = (id: string, s: TaskStatus) =>
    setRows(rows.map((r) => (r.id === id ? { ...r, status: s } : r)));
  const counts = {
    todo: rows.filter((r) => r.status === "To Do").length,
    progress: rows.filter((r) => r.status === "In Progress").length,
    stuck: rows.filter((r) => r.status === "Stuck").length,
    done: rows.filter((r) => r.status === "Done").length,
  };

  return (
    <div>
      <Header
        title="Active Tasks — Execution Board"
        subtitle="Read-only assignments. You can change Status and upload files."
        right={
          <div className="flex items-center gap-2">
            <Chip tone="neutral">To Do · {counts.todo}</Chip>
            <Chip tone="blue">In Progress · {counts.progress}</Chip>
            <Chip tone="red">Stuck · {counts.stuck}</Chip>
            <Chip tone="green">Done · {counts.done}</Chip>
          </div>
        }
      />

      {/* Context-Aware Reminder Banner */}
      <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3">
        <Bell size={18} className="text-amber-600 mt-0.5" />
        <div className="flex-1">
          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-amber-900">
            Pending Action
          </div>
          <div className="text-[12px] text-amber-800 font-['Lexend:Regular',_sans-serif]">
            Upload completion photo for Task #402 to unlock your next
            assignment.
          </div>
        </div>
        <button className="px-3 py-1.5 bg-amber-600 text-white rounded-md text-[11px] font-['Lexend:SemiBold',_sans-serif] flex items-center gap-1">
          <Upload size={12} /> Upload
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_140px_140px_180px_160px_40px] gap-2 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 text-[10px] tracking-wider text-neutral-500 uppercase font-['Lexend:SemiBold',_sans-serif]">
          <div></div>
          <div>Task Name</div>
          <div>Origin</div>
          <div>Status</div>
          <div>Location / Asset</div>
          <div>SLA Countdown</div>
          <div></div>
        </div>
        {rows.map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[40px_1fr_140px_140px_180px_160px_40px] gap-2 px-4 py-3 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50/60"
          >
            <div
              className={`w-1.5 h-6 rounded-full ${r.status === "Done" ? "bg-emerald-500" : r.status === "Stuck" ? "bg-red-500" : r.status === "In Progress" ? "bg-blue-500" : "bg-neutral-300"}`}
            />
            <div>
              <div className="text-[13px] text-neutral-900 font-['Lexend:Medium',_sans-serif]">
                {r.name}
              </div>
              <div className="text-[11px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">
                {r.id}
              </div>
            </div>
            <div>
              {r.origin === "GA" ? (
                <Chip tone="purple">
                  <Bot size={11} /> Genetic Algorithm
                </Chip>
              ) : r.origin === "Dispatch" ? (
                <Chip tone="red">
                  <AlertTriangle size={11} /> Dispatch
                </Chip>
              ) : (
                <Chip tone="neutral">Manual</Chip>
              )}
            </div>
            <StatusPill
              status={r.status}
              onChange={(s) => setStatus(r.id, s)}
            />
            <div className="flex items-center gap-1.5 text-[12px] text-neutral-700 font-['Lexend:Regular',_sans-serif]">
              <MapPin size={12} className="text-neutral-400" /> {r.loc}
            </div>
            <div>
              <Chip tone={r.slaTone}>
                <Clock size={11} /> {r.sla}
              </Chip>
            </div>
            <button
              className="text-neutral-400 hover:text-neutral-700"
              title="Upload file"
            >
              <Paperclip size={14} />
            </button>
          </div>
        ))}
      </div>

      {/* One-Tap Complete */}
      <div className="mt-5 bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-[14px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif]">
              One-Tap Complete
            </h3>
            <p className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
              Minimalist checklist for repetitive tasks — no forms, no photos.
            </p>
          </div>
          <Chip tone="green">Auto-sync</Chip>
        </div>
        <OneTap />
      </div>
    </div>
  );
}

function OneTap() {
  const [items, setItems] = useState([
    { id: "s1", label: "Log into shift", done: true },
    { id: "s2", label: "Check truck oil & tire pressure", done: true },
    { id: "s3", label: "Pick up daily dispatch packet", done: false },
    { id: "s4", label: "Confirm radio channel (Ch. 4)", done: false },
    { id: "s5", label: "End-of-shift vehicle return", done: false },
  ]);
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() =>
            setItems(
              items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)),
            )
          }
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition ${it.done ? "bg-emerald-50 border-emerald-200" : "bg-white border-neutral-200 hover:border-neutral-300"}`}
        >
          {it.done ? (
            <CheckCircle2 size={18} className="text-emerald-600" />
          ) : (
            <Circle size={18} className="text-neutral-400" />
          )}
          <span
            className={`text-[13px] font-['Lexend:Medium',_sans-serif] ${it.done ? "text-emerald-900 line-through" : "text-neutral-800"}`}
          >
            {it.label}
          </span>
        </button>
      ))}
    </div>
  );
}

// ==================== 19.2 DAILY STAND-UP INPUT ====================
function DailyStandUp() {
  const [recording, setRecording] = useState(false);
  const [time, setTime] = useState(0);
  const [text, setText] = useState(
    "We finished paving the road sa Brgy. Linao, pero na-delay yung delivery ng cement para bukas. Kailangan mag follow-up sa supplier.",
  );
  const [processed, setProcessed] = useState(true);

  React.useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setTime((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  const mmss = `${String(Math.floor(time / 60)).padStart(2, "0")}:${String(time % 60).padStart(2, "0")}`;

  return (
    <div>
      <Header
        title="Daily Stand-Up Input — The NLP Feeder"
        subtitle="Dictate your field update. AI transcribes, translates, and extracts blockers automatically."
        right={
          <Chip tone="purple">
            <Sparkles size={11} /> Feeding Dept. Head AI
          </Chip>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-4">
        {/* Input */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              Smart Diary
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  setRecording(!recording);
                  if (recording) setTime(0);
                }}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] ${recording ? "bg-red-500 text-white" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
              >
                {recording ? (
                  <>
                    <Square size={12} fill="white" /> Stop · {mmss}
                  </>
                ) : (
                  <>
                    <Mic size={12} /> Dictate Voice Note
                  </>
                )}
              </button>
            </div>
          </div>

          {/* waveform */}
          <div className="h-16 bg-neutral-50 rounded-lg border border-neutral-200 mb-3 flex items-end gap-0.5 px-3 py-2 overflow-hidden">
            {Array.from({ length: 60 }).map((_, i) => {
              const h = recording
                ? 20 + Math.abs(Math.sin(i * 0.6 + time * 0.8)) * 40
                : 6 + Math.abs(Math.sin(i * 0.4)) * 14;
              return (
                <div
                  key={i}
                  className={`w-1 rounded-full ${recording ? "bg-red-400" : "bg-neutral-300"}`}
                  style={{ height: `${h}%` }}
                />
              );
            })}
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            placeholder="Type or dictate your update in Tagalog, Bisaya, or English…"
            className="w-full rounded-lg border border-neutral-200 p-3 text-[13px] text-neutral-800 font-['Lexend:Regular',_sans-serif] focus:outline-none focus:border-neutral-400 resize-none"
          />

          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
              <Languages size={12} /> Language auto-detected:{" "}
              <span className="text-neutral-800 font-['Lexend:Medium',_sans-serif]">
                Tagalog + English
              </span>
            </div>
            <button className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:SemiBold',_sans-serif] flex items-center gap-1.5">
              <Send size={12} /> Submit Stand-Up
            </button>
          </div>
        </div>

        {/* AI Processing */}
        <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-violet-600" />
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-violet-900">
              AI Processing
            </div>
            {processed && <Chip tone="green">Ready</Chip>}
          </div>

          <div className="space-y-3">
            <div>
              <div className="text-[10px] tracking-wider text-violet-700 uppercase font-['Lexend:SemiBold',_sans-serif] mb-1">
                Transcription (Original)
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-violet-100 text-[12px] text-neutral-800 font-['Lexend:Regular',_sans-serif] italic">
                "Tapos na paving sa Linao, pero delay cement bukas."
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider text-violet-700 uppercase font-['Lexend:SemiBold',_sans-serif] mb-1">
                Official English (For Record)
              </div>
              <div className="bg-white rounded-lg p-2.5 border border-violet-100 text-[12px] text-neutral-900 font-['Lexend:Medium',_sans-serif]">
                Paving of Brgy. Linao road is complete. Cement delivery
                scheduled for tomorrow has been delayed.
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-wider text-violet-700 uppercase font-['Lexend:SemiBold',_sans-serif] mb-1">
                Extracted Signals
              </div>
              <div className="space-y-1.5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-md px-2.5 py-1.5 flex items-center gap-2">
                  <CheckCircle2 size={13} className="text-emerald-600" />
                  <span className="text-[12px] text-emerald-900 font-['Lexend:Medium',_sans-serif]">
                    Completion: Linao paving
                  </span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-md px-2.5 py-1.5 flex items-center gap-2">
                  <AlertTriangle size={13} className="text-red-600" />
                  <span className="text-[12px] text-red-900 font-['Lexend:Medium',_sans-serif]">
                    Blocker: Cement delivery delayed
                  </span>
                  <span className="ml-auto text-[10px] text-red-700">
                    → Alerts Dept. Head
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 19.3 MOBILE & VIBER ====================
function ViberIntegration() {
  const [linked, setLinked] = useState(true);
  const msgs = [
    {
      dir: "in",
      text: "🚨 URGENT: Broken pipe at Plaza. Do you accept?",
      time: "10:42",
    },
    { dir: "out", text: "YES", time: "10:42" },
    {
      dir: "in",
      text: "✅ Task T-411 assigned to you. ETA 20 min.",
      time: "10:43",
    },
  ];
  const syncItems = [
    {
      id: "f1",
      label: "Pothole Before/After · Brgy. Linao",
      size: "3 photos · 4.2 MB",
      progress: 100,
      done: true,
    },
    {
      id: "f2",
      label: "Drainage Inspection Notes",
      size: "Voice memo · 0:47",
      progress: 100,
      done: true,
    },
    {
      id: "f3",
      label: "Water Meter Log · Zone 4",
      size: "CSV · 12 rows",
      progress: 64,
      done: false,
    },
    {
      id: "f4",
      label: "Signage GPS Pins",
      size: "8 coordinates",
      progress: 22,
      done: false,
    },
  ];

  return (
    <div>
      <Header
        title="Mobile & Viber Integration — The Comms Bridge"
        subtitle="Bridge offline field work with the central server. Accept tasks directly from Viber."
        right={
          <Chip tone={linked ? "green" : "neutral"}>
            <MessageCircle size={11} /> {linked ? "Linked" : "Not Linked"}
          </Chip>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Viber Linking */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                Viber Account Linking
              </div>
              <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                Scan with Viber → link to official eFlow Bot
              </div>
            </div>
            <button
              onClick={() => setLinked(!linked)}
              className="text-[11px] text-neutral-600 underline"
            >
              {linked ? "Unlink" : "Simulate Link"}
            </button>
          </div>

          <div className="flex gap-4 items-start">
            <div className="w-36 h-36 rounded-lg border-2 border-neutral-900 bg-white p-2 flex items-center justify-center relative">
              {/* Pseudo QR */}
              <div className="grid grid-cols-10 gap-[1px] w-full h-full">
                {Array.from({ length: 100 }).map((_, i) => {
                  const on =
                    (i * 37) % 7 < 3 ||
                    i < 10 ||
                    i % 10 === 0 ||
                    i % 10 === 9 ||
                    i >= 90;
                  return (
                    <div
                      key={i}
                      className={on ? "bg-neutral-900" : "bg-white"}
                    />
                  );
                })}
              </div>
              <div className="absolute inset-4 bg-white flex items-center justify-center">
                <QrCode size={36} className="text-neutral-900" />
              </div>
            </div>

            {/* Chat preview */}
            <div className="flex-1 bg-[#7360f2]/5 border border-[#7360f2]/20 rounded-lg p-3">
              <div className="text-[10px] tracking-wider text-[#7360f2] uppercase font-['Lexend:SemiBold',_sans-serif] mb-2">
                Viber Bot Preview
              </div>
              <div className="space-y-1.5">
                {msgs.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.dir === "out" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-2.5 py-1.5 rounded-lg text-[11px] font-['Lexend:Regular',_sans-serif] ${m.dir === "out" ? "bg-[#7360f2] text-white" : "bg-white text-neutral-800 border border-neutral-200"}`}
                    >
                      {m.text}
                      <div
                        className={`text-[9px] mt-0.5 ${m.dir === "out" ? "text-white/70" : "text-neutral-400"}`}
                      >
                        {m.time}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="bg-neutral-50 rounded-lg p-2.5 border border-neutral-200">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                Alerts (7d)
              </div>
              <div className="text-[16px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                23
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2.5 border border-neutral-200">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                Accepted
              </div>
              <div className="text-[16px] text-emerald-600 font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                19
              </div>
            </div>
            <div className="bg-neutral-50 rounded-lg p-2.5 border border-neutral-200">
              <div className="text-[10px] text-neutral-500 uppercase tracking-wider">
                Avg. Reply
              </div>
              <div className="text-[16px] text-neutral-900 font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                38s
              </div>
            </div>
          </div>
        </div>

        {/* Offline Sync */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                Remote DB Updates — Offline Sync
              </div>
              <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                Files captured offline sync to the blockchain ledger.
              </div>
            </div>
            <Chip tone="blue">
              <Wifi size={11} /> City Hall Wi-Fi
            </Chip>
          </div>

          <div className="space-y-2.5 mb-3">
            {syncItems.map((f) => (
              <div
                key={f.id}
                className="border border-neutral-200 rounded-lg p-3"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={13} className="text-neutral-500" />
                    <div className="text-[12px] text-neutral-900 font-['Lexend:Medium',_sans-serif]">
                      {f.label}
                    </div>
                  </div>
                  {f.done ? (
                    <Chip tone="green">
                      <ShieldCheck size={11} /> Committed
                    </Chip>
                  ) : (
                    <Chip tone="blue">
                      <CloudUpload size={11} /> Syncing
                    </Chip>
                  )}
                </div>
                <div className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif] mb-1.5">
                  {f.size}
                </div>
                <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${f.done ? "bg-emerald-500" : "bg-blue-500"}`}
                    style={{ width: `${f.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
            <WifiOff size={12} className="text-neutral-400" />
            <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
              Captured while offline at{" "}
              <span className="text-neutral-800 font-['Lexend:Medium',_sans-serif]">
                Brgy. Margen
              </span>{" "}
              · encrypted at rest
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 20.1 LIQUIDATION PORTAL ====================
type Advance = {
  id: string;
  title: string;
  amount: number;
  spent: number;
  daysLeft: number;
  overdue?: boolean;
  daysOverdue?: number;
  linkedTask: string;
  stage: "Active" | "Receipts" | "Review" | "Cleared";
};

const ADVANCES_SEED: Advance[] = [
  {
    id: "CA-2026-041",
    title: "Travel to Cebu · Convention",
    amount: 5000,
    spent: 4200,
    daysLeft: 5,
    linkedTask: "City Engineering Training",
    stage: "Active",
  },
  {
    id: "CA-2026-039",
    title: "Fuel Allowance · Dispatch Truck",
    amount: 3000,
    spent: 2850,
    daysLeft: 12,
    linkedTask: "Drainage Inspection · Zone 4",
    stage: "Receipts",
  },
  {
    id: "CA-2026-037",
    title: "Site Survey Materials · Eco-Park",
    amount: 8000,
    spent: 7600,
    daysLeft: 3,
    linkedTask: "Eco-Park Site Survey",
    stage: "Review",
  },
  {
    id: "CA-2026-031",
    title: "Barangay Outreach · Coastal",
    amount: 4500,
    spent: 4500,
    daysLeft: 0,
    linkedTask: "Coastal Cleanup Drive",
    stage: "Cleared",
  },
  {
    id: "CA-2026-012",
    title: "Travel · Tacloban Audit",
    amount: 6500,
    spent: 0,
    daysLeft: -2,
    overdue: true,
    daysOverdue: 32,
    linkedTask: "Regional Audit Liaison",
    stage: "Active",
  },
];

function peso(n: number) {
  return `₱${n.toLocaleString("en-PH")}`;
}

function LiquidationPortal() {
  const [cards, setCards] = useState(ADVANCES_SEED);
  const [selectedId, setSelectedId] = useState<string | null>("CA-2026-041");
  const selected = cards.find((c) => c.id === selectedId) || null;
  const [spent, setSpent] = useState<string>(
    selected ? String(selected.spent) : "",
  );
  const [receipts, setReceipts] = useState<
    {
      vendor: string;
      tin: string;
      or: string;
      amount: number;
      matched: boolean;
    }[]
  >([
    {
      vendor: "Jollibee SM Cebu",
      tin: "000-948-221-000",
      or: "OR-884123",
      amount: 420,
      matched: true,
    },
    {
      vendor: "Grab PH",
      tin: "008-117-556-000",
      or: "TR-29938",
      amount: 780,
      matched: true,
    },
  ]);
  const [scanning, setScanning] = useState(false);

  React.useEffect(() => {
    if (selected) setSpent(String(selected.spent));
  }, [selectedId]);

  const spentNum = Math.max(0, parseFloat(spent || "0"));
  const toReturn = selected ? Math.max(0, selected.amount - spentNum) : 0;
  const overspend = selected ? Math.max(0, spentNum - selected.amount) : 0;

  const stages: Advance["stage"][] = [
    "Active",
    "Receipts",
    "Review",
    "Cleared",
  ];
  const stageTone: Record<Advance["stage"], string> = {
    Active: "border-t-blue-500",
    Receipts: "border-t-amber-500",
    Review: "border-t-violet-500",
    Cleared: "border-t-emerald-500",
  };

  const doScan = () => {
    setScanning(true);
    setTimeout(() => {
      setReceipts([
        ...receipts,
        {
          vendor: "Mercury Drug · Ayala",
          tin: "001-557-339-000",
          or: "OR-772119",
          amount: 315,
          matched: true,
        },
      ]);
      setScanning(false);
    }, 1500);
  };

  return (
    <div>
      <Header
        title="Expense & Liquidation Submission"
        subtitle="Clear your cash advances before the deadline. The system does the math for you."
        right={
          <Chip tone="red">
            <ShieldAlert size={11} /> 1 Overdue · Salary Hold Risk
          </Chip>
        }
      />

      <div
        className={`grid gap-4 ${selected ? "grid-cols-1 xl:grid-cols-[1fr_420px]" : "grid-cols-1"}`}
      >
        {/* Kanban */}
        <div className="grid grid-cols-4 gap-3">
          {stages.map((s) => {
            const items = cards.filter((c) => c.stage === s);
            return (
              <div
                key={s}
                className={`bg-neutral-50 border-t-[3px] ${stageTone[s]} border border-neutral-200 rounded-lg p-2 min-h-[420px]`}
              >
                <div className="flex items-center justify-between px-1 mb-2">
                  <div className="text-[11px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-wider text-neutral-800">
                    {s}
                  </div>
                  <span className="text-[10px] bg-white border border-neutral-200 rounded-full px-1.5 tabular-nums text-neutral-500">
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((c) => {
                    const pct = Math.min(100, (c.spent / c.amount) * 100);
                    const isSel = selectedId === c.id;
                    const urgent = c.daysLeft <= 3 && !c.overdue;
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`w-full text-left bg-white border rounded-lg p-2.5 hover:shadow-sm transition ${isSel ? "border-indigo-300 ring-1 ring-indigo-200" : c.overdue ? "border-red-300" : "border-neutral-200"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-neutral-400">
                            {c.id}
                          </span>
                          {c.overdue ? (
                            <Chip tone="red">
                              <AlertTriangle size={10} /> Overdue{" "}
                              {c.daysOverdue}d
                            </Chip>
                          ) : urgent ? (
                            <Chip tone="amber">
                              <Clock size={10} /> {c.daysLeft}d left
                            </Chip>
                          ) : c.stage === "Cleared" ? (
                            <Chip tone="green">
                              <CheckCircle2 size={10} /> Cleared
                            </Chip>
                          ) : (
                            <Chip tone="blue">
                              <Clock size={10} /> {c.daysLeft}d left
                            </Chip>
                          )}
                        </div>
                        <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug">
                          {c.title}
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                          <span className="flex items-center gap-1">
                            <Link2 size={10} /> {c.linkedTask}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${c.overdue ? "bg-red-500" : pct >= 90 ? "bg-emerald-500" : "bg-blue-500"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] tabular-nums text-neutral-600">
                          <span className="font-['Lexend:Medium',_sans-serif]">
                            {peso(c.spent)} / {peso(c.amount)}
                          </span>
                          <span className="text-neutral-400">
                            {Math.round(pct)}%
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Side panel */}
        {selected && (
          <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden self-start">
            <div className="p-4 border-b border-neutral-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-neutral-400">
                  {selected.id}
                </span>
                <Chip tone={selected.overdue ? "red" : "blue"}>
                  {selected.overdue
                    ? `Overdue ${selected.daysOverdue}d`
                    : `${selected.daysLeft} Days Left`}
                </Chip>
              </div>
              <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {selected.title}
              </div>
              <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif] flex items-center gap-1 mt-0.5">
                <Link2 size={11} /> {selected.linkedTask}
              </div>
            </div>

            <div className="p-4 space-y-4">
              {/* Auto-math */}
              <div>
                <div className="text-[10px] tracking-wider text-neutral-400 uppercase font-['Lexend:SemiBold',_sans-serif] mb-2">
                  Auto-Math Engine
                </div>
                <div className="space-y-2">
                  <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 flex items-center justify-between opacity-90">
                    <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                      <Lock size={11} /> Original Advance (Locked)
                    </div>
                    <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">
                      {peso(selected.amount)}
                    </div>
                  </div>
                  <label className="block">
                    <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1">
                      Exact Spent Amount (₱)
                    </div>
                    <input
                      type="number"
                      value={spent}
                      onChange={(e) => setSpent(e.target.value)}
                      className="w-full h-[36px] px-3 border border-neutral-300 rounded-md text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums focus:outline-none focus:border-neutral-500"
                    />
                  </label>
                  <div
                    className={`border rounded-lg p-3 flex items-center justify-between ${overspend > 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Calculator
                        size={13}
                        className={
                          overspend > 0 ? "text-red-700" : "text-emerald-700"
                        }
                      />
                      <div
                        className={`text-[11px] font-['Lexend:Medium',_sans-serif] ${overspend > 0 ? "text-red-800" : "text-emerald-800"}`}
                      >
                        {overspend > 0
                          ? "Over-spent · Reimbursement Due"
                          : "Amount to Return to Treasury"}
                      </div>
                    </div>
                    <div
                      className={`text-[20px] font-['Lexend:SemiBold',_sans-serif] tabular-nums ${overspend > 0 ? "text-red-700" : "text-emerald-700"}`}
                    >
                      {peso(overspend > 0 ? overspend : toReturn)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Receipt Upload */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] tracking-wider text-neutral-400 uppercase font-['Lexend:SemiBold',_sans-serif]">
                    Official Receipts (OR/AR)
                  </div>
                  <button
                    onClick={doScan}
                    disabled={scanning}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-900 text-white rounded-md text-[11px] font-['Lexend:SemiBold',_sans-serif] disabled:opacity-60"
                  >
                    <Scan size={11} />{" "}
                    {scanning ? "Scanning…" : "Scan Official Receipt"}
                  </button>
                </div>
                {scanning && (
                  <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-center gap-2 mb-2">
                    <Sparkles
                      size={14}
                      className="text-violet-600 animate-pulse"
                    />
                    <div className="text-[11px] text-violet-900 font-['Lexend:Medium',_sans-serif]">
                      OCR extracting Vendor · TIN · OR Number · Amount…
                    </div>
                  </div>
                )}
                <div className="space-y-1.5">
                  {receipts.map((r, i) => (
                    <div
                      key={i}
                      className="border border-neutral-200 rounded-lg p-2.5 flex items-start gap-2"
                    >
                      <Receipt size={14} className="text-neutral-500 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                            {r.vendor}
                          </div>
                          <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">
                            {peso(r.amount)}
                          </div>
                        </div>
                        <div className="text-[10px] text-neutral-500 font-mono">
                          TIN {r.tin} · {r.or}
                        </div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Chip tone="purple">
                            <Sparkles size={10} /> OCR Auto-fill
                          </Chip>
                          {r.matched && (
                            <Chip tone="green">
                              <FileCheck2 size={10} /> Matched & Attached
                            </Chip>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                <button className="flex-1 h-[34px] rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:SemiBold',_sans-serif] flex items-center justify-center gap-1.5">
                  <Send size={12} /> Submit Liquidation
                </button>
                <button
                  onClick={() => setSelectedId(null)}
                  className="h-[34px] px-3 rounded-lg border border-neutral-200 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 20.2 CASH ADVANCE REQUESTS ====================
const EMPLOYEE_TASKS = [
  { id: "T-402", name: "Inspect Market Drainage — Alley B" },
  { id: "T-407", name: "Streetlight Replacement — Plaza Node 12" },
  { id: "T-418", name: "Water Meter Audit — Zone 4" },
  { id: "T-512", name: "Eco-Park Site Survey" },
];

function CashAdvanceRequests() {
  const hasOverdue = true;
  const overdueId = "CA-2026-012";
  const overdueAge = 32;

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [amount, setAmount] = useState("");
  const [task, setTask] = useState("");
  const [purpose, setPurpose] = useState("");

  const amt = Math.max(0, parseFloat(amount || "0"));

  return (
    <div>
      <Header
        title="Cash Advance Requests — The Front Door"
        subtitle="Request funds tied to an authorized LGU activity. Every peso must link to a task."
        right={
          <div className="relative inline-block">
            <button
              disabled={hasOverdue}
              onClick={() => !hasOverdue && setOpen(true)}
              onMouseEnter={() => setHover(true)}
              onMouseLeave={() => setHover(false)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] ${hasOverdue ? "bg-neutral-200 text-neutral-400 cursor-not-allowed" : "bg-neutral-900 text-white hover:bg-neutral-800"}`}
            >
              {hasOverdue ? <Lock size={12} /> : <Plus size={12} />} Cash
              Advance Request
            </button>
            {hasOverdue && hover && (
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-[280px] bg-red-600 text-white rounded-lg shadow-xl p-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert size={14} className="mt-0.5 shrink-0" />
                  <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] leading-relaxed">
                    <strong className="font-['Lexend:SemiBold',_sans-serif]">
                      Access Locked:
                    </strong>{" "}
                    You have an overdue liquidation ({overdueId}, {overdueAge}{" "}
                    days old). Clear your previous advance to unlock new
                    requests.
                  </div>
                </div>
                <div className="absolute -top-1 right-5 w-2 h-2 bg-red-600 rotate-45" />
              </div>
            )}
          </div>
        }
      />

      {/* COA Shield Banner */}
      {hasOverdue && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center shrink-0">
            <ShieldAlert size={18} className="text-red-700" />
          </div>
          <div className="flex-1">
            <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-red-900">
              COA Shield Triggered — New Advances Blocked
            </div>
            <div className="text-[11.5px] text-red-800 font-['Lexend:Regular',_sans-serif] mt-0.5 leading-relaxed">
              Per COA Circular 97-002, you cannot receive a new cash advance
              while holding an unliquidated advance older than 30 days. Overdue:{" "}
              <strong>{overdueId} · ₱6,500 · Travel · Tacloban Audit</strong> (
              {overdueAge} days old).
            </div>
          </div>
          <button className="px-3 py-2 rounded-lg bg-red-600 text-white text-[11.5px] font-['Lexend:SemiBold',_sans-serif] flex items-center gap-1.5 shrink-0">
            <Wallet size={12} /> Clear {overdueId}
          </button>
        </div>
      )}

      {/* Eligibility checklist */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        {[
          {
            ok: false,
            label: "No unliquidated advance >30 days",
            detail: `${overdueId} blocking`,
          },
          {
            ok: true,
            label: "Linked to active GA-assigned task",
            detail: `${EMPLOYEE_TASKS.length} tasks available`,
          },
          {
            ok: true,
            label: "Department budget available",
            detail: "₱ 412,000 remaining",
          },
        ].map((e, i) => (
          <div
            key={i}
            className={`border rounded-lg p-3 ${e.ok ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}
          >
            <div className="flex items-start gap-2">
              {e.ok ? (
                <CheckCircle2 size={14} className="text-emerald-700 mt-0.5" />
              ) : (
                <AlertTriangle size={14} className="text-red-700 mt-0.5" />
              )}
              <div>
                <div
                  className={`text-[11.5px] font-['Lexend:Medium',_sans-serif] ${e.ok ? "text-emerald-900" : "text-red-900"}`}
                >
                  {e.label}
                </div>
                <div
                  className={`text-[10.5px] font-['Lexend:Regular',_sans-serif] ${e.ok ? "text-emerald-700" : "text-red-700"}`}
                >
                  {e.detail}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Historical */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-neutral-200 bg-neutral-50 text-[11px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-wider text-neutral-600">
          My Advance History
        </div>
        <div className="grid grid-cols-[110px_1fr_140px_120px_110px] gap-2 px-4 py-2 border-b border-neutral-100 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
          <div>ID</div>
          <div>Purpose</div>
          <div>Linked Task</div>
          <div className="text-right">Amount</div>
          <div className="text-right">Status</div>
        </div>
        {[
          {
            id: "CA-2026-041",
            purpose: "Travel to Cebu · Convention",
            task: "City Engineering Training",
            amt: 5000,
            status: "Active",
            tone: "blue" as const,
          },
          {
            id: "CA-2026-039",
            purpose: "Fuel Allowance · Dispatch Truck",
            task: "Drainage Inspection Z4",
            amt: 3000,
            status: "Receipts",
            tone: "amber" as const,
          },
          {
            id: "CA-2026-037",
            purpose: "Site Survey Materials",
            task: "Eco-Park Site Survey",
            amt: 8000,
            status: "Under Review",
            tone: "purple" as const,
          },
          {
            id: "CA-2026-031",
            purpose: "Barangay Outreach",
            task: "Coastal Cleanup Drive",
            amt: 4500,
            status: "Cleared",
            tone: "green" as const,
          },
          {
            id: "CA-2026-012",
            purpose: "Travel · Tacloban Audit",
            task: "Regional Audit Liaison",
            amt: 6500,
            status: "OVERDUE 32d",
            tone: "red" as const,
          },
        ].map((r) => (
          <div
            key={r.id}
            className="grid grid-cols-[110px_1fr_140px_120px_110px] gap-2 px-4 py-2.5 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50/60"
          >
            <div className="text-[10.5px] font-mono text-neutral-500">
              {r.id}
            </div>
            <div className="text-[12px] text-neutral-900 font-['Lexend:Medium',_sans-serif]">
              {r.purpose}
            </div>
            <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif] truncate">
              {r.task}
            </div>
            <div className="text-[12px] text-neutral-900 font-['Lexend:Medium',_sans-serif] tabular-nums text-right">
              {peso(r.amt)}
            </div>
            <div className="flex justify-end">
              <Chip tone={r.tone}>{r.status}</Chip>
            </div>
          </div>
        ))}
      </div>

      {/* Request Modal */}
      {open && (
        <>
          <div
            className="fixed inset-0 bg-neutral-900/40 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[540px] bg-white border border-neutral-200 rounded-xl shadow-2xl">
            <div className="p-5 border-b border-neutral-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] tracking-wider text-neutral-400 uppercase font-['Lexend:SemiBold',_sans-serif]">
                  New Request
                </div>
                <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                  Cash Advance Request
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-neutral-400 hover:text-neutral-700"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-3">
              <label className="block">
                <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1">
                  Amount Requested (₱)
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full h-[36px] px-3 border border-neutral-300 rounded-md text-[13px] font-['Lexend:Medium',_sans-serif] tabular-nums"
                  placeholder="0.00"
                />
              </label>
              <label className="block">
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600">
                    Linked Task (Required)
                  </div>
                  <Chip tone="purple">
                    <Bot size={10} /> GA-Assigned Only
                  </Chip>
                </div>
                <select
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  className="w-full h-[36px] px-2 border border-neutral-300 rounded-md text-[12.5px] font-['Lexend:Regular',_sans-serif] bg-white"
                >
                  <option value="">— Choose an active assigned task —</option>
                  {EMPLOYEE_TASKS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.id} · {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1">
                  Purpose / Justification
                </div>
                <textarea
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md text-[12.5px] font-['Lexend:Regular',_sans-serif] resize-none"
                  placeholder="Describe how this advance supports the task…"
                />
              </label>

              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1">
                  Approval Chain Preview
                </div>
                <div className="flex items-center gap-2 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
                  <span>You</span>
                  <ChevronRight size={11} />
                  <span>Dept. Head</span>
                  <ChevronRight size={11} />
                  <span>Finance ORS</span>
                  <ChevronRight size={11} />
                  <span>Release</span>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="h-[34px] px-3 rounded-lg border border-neutral-200 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                disabled={!amt || !task}
                className="h-[34px] px-4 rounded-lg bg-neutral-900 text-white text-[11.5px] font-['Lexend:SemiBold',_sans-serif] disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={11} /> Submit Request
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ==================== 21.1 TEAM PROGRESS ====================
function ProgressRing({
  value,
  size = 180,
  color = "#10b981",
}: {
  value: number;
  size?: number;
  color?: string;
}) {
  const R = (size - 20) / 2;
  const C = 2 * Math.PI * R;
  const dash = (value / 100) * C;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={R}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="10"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${dash} ${C}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%"
        y="48%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Lexend"
        fontWeight="600"
        fontSize="32"
        fill="#111827"
      >
        {value}%
      </text>
      <text
        x="50%"
        y="62%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontFamily="Lexend"
        fontSize="10"
        fill="#6b7280"
        letterSpacing="2"
      >
        COMPLETE
      </text>
    </svg>
  );
}

function TeamProgress() {
  const milestones = [
    { label: "Land Clearing", done: true, date: "Jan 2026" },
    { label: "Foundation & Base Works", done: true, date: "Mar 2026" },
    {
      label: "Concrete Pouring · Phase 1",
      done: false,
      current: true,
      date: "Apr 28",
    },
    { label: "Landscaping & Planting", done: false, date: "Jul 2026" },
    { label: "Public Opening", done: false, date: "Sep 30, 2026" },
  ];

  const norms = [
    {
      icon: <Trophy size={18} className="text-amber-600" />,
      label: "Cash Advance Clearance",
      pct: 92,
      short: 3,
      tone: "amber",
      copy: "92% of the Engineering Department has cleared their cash advances this week! You are one of the last 3 people needed to help your department reach 100%.",
    },
    {
      icon: <FileCheck2 size={18} className="text-emerald-600" />,
      label: "On-Time Stand-Up Submissions",
      pct: 87,
      short: 5,
      tone: "green",
      copy: "87% of your teammates submitted today's stand-up before noon. Join them — your update helps the Dept. Head plan tomorrow.",
    },
    {
      icon: <ShieldCheck size={18} className="text-blue-600" />,
      label: "Safety Checklist Compliance",
      pct: 96,
      short: 2,
      tone: "blue",
      copy: "Almost there! 96% of City Engineering has completed the pre-shift safety checklist. 2 more teammates — you can help close the gap.",
    },
  ];

  return (
    <div>
      <Header
        title="Team Progress — The Motivation Engine"
        subtitle="See how your daily work builds the city. Civic pride, not punitive metrics."
        right={
          <Chip tone="purple">
            <Heart size={11} /> Social Norming Active
          </Chip>
        }
      />

      {/* Hero goal */}
      <div className="relative bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-2xl p-6 overflow-hidden mb-5">
        <div className="absolute inset-0 opacity-10">
          <svg
            className="w-full h-full"
            viewBox="0 0 400 200"
            preserveAspectRatio="none"
          >
            <circle cx="50" cy="50" r="80" fill="white" />
            <circle cx="350" cy="160" r="60" fill="white" />
          </svg>
        </div>
        <div className="relative grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 items-center">
          <div className="flex justify-center">
            <div className="bg-white rounded-full p-3 shadow-xl">
              <ProgressRing value={62} size={180} color="#10b981" />
            </div>
          </div>
          <div className="text-white">
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-widest text-white/80 mb-1 flex items-center gap-2">
              <Target size={11} /> Mayor's Priority Initiative
            </div>
            <h2 className="text-[24px] font-['Lexend:SemiBold',_sans-serif] leading-tight">
              Ormoc Eco-Park Launch — Phase 1
            </h2>
            <p className="text-[13px] text-white/90 font-['Lexend:Regular',_sans-serif] mt-1 leading-relaxed">
              A 12-hectare coastal park that will become the centerpiece of the
              City-Wide Eco-Tourism Initiative. Every task you complete moves
              this closer to opening day.
            </p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                <div className="text-[10px] uppercase tracking-wider text-white/80 font-['Lexend:Medium',_sans-serif]">
                  Your Team's Contribution
                </div>
                <div className="text-[22px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                  145
                </div>
                <div className="text-[10.5px] text-white/80">
                  tasks completed this quarter
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                <div className="text-[10px] uppercase tracking-wider text-white/80 font-['Lexend:Medium',_sans-serif]">
                  Your Personal
                </div>
                <div className="text-[22px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                  18
                </div>
                <div className="text-[10.5px] text-white/80">
                  tasks · 6 on Eco-Park
                </div>
              </div>
              <div className="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                <div className="text-[10px] uppercase tracking-wider text-white/80 font-['Lexend:Medium',_sans-serif]">
                  Projected Opening
                </div>
                <div className="text-[22px] font-['Lexend:SemiBold',_sans-serif]">
                  Sep 30
                </div>
                <div className="text-[10.5px] text-white/80">
                  on schedule · thanks to you
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Milestones timeline */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              Team Milestones
            </div>
            <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
              2 of 5 complete · next up this month
            </div>
          </div>
          <Chip tone="green">
            <Flame size={11} /> 3-week streak
          </Chip>
        </div>
        <div className="relative">
          <div className="absolute top-[14px] left-3 right-3 h-0.5 bg-neutral-200" />
          <div
            className="absolute top-[14px] left-3 h-0.5 bg-emerald-500"
            style={{ width: "42%" }}
          />
          <div className="relative grid grid-cols-5 gap-2">
            {milestones.map((m, i) => (
              <div key={i} className="text-center">
                <div
                  className={`mx-auto w-7 h-7 rounded-full border-2 flex items-center justify-center ${m.done ? "bg-emerald-500 border-emerald-500" : m.current ? "bg-white border-emerald-500 ring-2 ring-emerald-200 animate-pulse" : "bg-white border-neutral-300"}`}
                >
                  {m.done ? (
                    <CheckCircle2 size={14} className="text-white" />
                  ) : m.current ? (
                    <Flame size={12} className="text-emerald-600" />
                  ) : (
                    <Circle size={10} className="text-neutral-400" />
                  )}
                </div>
                <div
                  className={`mt-2 text-[11px] font-['Lexend:Medium',_sans-serif] ${m.current ? "text-emerald-700" : m.done ? "text-neutral-700" : "text-neutral-500"}`}
                >
                  {m.label}
                </div>
                <div className="text-[9.5px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">
                  {m.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Social Norming */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-5">
        {norms.map((n, i) => {
          const toneMap: Record<string, string> = {
            amber: "bg-amber-50 border-amber-200",
            green: "bg-emerald-50 border-emerald-200",
            blue: "bg-blue-50 border-blue-200",
          };
          const barMap: Record<string, string> = {
            amber: "bg-amber-500",
            green: "bg-emerald-500",
            blue: "bg-blue-500",
          };
          return (
            <div key={i} className={`${toneMap[n.tone]} border rounded-xl p-4`}>
              <div className="flex items-center gap-2 mb-2">
                {n.icon}
                <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                  {n.label}
                </div>
              </div>
              <div className="flex items-end gap-2 mb-2">
                <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums leading-none">
                  {n.pct}%
                </div>
                <div className="text-[11px] text-neutral-600 font-['Lexend:Regular',_sans-serif] pb-1">
                  of department
                </div>
              </div>
              <div className="h-1.5 bg-white rounded-full overflow-hidden border border-neutral-200 mb-2">
                <div
                  className={`h-full ${barMap[n.tone]}`}
                  style={{ width: `${n.pct}%` }}
                />
              </div>
              <p className="text-[11.5px] text-neutral-700 font-['Lexend:Regular',_sans-serif] leading-relaxed">
                {n.copy}
              </p>
              <button className="mt-2 w-full py-1.5 bg-white border border-neutral-200 rounded-md text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 hover:bg-neutral-50 flex items-center justify-center gap-1">
                <ThumbsUp size={11} /> Help close the gap
              </button>
            </div>
          );
        })}
      </div>

      {/* Badges strip */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              Recognition Wall
            </div>
            <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
              Earned by your whole team — we rise together
            </div>
          </div>
          <Chip tone="purple">
            <Award size={11} /> 7 shared badges
          </Chip>
        </div>
        <div className="grid grid-cols-4 md:grid-cols-7 gap-2">
          {[
            {
              label: "Zero Late Liquidations",
              icon: <ShieldCheck size={18} />,
              tone: "bg-emerald-100 text-emerald-700",
            },
            {
              label: "Safety Streak · 30d",
              icon: <Heart size={18} />,
              tone: "bg-rose-100 text-rose-700",
            },
            {
              label: "On-Time Stand-Ups",
              icon: <Star size={18} />,
              tone: "bg-amber-100 text-amber-700",
            },
            {
              label: "First Responders",
              icon: <Flame size={18} />,
              tone: "bg-red-100 text-red-700",
            },
            {
              label: "Community Favorite",
              icon: <Users size={18} />,
              tone: "bg-blue-100 text-blue-700",
            },
            {
              label: "Eco-Champions",
              icon: <Trophy size={18} />,
              tone: "bg-teal-100 text-teal-700",
            },
            {
              label: "Mentor of the Month",
              icon: <BookOpen size={18} />,
              tone: "bg-violet-100 text-violet-700",
            },
          ].map((b, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center gap-1 p-2 rounded-lg border border-neutral-100 hover:border-neutral-300 transition"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${b.tone}`}
              >
                {b.icon}
              </div>
              <div className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-700 leading-tight">
                {b.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 21.2 AGENTIC AI COACHING ====================
function AICoaching() {
  const [step, setStep] = useState(2);
  const [messages, setMessages] = useState([
    {
      from: "ai",
      text: "Hi, Kuya Arnel. 👋 I noticed you've been on the Leave Request form for a few minutes. Need a hand?",
    },
    { from: "user", text: "Oo, di ko alam san magsimula." },
    {
      from: "ai",
      text: "No worries. Just tap the 🎤 below and tell me in Bisaya or Tagalog what days you need off. I'll fill out the whole form for you and show it to you before we submit.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [listening, setListening] = useState(false);

  const send = (t?: string) => {
    const body = (t ?? draft).trim();
    if (!body) return;
    setMessages([
      ...messages,
      { from: "user", text: body },
      {
        from: "ai",
        text: "Got it. Drafting your form now… I'll ping you if I need clarification.",
      },
    ]);
    setDraft("");
  };

  const wizardSteps = [
    { label: "Capture receipt", done: true },
    { label: "OCR vendor & TIN", done: true },
    { label: "Re-scan blurry TIN", done: false, active: true },
    { label: "Auto-match to advance", done: false },
    { label: "Submit liquidation", done: false },
  ];

  return (
    <div>
      <Header
        title="Agentic AI Coaching — The Digital Mentor"
        subtitle="A patient, bilingual assistant that does the heavy lifting. No judgment, no jargon."
        right={
          <Chip tone="purple">
            <Sparkles size={11} /> Always-on · Tagalog · Bisaya · English
          </Chip>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-4">
        {/* Workflow Guidance Chat */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden flex flex-col min-h-[520px]">
          <div className="px-4 py-3 border-b border-neutral-200 bg-gradient-to-r from-violet-50 to-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles size={14} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-[12.5px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                eFlow Kuya — Workflow Guidance
              </div>
              <div className="text-[10.5px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                Detected: Leave Request form · idle 3m
              </div>
            </div>
            <Chip tone="green">Online</Chip>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-neutral-50/40">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.from === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.from === "ai" && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mr-2 shrink-0">
                    <Sparkles size={11} className="text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] px-3 py-2 rounded-2xl text-[12.5px] font-['Lexend:Regular',_sans-serif] leading-relaxed ${m.from === "user" ? "bg-neutral-900 text-white rounded-br-sm" : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm"}`}
                >
                  {m.text}
                </div>
              </div>
            ))}

            {/* Suggested actions */}
            <div className="flex flex-wrap gap-1.5 mt-1 ml-9">
              {[
                "File sick leave today",
                "Vacation leave next week",
                "Half-day this afternoon",
              ].map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="px-2.5 py-1 rounded-full bg-white border border-violet-200 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-violet-700 hover:bg-violet-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-neutral-200 p-3 flex items-center gap-2">
            <button
              onClick={() => setListening(!listening)}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${listening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-900 text-white"}`}
              title="Hold to speak"
            >
              <Mic size={14} />
            </button>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") send();
              }}
              placeholder="Type or speak in Tagalog, Bisaya, or English…"
              className="flex-1 h-9 px-3 border border-neutral-200 rounded-full text-[12.5px] font-['Lexend:Regular',_sans-serif] focus:outline-none focus:border-neutral-400"
            />
            <button
              onClick={() => send()}
              className="w-9 h-9 rounded-full bg-neutral-900 text-white flex items-center justify-center"
            >
              <Send size={13} />
            </button>
          </div>
        </div>

        {/* Liquidation Wizard */}
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                Liquidation Report Help
              </div>
              <div className="text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                Step-by-step wizard · no cold errors
              </div>
            </div>
            <Chip tone="amber">
              <HelpCircle size={11} /> Step {step + 1} of {wizardSteps.length}
            </Chip>
          </div>

          {/* Step nav */}
          <div className="flex items-center gap-1 mb-4">
            {wizardSteps.map((w, i) => (
              <React.Fragment key={i}>
                <div
                  className={`flex-1 h-1.5 rounded-full ${w.done ? "bg-emerald-500" : w.active ? "bg-amber-500" : "bg-neutral-200"}`}
                />
              </React.Fragment>
            ))}
          </div>

          {/* Blurry receipt card */}
          <div className="relative rounded-xl border-2 border-dashed border-amber-300 bg-amber-50/50 p-4 mb-3">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-amber-900 uppercase tracking-wider flex items-center gap-1">
                <Camera size={12} /> Receipt Preview
              </div>
              <Chip tone="amber">Partial OCR match</Chip>
            </div>

            <div className="relative h-44 bg-white rounded-lg border border-amber-200 overflow-hidden mb-3 flex items-center justify-center">
              {/* fake receipt */}
              <div className="absolute inset-4 bg-gradient-to-b from-neutral-50 to-neutral-100 rounded shadow-inner p-3 text-[9px] text-neutral-600 font-mono leading-tight">
                <div className="text-center font-bold text-[11px] mb-1">
                  MERCURY DRUG · AYALA BR.
                </div>
                <div className="flex justify-between">
                  <span>Vendor:</span>
                  <span>Mercury Drug Corp.</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>TIN:</span>
                  <span className="relative inline-block">
                    <span className="blur-[3px] select-none">
                      001-557-33?-000
                    </span>
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>OR No:</span>
                  <span>OR-772119</span>
                </div>
                <div className="flex justify-between">
                  <span>Date:</span>
                  <span>Apr 19, 2026</span>
                </div>
                <div className="h-px bg-neutral-300 my-1" />
                <div className="flex justify-between">
                  <span>Amount:</span>
                  <span>₱ 315.00</span>
                </div>
              </div>
              {/* Highlight on blurry TIN */}
              <div className="absolute top-[78px] right-[56px] w-[110px] h-5 border-2 border-red-500 rounded animate-pulse pointer-events-none" />
            </div>

            <div className="bg-white border border-amber-200 rounded-lg p-3 flex items-start gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles size={12} className="text-white" />
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-relaxed">
                  I can't quite read the <strong>Vendor TIN</strong> on this
                  receipt. Can you hold the camera a little steadier and snap it
                  one more time? The TIN is usually at the{" "}
                  <strong>top right</strong>.
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onClick={() =>
                      setStep(Math.min(wizardSteps.length - 1, step + 1))
                    }
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-neutral-900 text-white rounded-md text-[11px] font-['Lexend:SemiBold',_sans-serif]"
                  >
                    <RotateCw size={11} /> Re-scan TIN Area
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50">
                    <Volume2 size={11} /> Play instructions
                  </button>
                  <button className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-neutral-200 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50">
                    Enter manually
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Digital Literacy tip */}
          <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 flex items-start gap-2">
            <BookOpen size={14} className="text-violet-700 mt-0.5" />
            <div>
              <div className="text-[11.5px] font-['Lexend:SemiBold',_sans-serif] text-violet-900">
                Digital Literacy Tip
              </div>
              <div className="text-[11px] text-violet-800 font-['Lexend:Regular',_sans-serif] leading-relaxed">
                Good lighting beats a steady hand. Place the receipt flat on a
                table near a window before scanning — the AI will handle the
                rest.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating AI button */}
      <button className="fixed bottom-6 right-6 z-40 h-12 pl-3 pr-4 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-xl shadow-indigo-500/30 flex items-center gap-2 hover:scale-105 transition">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles size={15} />
        </div>
        <span className="text-[12.5px] font-['Lexend:SemiBold',_sans-serif]">
          AI Help
        </span>
      </button>
    </div>
  );
}

// ==================== TASK BOARD ====================

export function EmployeeTaskBoard() {
  const [tasks, setTasks] = useState<Task[]>([]);

  // Demo employee from the live Firebase seed data
  const employeeId = "emp_004";

  useEffect(() => {
    seedTasksIfEmpty();

    const unsubscribe = subscribeToTasks((data) => {
      // Filter to only show tasks assigned to this employee
      const myTasks = data.filter((t) => t.assigneeId === employeeId);
      setTasks(myTasks);
    });
    return () => unsubscribe();
  }, []);

  const handleExecute = (taskId: string) =>
    updateTaskStatus(taskId, "in_progress");
  const handleSubmit = (taskId: string) =>
    updateTaskStatus(taskId, "for_review");

  return (
    <div className="p-8 h-full bg-neutral-50">
      <MondayBoard
        tasks={tasks}
        role="employee"
        onExecute={handleExecute}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// ==================== ROUTER ====================
export const employeePages: Record<
  string,
  Record<string, React.ComponentType>
> = {
  workspace: {
    "Active Tasks": EmployeeTaskBoard,
    "GA-Delegated Assignments": EmployeeTaskBoard,
    "Context-Aware Reminders": ActiveTasks,
    "One-Tap Complete": ActiveTasks,
    "Daily Stand-Up Input": DailyStandUp,
    "Text Update": DailyStandUp,
    "Voice Note": DailyStandUp,
    "Auto-Transcription": DailyStandUp,
    "Mobile & Viber Integration": ViberIntegration,
    "Viber Account Linking": ViberIntegration,
    "Keyword Notifications": ViberIntegration,
    "Remote DB Updates": ViberIntegration,
  },
  empfin: {
    "Expense & Liquidation Submission": LiquidationPortal,
    "Exact Spent Amount": LiquidationPortal,
    "Receipt Upload (OR/AR)": LiquidationPortal,
    "Remaining Budget Calc": LiquidationPortal,
    "Cash Advance Requests": CashAdvanceRequests,
  },
  achievement: {
    "Departmental Goals": TeamProgress,
    "Team Milestones": TeamProgress,
    "Compliance Metrics": TeamProgress,
    "Social Norming Stats": TeamProgress,
    "Agentic AI Coaching": AICoaching,
    "Workflow Guidance": AICoaching,
    "Liquidation Report Help": AICoaching,
    "Digital Literacy Support": AICoaching,
  },
};

export const employeeDefaultPages: Record<string, string> = {
  workspace: "Active Tasks",
  empfin: "Expense & Liquidation Submission",
  achievement: "Departmental Goals",
};

export function EmployeeContent({
  activeSection,
  activePage,
}: {
  activeSection: string;
  activePage?: string;
}) {
  const section = employeePages[activeSection];
  if (!section) {
    return (
      <div className="h-full flex items-center justify-center text-center text-neutral-400">
        <div>
          <Settings size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">
            Content coming soon
          </p>
          <p className="text-[12px] mt-1">Section: {activeSection}</p>
        </div>
      </div>
    );
  }
  const pageKey =
    activePage && section[activePage]
      ? activePage
      : employeeDefaultPages[activeSection];
  const Page = section[pageKey] || Object.values(section)[0];
  return <Page />;
}

export default EmployeeContent;
