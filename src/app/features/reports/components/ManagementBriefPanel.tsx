import { useState } from "react";
import { Bot, RefreshCw, Sparkles, X } from "lucide-react";
import type { AiQueueUpdate } from "../../ai";
import { WButton } from "../../../components/workflow/primitives";
import { generateManagementBrief } from "../services/managementBriefService";
import type { DepartmentReportRow } from "../types";

export function ManagementBriefPanel({ title, rows }: { title: string; rows: DepartmentReportRow[] }) {
  const [brief, setBrief] = useState("");
  const [error, setError] = useState("");
  const [queue, setQueue] = useState<AiQueueUpdate | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const generate = async () => {
    setOpen(true);
    setLoading(true);
    setError("");
    setQueue(null);
    try {
      setBrief(await generateManagementBrief(title, rows, setQueue));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to generate the management brief.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return <WButton icon={<Sparkles size={13} />} onClick={generate} disabled={rows.length === 0}>AI management brief</WButton>;
  }

  return (
    <div className="fixed inset-0 z-[90] bg-black/25 backdrop-blur-[1px] flex justify-end" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <aside className="w-full max-w-[480px] h-full bg-white shadow-2xl border-l border-neutral-200 flex flex-col animate-in slide-in-from-right duration-300">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900"><Bot size={15} /> AI management brief</div>
            <p className="text-[10.5px] text-neutral-500 mt-1">Uses only the currently filtered, permission-scoped report rows. It never changes work records.</p>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-neutral-100 text-neutral-500"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="flex items-center gap-2 text-[12px] text-blue-800"><RefreshCw size={14} className="animate-spin" /> Preparing the brief…</div>
              {queue && <div className="text-[10.5px] text-blue-600 mt-2">{queue.status === "queued" ? `${queue.jobsAhead} AI job(s) ahead of this report.` : "DeepSeek is analyzing the visible report now."}</div>}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-[11.5px] text-red-700">{error}</div>
          ) : (
            <div className="whitespace-pre-wrap text-[12px] leading-6 text-neutral-700">{brief}</div>
          )}
        </div>
        <div className="p-4 border-t border-neutral-200 flex justify-end">
          <WButton icon={<RefreshCw size={13} />} onClick={generate} disabled={loading}>Regenerate from visible rows</WButton>
        </div>
      </aside>
    </div>
  );
}

