import * as React from "react";
import { IconButton, Label } from "@vibe/core";
import { Collapse, Expand } from "@vibe/icons";
import type { Organization, UserProfile } from "../../../types";
import type { Task } from "../../tasks";
import type { ProposalPortfolioGroup } from "../selectors/proposalPortfolioSelectors";
import { organizationTypeLabel } from "../selectors/proposalPortfolioSelectors";
import { latestProjectTarget } from "../selectors/deadlines";
import { ProjectsPortfolioTable } from "./ProjectsPortfolioTable";

export function ProposalPortfolio({
  groups,
  tasks,
  orgs,
  profiles,
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
  const [collapsed, setCollapsed] = React.useState<Set<string>>(
    () => new Set(),
  );
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  return (
    <div>
      {groups.map((group) => {
        const isCollapsed = collapsed.has(group.id);
        const organization = orgs.find((org) => org.id === group.orgId);
        return (
          <section key={group.id} className="eflow-project-group">
            <header className="eflow-project-group-header">
              <IconButton
                aria-label={
                  isCollapsed
                    ? `Expand ${group.title}`
                    : `Collapse ${group.title}`
                }
                icon={isCollapsed ? Expand : Collapse}
                kind="tertiary"
                size="small"
                onClick={() => toggle(group.id)}
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Label text="Proposal" color="primary" />
                  <Label
                    text={
                      group.sourceType === "ai_pdf"
                        ? "Imported from document"
                        : group.sourceType === "manual"
                          ? "Custom work plan"
                          : "Standalone project"
                    }
                    color="dark"
                  />
                </div>
                <h2>{group.title}</h2>
                <small>
                  {organization
                    ? `${organization.name} · ${organizationTypeLabel(organization.org_type)}`
                    : "Organization unavailable"}{" "}
                  · {group.projectCount} projects · {group.taskCount} tasks ·{" "}
                  {group.progress}% complete
                </small>
              </div>
              <Label
                text={group.deadlineLabel}
                color={
                  group.deadlineTone === "overdue"
                    ? "negative"
                    : group.deadlineTone === "due_soon"
                      ? "working_orange"
                      : "positive"
                }
              />
            </header>
            {!isCollapsed && (
              <div>
                {group.programs.map((program) => (
                  <section
                    key={program.id}
                    aria-label={`Program ${program.title}`}
                  >
                    <div className="eflow-project-group-header">
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-secondary">Program</span>
                        <h3>{program.title}</h3>
                        <small>
                          {program.projects.length} projects · Target{" "}
                          {latestProjectTarget(program.projects) ||
                            "Unscheduled"}
                        </small>
                      </div>
                    </div>
                    <ProjectsPortfolioTable
                      projects={program.projects}
                      tasks={tasks}
                      organizations={orgs}
                      profiles={profiles}
                      onOpen={onOpenProject}
                      onOpenProposal={onOpenProposal}
                    />
                  </section>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
