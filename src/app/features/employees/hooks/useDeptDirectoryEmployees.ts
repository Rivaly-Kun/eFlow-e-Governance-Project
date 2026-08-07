import { useMemo } from "react";
import type { Employee } from "../../../services/employeeService";
import { useEmployees, useUsers, useDepartments } from "../../../hooks/useFirebaseData";
import { useAuth } from "../../../contexts/AuthContext";
import { useOrgs } from "../../../hooks/useSupabaseData";
import { getDescendantOrgIds } from "../../../../lib/supabaseService";
export function useDeptDirectoryEmployees() {
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const { users, loading: usersLoading } = useUsers();
  const { departments } = useDepartments();
  const { userProfile } = useAuth();
  const { orgs } = useOrgs();

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((dept) => {
      if (dept.id) {
        map.set(dept.id, dept.name);
      }
    });
    return map;
  }, [departments]);

  const usersAsEmployees = useMemo<Employee[]>(() => {
    const initialsFor = (name: string) =>
      name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const titleForRole = (role?: string) =>
      role
        ? role
            .split("_")
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(" ")
        : "Employee";

    return users.map((user) => {
      const name = user.fullName || user.email || "Unnamed User";
      const departmentId = user.org_id || user.departmentId || "";
      const skills = (user as unknown as Record<string, unknown>).skills as Record<string, boolean> | undefined;
      const skillList = skills
        ? Object.keys(skills).filter((k) => skills[k]).join(", ")
        : "";
      return {
        id: user.uid,
        name,
        jobTitle: titleForRole(user.role),
        jobDescription: skillList || titleForRole(user.role),
        currentWorkload: typeof user.workload === "number" ? user.workload : 0,
        department: departmentId || undefined,
        departmentName: departmentId
          ? departmentNameById.get(departmentId) || departmentId
          : undefined,
        initials: initialsFor(name),
        email: user.email || undefined,
      };
    });
  }, [users, departmentNameById]);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.uid, user])),
    [users],
  );

  const userByEmail = useMemo(() => {
    const map = new Map<string, (typeof users)[number]>();
    users.forEach((user) => {
      if (user.email) {
        map.set(user.email.toLowerCase(), user);
      }
    });
    return map;
  }, [users]);

  const headUsers = useMemo(() => {
    const ids = new Set<string>();
    const emails = new Set<string>();
    departments.forEach((dept) => {
      if (!dept.headUserId) return;
      ids.add(dept.headUserId);
      const head = userById.get(dept.headUserId);
      if (head?.email) {
        emails.add(head.email.toLowerCase());
      }
    });
    return { ids, emails };
  }, [departments, userById]);

  const directoryEmployees = useMemo(() => {
    const merged = new Map<string, Employee>();
    const emails = new Set<string>();

    allEmployees.forEach((emp) => {
      merged.set(emp.id, emp);
      if (emp.email) {
        emails.add(emp.email.toLowerCase());
      }
    });

    usersAsEmployees.forEach((emp) => {
      const emailKey = emp.email?.toLowerCase();
      if (emailKey && emails.has(emailKey)) {
        return;
      }
      if (!merged.has(emp.id)) {
        merged.set(emp.id, emp);
      }
    });

    return Array.from(merged.values());
  }, [allEmployees, usersAsEmployees]);

  const scopedOrgIds = useMemo(() => {
    if (!userProfile?.departmentId) return new Set<string>();
    return new Set(getDescendantOrgIds(orgs, userProfile.departmentId));
  }, [orgs, userProfile?.departmentId]);

  const deptEmployees = useMemo(() => {
    if (!userProfile?.departmentId) return directoryEmployees;
    const currentEmail = userProfile.email?.toLowerCase();

    return directoryEmployees.filter((emp) => {
      if (!emp.department || !scopedOrgIds.has(emp.department)) return false;
      if (userProfile.uid && emp.id === userProfile.uid) return false;
      if (currentEmail && emp.email?.toLowerCase() === currentEmail) {
        return false;
      }

      const matchById = userById.get(emp.id);
      const matchByEmail = emp.email
        ? userByEmail.get(emp.email.toLowerCase())
        : undefined;
      const matchedUser = matchById || matchByEmail;

      if (matchedUser?.role === "department_head" || matchedUser?.role === "dept_head") return false;
      if (headUsers.ids.has(emp.id)) return false;
      if (emp.email && headUsers.emails.has(emp.email.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [
    directoryEmployees,
    headUsers,
    userByEmail,
    userById,
    userProfile?.departmentId,
    userProfile?.email,
    userProfile?.uid,
    scopedOrgIds,
  ]);

  const directoryLoading = employeesLoading || usersLoading;

  return {
    deptEmployees,
    allEmployees: directoryEmployees,
    directoryLoading,
    userProfile,
    profilesById: userById,
    profilesByEmail: userByEmail,
  };
}


