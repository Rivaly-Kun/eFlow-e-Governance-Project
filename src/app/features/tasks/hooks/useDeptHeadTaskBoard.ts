import { useMemo } from "react";
import { useTasks, useEmployeeNotes } from "../../../hooks/useFirebaseData";
import { useOrgs } from "../../../hooks/useSupabaseData";
import { getDescendantOrgIds } from "../../../../lib/supabaseService";
import { useDeptDirectoryEmployees } from "../../employees";

/**
 * Keeps the Department Head board's legacy organization-scoping behavior in
 * the tasks feature. Pending-assignment work intentionally remains visible for
 * triage even when it has no organization ID.
 */
export function useDeptHeadTaskBoard() {
  const { tasks } = useTasks();
  const { deptEmployees, allEmployees, directoryLoading, userProfile } =
    useDeptDirectoryEmployees();
  const { notes, loading: notesLoading } = useEmployeeNotes();
  const { orgs } = useOrgs();

  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );
  const deptTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (task) =>
        !task.orgId ||
        scopedOrgIds.includes(task.orgId) ||
        task.status === "pending_assignment",
    );
  }, [tasks, scopedOrgIds]);

  return {
    allEmployees,
    deptEmployees,
    deptTasks,
    isLoading: directoryLoading || notesLoading,
    notes,
    userProfile,
  };
}
