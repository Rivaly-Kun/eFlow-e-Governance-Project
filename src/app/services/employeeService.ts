import { ref, onValue, set, get } from "firebase/database";
import { database } from "../../firebase";
import { EMPLOYEE_SEED, getDepartmentLabel, SeedEmployee } from "./eflowSeedData";

export interface Employee {
  id: string;
  name: string;
  jobTitle: string;
  jobDescription: string;
  currentWorkload: number; // e.g., 0 to 100 representing burnout level
  department?: string;
  departmentName?: string;
  initials?: string;
  email?: string;
}

const EMPLOYEES_PATH = "employees";

const isLegacyDemoEmployeeSet = (data: unknown) => {
  if (!data || typeof data !== "object") return false;

  const entries = Object.entries(data as Record<string, unknown>);
  if (entries.length !== 3) return false;

  const expectedIds = new Set(["emp1", "emp2", "emp3"]);
  if (!entries.every(([key]) => expectedIds.has(key))) return false;

  const expectedNames = ["Alice", "Bob", "Charlie"];
  const names = entries
    .map(([, value]) => (value && typeof value === "object" && "name" in value ? String((value as { name?: unknown }).name ?? "") : ""))
    .join(" ");

  return expectedNames.every((fragment) => names.includes(fragment));
};

const toFirebaseEmployee = (employee: SeedEmployee) => ({
  id: employee.id,
  name: employee.name,
  initials: employee.initials,
  department: employee.department,
  departmentName: getDepartmentLabel(employee.department),
  role: employee.role,
  description: employee.description,
  workload: employee.workload,
  email: employee.email,
  jobTitle: employee.role,
  jobDescription: employee.description,
  currentWorkload: employee.workload,
});

const normalizeEmployeeRecord = (id: string, record: Record<string, unknown>): Employee => {
  const department = typeof record.department === "string" ? record.department : undefined;
  const departmentName = typeof record.departmentName === "string" ? record.departmentName : getDepartmentLabel(department);
  const jobTitle =
    typeof record.jobTitle === "string"
      ? record.jobTitle
      : typeof record.role === "string"
        ? record.role
        : departmentName || "Team Member";
  const jobDescription =
    typeof record.jobDescription === "string"
      ? record.jobDescription
      : typeof record.description === "string"
        ? record.description
        : "";
  const currentWorkload =
    typeof record.currentWorkload === "number"
      ? record.currentWorkload
      : typeof record.workload === "number"
        ? record.workload
        : typeof record.burnoutLevel === "string"
          ? record.burnoutLevel === "high"
            ? 85
            : record.burnoutLevel === "medium"
              ? 55
              : 25
          : 0;

  return {
    id,
    name: typeof record.name === "string" ? record.name : id,
    jobTitle,
    jobDescription,
    currentWorkload,
    department,
    departmentName,
    initials: typeof record.initials === "string" ? record.initials : undefined,
    email: typeof record.email === "string" ? record.email : undefined,
  };
};

let seedPromise: Promise<void> | null = null;

export const seedEmployeesIfEmpty = async () => {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const empRef = ref(database, EMPLOYEES_PATH);
    const snapshot = await get(empRef);
    const data = snapshot.val();

    if (!snapshot.exists() || isLegacyDemoEmployeeSet(data)) {
      const empData = Object.fromEntries(EMPLOYEE_SEED.map((employee) => [employee.id, toFirebaseEmployee(employee)]));
      await set(empRef, empData);
      console.log("Seeded live employee directory to Firebase.");
    }
  })().finally(() => {
    seedPromise = null;
  });

  return seedPromise;
};

export const subscribeToEmployees = (callback: (employees: Employee[]) => void) => {
  const empRef = ref(database, EMPLOYEES_PATH);
  return onValue(empRef, (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const list = Object.entries(data).map(([key, value]) => normalizeEmployeeRecord(key, value as Record<string, unknown>));
      callback(list);
    } else {
      callback([]);
    }
  });
};
