import { useMemo, useState, type ReactNode } from "react";
import { Check, FileCheck2, WalletCards, X } from "lucide-react";
import type { DepartmentBudgetBundle } from "../types";
import {
  createReceiptSignedUrl,
  decidePettyCashLiquidation,
  decidePettyCashRequest,
  decideWorkBudgetAllocation,
} from "../services/budgetService";
import { BudgetEmpty, peso, StatusPill } from "./budgetUi";

type RejectionTarget = {
  id: string;
  kind: "allocation" | "request" | "liquidation";
  title: string;
};

export function BudgetApprovalQueue({
  data,
  onChanged,
}: {
  data: DepartmentBudgetBundle;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [rejection, setRejection] = useState<RejectionTarget | null>(null);
  const pendingAllocations = data.allocations.filter((item) => item.status === "pending");
  const pendingRequests = data.requests.filter((item) => item.status === "pending");
  const pendingLiquidations = data.liquidations.filter((item) => item.status === "pending");
  const requestById = useMemo(
    () => new Map(data.requests.map((item) => [item.id, item])),
    [data.requests],
  );

  const act = async (id: string, operation: () => Promise<void>) => {
    setBusy(id);
    setMessage("");
    try {
      await operation();
      await onChanged();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Decision could not be saved.");
      return false;
    } finally {
      setBusy("");
    }
  };

  const confirmRejection = async (reason: string) => {
    if (!rejection) return;
    const operation = rejection.kind === "allocation"
      ? () => decideWorkBudgetAllocation(rejection.id, false, reason)
      : rejection.kind === "request"
        ? () => decidePettyCashRequest(rejection.id, false, reason)
        : () => decidePettyCashLiquidation(rejection.id, false, reason);
    if (await act(rejection.id, operation)) setRejection(null);
  };

  if (!pendingAllocations.length && !pendingRequests.length && !pendingLiquidations.length) {
    return <BudgetEmpty title="Approval inbox is clear" description="New subtask allocation requests, petty-cash requests, and receipt liquidations will appear here." />;
  }

  return (
    <div className="space-y-4">
      {message && <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-[10.5px] text-rose-700">{message}</div>}

      {pendingAllocations.length > 0 && (
        <QueueSection icon={<WalletCards size={14} />} title="Subtask budget proposals" count={pendingAllocations.length}>
          {pendingAllocations.map((item) => (
            <QueueRow
              key={item.id}
              title={item.reason}
              meta={`Requested allocation · ${peso.format(item.amount)}`}
              status={item.status}
              actions={(
                <DecisionButtons
                  busy={busy === item.id}
                  onApprove={() => void act(item.id, () => decideWorkBudgetAllocation(item.id, true, "Approved for the assigned work"))}
                  onReject={() => setRejection({ id: item.id, kind: "allocation", title: "Decline subtask budget" })}
                />
              )}
            />
          ))}
        </QueueSection>
      )}

      {pendingRequests.length > 0 && (
        <QueueSection icon={<WalletCards size={14} />} title="Petty-cash requests" count={pendingRequests.length}>
          {pendingRequests.map((item) => (
            <QueueRow
              key={item.id}
              title={item.taskTitle || "Assigned work"}
              meta={`${item.requesterName || "Employee"} · ${item.purpose} · ${peso.format(item.requestedAmount)}`}
              status={item.status}
              actions={(
                <DecisionButtons
                  busy={busy === item.id}
                  onApprove={() => void act(item.id, () => decidePettyCashRequest(item.id, true, "Approved operational petty cash"))}
                  onReject={() => setRejection({ id: item.id, kind: "request", title: "Decline petty-cash request" })}
                />
              )}
            />
          ))}
        </QueueSection>
      )}

      {pendingLiquidations.length > 0 && (
        <QueueSection icon={<FileCheck2 size={14} />} title="Receipt liquidations" count={pendingLiquidations.length}>
          {pendingLiquidations.map((item) => {
            const request = requestById.get(item.requestId);
            return (
              <div key={item.id} className="border-b border-neutral-100 p-4 last:border-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{request?.taskTitle || "Petty-cash liquidation"}</div>
                    <div className="mt-1 text-[10px] text-neutral-500">{request?.requesterName} · spent {peso.format(item.declaredSpent)} · return {peso.format(item.returnedAmount)}</div>
                    <div className="mt-1 text-[10px] text-neutral-600">{item.note}</div>
                  </div>
                  <DecisionButtons
                    busy={busy === item.id}
                    onApprove={() => void act(item.id, () => decidePettyCashLiquidation(item.id, true, "Receipts verified"))}
                    onReject={() => setRejection({ id: item.id, kind: "liquidation", title: "Request receipt corrections" })}
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.receipts.map((receipt) => (
                    <button
                      key={receipt.id}
                      onClick={async () => window.open(await createReceiptSignedUrl(receipt.filePath), "_blank", "noopener,noreferrer")}
                      className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-left text-[9.5px] text-neutral-600 hover:border-neutral-300"
                    >
                      <strong>{receipt.vendor}</strong> · {peso.format(receipt.amount)}<br />
                      {receipt.fileName}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </QueueSection>
      )}

      {rejection && (
        <RejectionDialog
          title={rejection.title}
          busy={busy === rejection.id}
          onClose={() => setRejection(null)}
          onConfirm={confirmRejection}
        />
      )}
    </div>
  );
}

function QueueSection({ icon, title, count, children }: { icon: ReactNode; title: string; count: number; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
      <header className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
        <span className="text-neutral-500">{icon}</span>
        <h3 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h3>
        <span className="ml-auto rounded-full bg-amber-50 px-2 py-1 text-[9px] text-amber-700">{count}</span>
      </header>
      {children}
    </section>
  );
}

function QueueRow({ title, meta, status, actions }: { title: string; meta: string; status: string; actions: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-neutral-100 p-4 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{title}</div>
          <StatusPill status={status} />
        </div>
        <div className="mt-1 text-[10px] text-neutral-500">{meta}</div>
      </div>
      {actions}
    </div>
  );
}

function DecisionButtons({ busy, onApprove, onReject }: { busy: boolean; onApprove: () => void; onReject: () => void }) {
  return (
    <div className="flex gap-2">
      <button disabled={busy} onClick={onReject} className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-200 px-3 text-[9.5px] text-rose-700 disabled:opacity-40"><X size={11} /> Decline</button>
      <button disabled={busy} onClick={onApprove} className="inline-flex h-8 items-center gap-1 rounded-lg bg-neutral-900 px-3 text-[9.5px] text-white disabled:opacity-40"><Check size={11} /> Approve</button>
    </div>
  );
}

function RejectionDialog({ title, busy, onClose, onConfirm }: { title: string; busy: boolean; onClose: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState("");
  return (
    <>
      <div className="fixed inset-0 z-[80] bg-neutral-950/35 backdrop-blur-[1px]" onClick={onClose} />
      <div className="fixed left-1/2 top-1/2 z-[81] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xl">
        <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h3>
        <p className="mt-1 text-[10.5px] text-neutral-500">Record a clear reason so the requester knows exactly what to correct.</p>
        <textarea autoFocus rows={4} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason or required correction" className="mt-4 w-full rounded-xl border border-neutral-200 px-3 py-2 text-[10.5px]" />
        <div className="mt-4 flex justify-end gap-2">
          <button disabled={busy} onClick={onClose} className="h-9 rounded-lg border border-neutral-200 px-4 text-[10px]">Cancel</button>
          <button disabled={busy || !reason.trim()} onClick={() => void onConfirm(reason.trim())} className="h-9 rounded-lg bg-rose-600 px-4 text-[10px] text-white disabled:opacity-40">Confirm decision</button>
        </div>
      </div>
    </>
  );
}
