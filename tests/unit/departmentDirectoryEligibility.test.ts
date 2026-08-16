import { describe, expect, it } from "vitest";
import type { Employee } from "../../src/app/services/employeeService";
import type { UserProfile } from "../../src/app/types";
import { isEligibleDepartmentDirectoryEmployee } from "../../src/app/features/employees/services/departmentDirectoryEligibility";

const employee = (overrides: Partial<Employee> = {}): Employee => ({
  id: "head-1",
  name: "Department Head",
  email: "head@example.gov.ph",
  jobTitle: "Head",
  jobDescription: "Department Head",
  currentWorkload: 0,
  department: "ledipo",
  ...overrides,
});

const profile = (overrides: Partial<UserProfile> = {}): Partial<UserProfile> => ({
  id: "head-1",
  email: "head@example.gov.ph",
  role: "dept_head",
  is_active: true,
  status: "active",
  ...overrides,
});

const assignmentOptions = {
  scopedOrgIds: new Set(["ledipo"]),
  currentUserId: "head-1",
  currentUserEmail: "head@example.gov.ph",
  headUserIds: new Set(["head-1"]),
  headUserEmails: new Set(["head@example.gov.ph"]),
  includeCurrentUser: true,
  includeDepartmentHeads: true,
  activeOnly: true,
  excludeSuperAdmins: true,
};

describe("department assignment eligibility", () => {
  it("allows the signed-in Department Head to lead work", () => {
    expect(
      isEligibleDepartmentDirectoryEmployee(employee(), profile(), assignmentOptions),
    ).toBe(true);
  });

  it("allows an active Assistant Head from the same department", () => {
    expect(
      isEligibleDepartmentDirectoryEmployee(
        employee({ id: "assistant-1", name: "Assistant Head", email: "assistant@example.gov.ph" }),
        profile({ id: "assistant-1", email: "assistant@example.gov.ph", role: "assistant_head" }),
        assignmentOptions,
      ),
    ).toBe(true);
  });

  it("rejects inactive, Super Admin, and outside-department candidates", () => {
    expect(
      isEligibleDepartmentDirectoryEmployee(employee(), profile({ is_active: false }), assignmentOptions),
    ).toBe(false);
    expect(
      isEligibleDepartmentDirectoryEmployee(employee(), profile({ role: "super_admin" }), assignmentOptions),
    ).toBe(false);
    expect(
      isEligibleDepartmentDirectoryEmployee(
        employee({ department: "ociib" }),
        profile({ org_id: "ociib" }),
        assignmentOptions,
      ),
    ).toBe(false);
  });
});
