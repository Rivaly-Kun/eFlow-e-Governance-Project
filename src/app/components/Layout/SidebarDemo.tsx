import { useState } from "react";
import svgPaths from "../../imports/svg-svkvdgwod6";
import {
  Search,
  Dashboard,
  Task,
  Folder,
  Calendar,
  UserMultiple,
  Analytics,
  DocumentAdd,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  OverflowMenuHorizontal,
  CheckmarkOutline,
  Time,
  InProgress,
  Pending,
  Archive,
  Flag,
  AddLarge,
  Filter,
  Renew,
  View,
  Report,
  Share,
  CloudUpload,
  Notification,
  Security,
  Integration,
  StarFilled,
  Group,
  Calendar as CalendarIcon,
  Home,
  ChartBar,
  FolderOpen,
  ChevronLeft,
  ChevronUp,
} from "@carbon/icons-react";

// Softer spring animation curve
const softSpringEasing = "cubic-bezier(0.25, 1.1, 0.4, 1)";

function InterfacesLogo1() {
  return (
    <div
      className="aspect-[24/24] basis-0 grow min-h-px min-w-px overflow-clip relative shrink-0"
      data-name="Interfaces Logo"
    >
      <div
        className="absolute aspect-[24/16] left-0 right-0 top-1/2 translate-y-[-50%]"
        data-name="Union"
      >
        <svg
          className="block size-full"
          fill="none"
          preserveAspectRatio="none"
          role="presentation"
          viewBox="0 0 24 16"
        >
          <g id="Union">
            <path d={svgPaths.p36880f80} fill="#171717" />
            <path d={svgPaths.p355df480} fill="#171717" />
            <path d={svgPaths.pfa0d600} fill="#171717" />
          </g>
        </svg>
      </div>
    </div>
  );
}

function Avatar() {
  return (
    <div
      className="bg-neutral-100 relative rounded-[999px] shrink-0 size-8"
      data-name="Avatar"
    >
      <div className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative size-8">
        <User size={16} className="text-neutral-900" />
      </div>
      <div
        aria-hidden="true"
        className="absolute border border-neutral-200 border-solid inset-0 pointer-events-none rounded-[999px]"
      />
    </div>
  );
}

