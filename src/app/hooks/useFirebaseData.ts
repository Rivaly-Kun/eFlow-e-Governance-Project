// ─── Realtime Firebase Data Hooks ────────────────────────────────
// Wraps firebaseService subscriptions into clean React hooks.

import { useState, useEffect, useMemo } from "react";
import {
  subscribeToUsers,
  subscribeToDepartments,
  subscribeToProjects,
  subscribeToAllTasks,
  subscribeToRoles,
} from "../services/firebaseService";
import { subscribeToEmployees } from "../services/employeeService";
import {
  subscribeToEmployeeNotes,
  EmployeeNotesMap,
} from "../services/employeeNotesService";
import type { UserProfile, Department, Project, Task, RoleDefinition, DashboardMetrics } from "../types";
import type { Employee } from "../services/employeeService";

// ─── useUsers ────────────────────────────────────────────────────
export function useUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToUsers((data) => {
      setUsers(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { users, loading };
}

// ─── useDepartments ──────────────────────────────────────────────
export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToDepartments((data) => {
      setDepartments(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { departments, loading };
}

// ─── useProjects ─────────────────────────────────────────────────
export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToProjects((data) => {
      setProjects(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { projects, loading };
}

// ─── useTasks ────────────────────────────────────────────────────
export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllTasks((data) => {
      setTasks(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { tasks, loading };
}

// ─── useEmployees ────────────────────────────────────────────────
export function useEmployees() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToEmployees((data) => {
      setEmployees(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { employees, loading };
}

// ─── useEmployeeNotes ───────────────────────────────────────────
export function useEmployeeNotes() {
  const [notes, setNotes] = useState<EmployeeNotesMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToEmployeeNotes((data) => {
      setNotes(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { notes, loading };
}

// ─── useRoles ────────────────────────────────────────────────────
export function useRoles() {
  const [roles, setRoles] = useState<Record<string, RoleDefinition>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToRoles((data) => {
      setRoles(data);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { roles, loading };
}

// ─── useDashboardMetrics ─────────────────────────────────────────
// Combines all data sources into computed realtime metrics.
export function useDashboardMetrics() {
  const { users, loading: usersLoading } = useUsers();
  const { departments, loading: deptsLoading } = useDepartments();
  const { projects, loading: projsLoading } = useProjects();
  const { tasks, loading: tasksLoading } = useTasks();

  const loading = usersLoading || deptsLoading || projsLoading || tasksLoading;

  const metrics: DashboardMetrics = useMemo(() => {
    const activeUsers = users.filter((u) => u.status === "active");
    const activeDepts = departments.filter((d) => d.status === "active");
    const activeProjects = projects.filter((p) => p.status !== "completed" && p.status !== "Completed");
    const activeTasks = tasks.filter((t) => t.status !== "completed");
    const pendingTasks = tasks.filter((t) => t.status === "pending_assignment" || t.status === "todo");
    const completedTasks = tasks.filter((t) => t.status === "completed");
    const deptHeads = activeUsers.filter((u) => u.role === "department_head");
    const overloaded = activeUsers.filter((u) => u.workload >= 80);
    const totalWorkload = activeUsers.reduce((sum, u) => sum + u.workload, 0);
    const avgWorkload = activeUsers.length > 0 ? Math.round(totalWorkload / activeUsers.length) : 0;

    return {
      totalUsers: activeUsers.length,
      totalDepartments: activeDepts.length,
      activeProjects: activeProjects.length,
      activeTasks: activeTasks.length,
      pendingTasks: pendingTasks.length,
      completedTasks: completedTasks.length,
      departmentHeads: deptHeads.length,
      overloadedEmployees: overloaded.length,
      averageWorkload: avgWorkload,
    };
  }, [users, departments, projects, tasks]);

  return { metrics, users, departments, projects, tasks, loading };
}
