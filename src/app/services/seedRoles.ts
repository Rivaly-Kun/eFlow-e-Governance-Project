// ─── Default Roles & Permissions Seed ────────────────────────────
// Seeds /roles node on first run if it doesn't exist.

import { ref, get, set } from "firebase/database";
import { database } from "../../firebase";
import type { RoleDefinition } from "../types";

const DEFAULT_ROLES: Record<string, RoleDefinition> = {
  super_admin: {
    permissions: {
      manage_users: true,
      manage_departments: true,
      assign_roles: true,
      assign_tasks: true,
      manage_department: true,
      view_own_tasks: true,
    },
  },
  department_head: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: true,
      manage_department: true,
      view_own_tasks: true,
    },
  },
  employee: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: false,
      manage_department: false,
      view_own_tasks: true,
    },
  },
  executive: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: false,
      manage_department: false,
      view_own_tasks: true,
    },
  },
  legislative: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: false,
      manage_department: false,
      view_own_tasks: true,
    },
  },
  hrmo: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: false,
      manage_department: false,
      view_own_tasks: true,
    },
  },
  finance: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: false,
      manage_department: false,
      view_own_tasks: true,
    },
  },
  councilor_pad: {
    permissions: {
      manage_users: false,
      manage_departments: false,
      assign_roles: false,
      assign_tasks: false,
      manage_department: false,
      view_own_tasks: true,
    },
  },
};

let seedPromise: Promise<void> | null = null;

export async function seedRolesIfEmpty(): Promise<void> {
  if (seedPromise) return seedPromise;

  seedPromise = (async () => {
    const rolesRef = ref(database, "roles");
    const snap = await get(rolesRef);
    if (!snap.exists()) {
      await set(rolesRef, DEFAULT_ROLES);
      console.log("[eFlow] Seeded default roles/permissions to Firebase.");
      return;
    }

    const currentRoles = (snap.val() || {}) as Record<string, RoleDefinition>;
    const mergedRoles: Record<string, RoleDefinition> = { ...currentRoles };
    let hasMissingRoles = false;

    Object.entries(DEFAULT_ROLES).forEach(([key, value]) => {
      if (!mergedRoles[key]) {
        mergedRoles[key] = value;
        hasMissingRoles = true;
      }
    });

    if (hasMissingRoles) {
      await set(rolesRef, mergedRoles);
      console.log("[eFlow] Added missing default roles/permissions to Firebase.");
    }
  })().finally(() => {
    seedPromise = null;
  });

  return seedPromise;
}

export { DEFAULT_ROLES };
