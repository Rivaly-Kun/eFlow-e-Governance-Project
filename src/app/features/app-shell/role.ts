/** Maps persisted application roles to the existing presentation panels. */
export function mapRoleToPanel(role: string): string {
  switch (role) {
    case "super_admin":
      return "superadmin";
    case "dept_head":
    case "department_head":
      return "depthead";
    case "team_leader":
    case "teamleader":
      return "employee";
    case "employee":
    default:
      return "employee";
  }
}
