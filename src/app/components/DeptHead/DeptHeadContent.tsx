import React, { useState, useMemo } from "react";
import { MondayBoard } from "../ui/MondayBoard";
import { NotificationBell } from "../ui/NotificationBell";
import {
  createTask,
  assignTask,
  verifyTask,
  updateTask,
  deleteTask,
  Task,
} from "../../services/taskService";
import { Employee } from "../../services/employeeService";
import {
  useTasks,
  useEmployees,
  useUsers,
  useDepartments,
  useEmployeeNotes,
} from "../../hooks/useFirebaseData";
import { useAuth } from "../../contexts/AuthContext";
import { useOrgs } from "../../hooks/useSupabaseData";
import { getDescendantOrgIds } from "../../../lib/supabaseService";
import { updateEmployeeNotes } from "../../services/employeeNotesService";
import { Settings } from "@carbon/icons-react";
import {
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Flame,
  Sparkles,
  Users,
  UserPlus,
  UserCheck,
  Crown,
  ChevronRight,
  Gauge,
  TrendingUp,
  Shield,
  HardHat,
  ClipboardList,
  GitBranch,
  Plus,
  X,
  Zap,
  MapPin,
  Calendar,
  Wallet,
  Info,
  Star,
  Briefcase,
  Activity,
  GitMerge,
  MessageSquare,
  FileText,
  Download,
  Brain,
  CloudRain,
  Target,
  ArrowRight,
  Merge,
  Bot,
  ListChecks,
  Dna,
  Navigation,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  Route,
  Timer,
  Radio,
  AlertOctagon,
  Lock as LockIcon,
  ReceiptText,
  Ban as BanIcon,
  Bell,
  RefreshCw,
  Search,
  FileDown,
  Map as MapIcon,
  Layers,
  CalendarDays,
} from "lucide-react";

// ==================== SHARED ====================

