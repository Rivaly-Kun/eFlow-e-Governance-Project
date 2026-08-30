import { useId, useRef, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../../../components/ui/dialog";
import type { PettyCashRelease, PettyCashRequest } from "../types";
import { overridePettyCashReleaseSchedule } from "../services/budgetService";
import { peso } from "./budgetUi";

export function CashReleaseOverrideDialog({ release, request, dailyLimit, onClose, onReleased }: {
  release: PettyCashRelease;
  request?: PettyCashRequest;
  dailyLimit?: number;
  onClose: () => void;
  onReleased: () => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);
  const reasonId = useId();
  const confirm = async () => {
    if (inFlight.current || reason.trim().length < 10) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      await overridePettyCashReleaseSchedule(release.id, reason.trim());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The release override could not be saved.");
      inFlight.current = false;
      setBusy(false);
      return;
    }
    // A refresh failure after commit must not invite a duplicate release.
    onClose();
    await onReleased();
  };
  return <Dialog open onOpenChange={(open) => { if (!open && !inFlight.current) onClose(); }}>
    <DialogContent className="bg-white sm:max-w-lg" onEscapeKeyDown={(event) => { if (busy) event.preventDefault(); }} onInteractOutside={(event) => { if (busy) event.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base"><AlertTriangle size={18} className="text-amber-600" /> Confirm schedule override?</DialogTitle>
        <DialogDescription>Record this approved cash tranche as released now, even if the scheduled date has not arrived.</DialogDescription>
      </DialogHeader>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        <strong>PC-{String(request?.requestNumber || 0).padStart(5, "0")} · {peso.format(release.amount)}</strong>
        <p className="mt-1">{[request?.taskTitle, request?.subtaskTitle].filter(Boolean).join(" → ") || "Funded work"}</p>
        <p className="mt-1">Recipient: {request?.cashRecipientName || request?.requesterName || "Assigned recipient"}</p>
        <p className="mt-1">Original schedule: {release.scheduledDate}</p>
      </div>
      <p className="text-sm text-neutral-600">This overrides the date only—not the {dailyLimit ? `${peso.format(dailyLimit)} ` : ""}daily ceiling, funding approval, or receipt requirements. Today's scheduled releases keep their reserved room. Your identity, reason, and release time will be audited.</p>
      <div>
        <label htmlFor={reasonId} className="text-sm font-medium text-neutral-900">Override reason</label>
        <textarea id={reasonId} value={reason} onChange={(event) => setReason(event.target.value)} disabled={busy} maxLength={1000} rows={3} placeholder="Explain why this cash must be released before its scheduled date…" className="mt-1 w-full resize-none rounded-lg border border-neutral-300 p-2 text-sm disabled:opacity-50" />
        <p className="mt-1 text-xs text-neutral-500">At least 10 characters. Confirm only when the cash is actually being handed over.</p>
      </div>
      {error && <p role="alert" className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      <DialogFooter>
        <button type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-neutral-300 px-3 py-2 text-sm disabled:opacity-50">Cancel</button>
        <button type="button" disabled={busy || reason.trim().length < 10} onClick={() => { void confirm(); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-3 py-2 text-sm text-white disabled:opacity-40">
          {busy && <Loader2 size={14} className="animate-spin" />} Confirm override & release
        </button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
