// ─── Workflow Template Service ───────────────────────────────────
// Dynamic status columns from Firebase — NOT hardcoded arrays.

import { ref, onValue, get, set, off } from "firebase/database";
import { database } from "../../firebase";

export interface WorkflowStatus {
  id: string;
  label: string;
  color: string;       // tailwind bg class
  textColor: string;   // tailwind text class
  order: number;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  statuses: WorkflowStatus[];
}

const WORKFLOW_PATH = "workflowTemplates";

// Default workflow — seeded once, then driven by Firebase
const DEFAULT_STATUSES: WorkflowStatus[] = [
  { id: "pending_assignment", label: "Pending Assignment", color: "bg-gray-200", textColor: "text-gray-800", order: 0 },
  { id: "todo", label: "To Do", color: "bg-blue-200", textColor: "text-blue-800", order: 1 },
  { id: "in_progress", label: "In Progress", color: "bg-yellow-200", textColor: "text-yellow-800", order: 2 },
  { id: "for_review", label: "For Review", color: "bg-purple-200", textColor: "text-purple-800", order: 3 },
  { id: "completed", label: "Completed", color: "bg-green-200", textColor: "text-green-800", order: 4 },
];

const DEFAULT_TEMPLATE: WorkflowTemplate = {
  id: "default",
  name: "Standard LGU Workflow",
  statuses: DEFAULT_STATUSES,
};

export async function seedWorkflowTemplateIfEmpty(): Promise<void> {
  const snap = await get(ref(database, `${WORKFLOW_PATH}/default`));
  if (!snap.exists()) {
    await set(ref(database, `${WORKFLOW_PATH}/default`), DEFAULT_TEMPLATE);
  }
}

export function subscribeToWorkflowTemplate(
  templateId: string,
  callback: (template: WorkflowTemplate) => void
) {
  const templateRef = ref(database, `${WORKFLOW_PATH}/${templateId}`);
  const handler = onValue(templateRef, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      const statuses = Array.isArray(val.statuses)
        ? val.statuses.filter(Boolean).sort((a: WorkflowStatus, b: WorkflowStatus) => a.order - b.order)
        : DEFAULT_STATUSES;
      callback({ id: val.id || templateId, name: val.name || "Workflow", statuses });
    } else {
      callback(DEFAULT_TEMPLATE);
    }
  });
  return () => off(templateRef, "value", handler);
}

export function getDefaultStatuses(): WorkflowStatus[] {
  return DEFAULT_STATUSES;
}
