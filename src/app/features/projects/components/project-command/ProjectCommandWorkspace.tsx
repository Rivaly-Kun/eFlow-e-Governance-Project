import { useEffect, useMemo, useState } from "react";
import { Loader, Tab, TabList, TabsContext } from "@vibe/core";
import type { Organization } from "../../../../types";
import { useProfiles } from "../../../../hooks/useSupabaseData";
import { useTasks } from "../../../../hooks/useFirebaseData";
import { useToast } from "../../../../components/ui/Toast";
import { TaskDetailDrawer } from "../../../../components/workflow/TaskDetailDrawer";
import { tasksForProject } from "../../../../services/taskSelectors";
import {
  archiveProject,
  restoreProject,
  type Project,
} from "../../services/projectService";
import { useProjectCommandData } from "../../hooks/useProjectCommandData";
import { ProjectDeleteDialog } from "../ProjectDeleteDialog";
import { ProjectHeader } from "./ProjectHeader";
import { ProjectOverviewTab } from "./ProjectOverviewTab";
import { ProjectWorkTab } from "./ProjectWorkTab";
import { ProjectTimelineView } from "./ProjectTimelineView";
import { ProjectCalendarView } from "./ProjectCalendarView";
import { ProjectTeamTab } from "./ProjectTeamTab";
import { ProposalContextInspector } from "./ProposalContextInspector";
import { ProjectToolsInspector, type ProjectTool } from "./ProjectToolsInspector";
import type { ProjectCommandTab } from "./types";
import "../projectsVibe.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "tasks", label: "Tasks" },
  { id: "timeline", label: "Timeline" },
  { id: "calendar", label: "Calendar" },
] as const;

export interface ProjectCommandWorkspaceProps {
  project: Project;
  initialTab?: ProjectCommandTab;
  initialTool?: ProjectTool;
  onWorkspaceTabChange?: (tab: ProjectCommandTab) => void;
  onBack: () => void;
  orgs: Organization[];
  canArchive: boolean;
  canManage: boolean;
  canDelete: boolean;
  onDeleted: () => void;
  canReviewTasks: boolean;
  canExport?: boolean;
  onOpenSourceGovernance?: (draftId: string) => void;
}

