import { useCallback, useEffect, useState } from "react";
import { Pause, Play, Trash2, X } from "lucide-react";
import type { Employee } from "../../../services/employeeService";
import {
  deleteTaskTemplate,
  fetchTaskTemplates,
  setTaskTemplateActive,
} from "../services/taskTemplateService";
import type { TaskTemplate } from "../types";
import { RecurringTemplateForm } from "./RecurringTemplateForm";

export function RecurringTaskTemplatesModal({
  open,
  onClose,
  employees,
  orgId,
}: {
  open: boolean;
  onClose: () => void;
  employees: Employee[];
  orgId?: string;
}) {
  const [templates, setTemplates] = useState<TaskTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTemplates(await fetchTaskTemplates()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) void load(); }, [open, load]);
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div><div className="text-[16px] font-['Lexend:SemiBold',_sans-serif]">Recurring task templates</div><div className="text-[11px] text-neutral-500">Generate routine work automatically without duplicating setup.</div></div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"><X size={16} /></button>
        </div>
        <div className="grid flex-1 gap-4 overflow-y-auto p-4 md:grid-cols-2">
          <RecurringTemplateForm employees={employees} orgId={orgId} onCreated={load} />
          <div className="space-y-2">
            {loading && <div className="p-4 text-center text-[12px] text-neutral-400">Loading templates…</div>}
            {!loading && templates.length === 0 && <div className="rounded-xl border border-dashed border-neutral-200 p-5 text-center text-[12px] text-neutral-400">No recurring templates yet.</div>}
            {templates.map((template) => (
              <div key={template.id} className="rounded-xl border border-neutral-200 p-3">
                <div className="flex items-start justify-between gap-2"><div><div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{template.title}</div><div className="mt-0.5 text-[10.5px] text-neutral-500">Every {template.recurrenceRule.interval > 1 ? `${template.recurrenceRule.interval} ` : ""}{template.recurrenceRule.frequency} · next {new Date(template.nextRunAt).toLocaleString("en-PH")}</div></div><span className={`rounded-full px-2 py-0.5 text-[9px] ${template.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>{template.isActive ? "Active" : "Paused"}</span></div>
                <div className="mt-3 flex gap-2">
                  <button onClick={async () => { await setTaskTemplateActive(template.id, !template.isActive); await load(); }} className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 px-2 py-1 text-[10.5px] text-neutral-600">{template.isActive ? <Pause size={11} /> : <Play size={11} />}{template.isActive ? "Pause" : "Resume"}</button>
                  <button onClick={async () => { await deleteTaskTemplate(template.id); await load(); }} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-[10.5px] text-rose-600"><Trash2 size={11} /> Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
