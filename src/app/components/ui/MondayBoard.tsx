import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import {
  Task,
  TaskStatus,
  TaskAssignmentDetails,
  CreateTaskPayload,
  UpdateTaskPayload,
  updateTaskStatus,
  undoCompletedTask,
} from "../../services/taskService";
import { Employee } from "../../services/employeeService";
import {
  Subtask,
  subscribeToSubtasks,
  createSubtask,
  toggleSubtask,
  deleteSubtask,
} from "../../services/subtaskService";
import {
  ChatMessage,
  getChannelForTask,
  subscribeToChannelMessages,
  sendMessage,
  markChannelRead,
} from "../../services/chatService";
import {
  recommendTeam,
  LLMTeamRecommendation,
} from "../../services/llmService";
import {
  decomposeProposal,
  ProposalDecompositionResult,
} from "../../services/proposalDecompositionService";
import type { EmployeeNotesMap } from "../../services/employeeNotesService";
import {
  Sparkles,
  Loader2,
  Check,
  X,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Clock,
  Upload,
  FileText,
  List,
  Columns,
  BarChart2,
  Plus,
  Trash2,
  Edit2,
  Crown,
  Users,
  Layers,
  RotateCcw,
  ListChecks,
  MessageCircle,
} from "lucide-react";
import DOMPurify from "dompurify";
import { RichTextEditor } from "./RichTextEditor";
import { SimpleTableEditor } from "./SimpleTableEditor";

// ─── PDF Extraction ───────────────────────────────────────────────

async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  const workerUrl = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl.href;
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((item: any) => (item.str as string) || "")
      .join(" ");
    pages.push(text);
  }
  return pages.join("\n\n");
}

// ─── Types ────────────────────────────────────────────────────────

type BoardView = "list" | "kanban" | "timeline" | "hierarchy";
type ComposerTab = "manual" | "pdf";
type PdfPhase =
  | "idle"
  | "extracting"
  | "decomposing"
  | "review"
  | "committing"
  | "done"
  | "error";

interface DraftTask {
  key: string;
  proposalTitle: string;
  proposalId: string;
  programIdx: number;
  projectIdx: number;
  activityIdx: number;
  taskIdx: number;
  programId: string;
  programTitle: string;
  projectId: string;
  projectTitle: string;
  activityId: string;
  activityTitle: string;
  activitySchedule: string;
  title: string;
  description: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  requiredSkills: string[];
  assignedMemberIds: string[];
  leadMemberId: string | null;
  burnoutWarning: boolean;
  reasoning: string;
  enabled: boolean;
}

interface MondayBoardProps {
  tasks: Task[];
  employees?: Employee[];
  employeeNotes?: EmployeeNotesMap;
  role: "depthead" | "employee";
  departmentFilter?: string;
  currentUserId?: string;
  currentUserName?: string;
  onAssign?: (
    taskId: string,
    assigneeId: string,
    assigneeName: string,
    assignment?: TaskAssignmentDetails,
  ) => void;
  onExecute?: (taskId: string) => void;
  onSubmit?: (taskId: string, submission: TaskSubmissionDraft) => void;
  onVerify?: (taskId: string, approve: boolean, feedback?: string) => void;
  onCreateTask?: (
    titleOrPayload: string | CreateTaskPayload,
    description?: string,
    deadline?: string,
  ) => void;
  onUpdateTask?: (
    taskId: string,
    payload: UpdateTaskPayload,
  ) => Promise<void> | void;
  onDeleteTask?: (taskId: string) => Promise<void> | void;
}

interface TaskEditorDraft {
  title: string;
  description: string;
  deadline: string;
  priority: "low" | "medium" | "high";
  tagsText: string;
  proposalTitle: string;
  programTitle: string;
  projectTitle: string;
  activityTitle: string;
  activitySchedule: string;
  teamMemberIds: string[];
  leadMemberId: string | null;
}

type TaskSubmissionDraft = {
  note: string;
  attachments: File[];
};

// ─── Constants ────────────────────────────────────────────────────

const STATUS_ORDER: TaskStatus[] = [
  "pending_assignment",
  "todo",
  "in_progress",
  "for_review",
  "completed",
];

const statusMeta: Record<
  TaskStatus,
  { label: string; color: string; dot: string; colBg: string }
> = {
  pending_assignment: {
    label: "Pending",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "bg-slate-400",
    colBg: "bg-slate-50",
  },
  todo: {
    label: "To Do",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-500",
    colBg: "bg-blue-50/40",
  },
  in_progress: {
    label: "In Progress",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
    colBg: "bg-amber-50/40",
  },
  for_review: {
    label: "For Review",
    color: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-500",
    colBg: "bg-violet-50/40",
  },
  completed: {
    label: "Completed",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-500",
    colBg: "bg-emerald-50/40",
  },
};

const priorityMeta: Record<
  string,
  { bar: string; badge: string; label: string; kanbanBar: string }
> = {
  high: {
    bar: "bg-red-500",
    badge: "bg-red-100 text-red-700",
    label: "High",
    kanbanBar: "bg-red-400",
  },
  medium: {
    bar: "bg-amber-400",
    badge: "bg-amber-100 text-amber-700",
    label: "Med",
    kanbanBar: "bg-amber-400",
  },
  low: {
    bar: "bg-emerald-400",
    badge: "bg-emerald-100 text-emerald-700",
    label: "Low",
    kanbanBar: "bg-emerald-400",
  },
};

// ─── Helpers ─────────────────────────────────────────────────────

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const slugifyFragment = (value: string, fallback: string) => {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return slug || fallback;
};

function SubtaskProgressChip({ task }: { task: Task }) {
  const total = task.subtaskCount ?? 0;
  const done = task.subtaskCompletedCount ?? 0;
  if (total === 0) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[9px] text-neutral-600">
      <ListChecks size={10} className={done === total ? "text-emerald-600" : "text-neutral-400"} />
      {done}/{total}
    </span>
  );
}

const buildHierarchyIds = (
  proposalTitle: string,
  programTitle: string,
  projectTitle: string,
  activityTitle: string,
  pi: number,
  pj: number,
  ai: number,
) => {
  const proposalId = `proposal-${slugifyFragment(proposalTitle, "imported")}`;
  const programId = `${proposalId}-program-${pi + 1}-${slugifyFragment(programTitle, "program")}`;
  const projectId = `${programId}-project-${pj + 1}-${slugifyFragment(projectTitle, "project")}`;
  const activityId = `${projectId}-activity-${ai + 1}-${slugifyFragment(activityTitle, "activity")}`;
  return { proposalId, programId, projectId, activityId };
};

type HierarchyDisplay = {
  proposalTitle: string;
  programTitle: string;
  projectTitle: string;
  activityTitle: string;
  activitySchedule?: string;
  path: string;
};

const getHierarchyDisplay = (task: Task): HierarchyDisplay => {
  const proposalTitle = task.proposalTitle || "Imported Proposal";
  const programTitle = task.programTitle || "Uncategorized Program";
  const projectTitle = task.projectTitle || "Uncategorized Project";
  const activityTitle = task.activityTitle || "Uncategorized Activity";
  const path =
    task.hierarchyPath ||
    [proposalTitle, programTitle, projectTitle, activityTitle]
      .filter(Boolean)
      .join(" > ");

  return {
    proposalTitle,
    programTitle,
    projectTitle,
    activityTitle,
    activitySchedule: task.activitySchedule,
    path,
  };
};

const uniqueValues = (items: string[]) =>
  Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));

const getTaskMemberIds = (task: Task) =>
  uniqueValues([
    ...(task.teamMemberIds || []),
    ...(task.assigneeId ? [task.assigneeId] : []),
    ...(task.recommendedEmployeeIds || []),
  ]);

const getTaskMemberNames = (
  task: Task,
  employeeById: Record<string, Employee>,
) =>
  uniqueValues([
    ...(task.assigneeName ? [task.assigneeName] : []),
    ...(task.teamMemberNames || []),
    ...getTaskMemberIds(task).map((id) => employeeById[id]?.name || ""),
  ]);

const buildTaskEditorDraft = (task: Task): TaskEditorDraft => ({
  title: task.title || "",
  description: task.description || "",
  deadline: task.deadline || task.dueDate || "",
  priority: task.priority || "medium",
  tagsText: (task.tags || []).join(", "),
  proposalTitle: task.proposalTitle || "",
  programTitle: task.programTitle || "",
  projectTitle: task.projectTitle || "",
  activityTitle: task.activityTitle || "",
  activitySchedule: task.activitySchedule || "",
  teamMemberIds: getTaskMemberIds(task),
  leadMemberId: task.assigneeId || getTaskMemberIds(task)[0] || null,
});

const parseTaskDeadline = (raw: string): Date | null => {
  const value = raw.trim();
  if (!value) return null;

  // Labels like "Month 1-2" are schedule phases, not absolute dates.
  if (/^month\s+\d+/i.test(value) || /^phase\s+\d+/i.test(value)) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
};

const getDeadlineInfo = (task: Task) => {
  const dl = task.deadline || task.dueDate;
  if (!dl) return null;
  const parsedDeadline = parseTaskDeadline(dl);
  if (!parsedDeadline) return null;

  const diff = parsedDeadline.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days < 0)
    return {
      label: `${Math.abs(days)}d overdue`,
      cls: "text-red-600 bg-red-50 border-red-200",
    };
  if (days === 0)
    return {
      label: "Due today",
      cls: "text-amber-600 bg-amber-50 border-amber-200",
    };
  if (days <= 3)
    return {
      label: `${days}d left`,
      cls: "text-amber-600 bg-amber-50 border-amber-200",
    };
  return {
    label: `${days}d left`,
    cls: "text-slate-500 bg-slate-50 border-slate-200",
  };
};

