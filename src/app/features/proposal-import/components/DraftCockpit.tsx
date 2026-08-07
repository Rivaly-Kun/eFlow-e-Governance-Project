import { useMemo } from "react";
import { Check, ChevronRight, Clock, Layers, Loader2, Plus } from "lucide-react";
import type { Employee } from "../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../services/employeeNotesService";
import type { DraftTask } from "./draftModel";
import { DraftTaskRow } from "./DraftTaskRow";

export function DraftCockpit({
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
  allEmployees?: Employee[];
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
                <Check size={13} /> Commit {enabledCount} Tasks & Projects
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

                    {/* Tasks list */}
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
                      {activity.tasks.length === 0 && (
                        <div className="text-[11px] text-neutral-400 text-center py-6 italic rounded-xl border border-dashed border-neutral-100 m-4">
                          No tasks inside this activity.
                        </div>
                      )}
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

// ─── Assignment Modal Component ──────────────────────────────────
