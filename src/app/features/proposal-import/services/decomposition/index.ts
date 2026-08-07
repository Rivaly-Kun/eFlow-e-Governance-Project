import type { Employee } from "../../../../services/employeeService";
import type { EmployeeNotesMap } from "../../../../services/employeeNotesService";
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
): Promise<ProposalDecompositionResult> {
  if (/Part\s+\d+/i.test(proposalText)) {
    try {
      return await decomposeProposalByPart(
        proposalText,
        proposalTitle,
        employees,
        employeeNotes,
        onProgress,
      );
    } catch (error) {
      console.warn("[Decomposition] Per-part path failed, falling back to whole-document:", error);
    }
  }
  return decomposeWholeDocument(proposalText, proposalTitle, employees, employeeNotes);
}
