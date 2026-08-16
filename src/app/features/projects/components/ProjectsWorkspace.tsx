import * as React from "react";
import * as Icons from "lucide-react";
import { ManualPlanBuilder, ProposalImport } from "../../proposal-import";
import { useDeptDirectoryEmployees } from "../../employees";
import { isTaskLead } from "../../tasks";
import { ProjectTemplatesModal } from "../../work-templates";
import { useProjectsData, useOrgs } from "../../../hooks/useSupabaseData";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import * as UI from "../../../components/workflow/primitives";
import { ProjectCard } from "./ProjectCard";
import { ProjectDetail } from "./ProjectDetail";
import type { ProjectScope } from "./model";

export function ProjectsWorkspace({ scope, eyebrow }: { scope: ProjectScope; eyebrow: string }) {
  const { projects: dbProjects, loading: projectsLoading } = useProjectsData();
  const { tasks, loading: tasksLoading } = useTasks();
  const { orgs } = useOrgs();
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

  const inScope = React.useMemo(() => {
    if (scope.isSuperAdmin || scope.scopedOrgIds.length === 0) return dbProjects;
    return dbProjects.filter((p) => !p.orgId || scope.scopedOrgIds.includes(p.orgId));
  }, [dbProjects, scope]);

  const filtered = React.useMemo(() => {
    let rows = inScope;
    if (statusFilter === "active") rows = rows.filter((p) => p.status !== "archived" && p.status !== "completed");
    else if (statusFilter === "archived") rows = rows.filter((p) => p.status === "archived");
    else if (statusFilter !== "all") rows = rows.filter((p) => p.status === statusFilter);
    if (scope.isSuperAdmin && orgFilter !== "all") rows = rows.filter((p) => p.orgId === orgFilter);
    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter((p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q));
    }
    return rows;
  }, [inScope, statusFilter, orgFilter, query, scope.isSuperAdmin]);

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
        canManage={can("projects.create")}
        canArchive={can("projects.archive")}
        canDelete={can("projects.delete")}
        canReviewTasks={can("tasks.verify")}
      />
    );
  }

  const active = inScope.filter((p) => p.status !== "archived");
  const orgOptions = [{ value: "all", label: "All departments" }, ...orgs.map((o) => ({ value: o.id, label: o.name }))];

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <UI.PageHeader
        eyebrow={eyebrow}
        title="Projects"
        subtitle={can("projects.create")
          ? "Create, track, and manage projects from one operational workspace."
          : "View the same operational projects, milestones, members, and tasks used by management."}
        actions={
          can("projects.create") || canUseTemplates ? (
            <div className="flex flex-wrap items-center justify-end gap-2">
              {can("projects.create") && (
              <button
                onClick={() => setManualPlanOpen(true)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-white transition-colors hover:bg-neutral-800"
              >
                <Icons.Plus size={14} />
                Build work plan
              </button>
              )}
              {can("projects.create") && (
              <button
                onClick={() => setImportOpen(true)}
                className="inline-flex h-[34px] items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 transition-colors hover:bg-neutral-50"
              >
                <Icons.FileText size={14} className="text-neutral-400" />
                Import PDF with AI
              </button>
              )}
              {canUseTemplates && (
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <UI.StatCard label="Active" value={active.filter((p) => p.status === "active").length} tone="info" icon={<Icons.FolderKanban size={15} />} />
        <UI.StatCard label="Planning" value={active.filter((p) => p.status === "planning").length} icon={<Icons.Flag size={15} />} />
        <UI.StatCard label="On hold" value={active.filter((p) => p.status === "on_hold").length} tone="warn" icon={<Icons.Target size={15} />} />
        <UI.StatCard label="Completed" value={inScope.filter((p) => p.status === "completed").length} tone="good" icon={<Icons.CheckCircle2 size={15} />} />
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <UI.SearchInput value={query} onChange={setQuery} placeholder="Search projects…" className="w-[260px]" />
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
        {scope.isSuperAdmin && <UI.WSelect value={orgFilter} onChange={setOrgFilter} options={orgOptions} />}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-xl">
          <UI.SectionEmpty
            icon={<Icons.FolderKanban size={30} />}
            title={query ? "No matching projects" : "No projects yet"}
            description={query ? "Try a different search." : "Build a structured work plan or import a proposal to organize projects, milestones, and tasks."}
            action={
              can("projects.create") && !query ? (
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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} orgs={orgs} onOpen={() => setDetailId(p.id)} />
          ))}
        </div>
      )}

      {manualPlanOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex-1 overflow-y-auto">
              <ManualPlanBuilder onClose={() => setManualPlanOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {importOpen && (
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

      <ProjectTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        orgId={userProfile?.departmentId || userProfile?.org_id || ""}
        currentUserId={currentUserId}
        canManageDepartment={canManageDepartmentTemplates}
        leadingTasks={leadingTasks}
        employees={deptEmployees}
      />
    </div>
  );
}

// ─── Project card ────────────────────────────────────────────────
