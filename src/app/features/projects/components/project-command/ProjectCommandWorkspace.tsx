import { useMemo, useState } from "react";
import { Activity, ClipboardCheck, FileBarChart, LayoutDashboard, ListTree, Settings2, UsersRound } from "lucide-react";
import type { Organization } from "../../../../types";
import { useProfiles } from "../../../../hooks/useSupabaseData";
import { useTasks } from "../../../../hooks/useFirebaseData";
import { useToast } from "../../../../components/ui/Toast";
import { TaskDetailDrawer } from "../../../../components/workflow/TaskDetailDrawer";
import { LoadingState } from "../../../../components/workflow/primitives";
import { tasksForProject } from "../../../../services/taskSelectors";
import { archiveProject, restoreProject, type Project } from "../../services/projectService";
import { useProjectCommandData } from "../../hooks/useProjectCommandData";
import { ProjectDeleteDialog } from "../ProjectDeleteDialog";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectHealthStrip } from "./ProjectHealthStrip";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ProjectPlanTab } from "./ProjectPlanTab";
import { ProjectWorkTab } from "./ProjectWorkTab";
import { ProjectPeopleTab } from "./ProjectPeopleTab";
import { ProjectReviewsTab } from "./ProjectReviewsTab";
import { ProjectActivityTab } from "./ProjectActivityTab";
import { ProjectReportsTab } from "./ProjectReportsTab";
import type { ProjectCommandTab } from "./types";

const TABS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "plan", label: "Plan", icon: Settings2 },
  { id: "work", label: "Work", icon: ListTree },
  { id: "people", label: "People", icon: UsersRound },
  { id: "reviews", label: "Reviews", icon: ClipboardCheck },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "reports", label: "Reports", icon: FileBarChart },
] as const;

export interface ProjectCommandWorkspaceProps {
  project: Project;
  onBack: () => void;
  orgs: Organization[];
  canArchive: boolean;
  canManage: boolean;
  canDelete: boolean;
  onDeleted: () => void;
  canReviewTasks: boolean;
  canExport?: boolean;
}

export function ProjectCommandWorkspace({ project, onBack, orgs, canArchive, canManage, canDelete, onDeleted, canReviewTasks, canExport = true }: ProjectCommandWorkspaceProps) {
  const { tasks } = useTasks();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [tab, setTab] = useState<ProjectCommandTab>("overview");
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const projectTasks = useMemo(() => tasksForProject(tasks, project.id), [project.id, tasks]);
  const data = useProjectCommandData(project, projectTasks);
  const openTask = projectTasks.find((task) => task.id === openTaskId) || null;

  const archive = async () => {
    const reason = window.prompt("Reason for archiving (recorded in the audit log):");
    if (reason === null) return;
    try { await archiveProject(project.id, reason || undefined); toast("Project archived. History remains available.", "success"); }
    catch (error: any) { toast(error?.message || "Could not archive the project.", "error"); }
  };
  const restore = async () => {
    try { await restoreProject(project.id, "Restored from Project Command Workspace"); toast("Project restored.", "success"); }
    catch (error: any) { toast(error?.message || "Could not restore the project.", "error"); }
  };

  return (
    <div className="min-h-full space-y-5 p-6 sm:p-8">
      <ProjectHeader project={project} organizations={orgs} canArchive={canArchive} canDelete={canDelete} onBack={onBack} onArchive={() => void archive()} onRestore={() => void restore()} onDelete={() => setDeleteOpen(true)} />
      <ProjectHealthStrip metrics={data.metrics} />
      <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-neutral-200 bg-white p-1.5 shadow-sm">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl px-3 py-2 text-[10.5px] font-semibold transition-all ${active ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-800"}`}><Icon size={13} /> {item.label}{item.id === "reviews" && data.metrics.awaitingReview > 0 && <span className={`rounded-full px-1.5 py-0.5 text-[8px] ${active ? "bg-white/15" : "bg-amber-50 text-amber-700"}`}>{data.metrics.awaitingReview}</span>}</button>;
        })}
      </nav>

      {data.loading ? <div className="rounded-2xl border border-neutral-200 bg-white p-10"><LoadingState label="Loading project command data…" /></div> : data.error ? <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[11px] text-red-700">{data.error}</div> : (
        <>
          {tab === "overview" && <ProjectOverviewTab data={data} profiles={profiles} onOpenTask={setOpenTaskId} />}
          {tab === "plan" && <ProjectPlanTab data={data} profiles={profiles} canManage={canManage && project.status !== "archived"} />}
          {tab === "work" && <ProjectWorkTab data={data} profiles={profiles} onOpenTask={setOpenTaskId} canManage={canManage} />}
          {tab === "people" && <ProjectPeopleTab data={data} profiles={profiles} canManage={canManage && project.status !== "archived"} />}
          {tab === "reviews" && <ProjectReviewsTab data={data} onOpenTask={setOpenTaskId} />}
          {tab === "activity" && <ProjectActivityTab data={data} />}
          {tab === "reports" && <ProjectReportsTab data={data} canExport={canExport} />}
        </>
      )}
      <TaskDetailDrawer task={openTask} onClose={() => setOpenTaskId(null)} canReview={canReviewTasks} />
      <ProjectDeleteDialog projectId={project.id} projectTitle={project.title} open={deleteOpen} onClose={() => setDeleteOpen(false)} onDeleted={() => { setDeleteOpen(false); toast("Project permanently deleted. Existing tasks were retained.", "success"); onDeleted(); }} />
    </div>
  );
}