function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-400 uppercase tracking-wider mb-1">
          <Briefcase size={12} /> Dept. Head · Command Center
        </div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
          {title}
        </h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
          {subtitle || "Office of the City Engineer · Ormoc City"}
        </p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Btn({
  icon,
  label,
  variant = "secondary",
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  onClick?: () => void;
  disabled?: boolean;
}) {
  const s: Record<string, string> = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary:
      "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${s[variant]} ${
        disabled ? "opacity-40 cursor-not-allowed" : ""
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Stat({
  label,
  value,
  trend,
  tone = "neutral",
}: {
  label: string;
  value: string;
  trend?: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const toneMap: Record<string, string> = {
    neutral: "text-neutral-900",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
  };
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
        {label}
      </div>
      <div
        className={`text-[22px] font-['Lexend:SemiBold',_sans-serif] mt-1 tabular-nums ${toneMap[tone]}`}
      >
        {value}
      </div>
      {trend && (
        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
          {trend}
        </div>
      )}
    </div>
  );
}

const peso = (n: number, dec = 0) =>
  `₱${n.toLocaleString("en-PH", { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;

const pesoShort = (n: number) => {
  if (n >= 1_000_000_000) return `₱${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `₱${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₱${(n / 1_000).toFixed(0)}K`;
  return `₱${n}`;
};

// ==================== 15.1.A — AGGREGATED HEALTH (Master Board) ====================

// ─── Project type derived from live data ──────────────────────────
type Project = {
  id: string;
  name: string;
  code: string;
  lead: string;
  timePct: number;
  tasksPct: number;
  budgetPct: number;
  totalBudget: number;
  health: "green" | "yellow" | "red";
  bottleneck?: string;
  bottleneckAge?: number;
  bpaNode?: string;
  nextMilestone: string;
  deadline: string;
  burnSpark: number[];
  status: "In Progress" | "Blocked" | "Planning" | "Closing";
  barangay: string;
  mapX: number;
  mapY: number;
};

// Derive projects from live task data instead of hardcoding
function deriveProjectsFromTasks(
  tasks: Task[],
  employees: Employee[],
): Project[] {
  // Group tasks by department
  const deptGroups = new Map<string, Task[]>();
  tasks.forEach((t) => {
    const dept = t.department || "UNASSIGNED";
    if (!deptGroups.has(dept)) deptGroups.set(dept, []);
    deptGroups.get(dept)!.push(t);
  });

  const DEPT_NAMES: Record<string, string> = {
    EPW: "Engineering & Public Works",
    CPD: "City Planning & Development",
    FIN: "Finance & Budget",
    HSW: "Health & Social Welfare",
    ITS: "IT & Digital Services",
    BPLO: "Business Permit & Licensing",
  };

  return Array.from(deptGroups.entries()).map(([dept, deptTasks], idx) => {
    const total = deptTasks.length;
    const completed = deptTasks.filter((t) => t.status === "completed").length;
    const inProgress = deptTasks.filter(
      (t) => t.status === "in_progress",
    ).length;
    const blocked = deptTasks.filter((t) => t.status === "for_review").length;
    const tasksPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    // Find lead employee for this department
    const deptEmp = employees.filter((e) => e.department === dept);
    const lead =
      deptEmp.find((e) => e.jobTitle?.includes("Head"))?.name ||
      deptEmp[0]?.name ||
      "Unassigned";

    // Nearest deadline
    const deadlines = deptTasks
      .filter((t) => t.deadline || t.dueDate)
      .map((t) => new Date(t.deadline || t.dueDate!))
      .sort((a, b) => a.getTime() - b.getTime());
    const nearestDl = deadlines[0];
    const now = new Date();
    const daysLeft = nearestDl
      ? Math.ceil((nearestDl.getTime() - now.getTime()) / 86400000)
      : 999;
    const timePct = nearestDl
      ? Math.min(95, Math.max(10, 100 - daysLeft * 2))
      : 20;

    // Health calc
    const overdue = deptTasks.filter((t) => {
      const dl = t.deadline || t.dueDate;
      if (!dl || t.status === "completed") return false;
      return new Date(dl).getTime() < Date.now();
    }).length;
    const health: "green" | "yellow" | "red" =
      overdue > 0
        ? "red"
        : inProgress + blocked > total / 2
          ? "yellow"
          : "green";

    // Status
    const status: Project["status"] =
      overdue > 0
        ? "Blocked"
        : completed === total && total > 0
          ? "Closing"
          : inProgress > 0
            ? "In Progress"
            : "Planning";

    // Build sparkline from progress
    const spark = Array.from({ length: 8 }, (_, i) =>
      Math.round((tasksPct / 8) * (i + 1)),
    );

    const barangays = deptTasks.map((t) => t.barangay).filter(Boolean);

    return {
      id: dept,
      name: DEPT_NAMES[dept] || dept,
      code: `DEPT-${dept}`,
      lead,
      timePct,
      tasksPct,
      budgetPct: Math.round(tasksPct * 0.9), // estimate
      totalBudget: 0,
      health,
      bottleneck: overdue > 0 ? `${overdue} overdue task(s)` : undefined,
      bottleneckAge:
        overdue > 0 ? (daysLeft < 0 ? Math.abs(daysLeft) : 0) : undefined,
      bpaNode: overdue > 0 ? `${dept} · Overdue Review` : undefined,
      nextMilestone: nearestDl
        ? `Next deadline · ${nearestDl.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`
        : "No deadlines",
      deadline: nearestDl
        ? nearestDl.toLocaleDateString("en-PH", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        : "-",
      burnSpark: spark,
      status,
      barangay: barangays[0] || "-",
      mapX: 30 + idx * 10,
      mapY: 40 + idx * 5,
    };
  });
}

type BoardView = "table" | "gantt" | "resource" | "kanban" | "map" | "calendar";

function Sparkline({ values, color }: { values: number[]; color: string }) {
  const W = 90,
    H = 24;
  const max = 100;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * W},${H - (v / max) * H + 2}`)
    .join(" ");
  const area = `M0,${H} L${pts.replace(/ /g, " L ")} L${W},${H} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H + 4}`} className="w-[90px] h-[26px]">
      <path d={area} fill={color} fillOpacity="0.12" />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {values.map(
        (v, i) =>
          i === values.length - 1 && (
            <circle
              key={i}
              cx={(i / (values.length - 1)) * W}
              cy={H - (v / max) * H + 2}
              r="2"
              fill={color}
            />
          ),
      )}
    </svg>
  );
}

function HealthChip({ health }: { health: Project["health"] }) {
  const map = {
    green: { bg: "bg-emerald-500", label: "Optimal" },
    yellow: { bg: "bg-amber-500", label: "Warning" },
    red: { bg: "bg-red-500 animate-pulse", label: "Critical" },
  } as const;
  const s = map[health];
  return (
    <div
      className={`flex items-center gap-1.5 ${s.bg} text-white rounded-full pl-1.5 pr-2 py-0.5 w-fit`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white" />
      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider">
        {s.label}
      </span>
    </div>
  );
}

function AggregatedHealth() {
  // Fetch realtime data
  const { tasks } = useTasks();
  const { employees: allEmployees } = useEmployees();
  const { userProfile } = useAuth();
  const { orgs } = useOrgs();

  // Filter to entire org subtree (own node + all descendants), not just
  // an exact match — this is the fix for Dept Head not seeing sub-section
  // tasks.
  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );
  const deptTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (t) => !t.orgId || scopedOrgIds.includes(t.orgId),
    );
  }, [tasks, scopedOrgIds]);

  const PROJECTS = useMemo(
    () => deriveProjectsFromTasks(deptTasks, allEmployees || []),
    [deptTasks, allEmployees],
  );
  const [view, setView] = useState<BoardView>("table");
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [sortBy, setSortBy] = useState<"health" | "budget" | "deadline">(
    "health",
  );
  const [selectedId, setSelectedId] = useState<string | null>("p4");
  const [query, setQuery] = useState("");
  const [addViewOpen, setAddViewOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [pmFilter, setPmFilter] = useState<string>("");
  const [brgyFilter, setBrgyFilter] = useState<string>("");
  const [toast, setToast] = useState<string | null>(null);

  const allPMs = Array.from(new Set(PROJECTS.map((p) => p.lead)));
  const allBrgy = Array.from(new Set(PROJECTS.map((p) => p.barangay)));

  const sorted = useMemo(() => {
    let rows = [...PROJECTS];
    if (sortBy === "health") {
      const ord = { red: 0, yellow: 1, green: 2 };
      rows.sort((a, b) => ord[a.health] - ord[b.health]);
    } else if (sortBy === "budget") {
      rows.sort((a, b) => b.totalBudget - a.totalBudget);
    } else {
      rows.sort(
        (a, b) =>
          new Date(a.deadline).getTime() - new Date(b.deadline).getTime(),
      );
    }
    if (onlyCritical) rows = rows.filter((p) => p.health === "red");
    if (pmFilter) rows = rows.filter((p) => p.lead === pmFilter);
    if (brgyFilter) rows = rows.filter((p) => p.barangay === brgyFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.code.toLowerCase().includes(q) ||
          p.lead.toLowerCase().includes(q) ||
          p.barangay.toLowerCase().includes(q),
      );
    }
    return rows;
  }, [onlyCritical, sortBy, query, pmFilter, brgyFilter]);

  const doExport = (kind: "PDF" | "CSV") => {
    setToast(
      `Exporting ${sorted.length} projects to ${kind}… queued for download`,
    );
    setTimeout(() => setToast(null), 2400);
  };
  const activeFilterCount = (pmFilter ? 1 : 0) + (brgyFilter ? 1 : 0);

  const selected = PROJECTS.find((p) => p.id === selectedId) || null;

  const healthColor: Record<Project["health"], string> = {
    green: "#10b981",
    yellow: "#f59e0b",
    red: "#dc2626",
  };
  const statusTone: Record<Project["status"], string> = {
    "In Progress": "bg-blue-50 text-blue-700 border-blue-200",
    Blocked: "bg-red-50 text-red-700 border-red-200",
    Planning: "bg-neutral-100 text-neutral-700 border-neutral-200",
    Closing: "bg-purple-50 text-purple-700 border-purple-200",
  };

  return (
    <div
      className={`p-8 min-h-full ${selected && "pr-[408px]"} transition-all`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-400 uppercase tracking-wider mb-1">
            <Briefcase size={12} /> Dept. Head · Portfolio Overview
          </div>
          <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
            Departmental Project Health — Q3 2026
          </h1>
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
            Manage by exception · AI bubbles failing projects to the top
          </p>
        </div>
        <div className="relative flex items-center gap-1 bg-white border border-neutral-200 rounded-lg p-1">
          {(
            [
              {
                id: "table",
                label: "Main Table",
                icon: <ClipboardList size={13} />,
              },
              {
                id: "gantt",
                label: "Gantt Chart",
                icon: <Calendar size={13} />,
              },
              {
                id: "resource",
                label: "Resource Chart",
                icon: <Users size={13} />,
              },
              { id: "kanban", label: "Kanban", icon: <Layers size={13} /> },
              { id: "map", label: "GIS Map", icon: <MapIcon size={13} /> },
              {
                id: "calendar",
                label: "Calendar",
                icon: <CalendarDays size={13} />,
              },
            ] as const
          )
            .filter(
              (v) =>
                view === v.id ||
                ["table", "gantt", "resource"].includes(v.id) ||
                view === v.id,
            )
            .map((v) => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded text-[11.5px] font-['Lexend:Medium',_sans-serif] ${view === v.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
              >
                {v.icon}
                {v.label}
              </button>
            ))}
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <button
            onClick={() => setAddViewOpen(!addViewOpen)}
            className="flex items-center gap-1 px-2 py-1.5 rounded text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
          >
            <Plus size={12} /> Add View
          </button>
          {addViewOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setAddViewOpen(false)}
              />
              <div className="absolute right-0 top-[calc(100%+4px)] z-40 w-[300px] bg-white border border-neutral-200 rounded-xl shadow-2xl p-2">
                <div className="px-2 py-1.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                  Add a View
                </div>
                {[
                  {
                    id: "kanban",
                    icon: <Layers size={14} className="text-blue-600" />,
                    title: "Kanban Board",
                    desc: "Cards grouped by status — Planning → In Progress → Blocked → Completed",
                  },
                  {
                    id: "map",
                    icon: <MapIcon size={14} className="text-emerald-600" />,
                    title: "GIS Map View",
                    desc: "City map with project pins color-coded by AI Health",
                  },
                  {
                    id: "calendar",
                    icon: (
                      <CalendarDays size={14} className="text-violet-600" />
                    ),
                    title: "Master Calendar",
                    desc: "All deadlines plotted on a monthly grid",
                  },
                ].map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setView(o.id as BoardView);
                      setAddViewOpen(false);
                    }}
                    className="w-full flex items-start gap-2.5 p-2 rounded-lg hover:bg-neutral-50 text-left"
                  >
                    <div className="w-7 h-7 rounded-md bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0">
                      {o.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                        {o.title}
                      </div>
                      <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 leading-snug">
                        {o.desc}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex items-center bg-white border border-neutral-200 rounded-lg h-[32px] w-[260px] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-200">
          <Search size={13} className="text-neutral-400 ml-2.5" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Search "Eco-Park" or "PRJ-2026-014"…'
            className="flex-1 bg-transparent px-2 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="pr-2 text-neutral-400 hover:text-neutral-700"
            >
              <X size={12} />
            </button>
          )}
        </div>

        <button
          onClick={() => setOnlyCritical(!onlyCritical)}
          className={`flex items-center gap-1.5 px-3 h-[32px] rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] border ${onlyCritical ? "bg-red-600 text-white border-red-600" : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"}`}
        >
          <Flame size={12} /> Show Only Critical
        </button>

        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 h-[32px] rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] border ${activeFilterCount > 0 ? "bg-indigo-50 text-indigo-700 border-indigo-200" : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"}`}
          >
            <Filter size={12} /> Filter{" "}
            {activeFilterCount > 0 && (
              <span className="ml-0.5 bg-indigo-600 text-white rounded-full text-[9px] px-1.5 font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
          {filterOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setFilterOpen(false)}
              />
              <div className="absolute left-0 top-[calc(100%+4px)] z-40 w-[280px] bg-white border border-neutral-200 rounded-xl shadow-2xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                    Advanced Filters
                  </div>
                  {activeFilterCount > 0 && (
                    <button
                      onClick={() => {
                        setPmFilter("");
                        setBrgyFilter("");
                      }}
                      className="text-[10.5px] text-neutral-500 hover:text-neutral-900 underline"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <label className="block mb-3">
                  <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1">
                    Project Manager
                  </div>
                  <select
                    value={pmFilter}
                    onChange={(e) => setPmFilter(e.target.value)}
                    className="w-full h-[30px] px-2 border border-neutral-200 rounded-md text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 bg-white"
                  >
                    <option value="">All PMs</option>
                    {allPMs.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-600 mb-1">
                    Location (Barangay)
                  </div>
                  <select
                    value={brgyFilter}
                    onChange={(e) => setBrgyFilter(e.target.value)}
                    className="w-full h-[30px] px-2 border border-neutral-200 rounded-md text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 bg-white"
                  >
                    <option value="">All Barangays</option>
                    {allBrgy.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5 h-[32px]">
          {(
            [
              { id: "health", label: "AI Health" },
              { id: "budget", label: "Highest Budget" },
              { id: "deadline", label: "Nearest Deadline" },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              onClick={() => setSortBy(s.id)}
              className={`px-2.5 h-[26px] rounded text-[11px] font-['Lexend:Medium',_sans-serif] ${sortBy === s.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 pr-2 border-r border-neutral-200">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal ·{" "}
              {PROJECTS.filter((p) => p.health === "green").length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning ·{" "}
              {PROJECTS.filter((p) => p.health === "yellow").length}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />{" "}
              Critical · {PROJECTS.filter((p) => p.health === "red").length}
            </span>
          </div>
          <div className="flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden h-[32px]">
            <button
              onClick={() => doExport("PDF")}
              className="flex items-center gap-1.5 px-3 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 h-full"
            >
              <FileDown size={12} /> PDF
            </button>
            <div className="w-px h-4 bg-neutral-200" />
            <button
              onClick={() => doExport("CSV")}
              className="flex items-center gap-1.5 px-3 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 h-full"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        </div>
      </div>

      {toast && (
        <div className="mb-3 bg-neutral-900 text-white rounded-lg px-3 py-2 text-[11.5px] font-['Lexend:Medium',_sans-serif] flex items-center gap-2 w-fit">
          <FileDown size={12} /> {toast}
        </div>
      )}

      {view === "table" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="grid grid-cols-[3px_minmax(220px,1.5fr)_minmax(150px,1fr)_110px_minmax(200px,1.4fr)_minmax(160px,1.2fr)_minmax(200px,1.4fr)_100px] gap-0 bg-neutral-50 border-b border-neutral-200">
            <div />
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              Project
            </div>
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              Project Manager
            </div>
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              AI Health
            </div>
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              Timeline Health
            </div>
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              Budget Burn
            </div>
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              Current Bottleneck
            </div>
            <div className="px-3 py-2.5 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500 text-right">
              Deadline
            </div>
          </div>
          {sorted.map((p) => {
            const isSel = selectedId === p.id;
            const deltaPp = p.timePct - p.tasksPct;
            const barTone =
              p.health === "red"
                ? "bg-red-500"
                : p.health === "yellow"
                  ? "bg-amber-500"
                  : "bg-emerald-500";
            return (
              <button
                key={p.id}
                onClick={() => setSelectedId(isSel ? null : p.id)}
                className={`w-full text-left grid grid-cols-[3px_minmax(220px,1.5fr)_minmax(150px,1fr)_110px_minmax(200px,1.4fr)_minmax(160px,1.2fr)_minmax(200px,1.4fr)_100px] gap-0 border-b border-neutral-100 hover:bg-neutral-50 transition ${isSel ? "bg-indigo-50/40" : ""}`}
              >
                <div
                  style={{ backgroundColor: healthColor[p.health] }}
                  className={p.health === "red" ? "animate-pulse" : ""}
                />
                <div className="px-3 py-3">
                  <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                    {p.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-neutral-400">
                      {p.code}
                    </span>
                    <span
                      className={`text-[9.5px] font-['Lexend:Medium',_sans-serif] border rounded px-1.5 py-0.5 ${statusTone[p.status]}`}
                    >
                      {p.status}
                    </span>
                  </div>
                </div>
                <div className="px-3 py-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700 shrink-0">
                    {p.lead.split(" ").slice(-1)[0].slice(0, 2)}
                  </div>
                  <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 truncate">
                    {p.lead}
                  </div>
                </div>
                <div className="px-3 py-3 flex items-center">
                  <HealthChip health={p.health} />
                </div>
                <div className="px-3 py-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 tabular-nums">
                      T {p.timePct}%
                    </span>
                    <span className="text-[10px] text-neutral-300">·</span>
                    <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-700 tabular-nums">
                      W {p.tasksPct}%
                    </span>
                    {deltaPp > 15 && (
                      <span className="ml-auto text-[9.5px] font-['Lexend:Medium',_sans-serif] text-red-700 bg-red-50 border border-red-200 rounded px-1 tabular-nums">
                        −{deltaPp}pp
                      </span>
                    )}
                  </div>
                  <div className="relative h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div
                      className="absolute top-0 left-0 h-full bg-neutral-300"
                      style={{ width: `${p.timePct}%` }}
                    />
                    <div
                      className={`absolute top-0 left-0 h-full ${barTone}`}
                      style={{ width: `${p.tasksPct}%` }}
                    />
                  </div>
                </div>
                <div className="px-3 py-3 flex items-center gap-2">
                  <Sparkline
                    values={p.burnSpark}
                    color={healthColor[p.health]}
                  />
                  <div>
                    <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums">
                      {p.budgetPct}%
                    </div>
                    <div className="text-[9.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 tabular-nums">
                      of {pesoShort(p.totalBudget)}
                    </div>
                  </div>
                </div>
                <div className="px-3 py-3 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
                  {p.bottleneck ? (
                    <div className="flex items-start gap-1.5">
                      <AlertTriangle
                        size={11}
                        className={
                          p.health === "red" ? "text-red-600" : "text-amber-600"
                        }
                      />
                      <div className="min-w-0">
                        <div className="truncate">{p.bottleneck}</div>
                        <div className="text-[9.5px] text-neutral-400 tabular-nums">
                          {p.bottleneckAge}d old
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-emerald-700">
                      <CheckCircle2 size={11} /> <span>No blockers</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-3 text-right">
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums">
                    {p.deadline.split(",")[0]}
                  </div>
                  <div className="text-[9.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                    {p.deadline.split(",")[1]}
                  </div>
                </div>
              </button>
            );
          })}
          <div className="px-4 py-2.5 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 bg-neutral-50">
            {sorted.length} of {PROJECTS.length} projects · Portfolio budget{" "}
            {pesoShort(PROJECTS.reduce((s, p) => s + p.totalBudget, 0))}
          </div>
        </div>
      )}

      {view === "gantt" && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 mb-3">
            Portfolio Gantt · Apr–Dec 2026
          </div>
          <div className="space-y-2">
            {sorted.map((p) => {
              const start = 5 + ((parseInt(p.id.replace(/\D/g, "")) * 3) % 30);
              const width = 35 + p.totalBudget / 2_000_000;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[240px_1fr] gap-3 items-center"
                >
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                    {p.name}
                  </div>
                  <div className="relative h-6 bg-neutral-50 rounded">
                    <div
                      className="absolute top-1 bottom-1 rounded flex items-center px-2"
                      style={{
                        left: `${start}%`,
                        width: `${Math.min(width, 95 - start)}%`,
                        backgroundColor: healthColor[p.health],
                        opacity: 0.85,
                      }}
                    >
                      <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-white truncate">
                        {p.tasksPct}% complete
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "resource" && (
        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 mb-3">
            Resource Load per Project Manager
          </div>
          <div className="space-y-2.5">
            {Array.from(new Set(PROJECTS.map((p) => p.lead))).map((lead) => {
              const projs = PROJECTS.filter((p) => p.lead === lead);
              const total = projs.reduce((s, p) => s + p.totalBudget, 0);
              const load = Math.min(
                100,
                projs.length * 18 +
                  projs.filter((p) => p.health === "red").length * 12,
              );
              return (
                <div
                  key={lead}
                  className="grid grid-cols-[180px_1fr_80px] gap-3 items-center"
                >
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                    {lead}
                  </div>
                  <div className="relative h-5 bg-neutral-100 rounded">
                    <div
                      className={`absolute top-0 bottom-0 rounded ${load > 80 ? "bg-red-500" : load > 60 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${load}%` }}
                    />
                    <div className="absolute inset-0 flex items-center px-2 text-[10px] font-['Lexend:Medium',_sans-serif] text-white">
                      {projs.length} projects · {pesoShort(total)}
                    </div>
                  </div>
                  <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 tabular-nums text-right">
                    {load}% load
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === "kanban" && (
        <div className="grid grid-cols-4 gap-3">
          {(["Planning", "In Progress", "Blocked", "Closing"] as const).map(
            (col) => {
              const items = sorted.filter((p) => p.status === col);
              const colTone: Record<string, string> = {
                Planning: "border-t-neutral-400",
                "In Progress": "border-t-blue-500",
                Blocked: "border-t-red-500",
                Closing: "border-t-purple-500",
              };
              return (
                <div
                  key={col}
                  className={`bg-neutral-50 border-t-[3px] ${colTone[col]} border border-neutral-200 rounded-lg p-2 min-h-[400px]`}
                >
                  <div className="flex items-center justify-between px-1 mb-2">
                    <div className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800 uppercase tracking-wider">
                      {col}
                    </div>
                    <div className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 bg-white border border-neutral-200 rounded-full px-1.5 tabular-nums">
                      {items.length}
                    </div>
                  </div>
                  <div className="space-y-2">
                    {items.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={`w-full text-left bg-white border rounded-lg p-2.5 hover:shadow-sm transition ${selectedId === p.id ? "border-indigo-300 ring-1 ring-indigo-200" : "border-neutral-200"}`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono text-neutral-400">
                            {p.code}
                          </span>
                          <HealthChip health={p.health} />
                        </div>
                        <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug">
                          {p.name}
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded-full bg-neutral-200 flex items-center justify-center text-[8px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                            {p.lead.split(" ").slice(-1)[0].slice(0, 2)}
                          </div>
                          <span className="text-[10px] text-neutral-500 truncate">
                            {p.lead}
                          </span>
                        </div>
                        <div className="mt-1.5 h-1 bg-neutral-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${p.health === "red" ? "bg-red-500" : p.health === "yellow" ? "bg-amber-500" : "bg-emerald-500"}`}
                            style={{ width: `${p.tasksPct}%` }}
                          />
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[9.5px] text-neutral-500 tabular-nums">
                          <span>{p.tasksPct}% done</span>
                          <span>{p.deadline.split(",")[0]}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            },
          )}
        </div>
      )}

      {view === "map" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-neutral-50">
            <div className="flex items-center gap-2">
              <MapIcon size={13} className="text-neutral-700" />
              <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                Ormoc City · GIS Project Map
              </span>
            </div>
            <div className="flex items-center gap-3 text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Optimal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Warning
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" /> Critical
              </span>
            </div>
          </div>
          <div className="relative h-[520px] bg-gradient-to-br from-emerald-50 via-sky-50 to-blue-100 overflow-hidden">
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <pattern
                  id="grid"
                  width="8"
                  height="8"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 8 0 L 0 0 0 8"
                    fill="none"
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="0.15"
                  />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
              <path
                d="M 0 75 Q 40 65 60 78 T 100 80 L 100 100 L 0 100 Z"
                fill="#60a5fa"
                fillOpacity="0.35"
              />
              <path
                d="M 10 20 Q 35 18 50 30 T 85 25 L 85 55 L 10 60 Z"
                fill="#86efac"
                fillOpacity="0.4"
              />
              <path
                d="M 0 50 L 100 52"
                stroke="#fff"
                strokeWidth="0.6"
                strokeDasharray="1 1"
              />
              <path
                d="M 50 0 L 52 100"
                stroke="#fff"
                strokeWidth="0.6"
                strokeDasharray="1 1"
              />
            </svg>
            {[
              "Brgy. Cogon",
              "Brgy. Linao",
              "Brgy. Dolores",
              "Brgy. Alegria",
              "Brgy. San Isidro",
            ].map((b) => {
              const ref = PROJECTS.find((p) => p.barangay === b)!;
              return (
                <div
                  key={b}
                  className="absolute text-[9.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 bg-white/80 rounded px-1.5 py-0.5 border border-white shadow-sm"
                  style={{ left: `${ref.mapX - 4}%`, top: `${ref.mapY - 10}%` }}
                >
                  {b}
                </div>
              );
            })}
            {sorted.map((p) => {
              const color =
                p.health === "red"
                  ? "#dc2626"
                  : p.health === "yellow"
                    ? "#f59e0b"
                    : "#10b981";
              const isSel = selectedId === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedId(p.id)}
                  className="absolute -translate-x-1/2 -translate-y-full group"
                  style={{ left: `${p.mapX}%`, top: `${p.mapY}%` }}
                >
                  <div className="relative">
                    <div
                      className={`w-8 h-8 rounded-full rounded-bl-none rotate-45 border-2 border-white shadow-lg ${p.health === "red" ? "animate-pulse" : ""} ${isSel ? "scale-125" : "group-hover:scale-110"} transition`}
                      style={{ backgroundColor: color }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-[9px] font-['Lexend:SemiBold',_sans-serif] text-white">
                        {p.code.slice(-3)}
                      </span>
                    </div>
                  </div>
                  <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 bg-neutral-900 text-white text-[10px] font-['Lexend:Medium',_sans-serif] rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none">
                    {p.name}
                  </div>
                </button>
              );
            })}
            <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur border border-neutral-200 rounded-lg p-2 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
              <div className="flex items-center gap-1 mb-0.5">
                <Flame size={10} className="text-red-600" />{" "}
                <strong className="font-['Lexend:Medium',_sans-serif]">
                  3 Critical
                </strong>{" "}
                clustered in Brgy. Cogon
              </div>
              <div className="text-neutral-500">
                Possible localized cause — investigate.
              </div>
            </div>
          </div>
        </div>
      )}

      {view === "calendar" &&
        (() => {
          const days = Array.from({ length: 35 }, (_, i) => i - 2); // offset grid
          const deadlines: Record<number, Project[]> = {};
          sorted.forEach((p) => {
            const d = new Date(p.deadline);
            const day = d.getDate();
            (deadlines[day] ||= []).push(p);
          });
          return (
            <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-200 bg-neutral-50">
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-neutral-700" />
                  <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                    Master Deadline Calendar · Sample Month
                  </span>
                </div>
                <span className="text-[10.5px] text-neutral-500">
                  Watch for collision days — multiple red pins on the same
                  Friday.
                </span>
              </div>
              <div className="grid grid-cols-7 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 border-b border-neutral-200">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="px-2 py-1.5">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((d, i) => {
                  const valid = d >= 1 && d <= 30;
                  const items = valid ? deadlines[d] || [] : [];
                  const isFri = i % 7 === 5;
                  return (
                    <div
                      key={i}
                      className={`min-h-[92px] border-b border-r border-neutral-100 p-1.5 ${valid ? "" : "bg-neutral-50/60"} ${isFri && items.length >= 2 ? "bg-red-50/40" : ""}`}
                    >
                      <div
                        className={`text-[10.5px] font-['Lexend:Medium',_sans-serif] tabular-nums ${valid ? "text-neutral-700" : "text-neutral-300"}`}
                      >
                        {valid ? d : ""}
                      </div>
                      <div className="mt-1 space-y-0.5">
                        {items.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => setSelectedId(p.id)}
                            className="w-full text-left flex items-center gap-1 truncate"
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.health === "red" ? "bg-red-500" : p.health === "yellow" ? "bg-amber-500" : "bg-emerald-500"}`}
                            />
                            <span className="text-[9.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 truncate">
                              {p.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      {/* Diagnostic Panel (right slide-out) */}
      {selected && (
        <div className="fixed right-6 top-6 bottom-6 w-[384px] bg-white border border-neutral-200 rounded-xl shadow-2xl overflow-y-auto z-40">
          <div className="sticky top-0 bg-white border-b border-neutral-100 p-4 flex items-start justify-between z-10">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: healthColor[selected.health] }}
                />
                Diagnostic Drill-Down
              </div>
              <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
                {selected.name}
              </div>
              <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                {selected.code} · {selected.lead}
              </div>
            </div>
            <button
              onClick={() => setSelectedId(null)}
              className="text-neutral-400 hover:text-neutral-800 p-1"
            >
              <X size={14} />
            </button>
          </div>

          <div className="p-4 space-y-4">
            <HealthChip health={selected.health} />

            {selected.bpaNode && selected.bottleneck ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-1.5 text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-red-700 mb-2">
                  <GitBranch size={11} /> BPA Node · Stuck
                </div>
                <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                  {selected.bpaNode}
                </div>
                <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-red-900 mt-1">
                  "{selected.bottleneck}" · blocked {selected.bottleneckAge}{" "}
                  days
                </div>

                <div className="mt-3 flex flex-col gap-1.5">
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] bg-red-600 text-white hover:bg-red-700">
                    <Zap size={12} /> Escalate to Mayor
                  </button>
                  <button className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11.5px] font-['Lexend:Medium',_sans-serif] bg-white border border-red-200 text-red-700 hover:bg-red-50">
                    <Bell size={12} /> Send Priority Nudge to City Accountant
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-start gap-2">
                <CheckCircle2 size={14} className="text-emerald-700 mt-0.5" />
                <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-emerald-900 leading-relaxed">
                  All BPA nodes flowing. No intervention required.
                </div>
              </div>
            )}

            <div>
              <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">
                Metrics
              </div>
              <div className="space-y-2 text-[11.5px] font-['Lexend:Regular',_sans-serif]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Status</span>
                  <span className="text-neutral-900">{selected.status}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Time Elapsed</span>
                  <span className="text-neutral-900 tabular-nums">
                    {selected.timePct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Work Completed</span>
                  <span className="text-neutral-900 tabular-nums">
                    {selected.tasksPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Budget Burn</span>
                  <span className="text-neutral-900 tabular-nums">
                    {selected.budgetPct}%
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Total Budget</span>
                  <span className="text-neutral-900 tabular-nums">
                    {peso(selected.totalBudget)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Next Milestone</span>
                  <span className="text-neutral-900">
                    {selected.nextMilestone}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Deadline</span>
                  <span className="text-neutral-900">{selected.deadline}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">
                Budget Burn Trend
              </div>
              <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
                <Sparkline
                  values={selected.burnSpark}
                  color={healthColor[selected.health]}
                />
                <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">
                  8-week sparkline · last reading {selected.budgetPct}%
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
              <Btn
                icon={<ClipboardList size={12} />}
                label="Open Board"
                variant="primary"
              />
              <Btn icon={<MessageSquare size={12} />} label="Message PM" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 15.1.B — BUDGET STATUS ====================

type BurnProject = {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  month: number;
  total: number;
};

const BURN_PROJECTS: BurnProject[] = [
  {
    id: "b1",
    name: "Eco-Park Phase 1",
    allocated: 50_000_000,
    spent: 29_000_000,
    month: 4,
    total: 12,
  },
  {
    id: "b2",
    name: "Coastal Road Rehab",
    allocated: 180_000_000,
    spent: 128_000_000,
    month: 4,
    total: 12,
  },
  {
    id: "b3",
    name: "Drainage · Dist. 4",
    allocated: 22_000_000,
    spent: 6_100_000,
    month: 4,
    total: 12,
  },
  {
    id: "b4",
    name: "Public Market Retrofit",
    allocated: 38_000_000,
    spent: 26_200_000,
    month: 4,
    total: 12,
  },
  {
    id: "b5",
    name: "Fire Station Annex",
    allocated: 18_000_000,
    spent: 9_400_000,
    month: 4,
    total: 12,
  },
  {
    id: "b6",
    name: "Equipment Pool · 2026",
    allocated: 12_000_000,
    spent: 3_100_000,
    month: 4,
    total: 12,
  },
];

function BurnGauge({ project }: { project: BurnProject }) {
  const spentPct = (project.spent / project.allocated) * 100;
  const timePct = (project.month / project.total) * 100;
  const delta = spentPct - timePct;
  const over = delta > 10;
  const under = delta < -10;

  const tone = over
    ? {
        arc: "stroke-red-500",
        chip: "text-red-700 bg-red-50 border-red-200",
        label: "Over-burning",
      }
    : under
      ? {
          arc: "stroke-amber-500",
          chip: "text-amber-700 bg-amber-50 border-amber-200",
          label: "Under-utilized",
        }
      : {
          arc: "stroke-emerald-500",
          chip: "text-emerald-700 bg-emerald-50 border-emerald-200",
          label: "Paced",
        };

  const R = 38;
  const C = 2 * Math.PI * R;
  const spentDash = (spentPct / 100) * C;
  const timeDash = (timePct / 100) * C;

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate pr-2">
          {project.name}
        </div>
        <span
          className={`text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-1.5 py-0.5 shrink-0 ${tone.chip}`}
        >
          {tone.label}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative w-[100px] h-[100px] shrink-0">
          <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              className="stroke-neutral-100"
              strokeWidth="8"
            />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              className="stroke-neutral-300"
              strokeWidth="8"
              strokeDasharray={`${timeDash} ${C - timeDash}`}
              strokeLinecap="round"
              opacity="0.4"
            />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              className={tone.arc}
              strokeWidth="8"
              strokeDasharray={`${spentDash} ${C - spentDash}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[17px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums leading-none">
              {spentPct.toFixed(0)}%
            </div>
            <div className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
              burned
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5 text-[10.5px] font-['Lexend:Regular',_sans-serif]">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Allocated</span>
            <span className="text-neutral-900 tabular-nums">
              {pesoShort(project.allocated)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Spent YTD</span>
            <span className="text-neutral-900 tabular-nums">
              {pesoShort(project.spent)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-neutral-500">Time Elapsed</span>
            <span className="text-neutral-900 tabular-nums">
              {timePct.toFixed(0)}%
            </span>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-neutral-100">
            <span className="text-neutral-500">Δ vs. pace</span>
            <span
              className={`tabular-nums font-['Lexend:Medium',_sans-serif] ${over ? "text-red-700" : under ? "text-amber-700" : "text-emerald-700"}`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)}pp
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function BudgetStatus() {
  const totalAlloc = BURN_PROJECTS.reduce((s, p) => s + p.allocated, 0);
  const totalSpent = BURN_PROJECTS.reduce((s, p) => s + p.spent, 0);
  const pct = (totalSpent / totalAlloc) * 100;

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Departmental Wallet"
        subtitle="Burn-rate gauges · Prevents December reversion to National Treasury"
        actions={
          <>
            <Btn icon={<Wallet size={13} />} label="Request Realignment" />
            <Btn
              icon={<TrendingUp size={13} />}
              label="Forecast to Dec 31"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Annual Allocation"
          value={pesoShort(totalAlloc)}
          trend="CY 2026 · Engineering"
          tone="neutral"
        />
        <Stat
          label="Burned YTD"
          value={pesoShort(totalSpent)}
          trend={`${pct.toFixed(0)}% of allocation`}
          tone="neutral"
        />
        <Stat
          label="Pace Target"
          value="33%"
          trend="April = month 4 of 12"
          tone="neutral"
        />
        <Stat
          label="Reversion Risk"
          value="Low"
          trend="On pace · no December scramble"
          tone="good"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        {BURN_PROJECTS.map((p) => (
          <BurnGauge key={p.id} project={p} />
        ))}
      </div>

      <div className="mt-5 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={14} className="text-neutral-600 mt-0.5 shrink-0" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">
            Reading the gauge:
          </span>{" "}
          the faint gray arc is the expected pace for today (month 4 of 12 =
          33%). The colored arc is actual spend.{" "}
          <span className="text-emerald-700 font-['Lexend:Medium',_sans-serif]">
            Paced
          </span>{" "}
          means spend ≈ time.{" "}
          <span className="text-red-700 font-['Lexend:Medium',_sans-serif]">
            Over-burning
          </span>{" "}
          risks running dry by Q3.{" "}
          <span className="text-amber-700 font-['Lexend:Medium',_sans-serif]">
            Under-utilized
          </span>{" "}
          risks the December scramble that forces unspent allotments back to the
          National Treasury.
        </div>
      </div>
    </div>
  );
}

// ==================== 15.1.C — TIMELINE REVIEW ====================

type GanttBar = {
  id: string;
  project: string;
  resource: string;
  start: number;
  end: number;
  color: string;
};

const GANTT_BARS: GanttBar[] = [
  {
    id: "g1",
    project: "Eco-Park · Concrete Pouring",
    resource: "Heavy Equipment Pool",
    start: 10,
    end: 18,
    color: "bg-orange-400",
  },
  {
    id: "g2",
    project: "Heavy Equipment Maintenance",
    resource: "Heavy Equipment Pool",
    start: 14,
    end: 22,
    color: "bg-red-400",
  },
  {
    id: "g3",
    project: "Coastal Road · Base Course",
    resource: "Laborer Pool A",
    start: 5,
    end: 28,
    color: "bg-blue-400",
  },
  {
    id: "g4",
    project: "Drainage · Survey Dist. 4",
    resource: "Surveyor Team",
    start: 8,
    end: 16,
    color: "bg-emerald-400",
  },
  {
    id: "g5",
    project: "Fire Station · Foundation",
    resource: "Laborer Pool B",
    start: 16,
    end: 32,
    color: "bg-purple-400",
  },
  {
    id: "g6",
    project: "Public Market · Roof Trusses",
    resource: "Welding Crew",
    start: 20,
    end: 30,
    color: "bg-rose-400",
  },
  {
    id: "g7",
    project: "Business Expo · Venue Prep",
    resource: "Events Team",
    start: 18,
    end: 24,
    color: "bg-cyan-400",
  },
  {
    id: "g8",
    project: "ICT Upgrade · Server Install",
    resource: "ICT Crew",
    start: 12,
    end: 20,
    color: "bg-amber-400",
  },
];

function TimelineReview() {
  const max = 35;
  // Detect resource conflicts: same resource overlapping
  const conflicts = useMemo(() => {
    const map = new Map<string, GanttBar[]>();
    GANTT_BARS.forEach((b) => {
      const arr = map.get(b.resource) || [];
      arr.push(b);
      map.set(b.resource, arr);
    });
    const overlaps: { a: GanttBar; b: GanttBar; start: number; end: number }[] =
      [];
    map.forEach((bars) => {
      for (let i = 0; i < bars.length; i++) {
        for (let j = i + 1; j < bars.length; j++) {
          const s = Math.max(bars[i].start, bars[j].start);
          const e = Math.min(bars[i].end, bars[j].end);
          if (s < e)
            overlaps.push({ a: bars[i], b: bars[j], start: s, end: e });
        }
      }
    });
    return overlaps;
  }, []);

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Project Timeline · Dynamic Gantt"
        subtitle="Resource conflict detection · April 1 → May 5, 2026"
        actions={
          <>
            <Btn icon={<Calendar size={13} />} label="Week View" />
            <Btn
              icon={<AlertTriangle size={13} />}
              label={`${conflicts.length} Conflicts`}
              variant="danger"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Active Timelines"
          value={GANTT_BARS.length.toString()}
          trend="Across 6 resource pools"
          tone="neutral"
        />
        <Stat
          label="Resource Conflicts"
          value={conflicts.length.toString()}
          trend="Overlapping commitments"
          tone="bad"
        />
        <Stat
          label="Peak Week"
          value="Apr 20–26"
          trend="5 parallel deployments"
          tone="warn"
        />
        <Stat
          label="Buffer Days"
          value="3"
          trend="Slack in master schedule"
          tone="neutral"
        />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5 overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[240px_1fr] gap-3 mb-3 pb-2 border-b border-neutral-100">
            <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
              Activity · Resource
            </div>
            <div className="relative h-5">
              {[0, 7, 14, 21, 28, 35].map((d) => (
                <div
                  key={d}
                  className="absolute top-0 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400"
                  style={{ left: `${(d / max) * 100}%` }}
                >
                  Apr {d + 1}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            {GANTT_BARS.map((b) => {
              const left = (b.start / max) * 100;
              const width = ((b.end - b.start) / max) * 100;
              const inConflict = conflicts.some(
                (c) => c.a.id === b.id || c.b.id === b.id,
              );
              return (
                <div
                  key={b.id}
                  className="grid grid-cols-[240px_1fr] gap-3 items-center"
                >
                  <div>
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                      {b.project}
                    </div>
                    <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
                      {b.resource}
                    </div>
                  </div>
                  <div className="relative h-7 bg-neutral-50 border border-neutral-100 rounded">
                    {[7, 14, 21, 28].map((d) => (
                      <div
                        key={d}
                        className="absolute top-0 bottom-0 w-px bg-neutral-100"
                        style={{ left: `${(d / max) * 100}%` }}
                      />
                    ))}
                    <div
                      className={`absolute top-1 bottom-1 ${b.color} rounded flex items-center px-2 ${inConflict ? "ring-2 ring-orange-500" : ""}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className="text-[9.5px] font-['Lexend:Medium',_sans-serif] text-white truncate">
                        {b.end - b.start}d
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conflict overlay band */}
          <div className="mt-5 pt-4 border-t border-neutral-100">
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">
              Detected Resource Conflicts
            </div>
            <div className="space-y-2">
              {conflicts.map((c, i) => (
                <div
                  key={i}
                  className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start gap-2"
                >
                  <AlertTriangle size={14} className="text-orange-600 mt-0.5" />
                  <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-orange-900 leading-relaxed">
                    <span className="font-['Lexend:Medium',_sans-serif]">
                      "{c.a.project}"
                    </span>{" "}
                    and{" "}
                    <span className="font-['Lexend:Medium',_sans-serif]">
                      "{c.b.project}"
                    </span>{" "}
                    both require the{" "}
                    <span className="font-['Lexend:Medium',_sans-serif]">
                      {c.a.resource}
                    </span>{" "}
                    during{" "}
                    <span className="tabular-nums">
                      Apr {c.start + 1} – Apr {c.end + 1}
                    </span>
                    . Physical resource cannot be in two places at once.
                  </div>
                </div>
              ))}
              {conflicts.length === 0 && (
                <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3 flex items-center gap-2">
                  <CheckCircle2 size={13} /> No resource conflicts detected.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 15.2.A — TEAM ASSIGNMENTS ====================

type RosterMember = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  workloadPct: number;
  rating: number;
};

const ROSTER: RosterMember[] = [
  {
    id: "e1",
    name: "Engr. Mario Santos",
    role: "Civil Engineer III",
    skills: ["Structural", "Concrete"],
    workloadPct: 62,
    rating: 4.8,
  },
  {
    id: "e2",
    name: "Engr. Lea Villegas",
    role: "Civil Engineer II",
    skills: ["Drainage", "Survey"],
    workloadPct: 48,
    rating: 4.6,
  },
  {
    id: "e3",
    name: "Engr. Rafael Tambago",
    role: "Civil Engineer II",
    skills: ["Structural", "Welding"],
    workloadPct: 85,
    rating: 4.4,
  },
  {
    id: "e4",
    name: "Engr. Rolando Dacayo",
    role: "Dept. Head",
    skills: ["PM", "Contracts"],
    workloadPct: 92,
    rating: 4.9,
  },
  {
    id: "e5",
    name: "Mr. Arnel Padojinog",
    role: "Foreman",
    skills: ["Concrete", "Labor"],
    workloadPct: 55,
    rating: 4.5,
  },
  {
    id: "e6",
    name: "Mr. Danilo Escario",
    role: "Heavy Equip. Operator",
    skills: ["Operator", "Mechanical"],
    workloadPct: 38,
    rating: 4.7,
  },
  {
    id: "e7",
    name: "Ms. Cherry Lumapas",
    role: "Site Engineer",
    skills: ["QA/QC", "Survey"],
    workloadPct: 71,
    rating: 4.6,
  },
  {
    id: "e8",
    name: "Mr. Jonathan Pial",
    role: "Laborer Team Lead",
    skills: ["Labor", "Concrete"],
    workloadPct: 44,
    rating: 4.3,
  },
  {
    id: "e9",
    name: "Engr. Rosario Villamor",
    role: "Electrical Engineer",
    skills: ["Electrical", "ICT"],
    workloadPct: 58,
    rating: 4.8,
  },
  {
    id: "e10",
    name: "Mr. Jose Tumagsang",
    role: "Welder",
    skills: ["Welding", "Fabrication"],
    workloadPct: 35,
    rating: 4.5,
  },
];

function TeamAssignments() {
  const [roster, setRoster] = useState<RosterMember[]>(ROSTER);
  const [team, setTeam] = useState<RosterMember[]>([]);
  const [dragId, setDragId] = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);

  const moveToTeam = (emp: RosterMember) => {
    if (team.find((t) => t.id === emp.id)) return;
    setTeam([...team, emp]);
    setRoster(roster.filter((r) => r.id !== emp.id));
  };
  const moveToRoster = (emp: RosterMember) => {
    setRoster([...roster, emp]);
    setTeam(team.filter((t) => t.id !== emp.id));
  };

  const autoFill = () => {
    setAutoFilling(true);
    setTimeout(() => {
      // GA picks 5 best available: prioritize low workload + high rating + has "Concrete" skill
      const scored = [...roster].sort((a, b) => {
        const aScore =
          (a.skills.includes("Concrete") ? 20 : 0) +
          (100 - a.workloadPct) * 0.6 +
          a.rating * 10;
        const bScore =
          (b.skills.includes("Concrete") ? 20 : 0) +
          (100 - b.workloadPct) * 0.6 +
          b.rating * 10;
        return bScore - aScore;
      });
      const picks = scored.slice(0, 5);
      setTeam([...team, ...picks]);
      setRoster(roster.filter((r) => !picks.find((p) => p.id === r.id)));
      setAutoFilling(false);
    }, 1400);
  };

  const workloadTone = (w: number) =>
    w >= 85
      ? "text-red-600 bg-red-50"
      : w >= 70
        ? "text-amber-600 bg-amber-50"
        : "text-emerald-700 bg-emerald-50";

  const EmpCard = ({
    emp,
    onClick,
    inTeam,
  }: {
    emp: RosterMember;
    onClick: (e: RosterMember) => void;
    inTeam?: boolean;
  }) => (
    <div
      draggable
      onDragStart={() => setDragId(emp.id)}
      onDragEnd={() => setDragId(null)}
      className={`bg-white border rounded-lg p-3 cursor-grab active:cursor-grabbing hover:shadow-sm transition ${dragId === emp.id ? "opacity-40" : ""} ${inTeam ? "border-emerald-300" : "border-neutral-200"}`}
      onClick={() => onClick(emp)}
    >
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700 shrink-0">
          {emp.name
            .split(" ")
            .slice(-2)
            .map((n) => n[0])
            .join("")}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
            {emp.name}
          </div>
          <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
            {emp.role}
          </div>
        </div>
        <div className="flex items-center gap-0.5 text-[10px] font-['Lexend:Medium',_sans-serif] text-amber-600 shrink-0">
          <Star size={10} className="fill-amber-500 stroke-amber-500" />{" "}
          {emp.rating}
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-2">
        {emp.skills.map((s) => (
          <span
            key={s}
            className="text-[9px] font-['Lexend:Medium',_sans-serif] uppercase bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5"
          >
            {s}
          </span>
        ))}
        <span
          className={`ml-auto text-[9.5px] font-['Lexend:Medium',_sans-serif] rounded px-1.5 py-0.5 tabular-nums ${workloadTone(emp.workloadPct)}`}
        >
          {emp.workloadPct}% load
        </span>
      </div>
    </div>
  );

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Resource Deployment · Eco-Park Task Force"
        subtitle="Drag-and-drop roster · Genetic Algorithm available"
        actions={
          <>
            <Btn icon={<Plus size={13} />} label="New Task Force" />
            <button
              onClick={autoFill}
              disabled={autoFilling}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90"
            >
              {autoFilling ? (
                <Zap size={13} className="animate-pulse" />
              ) : (
                <Sparkles size={13} />
              )}
              {autoFilling ? "Solving…" : "Auto-Fill Team (GA)"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Roster Pool"
          value={roster.length.toString()}
          trend="Available engineers & laborers"
          tone="neutral"
        />
        <Stat
          label="Team Size"
          value={team.length.toString()}
          trend="Target: 5–8"
          tone={team.length >= 5 && team.length <= 8 ? "good" : "warn"}
        />
        <Stat
          label="Avg. Team Load"
          value={
            team.length
              ? `${Math.round(team.reduce((s, t) => s + t.workloadPct, 0) / team.length)}%`
              : "—"
          }
          trend="After deployment"
          tone="neutral"
        />
        <Stat
          label="Skill Coverage"
          value={`${new Set(team.flatMap((t) => t.skills)).size}`}
          trend="Unique skills in team"
          tone="good"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div
          className="bg-neutral-50 border border-neutral-200 rounded-xl p-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const emp = team.find((t) => t.id === dragId);
            if (emp) moveToRoster(emp);
            setDragId(null);
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-neutral-900" />
            <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Department Roster
            </div>
            <div className="ml-auto text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              {roster.length} available
            </div>
          </div>
          <div className="space-y-2 min-h-[300px]">
            {roster.map((e) => (
              <EmpCard key={e.id} emp={e} onClick={moveToTeam} />
            ))}
            {roster.length === 0 && (
              <div className="text-center text-[11.5px] text-neutral-400 py-8">
                Roster exhausted
              </div>
            )}
          </div>
        </div>

        <div
          className={`bg-emerald-50/40 border-2 border-dashed rounded-xl p-4 ${dragId ? "border-emerald-500 bg-emerald-50" : "border-emerald-200"}`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={() => {
            const emp = roster.find((r) => r.id === dragId);
            if (emp) moveToTeam(emp);
            setDragId(null);
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <HardHat size={14} className="text-emerald-700" />
            <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Eco-Park Task Force
            </div>
            <div className="ml-auto text-[10.5px] font-['Lexend:Regular',_sans-serif] text-emerald-700">
              {team.length} deployed
            </div>
          </div>
          <div className="space-y-2 min-h-[300px]">
            {team.map((e) => (
              <EmpCard key={e.id} emp={e} onClick={moveToRoster} inTeam />
            ))}
            {team.length === 0 && (
              <div className="text-center text-[11.5px] text-neutral-400 py-16 border-2 border-dashed border-emerald-200 rounded-lg">
                <UserPlus size={24} className="mx-auto mb-2 opacity-40" />
                Drag employees here or click Auto-Fill (GA)
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-start gap-3">
        <Sparkles size={14} className="text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-indigo-900 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif]">
            GA safeguard.
          </span>{" "}
          Auto-Fill optimizes for lowest current workload × matching skills ×
          performance rating. Prevents the classic Dept. Head habit of
          repeatedly drafting the same favorite staff into every task force
          until they burn out.
        </div>
      </div>
    </div>
  );
}

// ==================== 15.2.B — LEADER ASSIGNMENTS ====================

type LeaderRole = {
  id: string;
  title: string;
  responsibilities: string[];
  permissions: string[];
  assignee?: RosterMember;
};

const LEADER_ROLES: LeaderRole[] = [
  {
    id: "l1",
    title: "Site Supervisor",
    responsibilities: [
      "Approve daily photos",
      "Logbook sign-off",
      "Safety incident triage",
    ],
    permissions: [
      "mobile.approve_photos",
      "mobile.logbook_write",
      "mobile.incident_create",
    ],
  },
  {
    id: "l2",
    title: "QA/QC Officer",
    responsibilities: ["Material testing sign-off", "Inspection checklists"],
    permissions: ["mobile.qc_forms", "mobile.test_results"],
  },
  {
    id: "l3",
    title: "Safety Officer",
    responsibilities: ["Toolbox talks", "PPE audits"],
    permissions: ["mobile.safety_log", "mobile.ppe_audit"],
  },
  {
    id: "l4",
    title: "Procurement Liaison",
    responsibilities: ["Material requests", "Vendor coordination"],
    permissions: ["mobile.mr_create"],
  },
];

function LeaderAssignments() {
  const [assignments, setAssignments] = useState<LeaderRole[]>(LEADER_ROLES);
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const available = ROSTER.filter(
    (r) => !assignments.find((a) => a.assignee?.id === r.id),
  );

  const assign = (roleId: string, emp: RosterMember) => {
    setAssignments(
      assignments.map((a) => (a.id === roleId ? { ...a, assignee: emp } : a)),
    );
    setPickerOpen(null);
  };
  const unassign = (roleId: string) => {
    setAssignments(
      assignments.map((a) =>
        a.id === roleId ? { ...a, assignee: undefined } : a,
      ),
    );
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Leader Assignments · Project Managers"
        subtitle="Tagging upgrades mobile app permissions · Eco-Park Task Force"
        actions={
          <>
            <Btn icon={<Shield size={13} />} label="Permission Matrix" />
            <Btn
              icon={<CheckCircle2 size={13} />}
              label="Publish Roles"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Leadership Slots"
          value={LEADER_ROLES.length.toString()}
          trend="Required roles"
          tone="neutral"
        />
        <Stat
          label="Filled"
          value={assignments.filter((a) => a.assignee).length.toString()}
          trend={`${LEADER_ROLES.length - assignments.filter((a) => a.assignee).length} remaining`}
          tone={assignments.every((a) => a.assignee) ? "good" : "warn"}
        />
        <Stat
          label="Permissions Elevated"
          value={assignments
            .filter((a) => a.assignee)
            .reduce((s, a) => s + a.permissions.length, 0)
            .toString()}
          trend="Mobile app scopes"
          tone="neutral"
        />
        <Stat
          label="Approval Depth"
          value="3 layers"
          trend="Laborer → Supervisor → Head"
          tone="good"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {assignments.map((role) => (
          <div
            key={role.id}
            className="bg-white border border-neutral-200 rounded-xl p-5"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const emp = ROSTER.find((r) => r.id === dragId);
              if (emp) assign(role.id, emp);
              setDragId(null);
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Crown size={14} className="text-amber-600" />
                  <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                    {role.title}
                  </div>
                </div>
                <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
                  {role.responsibilities.join(" · ")}
                </div>
              </div>
              <span
                className={`text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-1.5 py-0.5 ${role.assignee ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-neutral-500 bg-neutral-50 border-neutral-200"}`}
              >
                {role.assignee ? "Assigned" : "Vacant"}
              </span>
            </div>

            {role.assignee ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-emerald-200 to-emerald-400 flex items-center justify-center text-[11px] font-['Lexend:SemiBold',_sans-serif] text-emerald-900">
                    {role.assignee.name
                      .split(" ")
                      .slice(-2)
                      .map((n) => n[0])
                      .join("")}
                  </div>
                  <div className="flex-1">
                    <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                      {role.assignee.name}
                    </div>
                    <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
                      {role.assignee.role}
                    </div>
                  </div>
                  <button
                    onClick={() => unassign(role.id)}
                    className="text-neutral-400 hover:text-red-600 p-1"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="mt-3 pt-3 border-t border-emerald-200">
                  <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-emerald-700 mb-1.5">
                    Permissions Elevated
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {role.permissions.map((p) => (
                      <span
                        key={p}
                        className="text-[9.5px] font-mono bg-white border border-emerald-200 text-emerald-800 rounded px-1.5 py-0.5"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={() =>
                  setPickerOpen(pickerOpen === role.id ? null : role.id)
                }
                className="w-full border-2 border-dashed border-neutral-200 hover:border-neutral-400 rounded-lg p-6 text-center text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-700"
              >
                <UserCheck size={20} className="mx-auto mb-1.5 opacity-50" />
                Drop employee here · or tap to pick
              </button>
            )}

            {pickerOpen === role.id && (
              <div className="mt-2 bg-neutral-50 border border-neutral-200 rounded-lg p-2 space-y-1 max-h-[200px] overflow-y-auto">
                {available.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => assign(role.id, e)}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-white text-left"
                  >
                    <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                      {e.name
                        .split(" ")
                        .slice(-2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                        {e.name}
                      </div>
                      <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
                        {e.role}
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-neutral-400" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
        <Shield size={14} className="text-amber-700 mt-0.5 shrink-0" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-amber-900 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif]">
            Automatic permission elevation.
          </span>{" "}
          Tagging someone as Site Supervisor instantly activates{" "}
          <span className="font-mono">mobile.approve_photos</span> on their
          device. Laborers' daily photos will now route through them first — the
          Dept. Head no longer has to triage 200 timesheet images.
        </div>
      </div>
    </div>
  );
}

// ==================== 15.2.C — CHAIN OF COMMAND ====================

type OrgNode = { id: string; title: string; person?: string; level: number };

const ORG_NODES: OrgNode[] = [
  { id: "n1", title: "Laborer", person: "Pool · 12 members", level: 0 },
  { id: "n2", title: "Site Foreman", person: "Mr. Arnel Padojinog", level: 1 },
  {
    id: "n3",
    title: "Site Supervisor",
    person: "Engr. Mario Santos",
    level: 2,
  },
  {
    id: "n4",
    title: "Project Manager",
    person: "Engr. Rolando Dacayo",
    level: 3,
  },
  {
    id: "n5",
    title: "Department Head",
    person: "Engr. Rolando Dacayo",
    level: 4,
  },
];

function ChainOfCommand() {
  const [flowDemo, setFlowDemo] = useState(false);
  const [flowStep, setFlowStep] = useState(0);

  const runDemo = () => {
    setFlowDemo(true);
    setFlowStep(0);
    const steps = [0, 1, 2, 3, 4];
    steps.forEach((s, i) => setTimeout(() => setFlowStep(s), i * 700));
    setTimeout(() => setFlowDemo(false), steps.length * 700 + 1200);
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Chain of Command · Approval Matrix"
        subtitle="Dynamic org chart builder · Eco-Park Task Force BPA"
        actions={
          <>
            <Btn icon={<GitBranch size={13} />} label="Branch Flow" />
            <Btn
              icon={<Zap size={13} />}
              label="Simulate Routing"
              variant="primary"
              onClick={runDemo}
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Approval Layers"
          value={ORG_NODES.length.toString()}
          trend="Laborer → Dept. Head"
          tone="neutral"
        />
        <Stat
          label="Avg. Routing Time"
          value="4.2h"
          trend="Per task completion"
          tone="good"
        />
        <Stat
          label="Auto-Escalations"
          value="0"
          trend="No SLA breaches"
          tone="good"
        />
        <Stat
          label="BPA Pipeline"
          value="Active"
          trend="Wired to mobile app"
          tone="good"
        />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <GitBranch size={15} className="text-neutral-900" />
          <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
            Task Completion Routing
          </div>
          <div className="ml-auto text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            When a laborer marks a task complete on the mobile app, it
            physically travels this exact path.
          </div>
        </div>

        <div className="relative flex items-stretch justify-between gap-4">
          {ORG_NODES.map((node, i) => {
            const active = flowDemo && flowStep >= i;
            return (
              <React.Fragment key={node.id}>
                <div className={`flex-1 relative`}>
                  <div
                    className={`bg-white border-2 rounded-xl p-4 transition-all ${active ? "border-emerald-500 shadow-lg shadow-emerald-100 -translate-y-1" : "border-neutral-200"}`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-['Lexend:SemiBold',_sans-serif] ${active ? "bg-emerald-500 text-white" : "bg-neutral-100 text-neutral-600"}`}
                      >
                        {node.level}
                      </div>
                      <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                        {node.title}
                      </div>
                    </div>
                    <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
                      {node.person}
                    </div>
                    {active && i < ORG_NODES.length - 1 && (
                      <div className="mt-2 text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase text-emerald-700 flex items-center gap-1">
                        <Zap size={9} /> routing…
                      </div>
                    )}
                    {active && i === ORG_NODES.length - 1 && (
                      <div className="mt-2 text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase text-emerald-700 flex items-center gap-1">
                        <CheckCircle2 size={9} /> approved
                      </div>
                    )}
                  </div>
                </div>
                {i < ORG_NODES.length - 1 && (
                  <div className="flex items-center shrink-0 pt-5">
                    <ChevronRight
                      size={20}
                      className={
                        active && flowStep > i
                          ? "text-emerald-500"
                          : "text-neutral-300"
                      }
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="mt-6 pt-6 border-t border-neutral-100 grid grid-cols-2 gap-4">
          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">
              Route Configuration
            </div>
            <div className="space-y-1.5">
              {ORG_NODES.map((n, i) => (
                <div
                  key={n.id}
                  className="flex items-center gap-2 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600"
                >
                  <span className="w-5 h-5 rounded bg-neutral-100 text-neutral-700 flex items-center justify-center text-[10px] font-['Lexend:Medium',_sans-serif]">
                    {i + 1}
                  </span>
                  <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">
                    {n.title}
                  </span>
                  <span className="text-neutral-400">→</span>
                  <span className="truncate">{n.person}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4">
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">
              BPA Rules
            </div>
            <div className="space-y-1.5 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-600 mt-0.5" />{" "}
                Approvals cascade upward only
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-600 mt-0.5" />{" "}
                48h SLA auto-escalates to next tier
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-600 mt-0.5" />{" "}
                Photos + GPS required at level 0
              </div>
              <div className="flex items-start gap-1.5">
                <CheckCircle2 size={11} className="text-emerald-600 mt-0.5" />{" "}
                Immutable audit trail per hop
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 16.1.A — PROCESS MINING GRAPHS ====================

type FlowNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  slaHours: number;
  actualHours: number;
  inQueue: number;
  officer?: string;
};

type FlowEdge = { from: string; to: string };

const FLOW_NODES: FlowNode[] = [
  {
    id: "n1",
    label: "Site Survey",
    x: 60,
    y: 120,
    slaHours: 24,
    actualHours: 22,
    inQueue: 3,
    officer: "Survey Team",
  },
  {
    id: "n2",
    label: "Cost Estimate",
    x: 230,
    y: 120,
    slaHours: 48,
    actualHours: 46,
    inQueue: 8,
    officer: "Budget Officer",
  },
  {
    id: "n3",
    label: "Legal Review",
    x: 400,
    y: 120,
    slaHours: 72,
    actualHours: 288,
    inQueue: 42,
    officer: "Atty. Reyes",
  },
  {
    id: "n4",
    label: "Procurement",
    x: 570,
    y: 60,
    slaHours: 120,
    actualHours: 144,
    inQueue: 12,
    officer: "BAC Secretariat",
  },
  {
    id: "n5",
    label: "Engineering QA",
    x: 570,
    y: 180,
    slaHours: 48,
    actualHours: 54,
    inQueue: 6,
    officer: "QA Team",
  },
  {
    id: "n6",
    label: "Execution",
    x: 740,
    y: 120,
    slaHours: 0,
    actualHours: 0,
    inQueue: 0,
    officer: "Field Crew",
  },
];

const FLOW_EDGES: FlowEdge[] = [
  { from: "n1", to: "n2" },
  { from: "n2", to: "n3" },
  { from: "n3", to: "n4" },
  { from: "n3", to: "n5" },
  { from: "n4", to: "n6" },
  { from: "n5", to: "n6" },
];

function edgeTone(_fromNode: FlowNode, toNode: FlowNode) {
  const ratio =
    toNode.slaHours === 0 ? 1 : toNode.actualHours / toNode.slaHours;
  if (ratio > 2)
    return { stroke: "#dc2626", width: 6, pulse: true, label: "Critical" };
  if (ratio > 1.2)
    return { stroke: "#f59e0b", width: 4, pulse: false, label: "Delayed" };
  return { stroke: "#10b981", width: 2, pulse: false, label: "On SLA" };
}

function ProcessMiningGraphs() {
  const [highlight, setHighlight] = useState(false);
  const nodeById = useMemo(
    () => Object.fromEntries(FLOW_NODES.map((n) => [n.id, n])),
    [],
  );

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Live Workflow Topology"
        subtitle="Process-mined from BPA timestamps · Standard Infrastructure SOP"
        actions={
          <>
            <Btn
              icon={<Filter size={13} />}
              label="Highlight Delays"
              onClick={() => setHighlight((h) => !h)}
            />
            <Btn
              icon={<Activity size={13} />}
              label="Replay Last 24h"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Avg. Cycle Time"
          value="18.4d"
          trend="SOP target · 9d"
          tone="warn"
        />
        <Stat
          label="Critical Edges"
          value="1"
          trend="Legal Review bottleneck"
          tone="bad"
        />
        <Stat
          label="Documents In-Flight"
          value="71"
          trend="Across all stages"
          tone="neutral"
        />
        <Stat
          label="SLA Compliance"
          value="64%"
          trend="Down 12pp from last month"
          tone="bad"
        />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch size={15} className="text-neutral-900" />
          <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
            Department SOP Flow Map
          </div>
          <div className="ml-auto text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            Edge thickness ∝ throughput delay
          </div>
        </div>

        <div className="relative bg-neutral-50 border border-neutral-100 rounded-lg overflow-hidden">
          <svg viewBox="0 0 840 260" className="w-full h-[320px]">
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
              </marker>
              <marker
                id="arrow-red"
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto"
              >
                <path d="M0,0 L10,5 L0,10 z" fill="#dc2626" />
              </marker>
            </defs>

            {FLOW_EDGES.map((e, i) => {
              const from = nodeById[e.from];
              const to = nodeById[e.to];
              const t = edgeTone(from, to);
              const dim = highlight && !t.pulse && t.label === "On SLA";
              return (
                <g key={i} opacity={dim ? 0.25 : 1}>
                  <line
                    x1={from.x + 60}
                    y1={from.y}
                    x2={to.x - 60}
                    y2={to.y}
                    stroke={t.stroke}
                    strokeWidth={t.width}
                    markerEnd={
                      t.stroke === "#dc2626" ? "url(#arrow-red)" : "url(#arrow)"
                    }
                    className={t.pulse ? "animate-pulse" : ""}
                    strokeLinecap="round"
                  />
                  <text
                    x={(from.x + to.x) / 2}
                    y={(from.y + to.y) / 2 - 8}
                    textAnchor="middle"
                    className="text-[9px] font-['Lexend:Medium',_sans-serif]"
                    fill={t.stroke}
                  >
                    {to.actualHours}h / {to.slaHours}h SLA
                  </text>
                </g>
              );
            })}

            {FLOW_NODES.map((n) => {
              const isBottleneck = n.id === "n3";
              return (
                <g key={n.id}>
                  <rect
                    x={n.x - 60}
                    y={n.y - 24}
                    width="120"
                    height="48"
                    rx="10"
                    fill={isBottleneck ? "#fef2f2" : "#ffffff"}
                    stroke={isBottleneck ? "#dc2626" : "#d4d4d8"}
                    strokeWidth={isBottleneck ? 2 : 1}
                    className={isBottleneck ? "animate-pulse" : ""}
                  />
                  <text
                    x={n.x}
                    y={n.y - 4}
                    textAnchor="middle"
                    className="text-[11px] font-['Lexend:SemiBold',_sans-serif]"
                    fill="#171717"
                  >
                    {n.label}
                  </text>
                  <text
                    x={n.x}
                    y={n.y + 12}
                    textAnchor="middle"
                    className="text-[9px] font-['Lexend:Regular',_sans-serif]"
                    fill={isBottleneck ? "#dc2626" : "#737373"}
                  >
                    queue: {n.inQueue} docs
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="mt-4 flex items-center gap-4 text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 pt-3 border-t border-neutral-100">
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-0.5 bg-emerald-500" /> On SLA
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-1 bg-amber-500" /> Delayed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-6 h-1.5 bg-red-600 animate-pulse" /> Critical ·
            pulsing
          </div>
          <div className="ml-auto text-neutral-600">
            Legal Review → Procurement edge is 4× SLA. Click Delay Node Alerts
            to diagnose.
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 16.1.B — DELAY NODE ALERTS ====================

type DelayNode = {
  id: string;
  name: string;
  officer: string;
  slaHours: number;
  actualHours: number;
  backlog: number;
  burnoutFlag: boolean;
  onLeave: boolean;
  trendDelta: number;
};

const DELAY_NODES: DelayNode[] = [
  {
    id: "d1",
    name: "Legal Review",
    officer: "Atty. Maria Reyes",
    slaHours: 72,
    actualHours: 288,
    backlog: 42,
    burnoutFlag: true,
    onLeave: false,
    trendDelta: 180,
  },
  {
    id: "d2",
    name: "Procurement Clearance",
    officer: "BAC Secretariat",
    slaHours: 120,
    actualHours: 144,
    backlog: 12,
    burnoutFlag: false,
    onLeave: false,
    trendDelta: 20,
  },
  {
    id: "d3",
    name: "Engineering QA",
    officer: "Engr. Cherry Lumapas",
    slaHours: 48,
    actualHours: 54,
    backlog: 6,
    burnoutFlag: false,
    onLeave: false,
    trendDelta: 12,
  },
];

function DelayNodeAlerts() {
  const [selected, setSelected] = useState<DelayNode>(DELAY_NODES[0]);
  const overPct = (
    (selected.actualHours / selected.slaHours - 1) *
    100
  ).toFixed(0);

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Delay Node Diagnostic"
        subtitle="AI-identified SLA violations · cross-referenced with HRMO Burnout Radar"
        actions={
          <>
            <Btn icon={<MessageSquare size={13} />} label="Notify Officer" />
            <Btn
              icon={<Target size={13} />}
              label="Open Intervention Mandates"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-[0.9fr_1.4fr] gap-4">
        <div className="space-y-2">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 px-1 mb-1">
            Flagged Nodes
          </div>
          {DELAY_NODES.map((n) => {
            const isActive = selected.id === n.id;
            const severity = n.actualHours / n.slaHours;
            const tone =
              severity > 2
                ? {
                    border: "border-red-300",
                    bg: "bg-red-50",
                    chip: "bg-red-600 text-white",
                  }
                : severity > 1.2
                  ? {
                      border: "border-amber-300",
                      bg: "bg-amber-50",
                      chip: "bg-amber-500 text-white",
                    }
                  : {
                      border: "border-neutral-200",
                      bg: "bg-white",
                      chip: "bg-emerald-500 text-white",
                    };
            return (
              <button
                key={n.id}
                onClick={() => setSelected(n)}
                className={`w-full text-left border rounded-xl p-3 transition ${isActive ? "border-neutral-900 shadow-sm" : tone.border} ${tone.bg}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                    {n.name}
                  </div>
                  <span
                    className={`text-[9px] font-['Lexend:Medium',_sans-serif] uppercase rounded px-1.5 py-0.5 ${tone.chip}`}
                  >
                    {severity.toFixed(1)}× SLA
                  </span>
                </div>
                <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                  {n.officer}
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
                  <span>
                    backlog:{" "}
                    <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums">
                      {n.backlog}
                    </span>
                  </span>
                  <span className="text-neutral-300">·</span>
                  <span className="flex items-center gap-0.5 text-red-700">
                    <TrendingUp size={10} /> +{n.trendDelta}h
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                Diagnostic Panel
              </div>
              <div className="text-[17px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
                {selected.name}
              </div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                Assigned officer · {selected.officer}
              </div>
            </div>
            <div className="bg-red-600 text-white rounded-lg px-3 py-2 text-center">
              <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider opacity-80">
                SLA Violation
              </div>
              <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">
                +{overPct}%
              </div>
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-2">
              <Brain size={14} className="text-red-700 mt-0.5 shrink-0" />
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-red-900 leading-relaxed">
                <span className="font-['Lexend:Medium',_sans-serif]">
                  AI Insight.
                </span>{" "}
                This node is violating its {selected.slaHours}-hour Service
                Level Agreement. The backlog is currently{" "}
                <span className="font-['Lexend:Medium',_sans-serif]">
                  {selected.backlog} documents
                </span>
                . The assigned officer{" "}
                {selected.burnoutFlag && (
                  <>
                    has been flagged by the{" "}
                    <span className="font-['Lexend:Medium',_sans-serif]">
                      HR Burnout Radar
                    </span>{" "}
                    (78% sustained load over 14 days)
                  </>
                )}
                . Extrapolated clearance without intervention:{" "}
                <span className="font-['Lexend:Medium',_sans-serif]">
                  21+ business days
                </span>
                .
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-3">
              <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                SLA Target
              </div>
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums mt-0.5">
                {selected.slaHours}h
              </div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-red-600">
                Actual Avg.
              </div>
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-red-700 tabular-nums mt-0.5">
                {selected.actualHours}h
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-amber-700">
                Backlog
              </div>
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-amber-800 tabular-nums mt-0.5">
                {selected.backlog} docs
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-lg p-3">
            <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-2">
              Cross-Signal Correlation
            </div>
            <div className="space-y-1.5 text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
              {selected.burnoutFlag && (
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> HRMO
                  Burnout Radar · flagged 5 days ago
                </div>
              )}
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />{" "}
                Incoming volume up 38% MoM
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> No
                deputy currently configured for rerouting
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                Document quality score · nominal
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 16.1.C — INTERVENTION MANDATES ====================

type Mandate = {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  impact: string;
  cost: string;
};

const MANDATES: Mandate[] = [
  {
    id: "m1",
    label: "Temporarily Route to Deputy Officer",
    description:
      "Reroute pending documents to Atty. Nolasco (current load: 22%) for the next 7 days.",
    icon: <GitMerge size={14} />,
    impact: "Clears backlog in ~3 days",
    cost: "Zero additional cost",
  },
  {
    id: "m2",
    label: "Authorize Overtime for this Node",
    description: "Grant Atty. Reyes 20 hours of authorized OT to clear queue.",
    icon: <Clock size={14} />,
    impact: "Clears backlog in ~5 days",
    cost: "₱18,400 OT budget",
  },
  {
    id: "m3",
    label: "Request GA Staff Reassignment",
    description:
      "Genetic Algorithm re-scores all legal officers and rebalances workload.",
    icon: <Sparkles size={14} />,
    impact: "Permanent flow optimization",
    cost: "Zero additional cost",
  },
  {
    id: "m4",
    label: "Escalate to City Administrator",
    description:
      "Route the bottleneck report directly to the Mayor's Office for executive action.",
    icon: <Zap size={14} />,
    impact: "Policy-level response",
    cost: "Consumes political capital",
  },
];

function InterventionMandates() {
  const [executing, setExecuting] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const execute = (id: string) => {
    setExecuting(id);
    setTimeout(() => {
      setApplied(new Set([...applied, id]));
      setExecuting(null);
    }, 1400);
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Intervention Mandates · Legal Review Node"
        subtitle="One-click BPA rerouting commands · GA-orchestrated"
        actions={
          <>
            <Btn icon={<FileText size={13} />} label="View Node Diagnostic" />
            <Btn
              icon={<Shield size={13} />}
              label="Audit Trail"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Bottleneck Cost"
          value="₱420K/day"
          trend="Project delay penalty estimate"
          tone="bad"
        />
        <Stat
          label="Available Mandates"
          value={MANDATES.length.toString()}
          trend="Authority-scoped to Dept. Head"
          tone="neutral"
        />
        <Stat
          label="Mandates Applied"
          value={applied.size.toString()}
          trend="Active interventions"
          tone="good"
        />
        <Stat
          label="Projected Clearance"
          value={applied.size > 0 ? "~3d" : "21d"}
          trend={
            applied.size > 0 ? "Post-intervention" : "Without intervention"
          }
          tone={applied.size > 0 ? "good" : "bad"}
        />
      </div>

      <div className="bg-gradient-to-br from-red-50 to-amber-50 border border-red-200 rounded-xl p-5 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center shrink-0 animate-pulse">
            <Flame size={18} className="text-white" />
          </div>
          <div className="flex-1">
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              Active Traffic Jam · Legal Review · Atty. Reyes
            </div>
            <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 mt-0.5">
              42 documents queued · 288h average clearance (4× SLA) · HRMO
              burnout flag active. Select an intervention below to instantly
              command the Genetic Algorithm to reroute digital paperwork.
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {MANDATES.map((m) => {
          const isApplied = applied.has(m.id);
          const isExec = executing === m.id;
          return (
            <div
              key={m.id}
              className={`bg-white border rounded-xl p-5 transition ${isApplied ? "border-emerald-400" : "border-neutral-200"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isApplied ? "bg-emerald-600 text-white" : "bg-neutral-900 text-white"}`}
                  >
                    {isApplied ? <CheckCircle2 size={14} /> : m.icon}
                  </div>
                  <div>
                    <div className="text-[12.5px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                      {m.label}
                    </div>
                    <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5 leading-relaxed">
                      {m.description}
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2.5">
                  <div className="text-[9px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                    Projected Impact
                  </div>
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-emerald-700 mt-0.5">
                    {m.impact}
                  </div>
                </div>
                <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-2.5">
                  <div className="text-[9px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                    Cost
                  </div>
                  <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 mt-0.5">
                    {m.cost}
                  </div>
                </div>
              </div>
              <button
                onClick={() => execute(m.id)}
                disabled={isExec || isApplied}
                className={`w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition ${
                  isApplied
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default"
                    : isExec
                      ? "bg-indigo-100 text-indigo-700 cursor-wait"
                      : "bg-neutral-900 text-white hover:bg-neutral-800"
                }`}
              >
                {isApplied ? (
                  <>
                    <CheckCircle2 size={13} /> Mandate Active
                  </>
                ) : isExec ? (
                  <>
                    <Zap size={13} className="animate-pulse" /> GA Rerouting…
                  </>
                ) : (
                  <>
                    Execute Mandate <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 16.2.A — DAILY SUMMARY ====================

type BriefingItem = {
  id: string;
  priority: "good" | "normal" | "critical";
  headline: string;
  detail: string;
  sourceCount: number;
};

const BRIEFING: BriefingItem[] = [
  {
    id: "b1",
    priority: "good",
    headline: "Paving on Coastal Road is 15% ahead of schedule",
    detail:
      "Foreman Padojinog reports base course completion 2 days ahead. Synthesized from 14 field photos, 6 voice notes, and GPS logs.",
    sourceCount: 20,
  },
  {
    id: "b2",
    priority: "normal",
    headline: "Heavy rain halted Eco-Park earthmoving; equipment secured",
    detail:
      "3 foremen reported weather stoppage by 14:22. All heavy equipment returned to motor pool. No damage. Expected resumption: tomorrow 07:00.",
    sourceCount: 8,
  },
  {
    id: "b3",
    priority: "critical",
    headline:
      "Cement delivery for Plaza Renovation rejected due to quality issues",
    detail:
      "QA Officer Lumapas rejected 240 bags (Lot #A-2026-04-11) from Reyes Construction Supplies — below 28-day compressive strength spec. Supplier notified. Replacement ETA: 48h.",
    sourceCount: 5,
  },
];

function DailySummary() {
  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Morning Executive Briefing · Apr 21, 2026 · 08:00"
        subtitle="NLP synthesis of 247 field app updates from yesterday"
        actions={
          <>
            <Btn icon={<Download size={13} />} label="Export: PDF Report" />
            <Btn
              icon={<Bot size={13} />}
              label="Ask Briefing AI"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Field Updates Read"
          value="247"
          trend="14 foremen · 33 team leads"
          tone="neutral"
        />
        <Stat
          label="Reading Time Saved"
          value="~2.4h"
          trend="vs. manual stand-up"
          tone="good"
        />
        <Stat
          label="Critical Flags"
          value={BRIEFING.filter(
            (b) => b.priority === "critical",
          ).length.toString()}
          trend="Require Dept. Head attention"
          tone="bad"
        />
        <Stat
          label="NLP Confidence"
          value="96%"
          trend="Entity & intent extraction"
          tone="good"
        />
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-white border border-indigo-200 rounded-xl p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <div>
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              eFlow Briefing AI
            </div>
            <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Synthesized from field reports · Ormoc Engineering Department
            </div>
          </div>
          <div className="ml-auto text-[10.5px] font-['Lexend:Medium',_sans-serif] text-indigo-700 bg-white border border-indigo-200 rounded px-2 py-1">
            3 bullets
          </div>
        </div>

        <div className="space-y-3">
          {BRIEFING.map((b, i) => {
            const tone =
              b.priority === "critical"
                ? {
                    icon: <Flame size={14} className="text-red-600" />,
                    bg: "bg-red-50",
                    border: "border-red-200",
                    chip: "text-red-700 bg-white border-red-200",
                    label: "CRITICAL",
                  }
                : b.priority === "good"
                  ? {
                      icon: (
                        <TrendingUp size={14} className="text-emerald-600" />
                      ),
                      bg: "bg-emerald-50",
                      border: "border-emerald-200",
                      chip: "text-emerald-700 bg-white border-emerald-200",
                      label: "POSITIVE",
                    }
                  : {
                      icon: <CloudRain size={14} className="text-blue-600" />,
                      bg: "bg-blue-50",
                      border: "border-blue-200",
                      chip: "text-blue-700 bg-white border-blue-200",
                      label: "FYI",
                    };
            return (
              <div
                key={b.id}
                className={`${tone.bg} border ${tone.border} rounded-lg p-4`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white shrink-0">
                    {tone.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-neutral-400">
                        #{i + 1}
                      </span>
                      <span
                        className={`text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-1.5 py-0.5 ${tone.chip}`}
                      >
                        {tone.label}
                      </span>
                      <span className="ml-auto text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                        synthesized from {b.sourceCount} sources
                      </span>
                    </div>
                    <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-snug">
                      {b.headline}
                    </div>
                    <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-1 leading-relaxed">
                      {b.detail}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-4 border-t border-indigo-100 flex items-center gap-2 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
          <Info size={12} />
          Stand-up meeting replaced. 15 foremen continue field deployment.
          Approximate city savings:{" "}
          <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">
            36 man-hours/day
          </span>
          .
        </div>
      </div>
    </div>
  );
}

// ==================== 16.2.B — ACTION ITEMS EXTRACTION ====================

type ExtractedAction = {
  id: string;
  sourceText: string;
  author: string;
  timestamp: string;
  extractedTask: string;
  assignee: string;
  dueDate: string;
  status: "created" | "accepted" | "completed";
};

const EXTRACTED: ExtractedAction[] = [
  {
    id: "a1",
    sourceText:
      "I will check the generator fuel levels tomorrow morning before we power up the dewatering pump.",
    author: "Foreman Padojinog",
    timestamp: "Apr 20 · 17:42",
    extractedTask: "Check Generator Fuel · Dewatering Pump",
    assignee: "Foreman Padojinog",
    dueDate: "Apr 21 · 07:00",
    status: "accepted",
  },
  {
    id: "a2",
    sourceText:
      "Need to follow up with the steel supplier about the delayed Grade 40 rebar shipment by Monday.",
    author: "Engr. Tambago",
    timestamp: "Apr 20 · 16:08",
    extractedTask: "Follow up · Steel Supplier (Grade 40 rebar)",
    assignee: "Engr. Tambago",
    dueDate: "Apr 22 · 09:00",
    status: "accepted",
  },
  {
    id: "a3",
    sourceText:
      "Tomorrow I will personally inspect the retaining wall formwork before concrete pour.",
    author: "Engr. Santos",
    timestamp: "Apr 20 · 15:33",
    extractedTask: "Inspect Retaining Wall Formwork · Pre-Pour QA",
    assignee: "Engr. Santos",
    dueDate: "Apr 21 · 06:30",
    status: "created",
  },
  {
    id: "a4",
    sourceText:
      "Will coordinate with Brgy. Linao captain re. road closure permit next week.",
    author: "Mr. Escario",
    timestamp: "Apr 20 · 14:15",
    extractedTask: "Coordinate · Brgy. Linao road closure permit",
    assignee: "Mr. Escario",
    dueDate: "Apr 28 · EOD",
    status: "created",
  },
  {
    id: "a5",
    sourceText:
      "I'll send the updated timesheet for the night shift crew before payroll cutoff.",
    author: "Ms. Lumapas",
    timestamp: "Apr 20 · 13:22",
    extractedTask: "Submit Night-Shift Timesheet · Payroll Cutoff",
    assignee: "Ms. Lumapas",
    dueDate: "Apr 22 · 12:00",
    status: "completed",
  },
];

function ActionItemsExtraction() {
  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Action Items · NLP Extraction"
        subtitle="Commitments mined from field app text · auto-pushed to mobile to-do lists"
        actions={
          <>
            <Btn icon={<ListChecks size={13} />} label="Export Task Log" />
            <Btn
              icon={<Bot size={13} />}
              label="Tune NLP Filters"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Commitments Mined"
          value={EXTRACTED.length.toString()}
          trend="From 247 field updates"
          tone="neutral"
        />
        <Stat
          label="Auto-Assigned"
          value={EXTRACTED.length.toString()}
          trend="Zero manual entry"
          tone="good"
        />
        <Stat
          label="Acceptance Rate"
          value="94%"
          trend="Staff confirm task fidelity"
          tone="good"
        />
        <Stat
          label="Completed Today"
          value={EXTRACTED.filter(
            (a) => a.status === "completed",
          ).length.toString()}
          trend="Closed-loop execution"
          tone="good"
        />
      </div>

      <div className="space-y-3">
        {EXTRACTED.map((a) => {
          const statusTone =
            a.status === "completed"
              ? {
                  chip: "bg-emerald-50 border-emerald-200 text-emerald-700",
                  label: "Completed",
                }
              : a.status === "accepted"
                ? {
                    chip: "bg-blue-50 border-blue-200 text-blue-700",
                    label: "Accepted · On Staff List",
                  }
                : {
                    chip: "bg-neutral-100 border-neutral-200 text-neutral-700",
                    label: "Created · Pending Accept",
                  };
          return (
            <div
              key={a.id}
              className="bg-white border border-neutral-200 rounded-xl p-4"
            >
              <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                <div>
                  <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-1.5">
                    Raw Field Report
                  </div>
                  <div className="bg-neutral-50 border border-neutral-100 rounded-lg p-3">
                    <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 italic leading-relaxed">
                      "{a.sourceText}"
                    </div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-2 flex items-center gap-2">
                      <span className="font-['Lexend:Medium',_sans-serif] text-neutral-700">
                        {a.author}
                      </span>
                      <span>·</span>
                      <span>{a.timestamp}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1 text-indigo-600 shrink-0">
                  <Brain size={18} />
                  <ArrowRight size={14} />
                  <div className="text-[8.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider">
                    NLP
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-emerald-700">
                      Auto-Generated Task
                    </div>
                    <span
                      className={`text-[9.5px] font-['Lexend:Medium',_sans-serif] border rounded px-1.5 py-0.5 ${statusTone.chip}`}
                    >
                      {statusTone.label}
                    </span>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <CheckCircle2
                        size={13}
                        className="text-emerald-700 mt-0.5 shrink-0"
                      />
                      <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-snug">
                        {a.extractedTask}
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-emerald-200 grid grid-cols-2 gap-2 text-[10px] font-['Lexend:Regular',_sans-serif]">
                      <div>
                        <span className="text-neutral-500">Assignee: </span>
                        <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">
                          {a.assignee}
                        </span>
                      </div>
                      <div>
                        <span className="text-neutral-500">Due: </span>
                        <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif] tabular-nums">
                          {a.dueDate}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 16.2.C — REDUNDANCY FILTERING ====================

type DuplicationAlert = {
  id: string;
  location: string;
  similarity: number;
  teams: { name: string; lead: string; activity: string; timestamp: string }[];
  estSavings: number;
  status: "flagged" | "merged" | "dismissed";
};

const DUPLICATIONS: DuplicationAlert[] = [
  {
    id: "r1",
    location: "Brgy. Linao · Drainage Zone A",
    similarity: 92,
    teams: [
      {
        name: "Team A · Engineering",
        lead: "Engr. Villegas",
        activity: "Surveying drainage at Brgy. Linao",
        timestamp: "Apr 20 · 09:14",
      },
      {
        name: "Team B · DRRMO Assist",
        lead: "Ms. Bontuyan",
        activity: "Checking flood lines at Brgy. Linao",
        timestamp: "Apr 20 · 10:02",
      },
    ],
    estSavings: 48_000,
    status: "flagged",
  },
  {
    id: "r2",
    location: "Plaza Cancion · North Wall",
    similarity: 87,
    teams: [
      {
        name: "Team C · QA/QC",
        lead: "Engr. Lumapas",
        activity: "Compressive strength test for wall footing",
        timestamp: "Apr 20 · 11:30",
      },
      {
        name: "Team D · Consultant",
        lead: "Engr. Tambago",
        activity: "Load calc verification at north plaza wall",
        timestamp: "Apr 20 · 13:05",
      },
    ],
    estSavings: 22_500,
    status: "flagged",
  },
  {
    id: "r3",
    location: "Coastal Rd · KM 4.2",
    similarity: 74,
    teams: [
      {
        name: "Team E · Paving",
        lead: "Foreman Padojinog",
        activity: "Base course compaction test",
        timestamp: "Apr 20 · 14:20",
      },
      {
        name: "Team F · Materials",
        lead: "Mr. Pial",
        activity: "Compaction density sampling KM 4-5",
        timestamp: "Apr 20 · 14:48",
      },
    ],
    estSavings: 15_000,
    status: "flagged",
  },
];

function RedundancyFiltering() {
  const [alerts, setAlerts] = useState<DuplicationAlert[]>(DUPLICATIONS);

  const act = (id: string, status: "merged" | "dismissed") => {
    setAlerts(alerts.map((a) => (a.id === id ? { ...a, status } : a)));
  };

  const totalSavings = alerts
    .filter((a) => a.status === "merged")
    .reduce((s, a) => s + a.estSavings, 0);
  const pending = alerts.filter((a) => a.status === "flagged");

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Redundancy Filtering · Duplication Radar"
        subtitle="NLP-detected overlapping effort across teams · GPS + activity text matched"
        actions={
          <>
            <Btn icon={<Filter size={13} />} label="Threshold: ≥70%" />
            <Btn
              icon={<Merge size={13} />}
              label="Bulk Merge Similar"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Overlaps Detected"
          value={alerts.length.toString()}
          trend="Past 24h across 6 barangays"
          tone="warn"
        />
        <Stat
          label="Pending Review"
          value={pending.length.toString()}
          trend="Awaiting Dept. Head action"
          tone="warn"
        />
        <Stat
          label="Merges Executed"
          value={alerts.filter((a) => a.status === "merged").length.toString()}
          trend="One-click consolidation"
          tone="good"
        />
        <Stat
          label="Est. Savings Captured"
          value={peso(totalSavings)}
          trend="Man-hours + fuel recovered"
          tone="good"
        />
      </div>

      <div className="space-y-3">
        {alerts.map((a) => {
          const isResolved = a.status !== "flagged";
          return (
            <div
              key={a.id}
              className={`border rounded-xl p-5 transition ${a.status === "merged" ? "bg-emerald-50/60 border-emerald-200" : a.status === "dismissed" ? "bg-neutral-50 border-neutral-200 opacity-60" : "bg-white border-amber-200"}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-2.5">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${a.status === "merged" ? "bg-emerald-600" : "bg-amber-500"} text-white`}
                  >
                    {a.status === "merged" ? (
                      <CheckCircle2 size={15} />
                    ) : (
                      <AlertTriangle size={15} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                        Possible Duplication of Effort · {a.location}
                      </div>
                      <span className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase bg-amber-100 text-amber-700 rounded px-1.5 py-0.5 tabular-nums">
                        {a.similarity}% match
                      </span>
                    </div>
                    <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
                      NLP entity overlap + GPS proximity + time window
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                    Est. Savings
                  </div>
                  <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700 tabular-nums">
                    {peso(a.estSavings)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center mb-3">
                {a.teams.map((t, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <div className="flex items-center justify-center">
                        <div className="flex flex-col items-center gap-1 text-amber-600">
                          <MapPin size={14} />
                          <div className="text-[8.5px] font-['Lexend:Medium',_sans-serif] uppercase">
                            same area
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="bg-white border border-neutral-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1.5">
                        <Users size={11} className="text-neutral-600" />
                        <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                          {t.name}
                        </div>
                      </div>
                      <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-1.5">
                        {t.lead} · {t.timestamp}
                      </div>
                      <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-800 italic bg-neutral-50 border border-neutral-100 rounded p-2 leading-relaxed">
                        "{t.activity}"
                      </div>
                    </div>
                  </React.Fragment>
                ))}
              </div>

              {!isResolved ? (
                <div className="flex items-center gap-2 pt-3 border-t border-neutral-100">
                  <button
                    onClick={() => act(a.id, "merged")}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Merge size={13} /> Merge Tasks (1-click)
                  </button>
                  <Btn
                    icon={<MessageSquare size={13} />}
                    label="Ask Teams to Clarify"
                  />
                  <button
                    onClick={() => act(a.id, "dismissed")}
                    className="ml-auto text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-700"
                  >
                    Dismiss · not duplicate
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 pt-3 border-t border-emerald-100 text-[11.5px] font-['Lexend:Medium',_sans-serif]">
                  {a.status === "merged" ? (
                    <>
                      <CheckCircle2 size={13} className="text-emerald-700" />
                      <span className="text-emerald-800">
                        Tasks merged · assigned to lead team · duplicate removed
                        from both mobile lists
                      </span>
                    </>
                  ) : (
                    <>
                      <X size={13} className="text-neutral-500" />
                      <span className="text-neutral-600">
                        Dismissed · marked as parallel legitimate work
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 17.1.A — OPTIMAL DISTRIBUTION MATRIX ====================

type FieldWorker = {
  id: string;
  name: string;
  role: string;
  skills: string[];
  license?: string;
  distanceKm: number;
  fatigue: "low" | "medium" | "high";
  gpsZone: string;
};

type DeployTask = {
  id: string;
  name: string;
  required: string;
  site: string;
  priority: "P1" | "P2" | "P3";
};

const FIELD: FieldWorker[] = [
  {
    id: "f1",
    name: "Engr. Ronnie Bautista",
    role: "Heavy Equip. Operator",
    skills: ["Concrete", "Operator"],
    license: "Heavy Equipment License",
    distanceKm: 2,
    fatigue: "low",
    gpsZone: "Coastal Rd. · KM 4",
  },
  {
    id: "f2",
    name: "Mr. Julius Cabahug",
    role: "Foreman",
    skills: ["Concrete", "Labor"],
    distanceKm: 3,
    fatigue: "medium",
    gpsZone: "Eco-Park Site",
  },
  {
    id: "f3",
    name: "Mr. Rey Ocenar",
    role: "Laborer",
    skills: ["Labor", "Excavation"],
    distanceKm: 1,
    fatigue: "low",
    gpsZone: "Eco-Park Site",
  },
  {
    id: "f4",
    name: "Engr. Fe Manlangit",
    role: "Site Engineer",
    skills: ["QA/QC", "Survey"],
    distanceKm: 5,
    fatigue: "low",
    gpsZone: "Plaza Cancion",
  },
  {
    id: "f5",
    name: "Mr. Dominador Paclibar",
    role: "Welder",
    skills: ["Welding"],
    distanceKm: 7,
    fatigue: "medium",
    gpsZone: "City Motorpool",
  },
  {
    id: "f6",
    name: "Ms. Lourdes Anunciado",
    role: "Surveyor",
    skills: ["Survey"],
    distanceKm: 4,
    fatigue: "low",
    gpsZone: "Brgy. Linao",
  },
  {
    id: "f7",
    name: "Mr. Jerome Solis",
    role: "Laborer",
    skills: ["Labor", "Plumbing"],
    distanceKm: 6,
    fatigue: "high",
    gpsZone: "Public Market",
  },
  {
    id: "f8",
    name: "Engr. Darwin Patriarca",
    role: "Electrical Engineer",
    skills: ["Electrical", "ICT"],
    distanceKm: 3,
    fatigue: "low",
    gpsZone: "City Hall",
  },
  {
    id: "f9",
    name: "Mr. Pastor Egar",
    role: "Foreman",
    skills: ["Concrete", "Labor"],
    distanceKm: 4,
    fatigue: "medium",
    gpsZone: "Fire Station Annex",
  },
  {
    id: "f10",
    name: "Mr. Vicente Laurel",
    role: "Heavy Equip. Operator",
    skills: ["Operator"],
    license: "Heavy Equipment License",
    distanceKm: 8,
    fatigue: "low",
    gpsZone: "City Motorpool",
  },
  {
    id: "f11",
    name: "Ms. Rhea Caranay",
    role: "Laborer",
    skills: ["Labor"],
    distanceKm: 2,
    fatigue: "low",
    gpsZone: "Eco-Park Site",
  },
  {
    id: "f12",
    name: "Mr. Allan Arcenas",
    role: "Electrician",
    skills: ["Electrical"],
    distanceKm: 3,
    fatigue: "medium",
    gpsZone: "City Hall",
  },
];

const TASKS: DeployTask[] = [
  {
    id: "t1",
    name: "Coastal Road Paving · KM 4.2",
    required: "Operator",
    site: "Coastal Rd.",
    priority: "P1",
  },
  {
    id: "t2",
    name: "Eco-Park Concrete Pouring",
    required: "Concrete",
    site: "Eco-Park",
    priority: "P1",
  },
  {
    id: "t3",
    name: "Plaza Formwork QA Inspection",
    required: "QA/QC",
    site: "Plaza Cancion",
    priority: "P2",
  },
  {
    id: "t4",
    name: "Drainage Survey · Brgy. Linao",
    required: "Survey",
    site: "Brgy. Linao",
    priority: "P2",
  },
  {
    id: "t5",
    name: "Fire Station Foundation Labor",
    required: "Labor",
    site: "Fire Station",
    priority: "P1",
  },
  {
    id: "t6",
    name: "City Hall ICT Rack Install",
    required: "Electrical",
    site: "City Hall",
    priority: "P3",
  },
];

function fatigueIcon(f: FieldWorker["fatigue"]) {
  if (f === "low")
    return <BatteryFull size={11} className="text-emerald-600" />;
  if (f === "medium")
    return <BatteryMedium size={11} className="text-amber-600" />;
  return <BatteryLow size={11} className="text-red-600" />;
}

type Assignment = { taskId: string; workerId: string; reason: string };

function computeGAAssignments(
  workers: FieldWorker[],
  tasks: DeployTask[],
): Assignment[] {
  const used = new Set<string>();
  const results: Assignment[] = [];
  for (const task of tasks) {
    const candidates = workers.filter(
      (w) => !used.has(w.id) && w.skills.includes(task.required),
    );
    candidates.sort((a, b) => {
      const score = (w: FieldWorker) =>
        100 -
        w.distanceKm * 3 +
        (w.fatigue === "low" ? 30 : w.fatigue === "medium" ? 10 : 0) +
        (w.license ? 15 : 0);
      return score(b) - score(a);
    });
    const pick = candidates[0];
    if (pick) {
      used.add(pick.id);
      const bits: string[] = [];
      if (pick.license && task.required === "Operator")
        bits.push(`Holds ${pick.license}`);
      bits.push(`GPS ${pick.distanceKm}km from site`);
      bits.push(`Fatigue: ${pick.fatigue}`);
      results.push({
        taskId: task.id,
        workerId: pick.id,
        reason: bits.join(" · "),
      });
    }
  }
  return results;
}

function OptimalDistributionMatrix() {
  const [generating, setGenerating] = useState(false);
  const [gen, setGen] = useState(0);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [inspect, setInspect] = useState<Assignment | null>(null);

  const generate = () => {
    setGenerating(true);
    setGen(0);
    setAssignments([]);
    const iterations = 8;
    const tick = (i: number) => {
      setGen(i);
      if (i < iterations) setTimeout(() => tick(i + 1), 180);
      else {
        const a = computeGAAssignments(FIELD, TASKS);
        setAssignments(a);
        setInspect(a[0]);
        setGenerating(false);
      }
    };
    setTimeout(() => tick(1), 150);
  };

  const getTask = (tid: string) => TASKS.find((t) => t.id === tid)!;
  const getWorker = (wid: string) => FIELD.find((f) => f.id === wid)!;
  const isAssigned = (wid: string) =>
    assignments.some((a) => a.workerId === wid);

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="GA Deployment Matrix"
        subtitle="Genetic Algorithm · 2,147 field workers · skill × location × fatigue fitness"
        actions={
          <>
            <Btn icon={<Download size={13} />} label="Export Roster" />
            <button
              onClick={generate}
              disabled={generating}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:opacity-90 disabled:opacity-60"
            >
              {generating ? (
                <Dna size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              {generating
                ? `Evolving gen ${gen}/8…`
                : "Generate Tomorrow's Schedule"}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Tasks to Cover"
          value={TASKS.length.toString()}
          trend="P1: 3 · P2: 2 · P3: 1"
          tone="neutral"
        />
        <Stat
          label="Workers Deployed"
          value={assignments.length.toString()}
          trend={`of ${FIELD.length} eligible`}
          tone={assignments.length ? "good" : "neutral"}
        />
        <Stat
          label="Avg. Travel Distance"
          value={
            assignments.length
              ? `${(assignments.reduce((s, a) => s + getWorker(a.workerId).distanceKm, 0) / assignments.length).toFixed(1)}km`
              : "—"
          }
          trend="Minimized vs. random"
          tone="good"
        />
        <Stat
          label="Fitness Score"
          value={assignments.length ? "0.94" : "—"}
          trend="After 8 generations"
          tone="good"
        />
      </div>

      <div className="grid grid-cols-[1fr_1.2fr_0.8fr] gap-4">
        {/* Task columns */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={14} className="text-neutral-900" />
            <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Tasks Queue
            </div>
          </div>
          <div className="space-y-2">
            {TASKS.map((t) => {
              const a = assignments.find((x) => x.taskId === t.id);
              const tone =
                t.priority === "P1"
                  ? "bg-red-50 border-red-200 text-red-700"
                  : t.priority === "P2"
                    ? "bg-amber-50 border-amber-200 text-amber-700"
                    : "bg-neutral-50 border-neutral-200 text-neutral-600";
              return (
                <div
                  key={t.id}
                  className={`border rounded-lg p-2.5 ${a ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-neutral-200"}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate pr-1">
                      {t.name}
                    </div>
                    <span
                      className={`text-[9px] font-['Lexend:Medium',_sans-serif] border rounded px-1 py-0.5 shrink-0 ${tone}`}
                    >
                      {t.priority}
                    </span>
                  </div>
                  <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 flex items-center gap-1">
                    <MapPin size={9} />
                    {t.site} · needs {t.required}
                  </div>
                  {a && (
                    <button
                      onClick={() => setInspect(a)}
                      className={`mt-2 text-left w-full bg-white border rounded p-1.5 ${inspect?.workerId === a.workerId ? "border-emerald-500" : "border-emerald-200"} hover:border-emerald-400`}
                    >
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-200 flex items-center justify-center text-[8px] font-['Lexend:SemiBold',_sans-serif] text-emerald-900">
                          {getWorker(a.workerId)
                            .name.split(" ")
                            .slice(-2)
                            .map((n) => n[0])
                            .join("")}
                        </div>
                        <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-emerald-900 truncate">
                          {getWorker(a.workerId).name}
                        </div>
                      </div>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Worker Grid */}
        <div className="bg-white border border-neutral-200 rounded-xl p-4 relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-neutral-900" />
            <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Field Workers Skill Grid
            </div>
            <div className="ml-auto text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              {FIELD.length} visible · {assignments.length} assigned
            </div>
          </div>
          {generating && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div
                className="absolute inset-x-0 h-10 bg-gradient-to-b from-indigo-400/40 to-transparent"
                style={{
                  top: `${(gen / 8) * 90}%`,
                  transition: "top 180ms linear",
                }}
              />
              <div className="absolute top-2 right-2 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase text-indigo-600 bg-white/90 rounded px-1.5 py-0.5 border border-indigo-200">
                Generation {gen}/8 · mutation ↻
              </div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {FIELD.map((w) => {
              const assigned = isAssigned(w.id);
              const inspectMe = inspect?.workerId === w.id;
              return (
                <button
                  key={w.id}
                  onClick={() => {
                    const a = assignments.find((x) => x.workerId === w.id);
                    if (a) setInspect(a);
                  }}
                  className={`text-left border rounded-lg p-2 transition ${inspectMe ? "border-indigo-500 bg-indigo-50 shadow-sm" : assigned ? "border-emerald-200 bg-emerald-50/40" : "border-neutral-100 bg-neutral-50 hover:bg-white"}`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] shrink-0 ${assigned ? "bg-emerald-500 text-white" : "bg-neutral-200 text-neutral-700"}`}
                    >
                      {w.name
                        .split(" ")
                        .slice(-2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                        {w.name.replace(/^(Engr\.|Mr\.|Ms\.) /, "")}
                      </div>
                      <div className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
                        {w.role}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5 text-[8.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                    {fatigueIcon(w.fatigue)}
                    <span className="tabular-nums">{w.distanceKm}km</span>
                    {w.license && (
                      <Shield size={9} className="text-blue-600 ml-auto" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Match reason */}
        <div className="bg-neutral-950 rounded-xl p-4 text-neutral-100 h-fit sticky top-4">
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-indigo-400 uppercase tracking-wider mb-3">
            <Dna size={12} /> Match Rationale
          </div>
          {inspect ? (
            <>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-white mb-1">
                {getWorker(inspect.workerId).name}
              </div>
              <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
                → {getTask(inspect.taskId).name}
              </div>
              <div className="bg-indigo-950/40 border border-indigo-900 rounded-lg p-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-indigo-100 leading-relaxed">
                {inspect.reason}
              </div>
              <div className="mt-3 space-y-1.5 text-[10.5px] font-['Lexend:Regular',_sans-serif]">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Required skill</span>
                  <span className="text-neutral-100">
                    {getTask(inspect.taskId).required}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Site</span>
                  <span className="text-neutral-100">
                    {getTask(inspect.taskId).site}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">GPS distance</span>
                  <span className="text-neutral-100 tabular-nums">
                    {getWorker(inspect.workerId).distanceKm}km
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Fatigue level</span>
                  <span className="text-neutral-100 capitalize">
                    {getWorker(inspect.workerId).fatigue}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-neutral-500">Priority</span>
                  <span className="text-neutral-100">
                    {getTask(inspect.taskId).priority}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center text-neutral-500 py-8 text-[11px]">
              Generate schedule, then click an assigned worker to view the GA's
              reasoning.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 17.1.B — MANUAL OVERRIDE ====================

type ColumnTask = {
  id: string;
  title: string;
  site: string;
  workers: FieldWorker[];
};

const INITIAL_COLS: ColumnTask[] = [
  {
    id: "c1",
    title: "Coastal Road Paving",
    site: "KM 4.2",
    workers: [FIELD[0], FIELD[9]],
  },
  {
    id: "c2",
    title: "Eco-Park Concrete",
    site: "Eco-Park Site",
    workers: [FIELD[1], FIELD[2], FIELD[10]],
  },
  {
    id: "c3",
    title: "Plaza QA Inspection",
    site: "Plaza Cancion",
    workers: [FIELD[3]],
  },
  {
    id: "c4",
    title: "Fire Station Labor",
    site: "Annex Footing",
    workers: [FIELD[8]],
  },
];

function ManualOverride({}: {
  tasks?: Task[];
  employees?: Employee[];
  departmentId?: string;
}) {
  const [cols, setCols] = useState<ColumnTask[]>(INITIAL_COLS);
  const [drag, setDrag] = useState<{
    colId: string;
    worker: FieldWorker;
  } | null>(null);
  const [recalc, setRecalc] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const onDragStart = (colId: string, worker: FieldWorker) =>
    setDrag({ colId, worker });
  const onDrop = (targetColId: string) => {
    if (!drag) return;
    if (drag.colId === targetColId) {
      setDrag(null);
      return;
    }
    const next = cols.map((c) => {
      if (c.id === drag.colId)
        return {
          ...c,
          workers: c.workers.filter((w) => w.id !== drag.worker.id),
        };
      if (c.id === targetColId)
        return { ...c, workers: [...c.workers, drag.worker] };
      return c;
    });
    setCols(next);
    setFlash(targetColId);
    setRecalc(true);
    setDrag(null);
    setTimeout(() => setRecalc(false), 1000);
    setTimeout(() => setFlash(null), 1400);
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Manual Override · Safety Valve"
        subtitle="Drag-and-drop corrections · GA auto-rebalances remaining matrix"
        actions={
          <>
            <Btn icon={<RefreshCw size={13} />} label="Revert to GA Original" />
            <Btn
              icon={<CheckCircle2 size={13} />}
              label="Commit Overrides"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Active Columns"
          value={cols.length.toString()}
          trend="Parallel deployments"
          tone="neutral"
        />
        <Stat
          label="Workers Deployed"
          value={cols.reduce((s, c) => s + c.workers.length, 0).toString()}
          trend="Total head-count"
          tone="neutral"
        />
        <Stat
          label="Manual Overrides"
          value="—"
          trend="This session"
          tone="neutral"
        />
        <Stat
          label="GA Harmony Score"
          value={recalc ? "…" : "0.91"}
          trend="Post-override fitness"
          tone={recalc ? "warn" : "good"}
        />
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex items-start gap-2">
        <Info size={13} className="text-amber-700 mt-0.5" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-amber-900 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif]">
            Human-in-the-loop.
          </span>{" "}
          Drag any avatar to another task column to resolve conflicts the
          algorithm cannot see (personal disputes, family emergencies, political
          sensitivities). The GA will instantly recalculate the remaining matrix
          so no project drops below its minimum crew.
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 relative">
        {recalc && (
          <div className="absolute -top-2 right-0 z-10 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase text-indigo-700 bg-white border border-indigo-200 rounded-full px-2 py-1 flex items-center gap-1 shadow-sm">
            <Dna size={11} className="animate-spin" /> GA recalculating…
          </div>
        )}
        {cols.map((col) => (
          <div
            key={col.id}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
            className={`bg-white border-2 rounded-xl p-4 min-h-[320px] transition ${drag && drag.colId !== col.id ? "border-dashed border-indigo-400 bg-indigo-50/30" : "border-neutral-200"} ${flash === col.id ? "ring-2 ring-emerald-400" : ""}`}
          >
            <div className="mb-3 pb-3 border-b border-neutral-100">
              <div className="text-[12.5px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                {col.title}
              </div>
              <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 flex items-center gap-1">
                <MapPin size={10} /> {col.site}
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span className="text-[9px] font-['Lexend:Medium',_sans-serif] uppercase bg-neutral-100 text-neutral-700 rounded px-1.5 py-0.5">
                  {col.workers.length} deployed
                </span>
                {col.workers.length < 2 && (
                  <span className="text-[9px] font-['Lexend:Medium',_sans-serif] uppercase bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
                    Under-staffed
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2">
              {col.workers.map((w) => (
                <div
                  key={w.id}
                  draggable
                  onDragStart={() => onDragStart(col.id, w)}
                  onDragEnd={() => setDrag(null)}
                  className={`bg-neutral-50 border border-neutral-200 rounded-lg p-2.5 cursor-grab active:cursor-grabbing hover:shadow-sm transition ${drag?.worker.id === w.id ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700 shrink-0">
                      {w.name
                        .split(" ")
                        .slice(-2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">
                        {w.name}
                      </div>
                      <div className="text-[9.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
                        {w.role}
                      </div>
                    </div>
                    {fatigueIcon(w.fatigue)}
                  </div>
                </div>
              ))}
              {col.workers.length === 0 && (
                <div className="text-center text-[10.5px] text-neutral-400 py-8 border-2 border-dashed border-neutral-200 rounded-lg">
                  Drop worker here
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 17.1.C — IDLE TIME MINIMIZATION ====================

type DispatchUnit = {
  id: string;
  name: string;
  team: string;
  x: number;
  y: number;
  status: "active" | "idle" | "enroute";
  lastTask?: string;
  newTask?: string;
  radiusKm?: number;
};

const INITIAL_UNITS: DispatchUnit[] = [
  {
    id: "u1",
    name: "Plumbing Crew 4",
    team: "Maintenance",
    x: 58,
    y: 42,
    status: "idle",
    lastTask: "Public Market pipe repair · closed 14:02",
    radiusKm: 1,
  },
  {
    id: "u2",
    name: "Electrical Unit 2",
    team: "Electrical",
    x: 32,
    y: 65,
    status: "active",
    lastTask: "City Hall rack install · in progress",
  },
  {
    id: "u3",
    name: "Paving Crew A",
    team: "Engineering",
    x: 75,
    y: 30,
    status: "active",
    lastTask: "Coastal Rd. KM 4.2 · base course",
  },
  {
    id: "u4",
    name: "Sanitation Team 3",
    team: "Environmental",
    x: 46,
    y: 55,
    status: "enroute",
    lastTask: "→ Brgy. Linao trash haul",
  },
  {
    id: "u5",
    name: "Welding Crew 1",
    team: "Fabrication",
    x: 22,
    y: 38,
    status: "active",
    lastTask: "Fire Station trusses",
  },
  {
    id: "u6",
    name: "Survey Team B",
    team: "Engineering",
    x: 68,
    y: 70,
    status: "idle",
    lastTask: "Drainage profile done · closed 13:50",
    radiusKm: 1.5,
  },
];

type Ticket = {
  id: string;
  title: string;
  priority: "low" | "med";
  x: number;
  y: number;
};

const NEARBY_TICKETS: Ticket[] = [
  {
    id: "tk1",
    title: "Reported pothole · Market Street",
    priority: "low",
    x: 62,
    y: 46,
  },
  {
    id: "tk2",
    title: "Loose manhole cover · Aviles Ave.",
    priority: "med",
    x: 72,
    y: 73,
  },
  {
    id: "tk3",
    title: "Blocked drain grate · Lopez Jaena",
    priority: "low",
    x: 40,
    y: 60,
  },
];

function IdleTimeMinimization({}: {
  tasks?: Task[];
  employees?: Employee[];
  departmentId?: string;
}) {
  const [units, setUnits] = useState<DispatchUnit[]>(INITIAL_UNITS);
  const [log, setLog] = useState<{ at: string; message: string }[]>([
    {
      at: "14:02",
      message: "Plumbing Crew 4 marked idle — Public Market repair closed.",
    },
    {
      at: "13:50",
      message: "Survey Team B marked idle — drainage profile completed.",
    },
  ]);
  const [pinging, setPinging] = useState<string | null>(null);

  const dispatch = (unitId: string, ticket: Ticket) => {
    setPinging(unitId);
    setTimeout(() => {
      setUnits(
        units.map((u) =>
          u.id === unitId
            ? { ...u, status: "enroute", newTask: `→ ${ticket.title}` }
            : u,
        ),
      );
      const now = new Date();
      const stamp = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      setLog([
        {
          at: stamp,
          message: `GA dispatched ${units.find((u) => u.id === unitId)?.name} → "${ticket.title}" (proximity 0.${Math.floor(Math.random() * 9) + 1}km).`,
        },
        ...log,
      ]);
      setPinging(null);
    }, 900);
  };

  const autoDispatchAll = () => {
    const idle = units.filter((u) => u.status === "idle");
    idle.forEach((u, i) =>
      setTimeout(
        () => dispatch(u.id, NEARBY_TICKETS[i % NEARBY_TICKETS.length]),
        i * 600,
      ),
    );
  };

  const idleCount = units.filter((u) => u.status === "idle").length;
  const statusStyle: Record<
    string,
    { color: string; pulse: string; label: string }
  > = {
    idle: { color: "#f59e0b", pulse: "animate-pulse", label: "IDLE" },
    active: { color: "#10b981", pulse: "", label: "ACTIVE" },
    enroute: { color: "#6366f1", pulse: "animate-pulse", label: "EN ROUTE" },
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Dynamic Dispatch · Idle Time Minimization"
        subtitle="Uber-style GA routing · 1km proximity radius · live GPS feed"
        actions={
          <>
            <Btn icon={<Radio size={13} />} label="Broadcast to All Crews" />
            <Btn
              icon={<Zap size={13} />}
              label="Auto-Dispatch Idle"
              variant="primary"
              onClick={autoDispatchAll}
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Live Units"
          value={units.length.toString()}
          trend="Tracked via mobile GPS"
          tone="neutral"
        />
        <Stat
          label="Idle Now"
          value={idleCount.toString()}
          trend="Awaiting proximity task"
          tone={idleCount ? "warn" : "good"}
        />
        <Stat
          label="En Route"
          value={units.filter((u) => u.status === "enroute").length.toString()}
          trend="GA-dispatched today"
          tone="good"
        />
        <Stat
          label="Idle Time Saved"
          value="4.2h"
          trend="Recovered this afternoon"
          tone="good"
        />
      </div>

      <div className="grid grid-cols-[1.5fr_1fr] gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Navigation size={14} className="text-neutral-900" />
            <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Ormoc City · Live Dispatch Map
            </div>
            <div className="ml-auto flex items-center gap-3 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Active
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />{" "}
                Idle
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500" /> En Route
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400" />{" "}
                Ticket
              </span>
            </div>
          </div>

          <div className="relative bg-gradient-to-br from-emerald-50 via-blue-50 to-amber-50 border border-neutral-200 rounded-lg h-[420px] overflow-hidden">
            {/* Map grid */}
            <svg
              className="absolute inset-0 w-full h-full opacity-30"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={"h" + i}
                  x1="0"
                  y1={i * 10}
                  x2="100"
                  y2={i * 10}
                  stroke="#94a3b8"
                  strokeWidth="0.1"
                />
              ))}
              {Array.from({ length: 10 }).map((_, i) => (
                <line
                  key={"v" + i}
                  x1={i * 10}
                  y1="0"
                  x2={i * 10}
                  y2="100"
                  stroke="#94a3b8"
                  strokeWidth="0.1"
                />
              ))}
              {/* Faux roads */}
              <path
                d="M0,45 Q30,40 55,48 T100,42"
                stroke="#64748b"
                strokeWidth="0.6"
                fill="none"
                opacity="0.5"
              />
              <path
                d="M50,0 L48,100"
                stroke="#64748b"
                strokeWidth="0.6"
                fill="none"
                opacity="0.5"
              />
              <path
                d="M0,70 L100,68"
                stroke="#64748b"
                strokeWidth="0.6"
                fill="none"
                opacity="0.5"
              />
            </svg>

            {/* Tickets */}
            {NEARBY_TICKETS.map((t) => (
              <div
                key={t.id}
                className="absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
              >
                <div
                  className="w-2 h-2 rounded-full bg-neutral-500 border border-white shadow"
                  title={t.title}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-700 bg-white/80 border border-neutral-200 rounded px-1 py-0.5 whitespace-nowrap">
                  {t.title}
                </div>
              </div>
            ))}

            {/* Units */}
            {units.map((u) => {
              const s = statusStyle[u.status];
              return (
                <div
                  key={u.id}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                  style={{ left: `${u.x}%`, top: `${u.y}%` }}
                >
                  {u.status === "idle" && u.radiusKm && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-amber-400 animate-pulse"
                      style={{
                        width: `${u.radiusKm * 60}px`,
                        height: `${u.radiusKm * 60}px`,
                        left: "50%",
                        top: "50%",
                      }}
                    />
                  )}
                  {pinging === u.id && (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-indigo-500 animate-ping"
                      style={{
                        width: "40px",
                        height: "40px",
                        left: "50%",
                        top: "50%",
                      }}
                    />
                  )}
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-md ${s.pulse}`}
                    style={{ backgroundColor: s.color }}
                  />
                  <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[9.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900 bg-white/95 border border-neutral-200 rounded px-1.5 py-0.5 whitespace-nowrap shadow-sm">
                    {u.name}
                    <span
                      className="ml-1 text-[8px] font-['Lexend:Regular',_sans-serif]"
                      style={{ color: s.color }}
                    >
                      · {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-3">
              Idle Crews · Instant Dispatch
            </div>
            {units.filter((u) => u.status === "idle").length === 0 ? (
              <div className="text-center text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <CheckCircle2 size={18} className="mx-auto mb-1.5" />
                All crews deployed. Zero idle time.
              </div>
            ) : (
              <div className="space-y-2">
                {units
                  .filter((u) => u.status === "idle")
                  .map((u) => (
                    <div
                      key={u.id}
                      className="bg-amber-50 border border-amber-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Timer size={12} className="text-amber-700" />
                        <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                          {u.name}
                        </div>
                        <span className="ml-auto text-[9px] font-['Lexend:Medium',_sans-serif] uppercase bg-amber-500 text-white rounded px-1.5 py-0.5 animate-pulse">
                          Idle
                        </span>
                      </div>
                      <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-2">
                        {u.lastTask}
                      </div>
                      <div className="space-y-1">
                        {NEARBY_TICKETS.slice(0, 2).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => dispatch(u.id, t)}
                            className="w-full flex items-center gap-2 p-1.5 bg-white border border-neutral-200 rounded hover:border-indigo-400 text-left"
                          >
                            <Route size={10} className="text-indigo-600" />
                            <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 truncate flex-1">
                              {t.title}
                            </div>
                            <ArrowRight
                              size={10}
                              className="text-neutral-400"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          <div className="bg-neutral-950 rounded-xl p-4 text-neutral-100">
            <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-indigo-400 uppercase tracking-wider mb-3">
              <Radio size={12} /> Dispatch Feed
            </div>
            <div className="space-y-2 font-mono text-[10.5px] max-h-[180px] overflow-y-auto">
              {log.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-neutral-500 tabular-nums shrink-0">
                    {l.at}
                  </span>
                  <span className="text-neutral-200">{l.message}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 18.1.A — REAL-TIME SPEND TRACKING ====================

type BurndownProgram = {
  id: string;
  name: string;
  allocated: number;
  ideal: number[]; // ideal remaining by month (0..12)
  actual: number[]; // actual remaining by month (0..current)
  currentMonth: number;
  tone: "ok" | "warn" | "bad";
};

const BD_PROGRAMS: BurndownProgram[] = [
  {
    id: "bp1",
    name: "Coastal Road Rehabilitation",
    allocated: 10_000_000,
    ideal: [
      10_000_000, 9_167_000, 8_333_000, 7_500_000, 6_667_000, 5_833_000,
      5_000_000, 4_167_000, 3_333_000, 2_500_000, 1_667_000, 833_000, 0,
    ],
    actual: [10_000_000, 9_100_000, 7_800_000, 5_200_000],
    currentMonth: 3,
    tone: "bad",
  },
  {
    id: "bp2",
    name: "Eco-Park Phase 1",
    allocated: 8_000_000,
    ideal: [
      8_000_000, 7_333_000, 6_667_000, 6_000_000, 5_333_000, 4_667_000,
      4_000_000, 3_333_000, 2_667_000, 2_000_000, 1_333_000, 667_000, 0,
    ],
    actual: [8_000_000, 7_420_000, 6_720_000, 6_120_000],
    currentMonth: 3,
    tone: "ok",
  },
  {
    id: "bp3",
    name: "Drainage · District 4",
    allocated: 4_000_000,
    ideal: [
      4_000_000, 3_667_000, 3_333_000, 3_000_000, 2_667_000, 2_333_000,
      2_000_000, 1_667_000, 1_333_000, 1_000_000, 667_000, 333_000, 0,
    ],
    actual: [4_000_000, 3_900_000, 3_800_000, 3_720_000],
    currentMonth: 3,
    tone: "warn",
  },
];

function BurnDownChart({ prog }: { prog: BurndownProgram }) {
  const W = 420,
    H = 180,
    PADX = 38,
    PADY = 16;
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const xFor = (m: number) => PADX + (m / 12) * (W - PADX - 10);
  const yFor = (v: number) => PADY + (1 - v / prog.allocated) * (H - PADY - 24);

  const idealPath = prog.ideal
    .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`)
    .join(" ");
  const actualPath = prog.actual
    .map((v, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(v)}`)
    .join(" ");
  const actualColor =
    prog.tone === "bad"
      ? "#dc2626"
      : prog.tone === "warn"
        ? "#f59e0b"
        : "#10b981";

  // Projected depletion month
  const burnRate =
    (prog.allocated - prog.actual[prog.actual.length - 1]) / prog.currentMonth;
  const monthsLeft = prog.actual[prog.actual.length - 1] / burnRate;
  const depletionMonthIdx = Math.min(
    11,
    Math.floor(prog.currentMonth + monthsLeft),
  );

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="text-[12.5px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
            {prog.name}
          </div>
          <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            Allocated · {peso(prog.allocated)}
          </div>
        </div>
        <span
          className={`text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-1.5 py-0.5 ${prog.tone === "bad" ? "text-red-700 bg-red-50 border-red-200" : prog.tone === "warn" ? "text-amber-700 bg-amber-50 border-amber-200" : "text-emerald-700 bg-emerald-50 border-emerald-200"}`}
        >
          {prog.tone === "bad"
            ? "Accelerated Burn"
            : prog.tone === "warn"
              ? "Slightly Ahead"
              : "On Pace"}
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[180px]">
        {/* Y axis ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1={PADX}
              y1={yFor(prog.allocated * (1 - f))}
              x2={W - 10}
              y2={yFor(prog.allocated * (1 - f))}
              stroke="#e5e5e5"
              strokeWidth="0.5"
              strokeDasharray="2 3"
            />
            <text
              x={PADX - 4}
              y={yFor(prog.allocated * (1 - f)) + 3}
              textAnchor="end"
              className="text-[8px] font-['Lexend:Regular',_sans-serif]"
              fill="#a3a3a3"
            >
              {pesoShort(prog.allocated * (1 - f))}
            </text>
          </g>
        ))}
        {/* X labels */}
        {months.map((m, i) => (
          <text
            key={m}
            x={xFor(i)}
            y={H - 4}
            textAnchor="middle"
            className="text-[8px] font-['Lexend:Regular',_sans-serif]"
            fill="#a3a3a3"
          >
            {m}
          </text>
        ))}
        {/* Ideal dotted */}
        <path
          d={idealPath}
          stroke="#94a3b8"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="3 3"
        />
        {/* Actual line */}
        <path
          d={actualPath}
          stroke={actualColor}
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {prog.actual.map((v, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(v)} r="3" fill={actualColor} />
        ))}
        {/* Today marker */}
        <line
          x1={xFor(prog.currentMonth)}
          y1={PADY}
          x2={xFor(prog.currentMonth)}
          y2={H - 20}
          stroke="#171717"
          strokeWidth="1"
        />
        <text
          x={xFor(prog.currentMonth) + 2}
          y={PADY + 8}
          className="text-[8px] font-['Lexend:Medium',_sans-serif]"
          fill="#171717"
        >
          Today
        </text>
        {prog.tone === "bad" && (
          <>
            <line
              x1={xFor(depletionMonthIdx)}
              y1={PADY}
              x2={xFor(depletionMonthIdx)}
              y2={H - 20}
              stroke="#dc2626"
              strokeWidth="1"
              strokeDasharray="2 2"
            />
            <text
              x={xFor(depletionMonthIdx) + 2}
              y={PADY + 18}
              className="text-[8px] font-['Lexend:Medium',_sans-serif]"
              fill="#dc2626"
            >
              Depleted · {months[depletionMonthIdx]}
            </text>
          </>
        )}
      </svg>

      {prog.tone === "bad" && (
        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-start gap-2">
          <AlertOctagon size={12} className="text-red-700 mt-0.5" />
          <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-red-900 leading-relaxed">
            <span className="font-['Lexend:Medium',_sans-serif]">
              AI Warning · Accelerated burn rate.
            </span>{" "}
            At current pacing, the {prog.name} budget will be depleted by{" "}
            <span className="font-['Lexend:Medium',_sans-serif]">
              {months[depletionMonthIdx]}
            </span>
            , 4 months before year-end.
          </div>
        </div>
      )}
    </div>
  );
}

function RealTimeSpendTracking({}: {
  tasks?: Task[];
  employees?: Employee[];
  departmentId?: string;
}) {
  const [quarter, setQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">("Q2");

  const totalAlloc = BD_PROGRAMS.reduce((s, p) => s + p.allocated, 0);
  const totalRemaining = BD_PROGRAMS.reduce(
    (s, p) => s + p.actual[p.actual.length - 1],
    0,
  );
  const burned = totalAlloc - totalRemaining;

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Q2 Budget Pacing · Burn-Down"
        subtitle="Agile financial graph · per-program burn vs. ideal timeline"
        actions={
          <>
            <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5">
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => setQuarter(q)}
                  className={`px-2.5 py-1.5 rounded text-[11px] font-['Lexend:Medium',_sans-serif] ${quarter === q ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"}`}
                >
                  {q}
                </button>
              ))}
            </div>
            <Btn
              icon={<Download size={13} />}
              label="Export: Departmental Spend Report"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Total Allocation"
          value={pesoShort(totalAlloc)}
          trend="CY 2026 · Engineering"
          tone="neutral"
        />
        <Stat
          label="Burned YTD"
          value={pesoShort(burned)}
          trend={`${((burned / totalAlloc) * 100).toFixed(0)}% of allocation`}
          tone="neutral"
        />
        <Stat
          label="Remaining"
          value={pesoShort(totalRemaining)}
          trend="Available for Q2–Q4"
          tone="good"
        />
        <Stat
          label="Programs Off-Pace"
          value={BD_PROGRAMS.filter((p) => p.tone !== "ok").length.toString()}
          trend="1 critical · 1 slow"
          tone="bad"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BD_PROGRAMS.map((p) => (
          <BurnDownChart key={p.id} prog={p} />
        ))}
      </div>

      <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={14} className="text-neutral-600 mt-0.5 shrink-0" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">
            Reading the chart:
          </span>{" "}
          the dashed gray line is the ideal burn (straight diagonal from full
          allocation on Jan 1 to ₱0 on Dec 31). The solid colored line is your
          actual remaining balance month-by-month. If the solid line dives below
          the dashed line, you are overspending; the system projects your
          depletion date.
        </div>
      </div>
    </div>
  );
}

// ==================== 18.1.B — OVERRUN PREVENTION ====================

type PendingRequest = {
  id: string;
  title: string;
  requester: string;
  site: string;
  amount: number;
  category: string;
};

const PENDING: PendingRequest[] = [
  {
    id: "pr1",
    title: "Portland Cement · 800 bags",
    requester: "Supv. Santos · Coastal Rd.",
    site: "KM 4.2",
    amount: 800_000,
    category: "Materials",
  },
  {
    id: "pr2",
    title: "Steel Rebar · Grade 40",
    requester: "Engr. Tambago · Eco-Park",
    site: "Pavilion",
    amount: 640_000,
    category: "Materials",
  },
  {
    id: "pr3",
    title: "Heavy Equipment Rental · 3 days",
    requester: "Foreman Padojinog · Drainage",
    site: "Brgy. Linao",
    amount: 180_000,
    category: "Rental",
  },
  {
    id: "pr4",
    title: "Safety Gear · PPE set × 40",
    requester: "Safety Ofc. Lumapas",
    site: "All sites",
    amount: 96_000,
    category: "PPE",
  },
];

function OverrunPrevention({}: {
  tasks?: Task[];
  employees?: Employee[];
  departmentId?: string;
}) {
  const STARTING_BALANCE = 5_200_000;
  const CRITICAL_BUFFER = 500_000;
  const [selected, setSelected] = useState<Set<string>>(new Set(["pr1"]));

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const simulatedTotal = PENDING.filter((p) => selected.has(p.id)).reduce(
    (s, p) => s + p.amount,
    0,
  );
  const projected = STARTING_BALANCE - simulatedTotal;
  const projectedPct = (projected / STARTING_BALANCE) * 100;
  const inCritical = projected < CRITICAL_BUFFER;
  const wouldOverdraw = projected < 0;

  const zoneTone = wouldOverdraw
    ? "text-red-700 bg-red-600"
    : inCritical
      ? "text-white bg-red-500"
      : projected < STARTING_BALANCE * 0.3
        ? "text-white bg-amber-500"
        : "text-white bg-emerald-500";
  const zoneLabel = wouldOverdraw
    ? "REJECTED BY FINANCE"
    : inCritical
      ? "CRITICAL BUFFER ZONE"
      : projected < STARTING_BALANCE * 0.3
        ? "TIGHT · MONITOR"
        : "SAFE";

  // Gauge arc
  const clampedPct = Math.max(0, Math.min(100, projectedPct));

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="ORS Sandbox · Overrun Prevention"
        subtitle="Simulate an Obligation Request before submission to Finance"
        actions={
          <>
            <Btn icon={<RefreshCw size={13} />} label="Reset Simulation" />
            <Btn
              icon={<FileText size={13} />}
              label="Submit to Finance ORS"
              variant="primary"
              disabled={wouldOverdraw || inCritical}
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Current Balance"
          value={peso(STARTING_BALANCE)}
          trend="Programmatic Bucket · Engineering"
          tone="neutral"
        />
        <Stat
          label="Pending Requests"
          value={PENDING.length.toString()}
          trend="From your supervisors"
          tone="neutral"
        />
        <Stat
          label="Selected for Sim."
          value={selected.size.toString()}
          trend={`${peso(simulatedTotal)} total`}
          tone="neutral"
        />
        <Stat
          label="Critical Buffer"
          value={peso(CRITICAL_BUFFER)}
          trend="Reserved for emergencies"
          tone="warn"
        />
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ReceiptText size={14} className="text-neutral-900" />
            <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Incoming Purchase Requests
            </div>
          </div>
          <div className="space-y-2">
            {PENDING.map((r) => {
              const isSel = selected.has(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => toggle(r.id)}
                  className={`w-full text-left border rounded-lg p-3 transition ${isSel ? "border-indigo-400 bg-indigo-50/40" : "border-neutral-200 hover:border-neutral-300"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div
                        className={`w-4 h-4 rounded border-2 shrink-0 mt-0.5 flex items-center justify-center ${isSel ? "bg-indigo-600 border-indigo-600" : "border-neutral-300 bg-white"}`}
                      >
                        {isSel && (
                          <CheckCircle2 size={10} className="text-white" />
                        )}
                      </div>
                      <div>
                        <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                          {r.title}
                        </div>
                        <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                          {r.requester} · {r.site}
                        </div>
                        <span className="mt-1 inline-block text-[9px] font-['Lexend:Medium',_sans-serif] uppercase bg-neutral-100 text-neutral-600 rounded px-1.5 py-0.5">
                          {r.category}
                        </span>
                      </div>
                    </div>
                    <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums shrink-0">
                      {peso(r.amount)}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Gauge size={14} className="text-neutral-900" />
            <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
              Impact Gauge · After Approval
            </div>
          </div>

          <div className="relative flex flex-col items-center py-3">
            <svg viewBox="0 0 160 100" className="w-[240px] h-[140px]">
              {/* Critical zone red arc */}
              <path
                d="M 18 88 A 62 62 0 0 1 32 50"
                stroke="#fee2e2"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 32 50 A 62 62 0 0 1 80 18"
                stroke="#fef3c7"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M 80 18 A 62 62 0 0 1 142 88"
                stroke="#d1fae5"
                strokeWidth="14"
                fill="none"
                strokeLinecap="round"
              />
              {/* Needle */}
              {(() => {
                const angle = Math.PI * (1 - clampedPct / 100);
                const nx = 80 + 58 * Math.cos(angle);
                const ny = 88 - 58 * Math.sin(angle);
                return (
                  <>
                    <line
                      x1="80"
                      y1="88"
                      x2={nx}
                      y2={ny}
                      stroke={
                        wouldOverdraw
                          ? "#dc2626"
                          : inCritical
                            ? "#dc2626"
                            : projected < STARTING_BALANCE * 0.3
                              ? "#f59e0b"
                              : "#10b981"
                      }
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <circle cx="80" cy="88" r="5" fill="#171717" />
                  </>
                );
              })()}
              <text
                x="20"
                y="98"
                className="text-[7px] font-['Lexend:Medium',_sans-serif]"
                fill="#dc2626"
              >
                ₱0
              </text>
              <text
                x="130"
                y="98"
                className="text-[7px] font-['Lexend:Medium',_sans-serif]"
                fill="#10b981"
              >
                {pesoShort(STARTING_BALANCE)}
              </text>
            </svg>

            <div className="text-center mt-1">
              <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                Projected Remaining
              </div>
              <div
                className={`text-[24px] font-['Lexend:SemiBold',_sans-serif] tabular-nums ${wouldOverdraw ? "text-red-700" : inCritical ? "text-red-600" : "text-neutral-900"}`}
              >
                {peso(projected)}
              </div>
              <span
                className={`mt-2 inline-block text-[9.5px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider rounded px-2 py-1 ${zoneTone}`}
              >
                {zoneLabel}
              </span>
            </div>
          </div>

          {(inCritical || wouldOverdraw) && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
              <AlertOctagon
                size={13}
                className="text-red-700 mt-0.5 shrink-0"
              />
              <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-red-900 leading-relaxed">
                {wouldOverdraw ? (
                  <>
                    <span className="font-['Lexend:Medium',_sans-serif]">
                      This ORS will bounce.
                    </span>{" "}
                    Projected balance is negative — Finance will reject
                    submission. Reduce scope by {peso(-projected)} before
                    clicking Submit.
                  </>
                ) : (
                  <>
                    <span className="font-['Lexend:Medium',_sans-serif]">
                      Critical buffer breached.
                    </span>{" "}
                    Only {peso(projected)} would remain for unforeseen
                    emergencies. Scale back the purchase order before Finance
                    reviews.
                  </>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-neutral-100 space-y-1.5 text-[10.5px] font-['Lexend:Regular',_sans-serif]">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Starting balance</span>
              <span className="text-neutral-900 tabular-nums">
                {peso(STARTING_BALANCE)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">Simulated draw</span>
              <span className="text-red-600 tabular-nums">
                − {peso(simulatedTotal)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
              <span className="text-neutral-700 font-['Lexend:Medium',_sans-serif]">
                Projected balance
              </span>
              <span
                className={`tabular-nums font-['Lexend:Medium',_sans-serif] ${wouldOverdraw ? "text-red-700" : inCritical ? "text-red-600" : "text-neutral-900"}`}
              >
                {peso(projected)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 18.1.C — LEADER EXPENSE REPORTS ====================

type DelinquentLeader = {
  id: string;
  name: string;
  role: string;
  advance: number;
  purpose: string;
  issued: string;
  daysOld: number;
  linkedProject: string;
  suspended: boolean;
};

const LEADERS: DelinquentLeader[] = [
  {
    id: "dl1",
    name: "Engr. Ramon Cruz",
    role: "Site Engineer",
    advance: 185_000,
    purpose: "Field materials advance · Coastal Rd.",
    issued: "Mar 27, 2026",
    daysOld: 25,
    linkedProject: "Coastal Road Rehabilitation",
    suspended: false,
  },
  {
    id: "dl2",
    name: "Foreman Padojinog",
    role: "Foreman · Concrete",
    advance: 72_000,
    purpose: "Subcontractor petty cash · pavilion",
    issued: "Apr 02, 2026",
    daysOld: 19,
    linkedProject: "Eco-Park Phase 1",
    suspended: false,
  },
  {
    id: "dl3",
    name: "Mr. Escario",
    role: "Heavy Equip. Op.",
    advance: 42_000,
    purpose: "Fuel & maintenance advance",
    issued: "Apr 06, 2026",
    daysOld: 15,
    linkedProject: "Coastal Road Rehabilitation",
    suspended: false,
  },
  {
    id: "dl4",
    name: "Engr. Tambago",
    role: "QA/QC Officer",
    advance: 28_500,
    purpose: "Seminar registration advance",
    issued: "Apr 10, 2026",
    daysOld: 11,
    linkedProject: "Fire Station Annex",
    suspended: false,
  },
  {
    id: "dl5",
    name: "Ms. Lumapas",
    role: "Safety Officer",
    advance: 18_000,
    purpose: "PPE bulk purchase pre-pay",
    issued: "Apr 14, 2026",
    daysOld: 7,
    linkedProject: "All sites",
    suspended: false,
  },
];

function LeaderExpenseReports({}: {
  tasks?: Task[];
  employees?: Employee[];
  departmentId?: string;
}) {
  const [rows, setRows] = useState<DelinquentLeader[]>(LEADERS);
  const [suspendConfirm, setSuspendConfirm] = useState<string | null>(null);

  const suspend = (id: string) => {
    setRows(rows.map((r) => (r.id === id ? { ...r, suspended: true } : r)));
    setSuspendConfirm(null);
  };

  const total = rows.reduce((s, r) => s + r.advance, 0);
  const critical = rows.filter((r) => r.daysOld > 20);
  const suspended = rows.filter((r) => r.suspended);

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Leader Expense Reports · Liquidation Whip"
        subtitle="Treasury-flagged delinquent cash advances · COA shield"
        actions={
          <>
            <Btn icon={<Bell size={13} />} label="Broadcast Reminder" />
            <Btn
              icon={<Download size={13} />}
              label="Export COA Response"
              variant="primary"
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat
          label="Leaders with CA"
          value={rows.length.toString()}
          trend="Your direct reports"
          tone="neutral"
        />
        <Stat
          label="Past 20 Days"
          value={critical.length.toString()}
          trend="COA memo risk"
          tone="bad"
        />
        <Stat
          label="Funds Suspended"
          value={suspended.length.toString()}
          trend="BPA-blocked from new POs"
          tone="warn"
        />
        <Stat
          label="Outstanding Total"
          value={pesoShort(total)}
          trend="Awaiting receipts"
          tone="warn"
        />
      </div>

      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
        <Shield size={14} className="text-red-700 mt-0.5 shrink-0" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-red-900 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif]">
            COA shield active.
          </span>{" "}
          City Treasurer has flagged leaders on this list. Suspending their
          project funds automatically blocks new material requests or cash
          advances via the BPA engine until receipts are uploaded. This protects
          you from AOMs (Audit Observation Memos) addressed to the Department
          Head.
        </div>
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.3fr_1fr_1.5fr_1fr_1fr_0.9fr_auto] gap-3 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
          <div>Leader</div>
          <div>Role</div>
          <div>Purpose</div>
          <div>Advance</div>
          <div>Issued</div>
          <div>Aging</div>
          <div>Action</div>
        </div>
        {rows.map((r) => {
          const isOver = r.daysOld > 20;
          const isWarn = r.daysOld > 10;
          return (
            <div
              key={r.id}
              className={`grid grid-cols-[1.3fr_1fr_1.5fr_1fr_1fr_0.9fr_auto] gap-3 px-5 py-3.5 border-b border-neutral-100 items-center ${r.suspended ? "bg-red-50/60" : isOver ? "bg-amber-50/40" : ""}`}
            >
              <div>
                <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                  {r.name}
                </div>
                <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                  Linked: {r.linkedProject}
                </div>
              </div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
                {r.role}
              </div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 truncate">
                {r.purpose}
              </div>
              <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums">
                {peso(r.advance)}
              </div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 tabular-nums">
                {r.issued}
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Timer
                    size={11}
                    className={
                      isOver
                        ? "text-red-600"
                        : isWarn
                          ? "text-amber-600"
                          : "text-neutral-500"
                    }
                  />
                  <span
                    className={`text-[11px] font-['Lexend:Medium',_sans-serif] tabular-nums ${isOver ? "text-red-700" : isWarn ? "text-amber-700" : "text-neutral-700"}`}
                  >
                    {r.daysOld}d old
                  </span>
                </div>
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${isOver ? "bg-red-500" : isWarn ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{
                      width: `${Math.min(100, (r.daysOld / 30) * 100)}%`,
                    }}
                  />
                </div>
              </div>
              <div>
                {r.suspended ? (
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase bg-red-600 text-white rounded px-2 py-1 flex items-center gap-1 whitespace-nowrap">
                    <LockIcon size={10} /> Funds Suspended
                  </span>
                ) : suspendConfirm === r.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => suspend(r.id)}
                      className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-red-600 text-white rounded px-2 py-1 hover:bg-red-700"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setSuspendConfirm(null)}
                      className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-800 px-1.5"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setSuspendConfirm(r.id)}
                    className={`text-[10px] font-['Lexend:Medium',_sans-serif] uppercase rounded px-2 py-1 border whitespace-nowrap ${isOver ? "bg-red-50 border-red-200 text-red-700 hover:bg-red-100" : "bg-white border-neutral-200 text-neutral-700 hover:bg-neutral-50"}`}
                  >
                    <span className="flex items-center gap-1">
                      <BanIcon size={10} /> Suspend Funds
                    </span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-neutral-50 border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={14} className="text-neutral-600 mt-0.5 shrink-0" />
        <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
          <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">
            BPA enforcement.
          </span>{" "}
          Suspend Funds routes through the Business Process Automation engine:
          the leader's mobile app immediately blocks new material requests, cash
          advance applications, and travel orders tied to the linked project.
          The block auto-lifts the moment receipts are uploaded and acknowledged
          by the City Accountant.
        </div>
      </div>
    </div>
  );
}

function useDeptDirectoryEmployees() {
  const { employees: allEmployees, loading: employeesLoading } = useEmployees();
  const { users, loading: usersLoading } = useUsers();
  const { departments } = useDepartments();
  const { userProfile } = useAuth();
  const { orgs } = useOrgs();

  const departmentNameById = useMemo(() => {
    const map = new Map<string, string>();
    departments.forEach((dept) => {
      if (dept.id) {
        map.set(dept.id, dept.name);
      }
    });
    return map;
  }, [departments]);

  const usersAsEmployees = useMemo<Employee[]>(() => {
    const initialsFor = (name: string) =>
      name
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();

    const titleForRole = (role?: string) =>
      role
        ? role
            .split("_")
            .map((part) => part[0]?.toUpperCase() + part.slice(1))
            .join(" ")
        : "Employee";

    return users.map((user) => {
      const name = user.fullName || user.email || "Unnamed User";
      const departmentId = user.org_id || user.departmentId || "";
      const skills = (user as unknown as Record<string, unknown>).skills as Record<string, boolean> | undefined;
      const skillList = skills
        ? Object.keys(skills).filter((k) => skills[k]).join(", ")
        : "";
      return {
        id: user.uid,
        name,
        jobTitle: titleForRole(user.role),
        jobDescription: skillList || titleForRole(user.role),
        currentWorkload: typeof user.workload === "number" ? user.workload : 0,
        department: departmentId || undefined,
        departmentName: departmentId
          ? departmentNameById.get(departmentId) || departmentId
          : undefined,
        initials: initialsFor(name),
        email: user.email || undefined,
      };
    });
  }, [users, departmentNameById]);

  const userById = useMemo(
    () => new Map(users.map((user) => [user.uid, user])),
    [users],
  );

  const userByEmail = useMemo(() => {
    const map = new Map<string, (typeof users)[number]>();
    users.forEach((user) => {
      if (user.email) {
        map.set(user.email.toLowerCase(), user);
      }
    });
    return map;
  }, [users]);

  const headUsers = useMemo(() => {
    const ids = new Set<string>();
    const emails = new Set<string>();
    departments.forEach((dept) => {
      if (!dept.headUserId) return;
      ids.add(dept.headUserId);
      const head = userById.get(dept.headUserId);
      if (head?.email) {
        emails.add(head.email.toLowerCase());
      }
    });
    return { ids, emails };
  }, [departments, userById]);

  const directoryEmployees = useMemo(() => {
    const merged = new Map<string, Employee>();
    const emails = new Set<string>();

    allEmployees.forEach((emp) => {
      merged.set(emp.id, emp);
      if (emp.email) {
        emails.add(emp.email.toLowerCase());
      }
    });

    usersAsEmployees.forEach((emp) => {
      const emailKey = emp.email?.toLowerCase();
      if (emailKey && emails.has(emailKey)) {
        return;
      }
      if (!merged.has(emp.id)) {
        merged.set(emp.id, emp);
      }
    });

    return Array.from(merged.values());
  }, [allEmployees, usersAsEmployees]);

  const scopedOrgIds = useMemo(() => {
    if (!userProfile?.departmentId) return new Set<string>();
    return new Set(getDescendantOrgIds(orgs, userProfile.departmentId));
  }, [orgs, userProfile?.departmentId]);

  const deptEmployees = useMemo(() => {
    if (!userProfile?.departmentId) return directoryEmployees;
    const currentEmail = userProfile.email?.toLowerCase();

    return directoryEmployees.filter((emp) => {
      if (!emp.department || !scopedOrgIds.has(emp.department)) return false;
      if (userProfile.uid && emp.id === userProfile.uid) return false;
      if (currentEmail && emp.email?.toLowerCase() === currentEmail) {
        return false;
      }

      const matchById = userById.get(emp.id);
      const matchByEmail = emp.email
        ? userByEmail.get(emp.email.toLowerCase())
        : undefined;
      const matchedUser = matchById || matchByEmail;

      if (matchedUser?.role === "department_head" || matchedUser?.role === "dept_head") return false;
      if (headUsers.ids.has(emp.id)) return false;
      if (emp.email && headUsers.emails.has(emp.email.toLowerCase())) {
        return false;
      }

      return true;
    });
  }, [
    directoryEmployees,
    headUsers,
    userByEmail,
    userById,
    userProfile?.departmentId,
    userProfile?.email,
    userProfile?.uid,
    scopedOrgIds,
  ]);

  const directoryLoading = employeesLoading || usersLoading;

  return { deptEmployees, allEmployees: directoryEmployees, directoryLoading, userProfile };
}

// ==================== SUBORDINATE MANAGER ====================

function SubordinateManager({
  employees = [],
}: {
  tasks?: Task[];
  employees?: Employee[];
  departmentId?: string;
}) {
  const deptEmployees = useMemo(() => {
    if (!employees) return employees || [];
    return employees;
  }, [employees]);

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Team Supervision"
        subtitle="Manage subordinate profiles, track performance, and write direct feedback"
      />
      <div className="mt-6 space-y-4">
        {deptEmployees.length === 0 ? (
          <div className="text-sm text-neutral-500">
            No employees found in your department.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {deptEmployees.map((emp) => (
              <div
                key={emp.id}
                className="bg-white border border-neutral-200 rounded-lg p-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-neutral-900">{emp.name}</h4>
                    <p className="text-xs text-neutral-500">{emp.jobTitle}</p>
                    <p className="text-xs text-neutral-400 mt-1">{emp.email}</p>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${emp.currentWorkload > 80 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    Load: {emp.currentWorkload}%
                  </span>
                </div>
                {(emp as any).skills && (emp as any).skills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(emp as any).skills.map((s: string) => (
                      <span
                        key={s}
                        className="bg-neutral-100 text-neutral-600 text-[10px] px-2 py-0.5 rounded"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TeamSupervision() {
  const { deptEmployees, allEmployees, directoryLoading, userProfile } =
    useDeptDirectoryEmployees();

  if (directoryLoading) {
    return (
      <div className="p-8 min-h-full bg-neutral-50 flex items-center justify-center">
        <div className="text-[12px] text-neutral-500">Loading team members...</div>
      </div>
    );
  }

  return <SubordinateManager employees={deptEmployees} />;
}

// ==================== EMPLOYEE INSIGHTS ====================

type EmployeeNoteDraft = {
  strengths: string;
  weaknesses: string;
  notes: string;
  tags: string;
};

function EmployeeInsights() {
  const { deptEmployees, directoryLoading, userProfile } =
    useDeptDirectoryEmployees();
  const { notes, loading: notesLoading } = useEmployeeNotes();
  const [drafts, setDrafts] = useState<Record<string, EmployeeNoteDraft>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  React.useEffect(() => {
    // Always sync drafts with saved notes from Firebase
    const next: Record<string, EmployeeNoteDraft> = {};
    deptEmployees.forEach((emp) => {
      const existing = notes[emp.id];
      next[emp.id] = {
        strengths: existing?.strengths || "",
        weaknesses: existing?.weaknesses || "",
        notes: existing?.notes || "",
        tags: existing?.tags?.join(", ") || "",
      };
    });
    setDrafts(next);
  }, [deptEmployees, notes]);

  const handleChange = (
    employeeId: string,
    field: keyof EmployeeNoteDraft,
    value: string,
  ) => {
    setDrafts((prev) => ({
      ...prev,
      [employeeId]: {
        ...(prev[employeeId] || {
          strengths: "",
          weaknesses: "",
          notes: "",
          tags: "",
        }),
        [field]: value,
      },
    }));
    setSavedIds((prev) => {
      const next = new Set(prev);
      next.delete(employeeId);
      return next;
    });
  };

  const handleSave = async (employeeId: string) => {
    const draft = drafts[employeeId];
    if (!draft) return;

    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    setSavingIds((prev) => new Set(prev).add(employeeId));
    try {
      await updateEmployeeNotes(employeeId, {
        strengths: draft.strengths.trim(),
        weaknesses: draft.weaknesses.trim(),
        notes: draft.notes.trim(),
        tags,
        updatedBy: userProfile?.uid,
      });
      setSavedIds((prev) => new Set(prev).add(employeeId));
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(employeeId);
        return next;
      });
    }
  };

  if (directoryLoading || notesLoading) {
    return (
      <div className="p-8 min-h-full bg-neutral-50 flex items-center justify-center">
        <div className="text-[12px] text-neutral-500">Loading team notes…</div>
      </div>
    );
  }

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Team Intelligence"
        subtitle="Capture strengths, weaknesses, and notes for AI-assisted assignments"
      />

      {deptEmployees.length === 0 ? (
        <div className="text-sm text-neutral-500">
          No employees found in your department.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {deptEmployees.map((emp) => {
            const draft = drafts[emp.id] || {
              strengths: "",
              weaknesses: "",
              notes: "",
              tags: "",
            };
            const isSaving = savingIds.has(emp.id);
            const isSaved = savedIds.has(emp.id);

            return (
              <div
                key={emp.id}
                className="bg-white border border-neutral-200 rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
                      {emp.name}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      {emp.jobTitle}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {emp.email}
                    </div>
                  </div>
                  <div
                    className={`text-[10px] px-2 py-0.5 rounded-full ${emp.currentWorkload > 80 ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}
                  >
                    Load: {emp.currentWorkload}%
                  </div>
                </div>

                <div className="mt-3 space-y-2">
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                      Strengths
                    </label>
                    <textarea
                      rows={2}
                      value={draft.strengths}
                      onChange={(e) =>
                        handleChange(emp.id, "strengths", e.target.value)
                      }
                      placeholder="e.g., permit processing, compliance review"
                      className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                      Weaknesses
                    </label>
                    <textarea
                      rows={2}
                      value={draft.weaknesses}
                      onChange={(e) =>
                        handleChange(emp.id, "weaknesses", e.target.value)
                      }
                      placeholder="e.g., slow turnaround on field inspections"
                      className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                      Notes / Description
                    </label>
                    <textarea
                      rows={3}
                      value={draft.notes}
                      onChange={(e) =>
                        handleChange(emp.id, "notes", e.target.value)
                      }
                      placeholder="Context for AI and supervisors"
                      className="w-full resize-none rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-neutral-400 block mb-1">
                      Tags
                    </label>
                    <input
                      type="text"
                      value={draft.tags}
                      onChange={(e) =>
                        handleChange(emp.id, "tags", e.target.value)
                      }
                      placeholder="permits, inspections, compliance"
                      className="h-[34px] w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 text-[12px] text-neutral-800 outline-none focus:border-neutral-400 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <button
                    onClick={() => handleSave(emp.id)}
                    disabled={isSaving}
                    className="rounded-lg bg-neutral-900 px-3 py-1.5 text-[11px] font-['Lexend:Medium',_sans-serif] text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save Notes"}
                  </button>
                  {isSaved && (
                    <span className="text-[10px] text-emerald-600">Saved</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ==================== TASK BOARD ====================

export function DeptHeadTaskBoard() {
  // Fetch realtime data from Firebase
  const { tasks } = useTasks();
  const { deptEmployees, allEmployees, directoryLoading, userProfile } =
    useDeptDirectoryEmployees();
  const { notes, loading: notesLoading } = useEmployeeNotes();
  const { orgs } = useOrgs();

  const scopedOrgIds = useMemo(
    () => getDescendantOrgIds(orgs, userProfile?.departmentId),
    [orgs, userProfile?.departmentId],
  );
  // Filter tasks to org subtree — unassigned tasks still show regardless
  // of scoping so they can be triaged, matching the original behavior.
  const deptTasks = useMemo(() => {
    if (scopedOrgIds.length === 0) return tasks;
    return tasks.filter(
      (t) =>
        !t.orgId ||
        scopedOrgIds.includes(t.orgId) ||
        t.status === "pending_assignment",
    );
  }, [tasks, scopedOrgIds]);

  if (directoryLoading || notesLoading) {
    return (
      <div className="p-8 h-full bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
            Loading tasks and team members...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 h-full bg-neutral-50">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[12px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
          Department Task Board
        </div>
        <NotificationBell userId={userProfile?.uid} />
      </div>
      <MondayBoard
        tasks={deptTasks}
        employees={deptEmployees}
        allEmployees={allEmployees}
        employeeNotes={notes}
        role="depthead"
        departmentFilter={userProfile?.departmentId}
        currentUserId={userProfile?.uid}
        currentUserName={userProfile?.fullName || userProfile?.email || ""}
        onCreateTask={createTask}
        onAssign={assignTask}
        onVerify={(taskId, approve, feedback) =>
          verifyTask(taskId, approve, feedback, {
            id: userProfile?.uid,
            name:
              userProfile?.fullName ||
              userProfile?.email ||
              "Department Head",
          })
        }
        onUpdateTask={updateTask}
        onDeleteTask={deleteTask}
      />
    </div>
  );
}

export const hiddenDeptHeadComponents = [
  AggregatedHealth,
  BudgetStatus,
  TimelineReview,
  TeamAssignments,
  LeaderAssignments,
  ChainOfCommand,
  ProcessMiningGraphs,
  DelayNodeAlerts,
  InterventionMandates,
  DailySummary,
  ActionItemsExtraction,
  RedundancyFiltering,
  OptimalDistributionMatrix,
  ManualOverride,
  IdleTimeMinimization,
  RealTimeSpendTracking,
  OverrunPrevention,
  LeaderExpenseReports,
];

// ==================== ROUTER ====================

export const deptheadPages: Record<
  string,
  Record<string, React.ComponentType>
> = {
  deptportfolio: {
    "Programs & Activities": DeptHeadTaskBoard,
    "Task Composer": DeptHeadTaskBoard,
    "Team Intelligence": EmployeeInsights,
    "Team Supervision": TeamSupervision,
  },
};

export const deptheadDefaultPages: Record<string, string> = {
  deptportfolio: "Task Composer",
};

export function DeptHeadContent({
  activeSection,
  activePage,
}: {
  activeSection: string;
  activePage?: string;
}) {
  const section = deptheadPages[activeSection];
  if (!section) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        <div className="text-center">
          <Settings size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">
            Section coming soon
          </p>
          <p className="text-[12px] mt-1">Section: {activeSection}</p>
        </div>
      </div>
    );
  }
  const pageName =
    activePage ||
    deptheadDefaultPages[activeSection] ||
    Object.keys(section)[0];
  const Page = section[pageName] || section[Object.keys(section)[0]];
  return <Page />;
}