const formatShortDateTime = (value?: number) => {
  if (!value) return "";
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function SubmissionDetails({
  submission,
}: {
  submission?: Task["latestSubmission"];
}) {
  if (!submission) return null;
  const submittedAt = formatShortDateTime(submission.submittedAt);

  return (
    <div className="mt-1.5 rounded-lg border border-violet-100 bg-violet-50/60 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-violet-600 font-['Lexend:Medium',_sans-serif]">
        Submission
      </div>
      {submission.note && (
        <div
          className="text-[11px] text-neutral-700 mt-0.5 [&_p]:m-0 [&_table]:text-[10px] [&_ul]:pl-4 [&_ol]:pl-4"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(submission.note) }}
        />
      )}
      <div className="text-[10px] text-neutral-500 mt-0.5">
        By {submission.submitterName || "Unknown"}
        {submittedAt ? ` - ${submittedAt}` : ""}
      </div>
      {submission.attachments && submission.attachments.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {submission.attachments.map((url, idx) => (
            <a
              key={`${url}-${idx}`}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-violet-700 underline"
            >
              Attachment {idx + 1}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

function RejectionNotice({
  note,
  rejectedAt,
}: {
  note?: string;
  rejectedAt?: number;
}) {
  if (!note) return null;
  const rejectedAtLabel = formatShortDateTime(rejectedAt);

  return (
    <div className="mt-1.5 rounded-lg border border-red-100 bg-red-50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-red-600 font-['Lexend:Medium',_sans-serif]">
        Rejection
      </div>
      <div className="text-[11px] text-red-700 mt-0.5">Note: {note}</div>
      {rejectedAtLabel && (
        <div className="text-[10px] text-red-500 mt-0.5">
          Rejected {rejectedAtLabel}
        </div>
      )}
    </div>
  );
}

function ReopenNotice({
  reason,
  reopenedAt,
  reopenedByName,
}: {
  reason?: string;
  reopenedAt?: number;
  reopenedByName?: string;
}) {
  if (!reason) return null;
  const reopenedAtLabel = formatShortDateTime(reopenedAt);

  return (
    <div className="mt-1.5 rounded-lg border border-amber-100 bg-amber-50 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-amber-700 font-['Lexend:Medium',_sans-serif]">
        Reopened
      </div>
      <div className="text-[11px] text-amber-800 mt-0.5">
        Reason: {reason}
      </div>
      {(reopenedByName || reopenedAtLabel) && (
        <div className="text-[10px] text-amber-600 mt-0.5">
          {reopenedByName ? `By ${reopenedByName}` : "Reopened"}
          {reopenedAtLabel ? ` - ${reopenedAtLabel}` : ""}
        </div>
      )}
    </div>
  );
}

// ─── Assignment Modal ─────────────────────────────────────────────

function AssignmentModal({
  open,
  onClose,
  employees,
  employeeNotes,
  selectedIds,
  leadId,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  selectedIds: string[];
  leadId: string | null;
  onConfirm: (memberIds: string[], leadId: string | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<string[]>(selectedIds);
  const [draftLead, setDraftLead] = useState<string | null>(leadId);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setDraft(selectedIds);
      setDraftLead(leadId);
      setSearch("");
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return employees;
    return employees.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        (e.jobTitle || "").toLowerCase().includes(q) ||
        (e.departmentName || "").toLowerCase().includes(q),
    );
  }, [employees, search]);

  const toggle = (id: string) => {
    setDraft((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (draftLead && !next.includes(draftLead)) setDraftLead(next[0] || null);
      return next;
    });
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[540px] max-h-[82vh] flex flex-col overflow-hidden border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.18s ease" }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

        {/* Header */}
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
              Team Assignment
            </div>
            <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
              Select Team Members
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 pt-3 pb-2 border-b border-neutral-100 shrink-0">
          <div className="relative flex items-center bg-neutral-50 border border-neutral-200 rounded-xl h-[38px] focus-within:border-neutral-400 focus-within:bg-white transition">
            <Search size={14} className="text-neutral-400 ml-3 shrink-0" />
            <input
              ref={searchRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, role, or department…"
              className="flex-1 bg-transparent px-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="pr-2.5 text-neutral-400 hover:text-neutral-700"
              >
                <X size={12} />
              </button>
            )}
          </div>

          {/* Selected chips */}
          {draft.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2.5">
              {draft.map((id) => {
                const emp = employees.find((e) => e.id === id);
                if (!emp) return null;
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-['Lexend:Medium',_sans-serif] px-2 py-1 rounded-full"
                  >
                    {draftLead === id && (
                      <Crown size={10} className="text-amber-500" />
                    )}
                    {getInitials(emp.name)} · {emp.name.split(" ")[0]}
                    <button
                      onClick={() => toggle(id)}
                      className="text-violet-400 hover:text-violet-700 ml-0.5"
                    >
                      <X size={10} />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Employee list */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {filtered.length === 0 ? (
            <div className="text-center text-[12px] text-neutral-400 py-10">
              No employees match "{search}"
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((emp) => {
                const selected = draft.includes(emp.id);
                const isLead = draftLead === emp.id;
                const notes = employeeNotes?.[emp.id];
                const tags = notes?.tags?.slice(0, 3) || [];
                const load = emp.currentWorkload;
                return (
                  <div
                    key={emp.id}
                    onClick={() => toggle(emp.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
                      selected
                        ? "bg-violet-50 border border-violet-200"
                        : "bg-white border border-transparent hover:border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {/* Avatar */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-['Lexend:SemiBold',_sans-serif] text-white shrink-0 ${
                        load >= 80
                          ? "bg-red-500"
                          : load >= 60
                            ? "bg-amber-500"
                            : "bg-neutral-800"
                      }`}
                    >
                      {getInitials(emp.name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                          {emp.name}
                        </span>
                        {isLead && (
                          <Crown
                            size={11}
                            className="text-amber-500 shrink-0"
                          />
                        )}
                      </div>
                      <div className="text-[10px] text-neutral-500 truncate">
                        {emp.jobTitle}
                      </div>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {tags.map((tag) => (
                            <span
                              key={tag}
                              className="bg-neutral-100 text-neutral-500 text-[9px] px-1.5 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Workload */}
                    <div className="shrink-0 text-right">
                      <div
                        className={`text-[11px] font-['Lexend:SemiBold',_sans-serif] ${load >= 80 ? "text-red-600" : load >= 60 ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {load}%
                      </div>
                      <div className="text-[9px] text-neutral-400">
                        workload
                      </div>
                    </div>

                    {/* Lead toggle */}
                    {selected && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDraftLead(isLead ? null : emp.id);
                        }}
                        className={`shrink-0 p-1.5 rounded-lg transition ${
                          isLead
                            ? "bg-amber-100 text-amber-600"
                            : "text-neutral-300 hover:text-amber-500 hover:bg-amber-50"
                        }`}
                        title="Set as Team Lead"
                      >
                        <Crown size={13} />
                      </button>
                    )}

                    {/* Checkbox */}
                    <div
                      className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${
                        selected
                          ? "border-violet-500 bg-violet-500"
                          : "border-neutral-300"
                      }`}
                    >
                      {selected && (
                        <Check
                          size={11}
                          className="text-white"
                          strokeWidth={2.5}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between shrink-0">
          <div className="text-[12px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
            {draft.length > 0
              ? `${draft.length} selected${draftLead ? ` · Lead: ${employees.find((e) => e.id === draftLead)?.name?.split(" ")[0] || ""}` : ""}`
              : "No members selected"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm(draft, draftLead);
                onClose();
              }}
              className="px-4 py-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition"
            >
              Confirm Assignment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Task Chat Section ──────────────────────────────────────────────

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

// ─── Task Subtasks Section ────────────────────────────────────────

function TaskSubtasksSection({ taskId }: { taskId: string }) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const unsub = subscribeToSubtasks(taskId, setSubtasks);
    return unsub;
  }, [taskId]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createSubtask(taskId, newTitle.trim(), {
        source: "manual",
        position: subtasks.length,
      });
      setNewTitle("");
    } finally {
      setAdding(false);
    }
  };

  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
          Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
        </label>
        {subtasks.length > 0 && (
          <div className="flex-1 mx-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden max-w-[140px]">
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${subtasks.length ? (completedCount / subtasks.length) * 100 : 0}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {subtasks.map((st) => (
          <div
            key={st.id}
            className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/60 px-2.5 py-2 group"
          >
            <input
              type="checkbox"
              checked={st.isCompleted}
              onChange={(e) => toggleSubtask(st.id, e.target.checked)}
              className="h-3.5 w-3.5 rounded border-neutral-300 accent-emerald-600 cursor-pointer"
            />
            <span
              className={`flex-1 text-[12px] ${
                st.isCompleted ? "text-neutral-400 line-through" : "text-neutral-700"
              }`}
            >
              {st.title}
            </span>
            {st.source === "ai_extracted" && (
              <span className="text-[8px] uppercase tracking-wider text-violet-500 shrink-0">AI</span>
            )}
            <button
              onClick={() => deleteSubtask(st.id)}
              className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition shrink-0"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a subtask…"
          className="flex-1 h-[34px] rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newTitle.trim()}
          className="h-[34px] px-3 rounded-lg bg-neutral-900 text-white text-[11px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800"
        >
          <Plus size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Draft Task Row ───────────────────────────────────────────────

function TaskEditorModal({
  open,
  task,
  draft,
  onChange,
  onClose,
  onSave,
  onDelete,
  onOpenTeamEditor,
  saving,
  error,
  employees,
  employeeById,
  currentUserId,
  currentUserName,
}: {
  open: boolean;
  task: Task | null;
  draft: TaskEditorDraft | null;
  onChange: (patch: Partial<TaskEditorDraft>) => void;
  onClose: () => void;
  onSave: () => void;
  onDelete: () => void;
  onOpenTeamEditor: () => void;
  saving: boolean;
  error: string;
  employees: Employee[];
  employeeById: Record<string, Employee>;
  currentUserId?: string;
  currentUserName?: string;
}) {
  if (!open || !task || !draft) return null;

  const teamMembers = draft.teamMemberIds
    .map((id) => employeeById[id])
    .filter((member): member is Employee => Boolean(member));
  const leadName =
    (draft.leadMemberId ? employeeById[draft.leadMemberId]?.name : "") ||
    teamMembers[0]?.name ||
    "Unassigned";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[760px] max-h-[88vh] flex flex-col overflow-hidden border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between shrink-0">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
              Task Editor
            </div>
            <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
              {task.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Task Title
              </label>
              <input
                value={draft.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="mt-1 h-[40px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Description
              </label>
              <textarea
                rows={3}
                value={draft.description}
                onChange={(e) => onChange({ description: e.target.value })}
                className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Due Date / Schedule
              </label>
              <input
                value={draft.deadline}
                onChange={(e) => onChange({ deadline: e.target.value })}
                placeholder="e.g. 2026-07-15 or Month 1"
                className="mt-1 h-[40px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Priority
              </label>
              <select
                value={draft.priority}
                onChange={(e) =>
                  onChange({
                    priority: e.target.value as "low" | "medium" | "high",
                  })
                }
                className="mt-1 h-[40px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Tags
              </label>
              <input
                value={draft.tagsText}
                onChange={(e) => onChange({ tagsText: e.target.value })}
                placeholder="comma-separated tags"
                className="mt-1 h-[40px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[13px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                  Team Assignment
                </div>
                <div className="text-[12px] text-neutral-700 mt-0.5">
                  Lead: {leadName}
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  {teamMembers.length > 0
                    ? `Team of ${teamMembers.length}: ${teamMembers.map((member) => member.name).join(", ")}`
                    : "No team members assigned yet."}
                </div>
              </div>
              <button
                onClick={onOpenTeamEditor}
                disabled={employees.length === 0}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition"
              >
                <Users size={11} />
                Edit Team
              </button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Proposal
              </label>
              <input
                value={draft.proposalTitle}
                onChange={(e) => onChange({ proposalTitle: e.target.value })}
                className="mt-1 h-[38px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Program
              </label>
              <input
                value={draft.programTitle}
                onChange={(e) => onChange({ programTitle: e.target.value })}
                className="mt-1 h-[38px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Project
              </label>
              <input
                value={draft.projectTitle}
                onChange={(e) => onChange({ projectTitle: e.target.value })}
                className="mt-1 h-[38px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Activity
              </label>
              <input
                value={draft.activityTitle}
                onChange={(e) => onChange({ activityTitle: e.target.value })}
                className="mt-1 h-[38px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Activity Schedule
              </label>
              <input
                value={draft.activitySchedule}
                onChange={(e) => onChange({ activitySchedule: e.target.value })}
                className="mt-1 h-[38px] w-full rounded-xl border border-neutral-200 bg-white px-3 text-[12px] text-neutral-900 outline-none focus:border-neutral-400"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}

          <TaskSubtasksSection taskId={task.id} />
          <TaskChatSection
            taskId={task.id}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-between shrink-0">
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 text-red-600 text-[12px] font-['Lexend:Medium',_sans-serif] hover:bg-red-50 transition"
          >
            <Trash2 size={13} />
            Delete Task
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="px-4 py-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SubmitForReviewModal({
  open,
  task,
  note,
  attachments,
  onNoteChange,
  onAttachmentsChange,
  onRemoveAttachment,
  onClose,
  onSubmit,
  submitting,
  error,
}: {
  open: boolean;
  task: Task | null;
  note: string;
  attachments: File[];
  onNoteChange: (value: string) => void;
  onAttachmentsChange: (files: File[]) => void;
  onRemoveAttachment: (index: number) => void;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [noteMode, setNoteMode] = useState<"write" | "table">("write");

  if (!open || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-[560px] max-h-[85vh] flex flex-col overflow-hidden border border-neutral-200"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.18s ease" }}
      >
        <style>{`@keyframes modalIn{from{opacity:0;transform:scale(0.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`}</style>

        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
              Submit for Review
            </div>
            <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
              {task.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-700 p-1.5 rounded-lg hover:bg-neutral-100 transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                Completion Note (required)
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setNoteMode("write")}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${noteMode === "write" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-100"}`}
                >
                  Write
                </button>
                <button
                  type="button"
                  onClick={() => setNoteMode("table")}
                  className={`text-[10px] px-2 py-0.5 rounded-full ${noteMode === "table" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-100"}`}
                >
                  Table
                </button>
              </div>
            </div>
            {noteMode === "write" ? (
              <RichTextEditor
                value={note}
                onChange={onNoteChange}
                placeholder="Summarize what was completed, results, or evidence details..."
              />
            ) : (
              <SimpleTableEditor onChange={onNoteChange} />
            )}
          </div>

          <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 px-3 py-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
                  Attachments (optional)
                </div>
                <div className="text-[11px] text-neutral-500 mt-0.5">
                  Photos, PDF evidence, or supporting files.
                </div>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-full border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-100 transition"
              >
                <Upload size={11} />
                Add files
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) =>
                  onAttachmentsChange(Array.from(e.target.files || []))
                }
              />
            </div>
            {attachments.length > 0 && (
              <div className="mt-2 space-y-1">
                {attachments.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between text-[11px] text-neutral-600"
                  >
                    <span className="truncate max-w-[380px]">{file.name}</span>
                    <button
                      onClick={() => onRemoveAttachment(idx)}
                      className="text-neutral-400 hover:text-neutral-700"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-neutral-100 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600 border border-neutral-200 rounded-xl hover:bg-neutral-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="px-4 py-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-white bg-violet-600 rounded-xl hover:bg-violet-700 disabled:opacity-50 transition"
          >
            {submitting ? "Submitting..." : "Submit for Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function UndoCompletedModal({
  open,
  task,
  reason,
  onReasonChange,
  onClose,
  onSubmit,
  saving,
  error,
}: {
  open: boolean;
  task: Task | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error: string;
}) {
  if (!open || !task) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-[520px] max-w-[calc(100vw-32px)] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "modalIn 0.18s ease" }}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-amber-600 font-['Lexend:Medium',_sans-serif]">
              Reopen Completed Task
            </div>
            <div className="mt-0.5 text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              {task.title}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] leading-relaxed text-amber-800">
            This moves the task back to In Progress and notifies the assigned
            team with your reason.
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400">
              Undo reason (required)
            </label>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => onReasonChange(e.target.value)}
              placeholder="Explain why this completed task needs to be reopened..."
              className="mt-1 w-full resize-none rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-[13px] text-neutral-900 outline-none focus:border-amber-300"
            />
          </div>
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-[12px] text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-neutral-100 px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-neutral-200 px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600 transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-white transition hover:bg-amber-700 disabled:opacity-50"
          >
            <RotateCcw size={13} />
            {saving ? "Reopening..." : "Undo Completion"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DraftTaskRow({
  dt,
  employees,
  employeeNotes: _employeeNotes,
  onUpdate,
  onDelete,
  onOpenModal,
}: {
  dt: DraftTask;
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  onUpdate: (key: string, patch: Partial<DraftTask>) => void;
  onDelete: (key: string) => void;
  onOpenModal: (key: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const assignedEmps = dt.assignedMemberIds
    .map((id) => employees.find((e) => e.id === id))
    .filter(Boolean) as Employee[];
  const pm = priorityMeta[dt.priority] || priorityMeta.medium;

  return (
    <div
      className={`px-6 py-3 flex items-start gap-3 group transition-all ${
        dt.enabled ? "" : "opacity-40"
      } hover:bg-neutral-50/60`}
    >
      {/* Enable checkbox */}
      <button
        onClick={() => onUpdate(dt.key, { enabled: !dt.enabled })}
        className="shrink-0 mt-0.5"
      >
        {dt.enabled ? (
          <div className="w-4 h-4 rounded bg-neutral-900 border border-neutral-900 flex items-center justify-center">
            <Check size={10} className="text-white" strokeWidth={2.5} />
          </div>
        ) : (
          <div className="w-4 h-4 rounded border-2 border-neutral-300" />
        )}
      </button>

      {/* Priority bar */}
      <div className={`w-1 h-10 rounded-full shrink-0 mt-0.5 ${pm.bar}`} />

      {/* Content */}
      <div className="flex-1 min-w-0">
        {editing ? (
          <div className="space-y-2">
            <input
              autoFocus
              value={dt.title}
              onChange={(e) => onUpdate(dt.key, { title: e.target.value })}
              className="w-full text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900 border border-neutral-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-neutral-500"
            />
            <textarea
              rows={2}
              value={dt.description}
              onChange={(e) =>
                onUpdate(dt.key, { description: e.target.value })
              }
              className="w-full text-[12px] text-neutral-600 border border-neutral-200 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:border-neutral-400"
            />
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dt.deadline}
                onChange={(e) => onUpdate(dt.key, { deadline: e.target.value })}
                className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1 focus:outline-none focus:border-neutral-400"
              />
              <select
                value={dt.priority}
                onChange={(e) =>
                  onUpdate(dt.key, {
                    priority: e.target.value as "low" | "medium" | "high",
                  })
                }
                className="text-[12px] border border-neutral-200 rounded-lg px-2.5 py-1 focus:outline-none bg-white"
              >
                <option value="low">🟢 Low</option>
                <option value="medium">🟡 Medium</option>
                <option value="high">🔴 High</option>
              </select>
              <button
                onClick={() => setEditing(false)}
                className="text-[11px] font-['Lexend:Medium',_sans-serif] text-white bg-neutral-800 border border-neutral-200 rounded-lg px-3 py-1 hover:bg-neutral-900 transition"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              {dt.title}
            </div>
            {dt.description && (
              <div className="text-[11px] text-neutral-500 mt-0.5 line-clamp-1">
                {dt.description}
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              {dt.deadline && (
                <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-neutral-100 rounded-full px-2 py-0.5">
                  <Clock size={9} />
                  {dt.deadline}
                </span>
              )}
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full ${pm.badge}`}
              >
                {pm.label}
              </span>
              {dt.requiredSkills.slice(0, 2).map((s) => (
                <span
                  key={s}
                  className="text-[10px] bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full"
                >
                  {s}
                </span>
              ))}
              {dt.burnoutWarning && (
                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
                  <AlertCircle size={9} />
                  Burnout risk
                </span>
              )}
            </div>
          </>
        )}

        {/* Team assignment button */}
        <button
          onClick={() => onOpenModal(dt.key)}
          className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-dashed border-neutral-300 hover:border-violet-400 hover:bg-violet-50/40 transition group/assign w-full max-w-xs"
        >
          <Users
            size={12}
            className="text-neutral-400 group-hover/assign:text-violet-600 shrink-0"
          />
          {assignedEmps.length === 0 ? (
            <span className="text-[11px] text-neutral-400 group-hover/assign:text-violet-600">
              Assign team members…
            </span>
          ) : (
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {assignedEmps.slice(0, 5).map((emp) => (
                <span
                  key={emp.id}
                  title={emp.name}
                  className={`w-5 h-5 rounded-full text-[9px] text-white flex items-center justify-center font-['Lexend:SemiBold',_sans-serif] shrink-0 ${
                    emp.id === dt.leadMemberId
                      ? "ring-2 ring-amber-400 ring-offset-1"
                      : ""
                  } ${
                    emp.currentWorkload >= 80
                      ? "bg-red-500"
                      : emp.currentWorkload >= 60
                        ? "bg-amber-500"
                        : "bg-neutral-800"
                  }`}
                >
                  {getInitials(emp.name)}
                </span>
              ))}
              {assignedEmps.length > 5 && (
                <span className="text-[10px] text-neutral-400">
                  +{assignedEmps.length - 5}
                </span>
              )}
              <span className="text-[10px] text-neutral-500 ml-1 truncate">
                Lead:{" "}
                {assignedEmps
                  .find((e) => e.id === dt.leadMemberId)
                  ?.name?.split(" ")[0] ||
                  assignedEmps[0]?.name?.split(" ")[0] ||
                  "TBD"}
              </span>
            </div>
          )}
          <ChevronRight
            size={11}
            className="text-neutral-300 ml-auto group-hover/assign:text-violet-400 shrink-0"
          />
        </button>

        {dt.reasoning && !editing && (
          <div className="mt-1.5 text-[10px] text-violet-600 italic line-clamp-1">
            {dt.reasoning}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5">
        <button
          onClick={() => setEditing(!editing)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-400 hover:text-neutral-700 transition"
          title="Edit task"
        >
          <Edit2 size={12} />
        </button>
        <button
          onClick={() => onDelete(dt.key)}
          className="p-1.5 rounded-lg hover:bg-red-50 text-neutral-400 hover:text-red-600 transition"
          title="Delete task"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Draft Cockpit ────────────────────────────────────────────────

function DraftCockpit({
  draftTasks,
  employees,
  employeeNotes,
  onUpdate,
  onDelete,
  onAdd,
  onOpenModal,
  onCommit,
  committing,
  commitMessage,
}: {
  draftTasks: DraftTask[];
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  onUpdate: (key: string, patch: Partial<DraftTask>) => void;
  onDelete: (key: string) => void;
  onAdd: (programIdx: number, projectIdx: number, activityIdx: number) => void;
  onOpenModal: (key: string) => void;
  onCommit: () => void;
  committing: boolean;
  commitMessage: string;
}) {
  type ActivityGroup = {
    title: string;
    schedule: string;
    ai: number;
    tasks: DraftTask[];
  };
  type ProjectGroup = {
    title: string;
    pj: number;
    activities: ActivityGroup[];
  };
  type ProgramGroup = {
    title: string;
    pi: number;
    projects: ProjectGroup[];
  };

  const grouped = useMemo(() => {
    const programs: ProgramGroup[] = [];
    draftTasks.forEach((dt) => {
      let program = programs.find((p) => p.pi === dt.programIdx);
      if (!program) {
        program = { title: dt.programTitle, pi: dt.programIdx, projects: [] };
        programs.push(program);
      }
      let project = program.projects.find((p) => p.pj === dt.projectIdx);
      if (!project) {
        project = {
          title: dt.projectTitle,
          pj: dt.projectIdx,
          activities: [],
        };
        program.projects.push(project);
      }
      let activity = project.activities.find((a) => a.ai === dt.activityIdx);
      if (!activity) {
        activity = {
          title: dt.activityTitle,
          schedule: dt.activitySchedule,
          ai: dt.activityIdx,
          tasks: [],
        };
        project.activities.push(activity);
      }
      activity.tasks.push(dt);
    });
    return programs;
  }, [draftTasks]);

  const enabledCount = draftTasks.filter((t) => t.enabled).length;
  const proposalTitle = draftTasks[0]?.proposalTitle || "Imported Proposal";

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center justify-between bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
            AI Draft — Local State
          </div>
          <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-white mt-0.5">
            Review & edit before committing
          </div>
          <div className="text-[11px] text-violet-200 mt-1">
            Proposal: {proposalTitle}
          </div>
          <div className="text-[12px] text-neutral-400 mt-0.5">
            {enabledCount} of {draftTasks.length} tasks selected · not yet saved
            to Firebase
          </div>
        </div>
        <div className="flex items-center gap-3">
          {commitMessage && (
            <div className="text-[12px] text-emerald-400 font-['Lexend:Medium',_sans-serif]">
              {commitMessage}
            </div>
          )}
          <button
            onClick={onCommit}
            disabled={committing || enabledCount === 0}
            className="flex items-center gap-2 px-5 py-2.5 bg-white text-neutral-900 text-[13px] font-['Lexend:SemiBold',_sans-serif] rounded-xl hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
          >
            {committing ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Committing…
              </>
            ) : (
              <>
                <Check size={13} /> Commit {enabledCount} Tasks to Board
              </>
            )}
          </button>
        </div>
      </div>

      {/* Programs tree */}
      {grouped.map((program) => (
        <div
          key={program.pi}
          className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-sm"
        >
          {/* Program header */}
          <div className="flex items-center gap-3 px-5 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500">
            <Layers size={14} className="text-violet-200 shrink-0" />
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-white">
              {program.title}
            </div>
            <span className="ml-auto text-[10px] text-violet-200 uppercase tracking-[0.15em]">
              Program
            </span>
          </div>

          <div className="divide-y divide-neutral-100">
            {program.projects.map((project) => (
              <div key={project.pj}>
                {/* Project header */}
                <div className="flex items-center gap-2 px-5 py-2.5 bg-neutral-50 border-b border-neutral-100">
                  <ChevronRight size={12} className="text-neutral-400" />
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">
                    {project.title}
                  </div>
                  <span className="ml-auto text-[10px] text-neutral-400 uppercase tracking-wide">
                    Project
                  </span>
                </div>

                {project.activities.map((activity) => (
                  <div key={activity.ai}>
                    {/* Activity header */}
                    <div className="flex items-center gap-2 px-6 py-2 bg-neutral-50/70">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shrink-0" />
                      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600">
                        {activity.title}
                      </div>
                      {activity.schedule && (
                        <span className="inline-flex items-center gap-1 ml-2 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                          <Clock size={9} />
                          {activity.schedule}
                        </span>
                      )}
                      <button
                        onClick={() =>
                          onAdd(program.pi, project.pj, activity.ai)
                        }
                        className="ml-auto flex items-center gap-1 text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-400 hover:text-neutral-700 transition"
                      >
                        <Plus size={11} />
                        Add Task
                      </button>
                    </div>

                    {/* Tasks */}
                    <div className="divide-y divide-neutral-100">
                      {activity.tasks.map((dt) => (
                        <DraftTaskRow
                          key={dt.key}
                          dt={dt}
                          employees={employees}
                          employeeNotes={employeeNotes}
                          onUpdate={onUpdate}
                          onDelete={onDelete}
                          onOpenModal={onOpenModal}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── List Board View ──────────────────────────────────────────────

function ListBoardView({
  tasks,
  role,
  employees,
  employeeNotes,
  onAssign,
  onUpdateTask,
  onVerify,
  onExecute,
  onSubmitRequest,
  onOpenTaskEditor,
  onDeleteTaskRequest,
  departmentFilter,
  currentUserId,
  currentUserName,
  onUndoRequest,
}: {
  tasks: Task[];
  role: "depthead" | "employee";
  employees: Employee[];
  employeeNotes?: EmployeeNotesMap;
  onAssign?: MondayBoardProps["onAssign"];
  onUpdateTask?: MondayBoardProps["onUpdateTask"];
  onVerify?: MondayBoardProps["onVerify"];
  onExecute?: MondayBoardProps["onExecute"];
  onSubmitRequest?: (task: Task) => void;
  onOpenTaskEditor?: (task: Task) => void;
  onDeleteTaskRequest?: (task: Task) => void;
  departmentFilter?: string;
  currentUserId?: string;
  currentUserName?: string;
  onUndoRequest?: (task: Task) => void;
}) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const [listAssignModal, setListAssignModal] = useState<{
    open: boolean;
    task: Task | null;
  }>({ open: false, task: null });
  const employeeById = useMemo(
    () =>
      Object.fromEntries(
        employees.map((employee) => [employee.id, employee]),
      ) as Record<string, Employee>,
    [employees],
  );

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        (t.assigneeName || "").toLowerCase().includes(q) ||
        (t.proposalTitle || "").toLowerCase().includes(q) ||
        (t.programTitle || "").toLowerCase().includes(q) ||
        (t.projectTitle || "").toLowerCase().includes(q) ||
        (t.activityTitle || "").toLowerCase().includes(q) ||
        (t.hierarchyPath || "").toLowerCase().includes(q) ||
        (t.tags || []).some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [tasks, searchQuery]);

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    STATUS_ORDER.forEach((s) => map.set(s, []));
    filteredTasks.forEach((t) => {
      const bucket = map.get(t.status);
      if (bucket) bucket.push(t);
    });
    return STATUS_ORDER.map((s) => ({ status: s, tasks: map.get(s)! }));
  }, [filteredTasks]);

  const handleDrop = useCallback(
    async (e: React.DragEvent, newStatus: TaskStatus) => {
      e.preventDefault();
      setDragOverStatus(null);
      const taskId = e.dataTransfer.getData("text/plain");
      if (!taskId) return;
      const task = tasks.find((t) => t.id === taskId);
      if (!task || task.status === newStatus || task.status === "completed")
        return;
      const actor = currentUserId
        ? { id: currentUserId, name: currentUserName }
        : undefined;
      try {
        await updateTaskStatus(taskId, newStatus, actor);
      } catch {}
    },
    [tasks, currentUserId, currentUserName],
  );

  return (
    <div className="w-full flex flex-col">
      {/* Search bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex items-center bg-white border border-neutral-200 rounded-xl h-[36px] flex-1 max-w-[380px] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-100 transition">
          <Search size={14} className="text-neutral-400 ml-3 shrink-0" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, teams, tags…"
            className="flex-1 bg-transparent px-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="pr-2.5 text-neutral-400"
            >
              <X size={12} />
            </button>
          )}
        </div>
        <div className="text-[12px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">
          {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
        {/* Header row */}
        <div className="grid grid-cols-[20px_1fr_180px_90px_150px_120px] gap-0 px-4 py-2.5 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-[0.12em] text-neutral-400 sticky top-0 z-10">
          <div />
          <div className="pl-3">Task</div>
          <div>Team / Lead</div>
          <div className="text-center">Priority</div>
          <div>Due Date</div>
          <div className="text-center">Status</div>
        </div>

        {grouped.map(({ status, tasks: items }) => {
          const meta = statusMeta[status];
          const collapsed = collapsedGroups.has(status);
          return (
            <div
              key={status}
              className={`transition-colors ${dragOverStatus === status ? "bg-blue-50/40" : ""}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverStatus(status);
              }}
              onDragLeave={() => setDragOverStatus(null)}
              onDrop={(e) => handleDrop(e, status as TaskStatus)}
            >
              {/* Group header */}
              <button
                onClick={() =>
                  setCollapsedGroups((prev) => {
                    const next = new Set(prev);
                    next.has(status) ? next.delete(status) : next.add(status);
                    return next;
                  })
                }
                className="w-full flex items-center gap-2 px-4 py-2 bg-neutral-50 border-y border-neutral-100 hover:bg-neutral-100/70 transition text-left"
              >
                {collapsed ? (
                  <ChevronRight size={12} className="text-neutral-400" />
                ) : (
                  <ChevronDown size={12} className="text-neutral-400" />
                )}
                <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                  {meta.label}
                </span>
                <span className="text-[11px] text-neutral-400">
                  ({items.length})
                </span>
                {dragOverStatus === status && (
                  <span className="ml-auto text-[10px] text-blue-500 animate-pulse">
                    Drop here
                  </span>
                )}
              </button>

              {!collapsed &&
                items.map((task) => {
                  const dlInfo = getDeadlineInfo(task);
                  const pm =
                    priorityMeta[task.priority || "medium"] ||
                    priorityMeta.medium;
                  const sm = statusMeta[task.status];
                  const hierarchy = getHierarchyDisplay(task);
                  const memberNames = getTaskMemberNames(task, employeeById);
                  const leadName = task.assigneeName || memberNames[0] || "";
                  const canSubmit =
                    role === "employee" &&
                    task.status === "in_progress" &&
                    currentUserId &&
                    task.assigneeId === currentUserId;
                  const isDraggable = task.status !== "completed";
                  return (
                    <div
                      key={task.id}
                      draggable={isDraggable}
                      onDragStart={(e) => {
                        if (!isDraggable) return;
                        e.dataTransfer.setData("text/plain", task.id);
                        (e.currentTarget as HTMLElement).style.opacity = "0.5";
                      }}
                      onDragEnd={(e) => {
                        (e.currentTarget as HTMLElement).style.opacity = "1";
                      }}
                      className={`grid grid-cols-[20px_1fr_180px_90px_150px_120px] gap-0 px-4 py-3 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50/70 transition group ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                    >
                      {/* Priority bar */}
                      <div
                        className={`w-1 h-8 rounded-full ${pm.bar}`}
                        style={{ marginLeft: "2px" }}
                      />

                      {/* Task info */}
                      <div className="pl-3 pr-4 min-w-0">
                        {role === "depthead" && onOpenTaskEditor ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenTaskEditor(task);
                            }}
                            className="text-left text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug truncate hover:text-violet-700 transition"
                          >
                            {task.title}
                          </button>
                        ) : (
                          <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug truncate">
                            {task.title}
                          </div>
                        )}
                        {task.description && (
                          <div className="text-[11px] text-neutral-400 mt-0.5 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                          {task.tags && task.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="bg-neutral-100 text-neutral-500 text-[10px] px-1.5 py-0.5 rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                          <SubtaskProgressChip task={task} />
                        </div>
                        <div className="mt-1 text-[10px] text-violet-600/80 line-clamp-1">
                          {hierarchy.path}
                        </div>
                        {role === "depthead" &&
                          task.status === "for_review" && (
                            <SubmissionDetails
                              submission={task.latestSubmission}
                            />
                          )}
                        {role === "employee" && task.rejectionNote && (
                          <RejectionNotice
                            note={task.rejectionNote}
                            rejectedAt={task.rejectedAt}
                          />
                        )}
                        {role === "employee" &&
                          task.status !== "completed" &&
                          task.reopenReason && (
                            <ReopenNotice
                              reason={task.reopenReason}
                              reopenedAt={task.reopenedAt}
                              reopenedByName={task.reopenedByName}
                            />
                          )}
                      </div>

                      {/* Team */}
                      <div className="pr-4 min-w-0">
                        {leadName || task.teamName ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-neutral-800 text-[9px] text-white flex items-center justify-center font-['Lexend:SemiBold',_sans-serif] shrink-0">
                                {getInitials(leadName || task.teamName || "")}
                              </div>
                              {leadName && (
                                <Crown size={10} className="text-amber-500" />
                              )}
                              <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-800 truncate">
                                {leadName || "Unassigned"}
                              </span>
                            </div>
                            {task.teamName && (
                              <div className="text-[10px] text-neutral-400 mt-0.5 truncate">
                                {task.teamName}
                              </div>
                            )}
                            {memberNames.length > 1 && (
                              <div className="text-[10px] text-violet-600 mt-0.5 truncate">
                                Team: {memberNames.slice(0, 3).join(", ")}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[11px] text-neutral-400 italic">
                              Unassigned
                            </span>
                          </div>
                        )}
                        {role === "depthead" && (
                          <button
                            onClick={() =>
                              setListAssignModal({ open: true, task })
                            }
                            className="mt-1 text-[10px] text-violet-600 hover:underline"
                          >
                            Edit Team
                          </button>
                        )}
                      </div>

                      {/* Priority */}
                      <div className="flex justify-center">
                        <span
                          className={`text-[10px] font-['Lexend:Medium',_sans-serif] px-2 py-0.5 rounded-full ${pm.badge}`}
                        >
                          {pm.label}
                        </span>
                      </div>

                      {/* Due date */}
                      <div>
                        <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
                          {task.deadline || task.dueDate || "—"}
                        </div>
                        {dlInfo && task.status !== "completed" && (
                          <div
                            className={`inline-flex items-center gap-1 text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full border ${dlInfo.cls}`}
                          >
                            <Clock size={9} />
                            {dlInfo.label}
                          </div>
                        )}
                      </div>

                      {/* Status + actions */}
                      <div className="flex flex-col items-center gap-1.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-['Lexend:Medium',_sans-serif] px-2 py-0.5 rounded-full border ${sm.color}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${sm.dot}`}
                          />
                          {sm.label}
                        </span>

                        {role === "depthead" &&
                          task.status === "for_review" && (
                            <div className="flex gap-1">
                              <button
                                onClick={() => onVerify?.(task.id, true)}
                                className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-md hover:bg-emerald-600 transition"
                              >
                                ✓ Approve
                              </button>
                              <button
                                onClick={() => {
                                  const msg = prompt("Reason for rejection:");
                                  onVerify?.(
                                    task.id,
                                    false,
                                    msg || "Needs rework",
                                  );
                                }}
                                className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-md hover:bg-red-600 transition"
                              >
                                ✗
                              </button>
                            </div>
                          )}
                        {role === "depthead" && task.status === "completed" && (
                          <button
                            onClick={() => onUndoRequest?.(task)}
                            className="text-[10px] border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md hover:bg-amber-50 transition"
                          >
                            Undo
                          </button>
                        )}
                        {role === "employee" && task.status === "todo" && (
                          <button
                            onClick={() => onExecute?.(task.id)}
                            className="text-[10px] bg-blue-500 text-white px-2.5 py-0.5 rounded-md hover:bg-blue-600 transition"
                          >
                            Start
                          </button>
                        )}
                        {canSubmit && (
                          <button
                            onClick={() => onSubmitRequest?.(task)}
                            className="text-[10px] bg-violet-500 text-white px-2.5 py-0.5 rounded-md hover:bg-violet-600 transition"
                          >
                            Submit
                          </button>
                        )}
                        {role === "depthead" &&
                          (onOpenTaskEditor || onDeleteTaskRequest) && (
                            <div className="flex gap-1">
                              {onOpenTaskEditor && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onOpenTaskEditor(task);
                                  }}
                                  className="text-[10px] border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md hover:bg-neutral-100 transition"
                                >
                                  Edit
                                </button>
                              )}
                              {onDeleteTaskRequest && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onDeleteTaskRequest(task);
                                  }}
                                  className="text-[10px] border border-red-200 text-red-600 px-2 py-0.5 rounded-md hover:bg-red-50 transition"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          )}
                        {task.status === "completed" && task.auditHash && (
                          <div
                            className="text-[9px] text-neutral-400 cursor-help"
                            title={task.auditHash}
                          >
                            🔒 {task.auditHash.substring(0, 8)}…
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              {!collapsed && items.length === 0 && (
                <div className="px-4 py-4 text-[12px] text-neutral-300 italic text-center">
                  Drop tasks here or no tasks in this status.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* List view assign modal */}
      {listAssignModal.open && listAssignModal.task && (
        <AssignmentModal
          open={listAssignModal.open}
          onClose={() => setListAssignModal({ open: false, task: null })}
          employees={employees}
          employeeNotes={employeeNotes}
          selectedIds={getTaskMemberIds(listAssignModal.task)}
          leadId={
            listAssignModal.task.assigneeId ||
            getTaskMemberIds(listAssignModal.task)[0] ||
            null
          }
          onConfirm={async (memberIds, leadId) => {
            if (!listAssignModal.task) return;
            const normalizedMemberIds = uniqueValues(memberIds);
            const resolvedLeadId =
              (leadId && normalizedMemberIds.includes(leadId) && leadId) ||
              normalizedMemberIds[0] ||
              "";
            const lead = employees.find(
              (employee) => employee.id === resolvedLeadId,
            );
            const teamMemberNames = normalizedMemberIds
              .map(
                (id) =>
                  employees.find((employee) => employee.id === id)?.name || "",
              )
              .filter(Boolean);

            if (onUpdateTask) {
              const payload: UpdateTaskPayload = {
                teamMemberIds: normalizedMemberIds,
                teamMemberNames,
                assigneeId: resolvedLeadId,
                assigneeName: lead?.name || "",
                recommendedEmployeeIds: normalizedMemberIds,
                teamId: normalizedMemberIds.length
                  ? lead?.department ||
                    listAssignModal.task.teamId ||
                    departmentFilter ||
                    ""
                  : "",
                teamName: normalizedMemberIds.length
                  ? lead?.departmentName ||
                    lead?.department ||
                    listAssignModal.task.teamName ||
                    departmentFilter ||
                    ""
                  : "",
              };
              if (
                listAssignModal.task.status === "pending_assignment" &&
                normalizedMemberIds.length > 0
              ) {
                payload.status = "todo";
              }
              await onUpdateTask(listAssignModal.task.id, payload);
              return;
            }

            if (onAssign && lead && listAssignModal.task) {
              onAssign(listAssignModal.task.id, lead.id, lead.name, {
                teamMemberIds: normalizedMemberIds,
                teamMemberNames,
              });
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Kanban Board View ────────────────────────────────────────────

function KanbanBoardView({
  tasks,
  employees,
  role,
  onVerify,
  onExecute,
  onSubmitRequest,
  onOpenTaskEditor,
  onDeleteTaskRequest,
  currentUserId,
  currentUserName,
  onUndoRequest,
}: {
  tasks: Task[];
  employees: Employee[];
  role: "depthead" | "employee";
  onVerify?: MondayBoardProps["onVerify"];
  onExecute?: MondayBoardProps["onExecute"];
  onSubmitRequest?: (task: Task) => void;
  onOpenTaskEditor?: (task: Task) => void;
  onDeleteTaskRequest?: (task: Task) => void;
  currentUserId?: string;
  currentUserName?: string;
  onUndoRequest?: (task: Task) => void;
}) {
  const [dragOverStatus, setDragOverStatus] = useState<string | null>(null);
  const employeeById = useMemo(
    () =>
      Object.fromEntries(
        employees.map((employee) => [employee.id, employee]),
      ) as Record<string, Employee>,
    [employees],
  );

  const grouped = useMemo(() => {
    const map = new Map<TaskStatus, Task[]>();
    STATUS_ORDER.forEach((s) => map.set(s, []));
    tasks.forEach((t) => {
      const bucket = map.get(t.status);
      if (bucket) bucket.push(t);
    });
    return STATUS_ORDER.map((s) => ({ status: s, tasks: map.get(s)! }));
  }, [tasks]);

  const handleDrop = async (e: React.DragEvent, newStatus: TaskStatus) => {
    e.preventDefault();
    setDragOverStatus(null);
    const taskId = e.dataTransfer.getData("text/plain");
    if (!taskId) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatus || task.status === "completed")
      return;
    const actor = currentUserId
      ? { id: currentUserId, name: currentUserName }
      : undefined;
    try {
      await updateTaskStatus(taskId, newStatus, actor);
    } catch {}
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-3 min-h-[400px]">
      {grouped.map(({ status, tasks: items }) => {
        const meta = statusMeta[status];
        const isDragOver = dragOverStatus === status;
        return (
          <div
            key={status}
            className={`flex-shrink-0 w-[248px] flex flex-col rounded-2xl border transition-all ${
              isDragOver
                ? "border-blue-300 bg-blue-50/30 shadow-md"
                : "border-neutral-200 bg-neutral-50/50"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverStatus(status);
            }}
            onDragLeave={() => setDragOverStatus(null)}
            onDrop={(e) => handleDrop(e, status as TaskStatus)}
          >
            {/* Column header */}
            <div className="flex items-center gap-2 px-3.5 py-3 border-b border-neutral-200 shrink-0">
              <div className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                {meta.label}
              </span>
              <div className="ml-auto flex items-center justify-center w-5 h-5 rounded-full bg-neutral-200 text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-600">
                {items.length}
              </div>
            </div>

            {/* Cards */}
            <div className="flex-1 p-2 space-y-2">
              {items.map((task) => {
                const dlInfo = getDeadlineInfo(task);
                const pm =
                  priorityMeta[task.priority || "medium"] ||
                  priorityMeta.medium;
                const hierarchy = getHierarchyDisplay(task);
                const memberNames = getTaskMemberNames(task, employeeById);
                const leadName = task.assigneeName || memberNames[0] || "";
                const canSubmit =
                  role === "employee" &&
                  task.status === "in_progress" &&
                  currentUserId &&
                  task.assigneeId === currentUserId;
                const isDraggable = task.status !== "completed";
                return (
                  <div
                    key={task.id}
                    draggable={isDraggable}
                    onDragStart={(e) => {
                      if (!isDraggable) return;
                      e.dataTransfer.setData("text/plain", task.id);
                      (e.currentTarget as HTMLElement).style.opacity = "0.5";
                    }}
                    onDragEnd={(e) =>
                      ((e.currentTarget as HTMLElement).style.opacity = "1")
                    }
                    className={`bg-white border border-neutral-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all group ${isDraggable ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
                  >
                    {/* Top priority bar */}
                    <div
                      className={`h-0.5 rounded-full ${pm.kanbanBar} mb-2.5`}
                    />

                    {role === "depthead" && onOpenTaskEditor ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTaskEditor(task);
                        }}
                        className="text-left text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug hover:text-violet-700 transition"
                      >
                        {task.title}
                      </button>
                    ) : (
                      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug">
                        {task.title}
                      </div>
                    )}
                    {task.description && (
                      <div className="text-[10px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                        {task.description}
                      </div>
                    )}
                    <div className="mt-1 text-[9px] text-violet-600/80 line-clamp-2 leading-relaxed">
                      {hierarchy.path}
                    </div>
                    {role === "depthead" && task.status === "for_review" && (
                      <SubmissionDetails submission={task.latestSubmission} />
                    )}
                    {role === "employee" && task.rejectionNote && (
                      <RejectionNotice
                        note={task.rejectionNote}
                        rejectedAt={task.rejectedAt}
                      />
                    )}
                    {role === "employee" &&
                      task.status !== "completed" &&
                      task.reopenReason && (
                        <ReopenNotice
                          reason={task.reopenReason}
                          reopenedAt={task.reopenedAt}
                          reopenedByName={task.reopenedByName}
                        />
                      )}

                    <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                      {leadName && (
                        <div className="flex items-center gap-1">
                          <div className="w-4 h-4 rounded-full bg-neutral-800 text-[8px] text-white flex items-center justify-center font-['Lexend:SemiBold',_sans-serif]">
                            {getInitials(leadName)}
                          </div>
                          <Crown size={9} className="text-amber-500" />
                          <span className="text-[10px] text-neutral-600 font-['Lexend:Regular',_sans-serif]">
                            {leadName.split(" ")[0]}
                          </span>
                        </div>
                      )}
                      {memberNames.length > 1 && (
                        <span className="text-[9px] text-violet-600">
                          Team: {memberNames.length}
                        </span>
                      )}
                      {dlInfo && task.status !== "completed" && (
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded-full border ${dlInfo.cls}`}
                        >
                          {dlInfo.label}
                        </span>
                      )}
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full ${pm.badge}`}
                      >
                        {pm.label}
                      </span>
                      <SubtaskProgressChip task={task} />
                    </div>

                    {/* Actions */}
                    <div className="mt-2.5 flex gap-1">
                      {role === "depthead" && task.status === "for_review" && (
                        <>
                          <button
                            onClick={() => onVerify?.(task.id, true)}
                            className="flex-1 text-[10px] bg-emerald-500 text-white py-1 rounded-lg hover:bg-emerald-600 transition"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => {
                              const msg = prompt("Reason:");
                              onVerify?.(task.id, false, msg || "Needs rework");
                            }}
                            className="flex-1 text-[10px] bg-red-500 text-white py-1 rounded-lg hover:bg-red-600 transition"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      {role === "depthead" && task.status === "completed" && (
                        <button
                          onClick={() => onUndoRequest?.(task)}
                          className="flex-1 text-[10px] border border-amber-200 text-amber-700 py-1 rounded-lg hover:bg-amber-50 transition"
                        >
                          Undo
                        </button>
                      )}
                      {role === "employee" && task.status === "todo" && (
                        <button
                          onClick={() => onExecute?.(task.id)}
                          className="flex-1 text-[10px] bg-blue-500 text-white py-1 rounded-lg hover:bg-blue-600 transition"
                        >
                          Start Work
                        </button>
                      )}
                      {canSubmit && (
                        <button
                          onClick={() => onSubmitRequest?.(task)}
                          className="flex-1 text-[10px] bg-violet-500 text-white py-1 rounded-lg hover:bg-violet-600 transition"
                        >
                          Submit for Review
                        </button>
                      )}
                      {role === "depthead" && onOpenTaskEditor && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTaskEditor(task);
                          }}
                          className="text-[10px] border border-neutral-200 text-neutral-600 px-2 py-1 rounded-lg hover:bg-neutral-100 transition"
                        >
                          Edit
                        </button>
                      )}
                      {role === "depthead" && onDeleteTaskRequest && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteTaskRequest(task);
                          }}
                          className="text-[10px] border border-red-200 text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {items.length === 0 && (
                <div
                  className={`text-[11px] text-neutral-400 text-center py-8 italic rounded-xl border-2 border-dashed transition ${isDragOver ? "border-blue-300 bg-blue-50/40 text-blue-500" : "border-neutral-200"}`}
                >
                  {isDragOver ? "Drop here" : "No tasks"}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Timeline / Gantt View ────────────────────────────────────────

function HierarchyBoardView({
  tasks,
  employees,
  role,
  onVerify,
  onExecute,
  onSubmitRequest,
  onOpenTaskEditor,
  onDeleteTaskRequest,
  currentUserId,
  onUndoRequest,
}: {
  tasks: Task[];
  employees: Employee[];
  role: "depthead" | "employee";
  onVerify?: MondayBoardProps["onVerify"];
  onExecute?: MondayBoardProps["onExecute"];
  onSubmitRequest?: (task: Task) => void;
  onOpenTaskEditor?: (task: Task) => void;
  onDeleteTaskRequest?: (task: Task) => void;
  currentUserId?: string;
  currentUserName?: string;
  onUndoRequest?: (task: Task) => void;
}) {
  type ActivityNode = {
    key: string;
    title: string;
    schedule?: string;
    tasks: Task[];
  };
  type ProjectNode = { key: string; title: string; activities: ActivityNode[] };
  type ProgramNode = { key: string; title: string; projects: ProjectNode[] };
  type ProposalNode = { key: string; title: string; programs: ProgramNode[] };
  const employeeById = useMemo(
    () =>
      Object.fromEntries(
        employees.map((employee) => [employee.id, employee]),
      ) as Record<string, Employee>,
    [employees],
  );

  const tree = useMemo(() => {
    const proposals: ProposalNode[] = [];

    tasks.forEach((task) => {
      const hierarchy = getHierarchyDisplay(task);
      const proposalKey = task.proposalId || hierarchy.proposalTitle;
      const programKey =
        task.programId || `${proposalKey}|${hierarchy.programTitle}`;
      const projectKey =
        task.projectId || `${programKey}|${hierarchy.projectTitle}`;
      const activityKey =
        task.activityId || `${projectKey}|${hierarchy.activityTitle}`;

      let proposal = proposals.find((item) => item.key === proposalKey);
      if (!proposal) {
        proposal = {
          key: proposalKey,
          title: hierarchy.proposalTitle,
          programs: [],
        };
        proposals.push(proposal);
      }

      let program = proposal.programs.find((item) => item.key === programKey);
      if (!program) {
        program = {
          key: programKey,
          title: hierarchy.programTitle,
          projects: [],
        };
        proposal.programs.push(program);
      }

      let project = program.projects.find((item) => item.key === projectKey);
      if (!project) {
        project = {
          key: projectKey,
          title: hierarchy.projectTitle,
          activities: [],
        };
        program.projects.push(project);
      }

      let activity = project.activities.find(
        (item) => item.key === activityKey,
      );
      if (!activity) {
        activity = {
          key: activityKey,
          title: hierarchy.activityTitle,
          schedule: hierarchy.activitySchedule,
          tasks: [],
        };
        project.activities.push(activity);
      }

      activity.tasks.push(task);
    });

    return proposals;
  }, [tasks]);

  if (tree.length === 0) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-[12px] text-neutral-400">
        No tasks yet in this board.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tree.map((proposal) => {
        const proposalTaskCount = proposal.programs.reduce(
          (sum, program) =>
            sum +
            program.projects.reduce(
              (projectSum, project) =>
                projectSum +
                project.activities.reduce(
                  (activitySum, activity) =>
                    activitySum + activity.tasks.length,
                  0,
                ),
              0,
            ),
          0,
        );

        return (
          <section
            key={proposal.key}
            className="rounded-2xl border border-neutral-200 bg-white shadow-sm overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3 bg-neutral-900">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-300">
                  Proposal
                </div>
                <div className="text-[14px] text-white font-['Lexend:SemiBold',_sans-serif] truncate">
                  {proposal.title}
                </div>
              </div>
              <div className="rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[10px] uppercase tracking-wider text-white">
                {proposalTaskCount} tasks
              </div>
            </div>

            <div className="divide-y divide-neutral-100">
              {proposal.programs.map((program) => (
                <div key={program.key}>
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-violet-50 border-b border-violet-100">
                    <Layers size={13} className="text-violet-600" />
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-violet-900">
                      {program.title}
                    </div>
                    <span className="ml-auto text-[10px] uppercase tracking-wider text-violet-500">
                      Program
                    </span>
                  </div>

                  <div className="space-y-2 px-4 py-3">
                    {program.projects.map((project) => (
                      <div
                        key={project.key}
                        className="rounded-xl border border-neutral-200 bg-neutral-50/70"
                      >
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200 bg-white">
                          <ChevronRight
                            size={12}
                            className="text-neutral-400"
                          />
                          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">
                            {project.title}
                          </div>
                          <span className="ml-auto text-[9px] uppercase tracking-wider text-neutral-400">
                            Project
                          </span>
                        </div>

                        <div className="space-y-2 p-2.5">
                          {project.activities.map((activity) => (
                            <div
                              key={activity.key}
                              className="rounded-lg border border-neutral-200 bg-white"
                            >
                              <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-100 bg-neutral-50">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                                <div className="text-[11px] text-neutral-700 font-['Lexend:Medium',_sans-serif]">
                                  {activity.title}
                                </div>
                                {activity.schedule && (
                                  <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[9px] text-emerald-700">
                                    {activity.schedule}
                                  </span>
                                )}
                              </div>

                              <div className="divide-y divide-neutral-100">
                                {activity.tasks.map((task) => {
                                  const pm =
                                    priorityMeta[task.priority || "medium"] ||
                                    priorityMeta.medium;
                                  const sm = statusMeta[task.status];
                                  const dlInfo = getDeadlineInfo(task);
                                  const memberNames = getTaskMemberNames(
                                    task,
                                    employeeById,
                                  );
                                  const leadName =
                                    task.assigneeName || memberNames[0] || "";
                                  const canSubmit =
                                    role === "employee" &&
                                    task.status === "in_progress" &&
                                    currentUserId &&
                                    task.assigneeId === currentUserId;
                                  return (
                                    <div key={task.id} className="px-3 py-2.5">
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          {role === "depthead" &&
                                          onOpenTaskEditor ? (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onOpenTaskEditor(task);
                                              }}
                                              className="text-left text-[12px] text-neutral-900 font-['Lexend:Medium',_sans-serif] truncate hover:text-violet-700 transition"
                                            >
                                              {task.title}
                                            </button>
                                          ) : (
                                            <div className="text-[12px] text-neutral-900 font-['Lexend:Medium',_sans-serif] truncate">
                                              {task.title}
                                            </div>
                                          )}
                                          {task.description && (
                                            <div className="text-[10px] text-neutral-500 mt-0.5 line-clamp-2">
                                              {task.description}
                                            </div>
                                          )}
                                          <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                                            <span
                                              className={`text-[9px] px-1.5 py-0.5 rounded-full ${pm.badge}`}
                                            >
                                              {pm.label}
                                            </span>
                                            <SubtaskProgressChip task={task} />
                                            <span
                                              className={`inline-flex items-center gap-1 text-[9px] font-['Lexend:Medium',_sans-serif] px-1.5 py-0.5 rounded-full border ${sm.color}`}
                                            >
                                              <div
                                                className={`w-1.5 h-1.5 rounded-full ${sm.dot}`}
                                              />
                                              {sm.label}
                                            </span>
                                            {leadName && (
                                              <span className="text-[9px] text-neutral-500">
                                                Lead: {leadName}
                                              </span>
                                            )}
                                            {memberNames.length > 1 && (
                                              <span className="text-[9px] text-violet-600">
                                                Team: {memberNames.length}
                                              </span>
                                            )}
                                            {dlInfo &&
                                              task.status !== "completed" && (
                                                <span
                                                  className={`text-[9px] px-1.5 py-0.5 rounded-full border ${dlInfo.cls}`}
                                                >
                                                  {dlInfo.label}
                                                </span>
                                              )}
                                          </div>
                                          {role === "depthead" &&
                                            task.status === "for_review" && (
                                              <SubmissionDetails
                                                submission={
                                                  task.latestSubmission
                                                }
                                              />
                                            )}
                                          {role === "employee" &&
                                            task.rejectionNote && (
                                              <RejectionNotice
                                                note={task.rejectionNote}
                                                rejectedAt={task.rejectedAt}
                                              />
                                            )}
                                          {role === "employee" &&
                                            task.status !== "completed" &&
                                            task.reopenReason && (
                                              <ReopenNotice
                                                reason={task.reopenReason}
                                                reopenedAt={task.reopenedAt}
                                                reopenedByName={
                                                  task.reopenedByName
                                                }
                                              />
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                          {role === "depthead" &&
                                            task.status === "for_review" && (
                                              <>
                                                <button
                                                  onClick={() =>
                                                    onVerify?.(task.id, true)
                                                  }
                                                  className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-md hover:bg-emerald-600 transition"
                                                >
                                                  Approve
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    const msg =
                                                      prompt("Reason:");
                                                    onVerify?.(
                                                      task.id,
                                                      false,
                                                      msg || "Needs rework",
                                                    );
                                                  }}
                                                  className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded-md hover:bg-red-600 transition"
                                                >
                                                  Reject
                                                </button>
                                              </>
                                            )}
                                          {role === "depthead" &&
                                            task.status === "completed" && (
                                              <button
                                                onClick={() =>
                                                  onUndoRequest?.(task)
                                                }
                                                className="text-[10px] border border-amber-200 text-amber-700 px-2 py-0.5 rounded-md hover:bg-amber-50 transition"
                                              >
                                                Undo
                                              </button>
                                            )}
                                          {role === "employee" &&
                                            task.status === "todo" && (
                                              <button
                                                onClick={() =>
                                                  onExecute?.(task.id)
                                                }
                                                className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-md hover:bg-blue-600 transition"
                                              >
                                                Start
                                              </button>
                                            )}
                                          {canSubmit && (
                                            <button
                                              onClick={() =>
                                                onSubmitRequest?.(task)
                                              }
                                              className="text-[10px] bg-violet-500 text-white px-2 py-0.5 rounded-md hover:bg-violet-600 transition"
                                            >
                                              Submit
                                            </button>
                                          )}
                                          {role === "depthead" &&
                                            onOpenTaskEditor && (
                                              <button
                                                onClick={() =>
                                                  onOpenTaskEditor(task)
                                                }
                                                className="text-[10px] border border-neutral-200 text-neutral-600 px-2 py-0.5 rounded-md hover:bg-neutral-100 transition"
                                              >
                                                Edit
                                              </button>
                                            )}
                                          {role === "depthead" &&
                                            onDeleteTaskRequest && (
                                              <button
                                                onClick={() =>
                                                  onDeleteTaskRequest(task)
                                                }
                                                className="text-[10px] border border-red-200 text-red-600 px-2 py-0.5 rounded-md hover:bg-red-50 transition"
                                              >
                                                Delete
                                              </button>
                                            )}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function TimelineView({
  tasks,
  role,
  onOpenTaskEditor,
}: {
  tasks: Task[];
  role: "depthead" | "employee";
  onOpenTaskEditor?: (task: Task) => void;
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const WEEKS = 12;
  // Start 2 weeks before today
  const windowStart = new Date(today);
  windowStart.setDate(windowStart.getDate() - 14);
  const totalDays = WEEKS * 7;

  const weeks: Date[] = Array.from({ length: WEEKS }, (_, i) => {
    const d = new Date(windowStart);
    d.setDate(d.getDate() + i * 7);
    return d;
  });

  const dayOffset = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return Math.floor((d.getTime() - windowStart.getTime()) / 86400000);
  };

  const todayOffset = dayOffset(today);
  const todayPct = (todayOffset / totalDays) * 100;

  const tasksWithDates = tasks
    .map((task) => {
      const parsedDeadline = parseTaskDeadline(
        task.deadline || task.dueDate || "",
      );
      return parsedDeadline ? { task, parsedDeadline } : null;
    })
    .filter(
      (item): item is { task: Task; parsedDeadline: Date } => item !== null,
    );

  return (
    <div className="w-full bg-white border border-neutral-200 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <div className="flex border-b border-neutral-200 sticky top-0 bg-white z-10">
        <div className="w-[220px] shrink-0 px-4 py-2.5 border-r border-neutral-100">
          <div className="text-[10px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-[0.12em] text-neutral-400">
            Task
          </div>
        </div>
        <div className="flex-1 flex relative">
          {weeks.map((w, i) => (
            <div
              key={i}
              className="flex-1 px-1 py-2.5 border-r border-neutral-100 last:border-0 text-center"
            >
              <div className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-400">
                {w.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Rows */}
      <div>
        {tasksWithDates.length === 0 && (
          <div className="py-14 text-center text-[12px] text-neutral-400 italic">
            No tasks with due dates to display on the timeline.
          </div>
        )}

        {tasksWithDates.map(({ task, parsedDeadline }) => {
          const startTaskDate = task.createdAt
            ? new Date(task.createdAt)
            : new Date();
          startTaskDate.setHours(0, 0, 0, 0);

          const startOff = Math.max(0, dayOffset(startTaskDate));
          const endOff = Math.min(totalDays, dayOffset(parsedDeadline));
          const barLeft = (startOff / totalDays) * 100;
          const barWidth = Math.max(
            0.8,
            ((endOff - startOff) / totalDays) * 100,
          );

          const pm =
            priorityMeta[task.priority || "medium"] || priorityMeta.medium;
          const sm = statusMeta[task.status];
          const dlInfo = getDeadlineInfo(task);
          const isOverdue = dlInfo?.label.includes("overdue");
          const isDueToday = dlInfo?.label === "Due today";

          const barColor =
            task.status === "completed"
              ? "bg-emerald-400"
              : isOverdue
                ? "bg-red-500"
                : isDueToday
                  ? "bg-amber-400"
                  : task.priority === "high"
                    ? "bg-red-400"
                    : task.priority === "medium"
                      ? "bg-blue-400"
                      : "bg-emerald-400";

          return (
            <div
              key={task.id}
              className="flex border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50 group transition"
            >
              {/* Label */}
              <div className="w-[220px] shrink-0 px-4 py-3 border-r border-neutral-100">
                <div className="flex items-start gap-2">
                  <div className={`w-1 h-8 rounded-full shrink-0 ${pm.bar}`} />
                  <div className="min-w-0">
                    {role === "depthead" && onOpenTaskEditor ? (
                      <button
                        onClick={() => onOpenTaskEditor(task)}
                        className="text-left text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate hover:text-violet-700 transition"
                      >
                        {task.title}
                      </button>
                    ) : (
                      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                        {task.title}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                      <span
                        className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full border ${sm.color}`}
                      >
                        <div className={`w-1 h-1 rounded-full ${sm.dot}`} />
                        {sm.label}
                      </span>
                      {task.assigneeName && (
                        <span className="text-[9px] text-neutral-400 truncate">
                          {task.assigneeName.split(" ")[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Gantt bar area */}
              <div className="flex-1 relative py-3">
                {/* Week grid lines */}
                {weeks.map((_, i) => (
                  <div
                    key={i}
                    className="absolute top-0 bottom-0 w-px bg-neutral-100 pointer-events-none"
                    style={{ left: `${(i / WEEKS) * 100}%` }}
                  />
                ))}

                {/* Today line */}
                {todayPct >= 0 && todayPct <= 100 && (
                  <div
                    className="absolute top-0 bottom-0 z-10 pointer-events-none"
                    style={{ left: `${todayPct}%` }}
                  >
                    <div className="w-px h-full bg-blue-400/50" />
                    <div className="absolute top-0 left-0 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
                  </div>
                )}

                {/* Task bar */}
                {endOff > 0 && startOff <= totalDays && (
                  <div
                    className={`absolute top-1/2 -translate-y-1/2 h-5 rounded-full flex items-center px-2 text-[10px] text-white font-['Lexend:Medium',_sans-serif] whitespace-nowrap overflow-hidden shadow-sm transition-all group-hover:shadow-md ${barColor}`}
                    style={{
                      left: `${barLeft}%`,
                      width: `${barWidth}%`,
                      minWidth: "16px",
                    }}
                    title={`${task.title} · Due: ${task.deadline || task.dueDate}`}
                  >
                    {barWidth > 5 ? task.title : ""}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 py-2.5 border-t border-neutral-100 bg-neutral-50">
        <div className="flex items-center gap-1.5">
          <div className="w-px h-4 bg-blue-400/60" />
          <span className="text-[10px] text-neutral-400">Today</span>
        </div>
        {[
          { color: "bg-emerald-400", label: "Completed" },
          { color: "bg-red-500", label: "Overdue" },
          { color: "bg-amber-400", label: "Due Today" },
          { color: "bg-blue-400", label: "On Track" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-4 h-2 rounded-full ${color}`} />
            <span className="text-[10px] text-neutral-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main MondayBoard Component ───────────────────────────────────

export function MondayBoard({
  tasks,
  employees = [],
  employeeNotes,
  role,
  departmentFilter,
  currentUserId,
  currentUserName,
  onAssign,
  onExecute,
  onSubmit,
  onVerify,
  onCreateTask,
  onUpdateTask,
  onDeleteTask,
}: MondayBoardProps) {
  // ── View & composer state ─────────────────────────────────────
  const [boardView, setBoardView] = useState<BoardView>("list");
  const [composerOpen, setComposerOpen] = useState(role === "depthead");
  const [composerTab, setComposerTab] = useState<ComposerTab>("manual");

  // ── Employee lookups ──────────────────────────────────────────
  const deptEmployees = useMemo(() => {
    if (!departmentFilter || !employees) return employees || [];
    return employees.filter((e) => e.department === departmentFilter);
  }, [employees, departmentFilter]);

  const deptEmployeesWithNotes = useMemo(
    () => deptEmployees.filter((emp) => Boolean(employeeNotes?.[emp.id])),
    [deptEmployees, employeeNotes],
  );

  const employeesForAi = useMemo(
    () =>
      deptEmployeesWithNotes.length > 0
        ? deptEmployeesWithNotes
        : deptEmployees,
    [deptEmployees, deptEmployeesWithNotes],
  );

  const employeeById = useMemo(
    () =>
      Object.fromEntries(deptEmployees.map((e) => [e.id, e])) as Record<
        string,
        Employee
      >,
    [deptEmployees],
  );

  const [taskEditorOpen, setTaskEditorOpen] = useState(false);
  const [taskEditorTaskId, setTaskEditorTaskId] = useState<string | null>(null);
  const [taskEditorDraft, setTaskEditorDraft] =
    useState<TaskEditorDraft | null>(null);
  const [taskEditorSaving, setTaskEditorSaving] = useState(false);
  const [taskEditorError, setTaskEditorError] = useState("");
  const [taskEditorAssignOpen, setTaskEditorAssignOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitModalTask, setSubmitModalTask] = useState<Task | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [submitFiles, setSubmitFiles] = useState<File[]>([]);
  const [submitError, setSubmitError] = useState("");
  const [submitSaving, setSubmitSaving] = useState(false);
  const [undoModalOpen, setUndoModalOpen] = useState(false);
  const [undoModalTask, setUndoModalTask] = useState<Task | null>(null);
  const [undoReason, setUndoReason] = useState("");
  const [undoError, setUndoError] = useState("");
  const [undoSaving, setUndoSaving] = useState(false);

  // ── Task filter ───────────────────────────────────────────────
  const deptTasks = useMemo(() => {
    if (!departmentFilter) return tasks;
    return tasks.filter(
      (t) =>
        !t.department ||
        t.department === departmentFilter ||
        t.status === "pending_assignment",
    );
  }, [tasks, departmentFilter]);

  const editingTask = useMemo(
    () =>
      taskEditorTaskId
        ? deptTasks.find((task) => task.id === taskEditorTaskId) || null
        : null,
    [deptTasks, taskEditorTaskId],
  );

  const openTaskEditor = useCallback((task: Task) => {
    setTaskEditorTaskId(task.id);
    setTaskEditorDraft(buildTaskEditorDraft(task));
    setTaskEditorError("");
    setTaskEditorOpen(true);
  }, []);

  const closeTaskEditor = useCallback(() => {
    setTaskEditorOpen(false);
    setTaskEditorTaskId(null);
    setTaskEditorDraft(null);
    setTaskEditorError("");
    setTaskEditorAssignOpen(false);
    setTaskEditorSaving(false);
  }, []);

  const openSubmitModal = useCallback((task: Task) => {
    setSubmitModalTask(task);
    setSubmitNote("");
    setSubmitFiles([]);
    setSubmitError("");
    setSubmitSaving(false);
    setSubmitModalOpen(true);
  }, []);

  const closeSubmitModal = useCallback(() => {
    setSubmitModalOpen(false);
    setSubmitModalTask(null);
    setSubmitNote("");
    setSubmitFiles([]);
    setSubmitError("");
    setSubmitSaving(false);
  }, []);

  const handleRemoveAttachment = useCallback((index: number) => {
    setSubmitFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleSubmitConfirm = useCallback(async () => {
    if (!submitModalTask) return;
    if (!onSubmit) {
      closeSubmitModal();
      return;
    }
    const trimmedNote = submitNote.trim();
    if (!trimmedNote) {
      setSubmitError("Completion note is required.");
      return;
    }

    setSubmitSaving(true);
    setSubmitError("");
    try {
      await onSubmit(submitModalTask.id, {
        note: trimmedNote,
        attachments: submitFiles,
      });
      closeSubmitModal();
    } catch {
      setSubmitError("Failed to submit for review. Please try again.");
      setSubmitSaving(false);
    }
  }, [closeSubmitModal, onSubmit, submitFiles, submitModalTask, submitNote]);

  const openUndoModal = useCallback((task: Task) => {
    setUndoModalTask(task);
    setUndoReason("");
    setUndoError("");
    setUndoSaving(false);
    setUndoModalOpen(true);
  }, []);

  const closeUndoModal = useCallback(() => {
    setUndoModalOpen(false);
    setUndoModalTask(null);
    setUndoReason("");
    setUndoError("");
    setUndoSaving(false);
  }, []);

  const handleUndoConfirm = useCallback(async () => {
    if (!undoModalTask) return;
    const trimmedReason = undoReason.trim();
    if (!trimmedReason) {
      setUndoError("Undo reason is required.");
      return;
    }

    setUndoSaving(true);
    setUndoError("");
    try {
      await undoCompletedTask(undoModalTask.id, {
        reason: trimmedReason,
        actor: currentUserId
          ? {
              id: currentUserId,
              name: currentUserName || "Department Head",
            }
          : undefined,
      });
      closeUndoModal();
    } catch {
      setUndoError("Failed to reopen task. Please try again.");
      setUndoSaving(false);
    }
  }, [
    closeUndoModal,
    currentUserId,
    currentUserName,
    undoModalTask,
    undoReason,
  ]);

  useEffect(() => {
    if (taskEditorOpen && taskEditorTaskId && !editingTask) {
      closeTaskEditor();
    }
  }, [taskEditorOpen, taskEditorTaskId, editingTask, closeTaskEditor]);

  // ── Manual Composer state ─────────────────────────────────────
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDeadline, setNewDeadline] = useState("");
  const [newPriority, setNewPriority] = useState<"low" | "medium" | "high">(
    "medium",
  );
  const [newTags, setNewTags] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<Employee[]>([]);
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [composerAiLoading, setComposerAiLoading] = useState(false);
  const [composerAiRec, setComposerAiRec] =
    useState<LLMTeamRecommendation | null>(null);
  const [composerAiOffline, setComposerAiOffline] = useState(false);

  const handleCreate = () => {
    if (!newTitle.trim() || !newDeadline || !onCreateTask) return;
    const lead = selectedMembers[0];
    const payload: CreateTaskPayload = {
      title: newTitle.trim(),
      description: newDesc.trim() || "No description provided.",
      deadline: newDeadline,
      priority: newPriority,
      tags: newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      teamMemberIds: selectedMembers.map((m) => m.id),
      teamMemberNames: selectedMembers.map((m) => m.name),
      assigneeId: lead?.id,
      assigneeName: lead?.name,
      teamId: lead?.department || departmentFilter || "",
      teamName: lead?.departmentName || lead?.department || "Custom Team",
      status: selectedMembers.length ? "todo" : "pending_assignment",
    };
    onCreateTask(payload);
    setNewTitle("");
    setNewDesc("");
    setNewDeadline("");
    setNewTags("");
    setSelectedMembers([]);
    setComposerAiRec(null);
    setComposerAiOffline(false);
  };

  const handleAiSuggest = async () => {
    if (!newTitle.trim()) return;
    setComposerAiLoading(true);
    setComposerAiOffline(false);
    try {
      const draftTask: Task = {
        id: "draft",
        title: newTitle.trim(),
        description: newDesc.trim() || "No description provided.",
        status: "pending_assignment",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const rec = await recommendTeam(draftTask, employeesForAi, employeeNotes);
      if (rec) {
        setComposerAiRec(rec);
        setSelectedMembers(
          rec.recommendedEmployeeIds
            .map((id) => employeeById[id])
            .filter(Boolean) as Employee[],
        );
      } else {
        setComposerAiOffline(true);
      }
    } catch {
      setComposerAiOffline(true);
    } finally {
      setComposerAiLoading(false);
    }
  };

  const handleTaskEditorSave = async () => {
    if (!onUpdateTask || !editingTask || !taskEditorDraft) return;
    if (!taskEditorDraft.title.trim()) {
      setTaskEditorError("Task title is required.");
      return;
    }

    const memberIds = uniqueValues(taskEditorDraft.teamMemberIds);
    const resolvedLeadId =
      (taskEditorDraft.leadMemberId &&
        memberIds.includes(taskEditorDraft.leadMemberId) &&
        taskEditorDraft.leadMemberId) ||
      memberIds[0] ||
      "";
    const leadMember = resolvedLeadId
      ? employeeById[resolvedLeadId]
      : undefined;
    const teamMemberNames = memberIds
      .map((id) => employeeById[id]?.name || "")
      .filter(Boolean);
    const hierarchyPath = [
      taskEditorDraft.proposalTitle,
      taskEditorDraft.programTitle,
      taskEditorDraft.projectTitle,
      taskEditorDraft.activityTitle,
    ]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(" > ");

    const payload: UpdateTaskPayload = {
      title: taskEditorDraft.title.trim(),
      description: taskEditorDraft.description.trim(),
      deadline: taskEditorDraft.deadline.trim(),
      priority: taskEditorDraft.priority,
      tags: uniqueValues(
        taskEditorDraft.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      ),
      proposalTitle: taskEditorDraft.proposalTitle.trim(),
      programTitle: taskEditorDraft.programTitle.trim(),
      projectTitle: taskEditorDraft.projectTitle.trim(),
      activityTitle: taskEditorDraft.activityTitle.trim(),
      activitySchedule: taskEditorDraft.activitySchedule.trim(),
      hierarchyPath,
      teamMemberIds: memberIds,
      teamMemberNames,
      assigneeId: resolvedLeadId,
      assigneeName: leadMember?.name || "",
      recommendedEmployeeIds: memberIds,
      teamId: memberIds.length
        ? leadMember?.department || editingTask.teamId || departmentFilter || ""
        : "",
      teamName: memberIds.length
        ? leadMember?.departmentName ||
          leadMember?.department ||
          editingTask.teamName ||
          departmentFilter ||
          ""
        : "",
    };

    if (editingTask.status === "pending_assignment" && memberIds.length > 0) {
      payload.status = "todo";
    }

    setTaskEditorSaving(true);
    setTaskEditorError("");
    try {
      await onUpdateTask(editingTask.id, payload);
      closeTaskEditor();
    } catch {
      setTaskEditorError("Failed to save task changes. Please try again.");
      setTaskEditorSaving(false);
    }
  };

  const handleTaskDeleteRequest = useCallback(
    async (task: Task) => {
      if (!onDeleteTask) return;
      const confirmed = window.confirm(
        `Delete task "${task.title}"? This cannot be undone.`,
      );
      if (!confirmed) return;
      try {
        await onDeleteTask(task.id);
        if (taskEditorTaskId === task.id) closeTaskEditor();
      } catch {
        setTaskEditorError("Failed to delete task. Please try again.");
        setTaskEditorOpen(true);
      }
    },
    [onDeleteTask, taskEditorTaskId, closeTaskEditor],
  );

  const handleTaskEditorDelete = async () => {
    if (!editingTask) return;
    setTaskEditorSaving(true);
    await handleTaskDeleteRequest(editingTask);
    setTaskEditorSaving(false);
  };

  // ── PDF Composer state ────────────────────────────────────────
  const pdfFileRef = useRef<HTMLInputElement>(null);
  const [pdfPhase, setPdfPhase] = useState<PdfPhase>("idle");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // Assignment modal for PDF drafts
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalTaskKey, setAssignModalTaskKey] = useState<string | null>(
    null,
  );
  const currentDraftTask = assignModalTaskKey
    ? draftTasks.find((t) => t.key === assignModalTaskKey) || null
    : null;

  const buildDraftTasks = (
    result: ProposalDecompositionResult,
    fallbackProposalTitle?: string,
  ): DraftTask[] => {
    const out: DraftTask[] = [];
    const proposalTitle =
      result.proposal?.title ||
      fallbackProposalTitle ||
      pdfFileName.replace(/\.pdf$/i, "") ||
      "Imported Proposal";
    result.programs.forEach((prog, pi) => {
      prog.projects.forEach((proj, pj) => {
        proj.activities.forEach((act, ai) => {
          const hierarchyIds = buildHierarchyIds(
            proposalTitle,
            prog.title,
            proj.title,
            act.title,
            pi,
            pj,
            ai,
          );
          act.tasks.forEach((t, ti) => {
            out.push({
              key: `${pi}-${pj}-${ai}-${ti}`,
              proposalTitle,
              proposalId: hierarchyIds.proposalId,
              programIdx: pi,
              projectIdx: pj,
              activityIdx: ai,
              taskIdx: ti,
              programId: hierarchyIds.programId,
              programTitle: prog.title,
              projectId: hierarchyIds.projectId,
              projectTitle: proj.title,
              activityId: hierarchyIds.activityId,
              activityTitle: act.title,
              activitySchedule: act.schedule || "",
              title: t.title,
              description: t.description,
              deadline: act.schedule || "",
              priority: t.priority || "medium",
              requiredSkills: t.requiredSkills || [],
              assignedMemberIds: t.recommendedEmployeeIds || [],
              leadMemberId: t.recommendedEmployeeIds?.[0] || null,
              burnoutWarning: t.burnoutWarning || false,
              reasoning: t.recommendationReasoning || "",
              enabled: true,
            });
          });
        });
      });
    });
    return out;
  };

  const handlePdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please upload a PDF file.");
      setPdfPhase("error");
      return;
    }
    setPdfFileName(file.name);
    setPdfError("");
    setDraftTasks([]);
    setCommitMessage("");
    setPdfPhase("extracting");

    let text: string;
    try {
      text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setPdfError("Could not extract text from PDF. It may be image-based.");
        setPdfPhase("error");
        return;
      }
    } catch {
      setPdfError("Failed to read PDF file.");
      setPdfPhase("error");
      return;
    }

    setPdfPhase("decomposing");
    try {
      const result = await decomposeProposal(
        text,
        file.name.replace(/\.pdf$/i, ""),
        employeesForAi,
        employeeNotes,
      );
      setDraftTasks(buildDraftTasks(result, file.name.replace(/\.pdf$/i, "")));
      setPdfPhase("review");
    } catch {
      setPdfError("AI decomposition failed. Please try again.");
      setPdfPhase("error");
    }
  };

  const handleDraftUpdate = (key: string, patch: Partial<DraftTask>) =>
    setDraftTasks((prev) =>
      prev.map((task) => (task.key === key ? { ...task, ...patch } : task)),
    );

  const handleDraftDelete = (key: string) =>
    setDraftTasks((prev) => prev.filter((task) => task.key !== key));

  const handleDraftAdd = (
    programIdx: number,
    projectIdx: number,
    activityIdx: number,
  ) => {
    const sibling = draftTasks.find(
      (task) =>
        task.programIdx === programIdx &&
        task.projectIdx === projectIdx &&
        task.activityIdx === activityIdx,
    );
    const proposalTitle =
      sibling?.proposalTitle ||
      pdfFileName.replace(/\.pdf$/i, "") ||
      "Imported Proposal";
    const programTitle = sibling?.programTitle || "Program";
    const projectTitle = sibling?.projectTitle || "Project";
    const activityTitle = sibling?.activityTitle || "Activity";
    const hierarchyIds = buildHierarchyIds(
      proposalTitle,
      programTitle,
      projectTitle,
      activityTitle,
      programIdx,
      projectIdx,
      activityIdx,
    );
    const newKey = `${programIdx}-${projectIdx}-${activityIdx}-${Date.now()}`;

    setDraftTasks((prev) => [
      ...prev,
      {
        key: newKey,
        proposalTitle,
        proposalId: sibling?.proposalId || hierarchyIds.proposalId,
        programIdx,
        projectIdx,
        activityIdx,
        taskIdx: Date.now(),
        programId: sibling?.programId || hierarchyIds.programId,
        programTitle,
        projectId: sibling?.projectId || hierarchyIds.projectId,
        projectTitle,
        activityId: sibling?.activityId || hierarchyIds.activityId,
        activityTitle,
        activitySchedule: sibling?.activitySchedule || "",
        title: "New Task",
        description: "",
        deadline: "",
        priority: "medium",
        requiredSkills: [],
        assignedMemberIds: [],
        leadMemberId: null,
        burnoutWarning: false,
        reasoning: "",
        enabled: true,
      },
    ]);
  };

  const handleCommit = async () => {
    if (!onCreateTask) return;
    const toCreate = draftTasks.filter((t) => t.enabled);
    if (toCreate.length === 0) return;
    setCommitting(true);
    const batchPrefix =
      toCreate[0]?.proposalId ||
      `proposal-${slugifyFragment(pdfFileName.replace(/\.pdf$/i, ""), "imported")}`;
    const importBatchId = `${batchPrefix}-${Date.now()}`;
    let created = 0;
    let failed = 0;
    for (const dt of toCreate) {
      try {
        const selectedTeamMembers = dt.assignedMemberIds
          .map((id) => employeeById[id])
          .filter((member): member is Employee => Boolean(member));
        const leadMember =
          (dt.leadMemberId ? employeeById[dt.leadMemberId] : undefined) ||
          selectedTeamMembers[0];
        const payload: CreateTaskPayload = {
          title: dt.title,
          description: dt.description || "No description provided.",
          deadline: dt.deadline || "",
          priority: dt.priority,
          tags: dt.requiredSkills,
          status: "pending_assignment",
          department: departmentFilter || "",
          teamId: departmentFilter || "",
          teamName:
            leadMember?.departmentName ||
            leadMember?.department ||
            departmentFilter ||
            "Imported",
          teamMemberIds: selectedTeamMembers.map((member) => member.id),
          teamMemberNames: selectedTeamMembers.map((member) => member.name),
          assigneeId: leadMember?.id,
          assigneeName: leadMember?.name,
          recommendedEmployeeIds: dt.assignedMemberIds,
          recommendationReasoning: dt.reasoning,
          recommendationSource: "import",
          recommendationLeadId: dt.leadMemberId || undefined,
          burnoutWarning: dt.burnoutWarning,
          proposalId: dt.proposalId,
          proposalTitle: dt.proposalTitle,
          programId: dt.programId,
          programTitle: dt.programTitle,
          projectId: dt.projectId,
          projectTitle: dt.projectTitle,
          activityId: dt.activityId,
          activityTitle: dt.activityTitle,
          activitySchedule: dt.activitySchedule,
          hierarchyPath: [
            dt.proposalTitle,
            dt.programTitle,
            dt.projectTitle,
            dt.activityTitle,
          ]
            .filter(Boolean)
            .join(" > "),
          importBatchId,
        };
        await onCreateTask(payload);
        created++;
      } catch {
        failed++;
      }
    }
    setCommitting(false);
    if (created > 0) {
      setBoardView("hierarchy");
    }
    if (failed > 0) {
      setCommitMessage(
        `Created ${created} task${created !== 1 ? "s" : ""}; ${failed} failed to save.`,
      );
    } else {
      setCommitMessage(
        `Created ${created} task${created !== 1 ? "s" : ""} and committed to the board.`,
      );
    }
  };

  return (
    <div className="w-full flex flex-col gap-5 font-['Lexend:Regular',_sans-serif]">
      {/* ─── Task Composer (Dept Head only) ──────────────────── */}
      {role === "depthead" && (
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm overflow-hidden">
          {/* Composer header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-neutral-400 font-['Lexend:Medium',_sans-serif]">
                Task Composer
              </div>
              <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
                Create & Import Tasks
              </div>
            </div>
            <button
              onClick={() => setComposerOpen((p) => !p)}
              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2.5 py-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600 hover:bg-neutral-50 transition"
            >
              {composerOpen ? (
                <ChevronDown size={13} />
              ) : (
                <ChevronRight size={13} />
              )}
              {composerOpen ? "Collapse" : "Expand"}
            </button>
          </div>

          {composerOpen && (
            <div>
              {/* Tab selector */}
              <div className="flex border-b border-neutral-100 px-5 bg-neutral-50/50">
                {(
                  [
                    {
                      id: "manual" as ComposerTab,
                      icon: <Edit2 size={12} />,
                      label: "Manual Task",
                    },
                    {
                      id: "pdf" as ComposerTab,
                      icon: <FileText size={12} />,
                      label: "PDF Proposal Import",
                    },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setComposerTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-[12px] font-['Lexend:Medium',_sans-serif] border-b-2 transition ${
                      composerTab === tab.id
                        ? "border-neutral-900 text-neutral-900"
                        : "border-transparent text-neutral-400 hover:text-neutral-700"
                    }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* ── Manual Tab ── */}
              {composerTab === "manual" && (
                <div className="p-5">
                  <div className="grid gap-3 md:grid-cols-[1fr_180px]">
                    <input
                      type="text"
                      placeholder="Task title…"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="h-[42px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white transition"
                    />
                    <input
                      type="date"
                      value={newDeadline}
                      onChange={(e) => setNewDeadline(e.target.value)}
                      className="h-[42px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white transition"
                    />
                  </div>
                  <textarea
                    rows={2}
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Description or context for the AI assignment engine…"
                    className="mt-3 w-full resize-none rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-[13px] text-neutral-900 outline-none focus:border-neutral-400 focus:bg-white transition"
                  />
                  <div className="mt-3 grid gap-3 md:grid-cols-[140px_1fr]">
                    <select
                      value={newPriority}
                      onChange={(e) =>
                        setNewPriority(
                          e.target.value as "low" | "medium" | "high",
                        )
                      }
                      className="h-[36px] rounded-xl border border-neutral-200 bg-neutral-50 px-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400"
                    >
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                    <input
                      type="text"
                      value={newTags}
                      onChange={(e) => setNewTags(e.target.value)}
                      placeholder="Tags (comma-separated): drainage, inspection, civil-works…"
                      className="h-[36px] rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 transition"
                    />
                  </div>

                  {/* Team assignment area */}
                  <div className="mt-3 rounded-xl border border-dashed border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-['Lexend:Medium',_sans-serif]">
                        Team Assignment
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAiSuggest}
                          disabled={composerAiLoading || !newTitle.trim()}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full bg-violet-100 text-[11px] font-['Lexend:Medium',_sans-serif] text-violet-800 hover:bg-violet-200 disabled:opacity-50 transition"
                        >
                          {composerAiLoading ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : (
                            <Sparkles size={11} />
                          )}
                          AI Suggest
                        </button>
                        <button
                          onClick={() => setManualModalOpen(true)}
                          disabled={!deptEmployees.length}
                          className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 transition"
                        >
                          <Users size={11} />
                          Browse
                        </button>
                        {selectedMembers.length > 0 && (
                          <button
                            onClick={() => setSelectedMembers([])}
                            className="h-7 px-2.5 rounded-full border border-neutral-200 bg-white text-[11px] text-neutral-500 hover:bg-neutral-50 transition"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                    {selectedMembers.length === 0 ? (
                      <div className="text-[12px] text-neutral-400">
                        No team assigned · click{" "}
                        <span className="font-['Lexend:Medium',_sans-serif]">
                          Browse
                        </span>{" "}
                        or{" "}
                        <span className="font-['Lexend:Medium',_sans-serif]">
                          AI Suggest
                        </span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedMembers.map((m, i) => (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 text-neutral-700 text-[11px] px-2.5 py-1 rounded-full"
                          >
                            <span className="w-4 h-4 rounded-full bg-neutral-800 text-[9px] text-white flex items-center justify-center font-['Lexend:SemiBold',_sans-serif]">
                              {getInitials(m.name)}
                            </span>
                            {i === 0 && (
                              <Crown size={10} className="text-amber-500" />
                            )}
                            {m.name.split(" ")[0]}
                            <button
                              onClick={() =>
                                setSelectedMembers((p) =>
                                  p.filter((x) => x.id !== m.id),
                                )
                              }
                            >
                              <X size={10} className="text-neutral-400" />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    {composerAiOffline && (
                      <div className="mt-2 text-[11px] text-red-600">
                        AI suggestions unavailable right now.
                      </div>
                    )}
                    {composerAiRec?.reasoning && (
                      <div className="mt-2 text-[11px] text-violet-600 italic">
                        {composerAiRec.reasoning}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-[11px] text-neutral-400">
                      Tasks without a team go to Pending Assignment.
                    </div>
                    <button
                      onClick={handleCreate}
                      disabled={!newTitle.trim() || !newDeadline}
                      className="px-5 py-2 bg-neutral-900 text-white text-[12px] font-['Lexend:SemiBold',_sans-serif] rounded-xl hover:bg-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Create Task
                    </button>
                  </div>
                </div>
              )}

              {/* ── PDF Import Tab ── */}
              {composerTab === "pdf" && (
                <div className="p-5">
                  {/* Idle — drop zone */}
                  {pdfPhase === "idle" && (
                    <div
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        const f = e.dataTransfer.files[0];
                        if (f) handlePdfFile(f);
                      }}
                      onClick={() => pdfFileRef.current?.click()}
                      className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-14 text-center hover:border-violet-400 hover:bg-violet-50/30 transition group"
                    >
                      <Upload
                        size={40}
                        className="mx-auto mb-3 text-neutral-300 group-hover:text-violet-400 transition"
                      />
                      <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                        Drop a government proposal PDF here
                      </div>
                      <div className="text-[12px] text-neutral-400 mt-1">
                        or click to browse · AI decomposes it into Programs →
                        Projects → Activities → Tasks
                      </div>
                      <div className="mt-4 text-[11px] text-neutral-400 bg-white border border-neutral-200 rounded-full px-4 py-1.5 inline-block">
                        Results appear here as an editable draft · nothing is
                        saved until you commit
                      </div>
                      <input
                        ref={pdfFileRef}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handlePdfFile(f);
                        }}
                      />
                    </div>
                  )}

                  {/* Extracting / Decomposing */}
                  {(pdfPhase === "extracting" ||
                    pdfPhase === "decomposing") && (
                    <div className="rounded-2xl border border-neutral-200 bg-white p-14 text-center">
                      <Loader2
                        size={36}
                        className="mx-auto mb-4 text-violet-600 animate-spin"
                      />
                      <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
                        {pdfPhase === "extracting"
                          ? "Extracting text from PDF…"
                          : "AI is decomposing the proposal…"}
                      </div>
                      <div className="text-[12px] text-neutral-400 mt-1">
                        {pdfFileName} ·{" "}
                        {pdfPhase === "extracting"
                          ? "Reading pages"
                          : "This may take up to 2 minutes for large proposals"}
                      </div>
                      <div className="flex justify-center gap-3 mt-6">
                        <div
                          className={`w-2 h-2 rounded-full ${pdfPhase === "extracting" ? "bg-violet-600 animate-pulse" : "bg-emerald-500"}`}
                        />
                        <div
                          className={`w-2 h-2 rounded-full ${pdfPhase === "decomposing" ? "bg-violet-600 animate-pulse" : "bg-neutral-200"}`}
                        />
                      </div>
                    </div>
                  )}

                  {/* Error */}
                  {pdfPhase === "error" && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
                      <AlertCircle
                        size={32}
                        className="mx-auto mb-3 text-red-500"
                      />
                      <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-red-800">
                        Import Failed
                      </div>
                      <div className="text-[12px] text-red-600 mt-1">
                        {pdfError}
                      </div>
                      <button
                        onClick={() => {
                          setPdfPhase("idle");
                          setPdfError("");
                        }}
                        className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-[12px] font-['Lexend:Medium',_sans-serif] rounded-xl hover:bg-red-700 transition"
                      >
                        Try Again
                      </button>
                    </div>
                  )}

                  {/* Review Draft */}
                  {pdfPhase === "review" && draftTasks.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-[12px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                          AI draft loaded from{" "}
                          <span className="text-neutral-800 font-['Lexend:Medium',_sans-serif]">
                            {pdfFileName}
                          </span>{" "}
                          · Review and edit each task before committing.
                        </div>
                        <button
                          onClick={() => {
                            setPdfPhase("idle");
                            setDraftTasks([]);
                            setPdfFileName("");
                            setCommitMessage("");
                          }}
                          className="text-[11px] text-neutral-400 hover:text-neutral-700 flex items-center gap-1 transition"
                        >
                          <Upload size={11} />
                          Import another
                        </button>
                      </div>
                      <DraftCockpit
                        draftTasks={draftTasks}
                        employees={deptEmployees}
                        employeeNotes={employeeNotes}
                        onUpdate={handleDraftUpdate}
                        onDelete={handleDraftDelete}
                        onAdd={handleDraftAdd}
                        onOpenModal={(key) => {
                          setAssignModalTaskKey(key);
                          setAssignModalOpen(true);
                        }}
                        onCommit={handleCommit}
                        committing={committing}
                        commitMessage={commitMessage}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Task Board ──────────────────────────────────────────── */}
      <div>
        {/* View switcher header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
            Task Board
          </h2>
          <div className="flex items-center gap-0.5 bg-neutral-100 rounded-xl p-0.5">
            {(
              [
                {
                  id: "list" as BoardView,
                  icon: <List size={13} />,
                  label: "List",
                },
                {
                  id: "kanban" as BoardView,
                  icon: <Columns size={13} />,
                  label: "Kanban",
                },
                {
                  id: "timeline" as BoardView,
                  icon: <BarChart2 size={13} />,
                  label: "Timeline",
                },
                {
                  id: "hierarchy" as BoardView,
                  icon: <Layers size={13} />,
                  label: "Hierarchy",
                },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                onClick={() => setBoardView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition ${
                  boardView === v.id
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {boardView === "list" && (
          <ListBoardView
            tasks={deptTasks}
            role={role}
            employees={deptEmployees}
            employeeNotes={employeeNotes}
            onAssign={onAssign}
            onUpdateTask={onUpdateTask}
            onVerify={onVerify}
            onExecute={onExecute}
            onSubmitRequest={openSubmitModal}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
            onDeleteTaskRequest={
              role === "depthead" ? handleTaskDeleteRequest : undefined
            }
            departmentFilter={departmentFilter}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onUndoRequest={role === "depthead" ? openUndoModal : undefined}
          />
        )}
        {boardView === "kanban" && (
          <KanbanBoardView
            tasks={deptTasks}
            employees={deptEmployees}
            role={role}
            onVerify={onVerify}
            onExecute={onExecute}
            onSubmitRequest={openSubmitModal}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
            onDeleteTaskRequest={
              role === "depthead" ? handleTaskDeleteRequest : undefined
            }
            currentUserId={currentUserId}
            currentUserName={currentUserName}
            onUndoRequest={role === "depthead" ? openUndoModal : undefined}
          />
        )}
        {boardView === "timeline" && (
          <TimelineView
            tasks={deptTasks}
            role={role}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
          />
        )}
        {boardView === "hierarchy" && (
          <HierarchyBoardView
            tasks={deptTasks}
            employees={deptEmployees}
            role={role}
            onVerify={onVerify}
            onExecute={onExecute}
            onSubmitRequest={openSubmitModal}
            onOpenTaskEditor={role === "depthead" ? openTaskEditor : undefined}
            onDeleteTaskRequest={
              role === "depthead" ? handleTaskDeleteRequest : undefined
            }
            currentUserId={currentUserId}
            onUndoRequest={role === "depthead" ? openUndoModal : undefined}
          />
        )}
      </div>

      {/* ─── Assignment Modal — PDF draft tasks ──────────────────── */}
      <TaskEditorModal
        open={taskEditorOpen}
        task={editingTask}
        draft={taskEditorDraft}
        onChange={(patch) =>
          setTaskEditorDraft((prev) => (prev ? { ...prev, ...patch } : prev))
        }
        onClose={closeTaskEditor}
        onSave={handleTaskEditorSave}
        onDelete={handleTaskEditorDelete}
        onOpenTeamEditor={() => setTaskEditorAssignOpen(true)}
        saving={taskEditorSaving}
        error={taskEditorError}
        employees={deptEmployees}
        employeeById={employeeById}
        currentUserId={currentUserId}
        currentUserName={currentUserName}
      />

      <SubmitForReviewModal
        open={submitModalOpen}
        task={submitModalTask}
        note={submitNote}
        attachments={submitFiles}
        onNoteChange={setSubmitNote}
        onAttachmentsChange={setSubmitFiles}
        onRemoveAttachment={handleRemoveAttachment}
        onClose={closeSubmitModal}
        onSubmit={handleSubmitConfirm}
        submitting={submitSaving}
        error={submitError}
      />

      <UndoCompletedModal
        open={undoModalOpen}
        task={undoModalTask}
        reason={undoReason}
        onReasonChange={setUndoReason}
        onClose={closeUndoModal}
        onSubmit={handleUndoConfirm}
        saving={undoSaving}
        error={undoError}
      />

      <AssignmentModal
        open={taskEditorAssignOpen && taskEditorOpen}
        onClose={() => setTaskEditorAssignOpen(false)}
        employees={deptEmployees}
        employeeNotes={employeeNotes}
        selectedIds={taskEditorDraft?.teamMemberIds || []}
        leadId={taskEditorDraft?.leadMemberId || null}
        onConfirm={(memberIds, leadId) => {
          setTaskEditorDraft((prev) =>
            prev
              ? {
                  ...prev,
                  teamMemberIds: uniqueValues(memberIds),
                  leadMemberId: leadId,
                }
              : prev,
          );
        }}
      />

      <AssignmentModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setAssignModalTaskKey(null);
        }}
        employees={deptEmployees}
        employeeNotes={employeeNotes}
        selectedIds={currentDraftTask?.assignedMemberIds || []}
        leadId={currentDraftTask?.leadMemberId || null}
        onConfirm={(memberIds, leadId) => {
          if (assignModalTaskKey) {
            handleDraftUpdate(assignModalTaskKey, {
              assignedMemberIds: memberIds,
              leadMemberId: leadId,
            });
          }
        }}
      />

      {/* ─── Assignment Modal — Manual composer ──────────────────── */}
      <AssignmentModal
        open={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        employees={deptEmployees}
        employeeNotes={employeeNotes}
        selectedIds={selectedMembers.map((m) => m.id)}
        leadId={selectedMembers[0]?.id || null}
        onConfirm={(memberIds, leadId) => {
          const ordered = [
            leadId,
            ...memberIds.filter((id) => id !== leadId),
          ].filter(Boolean) as string[];
          setSelectedMembers(
            ordered.map((id) => employeeById[id]).filter(Boolean) as Employee[],
          );
        }}
      />
    </div>
  );
}
