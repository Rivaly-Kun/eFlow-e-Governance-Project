// ─── TaskReviewPanel ─────────────────────────────────────────────
// The reviewer's decision surface for a submitted task. Shows the submission,
// its attachments (regenerated via fresh signed URLs), the latest progress
// update, and any earlier rejection feedback. Approve → completed;
// Request changes → back to active work with mandatory feedback.

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Paperclip,
  Download,
  Clock,
  MessageSquareWarning,
  Loader2,
} from "lucide-react";
import { supabase } from "../../../lib/supabase";
import { verifyTask, type Task } from "../../services/taskService";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../ui/Toast";
import { InitialsAvatar } from "./StatusBadges";
import { formatDate } from "./primitives";

interface StoredAttachment {
  fileName: string;
  filePath: string;
}

export function TaskReviewPanel({
  task,
  onDone,
  compact,
  canReview = false,
}: {
  task: Task;
  onDone?: () => void;
  compact?: boolean;
  canReview?: boolean;
}) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [attachments, setAttachments] = useState<StoredAttachment[]>([]);
  const [signing, setSigning] = useState<string | null>(null);
  const effectiveCanReview = canReview && Boolean(user?.id);

  // Pull relational attachment rows so we can always mint a fresh signed URL,
  // even if the one stored on the submission has expired.
  useEffect(() => {
    let active = true;
    supabase
      .from("task_attachments")
      .select("file_name, file_path")
      .eq("task_id", task.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (active && data) {
          setAttachments(data.map((r) => ({ fileName: r.file_name as string, filePath: r.file_path as string })));
        }
      });
    return () => { active = false; };
  }, [task.id]);

  const openAttachment = async (att: StoredAttachment) => {
    setSigning(att.filePath);
    try {
      const { data, error } = await supabase.storage
        .from("task-attachments")
        .createSignedUrl(att.filePath, 60 * 5);
      if (error || !data) throw error || new Error("Could not generate link.");
      window.open(data.signedUrl, "_blank");
    } catch {
      toast("Could not open attachment.", "error");
    } finally {
      setSigning(null);
    }
  };

  const decide = async (approve: boolean) => {
    if (!effectiveCanReview) return;
    if (!approve && !feedback.trim()) {
      toast("Feedback is required when requesting changes.", "error");
      return;
    }
    setBusy(true);
    try {
      await verifyTask(task.id, approve, feedback.trim() || undefined, {
        id: user?.id,
        name: userProfile?.full_name || "Reviewer",
      });
      toast(approve ? "Task approved and completed." : "Sent back with feedback.", "success");
      setMode("idle");
      setFeedback("");
      onDone?.();
    } catch (e: any) {
      toast(e?.message || "Failed to submit review.", "error");
    } finally {
      setBusy(false);
    }
  };

  const submission = task.latestSubmission;

  return (
    <div className={compact ? "" : "bg-white border border-neutral-200 rounded-xl p-4"}>
      {/* Prior rejection context */}
      {task.rejectionNote && (
        <div className="mb-3 flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg p-2.5">
          <MessageSquareWarning size={14} className="text-rose-600 mt-0.5 shrink-0" />
          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-rose-700 uppercase tracking-wide">
              Previous feedback
            </div>
            <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-rose-900">{task.rejectionNote}</div>
          </div>
        </div>
      )}

      {/* Submission */}
      {submission ? (
        <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3 mb-3">
          <div className="flex items-center gap-2 mb-1.5">
            <InitialsAvatar name={submission.submitterName} size={22} />
            <span className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              {submission.submitterName}
            </span>
            <span className="text-[11px] text-neutral-400 flex items-center gap-1">
              <Clock size={11} /> {formatDate(submission.submittedAt)}
            </span>
          </div>
          <div className="text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 whitespace-pre-wrap">
            {submission.note}
          </div>
        </div>
      ) : (
        <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
          No submission note recorded.
        </div>
      )}

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="mb-3">
          <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-1.5">
            Attachments
          </div>
          <div className="flex flex-wrap gap-2">
            {attachments.map((att) => (
              <button
                key={att.filePath}
                onClick={() => openAttachment(att)}
                className="inline-flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-2.5 py-1.5 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 max-w-[220px]"
              >
                {signing === att.filePath ? <Loader2 size={12} className="animate-spin" /> : <Paperclip size={12} />}
                <span className="truncate">{att.fileName}</span>
                <Download size={11} className="text-neutral-400 shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Decision */}
      {effectiveCanReview && mode === "idle" && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode("approve")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-emerald-600 text-white text-[12.5px] font-['Lexend:Medium',_sans-serif] hover:bg-emerald-700"
          >
            <CheckCircle2 size={14} /> Approve
          </button>
          <button
            onClick={() => setMode("reject")}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-white border border-rose-200 text-rose-700 text-[12.5px] font-['Lexend:Medium',_sans-serif] hover:bg-rose-50"
          >
            <XCircle size={14} /> Request changes
          </button>
        </div>
      )}

      {effectiveCanReview && mode !== "idle" && (
        <div>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            placeholder={
              mode === "approve"
                ? "Optional approval note…"
                : "Required: explain what needs to change…"
            }
            className={`w-full resize-none rounded-lg border px-3 py-2 text-[12.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none mb-2 ${
              mode === "reject" ? "border-rose-200 focus:border-rose-400" : "border-neutral-200 focus:border-neutral-400"
            }`}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={() => decide(mode === "approve")}
              disabled={busy}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-white text-[12.5px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 ${
                mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
              }`}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : mode === "approve" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
              {mode === "approve" ? "Confirm approval" : "Send back for changes"}
            </button>
            <button
              onClick={() => { setMode("idle"); setFeedback(""); }}
              className="px-3 py-2 rounded-lg text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 hover:bg-neutral-100"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
