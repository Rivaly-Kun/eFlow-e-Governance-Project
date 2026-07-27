// ─── TaskSubtasksWidget ──────────────────────────────────────────
// Standalone subtask checklist with multi-user assignment, completion toggle, and realtime updates.
// Reused across TaskDetailDrawer, YouAreLeadingView, and MondayBoard.

import React, { useState, useEffect } from "react";
import { User, Plus, X, CheckSquare, Sparkles, Check } from "lucide-react";
import {
  type Subtask,
  subscribeToSubtasks,
  createSubtask,
  toggleSubtask,
  updateSubtask,
  deleteSubtask,
} from "../../services/subtaskService";
import { useEmployees } from "../../hooks/useFirebaseData";
import { useAuth } from "../../contexts/AuthContext";

export function TaskSubtasksWidget({
  taskId,
  allowedAssignees,
}: {
  taskId: string;
  allowedAssignees?: { id: string; name: string; initials?: string }[];
}) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [pickerOpenFor, setPickerOpenFor] = useState<string | null>(null);
  const { employees } = useEmployees();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    if (!taskId) return;
    const unsub = subscribeToSubtasks(taskId, setSubtasks);
    return unsub;
  }, [taskId]);

  // Combine full employee directory + specific task team members
  const assigneeOptions = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; initials: string }>();
    (employees || []).forEach((e) => {
      map.set(e.id, { id: e.id, name: e.name, initials: e.initials || e.name.slice(0, 2).toUpperCase() });
    });
    (allowedAssignees || []).forEach((m) => {
      if (!map.has(m.id)) {
        map.set(m.id, { id: m.id, name: m.name, initials: m.initials || m.name.slice(0, 2).toUpperCase() });
      }
    });
    return Array.from(map.values());
  }, [employees, allowedAssignees]);

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      await createSubtask(taskId, newTitle.trim(), {
        source: "manual",
        position: subtasks.length,
        createdBy: user?.id,
        actorName: userProfile?.full_name || "Team Lead",
      });
      setNewTitle("");
    } catch (err) {
      console.error("Failed to add subtask:", err);
    } finally {
      setAdding(false);
    }
  };

  const completedCount = subtasks.filter((s) => s.isCompleted).length;

  return (
    <div className="pt-2">
      <div className="flex items-center justify-between mb-2">
        <label className="text-[10px] uppercase tracking-[0.12em] text-neutral-400 font-['Lexend:SemiBold',_sans-serif] flex items-center gap-1.5">
          <CheckSquare size={12} className="text-neutral-500" />
          Subtasks {subtasks.length > 0 && `(${completedCount}/${subtasks.length})`}
        </label>
        {subtasks.length > 0 && (
          <div className="flex-1 mx-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden max-w-[140px]">
            <div
              className="h-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${(completedCount / subtasks.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {subtasks.map((st) => {
          const assignedIds = st.assignedToIds || (st.assignedTo ? [st.assignedTo] : []);
          const assignedUsers = assignedIds
            .map((id) => assigneeOptions.find((e) => e.id === id))
            .filter((u): u is { id: string; name: string; initials: string } => Boolean(u));

          const isMySubtask = Boolean(user?.id && assignedIds.includes(user.id));

          return (
            <div
              key={st.id}
              className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 group transition-colors ${
                isMySubtask
                  ? "bg-blue-50/60 border-blue-200"
                  : "bg-neutral-50/60 border-neutral-100 hover:bg-neutral-100/60"
              }`}
            >
              <input
                type="checkbox"
                checked={st.isCompleted}
                onChange={(e) => toggleSubtask(st.id, e.target.checked, user?.id)}
                className="h-3.5 w-3.5 rounded border-neutral-300 accent-emerald-600 cursor-pointer"
              />
              <span
                className={`flex-1 text-[12px] font-['Lexend:Regular',_sans-serif] ${
                  st.isCompleted ? "text-neutral-400 line-through" : "text-neutral-800"
                }`}
              >
                {st.title}
              </span>

              {st.source === "ai_extracted" && (
                <span className="inline-flex items-center gap-0.5 text-[8px] uppercase tracking-wider text-violet-600 bg-violet-50 border border-violet-200 px-1 py-0.5 rounded font-['Lexend:SemiBold',_sans-serif] shrink-0">
                  <Sparkles size={8} /> AI
                </span>
              )}

              {/* Assignee Avatars / Multi-Select Picker */}
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setPickerOpenFor(pickerOpenFor === st.id ? null : st.id)}
                  className="flex items-center -space-x-1.5 hover:opacity-90 transition shrink-0"
                  title={
                    assignedUsers.length > 0
                      ? `Assigned to: ${assignedUsers.map((u) => u.name).join(", ")}`
                      : "Assign subtask to team members"
                  }
                >
                  {assignedUsers.length > 0 ? (
                    assignedUsers.map((u) => (
                      <div
                        key={u.id}
                        className="w-6 h-6 rounded-full bg-neutral-900 border border-white text-white text-[9px] flex items-center justify-center font-['Lexend:SemiBold',_sans-serif] shadow-sm"
                      >
                        {u.initials}
                      </div>
                    ))
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center hover:bg-neutral-200 hover:text-neutral-600 transition">
                      <User size={12} />
                    </div>
                  )}
                </button>

                {pickerOpenFor === st.id && (
                  <div className="absolute z-30 top-7 right-0 bg-white rounded-xl border border-neutral-200 shadow-xl py-1.5 w-52 max-h-60 overflow-y-auto">
                    <div className="px-3 py-1 text-[9px] uppercase tracking-wider text-neutral-400 font-['Lexend:SemiBold',_sans-serif]">
                      Assign Team Members
                    </div>
                    {assignedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          updateSubtask(
                            st.id,
                            { assignedToIds: [] },
                            { id: user?.id || "", name: userProfile?.full_name || "Team Lead" },
                          );
                        }}
                        className="w-full text-left px-3 py-1 text-[11px] hover:bg-red-50 text-red-600 font-['Lexend:Medium',_sans-serif] border-b border-neutral-100 mb-1 pb-1.5"
                      >
                        Clear All Assignees
                      </button>
                    )}
                    {assigneeOptions.map((e) => {
                      const selected = assignedIds.includes(e.id);
                      return (
                        <button
                          type="button"
                          key={e.id}
                          onClick={() => {
                            const nextIds = selected
                              ? assignedIds.filter((id) => id !== e.id)
                              : [...assignedIds, e.id];
                            updateSubtask(
                              st.id,
                              { assignedToIds: nextIds },
                              { id: user?.id || "", name: userProfile?.full_name || "Team Lead" },
                            );
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-neutral-50 flex items-center justify-between gap-2 ${
                            selected ? "bg-blue-50/50 font-medium text-blue-900" : "text-neutral-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-5 h-5 rounded-full bg-neutral-800 text-white text-[8px] flex items-center justify-center font-['Lexend:SemiBold',_sans-serif] shrink-0">
                              {e.initials}
                            </div>
                            <span className="font-['Lexend:Regular',_sans-serif] truncate">{e.name}</span>
                          </div>
                          {selected && <Check size={12} className="text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => deleteSubtask(st.id)}
                className="opacity-0 group-hover:opacity-100 text-neutral-300 hover:text-red-500 transition shrink-0 p-0.5"
                title="Delete subtask"
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 mt-2">
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          placeholder="Add a subtask for team members…"
          className="flex-1 h-[32px] rounded-lg border border-neutral-200 bg-white px-2.5 text-[12px] text-neutral-900 outline-none focus:border-neutral-400 placeholder:text-neutral-400 font-['Lexend:Regular',_sans-serif]"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={adding || !newTitle.trim()}
          className="h-[32px] px-3 rounded-lg bg-neutral-900 text-white text-[11px] font-['Lexend:Medium',_sans-serif] disabled:opacity-40 hover:bg-neutral-800 shrink-0 inline-flex items-center gap-1"
        >
          <Plus size={13} /> Add
        </button>
      </div>
    </div>
  );
}

