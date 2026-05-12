// ─── Super Admin Content Router ──────────────────────────────────
// Thin router that delegates to real Firebase-connected modules.
// Replaces the old 4,580-line hardcoded mock file.

import React from "react";
import { DashboardOverview } from "./DashboardOverview";
import { UserManagement } from "./UserManagement";
import { DepartmentManagement } from "./DepartmentManagement";
import { MigrationTool } from "./MigrationTool";
import { Settings } from "@carbon/icons-react";

// ─── Settings Page (placeholder) ─────────────────────────────────
function SettingsPage() {
  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        Super Admin <span className="mx-1.5">/</span> <span className="text-neutral-700">Settings</span>
      </div>
      <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900 mb-6">
        System Settings
      </h2>
      <div className="bg-white rounded-xl border border-neutral-200 p-8 flex flex-col items-center justify-center text-neutral-400">
        <Settings size={40} className="mb-3 opacity-30" />
        <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">System settings coming soon</p>
        <p className="text-[12px] mt-1">Role permissions, audit logs, and platform configuration</p>
      </div>
    </div>
  );
}

// ─── Section → Page mapping ──────────────────────────────────────
const superAdminPages: Record<string, Record<string, React.ComponentType>> = {
  dashboard: {
    "Dashboard Overview": DashboardOverview,
  },
  users: {
    "All Users": UserManagement,
  },
  departments: {
    "All Departments": DepartmentManagement,
  },
  migration: {
    "Migration Tool": MigrationTool,
  },
  settings: {
    "System Settings": SettingsPage,
  },
};

// Default pages per section
export const defaultPages: Record<string, string> = {
  dashboard: "Dashboard Overview",
  users: "All Users",
  departments: "All Departments",
  migration: "Migration Tool",
  settings: "System Settings",
};

// ─── Sidebar content config (used by DetailSidebar) ──────────────
export const superAdminSidebarContent: Record<
  string,
  { title: string; sections: { title: string; items: { label: string }[] }[] }
> = {
  dashboard: {
    title: "Dashboard",
    sections: [{ title: "Overview", items: [{ label: "Dashboard Overview" }] }],
  },
  users: {
    title: "User Management",
    sections: [
      { title: "Management", items: [{ label: "All Users" }] },
    ],
  },
  departments: {
    title: "Departments",
    sections: [
      { title: "Management", items: [{ label: "All Departments" }] },
    ],
  },
  migration: {
    title: "Data Migration",
    sections: [{ title: "Tools", items: [{ label: "Migration Tool" }] }],
  },
  settings: {
    title: "Settings",
    sections: [{ title: "Configuration", items: [{ label: "System Settings" }] }],
  },
};

// ─── Main Router ─────────────────────────────────────────────────
export function SuperAdminContent({
  activeSection,
  activePage,
}: {
  activeSection: string;
  activePage?: string;
}) {
  const section = superAdminPages[activeSection];
  if (!section) {
    // Default to dashboard
    return <DashboardOverview />;
  }

  const pageName = activePage || defaultPages[activeSection] || Object.keys(section)[0];
  const PageComponent = section[pageName];
  if (!PageComponent) {
    // Fallback to first page in section
    const fallback = Object.values(section)[0];
    if (fallback) {
      const FallbackComp = fallback;
      return <FallbackComp />;
    }
    return <DashboardOverview />;
  }
  return <PageComponent />;
}

export { superAdminPages };
