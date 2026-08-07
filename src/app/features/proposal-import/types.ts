export interface ProposalDecompositionTask {
  title: string;
  description: string;
  estimatedDuration?: string;
  requiredSkills?: string[];
  priority?: "low" | "medium" | "high";
  recommendedEmployeeIds?: string[];
  recommendationReasoning?: string;
  burnoutWarning?: boolean;
  subtasks?: string[];
  recommendationSource?: "llm" | "fallback" | "import";
}

export interface ProposalDecompositionActivity {
  title: string;
  description: string;
  schedule?: string;
  methodology?: string[];
  tasks: ProposalDecompositionTask[];
}

export interface ProposalDecompositionProject {
  title: string;
  description: string;
  activities: ProposalDecompositionActivity[];
}

export interface ProposalDecompositionProgram {
  title: string;
  description: string;
  projects: ProposalDecompositionProject[];
}

export interface ProposalDecompositionResult {
  proposal?: { title: string; description: string };
  programs: ProposalDecompositionProgram[];
}
