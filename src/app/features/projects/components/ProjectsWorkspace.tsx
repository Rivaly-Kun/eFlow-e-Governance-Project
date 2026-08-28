import * as React from "react";
import * as Icons from "lucide-react";
import { Button, Dialog, DialogContentContainer, IconButton, Loader, Menu, MenuDivider, MenuItem } from "@vibe/core";
import { Activity, Add, AddNewDoc, BoardTemplate, Chart, Dropdown, File, MoreActions, PDF } from "@vibe/icons";
import { ManualPlanBuilder, ProposalImport } from "../../proposal-import";
import { useDeptDirectoryEmployees } from "../../employees";
import { isTaskLead, tasksForProject } from "../../tasks";
import { ProjectTemplatesModal } from "../../work-templates";
import { useNotificationNavigationIntent } from "../../notifications";
import { fetchProjectMembers } from "../services/projectMemberService";
import type { ProjectMember } from "../services/types";
import {
  useProjectsData,
  useOrgs,
  useProfiles,
} from "../../../hooks/useSupabaseData";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import { ProjectDetail } from "./ProjectDetail";
import type { ProjectCommandTab } from "./project-command/types";
import type { ProjectTool } from "./project-command/ProjectToolsInspector";
import { resolveProjectWorkspaceAccess, type ProjectScope } from "./model";
import { buildProjectPortfolioSummary } from "../selectors/projectCommandSelectors";
import {
  CollaborationDraftList,
  CollaborationDraftWorkspace,
  isActiveCollaborationDraft,
  useCollaborationDrafts,
} from "../../interdepartment-collaboration";
import {
  archiveProposalProjects,
  markProposalProjectsCompleted,
} from "../services/proposalDeliveryService";
import "./projectsVibe.css";

export interface WorkspaceEditorTab {
  id: string;
  type: "portfolio" | "project" | "proposal";
  title: string;
  projectId?: string;
  draftId?: string;
  initialCollaborationTab?: "overview" | "approvals";
  pinned?: boolean;
}

const PROJECT_WORKSPACE_TITLE: Partial<Record<ProjectCommandTab, string>> = {
  overview: "Overview",
  tasks: "Tasks",
  timeline: "Timeline",
  calendar: "Calendar",
  delivery: "Tasks",
  plan: "Timeline",
  work: "Tasks",
  team: "Team",
};

