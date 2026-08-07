import { useEffect, useMemo, useRef, useState } from "react";
import type { Employee } from "../../../services/employeeService";
import { updateEmployeeNotes } from "../../../services/employeeNotesService";
import { useEmployeeNotes } from "../../../hooks/useFirebaseData";
import { useDeptDirectoryEmployees } from "../../employees";
import { DepartmentPageHeader as PageHeader } from "./PageHeader";

type EmployeeNoteDraft = {
  strengths: string;
  weaknesses: string;
  notes: string;
  tags: string;
};

const emptyEmployeeNoteDraft = (): EmployeeNoteDraft => ({
  strengths: "",
  weaknesses: "",
  notes: "",
  tags: "",
});

const noteToDraft = (note?: {
  strengths?: string;
  weaknesses?: string;
  notes?: string;
  tags?: string[];
}, storedSkills: string[] = []): EmployeeNoteDraft => ({
  strengths: note?.strengths || storedSkills.join(", "),
  weaknesses: note?.weaknesses || "",
  notes: note?.notes || "",
  tags: note?.tags?.join(", ") || storedSkills.join(", "),
});

export function EmployeeInsights() {
  const {
    deptEmployees,
    directoryLoading,
    userProfile,
    profilesById,
    profilesByEmail,
  } = useDeptDirectoryEmployees();
  const { notes, loading: notesLoading } = useEmployeeNotes();
  const [drafts, setDrafts] = useState<Record<string, EmployeeNoteDraft>>({});
  const [dirtyIds, setDirtyIds] = useState<Set<string>>(new Set());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>();
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const remoteDraftSnapshots = useRef<Record<string, string>>({});
  const storedSkillsFor = useMemo(
    () => (employee: Employee) => {
      const profile =
        profilesById.get(employee.id) ||
        (employee.email
          ? profilesByEmail.get(employee.email.toLowerCase())
          : undefined);
      const rawSkills = profile?.skills;
      let skills: Record<string, unknown> = rawSkills || {};
      if (typeof rawSkills === "string") {
        try {
          skills = JSON.parse(rawSkills) as Record<string, unknown>;
        } catch {
          skills = {};
        }
      }
      return Object.entries(skills)
        .filter(([, enabled]) => enabled === true || enabled === "true")
        .map(([skill]) => skill);
    },
    [profilesByEmail, profilesById],
  );

  useEffect(() => {
    // Remote data initializes a draft once. It can refresh an untouched draft,
    // but it never replaces text the department head is actively editing.
    setDrafts((current) => {
      let changed = false;
      const next = { ...current };
      deptEmployees.forEach((employee) => {
        const remoteDraft = noteToDraft(
          notes[employee.id],
          storedSkillsFor(employee),
        );
        const remoteSnapshot = JSON.stringify(remoteDraft);
        const receivedNewRemoteValue =
          remoteDraftSnapshots.current[employee.id] !== remoteSnapshot;

        if (
          !next[employee.id] ||
          (!dirtyIds.has(employee.id) && receivedNewRemoteValue)
        ) {
          next[employee.id] = remoteDraft;
          changed = true;
        }
        remoteDraftSnapshots.current[employee.id] = remoteSnapshot;
      });
      return changed ? next : current;
    });
  }, [deptEmployees, dirtyIds, notes, storedSkillsFor]);

  useEffect(() => {
    setSelectedEmployeeId((current) => {
      if (current && deptEmployees.some((employee) => employee.id === current)) {
        return current;
      }
      return deptEmployees[0]?.id;
    });
  }, [deptEmployees]);

  const handleChange = (
    employeeId: string,
    field: keyof EmployeeNoteDraft,
    value: string,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || emptyEmployeeNoteDraft()),
        [field]: value,
      },
    }));
    setDirtyIds((current) => new Set(current).add(employeeId));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(employeeId);
      return next;
    });
  };

  const handleSave = async (employeeId: string) => {
    const draft = drafts[employeeId] || emptyEmployeeNoteDraft();
    if (!draft) return;

    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSavingIds((prev) => new Set(prev).add(employeeId));
    try {
      await updateEmployeeNotes(employeeId, {
        strengths: draft.strengths.trim(),
        weaknesses: draft.weaknesses.trim(),
        notes: draft.notes.trim(),
        tags,
      }, userProfile?.uid);
      setDirtyIds((current) => {
        const next = new Set(current);
        next.delete(employeeId);
        return next;
      });
      setSavedIds((prev) => new Set(prev).add(employeeId));
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  if (directoryLoading || notesLoading) {
    return (
      <div className="p-8 min-h-full bg-neutral-50 flex items-center justify-center">
        <div className="text-[12px] text-neutral-500">Loading team notes…</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Team Intelligence"
        subtitle="Review stored team skills, strengths, and supervision notes"
      />

      {deptEmployees.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No employees found in your department.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)] gap-5">
          <aside className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="border-b border-neutral-100 px-4 py-3 text-[10px] uppercase tracking-wider text-neutral-400">Team members</div>
            <div className="max-h-[640px] overflow-y-auto p-2">
              {deptEmployees.map((employee) => {
                const active = employee.id === selectedEmployeeId;
                return (
                  <button
                    type="button"
                    key={employee.id}
                    onClick={() => setSelectedEmployeeId(employee.id)}
                    className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${active ? "bg-neutral-100" : "hover:bg-neutral-50"}`}
                  >
                    <div className="h-8 w-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[10px] font-medium shrink-0">{employee.initials || "??"}</div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[12px] font-medium text-neutral-800">{employee.name}</div>
                      <div className="truncate text-[10px] text-neutral-400">{employee.jobTitle}</div>
                    </div>
                    <span className={employee.currentWorkload > 80 ? "h-2 w-2 rounded-full bg-red-500" : "h-2 w-2 rounded-full bg-emerald-500"} aria-label={`${employee.currentWorkload}% workload`} />
                  </button>
                );
              })}
            </div>
          </aside>

          {(() => {
            const employee = deptEmployees.find((item) => item.id === selectedEmployeeId);
            if (!employee) return null;
            const draft = drafts[employee.id] || emptyEmployeeNoteDraft();
            const isSaving = savingIds.has(employee.id);
            const isSaved = savedIds.has(employee.id);
            return (
              <section className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex items-start gap-3 border-b border-neutral-100 pb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-11 w-11 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[13px] font-['Lexend:SemiBold',_sans-serif] shrink-0">{employee.initials || "??"}</div>
                    <div className="min-w-0">
                      <h2 className="truncate text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{employee.name}</h2>
                      <p className="truncate text-[11px] text-neutral-500">{employee.jobTitle} · {employee.email || "No email"}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">Strengths</label>
                    <textarea rows={4} value={draft.strengths} onChange={(event) => handleChange(employee.id, "strengths", event.target.value)} placeholder="e.g., permit processing; compliance review" className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white" />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">Weaknesses</label>
                    <textarea rows={4} value={draft.weaknesses} onChange={(event) => handleChange(employee.id, "weaknesses", event.target.value)} placeholder="e.g., needs support on field documentation" className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">Notes</label>
                    <textarea rows={6} value={draft.notes} onChange={(event) => handleChange(employee.id, "notes", event.target.value)} placeholder="Context for supervisors and future task recommendations" className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-[10px] uppercase tracking-wider text-neutral-400">Tags</label>
                    <input type="text" value={draft.tags} onChange={(event) => handleChange(employee.id, "tags", event.target.value)} placeholder="permits, inspections, compliance" className="h-[38px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white" />
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <button onClick={() => handleSave(employee.id)} disabled={isSaving} className="rounded-lg bg-neutral-900 px-3.5 py-2 text-[11px] font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? "Saving..." : "Save profile"}</button>
                  {isSaved && <span className="text-[11px] text-emerald-600">Saved</span>}
                  {dirtyIds.has(employee.id) && !isSaving && <span className="text-[11px] text-amber-600">Unsaved changes</span>}
                </div>
              </section>
            );
          })()}
        </div>
      )}
    </div>
  );
}

// ==================== TASK BOARD ====================
