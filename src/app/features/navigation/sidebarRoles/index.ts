import type { SidebarContent } from "../sidebarTypes";
import { superadminSidebar } from "./superadminSidebar";
import { executiveSidebar } from "./executiveSidebar";
import { legislativeSidebar } from "./legislativeSidebar";
import { hrmoSidebar } from "./hrmoSidebar";
import { financeSidebar } from "./financeSidebar";
import { deptheadSidebar } from "./deptheadSidebar";
import { teamleaderSidebar } from "./teamleaderSidebar";
import { employeeSidebar } from "./employeeSidebar";
import { councilor_padSidebar } from "./councilor_padSidebar";

export { settingsContent } from "./settingsSidebar";

export const sidebarContentByRole: Record<string, Record<string, SidebarContent>> = {
  superadmin: superadminSidebar,
  executive: executiveSidebar,
  legislative: legislativeSidebar,
  hrmo: hrmoSidebar,
  finance: financeSidebar,
  depthead: deptheadSidebar,
  teamleader: teamleaderSidebar,
  employee: employeeSidebar,
  councilor_pad: councilor_padSidebar,
};
