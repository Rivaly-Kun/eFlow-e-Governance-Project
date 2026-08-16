import { useMemo, useRef, useState } from "react";
import { useEmployeeNotes } from "../../../hooks/useFirebaseData";
import { useOrgs } from "../../../hooks/useSupabaseData";
import { useAuth } from "../../../contexts/AuthContext";
import { useToast } from "../../../components/ui/Toast";
import type { Employee } from "../../../services/employeeService";
import { useDeptDirectoryEmployees } from "../../employees";
import { decomposeProposal, type ProposalDecompositionResult } from "../../../services/proposalDecompositionService";
import { extractTextFromPdf } from "../services/pdfTextExtractor";
import { commitProposalDrafts } from "../services/commitProposalDrafts";
import { filterEmployeesByPdfMentions } from "../selectors/employeeMentions";
import { buildHierarchyIds, type DraftTask, type PdfPhase } from "../components/draftModel";
import type { AiQueueUpdate } from "../../ai";

export function useProposalImportController(onClose?: () => void) {
  const { deptEmployees: scopedDepartmentEmployees } = useDeptDirectoryEmployees({
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

  // Proposal drafts can only assign employees directly in the requester's
  // department, never a child unit or unrelated office.
  const deptEmployees = userProfile?.departmentId
    ? scopedDepartmentEmployees
    : [];
  const allEmployees = deptEmployees;

  const deptEmployeesWithNotes = useMemo(
    () => deptEmployees.filter((emp) => Boolean(employeeNotes?.[emp.id])),
    [deptEmployees, employeeNotes],
  );

  const employeesForAi = useMemo(
    () =>
      deptEmployeesWithNotes.length > 0
        ? deptEmployeesWithNotes
        : deptEmployees,
    [deptEmployees, deptEmployeesWithNotes],
  );

  const employeeById = useMemo(
    () => {
      const candidates = allEmployees && allEmployees.length > 0 ? allEmployees : deptEmployees;
      return Object.fromEntries(candidates.map((e) => [e.id, e])) as Record<
        string,
        Employee
      >;
    },
    [deptEmployees, allEmployees],
  );

  const departmentFilter = userProfile?.departmentId || "";
  const currentUserId = userProfile?.uid || "";

  const pdfFileRef = useRef<HTMLInputElement>(null);
  const [pdfPhase, setPdfPhase] = useState<PdfPhase>("idle");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfError, setPdfError] = useState("");
  const [aiQueueStatus, setAiQueueStatus] = useState<AiQueueUpdate | null>(null);
  const [decompositionProgress, setDecompositionProgress] = useState<{
    current: number;
    total: number;
    partTitle: string;
  } | null>(null);
  const [draftTasks, setDraftTasks] = useState<DraftTask[]>([]);
  const [committing, setCommitting] = useState(false);
  const [commitMessage, setCommitMessage] = useState("");

  // Assignment modal for PDF drafts
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignModalTaskKey, setAssignModalTaskKey] = useState<string | null>(
    null,
  );
  const currentDraftTask = assignModalTaskKey
    ? draftTasks.find((t) => t.key === assignModalTaskKey) || null
    : null;

  const buildDraftTasks = (
    result: ProposalDecompositionResult,
    fallbackProposalTitle?: string,
  ): DraftTask[] => {
    const out: DraftTask[] = [];
    const proposalTitle =
      result.proposal?.title ||
      fallbackProposalTitle ||
      pdfFileName.replace(/\.pdf$/i, "") ||
      "Imported Proposal";
    result.programs.forEach((prog, pi) => {
      prog.projects.forEach((proj, pj) => {
        proj.activities.forEach((act, ai) => {
          const hierarchyIds = buildHierarchyIds(
            proposalTitle,
            prog.title,
            proj.title,
            act.title,
            pi,
            pj,
            ai,
          );
          act.tasks.forEach((t, ti) => {
            out.push({
              key: `${pi}-${pj}-${ai}-${ti}`,
              proposalTitle,
              proposalId: hierarchyIds.proposalId,
              programIdx: pi,
              projectIdx: pj,
              activityIdx: ai,
              taskIdx: ti,
              programId: hierarchyIds.programId,
              programTitle: prog.title,
              projectId: hierarchyIds.projectId,
              projectTitle: proj.title,
              activityId: hierarchyIds.activityId,
              activityTitle: act.title,
              activitySchedule: act.schedule || "",
              title: t.title,
              description: t.description,
              deadline: act.schedule || "",
              priority: t.priority || "medium",
              requiredSkills: t.requiredSkills || [],
              assignedMemberIds: t.recommendedEmployeeIds || [],
              leadMemberId: t.recommendedEmployeeIds?.[0] || null,
              burnoutWarning: t.burnoutWarning || false,
              reasoning: t.recommendationReasoning || "",
              enabled: true,
            });
          });
        });
      });
    });
    return out;
  };

  const handlePdfFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please upload a PDF file.");
      setPdfPhase("error");
      return;
    }
    setPdfFileName(file.name);
    setPdfError("");
    setAiQueueStatus(null);
    setDecompositionProgress(null);
    setDraftTasks([]);
    setCommitMessage("");
    setPdfPhase("extracting");

    let text: string;
    try {
      text = await extractTextFromPdf(file);
      if (!text.trim()) {
        setPdfError("Could not extract text from PDF. It may be image-based.");
        setPdfPhase("error");
        return;
      }
    } catch {
      setPdfError("Failed to read PDF file.");
      setPdfPhase("error");
      return;
    }

    setPdfPhase("decomposing");
    try {
      const candidates = allEmployees && allEmployees.length > 0
        ? filterEmployeesByPdfMentions(text, allEmployees, orgs)
        : employeesForAi;
      const result = await decomposeProposal(
        text,
        file.name.replace(/\.pdf$/i, ""),
        candidates,
        employeeNotes,
        (current, total, partTitle) =>
          setDecompositionProgress({ current, total, partTitle }),
        setAiQueueStatus,
      );
      setDraftTasks(buildDraftTasks(result, file.name.replace(/\.pdf$/i, "")));
      setPdfPhase("review");
      setAiQueueStatus(null);
    } catch (error) {
      setAiQueueStatus(null);
      setPdfError(
        error instanceof Error
          ? `AI decomposition failed: ${error.message}`
          : "AI decomposition failed. Please try again.",
      );
      setPdfPhase("error");
    }
  };

  const handleDraftUpdate = (key: string, patch: Partial<DraftTask>) =>
    setDraftTasks((prev) =>
      prev.map((task) => (task.key === key ? { ...task, ...patch } : task)),
    );

  const handleDraftDelete = (key: string) =>
    setDraftTasks((prev) => prev.filter((task) => task.key !== key));

  const handleDraftAdd = (
    programIdx: number,
    projectIdx: number,
    activityIdx: number,
  ) => {
    const sibling = draftTasks.find(
      (task) =>
        task.programIdx === programIdx &&
        task.projectIdx === projectIdx &&
        task.activityIdx === activityIdx,
    );
    const proposalTitle =
      sibling?.proposalTitle ||
      pdfFileName.replace(/\.pdf$/i, "") ||
      "Imported Proposal";
    const programTitle = sibling?.programTitle || "Program";
    const projectTitle = sibling?.projectTitle || "Project";
    const activityTitle = sibling?.activityTitle || "Activity";
    const hierarchyIds = buildHierarchyIds(
      proposalTitle,
      programTitle,
      projectTitle,
      activityTitle,
      programIdx,
      projectIdx,
      activityIdx,
    );
    const newKey = `${programIdx}-${projectIdx}-${activityIdx}-${Date.now()}`;

    setDraftTasks((prev) => [
      ...prev,
      {
        key: newKey,
        proposalTitle,
        proposalId: sibling?.proposalId || hierarchyIds.proposalId,
        programIdx,
        projectIdx,
        activityIdx,
        taskIdx: Date.now(),
        programId: sibling?.programId || hierarchyIds.programId,
        programTitle,
        projectId: sibling?.projectId || hierarchyIds.projectId,
        projectTitle,
        activityId: sibling?.activityId || hierarchyIds.activityId,
        activityTitle,
        activitySchedule: sibling?.activitySchedule || "",
        title: "New Task",
        description: "",
        deadline: "",
        priority: "medium",
        requiredSkills: [],
        assignedMemberIds: [],
        leadMemberId: null,
        burnoutWarning: false,
        reasoning: "",
        enabled: true,
      },
    ]);
  };

  const handleCommit = async () => {
    const toCreate = draftTasks.filter((task) => task.enabled);
    if (toCreate.length === 0) return;
    setCommitting(true);
    setCommitMessage("Committing projects and milestones...");

    const { created, failed } = await commitProposalDrafts({
      toCreate,
      pdfFileName,
      departmentFilter,
      currentUserId,
      employeeById,
    });

    setCommitting(false);
    if (created > 0) {
      toast("Successfully imported proposal. Created projects and tasks.", "success");
      onClose?.();
      return;
    }

    setCommitMessage(
      `Created ${created} task${created !== 1 ? "s" : ""}; ${failed} failed to save.`,
    );
  };

  return {
    allEmployees,
    employeeNotes,
    deptEmployees,
    pdfFileRef,
    pdfPhase,
    setPdfPhase,
    pdfFileName,
    setPdfFileName,
    pdfError,
    setPdfError,
    aiQueueStatus,
    decompositionProgress,
    draftTasks,
    setDraftTasks,
    committing,
    commitMessage,
    setCommitMessage,
    assignModalOpen,
    setAssignModalOpen,
    assignModalTaskKey,
    setAssignModalTaskKey,
    currentDraftTask,
    handlePdfFile,
    handleDraftUpdate,
    handleDraftDelete,
    handleDraftAdd,
    handleCommit,
  };
}