export function ProjectsWorkspace({
  scope,
  eyebrow: _eyebrow,
  proposalGrouping = true,
  readOnly = false,
}: {
  scope: ProjectScope;
  eyebrow: string;
  proposalGrouping?: boolean;
  readOnly?: boolean;
}) {
  const { projects: dbProjects, loading: projectsLoading } = useProjectsData();
  const { tasks, loading: tasksLoading } = useTasks();
  const { orgs } = useOrgs();
  const { profiles } = useProfiles();
  const { can, user, userProfile } = useAuth();
  const { deptEmployees } = useDeptDirectoryEmployees({
    scope: "exact",
    includeCurrentUser: true,
    includeDepartmentHeads: true,
    activeOnly: true,
    excludeSuperAdmins: true,
  });

  // IDE-like Tabs state
  const [tabs, setTabs] = React.useState<WorkspaceEditorTab[]>([
    {
      id: "portfolio",
      type: "portfolio",
      title: "Plans & Projects",
      pinned: true,
    },
  ]);
  const [activeTabId, setActiveTabId] = React.useState<string>("portfolio");
  const [projectWorkspaceTab, setProjectWorkspaceTab] = React.useState<ProjectCommandTab>("overview");
  const [requestedProjectTool, setRequestedProjectTool] = React.useState<{ projectId: string; tool: ProjectTool } | null>(null);
  const [contextProjectMembers, setContextProjectMembers] = React.useState<ProjectMember[]>([]);

  const [workspaceView, setWorkspaceView] = React.useState<
    "portfolio" | "drafts" | "signoff" | "incoming"
  >("portfolio");
  const [importOpen, setImportOpen] = React.useState(false);
  const [manualPlanOpen, setManualPlanOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const access = resolveProjectWorkspaceAccess(readOnly, can);
  const collaboration = useCollaborationDrafts();
  const activeCollaborationDrafts = React.useMemo(
    () => collaboration.drafts.filter(isActiveCollaborationDraft),
    [collaboration.drafts],
  );
  const currentOrgId = userProfile?.org_id || userProfile?.departmentId || "";

  const inScope = React.useMemo(() => {
    if (scope.isSuperAdmin || !scope.enforceOrgScope) return dbProjects;
    if (scope.scopedOrgIds.length === 0) return [];
    return dbProjects;
  }, [dbProjects, scope]);

  const active = React.useMemo(
    () => inScope.filter((p) => p.status !== "archived"),
    [inScope],
  );

  const summaries = React.useMemo(() => {
    const map = new Map();
    for (const project of inScope) {
      map.set(project.id, buildProjectPortfolioSummary(project, tasks));
    }
    return map;
  }, [inScope, tasks]);

  // Tab management handlers
  const openProject = React.useCallback(
    (projectId: string) => {
      const project = dbProjects.find((p) => p.id === projectId);
      const tabId = `project-${projectId}`;
      const title = project?.title || "Project Workspace";
      setTabs((current) => {
        if (current.some((t) => t.id === tabId)) return current;
        return [...current, { id: tabId, type: "project", projectId, title }];
      });
      setActiveTabId(tabId);
      setWorkspaceView("portfolio");

      // Newly opened projects start on Overview. When switching directly
      // between project contexts, keep the current workspace view so users
      // can compare the same surface across projects.
      setProjectWorkspaceTab((currentView) => {
        const current = tabs.find((tab) => tab.id === activeTabId);
        return current?.type === "project" ? currentView : "overview";
      });
    },
    [activeTabId, dbProjects, tabs],
  );

  const openProposal = React.useCallback(
    (draftId: string, initialCollaborationTab: "overview" | "approvals" = "overview") => {
      const draft = collaboration.drafts.find((d) => d.id === draftId);
      const tabId = `proposal-${draftId}`;
      const title = draft?.title || "Proposal Workspace";
      setTabs((current) => {
        if (current.some((t) => t.id === tabId)) return current.map((tab) => tab.id === tabId ? { ...tab, initialCollaborationTab } : tab);
        return [...current, { id: tabId, type: "proposal", draftId, title, initialCollaborationTab }];
      });
      setActiveTabId(tabId);
    },
    [collaboration.drafts],
  );

  const closeTab = React.useCallback(
    (tabId: string) => {
      setTabs((current) => {
        const next = current.filter((t) => t.id !== tabId);
        if (activeTabId === tabId) {
          const closedIndex = current.findIndex((t) => t.id === tabId);
          const nextActive = next[Math.max(0, closedIndex - 1)] || next[0];
          if (nextActive) setActiveTabId(nextActive.id);
        }
        return next;
      });
    },
    [activeTabId],
  );

  const loading = projectsLoading || tasksLoading;
  useNotificationNavigationIntent(
    (intent) =>
      intent.kind === "project" ||
      intent.kind === "proposal" ||
      intent.kind === "collaboration",
    (intent) => {
      if (loading) return false;
      if (intent.kind === "collaboration" && intent.proposalId) {
        openProposal(intent.proposalId);
        return true;
      }
      if (intent.projectId) {
        openProject(intent.projectId);
        return true;
      }
      if (intent.proposalId) {
        openProposal(intent.proposalId);
        return true;
      }
      return true;
    },
    [dbProjects, loading, openProject, openProposal],
  );

  const currentUserId = user?.id || userProfile?.id || userProfile?.uid || "";
  const canManageDepartmentTemplates = [
    "dept_head",
    "department_head",
    "assistant_head",
  ].includes(userProfile?.role || "");
  const leadingTasks = tasks.filter(
    (task) =>
      isTaskLead(task, currentUserId) &&
      !task.archivedAt &&
      !["for_review", "completed", "cancelled"].includes(task.status),
  );
  const canUseTemplates =
    canManageDepartmentTemplates || leadingTasks.length > 0;
  const planningCounts = React.useMemo(() => {
    const owned = activeCollaborationDrafts.filter((draft) => readOnly || draft.ownerOrgId === currentOrgId);
    const accessible = new Set([currentOrgId, ...collaboration.membershipOrgIds].filter(Boolean));
    const incoming = activeCollaborationDrafts.filter((draft) =>
      ["in_review", "changes_requested", "ready_to_commit"].includes(draft.status) &&
      draft.snapshot.organizations.some((item) => item.participationRole !== "owner" && accessible.has(item.orgId)),
    );
    return {
      workplans: owned.length,
      signoff: owned.filter((draft) => draft.status === "in_review").length,
      incoming: incoming.length,
    };
  }, [activeCollaborationDrafts, collaboration.membershipOrgIds, currentOrgId, readOnly]);

  React.useEffect(() => {
    if (loading || active.length === 0) return;
    if (activeTabId === "portfolio" && workspaceView === "portfolio") {
      openProject(active[0].id);
    }
  }, [active, activeTabId, loading, openProject, workspaceView]);

  const activeTab =
    tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeProject =
    activeTab.type === "project" && activeTab.projectId
      ? dbProjects.find((p) => p.id === activeTab.projectId)
      : null;

  React.useEffect(() => {
    if (typeof document === "undefined") return;
    if (activeTab.type === "project" && activeProject) {
      const workspaceTitle = PROJECT_WORKSPACE_TITLE[projectWorkspaceTab] || "Workspace";
      document.title = `${workspaceTitle} · ${activeProject.title}`;
      return;
    }
    if (activeTab.type === "proposal") {
      const collaborationTitle = activeTab.initialCollaborationTab === "approvals"
        ? "Review & Governance"
        : "Overview";
      document.title = `${collaborationTitle} · ${activeTab.title}`;
      return;
    }
    const planningTitle = workspaceView === "drafts"
      ? "Work plans"
      : workspaceView === "signoff"
        ? "Waiting for sign-off"
        : workspaceView === "incoming"
          ? "Incoming reviews"
          : "Plans & Projects";
    document.title = planningTitle;
  }, [activeProject, activeTab, projectWorkspaceTab, workspaceView]);

  React.useEffect(() => {
    if (requestedProjectTool && requestedProjectTool.projectId === activeProject?.id) {
      setRequestedProjectTool(null);
    }
  }, [activeProject?.id, requestedProjectTool]);

  React.useEffect(() => {
    let cancelled = false;
    if (!activeProject?.id) {
      setContextProjectMembers([]);
      return;
    }
    void fetchProjectMembers(activeProject.id)
      .then((members) => {
        if (!cancelled) setContextProjectMembers(members);
      })
      .catch(() => {
        if (!cancelled) setContextProjectMembers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeProject?.id]);

  if (loading)
    return (
      <div
        className="eflow-projects-surface flex min-h-[360px] items-center justify-center"
        aria-live="polite"
      >
        <Loader size="medium" />
        <span className="ml-2">Loading Plans &amp; Projects…</span>
      </div>
    );

  return (
    <div className="eflow-ide-workspace">
      <ProjectContextSidebar
        activeProjectId={activeProject?.id}
        canAdd={!readOnly}
        canUseTemplates={canUseTemplates}
        onCreateWorkPlan={() => setManualPlanOpen(true)}
        onImportProposal={() => setImportOpen(true)}
        onOpenTemplates={() => setTemplatesOpen(true)}
        onOpenPortfolio={() => {
          if (active[0]) {
            openProject(active[0].id);
          } else {
            setActiveTabId("portfolio");
            setWorkspaceView("portfolio");
          }
        }}
        onOpenProject={openProject}
        onOpenProjectTool={(projectId, tool) => {
          setRequestedProjectTool({ projectId, tool });
          openProject(projectId);
        }}
        profiles={profiles}
        projects={inScope}
        summaries={summaries}
        tasks={tasks}
        projectMembers={contextProjectMembers}
        planningCounts={planningCounts}
        planningView={workspaceView}
        onOpenPlanning={(view) => {
          setActiveTabId("portfolio");
          setWorkspaceView(view);
        }}
      />
      <div className="eflow-ide-workspace__content">
      {/* The workspace is intentionally continuous: global rail → project context → page. */}
      <div className="flex-1 min-w-0 bg-white">
        {/* Tab 1: Project Workspace Detail Tab */}
        {activeTab.type === "project" && activeProject && (
          <div className="animate-in fade-in duration-150" key={activeTab.id}>
            <ProjectDetail
              project={activeProject}
              initialTab={projectWorkspaceTab}
              initialTool={requestedProjectTool?.projectId === activeProject.id ? requestedProjectTool.tool : undefined}
              onWorkspaceTabChange={setProjectWorkspaceTab}
              onBack={() => closeTab(activeTab.id)}
              onDeleted={() => closeTab(activeTab.id)}
              orgs={orgs}
              canManage={access.canManage}
              canArchive={access.canArchive}
              canDelete={access.canDelete}
              canReviewTasks={access.canReviewTasks}
              canExport={access.canExport}
              onOpenSourceGovernance={(draftId) => openProposal(draftId)}
            />
          </div>
        )}

        {/* Tab 2: Proposal Workspace Detail Tab */}
        {activeTab.type === "proposal" && activeTab.draftId && (
          <div className="animate-in fade-in duration-150" key={`${activeTab.id}-${activeTab.initialCollaborationTab || "overview"}`}>
            <CollaborationDraftWorkspace
              draftId={activeTab.draftId}
              organizations={orgs}
              profiles={profiles}
              operationalProjects={dbProjects}
              operationalTasks={tasks}
              readOnly={readOnly}
              initialTab={activeTab.initialCollaborationTab}
              onBack={() => closeTab(activeTab.id)}
              onCommitted={() => {
                void collaboration.refresh();
                closeTab(activeTab.id);
                setWorkspaceView("portfolio");
              }}
              onOpenProject={(projectId) => {
                openProject(projectId);
              }}
              onMarkProjectsCompleted={markProposalProjectsCompleted}
              onArchiveProjects={archiveProposalProjects}
            />
          </div>
        )}

        {/* Tab 3: Plans & Projects Main Landing / Portfolio Tab */}
        {activeTab.type === "portfolio" && (
          <div className="eflow-projects-surface animate-in fade-in duration-150">
            {workspaceView !== "portfolio" && (
              <div className="eflow-project-planning-heading">
                <span className="eflow-project-view-heading__eyebrow"><Icons.FileClock size={14} /> Planning workspace</span>
                <h2>{workspaceView === "drafts" ? "Work plans" : workspaceView === "signoff" ? "Waiting for sign-off" : "Incoming reviews"}</h2>
                <p>{workspaceView === "drafts" ? "Plans in preparation and collaboration workspaces you own." : workspaceView === "signoff" ? "Owned work plans currently waiting on partner decisions." : "Review queues for work plans shared with your organization."}</p>
              </div>
            )}

            {proposalGrouping && workspaceView !== "portfolio" ? (
              collaboration.loading ? (
                <div className="flex items-center gap-2 py-12">
                  <Loader size="small" /> Loading proposals…
                </div>
              ) : collaboration.error ? (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700"
                >
                  {collaboration.error}
                </div>
              ) : (
                <CollaborationDraftList
                  drafts={activeCollaborationDrafts}
                  organizations={orgs}
                  currentOrgId={currentOrgId}
                  mode={workspaceView === "drafts" ? "owned" : workspaceView === "signoff" ? "waiting" : "incoming"}
                  accessibleOrgIds={collaboration.membershipOrgIds}
                  showAll={readOnly && scope.isSuperAdmin}
                  onOpen={(draftId) => openProposal(draftId, workspaceView === "drafts" ? "overview" : "approvals")}
                />
              )
            ) : active.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Icons.FolderKanban size={44} className="mb-3 text-neutral-300" />
                <h3 className="text-base font-semibold text-neutral-800">No active projects yet</h3>
                <p className="mt-1 text-xs text-neutral-500 max-w-sm">
                  Create your first work plan to start tracking project delivery, activities, and tasks.
                </p>
                {!readOnly && (
                  <button
                    type="button"
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-800 transition"
                    onClick={() => setManualPlanOpen(true)}
                  >
                    <Add size={14} /> Create work plan
                  </button>
                )}
              </div>
            ) : active[0] ? (
              <ProjectDetail
                project={active[0]}
                initialTab={projectWorkspaceTab}
                initialTool={undefined}
                onWorkspaceTabChange={setProjectWorkspaceTab}
                onBack={() => {}}
                onDeleted={() => {}}
                orgs={orgs}
                canManage={access.canManage}
                canArchive={access.canArchive}
                canDelete={access.canDelete}
                canReviewTasks={access.canReviewTasks}
                canExport={access.canExport}
                onOpenSourceGovernance={(draftId) => openProposal(draftId)}
              />
            ) : null}

          </div>
        )}

        {/* Creation surfaces stay mounted outside the active canvas so the sidebar
            can open them from a selected project as well as from Planning. */}
        {!readOnly && manualPlanOpen && (
          <ManualPlanBuilder
            onClose={() => {
              setManualPlanOpen(false);
              void collaboration.refresh();
            }}
          />
        )}
        {!readOnly && importOpen && (
          <ProposalImport
            onClose={() => {
              setImportOpen(false);
              void collaboration.refresh();
            }}
          />
        )}
        {templatesOpen && (
          <ProjectTemplatesModal
            open={templatesOpen}
            onClose={() => setTemplatesOpen(false)}
            orgId={userProfile?.departmentId || userProfile?.org_id || ""}
            currentUserId={currentUserId}
            canManageDepartment={canManageDepartmentTemplates}
            leadingTasks={leadingTasks}
            employees={deptEmployees}
          />
        )}
      </div>
      </div>
    </div>
  );
}

/**
 * The project context keeps project switching and the people responsible for
 * delivery visible without duplicating any project or task state. It is a
 * presentation-only companion to the existing portfolio and command tabs.
 */
function ProjectContextSidebar({
  activeProjectId,
  canAdd,
  canUseTemplates,
  onCreateWorkPlan,
  onImportProposal,
  onOpenTemplates,
  onOpenPortfolio,
  onOpenProject,
  onOpenProjectTool,
  profiles,
  projects,
  summaries,
  tasks,
  projectMembers,
  planningCounts,
  planningView,
  onOpenPlanning,
}: {
  activeProjectId?: string;
  canAdd: boolean;
  canUseTemplates: boolean;
  onCreateWorkPlan: () => void;
  onImportProposal: () => void;
  onOpenTemplates: () => void;
  onOpenPortfolio: () => void;
  onOpenProject: (projectId: string) => void;
  onOpenProjectTool: (projectId: string, tool: ProjectTool) => void;
  profiles: any[];
  projects: any[];
  summaries: Map<string, any>;
  tasks: any[];
  projectMembers: ProjectMember[];
  planningCounts: { workplans: number; signoff: number; incoming: number };
  planningView: "portfolio" | "drafts" | "signoff" | "incoming";
  onOpenPlanning: (view: "drafts" | "signoff" | "incoming") => void;
}) {
  const [createMenuOpen, setCreateMenuOpen] = React.useState(false);
  const [contextMenuProjectId, setContextMenuProjectId] = React.useState<string | null>(null);
  // Preserve the canonical query order. Selection is visual state only; it
  // must never promote or otherwise reorder projects in the sidebar.
  const contextProjects = projects;
  const selectedProject = contextProjects.find((project) => project.id === activeProjectId);
  const selectedTasks = selectedProject ? tasksForProject(tasks, selectedProject.id) : [];
  const selectedSummary = selectedProject ? summaries.get(selectedProject.id) : undefined;
  const contributorIds = new Set(
    selectedProject
      ? [
          ...projectMembers.map((member) => member.userId),
          selectedProject.ownerId,
          ...(selectedSummary?.leadIds || []),
          ...selectedTasks.flatMap((task: any) => [task.assigneeId, ...(task.teamMemberIds || [])]),
        ]
      : contextProjects.flatMap((project) => [project.ownerId, ...(summaries.get(project.id)?.leadIds || [])]),
  );
  const members = profiles.filter((profile) => contributorIds.has(profile.id));

  return (
    <aside className="eflow-project-context" aria-label="Projects context">
      <div className="eflow-project-context__section">
        <button
          className="eflow-project-context__title"
          onClick={onOpenPortfolio}
          type="button"
        >
          <Icons.Boxes size={24} aria-hidden="true" />
          <span>Projects</span>
        </button>
        <div className="eflow-project-context__list">
          {contextProjects.map((project, index) => (
            <div
              className={`eflow-project-context__project ${activeProjectId === project.id ? "eflow-project-context__project--active" : ""}`}
              key={project.id}
            >
              <button
                aria-current={activeProjectId === project.id ? "page" : undefined}
                className="eflow-project-context__project-select"
                onClick={() => onOpenProject(project.id)}
                type="button"
              >
                <span className={`eflow-project-context__project-mark eflow-project-context__project-mark--${index % 4}`} aria-hidden="true">
                  {project.title?.slice(0, 1)?.toUpperCase() || "P"}
                </span>
                <span className="eflow-project-context__project-name">{project.title}</span>
              </button>
              <Dialog
                aria-label={`${project.title} actions`}
                content={(
                  <DialogContentContainer>
                    <Menu id={`project-context-menu-${project.id}`}>
                      <MenuItem title="Reviews" icon={Chart} onClick={() => { setContextMenuProjectId(null); onOpenProjectTool(project.id, "reviews"); }} />
                      <MenuItem title="Activity" icon={Activity} onClick={() => { setContextMenuProjectId(null); onOpenProjectTool(project.id, "activity"); }} />
                      <MenuItem title="Reports" icon={File} onClick={() => { setContextMenuProjectId(null); onOpenProjectTool(project.id, "reports"); }} />
                    </Menu>
                  </DialogContentContainer>
                )}
                hideTrigger={[]}
                onDialogDidHide={() => setContextMenuProjectId(null)}
                open={contextMenuProjectId === project.id}
                position="bottom-end"
                showTrigger={[]}
              >
                <span className="eflow-project-context__project-menu">
                  <IconButton
                    aria-label={`Open ${project.title} actions`}
                    icon={MoreActions}
                    kind="tertiary"
                    onClick={(event: React.MouseEvent) => {
                      event.stopPropagation();
                      setContextMenuProjectId(project.id);
                    }}
                    size="small"
                  />
                </span>
              </Dialog>
            </div>
          ))}
          {contextProjects.length === 0 && (
            <p className="eflow-project-context__empty">No visible projects yet.</p>
          )}
        </div>
        {canAdd && (
          <div className="eflow-project-context__create">
            <Dialog
              aria-label="Create work plan"
              content={(
                <DialogContentContainer>
                  <Menu id="eflow-create-work-plan-menu">
                    <MenuItem
                      icon={AddNewDoc}
                      onClick={() => { setCreateMenuOpen(false); onCreateWorkPlan(); }}
                      title="New work plan"
                    />
                    <MenuItem
                      icon={PDF}
                      onClick={() => { setCreateMenuOpen(false); onImportProposal(); }}
                      title="Import proposal"
                    />
                    {canUseTemplates && <>
                      <MenuDivider />
                      <MenuItem
                        icon={BoardTemplate}
                        onClick={() => { setCreateMenuOpen(false); onOpenTemplates(); }}
                        title="Use template"
                      />
                    </>}
                  </Menu>
                </DialogContentContainer>
              )}
              hideTrigger={[]}
              onDialogDidHide={() => setCreateMenuOpen(false)}
              open={createMenuOpen}
              position="bottom-start"
              showTrigger={[]}
            >
              <span>
                <Button
                  aria-expanded={createMenuOpen}
                  aria-haspopup="menu"
                  className="eflow-project-context__add"
                  kind="primary"
                  leftIcon={Add}
                  onClick={() => setCreateMenuOpen(true)}
                  rightIcon={Dropdown}
                  size="small"
                >
                  Create work plan
                </Button>
              </span>
            </Dialog>
          </div>
        )}
      </div>

      <div className="eflow-project-context__planning">
        <h2>Planning</h2>
        <button className={planningView === "drafts" ? "eflow-project-context__planning-item--active" : ""} type="button" onClick={() => onOpenPlanning("drafts")}>
          <span>Work plans</span><strong>{planningCounts.workplans}</strong>
        </button>
        <button className={planningView === "signoff" ? "eflow-project-context__planning-item--active" : ""} type="button" onClick={() => onOpenPlanning("signoff")}>
          <span>Waiting for sign-off</span><strong>{planningCounts.signoff}</strong>
        </button>
        <button className={planningView === "incoming" ? "eflow-project-context__planning-item--active" : ""} type="button" onClick={() => onOpenPlanning("incoming")}>
          <span>Incoming reviews</span><strong>{planningCounts.incoming}</strong>
        </button>
      </div>

      <div className="eflow-project-context__members">
        <h2>Team Members</h2>
        {members.length ? members.map((member) => (
          <div className="eflow-project-context__member" key={member.id}>
            <span className="eflow-project-context__avatar" aria-hidden="true">
              {(member.full_name || member.fullName || member.email || "?").split(/\s+/).map((name: string) => name[0]).join("").slice(0, 2).toUpperCase()}
            </span>
            <span className="eflow-project-context__member-copy">
              <strong>{member.full_name || member.fullName || member.email}</strong>
            <small>{selectedProject && projectMembers.find((projectMember) => projectMember.userId === member.id)?.role || (contextProjects.some((project) => project.ownerId === member.id) ? "Project owner" : contextProjects.some((project) => (summaries.get(project.id)?.leadIds || []).includes(member.id)) ? "Delivery lead" : "Project contributor")}</small>
            </span>
          </div>
        )) : <p className="eflow-project-context__empty">Project members will appear here.</p>}
      </div>
    </aside>
  );
}
