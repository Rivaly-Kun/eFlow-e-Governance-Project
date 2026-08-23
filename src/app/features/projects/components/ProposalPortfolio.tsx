import * as React from "react";
import { AlertTriangle, ArrowRight, Building2, CalendarClock, CheckCircle2, ChevronDown, FileText, FolderKanban, Layers3, Sparkles } from "lucide-react";
import type { Organization, UserProfile } from "../../../types";
import type { Task } from "../../tasks";
import type { ProposalPortfolioGroup } from "../selectors/proposalPortfolioSelectors";
import { organizationTypeLabel } from "../selectors/proposalPortfolioSelectors";
import { latestProjectTarget } from "../selectors/deadlines";
import { ProjectCard } from "./ProjectCard";
import { formatDate } from "../../../components/workflow/primitives";

const SOURCE_LABEL = {
  ai_pdf: "AI PDF proposal",
  manual: "Manual work plan",
  standalone: "Standalone work",
} as const;

export function ProposalPortfolio({
  groups,
  tasks,
  orgs,
  profiles,
  view,
  onOpenProject,
  onOpenProposal,
}: {
  groups: ProposalPortfolioGroup[];
  tasks: Task[];
  orgs: Organization[];
  profiles: UserProfile[];
  view: "grid" | "list";
  onOpenProject: (projectId: string) => void;
  onOpenProposal: (draftId: string) => void;
}) {
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());

  const toggle = (groupId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const organization = orgs.find((org) => org.id === group.orgId);
        const deadlineClass = group.deadlineTone === "overdue"
          ? "border-red-200 bg-red-50 text-red-700"
          : group.deadlineTone === "due_soon"
            ? "border-amber-200 bg-amber-50 text-amber-700"
            : group.deadlineTone === "completed"
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-blue-100 bg-blue-50 text-blue-700";
        return (
          <section key={group.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
            <div className="flex items-stretch">
            <button type="button" onClick={() => toggle(group.id)} aria-expanded={!isCollapsed} className="flex min-w-0 flex-1 flex-col gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50/70 lg:flex-row lg:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-neutral-900 text-white shadow-sm">
                  <FileText size={18} />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide text-blue-700">Proposal</span>
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[8.5px] font-medium text-neutral-600">{SOURCE_LABEL[group.sourceType]}</span>
                    {group.completionRecommended && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[8.5px] font-semibold text-emerald-700"><Sparkles size={9} /> Ready to mark completed</span>}
                  </div>
                  <h2 className="mt-1.5 truncate text-[14px] font-semibold text-neutral-950">{group.title}</h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[9.5px] text-neutral-500">
                    {organization && <span className="inline-flex items-center gap-1"><Building2 size={10} /> {organization.name} · {organizationTypeLabel(organization.org_type)}</span>}
                    {group.sourceFileName && <span className="inline-flex items-center gap-1"><FileText size={10} /> {group.sourceFileName}</span>}
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${deadlineClass}`}>
                      {group.deadlineTone === "overdue" ? <AlertTriangle size={9} /> : <CalendarClock size={9} />}
                      Target {formatDate(group.targetDate)} · {group.deadlineLabel}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-2"><span className="h-1.5 min-w-[120px] flex-1 overflow-hidden rounded-full bg-neutral-100"><span className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${group.progress}%` }} /></span><span className="text-[9px] font-medium text-neutral-500">{group.completedTaskCount}/{group.taskCount} tasks approved</span></div>
                </div>
              </div>

              <div className="grid w-full grid-cols-3 gap-2 lg:w-[330px]">
                <Metric icon={<FolderKanban size={12} />} value={group.projectCount} label={group.projectCount === 1 ? "project" : "projects"} />
                <Metric icon={<Layers3 size={12} />} value={group.taskCount} label={group.taskCount === 1 ? "task" : "tasks"} />
                <Metric icon={<CheckCircle2 size={12} />} value={`${group.progress}%`} label="complete" />
              </div>
            </button>
            <div className="flex shrink-0 flex-col items-center justify-center gap-2 border-l border-neutral-100 px-3">
              {group.sourceCollaborationDraftId && <button type="button" onClick={() => onOpenProposal(group.sourceCollaborationDraftId!)} className="inline-flex items-center gap-1 rounded-lg bg-neutral-900 px-2.5 py-2 text-[9.5px] font-medium text-white hover:bg-neutral-800">Open delivery <ArrowRight size={11} /></button>}
              <button type="button" onClick={() => toggle(group.id)} aria-label={isCollapsed ? "Show proposal projects" : "Hide proposal projects"} className="rounded-lg border border-neutral-200 p-2 text-neutral-400 hover:bg-neutral-50 hover:text-neutral-700"><ChevronDown size={15} className={`transition-transform duration-200 ${isCollapsed ? "-rotate-90" : ""}`} /></button>
            </div>
            </div>

            {!isCollapsed && (
              <div className="border-t border-neutral-100 bg-neutral-50/50 px-4 py-4 sm:px-5">
                <div className="space-y-5">
                  {group.programs.map((program, index) => (
                    <section key={program.id}>
                      <div className="mb-2.5 flex items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-[9px] font-bold text-violet-700">{index + 1}</span>
                        <div>
                          <div className="text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-600">Program</div>
                          <h3 className="text-[11.5px] font-semibold text-neutral-800">{program.title}</h3>
                        </div>
                        <span className="ml-auto inline-flex items-center gap-2 text-[9px] text-neutral-400"><span>{program.projects.length} {program.projects.length === 1 ? "project" : "projects"}</span><span className="inline-flex items-center gap-1"><CalendarClock size={9} /> Target {formatDate(latestProjectTarget(program.projects))}</span></span>
                      </div>
                      <div className={view === "grid" ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
                        {program.projects.map((project) => (
                          <ProjectCard
                            key={project.id}
                            project={project}
                            tasks={tasks}
                            orgs={orgs}
                            profiles={profiles}
                            view={view}
                            onOpen={() => onOpenProject(project.id)}
                          />
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return <span className="rounded-xl bg-neutral-100 px-2.5 py-2 text-center"><span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-neutral-800">{icon}{value}</span><span className="mt-0.5 block text-[8px] uppercase tracking-wide text-neutral-400">{label}</span></span>;
}
