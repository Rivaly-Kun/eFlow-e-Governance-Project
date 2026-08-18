import * as React from "react";
import * as Icons from "lucide-react";
import { ManualPlanBuilder, ProposalImport } from "../../proposal-import";
import { useDeptDirectoryEmployees } from "../../employees";
import { isTaskLead } from "../../tasks";
import { ProjectTemplatesModal } from "../../work-templates";
import { useProjectsData, useOrgs, useProfiles } from "../../../hooks/useSupabaseData";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import * as UI from "../../../components/workflow/primitives";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetail } from "./ProjectDetail";
import { ProposalPortfolio } from "./ProposalPortfolio";
import { resolveProjectWorkspaceAccess, type ProjectScope } from "./model";
import { buildProjectPortfolioSummary } from "../selectors/projectCommandSelectors";
import { buildProposalPortfolioGroups, organizationTypeLabel, projectMatchesProposalQuery } from "../selectors/proposalPortfolioSelectors";

export function ProjectsWorkspace({ scope, eyebrow, proposalGrouping = true, readOnly = false }: { scope: ProjectScope; eyebrow: string; proposalGrouping?: boolean; readOnly?: boolean }) {
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
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [importOpen, setImportOpen] = React.useState(false);
  const [manualPlanOpen, setManualPlanOpen] = React.useState(false);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("active");
  const [orgFilter, setOrgFilter] = React.useState("all");
  const [orgTypeFilter, setOrgTypeFilter] = React.useState("all");
  const [healthFilter, setHealthFilter] = React.useState("all");
  const [ownerFilter, setOwnerFilter] = React.useState("all");
  const [leadFilter, setLeadFilter] = React.useState("all");
  const [dateFilter, setDateFilter] = React.useState("all");
  const [view, setView] = React.useState<"grid" | "list">(() => window.localStorage.getItem("eflow-project-view") === "list" ? "list" : "grid");
  const access = resolveProjectWorkspaceAccess(readOnly, can);

  const inScope = React.useMemo(() => {
    if (scope.isSuperAdmin || !scope.enforceOrgScope) return dbProjects;
    if (scope.scopedOrgIds.length === 0) return [];
    return dbProjects.filter((project) => Boolean(project.orgId && scope.scopedOrgIds.includes(project.orgId)));
  }, [dbProjects, scope]);

  const summaries = React.useMemo(() => new Map(inScope.map((project) => [project.id, buildProjectPortfolioSummary(project, tasks)])), [inScope, tasks]);
  const filtered = React.useMemo(() => {
    let rows = inScope;
    if (statusFilter === "active") rows = rows.filter((p) => p.status !== "archived" && p.status !== "completed");
    else if (statusFilter === "archived") rows = rows.filter((p) => p.status === "archived");
    else if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (scope.isSuperAdmin && orgFilter !== "all") rows = rows.filter((p) => p.orgId === orgFilter);
    if (scope.isSuperAdmin && orgTypeFilter !== "all") {
      const matchingOrgIds = new Set(orgs.filter((org) => org.org_type === orgTypeFilter).map((org) => org.id));
      rows = rows.filter((project) => Boolean(project.orgId && matchingOrgIds.has(project.orgId)));
    }
    if (healthFilter === "empty") rows = rows.filter((project) => summaries.get(project.id)?.isEmpty);
    else if (healthFilter !== "all") rows = rows.filter((project) => summaries.get(project.id)?.health === healthFilter);
    if (ownerFilter !== "all") rows = rows.filter((project) => project.ownerId === ownerFilter);
    if (leadFilter !== "all") rows = rows.filter((project) => summaries.get(project.id)?.leadIds.includes(leadFilter));
    if (dateFilter !== "all") rows = rows.filter((project) => {
      const summary = summaries.get(project.id);
      if (dateFilter === "overdue") return summary?.health === "overdue";
      if (dateFilter === "unscheduled") return !summary?.nextDeadline;
      const deadline = summary?.nextDeadline ? new Date(summary.nextDeadline).getTime() : 0;
      return dateFilter === "next30" && deadline >= Date.now() && deadline <= Date.now() + 30 * 86_400_000;
    });
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((project) => projectMatchesProposalQuery(project, tasks, q));
    }
    return rows;
  }, [dateFilter, healthFilter, inScope, leadFilter, orgFilter, orgTypeFilter, orgs, ownerFilter, query, scope.isSuperAdmin, statusFilter, summaries, tasks]);

  const proposalGroups = React.useMemo(
    () => buildProposalPortfolioGroups(filtered, tasks),
    [filtered, tasks],
  );

  React.useEffect(() => { window.localStorage.setItem("eflow-project-view", view); }, [view]);

  const detail = detailId ? dbProjects.find((p) => p.id === detailId) : null;
  const loading = projectsLoading || tasksLoading;
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
  const canUseTemplates = canManageDepartmentTemplates || leadingTasks.length > 0;

  if (loading) return <div className="p-8"><UI.LoadingState label="Loading projects…" /></div>;

  if (detail) {
    return (
      <ProjectDetail
        project={detail}
        onBack={() => setDetailId(null)}
        onDeleted={() => setDetailId(null)}
        orgs={orgs}
        canManage={access.canManage}
        canArchive={access.canArchive}
        canDelete={access.canDelete}
        canReviewTasks={access.canReviewTasks}
        canExport={access.canExport}
      />
    );
  }

  const active = inScope.filter((p) => p.status !== "archived");
  const orgOptions = [{ value: "all", label: "All organizations" }, ...orgs.filter((org) => org.is_active).map((org) => ({ value: org.id, label: `${org.name} · ${organizationTypeLabel(org.org_type)}` }))];
  const ownerOptions = [{ value: "all", label: "All owners" }, ...profiles.filter((profile) => inScope.some((project) => project.ownerId === profile.id)).map((profile) => ({ value: profile.id, label: profile.full_name }))];
  const leadIds = Array.from(new Set(Array.from(summaries.values()).flatMap((summary) => summary.leadIds)));
  const leadOptions = [{ value: "all", label: "All Task Leads" }, ...profiles.filter((profile) => leadIds.includes(profile.id)).map((profile) => ({ value: profile.id, label: profile.full_name }))];

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <UI.PageHeader
        eyebrow={eyebrow}
        title={proposalGrouping ? "Proposals & Projects" : "Projects"}
        subtitle={readOnly
          ? "View organization proposals, programs, projects, delivery health, people, evidence, and reports without changing operational records."
          : access.canCreate
          ? proposalGrouping
            ? "Manage complete proposals, their programs, operational projects, milestones, and delivery work from one workspace."
            : "Create, track, and manage projects from one operational workspace."
          : "View the same operational projects, milestones, members, and tasks used by management."}
        actions={
          access.canCreate || (!readOnly && canUseTemplates) ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {access.canCreate && (
              <button
                onClick={() => setManualPlanOpen(true)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-white transition-colors hover:bg-neutral-800"
              >
                <Icons.Plus size={14} />
                Build work plan
              </button>
              )}
              {access.canCreate && (
              <button
                onClick={() => setImportOpen(true)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Icons.FileText size={14} className="text-neutral-400" />
                Import PDF with AI
              </button>
              )}
              {!readOnly && canUseTemplates && (
                <button
                  onClick={() => setTemplatesOpen(true)}
                  className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-violet-700 transition-colors hover:bg-violet-100"
                >
                  <Icons.LayoutTemplate size={14} />
                  Templates
                </button>
              )}
            </div>
          ) : undefined
        }
      />

      <div className={`grid grid-cols-2 gap-3 mb-4 ${proposalGrouping ? "lg:grid-cols-5" : "lg:grid-cols-4"}`}>
        {proposalGrouping && <UI.StatCard label="Visible proposals" value={proposalGroups.length} icon={<Icons.Files size={15} />} />}
        <UI.StatCard label="Active" value={active.filter((p) => p.status === "active").length} tone="info" icon={<Icons.FolderKanban size={15} />} />
        <UI.StatCard label="Planning" value={active.filter((p) => p.status === "planning").length} icon={<Icons.Flag size={15} />} />
        <UI.StatCard label="On hold" value={active.filter((p) => p.status === "on_hold").length} tone="warn" icon={<Icons.Target size={15} />} />
        <UI.StatCard label="Completed" value={inScope.filter((p) => p.status === "completed").length} tone="good" icon={<Icons.CheckCircle2 size={15} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <UI.SearchInput value={query} onChange={setQuery} placeholder={proposalGrouping ? "Search proposals, programs, or projects…" : "Search projects…"} className="w-[290px]" />
        <UI.WSelect
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "active", label: "Active" },
            { value: "planning", label: "Planning" },
            { value: "on_hold", label: "On hold" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
            { value: "all", label: "All statuses" },
          ]}
        />
        {scope.isSuperAdmin && <UI.WSelect value={orgTypeFilter} onChange={(value) => { setOrgTypeFilter(value); setOrgFilter("all"); }} options={[{ value: "all", label: "All organization types" }, { value: "department", label: "Departments" }, { value: "division", label: "Divisions" }, { value: "section", label: "Sections" }, { value: "unit", label: "Units" }, { value: "lgu", label: "LGU" }]} />}
        {scope.isSuperAdmin && <UI.WSelect value={orgFilter} onChange={setOrgFilter} options={orgOptions.filter((option) => option.value === "all" || orgTypeFilter === "all" || orgs.find((org) => org.id === option.value)?.org_type === orgTypeFilter)} />}
        <UI.WSelect value={healthFilter} onChange={setHealthFilter} options={[{ value: "all", label: "All health" }, { value: "empty", label: "Empty projects" }, { value: "on_track", label: "On track" }, { value: "due_soon", label: "Due soon" }, { value: "overdue", label: "Overdue" }, { value: "at_risk", label: "At risk" }, { value: "completed", label: "Completed" }]} />
        <UI.WSelect value={ownerFilter} onChange={setOwnerFilter} options={ownerOptions} />
        <UI.WSelect value={leadFilter} onChange={setLeadFilter} options={leadOptions} />
        <UI.WSelect value={dateFilter} onChange={setDateFilter} options={[{ value: "all", label: "Any deadline" }, { value: "next30", label: "Due in 30 days" }, { value: "overdue", label: "Past due" }, { value: "unscheduled", label: "Unscheduled" }]} />
        <div className="ml-auto flex rounded-lg border border-neutral-200 bg-white p-0.5"><button type="button" onClick={() => setView("grid")} className={`rounded-md p-1.5 ${view === "grid" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-50"}`} title="Grid view"><Icons.LayoutGrid size={13} /></button><button type="button" onClick={() => setView("list")} className={`rounded-md p-1.5 ${view === "list" ? "bg-neutral-900 text-white" : "text-neutral-400 hover:bg-neutral-50"}`} title="List view"><Icons.List size={13} /></button></div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <UI.SectionEmpty
            icon={<Icons.FolderKanban size={30} />}
            title={query ? "No matching projects" : "No projects yet"}
            description={query ? "Try a different search." : "Build a structured work plan or import a proposal to organize projects, milestones, and tasks."}
            action={
              access.canCreate && !query ? (
                <div className="flex items-center gap-2">
                  <UI.WButton icon={<Icons.Plus size={14} />} variant="primary" onClick={() => setManualPlanOpen(true)}>
                    Build work plan
                  </UI.WButton>
                  <UI.WButton icon={<Icons.FileText size={14} />} variant="secondary" onClick={() => setImportOpen(true)}>
                    Import PDF with AI
                  </UI.WButton>
                </div>
              ) : undefined
            }
          />
        </div>
      ) : proposalGrouping ? (
        <ProposalPortfolio
          groups={proposalGroups}
          tasks={tasks}
          orgs={orgs}
          profiles={profiles}
          view={view}
          onOpenProject={setDetailId}
        />
      ) : (
        <div className={view === "grid" ? "grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" : "space-y-2"}>
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} tasks={tasks} orgs={orgs} profiles={profiles} view={view} onOpen={() => setDetailId(p.id)} />
          ))}
        </div>
      )}

      {!readOnly && manualPlanOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-1 overflow-y-auto">
              <ManualPlanBuilder onClose={() => setManualPlanOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {!readOnly && importOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Close button in top right of modal */}
            <button
              onClick={() => setImportOpen(false)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition"
              aria-label="Close"
            >
              <Icons.X size={16} />
            </button>

            {/* Importer View */}
            <div className="flex-1 overflow-y-auto">
              <ProposalImport onClose={() => setImportOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {!readOnly && (
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
  );
}

// ─── Project card ────────────────────────────────────────────────
