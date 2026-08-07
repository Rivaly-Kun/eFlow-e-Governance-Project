import * as Carbon from "@carbon/icons-react";
import type { SidebarContent } from "../sidebarTypes";

export const teamleaderSidebar: Record<string, SidebarContent> = {
      command: {
        title: "Leader Command Center",
        sections: [
          {
            title: "Overview",
            items: [
              {
                icon: <Carbon.Home size={16} className="text-neutral-900" />,
                label: "Dashboard",
                isActive: true,
              },
              {
                icon: <Carbon.FolderOpen size={16} className="text-neutral-900" />,
                label: "Projects",
              },
              {
                icon: <Carbon.StarFilled size={16} className="text-neutral-900" />,
                label: "Pinned — You're Leading",
              },
              {
                icon: <Carbon.CheckmarkOutline size={16} className="text-neutral-900" />,
                label: "For Review",
              },
              {
                icon: <Carbon.ChartBar size={16} className="text-neutral-900" />,
                label: "Reports",
              },
              {
                icon: <Carbon.Notification size={16} className="text-neutral-900" />,
                label: "Announcements",
              },
            ],
          },
        ],
      },
      leader: {
        title: "Leader Workspace",
        sections: [
          {
            title: "Team Leadership",
            items: [
              {
                icon: <Carbon.StarFilled size={16} className="text-neutral-900" />,
                label: "Pinned — You're Leading",
                isActive: true,
              },
              {
                icon: <Carbon.CheckmarkOutline size={16} className="text-neutral-900" />,
                label: "For Review",
              },
              {
                icon: <Carbon.Group size={16} className="text-neutral-900" />,
                label: "Team Workload",
              },
            ],
          },
        ],
      },
      deptportfolio: {
        title: "Section Workspace",
        sections: [
          {
            title: "Core Workflows",
            items: [
              {
                icon: <Carbon.Folder size={16} className="text-neutral-900" />,
                label: "Task Board & Composer",
                isActive: true,
              },
              {
                icon: <Carbon.Group size={16} className="text-neutral-900" />,
                label: "Team Supervision",
              },
              {
                icon: <Carbon.Analytics size={16} className="text-neutral-900" />,
                label: "Team Intelligence",
              },
            ],
          },
        ],
      },
    };
