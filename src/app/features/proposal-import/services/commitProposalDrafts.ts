import type { Employee } from '../../../services/employeeService';
import { createProject, fetchMilestones } from '../../../services/projectService';
import { createTask, type CreateTaskPayload } from '../../../services/taskService';
import { supabase } from '../../../../lib/supabase';
import { slugifyFragment, type DraftTask } from '../components/draftModel';

interface CommitProposalDraftsInput {
  toCreate: DraftTask[];
  pdfFileName: string;
  departmentFilter: string;
  currentUserId: string;
  employeeById: Record<string, Employee>;
}

export async function commitProposalDrafts({ toCreate, pdfFileName, departmentFilter, currentUserId, employeeById }: CommitProposalDraftsInput) {
  const batchPrefix =
      toCreate[0]?.proposalId ||
      `proposal-${slugifyFragment(pdfFileName.replace(/\.pdf$/i, ""), "imported")}`;
    const importBatchId = `${batchPrefix}-${Date.now()}`;
    let created = 0;
    let failed = 0;

    // Group by the imported hierarchy id, not title alone. Two programs may
    // legitimately contain projects with the same display title.
    const projectGroups = new Map<
      string,
      {
        projectTitle: string;
        proposalTitle: string;
        proposalId: string;
        programId: string;
        programTitle: string;
        projectId: string;
        activities: Map<string, { activityTitle: string; schedule: string; tasks: typeof toCreate }>;
      }
    >();

    toCreate.forEach((dt) => {
      const projKey =
        dt.projectId ||
        `${dt.proposalId}:${dt.programId}:${dt.projectTitle.trim()}`;
      if (!projectGroups.has(projKey)) {
        projectGroups.set(projKey, {
          projectTitle: dt.projectTitle,
          proposalTitle: dt.proposalTitle,
          proposalId: dt.proposalId,
          programId: dt.programId,
          programTitle: dt.programTitle,
          projectId: dt.projectId,
          activities: new Map(),
        });
      }
      const projGroup = projectGroups.get(projKey)!;

      const actKey = dt.activityTitle.trim();
      if (!projGroup.activities.has(actKey)) {
        projGroup.activities.set(actKey, {
          activityTitle: dt.activityTitle,
          schedule: dt.activitySchedule || "",
          tasks: [],
        });
      }
      projGroup.activities.get(actKey)!.tasks.push(dt);
    });

    try {
      for (const projGroup of projectGroups.values()) {
        const milestonesInput = Array.from(projGroup.activities.values()).map((act) => {
          const isDate = act.schedule && !/month|phase|week/i.test(act.schedule) && !isNaN(Date.parse(act.schedule));
          return {
            title: act.activityTitle.trim(),
            dueDate: isDate ? act.schedule : null,
            description: act.schedule && !isDate ? `Schedule: ${act.schedule}` : "",
          };
        });

        let dbProjectId = "";
        try {
          // Check for existing project to prevent duplicate imports
          let existingQuery = supabase
            .from("projects")
            .select("id")
            .eq("title", projGroup.projectTitle.trim())
            .is("archived_at", null);
          existingQuery = departmentFilter
            ? existingQuery.eq("org_id", departmentFilter)
            : existingQuery.is("org_id", null);
          const { data: existingProjs, error: existingError } =
            await existingQuery;
          if (existingError) throw existingError;

          if (existingProjs && existingProjs.length > 0) {
            dbProjectId = existingProjs[0].id;
          } else {
            const allMemberIds = new Set<string>();
            for (const act of projGroup.activities.values()) {
              for (const dt of act.tasks) {
                dt.assignedMemberIds.forEach((id) => {
                  if (id) allMemberIds.add(id);
                });
              }
            }

            const newProj = await createProject({
              title: projGroup.projectTitle.trim(),
              description: `Imported via proposal: ${projGroup.proposalTitle}`,
              orgId: departmentFilter || null,
              ownerId: currentUserId || null,
              status: "active",
              priority: "medium",
              milestones: milestonesInput,
              memberIds: Array.from(allMemberIds),
            });
            dbProjectId = newProj.id;
          }
        } catch (projErr) {
          console.error("Failed to create/resolve project:", projGroup.projectTitle, projErr);
          // `project_id` is a legacy hierarchy string, not the UUID foreign key
          // used by operational projects. Never write it into linked_project_id.
          failed += Array.from(projGroup.activities.values()).reduce(
            (sum, activity) => sum + activity.tasks.length,
            0,
          );
          continue;
        }

        // Fetch milestone mapping
        let milestoneMap = new Map<string, string>();
        try {
          const dbMilestones = await fetchMilestones(dbProjectId);
          milestoneMap = new Map(dbMilestones.map((m) => [m.title.toLowerCase().trim(), m.id]));
        } catch (mErr) {
          console.error("Failed to fetch milestones for project:", dbProjectId, mErr);
        }

        // Create tasks for each activity
        for (const act of projGroup.activities.values()) {
          const dbMilestoneId = milestoneMap.get(act.activityTitle.toLowerCase().trim()) || "";

          for (const dt of act.tasks) {
            try {
              const selectedTeamMembers = dt.assignedMemberIds
                .map((id) => employeeById[id])
                .filter((member): member is Employee => Boolean(member));
              const leadMember =
                (dt.leadMemberId ? employeeById[dt.leadMemberId] : undefined) ||
                selectedTeamMembers[0];

              const payload: CreateTaskPayload = {
                title: dt.title,
                description: dt.description || "No description provided.",
                deadline: dt.deadline || "",
                priority: dt.priority,
                tags: dt.requiredSkills,
                status: leadMember?.id ? "todo" : "pending_assignment",
                department: departmentFilter || "",
                orgId: departmentFilter || undefined,
                teamId: departmentFilter || "",
                teamName:
                  leadMember?.departmentName ||
                  leadMember?.department ||
                  departmentFilter ||
                  "Imported",
                teamMemberIds: selectedTeamMembers.map((member) => member.id),
                teamMemberNames: selectedTeamMembers.map((member) => member.name),
                assigneeId: leadMember?.id,
                assigneeName: leadMember?.name,
                recommendedEmployeeIds: dt.assignedMemberIds,
                recommendationReasoning: dt.reasoning,
                recommendationSource: "import",
                recommendationLeadId: dt.leadMemberId || undefined,
                burnoutWarning: dt.burnoutWarning,
                proposalId: dt.proposalId,
                proposalTitle: dt.proposalTitle,
                programId: dt.programId,
                programTitle: dt.programTitle,
                projectId: dt.projectId,
                projectTitle: dt.projectTitle,
                activityId: dt.activityId,
                activityTitle: dt.activityTitle,
                activitySchedule: dt.activitySchedule,
                linkedProjectId: dbProjectId,
                milestoneId: dbMilestoneId,
                hierarchyPath: [
                  dt.proposalTitle,
                  dt.programTitle,
                  dt.projectTitle,
                  dt.activityTitle,
                ]
                  .filter(Boolean)
                  .join(" > "),
                importBatchId,
              };

              await createTask(payload);
              created++;
            } catch (err) {
              console.error("Failed to commit task from draft:", dt.title, err);
              failed++;
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed during commit transaction:", err);
    }

  return { created, failed };
}
