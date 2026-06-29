// ─── Super Admin Content Router ──────────────────────────────────
// Thin router that delegates to Supabase-connected modules.

import React from "react";
import { DashboardOverview } from "./DashboardOverview";
import { UserManagement } from "./UserManagement";
import { OrgTreeBuilder } from "./OrgTreeBuilder";
import { MigrationTool } from "./MigrationTool";
import { SystemSettings } from "./SystemSettings";

// ─── Section → Page mapping ──────────────────────────────────────
const superAdminPages: Record<string, Record<string, React.ComponentType>> = {
  dashboard: {
    "Dashboard Overview": DashboardOverview,
  },
  users: {
    "All Users": UserManagement,
  },
  org_tree: {
    "Org Structure": OrgTreeBuilder,
  },
  migration: {
    "Migration Tool": MigrationTool,
  },
  settings: {
    "System Settings": SystemSettings,
  },
};

// Default pages per section
export const defaultPages: Record<string, string> = {
  dashboard: "Dashboard Overview",
  users: "All Users",
  org_tree: "Org Structure",
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
  org_tree: {
    title: "Org Structure",
    sections: [
      { title: "Management", items: [{ label: "Org Structure" }] },
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
    return <DashboardOverview />;
  }

  const pageName = activePage || defaultPages[activeSection] || Object.keys(section)[0];
  const PageComponent = section[pageName];
  if (!PageComponent) {
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
