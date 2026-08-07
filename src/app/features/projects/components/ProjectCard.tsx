import * as Icons from "lucide-react";
import { useTasks } from "../../../hooks/useFirebaseData";
import type { Project } from "../../../services/projectService";
import { tasksForProject } from "../../../services/taskSelectors";
import type { Organization } from "../../../types";
import * as UI from "../../../components/workflow/primitives";
import { formatDate, relativeDays } from "../../../components/workflow/primitives";
import * as Badges from "../../../components/workflow/StatusBadges";

export function ProjectCard({ project, orgs, onOpen }: { project: Project; orgs: Organization[]; onOpen: () => void }) {
  const { tasks } = useTasks();
  const pTasks = tasksForProject(tasks, project.id);
  const done = pTasks.filter((t) => t.status === "completed").length;
  const pct = pTasks.length ? Math.round((done / pTasks.length) * 100) : 0;
  const orgName = orgs.find((o) => o.id === project.orgId)?.name;
  const rel = relativeDays(project.targetDate);

  return (
    <button
      onClick={onOpen}
      className="text-left bg-white border border-neutral-200 rounded-xl p-4 hover:shadow-sm hover:border-neutral-300 transition-all"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badges.ProjectStatusBadge status={project.status} size="sm" />
          {project.description?.toLowerCase().includes("proposal") && (
            <span className="bg-blue-50 text-blue-700 text-[10px] font-['Lexend:SemiBold',_sans-serif] px-1.5 py-0.5 rounded">
              Proposal
            </span>
          )}
        </div>
        <Badges.PriorityPill priority={project.priority} />
      </div>
      <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-snug line-clamp-2">
        {project.title}
      </h3>
      {orgName && (
        <div className="flex items-center gap-1 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">
          <Icons.Building2 size={11} /> {orgName}
        </div>
      )}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-500 mb-1">
          <span>{done}/{pTasks.length} tasks</span>
          <span className="tabular-nums">{pct}%</span>
        </div>
        <UI.ProgressBar value={pct} tone={pct === 100 ? "good" : "neutral"} />
      </div>
      <div className="flex items-center gap-3 mt-3 text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
        {project.targetDate && (
          <span className={`flex items-center gap-1 ${rel.overdue ? "text-red-500" : ""}`}>
            <Icons.Calendar size={11} /> {formatDate(project.targetDate)}
          </span>
        )}
      </div>
    </button>
  );
}

// ─── Project detail ──────────────────────────────────────────────
