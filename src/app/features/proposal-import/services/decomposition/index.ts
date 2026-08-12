import type { Employee } from "../../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
import type { AiQueueUpdate } from "../../../ai";
import type { ProposalDecompositionResult } from "../../types";
import { decomposeProposalByPart } from "./partDecomposition";
import { decomposeWholeDocument } from "./wholeDocumentDecomposition";

export type {
  ProposalDecompositionActivity,
  ProposalDecompositionProgram,
  ProposalDecompositionProject,
  ProposalDecompositionResult,
  ProposalDecompositionTask,
} from "../../types";

export async function decomposeProposal(
  proposalText: string,
  proposalTitle: string,
  employees?: Employee[],
  employeeNotes?: EmployeeNotesMap,
  onProgress?: (current: number, total: number, partTitle: string) => void,
  onQueueUpdate?: (update: AiQueueUpdate) => void,
): Promise<ProposalDecompositionResult> {
  if (/Part\s+\d+/i.test(proposalText)) {
    return decomposeProposalByPart(
      proposalText,
      proposalTitle,
      employees,
      employeeNotes,
      onProgress,
      onQueueUpdate,
    );
  }
  return decomposeWholeDocument(
    proposalText,
    proposalTitle,
    employees,
    employeeNotes,
    onQueueUpdate,
  );
}
