import { useState } from "react";
import { AlertCircle, Check, ChevronRight, Clock, Edit2, Trash2, Users } from "lucide-react";
import type { Employee } from "../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../services/employeeNotesService";
import { getInitials, priorityMeta } from "./draftModel";
import type { DraftTask } from "./draftModel";

export function DraftTaskRow({
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
    .filter((emp): emp is Employee => Boolean(emp));
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
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
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
          className="mt-2 flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-dashed border-neutral-300 hover:border-violet-400 hover:bg-violet-50/40 transition group/assign w-full max-w-xs text-left"
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

// ─── Draft Cockpit Component ──────────────────────────────────────
