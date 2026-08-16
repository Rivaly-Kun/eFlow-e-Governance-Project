import type { ReactNode } from "react";
import {
  Analytics,
  Calendar,
  ChartBar,
  CheckmarkOutline,
  Dashboard,
  FolderOpen,
  Notification,
  Report,
  StarFilled,
  Task,
  UserMultiple,
} from "@carbon/icons-react";

export interface CoreRoleNavItem {
  id: string;
  icon: ReactNode;
  label: string;
  page: string;
  group: string;
  requiresLeadership?: boolean;
}

export interface CoreRoleNavigation {
  defaultSection: string;
  navItems: CoreRoleNavItem[];
}

/**
 * The active Admin / Department Head / Employee workflow uses stable section
 * ids and one destination per sidebar row. Page labels remain presentation
 * text; they are no longer overloaded as the primary navigation structure.
 */
const CORE_WORKFLOW_NAVIGATION: Record<string, CoreRoleNavigation> = {
  depthead: {
    defaultSection: "dashboard",
    navItems: [
      {
        id: "dashboard",
        icon: <Dashboard size={16} />,
        label: "Overview",
        page: "Dashboard",
        group: "Department",
      },
      {
        id: "projects",
        icon: <FolderOpen size={16} />,
        label: "Projects",
        page: "Projects",
        group: "Department",
      },
      {
        id: "tasks",
        icon: <Task size={16} />,
        label: "Task Board",
        page: "Task Board",
        group: "Department",
      },
      {
        id: "leading",
        icon: <StarFilled size={16} />,
        label: "Work I'm Leading",
        page: "Leading Work",
        group: "Leadership",
        requiresLeadership: true,
      },
      {
        id: "subtasks",
        icon: <CheckmarkOutline size={16} />,
        label: "My Subtasks",
        page: "My Subtasks",
        group: "Department",
      },
      {
        id: "reviews",
        icon: <CheckmarkOutline size={16} />,
        label: "Reviews",
        page: "For Review",
        group: "Department",
      },
      {
        id: "team",
        icon: <UserMultiple size={16} />,
        label: "Team Supervision",
        page: "Team Supervision",
        group: "People",
      },
      {
        id: "intelligence",
        icon: <Analytics size={16} />,
        label: "Team Intelligence",
        page: "Team Intelligence",
        group: "People",
      },
      {
        id: "reports",
        icon: <ChartBar size={16} />,
        label: "Reports",
        page: "Reports",
        group: "Insights",
      },
      {
        id: "announcements",
        icon: <Notification size={16} />,
        label: "Announcements",
        page: "Announcements",
        group: "Communication",
      },
    ],
  },
  employee: {
    defaultSection: "tasks",
    navItems: [
      {
        id: "tasks",
        icon: <Task size={16} />,
        label: "My Tasks",
        page: "My Tasks",
        group: "My Work",
      },
      {
        id: "projects",
        icon: <FolderOpen size={16} />,
        label: "Projects",
        page: "Projects",
        group: "My Work",
      },
      {
        id: "leading",
        icon: <StarFilled size={16} />,
        label: "Work I'm Leading",
        page: "Leading Work",
        group: "Leadership",
        requiresLeadership: true,
      },
      {
        id: "subtasks",
        icon: <CheckmarkOutline size={16} />,
        label: "My Subtasks",
        page: "My Subtasks",
        group: "My Work",
      },
      {
        id: "reviews",
        icon: <CheckmarkOutline size={16} />,
        label: "Leader Reviews",
        page: "Leader Reviews",
        group: "Leadership",
        requiresLeadership: true,
      },
      {
        id: "deadlines",
        icon: <Calendar size={16} />,
        label: "Deadlines",
        page: "Deadlines",
        group: "My Work",
      },
      {
        id: "history",
        icon: <Report size={16} />,
        label: "Task History",
        page: "Task History",
        group: "My Work",
      },
      {
        id: "performance",
        icon: <Analytics size={16} />,
        label: "Performance",
        page: "Performance",
        group: "Insights",
      },
      {
        id: "reports",
        icon: <ChartBar size={16} />,
        label: "Work Report",
        page: "Work Report",
        group: "Insights",
      },
      {
        id: "announcements",
        icon: <Notification size={16} />,
        label: "Announcements",
        page: "Announcements",
        group: "Communication",
      },
    ],
  },
};

export function getCoreRoleNavigation(
  role: string,
): CoreRoleNavigation | undefined {
  return CORE_WORKFLOW_NAVIGATION[role];
}

export function getCoreSidebarContent(
  role: string,
  section: string,
):
  | {
      title: string;
      sections: {
        title: string;
        items: {
          icon: ReactNode;
          label: string;
          isActive: boolean;
        }[];
      }[];
    }
  | undefined {
  const config = getCoreRoleNavigation(role);
  const item = config?.navItems.find((entry) => entry.id === section);
  if (!item) return undefined;

  return {
    title: item.label,
    sections: [
      {
        title: item.group,
        items: [
          {
            icon: item.icon,
            label: item.page,
            isActive: true,
          },
        ],
      },
    ],
  };
}
