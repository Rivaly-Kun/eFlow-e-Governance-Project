import { Archive, ArchiveRestore, Building2, ChevronLeft, ScrollText, Trash2 } from "lucide-react";
import type { Organization } from "../../../../types";
import type { Project } from "../../services/types";
import { PriorityPill, ProjectStatusBadge } from "../../../../components/workflow/StatusBadges";
import { WButton } from "../../../../components/workflow/primitives";

export function ProjectHeader({ project, organizations, canArchive, canDelete, onBack, onArchive, onRestore, onDelete, onOpenSourceGovernance }: { project: Project; organizations: Organization[]; canArchive: boolean; canDelete: boolean; onBack: () => void; onArchive: () => void; onRestore: () => void; onDelete: () => void; onOpenSourceGovernance?: () => void }) {
  const organization = organizations.find((item) => item.id === project.orgId);
  const archived = project.status === "archived";
  return (
    <header className="space-y-4">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 hover:text-neutral-950"><ChevronLeft size={14} /> Back to projects</button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl">
          <div className="flex flex-wrap items-center gap-2"><ProjectStatusBadge status={project.status} /><PriorityPill priority={project.priority} />{organization ? <span className="inline-flex items-center gap-1 text-[10.5px] text-neutral-500"><Building2 size={11} /> {organization.name}</span> : null}</div>
          <h1 className="mt-2 text-[23px] font-semibold tracking-tight text-neutral-950">{project.title}</h1>
          <p className="mt-1 text-[11.5px] leading-relaxed text-neutral-500">{project.description || "No project description has been recorded."}</p>
        </div>
        <div className="flex items-center gap-2">{onOpenSourceGovernance ? <WButton icon={<ScrollText size={14} />} onClick={onOpenSourceGovernance}>Source &amp; governance</WButton> : null}{canArchive ? archived ? <WButton icon={<ArchiveRestore size={14} />} onClick={onRestore}>Restore</WButton> : <WButton icon={<Archive size={14} />} onClick={onArchive}>Archive</WButton> : null}{canDelete ? <WButton icon={<Trash2 size={14} />} variant="danger" onClick={onDelete}>Delete</WButton> : null}</div>
      </div>
      {archived ? <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-100 px-3 py-2 text-[10.5px] text-neutral-600"><Archive size={13} /> Archived projects are read-only; history and reports remain available.</div> : null}
    </header>
  );
}