export function ProjectCommandWorkspace({
  project,
  initialTab = "overview",
  initialTool,
  onWorkspaceTabChange,
  onBack,
  orgs,
  canArchive,
  canManage,
  canDelete,
  onDeleted,
  canReviewTasks,
  canExport = true,
  onOpenSourceGovernance: _onOpenSourceGovernance,
}: ProjectCommandWorkspaceProps) {
  const { tasks } = useTasks();
  const { profiles } = useProfiles();
  const { toast } = useToast();
  const [tab, setTab] = useState<ProjectCommandTab>(initialTab);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [toolInspector, setToolInspector] = useState<ProjectTool | null>(initialTool ?? null);

  // Project tools can be launched from the contextual sidebar while the user
  // is on any primary workspace tab. This is a one-shot request; subsequent
  // opens/closes are managed locally by the inspector.
  useEffect(() => {
    if (initialTool) setToolInspector(initialTool);
  }, [initialTool]);

  const projectTasks = useMemo(
    () => tasksForProject(tasks, project.id),
    [project.id, tasks],
  );
  const data = useProjectCommandData(project, projectTasks);
  const openTask = projectTasks.find((task) => task.id === openTaskId) || null;

  const archive = async () => {
    const reason = window.prompt(
      "Reason for archiving (recorded in the audit log):",
    );
    if (reason === null) return;
    try {
      await archiveProject(project.id, reason || undefined);
      toast("Project archived. History remains available.", "success");
    } catch (error: any) {
      toast(error?.message || "Could not archive the project.", "error");
    }
  };

  const restore = async () => {
    try {
      await restoreProject(
        project.id,
        "Restored from Project Command Workspace",
      );
      toast("Project restored.", "success");
    } catch (error: any) {
      toast(error?.message || "Could not restore the project.", "error");
    }
  };

  // Map legacy tab requests (plan, work, people) to new tab IDs
  const activeTabId =
    tab === "plan" || tab === "work" || tab === "delivery"
      ? tab === "plan" ? "timeline" : "tasks"
      : tab === "people"
        ? "team"
      : tab;

  const selectTab = (nextTab: ProjectCommandTab) => {
    setTab(nextTab);
    onWorkspaceTabChange?.(nextTab);
  };

  return (
    <div className="eflow-project-command space-y-4">
      {/* Figma primary workspace navigation is the first element in the main canvas. */}
      <TabsContext
        id={`project-workspace-tabs-${project.id}`}
        className="eflow-workspace-tabs"
      >
        <TabList id={`project-workspace-tab-list-${project.id}`}>
          {TABS.map((item) => (
            <Tab
              key={item.id}
              id={`project-${project.id}-${item.id}`}
              active={activeTabId === item.id}
              onClick={() => selectTab(item.id)}
            >
              {item.label}
            </Tab>
          ))}
        </TabList>
      </TabsContext>

      {activeTabId === "overview" && (
        <>
          {/* Project identity and utilities stay scoped to Overview. */}
          <ProjectHeader
            project={project}
            organizations={orgs}
            profiles={profiles}
            metrics={data.metrics}
            canArchive={canArchive}
            canDelete={canDelete}
            onBack={onBack}
            onArchive={() => void archive()}
            onRestore={() => void restore()}
            onDelete={() => setDeleteOpen(true)}
            onOpenProposalContext={
              project.sourceCollaborationDraftId
                ? () => setInspectorOpen(true)
                : undefined
            }
            hasProposalContext={Boolean(project.sourceCollaborationDraftId)}
            onOpenTool={(tool) => setToolInspector(tool)}
          />
        </>
      )}

      {/* Main Workspace Body */}
      {data.loading ? (
        <div
          className="flex min-h-[300px] items-center justify-center gap-2 text-sm text-neutral-500"
          aria-live="polite"
        >
          <Loader size="medium" /> Loading project workspace…
        </div>
      ) : data.error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
        >
          {data.error}
        </div>
      ) : (
        <>
          {activeTabId === "overview" && (
            <ProjectOverviewTab
              data={data}
              profiles={profiles}
              onOpenTask={setOpenTaskId}
            />
          )}
          {activeTabId === "tasks" && (
            <ProjectWorkTab
              data={data}
              profiles={profiles}
              canManage={canManage}
              onOpenTask={setOpenTaskId}
            />
          )}
          {activeTabId === "timeline" && (
            <ProjectTimelineView
              data={data}
              profiles={profiles}
              canManage={canManage}
              onOpenTask={setOpenTaskId}
            />
          )}
          {activeTabId === "calendar" && (
            <ProjectCalendarView
              data={data}
              profiles={profiles}
              onOpenTask={setOpenTaskId}
            />
          )}
          {activeTabId === "team" && (
            <ProjectTeamTab
              data={data}
              profiles={profiles}
              canManage={canManage && project.status !== "archived"}
            />
          )}
        </>
      )}

      {/* Slide-over Task Detail Drawer */}
      <TaskDetailDrawer
        task={openTask}
        onClose={() => setOpenTaskId(null)}
        canReview={canReviewTasks}
      />

      {/* Slide-over Proposal Context Inspector — keeps user inside Project Workspace */}
      <ProposalContextInspector
        draftId={project.sourceCollaborationDraftId || null}
        open={inspectorOpen}
        onClose={() => setInspectorOpen(false)}
        organizations={orgs}
        profiles={profiles}
      />

      <ProjectToolsInspector
        tool={toolInspector}
        data={data}
        canExport={canExport}
        onOpenTask={setOpenTaskId}
        onClose={() => setToolInspector(null)}
        onToolChange={setToolInspector}
      />

      {/* Delete Confirmation Dialog */}
      <ProjectDeleteDialog
        projectId={project.id}
        projectTitle={project.title}
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onDeleted={() => {
          setDeleteOpen(false);
          toast(
            "Project permanently deleted. Existing tasks were retained.",
            "success",
          );
          onDeleted();
        }}
      />
    </div>
  );
}
