import { useCallback, useEffect, useMemo, useState } from "react";
import type { Project, ProjectMember, Milestone } from "../services/types";
import type { Task } from "../../tasks";
import { buildTeamAttentionItems, subscribeToTeamWorkflowFacts, type TeamWorkflowFacts } from "../../team-management";
import { fetchProjectMembers } from "../services/projectMemberService";
import { subscribeToMilestones } from "../services/milestoneService";
import { buildProjectActivity, buildProjectCommandMetrics } from "../selectors/projectCommandSelectors";
import type { ProjectActivityItem, ProjectCommandData } from "../components/project-command/types";
import { fetchProjectAuditActivity } from "../services/projectActivityService";
import { getCurrentFiscalYear, getTaskScopedBudgetBundle, useDepartmentBudget } from "../../budget";

const EMPTY_FACTS: TeamWorkflowFacts = { subtasks: [], progress: [], submissions: [], statusHistory: [], evidence: [] };

export function useProjectCommandData(project: Project, tasks: Task[]): ProjectCommandData {
  const budget = useDepartmentBudget(project.orgId || tasks.find((task) => task.orgId)?.orgId || "", getCurrentFiscalYear());
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [facts, setFacts] = useState<TeamWorkflowFacts>(EMPTY_FACTS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [projectEvents, setProjectEvents] = useState<ProjectActivityItem[]>([]);
  const taskKey = useMemo(() => tasks.map((task) => task.id).sort().join(","), [tasks]);

  const refreshMembers = useCallback(async () => {
    setMembers(await fetchProjectMembers(project.id));
  }, [project.id]);

  useEffect(() => {
    setLoading(true);
    void refreshMembers();
    return subscribeToMilestones(project.id, (rows) => setMilestones(rows));
  }, [project.id, refreshMembers]);

  useEffect(() => {
    setLoading(true);
    setError("");
    return subscribeToTeamWorkflowFacts(
      taskKey ? taskKey.split(",") : [],
      (nextFacts) => { setFacts(nextFacts); setLoading(false); },
      (message) => { setError(message); setLoading(false); },
    );
  }, [taskKey]);

  useEffect(() => {
    const entityIds = [project.id, ...tasks.map((task) => task.id), ...milestones.map((milestone) => milestone.id)];
    void fetchProjectAuditActivity(entityIds).then(setProjectEvents);
  }, [milestones, project.id, project.updatedAt, taskKey]);

  const attention = useMemo(() => buildTeamAttentionItems(tasks, facts), [facts, tasks]);
  const metrics = useMemo(() => buildProjectCommandMetrics(project, tasks, milestones, facts, attention), [attention, facts, milestones, project, tasks]);
  const activity = useMemo(() => buildProjectActivity(facts, projectEvents), [facts, projectEvents]);
  const financial = useMemo(() => getTaskScopedBudgetBundle(budget, tasks.map((task) => task.id)), [budget, taskKey]);

  return {
    project, tasks, milestones, members, facts, attention, metrics, activity,
    financial, financialLoading: budget.loading, financialError: budget.error,
    loading, error, refreshMembers,
  };
}
