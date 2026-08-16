import * as React from "react";
import * as Icons from "lucide-react";
import { ManualPlanBuilder, ProposalImport } from "../../proposal-import";
import { useProjectsData, useOrgs } from "../../../hooks/useSupabaseData";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import * as UI from "../../../components/workflow/primitives";
import { ProjectCard } from "./ProjectCard";
import { ProjectComposer } from "./ProjectComposer";
import { ProjectDetail } from "./ProjectDetail";
import type { ProjectScope } from "./model";

export function ProjectsWorkspace({ scope, eyebrow }: { scope: ProjectScope; eyebrow: string }) {
  const { projects: dbProjects, loading: projectsLoading } = useProjectsData();
  const { loading: tasksLoading } = useTasks();
  const { orgs } = useOrgs();
  const { can } = useAuth();
  const [detailId, setDetailId] = React.useState<string | null>(null);
  const [composerOpen, setComposerOpen] = React.useState(false);
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [importOpen, setImportOpen] = React.useState(false);
  const [manualPlanOpen, setManualPlanOpen] = React.useState(false);
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
          can("projects.create") ? (
            <div className="relative inline-flex items-center">
              {/* Primary action builds the same editable hierarchy as the AI importer, without AI. */}
              <button
                onClick={() => setManualPlanOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-l-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer border-r border-neutral-700 h-[34px]"
              >
                <Icons.Plus size={14} />
                Build work plan
              </button>

              {/* Dropdown Toggle */}
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="inline-flex items-center justify-center px-2 py-2 rounded-r-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer h-[34px]"
              >
                <Icons.ChevronDown size={14} />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <div className="absolute right-0 top-[38px] z-20 w-[230px] bg-white border border-neutral-200 rounded-lg shadow-lg py-1 mt-1 origin-top-right transition-all">
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setComposerOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-neutral-700 hover:bg-neutral-50 transition-colors text-left font-['Lexend:Regular',_sans-serif]"
                    >
                      <Icons.FolderPlus size={14} className="text-neutral-400" />
                      Quick project
                    </button>
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        setImportOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-neutral-700 hover:bg-neutral-50 transition-colors text-left font-['Lexend:Regular',_sans-serif]"
                    >
                      <Icons.FileText size={14} className="text-neutral-400" />
                      Import PDF with AI
                    </button>
                  </div>
                </>
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
            description={query ? "Try a different search." : "Build a work plan or create a quick project to organize milestones and tasks."}
            action={
              can("projects.create") && !query ? (
                <div className="flex items-center gap-2">
                  <UI.WButton icon={<Icons.Plus size={14} />} variant="primary" onClick={() => setManualPlanOpen(true)}>
                    Build work plan
                  </UI.WButton>
                  <UI.WButton icon={<Icons.FolderPlus size={14} />} variant="secondary" onClick={() => setComposerOpen(true)}>
                    Quick project
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

      {composerOpen && (
        <ProjectComposer scope={scope} orgs={orgs} onClose={() => setComposerOpen(false)} onCreated={(id) => { setComposerOpen(false); setDetailId(id); }} />
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
    </div>
  );
}

// ─── Project card ────────────────────────────────────────────────
