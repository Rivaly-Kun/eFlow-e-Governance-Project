import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Eye,
  FileText,
  FolderKanban,
  Inbox,
  Layers3,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { ProgressBar } from "../../../components/workflow/primitives";
import { buildAdminTaskProposalGroups, type AdminTaskProjectGroup } from "../selectors";
import type { Task } from "../taskTypes";
import { AdminTaskOversightRow } from "./AdminTaskOversightRow";

export function AdminTaskOversightList({ tasks, orgName, onOpen }: {
  tasks: Task[];
  orgName: (orgId?: string) => string;
  onOpen: (task: Task) => void;
}) {
  const groups = useMemo(() => buildAdminTaskProposalGroups(tasks), [tasks]);
  const [collapsedProposals, setCollapsedProposals] = useState<Set<string>>(() => new Set());
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => new Set());
  const allCollapsed = groups.length > 0 && groups.every((group) => collapsedProposals.has(group.id));

  const toggleInSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <section className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-sm sm:px-5">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neutral-900 text-white"><Eye size={13} /></span>
          <div>
            <h2 className="text-[13px] font-semibold text-neutral-900">Proposal delivery hierarchy</h2>
            <p className="mt-0.5 text-[10.5px] text-neutral-500">{groups.length} {groups.length === 1 ? "proposal" : "proposals"} · {tasks.length} visible {tasks.length === 1 ? "task" : "tasks"}</p>
          </div>
        </div>
        {groups.length > 1 && (
          <button
            type="button"
            onClick={() => setCollapsedProposals(allCollapsed ? new Set() : new Set(groups.map((group) => group.id)))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:bg-neutral-50 hover:text-neutral-900"
          >
            {allCollapsed ? <Maximize2 size={12} /> : <Minimize2 size={12} />}
            {allCollapsed ? "Expand all proposals" : "Collapse all proposals"}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {groups.map((proposal) => {
          const proposalCollapsed = collapsedProposals.has(proposal.id);
          const standalone = proposal.title === "Standalone operational work";
          return (
            <section key={proposal.id} className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
              <button
                type="button"
                onClick={() => toggleInSet(setCollapsedProposals, proposal.id)}
                aria-expanded={!proposalCollapsed}
                className="flex w-full flex-col gap-4 px-5 py-4 text-left transition-colors hover:bg-neutral-50/80 lg:flex-row lg:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm ${standalone ? "bg-slate-600" : "bg-neutral-900"}`}>
                    {standalone ? <ClipboardList size={18} /> : <FileText size={18} />}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className={`rounded-full px-2 py-0.5 text-[8.5px] font-semibold uppercase tracking-wide ${standalone ? "bg-slate-100 text-slate-700" : "bg-blue-50 text-blue-700"}`}>{standalone ? "Work collection" : "Proposal"}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[8.5px] font-medium text-neutral-600">{proposal.source === "imported" ? "Imported plan" : "Manual plan"}</span>
                      {proposal.reviewCount > 0 && <span className="rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[8.5px] font-medium text-amber-700">{proposal.reviewCount} awaiting review</span>}
                      {proposal.overdueCount > 0 && <span className="rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[8.5px] font-medium text-red-700">{proposal.overdueCount} overdue</span>}
                    </div>
                    <h3 className="mt-1.5 truncate text-[14px] font-semibold text-neutral-950">{proposal.title}</h3>
                    <div className="mt-1 flex items-center gap-1 text-[9.5px] text-neutral-500"><Building2 size={10} /> {orgName(proposal.orgId)}</div>
                  </div>
                </div>

                <div className="grid w-full grid-cols-3 gap-2 lg:w-[350px]">
                  <Metric icon={<FolderKanban size={12} />} value={proposal.projectCount} label={proposal.projectCount === 1 ? "project" : "projects"} />
                  <Metric icon={<Layers3 size={12} />} value={proposal.taskCount} label={proposal.taskCount === 1 ? "task" : "tasks"} />
                  <Metric icon={<CheckCircle2 size={12} />} value={`${proposal.progress}%`} label="progress" />
                </div>
                <ChevronDown size={16} className={`shrink-0 text-neutral-400 transition-transform duration-200 ${proposalCollapsed ? "-rotate-90" : ""}`} />
              </button>

              {!proposalCollapsed && (
                <div className="space-y-5 border-t border-neutral-100 bg-neutral-50/55 px-4 py-4 sm:px-5">
                  {proposal.programs.map((program, programIndex) => (
                    <section key={program.id}>
                      <div className="mb-2.5 flex items-center gap-2 px-0.5">
                        <span className="flex h-5 w-5 items-center justify-center rounded-md bg-violet-100 text-[9px] font-bold text-violet-700">{programIndex + 1}</span>
                        <div className="min-w-0">
                          <div className="text-[8.5px] font-semibold uppercase tracking-[0.14em] text-violet-600">Program</div>
                          <h4 className="truncate text-[11.5px] font-semibold text-neutral-800">{program.title}</h4>
                        </div>
                        <span className="ml-auto text-[9px] text-neutral-400">{program.projects.length} {program.projects.length === 1 ? "project" : "projects"}</span>
                      </div>

                      <div className="space-y-2.5">
                        {program.projects.map((project) => {
                          const projectKey = `${proposal.id}:${program.id}:${project.id}`;
                          const projectCollapsed = collapsedProjects.has(projectKey);
                          return (
                            <section key={projectKey} className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xs">
                              <button
                                type="button"
                                onClick={() => toggleInSet(setCollapsedProjects, projectKey)}
                                aria-expanded={!projectCollapsed}
                                className="flex w-full flex-wrap items-center gap-3 border-b border-neutral-100 px-4 py-3 text-left transition hover:bg-neutral-50"
                              >
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700"><FolderKanban size={13} /></span>
                                <div className="min-w-0 flex-1">
                                  <div className="text-[8.5px] font-semibold uppercase tracking-[0.13em] text-blue-600">Project</div>
                                  <h5 className="truncate text-[11.5px] font-semibold text-neutral-900">{project.title}</h5>
                                </div>
                                <ProjectSignals project={project} />
                                <div className="w-20"><ProgressBar value={project.progress} tone={project.progress === 100 ? "good" : project.overdueCount ? "bad" : "neutral"} /></div>
                                <span className="w-8 text-right text-[9.5px] font-medium tabular-nums text-neutral-500">{project.progress}%</span>
                                <ChevronDown size={14} className={`text-neutral-400 transition-transform duration-200 ${projectCollapsed ? "-rotate-90" : ""}`} />
                              </button>
                              {!projectCollapsed && <div className="divide-y divide-neutral-100">{project.tasks.map((task) => <AdminTaskOversightRow key={task.id} task={task} onOpen={onOpen} />)}</div>}
                            </section>
                          );
                        })}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: number | string; label: string }) {
  return <span className="rounded-xl bg-neutral-100 px-2.5 py-2 text-center"><span className="flex items-center justify-center gap-1 text-[11px] font-semibold text-neutral-800">{icon}{value}</span><span className="mt-0.5 block text-[8px] uppercase tracking-wide text-neutral-400">{label}</span></span>;
}

function ProjectSignals({ project }: { project: AdminTaskProjectGroup }) {
  return (
    <div className="hidden items-center gap-1.5 sm:flex">
      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-medium text-neutral-600">{project.tasks.length} {project.tasks.length === 1 ? "task" : "tasks"}</span>
      {project.completedCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-medium text-emerald-700"><CheckCircle2 size={9} /> {project.completedCount} done</span>}
      {project.reviewCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[9px] font-medium text-amber-700"><Inbox size={9} /> {project.reviewCount}</span>}
      {project.overdueCount > 0 && <span className="inline-flex items-center gap-1 rounded-full border border-red-100 bg-red-50 px-2 py-0.5 text-[9px] font-medium text-red-700"><AlertTriangle size={9} /> {project.overdueCount}</span>}
    </div>
  );
}
