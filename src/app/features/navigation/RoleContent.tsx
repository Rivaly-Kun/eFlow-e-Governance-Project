import { lazy, Suspense, type ReactNode } from "react";
import { Settings } from "@carbon/icons-react";
import { PageWalkthroughButton } from "../guided-tours";

const SettingsContent = lazy(() => import("../../components/Settings/SettingsContent").then((module) => ({ default: module.SettingsContent })));
const SuperAdminContent = lazy(() => import("../../components/SuperAdmin/SuperAdminContent").then((module) => ({ default: module.SuperAdminContent })));
const ExecutiveContent = lazy(() => import("../role-executive").then((module) => ({ default: module.ExecutiveContent })));
const LegislativeContent = lazy(() => import("../role-legislative").then((module) => ({ default: module.LegislativeContent })));
const HRMOContent = lazy(() => import("../role-hrmo").then((module) => ({ default: module.HRMOContent })));
const FinanceContent = lazy(() => import("../role-finance").then((module) => ({ default: module.FinanceContent })));
const DeptHeadContent = lazy(() => import("../role-department-head").then((module) => ({ default: module.DeptHeadContent })));
const TeamLeaderContent = lazy(() => import("../../components/TeamLeader/TeamLeaderContent").then((module) => ({ default: module.TeamLeaderContent })));
const EmployeeContent = lazy(() => import("../../components/Employee/EmployeeContent").then((module) => ({ default: module.EmployeeContent })));

interface RoleContentProps {
  role: string;
  activeSection: string;
  activePage?: string;
}

function PageFrame({ children, padded = true, dark = false }: { children: ReactNode; padded?: boolean; dark?: boolean }) {
  return (
    <div className={`h-full min-h-0 flex-1 overflow-hidden rounded-r-2xl ${dark ? "bg-neutral-50 dark:bg-slate-950" : "bg-neutral-50"}`}>
      <div className="flex h-11 shrink-0 items-center justify-end border-b border-neutral-200/80 bg-white/90 px-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
        <PageWalkthroughButton />
      </div>
      <div data-tour-page-content className={`h-[calc(100%-2.75rem)] overflow-y-auto ${padded ? "p-6" : ""}`}>{children}</div>
    </div>
  );
}

function RoleLoading() {
  return <div className="flex h-full items-center justify-center text-[12px] text-neutral-400">Loading workspace...</div>;
}

export function RoleContent({ role, activeSection, activePage }: RoleContentProps) {
  if (activeSection === "settings") {
    return <Suspense fallback={<RoleLoading />}><PageFrame padded={false} dark><SettingsContent activePage={activePage} /></PageFrame></Suspense>;
  }

  let content: ReactNode;
  switch (role) {
    case "superadmin":
      content = <PageFrame><SuperAdminContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "executive":
      content = <PageFrame><ExecutiveContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "legislative":
    case "councilor_pad":
      content = <PageFrame><LegislativeContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "hrmo":
      content = <PageFrame><HRMOContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "finance":
      content = <PageFrame><FinanceContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "depthead":
      content = <PageFrame><DeptHeadContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "teamleader":
      content = <PageFrame><TeamLeaderContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    case "employee":
      content = <PageFrame><EmployeeContent activeSection={activeSection} activePage={activePage} /></PageFrame>;
      break;
    default:
      content = (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl flex items-center justify-center">
          <div className="text-center text-neutral-400">
            <Settings size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">Content coming soon</p>
            <p className="text-[12px] mt-1">Role: {role}</p>
          </div>
        </div>
      );
  }
  return <Suspense fallback={<RoleLoading />}>{content}</Suspense>;
}
