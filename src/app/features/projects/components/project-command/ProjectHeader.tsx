import * as React from "react";
import { Button, Dialog, DialogContentContainer, Menu, MenuDivider, MenuItem } from "@vibe/core";
import { Activity, Archive, Chart, Delete, File, MoreActions } from "@vibe/icons";
import type { Organization, UserProfile } from "../../../../types";
import type { Project } from "../../services/types";
import { ProjectLifecycleLabel, ProjectScheduleLabel } from "../../presentation/projectPresentation";
import type { ProjectCommandMetrics } from "./types";

export function ProjectHeader({
  project,
  organizations,
  profiles,
  metrics,
  canArchive,
  canDelete,
  onBack: _onBack,
  onArchive,
  onRestore,
  onDelete,
  onOpenProposalContext,
  onOpenTool,
}: {
  project: Project;
  organizations: Organization[];
  profiles?: UserProfile[];
  metrics?: ProjectCommandMetrics;
  canArchive: boolean;
  canDelete: boolean;
  onBack: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
  onOpenProposalContext?: () => void;
  onOpenTool?: (tool: "reviews" | "activity" | "reports") => void;
  hasProposalContext?: boolean;
}) {
  const organization = organizations.find((item) => item.id === project.orgId);
  const owner = profiles?.find((p) => p.id === project.ownerId);
  const archived = project.status === "archived";
  const [toolsOpen, setToolsOpen] = React.useState(false);

  const chooseTool = (tool: "reviews" | "activity" | "reports") => {
    setToolsOpen(false);
    onOpenTool?.(tool);
  };

  return (
    <header className="space-y-2.5 pb-2">
      {/* Project identity and utilities stay below the persistent workspace tabs. */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          {/* Status badges */}
          <div className="flex flex-wrap items-center gap-2">
            <ProjectLifecycleLabel status={project.status} />
            {metrics && <ProjectScheduleLabel health={metrics.scheduleHealth} />}
            {organization && (
              <span className="text-xs text-secondary font-medium">
                {organization.name}
              </span>
            )}
            {owner && (
              <>
                <span className="text-xs text-neutral-300">·</span>
                <span className="text-xs text-secondary font-medium">
                  {owner.full_name}
                </span>
              </>
            )}
          </div>

          {/* Project Title */}
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-900">
            {project.title}
          </h1>

          {/* Compact summary line in header — replaces persistent large strip */}
          {metrics && (
            <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-secondary">
              <strong className="font-semibold text-neutral-800">{metrics.progress}% complete</strong>
              <span>·</span>
              <span>{metrics.milestoneOpen + metrics.milestoneCompleted} activities</span>
              <span>·</span>
              <span>{metrics.taskTotal} tasks</span>
              {metrics.overdue > 0 && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-red-600">
                    {metrics.overdue} overdue
                  </span>
                </>
              )}
              {metrics.awaitingReview > 0 && (
                <>
                  <span>·</span>
                  <span className="font-semibold text-amber-600">
                    {metrics.awaitingReview} awaiting review
                  </span>
                </>
              )}
            </p>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {onOpenProposalContext && (
            <Button
              kind="secondary"
              size="small"
              leftIcon={File}
              onClick={onOpenProposalContext}
            >
              Proposal context
            </Button>
          )}
          <Dialog
            aria-label="Project tools"
            content={(
              <DialogContentContainer>
                <Menu id={`project-tools-menu-${project.id}`}>
                  <MenuItem title="Reviews" icon={Chart} onClick={() => chooseTool("reviews")} />
                  <MenuItem title="Activity" icon={Activity} onClick={() => chooseTool("activity")} />
                  <MenuItem title="Reports" icon={File} onClick={() => chooseTool("reports")} />
                  {(canArchive || canDelete) && <MenuDivider />}
                  {canArchive && (archived ? (
                    <MenuItem title="Restore project" icon={Archive} onClick={() => { setToolsOpen(false); onRestore(); }} />
                  ) : (
                    <MenuItem title="Archive project" icon={Archive} onClick={() => { setToolsOpen(false); onArchive(); }} />
                  ))}
                  {canDelete && <MenuItem title="Delete project" icon={Delete} onClick={() => { setToolsOpen(false); onDelete(); }} />}
                </Menu>
              </DialogContentContainer>
            )}
            hideTrigger={[]}
            onDialogDidHide={() => setToolsOpen(false)}
            open={toolsOpen}
            position="bottom-end"
            showTrigger={[]}
          >
            <span>
              <Button
                aria-expanded={toolsOpen}
                aria-haspopup="menu"
                kind="tertiary"
                leftIcon={MoreActions}
                onClick={() => setToolsOpen(true)}
                size="small"
              >
                Project tools
              </Button>
            </span>
          </Dialog>
        </div>
      </div>

      {archived && (
        <div
          role="status"
          className="rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-secondary"
        >
          Archived projects are read-only. History and reports remain available.
        </div>
      )}
    </header>
  );
}
