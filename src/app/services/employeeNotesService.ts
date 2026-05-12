import { ref, onValue, update } from "firebase/database";
import { database } from "../../firebase";

export interface EmployeeNote {
  employeeId: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  tags: string[];
  updatedAt: number;
  updatedBy?: string;
}

export type EmployeeNotesMap = Record<string, EmployeeNote>;

const EMPLOYEE_NOTES_PATH = "employeeNotes";

const normalizeNote = (
  employeeId: string,
  record: Record<string, unknown>,
): EmployeeNote => ({
  employeeId,
  strengths: typeof record.strengths === "string" ? record.strengths : "",
  weaknesses: typeof record.weaknesses === "string" ? record.weaknesses : "",
  notes: typeof record.notes === "string" ? record.notes : "",
  tags: Array.isArray(record.tags)
    ? record.tags.filter((tag): tag is string => typeof tag === "string")
    : [],
  updatedAt: typeof record.updatedAt === "number" ? record.updatedAt : 0,
  updatedBy: typeof record.updatedBy === "string" ? record.updatedBy : undefined,
});

export const subscribeToEmployeeNotes = (
  callback: (notes: EmployeeNotesMap) => void,
) => {
  const notesRef = ref(database, EMPLOYEE_NOTES_PATH);
  return onValue(notesRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback({});
      return;
    }

    const data = snapshot.val();
    const entries = Object.entries(data as Record<string, unknown>);
    const map: EmployeeNotesMap = {};

    entries.forEach(([employeeId, value]) => {
      if (value && typeof value === "object") {
        map[employeeId] = normalizeNote(
          employeeId,
          value as Record<string, unknown>,
        );
      }
    });

    callback(map);
  });
};

export const updateEmployeeNotes = async (
  employeeId: string,
  partial: Partial<EmployeeNote>,
) => {
  const noteRef = ref(database, `${EMPLOYEE_NOTES_PATH}/${employeeId}`);
  const payload: Record<string, unknown> = {
    ...partial,
    updatedAt: Date.now(),
  };

  await update(noteRef, payload);
};
