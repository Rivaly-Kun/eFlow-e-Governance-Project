import { useMemo, useState } from "react";
import { useEmployeeNotes } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import type { Employee } from "../../../services/employeeService";
import { useDeptDirectoryEmployees } from "../../employees";
import { commitProposalDrafts } from "../services/commitProposalDrafts";
import {
  addManualActivity,
  addManualProgram,
  addManualProject,
  addManualTask,
  renameManualPlan,
  renameManualProgram,
  renameManualProject,
  updateManualActivity,
} from "../services/manualPlanDraft";
import type { DraftTask } from "../components/draftModel";
import {
  type ManualPlanValidationIssue,
  validateManualPlanDraft,
} from "../services/manualPlanValidation";

export function useManualPlanController(onClose?: () => void) {
  const {
    deptEmployees: departmentEmployees,
    directoryLoading: employeesLoading,
    profilesById,
  } = useDeptDirectoryEmployees({
    scope: "exact",
    includeCurrentUser: true,
    includeDepartmentHeads: true,
    activeOnly: true,
    excludeSuperAdmins: true,
  });
  const { notes: employeeNotes } = useEmployeeNotes();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [validationIssues, setValidationIssues] = useState<ManualPlanValidationIssue[]>([]);
  const [assignModalTaskKey, setAssignModalTaskKey] = useState<string | null>(null);

  const allEmployees = useMemo(
    () => {
      if (!userProfile?.departmentId) return [];
      return departmentEmployees.filter(
        (employee) => profilesById.get(employee.id)?.role !== "super_admin",
      );
    },
    [departmentEmployees, profilesById, userProfile?.departmentId],
  );

  const employeeById = useMemo(
    () => Object.fromEntries(allEmployees.map((employee) => [employee.id, employee])) as Record<string, Employee>,
    [allEmployees],
  );
  const currentDraftTask = assignModalTaskKey
    ? draftTasks.find((task) => task.key === assignModalTaskKey) || null
    : null;

  const updatePlanTitle = (nextTitle: string) => {
    setPlanTitle(nextTitle);
    if (nextTitle.trim()) {
      setDraftTasks((tasks) => renameManualPlan(tasks, nextTitle.trim()));
    }
  };

  const handleAddProgram = () => {
    const normalizedTitle = planTitle.trim();
    if (!normalizedTitle) {
      toast("Name the plan before adding its first program.", "error");
      return;
    }
    setDraftTasks((tasks) => addManualProgram(tasks, normalizedTitle));
  };

  const handleAddProject = (programIdx: number) =>
    setDraftTasks((tasks) => addManualProject(tasks, programIdx));

  const handleAddActivity = (programIdx: number, projectIdx: number) =>
    setDraftTasks((tasks) => addManualActivity(tasks, programIdx, projectIdx));

  const handleAddTask = (programIdx: number, projectIdx: number, activityIdx: number) =>
    setDraftTasks((tasks) => addManualTask(tasks, programIdx, projectIdx, activityIdx));

  const handleCommit = async () => {
    const enabledTasks = draftTasks.filter((task) => task.enabled);
    const issues = validateManualPlanDraft({ planTitle, planDescription, tasks: draftTasks });
    if (issues.length > 0) {
      setValidationIssues(issues);
      setCommitMessage("Complete the listed requirements before creating this work plan.");
      toast("This work plan is incomplete. Review the requirements below.", "error");
      return;
    }

    setValidationIssues([]);
    setCommitting(true);
    setCommitMessage("Creating projects, milestones, and tasks...");
    const { created, failed, errors } = await commitProposalDrafts({
      toCreate: enabledTasks,
      pdfFileName: `${planTitle.trim()}.manual-plan`,
      departmentFilter: userProfile?.departmentId || "",
      currentUserId: userProfile?.uid || "",
      employeeById,
      planningSource: "manual",
      planningDescription: planDescription,
    });
    setCommitting(false);

    if (created > 0 && failed === 0) {
      toast(
        "Manual work plan created.",
        "success",
      );
      onClose?.();
      return;
    }

    const saveIssues = errors.map((message, index) => ({
      id: `save-${index}`,
      message,
    }));
    setValidationIssues(
      saveIssues.length > 0
        ? saveIssues
        : [{ id: "save-unknown", message: "The server did not return a reason for the failed save." }],
    );
    setCommitMessage(
      created > 0
        ? `Created ${created} task${created === 1 ? "" : "s"}; ${failed} task${failed === 1 ? "" : "s"} could not be saved.`
        : "The work plan could not be created. Review the save reasons below.",
    );
    toast(
      created > 0 ? "Some tasks were not created. Review the save reasons." : "The work plan could not be created. Review the save reasons.",
      "error",
    );
  };

  return {
    allEmployees,
    employeesLoading,
    employeeNotes,
    planTitle,
    planDescription,
    draftTasks,
    committing,
    commitMessage,
    validationIssues,
    assignModalTaskKey,
    currentDraftTask,
    setPlanDescription,
    setAssignModalTaskKey,
    updatePlanTitle,
    handleAddProgram,
    handleAddProject,
    handleAddActivity,
    handleAddTask,
    handleDraftUpdate: (key: string, patch: Partial<DraftTask>) =>
      setDraftTasks((tasks) => tasks.map((task) => task.key === key ? { ...task, ...patch } : task)),
    handleDraftDelete: (key: string) =>
      setDraftTasks((tasks) => tasks.filter((task) => task.key !== key)),
    handleRenameProgram: (programIdx: number, title: string) =>
      setDraftTasks((tasks) => renameManualProgram(tasks, programIdx, title)),
    handleRenameProject: (programIdx: number, projectIdx: number, title: string) =>
      setDraftTasks((tasks) => renameManualProject(tasks, programIdx, projectIdx, title)),
    handleUpdateActivity: (
      programIdx: number,
      projectIdx: number,
      activityIdx: number,
      title: string,
      schedule: string,
    ) => setDraftTasks((tasks) => updateManualActivity(tasks, programIdx, projectIdx, activityIdx, {
      activityTitle: title,
      activitySchedule: schedule,
    })),
    handleCommit,
  };
}
