import { useState } from "react";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { verifyTask } from "../../../services/taskService";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../components/ui/Toast";

export function ReviewDecisionForm({
  taskId,
  onDone,
}: {
  taskId: string;
  onDone?: () => void;
}) {
  const { user, userProfile } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"idle" | "approve" | "reject">("idle");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);

  const decide = async () => {
    const approve = mode === "approve";
    if (!approve && !feedback.trim()) {
      toast("Feedback is required when requesting changes.", "error");
      return;
    }

    setBusy(true);
    try {
      await verifyTask(taskId, approve, feedback.trim() || undefined, {
        id: user?.id,
        name: userProfile?.full_name || "Reviewer",
      });
      toast(
        approve ? "Task approved and completed." : "Sent back with feedback.",
        "success",
      );
      setMode("idle");
      setFeedback("");
      onDone?.();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to submit review.", "error");
    } finally {
      setBusy(false);
    }
  };

  if (mode === "idle") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setMode("approve")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-[12.5px] font-['Lexend:Medium',_sans-serif] text-white hover:bg-emerald-700"
        >
          <CheckCircle2 size={14} /> Approve
        </button>
        <button
          onClick={() => setMode("reject")}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-white py-2 text-[12.5px] font-['Lexend:Medium',_sans-serif] text-rose-700 hover:bg-rose-50"
        >
          <XCircle size={14} /> Request changes
        </button>
      </div>
    );
  }

  return (
    <div>
      <textarea
        value={feedback}
        onChange={(event) => setFeedback(event.target.value)}
        rows={3}
        placeholder={mode === "approve" ? "Optional approval note…" : "Required: explain what needs to change…"}
        className={`mb-2 w-full resize-none rounded-lg border px-3 py-2 text-[12.5px] text-neutral-800 placeholder:text-neutral-400 focus:outline-none ${
          mode === "reject" ? "border-rose-200 focus:border-rose-400" : "border-neutral-200 focus:border-neutral-400"
        }`}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={decide}
          disabled={busy}
          className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40 ${
            mode === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-rose-600 hover:bg-rose-700"
          }`}
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : mode === "approve" ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {mode === "approve" ? "Confirm approval" : "Send back for changes"}
        </button>
        <button
          onClick={() => { setMode("idle"); setFeedback(""); }}
          className="rounded-lg px-3 py-2 text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 hover:bg-neutral-100"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
