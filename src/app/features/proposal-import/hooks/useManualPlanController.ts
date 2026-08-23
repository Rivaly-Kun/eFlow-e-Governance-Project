import { useEffect, useMemo, useRef, useState } from "react";
import { useEmployeeNotes } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import { useOrgs } from "../../../hooks/useSupabaseData";
import { useToast } from "../../../components/ui/Toast";
import { useDeptDirectoryEmployees } from "../../employees";
import {
  buildCollaborationSnapshot,
  autosaveCollaborationDraft,
  createCollaborationDraft,
  getCollaborationCandidateEmployees,
  type CollaborationOrganizationSelection,
} from "../../interdepartment-collaboration";
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
import { createEmptyProposalBudget, type ProposalBudgetDraft } from "../../budget";
import {
  type ManualPlanValidationIssue,
  validateManualPlanDraft,
} from "../services/manualPlanValidation";

export function useManualPlanController(onClose?: () => void) {
  const {
    allEmployees: directoryEmployees,
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
  const { orgs } = useOrgs();
  const { toast } = useToast();
  const [planTitle, setPlanTitle] = useState("");
  const [planDescription, setPlanDescription] = useState("");
  const [proposalBudget, setProposalBudget] = useState<ProposalBudgetDraft>(() => createEmptyProposalBudget());
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");
  const [validationIssues, setValidationIssues] = useState<ManualPlanValidationIssue[]>([]);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [autoSaveState, setAutoSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const creatingDraft = useRef(false);
  const draftCreationPromise = useRef<Promise<{ id: string }> | null>(null);
  const lastSavedSnapshot = useRef("");
  const planningAnchor = useRef(Date.now());
  const [assignModalTaskKey, setAssignModalTaskKey] = useState<string | null>(null);
  const ownerOrgId = userProfile?.departmentId || userProfile?.org_id || "";
  const [collaborationOrganizations, setCollaborationOrganizations] = useState<CollaborationOrganizationSelection[]>(
    ownerOrgId ? [{ orgId: ownerOrgId, participationRole: "owner", staffingEnabled: true }] : [],
  );
  useEffect(() => {
    if (!ownerOrgId) return;
    setCollaborationOrganizations((current) => current.some((item) => item.participationRole === "owner")
      ? current
      : [{ orgId: ownerOrgId, participationRole: "owner", staffingEnabled: true }, ...current]);
  }, [ownerOrgId]);

  const allEmployees = useMemo(
    () => {
      if (!ownerOrgId) return [];
      return getCollaborationCandidateEmployees(directoryEmployees, collaborationOrganizations).filter(
        (employee) => profilesById.get(employee.id)?.role !== "super_admin",
      );
    },
    [collaborationOrganizations, directoryEmployees, ownerOrgId, profilesById],
  );

  const currentDraftTask = assignModalTaskKey
    ? draftTasks.find((task) => task.key === assignModalTaskKey) || null
    : null;

  useEffect(() => {
    if (!ownerOrgId || !planTitle.trim() || draftTasks.length === 0) return;
    const snapshot = buildCollaborationSnapshot({
      title: planTitle,
      description: planDescription,
      tasks: draftTasks,
      organizations: collaborationOrganizations,
      ownerOrgId,
      planningAnchor: planningAnchor.current,
      budget: proposalBudget,
    });
    const signature = JSON.stringify(snapshot);
    if (signature === lastSavedSnapshot.current) return;
    setAutoSaveState("saving");
    const timer = window.setTimeout(() => {
      if (draftId) {
        void autosaveCollaborationDraft(draftId, snapshot.title, snapshot)
          .then(() => { lastSavedSnapshot.current = signature; setAutoSaveState("saved"); setCommitMessage("Draft saved automatically."); })
          .catch(() => setAutoSaveState("error"));
        return;
      }
      if (creatingDraft.current) return;
      creatingDraft.current = true;
      const creation = createCollaborationDraft({ title: snapshot.title, ownerOrgId, sourceType: "manual", snapshot });
      draftCreationPromise.current = creation;
      void creation
        .then((draft) => { lastSavedSnapshot.current = signature; setDraftId(draft.id); setAutoSaveState("saved"); setCommitMessage("Draft saved automatically."); })
        .catch(() => setAutoSaveState("error"))
        .finally(() => { creatingDraft.current = false; draftCreationPromise.current = null; });
    }, 900);
    return () => window.clearTimeout(timer);
  }, [collaborationOrganizations, draftId, draftTasks, ownerOrgId, planDescription, planTitle, proposalBudget]);

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
    const issues = validateManualPlanDraft({ planTitle, planDescription, tasks: draftTasks });
    if (issues.length > 0) {
      setValidationIssues(issues);
      setCommitMessage("Complete the listed requirements before creating this work plan.");
      toast("This work plan is incomplete. Review the requirements below.", "error");
      return;
    }

    setValidationIssues([]);
    setCommitting(true);
    setCommitMessage("Saving persistent collaboration draft...");
    try {
      const snapshot = buildCollaborationSnapshot({
        title: planTitle,
        description: planDescription,
        tasks: draftTasks,
        organizations: collaborationOrganizations,
        ownerOrgId,
        planningAnchor: planningAnchor.current,
        budget: proposalBudget,
      });
      const persistentDraftId = draftId || (draftCreationPromise.current ? (await draftCreationPromise.current).id : null);
      if (persistentDraftId) await autosaveCollaborationDraft(persistentDraftId, snapshot.title, snapshot);
      else await createCollaborationDraft({ title: planTitle, ownerOrgId, sourceType: "manual", snapshot });
      setCommitMessage("Draft saved. No operational work was created.");
      toast("Manual plan saved as a collaboration draft.", "success");
      onClose?.();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save this work-plan draft.";
      setValidationIssues([{ id: "save", message }]);
      setCommitMessage(message);
      toast("The work-plan draft could not be saved.", "error");
    } finally {
      setCommitting(false);
    }
  };

  return {
    allEmployees,
    orgs,
    collaborationOrganizations,
    setCollaborationOrganizations,
    employeesLoading,
    employeeNotes,
    planTitle,
    planDescription,
    proposalBudget,
    draftTasks,
    committing,
    autoSaveState,
    commitMessage,
    validationIssues,
    assignModalTaskKey,
    currentDraftTask,
    setPlanDescription,
    setProposalBudget,
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
