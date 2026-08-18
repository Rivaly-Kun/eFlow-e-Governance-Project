import { getCoreSidebarContent } from "../../components/Layout/coreWorkflowNavigation";
import { getRoleNavigation } from "./roleNavigation";
import { settingsContent, sidebarContentByRole } from "./sidebarRoles";
import type { SidebarContent } from "./sidebarTypes";
import { isAdministrativeNavigationSection } from "./navigationPermissions";

export type { MenuItem, MenuSection, SidebarContent } from "./sidebarTypes";

export function getSidebarContent(role: string, section: string): SidebarContent {
  if (section === "settings") return settingsContent;

  const coreContent = getCoreSidebarContent(role, section);
  if (coreContent) return coreContent;

  const roleMap = sidebarContentByRole[role];
  if (roleMap?.[section]) return roleMap[section];

  if (role !== "superadmin" && isAdministrativeNavigationSection(section)) {
    const administrativeContent = sidebarContentByRole.superadmin?.[section];
    if (administrativeContent) return administrativeContent;
  }

  const config = getRoleNavigation(role);
  const navItem = config.navItems.find((item) => item.id === section);
  if (navItem) {
    return {
      title: navItem.label,
      sections: [{
        title: "Workspace",
        items: [{ label: navItem.label, isActive: true }],
      }],
    };
  }

  return { title: "Dashboard", sections: [] };
}
