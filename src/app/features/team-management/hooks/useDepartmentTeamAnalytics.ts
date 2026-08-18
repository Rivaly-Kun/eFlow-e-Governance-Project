import { useEffect, useMemo, useState } from "react";
import { useTasks } from "../../../hooks/useFirebaseData";
import { useProjectsData, useScopedOrgIds } from "../../../hooks/useSupabaseData";
import { useDeptDirectoryEmployees } from "../../employees";
import { scopeProjects, scopeTasks } from "../../tasks";
import {
  buildTeamAttentionItems,
  buildTeamHealthSummary,
  buildTeamMemberMetrics,
} from "../selectors/teamAnalyticsSelectors";
import { subscribeToTeamWorkflowFacts } from "../services/teamWorkflowFactsService";
import type { TeamWorkflowFacts } from "../types";

const EMPTY_FACTS: TeamWorkflowFacts = {
  subtasks: [],
  progress: [],
  submissions: [],
  statusHistory: [],
  evidence: [],
};

export function useDepartmentTeamAnalytics() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { projects, loading: projectsLoading } = useProjectsData();
  const { scopedOrgIds } = useScopedOrgIds();
  const directory = useDeptDirectoryEmployees({
    includeDepartmentHeads: true,
    activeOnly: true,
    excludeSuperAdmins: true,
  });
  const scopedTasks = useMemo(() => scopeTasks(tasks, scopedOrgIds), [scopedOrgIds, tasks]);
  const scopedProjects = useMemo(() => scopeProjects(projects, scopedOrgIds), [projects, scopedOrgIds]);
  const taskKey = useMemo(() => scopedTasks.map((task) => task.id).sort().join(","), [scopedTasks]);
  const [facts, setFacts] = useState<TeamWorkflowFacts>(EMPTY_FACTS);
  const [factsLoading, setFactsLoading] = useState(true);
  const [factsError, setFactsError] = useState("");

  useEffect(() => {
    setFactsLoading(true);
    setFactsError("");
    return subscribeToTeamWorkflowFacts(
      taskKey ? taskKey.split(",") : [],
      (nextFacts) => {
        setFacts(nextFacts);
        setFactsLoading(false);
      },
      (message) => {
        setFactsError(message);
        setFactsLoading(false);
      },
    );
  }, [taskKey]);

  const memberMetrics = useMemo(
    () => buildTeamMemberMetrics(directory.deptEmployees, scopedTasks, facts),
    [directory.deptEmployees, facts, scopedTasks],
  );
  const attention = useMemo(
    () => buildTeamAttentionItems(scopedTasks, facts),
    [facts, scopedTasks],
  );
  const health = useMemo(
    () => buildTeamHealthSummary(scopedTasks, facts, attention),
    [attention, facts, scopedTasks],
  );

  return {
    ...directory,
    tasks: scopedTasks,
    projects: scopedProjects,
    facts,
    memberMetrics,
    attention,
    health,
    loading: tasksLoading || projectsLoading || directory.directoryLoading || factsLoading,
    error: factsError,
  };
}