function SearchContainer({ isCollapsed = false }: { isCollapsed?: boolean }) {
  const [searchValue, setSearchValue] = useState("");

  return (
    <div
      className={`relative shrink-0 transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
      data-name="Search Container"
    >
      <div
        className={`bg-white h-10 relative rounded-lg flex items-center transition-all duration-500 ${
          isCollapsed ? "w-10 min-w-10 justify-center" : "w-full"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <div
          className={`flex items-center justify-center shrink-0 transition-all duration-500 ${
            isCollapsed ? "p-1" : "px-1"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className="size-8 flex items-center justify-center">
            <Search size={16} className="text-neutral-900" />
          </div>
        </div>
        <div
          className={`flex-1 min-h-px min-w-px relative transition-opacity duration-500 overflow-hidden ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className="flex flex-col justify-center relative size-full">
            <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center pl-0 pr-2 py-1 relative w-full">
              <input
                type="text"
                placeholder="Search tasks, projects..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="w-full bg-transparent border-none outline-none font-['Lexend:Regular',_sans-serif] font-normal text-[14px] text-neutral-900 placeholder:text-neutral-500 leading-[20px]"
                tabIndex={isCollapsed ? -1 : 0}
              />
            </div>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="absolute border border-neutral-200 border-solid inset-0 pointer-events-none rounded-lg"
        />
      </div>
    </div>
  );
}

interface MenuItem {
  icon?: React.ReactNode;
  label: string;
  hasDropdown?: boolean;
  isActive?: boolean;
  children?: MenuItem[];
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

interface SidebarContent {
  title: string;
  sections: MenuSection[];
}

function MenuItemComponent({
  item,
  isExpanded,
  onToggle,
  onItemClick,
  isCollapsed,
  isActivePage,
}: {
  item: MenuItem;
  isExpanded?: boolean;
  onToggle?: () => void;
  onItemClick?: () => void;
  isCollapsed?: boolean;
  isActivePage?: boolean;
}) {
  const handleClick = () => {
    if (item.hasDropdown && onToggle) {
      onToggle();
    }
    if (onItemClick) {
      onItemClick();
    }
  };

  return (
    <div
      className={`relative shrink-0 transition-all duration-500 ${
        isCollapsed ? "w-full flex justify-center" : "w-full"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div
        className={`select-none rounded-lg cursor-pointer transition-all duration-500 flex items-center relative my-0.5 ${
          isActivePage
            ? "bg-neutral-100"
            : item.isActive
              ? "bg-neutral-50"
              : "hover:bg-neutral-50"
        } ${
          isCollapsed
            ? "w-10 min-w-10 h-10 justify-center p-4"
            : "w-full h-10 px-4 py-2"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
        onClick={handleClick}
        title={isCollapsed ? item.label : undefined}
      >
        <div className="flex items-center justify-center shrink-0">
          {item.icon}
        </div>
        <div
          className={`flex-1 min-h-px min-w-px relative transition-opacity duration-500 overflow-hidden ${
            isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-3"
          }`}
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className="flex flex-col justify-center relative size-full">
            <div className="font-['Lexend:Regular',_sans-serif] font-normal text-[14px] text-neutral-900 leading-[20px] truncate">
              {item.label}
            </div>
          </div>
        </div>
        {item.hasDropdown && (
          <div
            className={`flex items-center justify-center shrink-0 transition-opacity duration-500 ${
              isCollapsed ? "opacity-0 w-0" : "opacity-100 ml-2"
            }`}
            style={{
              transitionTimingFunction: softSpringEasing,
            }}
          >
            <ChevronDown
              size={16}
              className={`text-neutral-900 transition-transform duration-500`}
              style={{
                transitionTimingFunction: softSpringEasing,
                transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function SubMenuItem({
  item,
  onItemClick,
  isActive,
}: {
  item: MenuItem;
  onItemClick?: () => void;
  isActive?: boolean;
}) {
  return (
    <div className="select-none w-full pl-9 pr-1 py-[1px]">
      <div
        className={`h-10 w-full rounded-lg cursor-pointer transition-colors flex items-center px-3 py-1 ${
          isActive ? "bg-neutral-100" : "hover:bg-neutral-50"
        }`}
        onClick={onItemClick}
      >
        <div className="flex-1 min-w-0">
          <div
            className={`font-['Lexend:Regular',_sans-serif] font-normal text-[14px] leading-[18px] truncate ${
              isActive ? "text-neutral-900" : "text-neutral-700"
            }`}
          >
            {item.label}
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuSectionComponent({
  section,
  expandedItems,
  onToggleExpanded,
  isCollapsed,
  onItemClick,
  activePage,
}: {
  section: MenuSection;
  expandedItems: Set<string>;
  onToggleExpanded: (itemKey: string) => void;
  isCollapsed?: boolean;
  onItemClick?: (page: string) => void;
  activePage?: string;
}) {
  return (
    <div className="box-border content-stretch flex flex-col items-start justify-stretch p-0 relative shrink-0 w-full">
      <div
        className={`relative shrink-0 w-full transition-all duration-500 overflow-hidden ${
          isCollapsed ? "h-0 opacity-0" : "h-10 opacity-100"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <div className="flex flex-col justify-center relative size-full">
          <div className="box-border content-stretch flex flex-col h-10 items-start justify-center p-[16px] relative w-full">
            <div className="font-['Lexend:Regular',_sans-serif] font-normal leading-[0] relative shrink-0 text-[14px] text-left text-neutral-500 text-nowrap">
              <p className="block leading-[20px] whitespace-pre">
                {section.title}
              </p>
            </div>
          </div>
        </div>
      </div>
      {section.items.map((item, index) => {
        const itemKey = `${section.title}-${index}`;
        const isExpanded = expandedItems.has(itemKey);
        return (
          <div key={itemKey} className="w-full flex flex-col content-stretch">
            <MenuItemComponent
              item={item}
              isExpanded={isExpanded}
              onToggle={() => onToggleExpanded(itemKey)}
              onItemClick={() => {
                if (onItemClick) onItemClick(item.label);
              }}
              isCollapsed={isCollapsed}
              isActivePage={activePage === item.label}
            />
            {isExpanded && item.children && !isCollapsed && (
              <div className="flex flex-col gap-1 mb-2">
                {item.children.map((child, childIndex) => (
                  <SubMenuItem
                    key={`${itemKey}-${childIndex}`}
                    item={child}
                    onItemClick={() => {
                      if (onItemClick) onItemClick(child.label);
                    }}
                    isActive={activePage === child.label}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// === ROLE NAV CONFIGS ===

interface RoleNavItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

const roleNavConfigs: Record<
  string,
  { navItems: RoleNavItem[]; defaultSection: string }
> = {
  superadmin: {
    defaultSection: "scc",
    navItems: [
      {
        id: "scc",
        icon: <Dashboard size={16} />,
        label: "System Command Center",
      },
      { id: "ai", icon: <Analytics size={16} />, label: "AI Operations" },
      {
        id: "blockchain",
        icon: <Security size={16} />,
        label: "Blockchain & Cryptography",
      },
      { id: "iam", icon: <User size={16} />, label: "Identity & Access" },
      { id: "pm", icon: <Renew size={16} />, label: "Process Mining" },
    ],
  },
  executive: {
    defaultSection: "portfolio",
    navItems: [
      {
        id: "portfolio",
        icon: <Dashboard size={16} />,
        label: "Executive Portfolio",
      },
      { id: "transform", icon: <Home size={16} />, label: "Project Transform" },
      {
        id: "financial",
        icon: <ChartBar size={16} />,
        label: "Financial Oversight",
      },
      {
        id: "audit",
        icon: <Security size={16} />,
        label: "Immutable Audit Review",
      },
    ],
  },
  legislative: {
    defaultSection: "legdash",
    navItems: [
      {
        id: "legdash",
        icon: <Task size={16} />,
        label: "Legislative Dashboard",
      },
      {
        id: "session",
        icon: <DocumentAdd size={16} />,
        label: "Session Management",
      },
      {
        id: "committee",
        icon: <Group size={16} />,
        label: "Committee Affairs",
      },
    ],
  },
  hrmo: {
    defaultSection: "workforce",
    navItems: [
      {
        id: "workforce",
        icon: <Analytics size={16} />,
        label: "Workforce Analytics",
      },
      { id: "wellness", icon: <Flag size={16} />, label: "Employee Wellness" },
      {
        id: "compliance",
        icon: <CheckmarkOutline size={16} />,
        label: "Civil Service Compliance",
      },
    ],
  },
  finance: {
    defaultSection: "projfin",
    navItems: [
      {
        id: "projfin",
        icon: <Dashboard size={16} />,
        label: "Project Financials",
      },
      {
        id: "liquidation",
        icon: <Pending size={16} />,
        label: "Expense & Liquidation Audit",
      },
      {
        id: "crypto",
        icon: <Security size={16} />,
        label: "Cryptographic Accountability",
      },
    ],
  },
  depthead: {
    defaultSection: "deptportfolio",
    navItems: [
      {
        id: "deptportfolio",
        icon: <Folder size={16} />,
        label: "Project Portfolio",
      },
      { id: "command", icon: <Flag size={16} />, label: "Department Command" },
      {
        id: "intworkforce",
        icon: <UserMultiple size={16} />,
        label: "Intelligent Workforce",
      },
      {
        id: "budget",
        icon: <ChartBar size={16} />,
        label: "Financial Management",
      },
    ],
  },
  employee: {
    defaultSection: "workspace",
    navItems: [
      { id: "workspace", icon: <Task size={16} />, label: "My Workspace" },
      {
        id: "empfin",
        icon: <DocumentAdd size={16} />,
        label: "Project Financials",
      },
      {
        id: "achievement",
        icon: <Group size={16} />,
        label: "Collaborative Achievement",
      },
    ],
  },
  councilor_pad: {
    defaultSection: "councilor",
    navItems: [
      { id: "councilor", icon: <User size={16} />, label: "Councilor Panel" },
    ],
  },
};

// === SIDEBAR CONTENT PER ROLE + SECTION ===

import {
  SuperAdminContent as SuperAdminContentComponent,
  defaultPages as superAdminDefaults,
} from "../SuperAdmin/SuperAdminContent";
import { ExecutiveContent, executiveDefaultPages } from "../Executive/ExecutiveContent";
import { LegislativeContent } from "../Legislative/LegislativeContent";
import { HRMOContent } from "../HRMO/HRMOContent";
import { FinanceContent } from "../Finance/FinanceContent";
import { DeptHeadContent } from "../DeptHead/DeptHeadContent";
import { EmployeeContent } from "../Employee/EmployeeContent";
import { CouncilorPanel } from "../Legislative/CouncilorPanel";

function getSidebarContent(role: string, section: string): SidebarContent {
  const settingsContent: SidebarContent = {
    title: "Settings",
    sections: [
      {
        title: "Account",
        items: [
          {
            icon: <User size={16} className="text-neutral-900" />,
            label: "Profile settings",
          },
          {
            icon: <Security size={16} className="text-neutral-900" />,
            label: "Security",
          },
          {
            icon: <Notification size={16} className="text-neutral-900" />,
            label: "Notifications",
          },
        ],
      },
      {
        title: "Workspace",
        items: [
          {
            icon: <Settings size={16} className="text-neutral-900" />,
            label: "Preferences",
            hasDropdown: true,
            children: [
              { label: "Theme settings" },
              { label: "Time zone" },
              { label: "Default notifications" },
            ],
          },
          {
            icon: <Integration size={16} className="text-neutral-900" />,
            label: "Integrations",
          },
        ],
      },
    ],
  };
  if (section === "settings") return settingsContent;

  const map: Record<string, Record<string, SidebarContent>> = {
    superadmin: {
      scc: {
        title: "System Command Center",
        sections: [
          {
            title: "Monitoring",
            items: [
              {
                icon: <View size={16} className="text-neutral-900" />,
                label: "Infrastructure Health",
                isActive: true,
              },
              {
                icon: <Dashboard size={16} className="text-neutral-900" />,
                label: "Global Error Logs",
                hasDropdown: true,
                children: [
                  { label: "Filter by Department" },
                  { label: "Filter by Severity" },
                  { label: "Filter by Time" },
                ],
              },
            ],
          },
        ],
      },
      ai: {
        title: "AI Operations",
        sections: [
          {
            title: "Algorithms",
            items: [
              {
                icon: <Analytics size={16} className="text-neutral-900" />,
                label: "Genetic Algorithm Tuning",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Fitness Function Variables" },
                  { label: "Workload Weighting" },
                  { label: "Competency Mapping" },
                  { label: "Local Optima Prevention" },
                ],
              },
              {
                icon: <ChartBar size={16} className="text-neutral-900" />,
                label: "Predictive Analytics Engine",
                hasDropdown: true,
                children: [
                  { label: "Burnout Classifiers" },
                  { label: "Project Forecasting" },
                  { label: "Confidence Intervals" },
                  { label: "Feature Importance" },
                ],
              },
              {
                icon: <Report size={16} className="text-neutral-900" />,
                label: "NLP Engine Diagnostics",
                hasDropdown: true,
                children: [
                  { label: "Stand-Up Ingestion" },
                  { label: "Voice-to-Text Pipeline" },
                  { label: "Viber Chatbot Health" },
                ],
              },
            ],
          },
        ],
      },
      blockchain: {
        title: "Blockchain & Cryptography",
        sections: [
          {
            title: "Ledger & Contracts",
            items: [
              {
                icon: <Security size={16} className="text-neutral-900" />,
                label: "Ledger Diagnostics",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Consensus Health" },
                  { label: "Block Confirmation Times" },
                  { label: "Node Synchronization" },
                ],
              },
              {
                icon: <DocumentAdd size={16} className="text-neutral-900" />,
                label: "Smart Contract Management",
                hasDropdown: true,
                children: [
                  { label: "Budget Allocation Logic" },
                  { label: "Automated Fund Returns" },
                  { label: "Audit Parameters" },
                ],
              },
            ],
          },
        ],
      },
      iam: {
        title: "Identity & Access",
        sections: [
          {
            title: "Access Control",
            items: [
              {
                icon: <User size={16} className="text-neutral-900" />,
                label: "Global RBAC Configuration",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Role Assignment" },
                  { label: "HRMO Integration" },
                  { label: "Offboarding Automation" },
                ],
              },
              {
                icon: <Group size={16} className="text-neutral-900" />,
                label: "Tenant Isolation Controls",
                hasDropdown: true,
                children: [
                  { label: "Data Partitioning" },
                  { label: "Privacy Compliance" },
                  { label: "Cross-Dept Isolation" },
                ],
              },
            ],
          },
        ],
      },
      pm: {
        title: "Process Mining",
        sections: [
          {
            title: "Mining & Compliance",
            items: [
              {
                icon: <Renew size={16} className="text-neutral-900" />,
                label: "Discovery Visualizations",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Heuristic Graphs" },
                  { label: "Execution Paths" },
                  { label: "Event Log Analysis" },
                ],
              },
              {
                icon: <Flag size={16} className="text-neutral-900" />,
                label: "Global Compliance Alerts",
                hasDropdown: true,
                children: [
                  { label: "Procedure Deviations" },
                  { label: "Circumvention Flags" },
                  { label: "Audit Feed" },
                ],
              },
            ],
          },
        ],
      },
    },
    executive: {
      portfolio: {
        title: "Executive Portfolio",
        sections: [
          {
            title: "Overview",
            items: [
              {
                icon: <Dashboard size={16} className="text-neutral-900" />,
                label: "City Project Pulse",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Portfolio Completion Rates" },
                  { label: "Budget Burn-Down" },
                  { label: "Critical Bottlenecks" },
                ],
              },
              {
                icon: <StarFilled size={16} className="text-neutral-900" />,
                label: "Strategic AI Insights",
                hasDropdown: true,
                children: [
                  { label: "Predictive Insight Cards" },
                  { label: "Procurement Delay Alerts" },
                  { label: "Actionable Intelligence" },
                ],
              },
            ],
          },
        ],
      },
      transform: {
        title: "Project Transform",
        sections: [
          {
            title: "Initiatives",
            items: [
              {
                icon: <Home size={16} className="text-neutral-900" />,
                label: "Sustainable Tourism & Eco-Resorts",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Infrastructure (₱450M)" },
                  { label: "Environmental Protection (₱170M)" },
                  { label: "Revenue Projections" },
                ],
              },
              {
                icon: <Renew size={16} className="text-neutral-900" />,
                label: "Marine Litter & Circular Economy",
                hasDropdown: true,
                children: [
                  { label: "#SHInEOrmoc Initiative" },
                  { label: "Plastic Regulation Compliance" },
                  { label: "Trash Trap Interception Rates" },
                ],
              },
            ],
          },
        ],
      },
      financial: {
        title: "Financial Oversight",
        sections: [
          {
            title: "Budget Monitoring",
            items: [
              {
                icon: <ChartBar size={16} className="text-neutral-900" />,
                label: "Master Budget Execution",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Expenditure vs Approved" },
                  { label: "Overspending Risk" },
                  { label: "Underutilization Alerts" },
                ],
              },
              {
                icon: <Security size={16} className="text-neutral-900" />,
                label: "Unliquidated Cash Advances",
                hasDropdown: true,
                children: [
                  { label: "Outstanding Funds" },
                  { label: "Leader Tracking" },
                  { label: "Stalled Funds Alert" },
                ],
              },
            ],
          },
        ],
      },
      audit: {
        title: "Immutable Audit Review",
        sections: [
          {
            title: "Cryptographic Records",
            items: [
              {
                icon: <DocumentAdd size={16} className="text-neutral-900" />,
                label: "Cryptographic Ledger",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Financial Disbursements" },
                  { label: "Project Liquidations" },
                  { label: "Returned Funds" },
                ],
              },
            ],
          },
        ],
      },
    },
    legislative: {
      legdash: {
        title: "Legislative Dashboard",
        sections: [
          {
            title: "Measures",
            items: [
              {
                icon: <Task size={16} className="text-neutral-900" />,
                label: "Active Measures Pipeline",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "First Reading" },
                  { label: "Committee Level" },
                  { label: "Second Reading" },
                  { label: "Third Reading" },
                  { label: "Mayoral Approval" },
                ],
              },
              {
                icon: <Archive size={16} className="text-neutral-900" />,
                label: "Adopted Ordinances Archive",
                hasDropdown: true,
                children: [
                  { label: "Semantic Search" },
                  { label: "Full Index" },
                ],
              },
            ],
          },
        ],
      },
      session: {
        title: "Session Management",
        sections: [
          {
            title: "Sessions",
            items: [
              {
                icon: <DocumentAdd size={16} className="text-neutral-900" />,
                label: "Order of Business",
                isActive: true,
              },
              {
                icon: <Report size={16} className="text-neutral-900" />,
                label: "Minutes & Transcripts",
                hasDropdown: true,
                children: [
                  { label: "NLP Transcription" },
                  { label: "Session Summaries" },
                  { label: "Archived Minutes" },
                ],
              },
            ],
          },
        ],
      },
      committee: {
        title: "Committee Affairs",
        sections: [
          {
            title: "Committees",
            items: [
              {
                icon: <Analytics size={16} className="text-neutral-900" />,
                label: "Appropriations & Finance",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Proposed Municipal Budget" },
                  { label: "Budget Legislation" },
                ],
              },
              {
                icon: <Group size={16} className="text-neutral-900" />,
                label: "Sectoral Committees",
                hasDropdown: true,
                children: [
                  { label: "Committee Chairmanships" },
                  { label: "Working Documents" },
                ],
              },
            ],
          },
        ],
      },
    },
    hrmo: {
      workforce: {
        title: "Workforce Analytics",
        sections: [
          {
            title: "Predictions",
            items: [
              {
                icon: <Analytics size={16} className="text-neutral-900" />,
                label: "Burnout Prediction Radar",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Cumulative Work Experience" },
                  { label: "Response Latencies" },
                  { label: "Logged Project Hours" },
                  { label: "Department Risk Flags" },
                ],
              },
              {
                icon: <ChartBar size={16} className="text-neutral-900" />,
                label: "Workload Velocity Metrics",
                hasDropdown: true,
                children: [
                  { label: "Task Completion Velocity" },
                  { label: "Equitable Distribution" },
                  { label: "GA Allocation Review" },
                ],
              },
            ],
          },
        ],
      },
      wellness: {
        title: "Employee Wellness",
        sections: [
          {
            title: "Well-being",
            items: [
              {
                icon: <Flag size={16} className="text-neutral-900" />,
                label: "Preemptive Interventions",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Automated Alerts" },
                  { label: "Wellness Interventions" },
                  { label: "Stress Debriefing" },
                ],
              },
              {
                icon: <Calendar size={16} className="text-neutral-900" />,
                label: "Leave & Attendance Management",
                hasDropdown: true,
                children: [
                  { label: "Terminal Leave Credits" },
                  { label: "Monetization" },
                  { label: "Overtime Claims" },
                  { label: "Payroll Pre-Audit" },
                ],
              },
            ],
          },
        ],
      },
      compliance: {
        title: "Civil Service Compliance",
        sections: [
          {
            title: "Evaluations",
            items: [
              {
                icon: (
                  <CheckmarkOutline size={16} className="text-neutral-900" />
                ),
                label: "Performance Evaluations",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "CSC Appraisals" },
                  { label: "Task Completion Rates" },
                  { label: "eFlow Data Integration" },
                ],
              },
            ],
          },
        ],
      },
    },
    finance: {
      projfin: {
        title: "Project Financials",
        sections: [
          {
            title: "Budget Management",
            items: [
              {
                icon: <Dashboard size={16} className="text-neutral-900" />,
                label: "Master Budget Allocation",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Programmatic Buckets" },
                  { label: "Facilities Budget" },
                  { label: "Marketing Budget" },
                  { label: "Community Engagement" },
                ],
              },
              {
                icon: <Share size={16} className="text-neutral-900" />,
                label: "Program Fund Distribution",
                hasDropdown: true,
                children: [
                  { label: "Fund Releases" },
                  { label: "Obligation Requests (ORS)" },
                  { label: "Earmarked Funds" },
                ],
              },
            ],
          },
        ],
      },
      liquidation: {
        title: "Expense & Liquidation Audit",
        sections: [
          {
            title: "Audit Queue",
            items: [
              {
                icon: <Pending size={16} className="text-neutral-900" />,
                label: "Pending Liquidations",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Receipt Verification" },
                  { label: "Exact Cost Review" },
                  { label: "Cash Advance Matching" },
                ],
              },
              {
                icon: <Renew size={16} className="text-neutral-900" />,
                label: "Budget Reconciliation & Returns",
                hasDropdown: true,
                children: [
                  { label: "Unspent Funds" },
                  { label: "Cryptographic Verification" },
                  { label: "LGU Pool Returns" },
                ],
              },
            ],
          },
        ],
      },
      crypto: {
        title: "Cryptographic Accountability",
        sections: [
          {
            title: "Blockchain Audit",
            items: [
              {
                icon: <Security size={16} className="text-neutral-900" />,
                label: "Immutable Expense Ledger",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Hashed Liquidations" },
                  { label: "Non-Repudiation Records" },
                  { label: "Blockchain Commits" },
                ],
              },
              {
                icon: <Flag size={16} className="text-neutral-900" />,
                label: "Real-Time Conformance Alerts",
                hasDropdown: true,
                children: [
                  { label: "Public Bidding Bypasses" },
                  { label: "COA Timeline Flags" },
                  { label: "30-Day Liquidation Alerts" },
                ],
              },
            ],
          },
        ],
      },
    },
    depthead: {
      deptportfolio: {
        title: "Project Portfolio",
        sections: [
          {
            title: "Projects",
            items: [
              {
                icon: <Folder size={16} className="text-neutral-900" />,
                label: "Portfolio Overview",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Aggregated Health" },
                  { label: "Budget Status" },
                  { label: "Timeline Review" },
                ],
              },
              {
                icon: <FolderOpen size={16} className="text-neutral-900" />,
                label: "Programs & Activities",
                hasDropdown: true,
                children: [
                  { label: "Team Assignments" },
                  { label: "Leader Assignments" },
                  { label: "Chain of Command" },
                ],
              },
            ],
          },
        ],
      },
      command: {
        title: "Department Command",
        sections: [
          {
            title: "AI Insights",
            items: [
              {
                icon: <Flag size={16} className="text-neutral-900" />,
                label: "AI Bottleneck Detection",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Process Mining Graphs" },
                  { label: "Delay Node Alerts" },
                  { label: "Intervention Mandates" },
                ],
              },
              {
                icon: <Report size={16} className="text-neutral-900" />,
                label: "NLP Stand-Up Synthesis",
                hasDropdown: true,
                children: [
                  { label: "Daily Summary" },
                  { label: "Action Items Extraction" },
                  { label: "Redundancy Filtering" },
                ],
              },
            ],
          },
        ],
      },
      intworkforce: {
        title: "Intelligent Workforce",
        sections: [
          {
            title: "Allocation",
            items: [
              {
                icon: <UserMultiple size={16} className="text-neutral-900" />,
                label: "Algorithmic Task Allocation",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Optimal Distribution Matrix" },
                  { label: "Manual Override" },
                  { label: "Idle Time Minimization" },
                ],
              },
            ],
          },
        ],
      },
      budget: {
        title: "Financial Management",
        sections: [
          {
            title: "Budget Tracking",
            items: [
              {
                icon: <ChartBar size={16} className="text-neutral-900" />,
                label: "Program Budget Burn-down",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Real-Time Spend Tracking" },
                  { label: "Overrun Prevention" },
                  { label: "Leader Expense Reports" },
                ],
              },
            ],
          },
        ],
      },
    },
    employee: {
      workspace: {
        title: "My Workspace",
        sections: [
          {
            title: "Tasks & Input",
            items: [
              {
                icon: <Task size={16} className="text-neutral-900" />,
                label: "Active Tasks",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "GA-Delegated Assignments" },
                  { label: "Context-Aware Reminders" },
                  { label: "One-Tap Complete" },
                ],
              },
              {
                icon: <Report size={16} className="text-neutral-900" />,
                label: "Daily Stand-Up Input",
                hasDropdown: true,
                children: [
                  { label: "Text Update" },
                  { label: "Voice Note" },
                  { label: "Auto-Transcription" },
                ],
              },
              {
                icon: <Integration size={16} className="text-neutral-900" />,
                label: "Mobile & Viber Integration",
                hasDropdown: true,
                children: [
                  { label: "Viber Account Linking" },
                  { label: "Keyword Notifications" },
                  { label: "Remote DB Updates" },
                ],
              },
            ],
          },
        ],
      },
      empfin: {
        title: "Project Financials",
        sections: [
          {
            title: "Expense Reporting",
            items: [
              {
                icon: <DocumentAdd size={16} className="text-neutral-900" />,
                label: "Expense & Liquidation Submission",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Exact Spent Amount" },
                  { label: "Receipt Upload (OR/AR)" },
                  { label: "Remaining Budget Calc" },
                ],
              },
              {
                icon: <AddLarge size={16} className="text-neutral-900" />,
                label: "Cash Advance Requests",
              },
            ],
          },
        ],
      },
      achievement: {
        title: "Collaborative Achievement",
        sections: [
          {
            title: "Team Progress",
            items: [
              {
                icon: <Group size={16} className="text-neutral-900" />,
                label: "Departmental Goals",
                isActive: true,
                hasDropdown: true,
                children: [
                  { label: "Team Milestones" },
                  { label: "Compliance Metrics" },
                  { label: "Social Norming Stats" },
                ],
              },
              {
                icon: <StarFilled size={16} className="text-neutral-900" />,
                label: "Agentic AI Coaching",
                hasDropdown: true,
                children: [
                  { label: "Workflow Guidance" },
                  { label: "Liquidation Report Help" },
                  { label: "Digital Literacy Support" },
                ],
              },
            ],
          },
        ],
      },
    },
  };

  const roleMap = map[role];
  if (roleMap && roleMap[section]) return roleMap[section];
  const config = roleNavConfigs[role] || roleNavConfigs.superadmin;
  return map[role]?.[config.defaultSection] || map.superadmin.scc;
}

// === LAYOUT COMPONENTS ===

function IconNavButton({
  children,
  isActive = false,
  onClick,
}: {
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      className={`box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative rounded-lg shrink-0 size-10 min-w-10 cursor-pointer transition-colors duration-500
        ${
          isActive
            ? "bg-neutral-100 text-neutral-900"
            : "hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700"
        }`}
      style={{ transitionTimingFunction: softSpringEasing }}
      data-name="Icon Nav Button"
      onClick={onClick}
    >
      {children}
    </div>
  );
}

function IconNavigation({
  activeSection,
  onSectionChange,
  role,
}: {
  activeSection: string;
  onSectionChange: (section: string) => void;
  role: string;
}) {
  const config = roleNavConfigs[role] || roleNavConfigs.superadmin;

  return (
    <div
      className="bg-white box-border content-stretch flex flex-col gap-2 h-full items-center justify-start overflow-clip p-4 relative rounded-l-2xl shrink-0 w-16 border-r border-neutral-200"
      data-name="Icon Navigation"
    >
      <div className="mb-2 size-10 flex items-center justify-center">
        <div className="size-7">
          <InterfacesLogo1 />
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full items-center">
        {config.navItems.map((item) => (
          <IconNavButton
            key={item.id}
            isActive={activeSection === item.id}
            onClick={() => onSectionChange(item.id)}
          >
            {item.icon}
          </IconNavButton>
        ))}
      </div>

      <div className="flex-1" />
      <div className="flex flex-col gap-2 w-full items-center">
        <IconNavButton
          isActive={activeSection === "settings"}
          onClick={() => onSectionChange("settings")}
        >
          <Settings size={16} />
        </IconNavButton>
        <div className="size-8">
          <Avatar />
        </div>
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  onToggleCollapse,
  isCollapsed,
}: {
  title: string;
  onToggleCollapse: () => void;
  isCollapsed: boolean;
}) {
  if (isCollapsed) {
    return (
      <div
        className="relative shrink-0 w-full flex justify-center transition-all duration-500"
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        <button
          onClick={onToggleCollapse}
          className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative rounded-lg shrink-0 cursor-pointer transition-all duration-500 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 size-10 min-w-10"
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <ChevronLeft
            size={16}
            className="transition-transform duration-500"
            style={{
              transitionTimingFunction: softSpringEasing,
              transform: "rotate(180deg)",
            }}
          />
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative shrink-0 w-full overflow-hidden transition-all duration-500"
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <div className="flex flex-row items-center justify-between relative size-full">
        <div
          className="box-border content-stretch flex flex-row items-center justify-start relative h-10 overflow-hidden transition-opacity opacity-100 duration-500"
          style={{ transitionTimingFunction: softSpringEasing }}
        >
          <div className="box-border content-stretch flex flex-col gap-2 items-start justify-center px-2 py-1 relative shrink-0">
            <div className="font-['Lexend:SemiBold',_sans-serif] font-semibold leading-[0] relative shrink-0 text-[18px] text-left text-neutral-900 text-nowrap">
              <p className="block leading-[27px] whitespace-pre">{title}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center pr-1">
          <button
            onClick={onToggleCollapse}
            className="box-border content-stretch flex flex-row items-center justify-center overflow-clip p-0 relative rounded-lg shrink-0 cursor-pointer transition-all duration-500 hover:bg-neutral-50 text-neutral-500 hover:text-neutral-700 size-10 min-w-10"
            style={{ transitionTimingFunction: softSpringEasing }}
          >
            <ChevronLeft
              size={16}
              className="transition-transform duration-500"
              style={{ transitionTimingFunction: softSpringEasing }}
            />
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailSidebar({
  activeSection,
  role,
  activePage,
  onPageChange,
}: {
  activeSection: string;
  role: string;
  activePage?: string;
  onPageChange?: (page: string) => void;
}) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isCollapsed, setIsCollapsed] = useState(false);
  const content = getSidebarContent(role, activeSection);

  const toggleExpanded = (itemKey: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemKey)) {
      newExpanded.delete(itemKey);
    } else {
      newExpanded.add(itemKey);
    }
    setExpandedItems(newExpanded);
  };

  return (
    <div
      className={`bg-white box-border content-stretch flex flex-col gap-4 h-full items-start justify-start overflow-visible p-4 relative shrink-0 transition-all duration-500 border-r border-neutral-200 ${
        isCollapsed ? "w-16 min-w-16 !px-0 justify-center" : "w-80"
      }`}
      style={{ transitionTimingFunction: softSpringEasing }}
    >
      <SectionTitle
        title={content.title}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        isCollapsed={isCollapsed}
      />
      <SearchContainer isCollapsed={isCollapsed} />

      <div
        className={`basis-0 box-border content-stretch flex flex-col grow min-h-px min-w-10 p-0 relative shrink-0 w-full overflow-y-auto transition-all duration-500 ${
          isCollapsed
            ? "gap-2 items-center justify-start"
            : "gap-4 items-start justify-start"
        }`}
        style={{ transitionTimingFunction: softSpringEasing }}
      >
        {content.sections.map((section, index) => (
          <MenuSectionComponent
            key={`${activeSection}-${index}`}
            section={section}
            expandedItems={expandedItems}
            onToggleExpanded={toggleExpanded}
            isCollapsed={isCollapsed}
            onItemClick={onPageChange}
            activePage={activePage}
          />
        ))}
      </div>
    </div>
  );
}

function TwoLevelSidebar({ role }: { role: string }) {
  const config = roleNavConfigs[role] || roleNavConfigs.superadmin;
  const [activeSection, setActiveSection] = useState(config.defaultSection);
  const [activePage, setActivePage] = useState<string | undefined>(undefined);
  const [prevRole, setPrevRole] = useState(role);

  if (prevRole !== role) {
    setPrevRole(role);
    const newConfig = roleNavConfigs[role] || roleNavConfigs.superadmin;
    setActiveSection(newConfig.defaultSection);
    setActivePage(undefined);
  }

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    setActivePage(undefined);
  };

  return (
    <div className="flex flex-row h-full min-h-0">
      <IconNavigation
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        role={role}
      />
      <DetailSidebar
        activeSection={activeSection}
        role={role}
        activePage={activePage}
        onPageChange={setActivePage}
      />
      {/* Main Content Area */}
      {role === "superadmin" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <SuperAdminContentComponent
            activeSection={activeSection}
            activePage={activePage}
          />
        </div>
      )}
      {role === "executive" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <ExecutiveContent
            activeSection={activeSection}
            activePage={activePage}
          />
        </div>
      )}
      {role === "legislative" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <LegislativeContent
            activeSection={activeSection}
            activePage={activePage}
          />
        </div>
      )}
      {role === "hrmo" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <HRMOContent activeSection={activeSection} activePage={activePage} />
        </div>
      )}
      {role === "finance" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <FinanceContent
            activeSection={activeSection}
            activePage={activePage}
          />
        </div>
      )}
      {role === "depthead" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <DeptHeadContent
            activeSection={activeSection}
            activePage={activePage}
          />
        </div>
      )}
      {role === "employee" && (
        <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl">
          <EmployeeContent
            activeSection={activeSection}
            activePage={activePage}
          />
        </div>
      )}
      {role !== "superadmin" &&
        role !== "executive" &&
        role !== "legislative" &&
        role !== "hrmo" &&
        role !== "finance" &&
        role !== "depthead" &&
        role !== "employee" && (
          <div className="bg-neutral-50 h-full min-h-0 flex-1 overflow-y-auto p-6 rounded-r-2xl flex items-center justify-center">
            <div className="text-center text-neutral-400">
              <Settings size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">
                Content coming soon
              </p>
              <p className="text-[12px] mt-1">Role: {role}</p>
            </div>
          </div>
        )}
    </div>
  );
}

// === ROLE TABS + FRAME ===

const roles = [
  { id: "superadmin", label: "Super Admin" },
  { id: "executive", label: "Executive" },
  { id: "legislative", label: "Legislative" },
  { id: "hrmo", label: "HRMO" },
  { id: "finance", label: "Finance" },
  { id: "depthead", label: "Dept. Head" },
  { id: "employee", label: "Employee" },
  { id: "councilor_pad", label: "Councilor Pad" },
];

export function Frame760() {
  const [activeRole, setActiveRole] = useState("superadmin");

  return (
    <div className="bg-neutral-50 box-border content-stretch flex flex-col items-center justify-start p-6 relative size-full min-h-screen gap-4">
      {/* Role Tabs */}
      <div className="flex flex-row items-center gap-1 bg-white rounded-xl p-1.5 border border-neutral-200 shadow-sm">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => setActiveRole(role.id)}
            className={`px-4 py-2 rounded-lg cursor-pointer transition-all duration-300 font-['Lexend:Regular',_sans-serif] font-normal text-[13px] leading-[20px] whitespace-nowrap ${
              activeRole === role.id
                ? "bg-neutral-100 text-neutral-900"
                : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
            }`}
            style={{ transitionTimingFunction: softSpringEasing }}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Outlined Container */}
      <div className="border border-neutral-200 rounded-2xl overflow-hidden shadow-sm flex-1 w-full max-w-[1880px] min-h-0">
        {activeRole === "councilor_pad" ? (
          <CouncilorPanel />
        ) : (
          <TwoLevelSidebar role={activeRole} />
        )}
      </div>
    </div>
  );
}
