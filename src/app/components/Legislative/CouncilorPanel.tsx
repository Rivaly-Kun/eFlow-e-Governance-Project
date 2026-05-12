import React, { useState } from "react";
import {
  CheckmarkOutline,
  Time,
  ChevronRight,
  Locked,
  Flag,
} from "@carbon/icons-react";
import { Tablet, PenTool, BookOpen, Clock, AlertCircle, CheckCircle, StickyNote, Shield, Eye, EyeOff, ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";

// ==================== TYPES ====================
interface TaskCard {
  id: string;
  priority: "urgent" | "review" | "info";
  type: "Floor Vote" | "Committee Action" | "Reading Material";
  title: string;
  subtitle: string;
  timeInfo?: string;
}

interface DocNote {
  id: string;
  text: string;
  timestamp: string;
}

// ==================== MOCK DATA ====================
const mockCouncilor = {
  name: "Hon. Maria Elena D. Santos",
  title: "City Councilor, District II",
};

const mockTasks: TaskCard[] = [
  {
    id: "t1",
    priority: "urgent",
    type: "Floor Vote",
    title: "Resolution #402 — Supplemental Budget for Disaster Risk Reduction",
    subtitle: "Requires 2/3 majority vote",
    timeInfo: "Starts in 10 mins",
  },
  {
    id: "t2",
    priority: "review",
    type: "Committee Action",
    title: "Draft: Eco-Park Tourism Development Guidelines",
    subtitle: "Committee on Tourism & Environment",
  },
  {
    id: "t3",
    priority: "info",
    type: "Reading Material",
    title: "Agenda for the 143rd Regular Session",
    subtitle: "22 items on the Order of Business",
  },
  {
    id: "t4",
    priority: "review",
    type: "Committee Action",
    title: "Proposed Ordinance: Revised Revenue Code Amendment",
    subtitle: "Committee on Appropriations & Finance",
  },
];

const mockAISummary = [
  "Appropriates ₱450M for Phase 1 of the Disaster Risk Reduction Infrastructure Program.",
  "Funds sourced from 2026 General Fund with 15% contingency allocation from calamity reserves.",
  "Cleared by City Treasurer on April 10, 2026. No outstanding audit findings.",
];

const mockFullText = `RESOLUTION NO. 2026-402

A RESOLUTION AUTHORIZING THE SUPPLEMENTAL BUDGET APPROPRIATION OF FOUR HUNDRED FIFTY MILLION PESOS (₱450,000,000.00) FOR THE DISASTER RISK REDUCTION INFRASTRUCTURE PROGRAM, PHASE 1

WHEREAS, the City of Ormoc has been classified as a high-risk area for natural disasters including typhoons, flooding, and landslides;

WHEREAS, the City Disaster Risk Reduction and Management Council (CDRRMC) has identified critical infrastructure gaps in early warning systems, evacuation centers, and flood control mechanisms;

WHEREAS, the City Treasurer has certified the availability of funds from the 2026 General Fund and Calamity Fund reserves;

WHEREAS, the Committee on Appropriations and Finance, after due deliberation, has recommended the approval of said appropriation;

NOW, THEREFORE, BE IT RESOLVED, as it is hereby resolved by the Sangguniang Panlungsod of the City of Ormoc, in session assembled:

SECTION 1. Authorization. — The City Mayor is hereby authorized to implement the Disaster Risk Reduction Infrastructure Program, Phase 1, with a total appropriation of FOUR HUNDRED FIFTY MILLION PESOS (₱450,000,000.00).

SECTION 2. Fund Source. — The funds shall be sourced as follows:
  a) ₱382,500,000.00 from the 2026 General Fund
  b) ₱67,500,000.00 from the Calamity Fund (15% contingency)

SECTION 3. Components. — The program shall cover:
  a) Construction of three (3) multi-purpose evacuation centers
  b) Upgrade of the city-wide early warning system
  c) Rehabilitation of primary and secondary drainage channels
  d) Installation of real-time water level monitoring stations

SECTION 4. Effectivity. — This Resolution shall take effect upon approval.

ADOPTED this ___ day of April 2026.`;

// ==================== CONFIG ====================

const priorityConfig = {
  urgent: {
    color: "bg-red-500",
    border: "border-red-200",
    bg: "bg-red-50",
    text: "text-red-700",
    icon: <AlertCircle size={16} className="text-red-500" />,
  },
  review: {
    color: "bg-amber-400",
    border: "border-amber-200",
    bg: "bg-amber-50",
    text: "text-amber-700",
    icon: <Eye size={16} className="text-amber-500" />,
  },
  info: {
    color: "bg-blue-400",
    border: "border-blue-200",
    bg: "bg-blue-50",
    text: "text-blue-700",
    icon: <BookOpen size={16} className="text-blue-500" />,
  },
};

// ==================== INBOX VIEW ====================

function InboxView({
  tasks,
  onTaskTap,
}: {
  tasks: TaskCard[];
  onTaskTap: (task: TaskCard) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-full">
            <Tablet size={14} className="text-indigo-500" />
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-indigo-600">
              iPad Tablet Mode — Councilor View Only
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
            <Time size={12} />
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {/* Greeting */}
        <div className="mb-6">
          <h1 className="text-[24px] font-['Lexend:Regular',_sans-serif] text-neutral-900">
            {mockCouncilor.name}'s Desk
          </h1>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
            {mockCouncilor.title}
          </p>
        </div>

        {/* Pending Badge */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 border border-orange-200 rounded-xl mb-5 w-fit">
            <div className="size-2 rounded-full bg-orange-400 animate-pulse" />
            <span className="text-[13px] font-['Lexend:Regular',_sans-serif] text-orange-700">
              {tasks.length} Pending Action{tasks.length !== 1 ? "s" : ""}
            </span>
          </div>
        )}

        {/* Inbox Zero */}
        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="size-20 rounded-full bg-emerald-50 flex items-center justify-center mb-5">
              <CheckCircle size={40} className="text-emerald-400" />
            </div>
            <p className="text-[18px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
              Inbox Zero
            </p>
            <p className="text-[14px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">
              All actions completed. You're up to date.
            </p>
          </div>
        )}

        {/* Task Cards */}
        <div className="flex flex-col gap-3">
          {tasks.map((task) => {
            const config = priorityConfig[task.priority];
            return (
              <button
                key={task.id}
                onClick={() => onTaskTap(task)}
                className={`w-full text-left p-5 rounded-2xl border ${config.border} ${config.bg} cursor-pointer transition-all duration-200 hover:shadow-md hover:scale-[1.005] active:scale-[0.998] group`}
              >
                <div className="flex items-start gap-4">
                  <div className={`mt-1 size-3 rounded-full ${config.color} shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`text-[11px] font-['Lexend:Regular',_sans-serif] ${config.text} px-2 py-0.5 rounded-full bg-white/60`}>
                        {task.type}
                      </span>
                      {task.timeInfo && (
                        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-600 flex items-center gap-1">
                          <Clock size={10} />
                          {task.timeInfo}
                        </span>
                      )}
                    </div>
                    <p className="text-[15px] font-['Lexend:Regular',_sans-serif] text-neutral-900">
                      {task.title}
                    </p>
                    <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">
                      {task.subtitle}
                    </p>
                  </div>
                  <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-500 mt-3 shrink-0 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== FOCUS READER ====================

function FocusReader({
  task,
  onBack,
  onAction,
}: {
  task: TaskCard;
  onBack: () => void;
  onAction: (action: string) => void;
}) {
  const [tab, setTab] = useState<"tldr" | "full">("tldr");
  const [notes, setNotes] = useState<DocNote[]>([
    { id: "n1", text: "Ask the Mayor about the specific contractor for this.", timestamp: "2:15 PM" },
  ]);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNote, setNewNote] = useState("");

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes((prev) => [
      ...prev,
      {
        id: `n${Date.now()}`,
        text: newNote.trim(),
        timestamp: new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }),
      },
    ]);
    setNewNote("");
    setShowNoteInput(false);
  };

  const isFloorVote = task.type === "Floor Vote";
  const isCommittee = task.type === "Committee Action";
  const headerLabel = isFloorVote ? "FLOOR VOTE" : isCommittee ? "COMMITTEE ACTION" : "READING MATERIAL";

  return (
    <div className="flex flex-col h-full">
      {/* Back Button + Header */}
      <div className="px-6 pt-5 pb-4 border-b border-neutral-100">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 cursor-pointer hover:text-neutral-700 transition-colors mb-4"
        >
          <ChevronRight size={14} className="rotate-180" />
          Back to Inbox
        </button>
        <div className="flex items-center gap-3">
          <span className={`text-[11px] font-['Lexend:Regular',_sans-serif] px-2.5 py-1 rounded-full tracking-wider ${
            isFloorVote ? "bg-red-100 text-red-700" : isCommittee ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
          }`}>
            {headerLabel}
          </span>
          {task.timeInfo && (
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-600 flex items-center gap-1">
              <Clock size={10} />
              {task.timeInfo}
            </span>
          )}
        </div>
        <h1 className="text-[18px] font-['Lexend:Regular',_sans-serif] text-neutral-900 mt-2">
          {task.title}
        </h1>
        <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
          {task.subtitle}
        </p>
      </div>

      {/* Content Area - full width */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        {/* Tab Switcher */}
        <div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-5 max-w-md">
          <button
            onClick={() => setTab("tldr")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-['Lexend:Regular',_sans-serif] cursor-pointer transition-all duration-200 ${
              tab === "tldr"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            TL;DR — AI Summary
          </button>
          <button
            onClick={() => setTab("full")}
            className={`flex-1 py-2.5 px-4 rounded-lg text-[13px] font-['Lexend:Regular',_sans-serif] cursor-pointer transition-all duration-200 ${
              tab === "full"
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            Full Text
          </button>
        </div>

        {/* Document Content */}
        {tab === "tldr" ? (
          <div className="flex flex-col gap-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="size-6 rounded-lg bg-violet-100 flex items-center justify-center">
                <Eye size={12} className="text-violet-600" />
              </div>
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-violet-600">
                NLP Engine Summary
              </span>
            </div>
            {mockAISummary.map((point, i) => (
              <div key={i} className="flex gap-3 items-start p-4 bg-white rounded-xl border border-neutral-100">
                <span className="text-[14px] font-['Lexend:Regular',_sans-serif] text-violet-500 mt-0.5 shrink-0">
                  {i + 1}.
                </span>
                <p className="text-[14px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
                  {point}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-neutral-100 p-6 mb-6">
            <pre className="whitespace-pre-wrap text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
              {mockFullText}
            </pre>
          </div>
        )}

        {/* Private Notes */}
        <div className="border-t border-neutral-100 pt-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <EyeOff size={14} className="text-neutral-400" />
              <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                Private Notes — Only visible to you
              </span>
            </div>
            <button
              onClick={() => setShowNoteInput(!showNoteInput)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100 rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 cursor-pointer hover:bg-neutral-200 transition-colors"
            >
              <PenTool size={12} />
              Add Note
            </button>
          </div>
          {showNoteInput && (
            <div className="flex gap-2 mb-3">
              <input
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Type your private note..."
                className="flex-1 px-3 py-2 bg-white border border-neutral-200 rounded-lg text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700 outline-none focus:border-neutral-400 transition-colors"
              />
              <button
                onClick={addNote}
                className="px-3 py-2 bg-neutral-900 text-white rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-neutral-800 transition-colors"
              >
                Save
              </button>
            </div>
          )}
          {notes.length > 0 && (
            <div className="flex flex-col gap-2">
              {notes.map((note) => (
                <div key={note.id} className="flex items-start gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
                  <StickyNote size={12} className="text-amber-400 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
                      {note.text}
                    </p>
                    <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">
                      {note.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons - Sticky Bottom */}
      {task.priority !== "info" && (
        <div className="px-6 py-4 border-t border-neutral-100 bg-white">
          {isFloorVote ? (
            /* Floor Vote: Vote Yes / Vote No / Abstain */
            <div className="flex gap-3">
              <button
                onClick={() => onAction("vote_yes")}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[15px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <ThumbsUp size={18} />
                Vote Yes
              </button>
              <button
                onClick={() => onAction("vote_no")}
                className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[15px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-red-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <ThumbsDown size={18} />
                Vote No
              </button>
              <button
                onClick={() => onAction("abstain")}
                className="py-4 px-6 bg-white text-neutral-600 border border-neutral-200 rounded-2xl text-[15px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <MinusCircle size={18} />
                Abstain
              </button>
            </div>
          ) : (
            /* Committee Action: Sign Favorable / Return for Revisions */
            <div className="flex gap-3">
              <button
                onClick={() => onAction("sign_favorable")}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl text-[15px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <CheckmarkOutline size={18} />
                Sign: Favorable
              </button>
              <button
                onClick={() => onAction("return_revisions")}
                className="flex-1 py-4 bg-white text-neutral-700 border border-neutral-200 rounded-2xl text-[15px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-neutral-50 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <Flag size={18} />
                Return for Revisions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ==================== SIGNATURE / CONFIRMATION PAD ====================

function ConfirmationPad({
  task,
  action,
  onConfirm,
  onCancel,
}: {
  task: TaskCard;
  action: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (pin.length === 4) {
      onConfirm();
    } else {
      setError(true);
      setTimeout(() => setError(false), 1500);
    }
  };

  const actionLabels: Record<string, { label: string; color: string }> = {
    vote_yes: { label: "Vote: YES", color: "text-emerald-600" },
    vote_no: { label: "Vote: NO", color: "text-red-600" },
    abstain: { label: "Vote: ABSTAIN", color: "text-neutral-600" },
    sign_favorable: { label: "Action: Favorable Recommendation", color: "text-emerald-600" },
    return_revisions: { label: "Action: Returned for Revisions", color: "text-amber-600" },
  };

  const actionInfo = actionLabels[action] || { label: action, color: "text-neutral-600" };
  const isVote = task.type === "Floor Vote";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backdropFilter: "blur(12px)", background: "rgba(0,0,0,0.3)" }}>
      <div className="bg-white rounded-3xl p-8 w-full max-w-[380px] shadow-2xl mx-4">
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="size-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
            <Shield size={32} className="text-emerald-500" />
          </div>
        </div>

        <h3 className="text-[18px] font-['Lexend:Regular',_sans-serif] text-neutral-900 text-center mb-1">
          {isVote ? "Confirm Your Vote" : "Digital Signature Required"}
        </h3>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 text-center mb-6">
          {isVote ? "Enter your 4-digit PIN to cast your vote" : "Enter your 4-digit PIN to seal your approval"}
        </p>

        {/* Document Info */}
        <div className="bg-neutral-50 rounded-xl p-4 mb-6">
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 uppercase tracking-wider mb-1">
            {isVote ? "Voting on" : "Signing"}
          </p>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
            {task.title}
          </p>
          <p className={`text-[11px] font-['Lexend:Regular',_sans-serif] ${actionInfo.color} mt-2 flex items-center gap-1`}>
            <CheckmarkOutline size={12} />
            {actionInfo.label}
          </p>
        </div>

        {/* PIN Input */}
        <div className="flex justify-center gap-3 mb-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`size-14 rounded-xl border-2 flex items-center justify-center text-[24px] font-['Lexend:Regular',_sans-serif] transition-all duration-200 ${
                error
                  ? "border-red-300 bg-red-50"
                  : pin.length > i
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-neutral-200 bg-white"
              }`}
            >
              {pin.length > i ? "•" : ""}
            </div>
          ))}
        </div>

        {error && (
          <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-red-500 text-center mb-4">
            Please enter a valid 4-digit PIN
          </p>
        )}

        {/* Number Pad */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, "del"].map((num, i) => {
            if (num === null) return <div key={i} />;
            return (
              <button
                key={i}
                onClick={() => {
                  if (num === "del") setPin((p) => p.slice(0, -1));
                  else if (pin.length < 4) setPin((p) => p + num);
                }}
                className="py-3 rounded-xl bg-neutral-50 text-[18px] font-['Lexend:Regular',_sans-serif] text-neutral-700 cursor-pointer hover:bg-neutral-100 active:bg-neutral-200 transition-colors"
              >
                {num === "del" ? "←" : num}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-neutral-100 text-neutral-600 rounded-xl text-[14px] font-['Lexend:Regular',_sans-serif] cursor-pointer hover:bg-neutral-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className={`flex-1 py-3 rounded-xl text-[14px] font-['Lexend:Regular',_sans-serif] cursor-pointer transition-all ${
              pin.length === 4
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-neutral-200 text-neutral-400 cursor-not-allowed"
            }`}
          >
            {isVote ? "Cast Vote" : "Confirm & Seal"}
          </button>
        </div>

        <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 text-center mt-4 flex items-center justify-center gap-1">
          <Locked size={10} />
          Cryptographically sealed via eFlow Immutable Ledger
        </p>
      </div>
    </div>
  );
}

// ==================== MAIN COMPONENT ====================

export function CouncilorPanel() {
  const [tasks, setTasks] = useState<TaskCard[]>(mockTasks);
  const [activeTask, setActiveTask] = useState<TaskCard | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [view, setView] = useState<"inbox" | "reader">("inbox");

  const handleTaskTap = (task: TaskCard) => {
    setActiveTask(task);
    setView("reader");
  };

  const handleBack = () => {
    setView("inbox");
    setActiveTask(null);
  };

  const handleAction = (action: string) => {
    setPendingAction(action);
  };

  const handleConfirm = () => {
    if (activeTask) {
      setTasks((prev) => prev.filter((t) => t.id !== activeTask.id));
    }
    setPendingAction(null);
    setView("inbox");
    setActiveTask(null);
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {view === "inbox" ? (
        <InboxView tasks={tasks} onTaskTap={handleTaskTap} />
      ) : activeTask ? (
        <FocusReader task={activeTask} onBack={handleBack} onAction={handleAction} />
      ) : null}

      {/* Confirmation Modal */}
      {pendingAction && activeTask && (
        <ConfirmationPad
          task={activeTask}
          action={pendingAction}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
