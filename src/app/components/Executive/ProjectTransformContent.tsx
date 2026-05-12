import React, { useState } from "react";
import {
  Flag,
  CheckmarkOutline,
  Warning,
  Download,
  Filter,
  View,
  Analytics,
  ChartBar,
  Settings,
  ChevronDown,
  ChevronRight,
  Time,
  User,
  Renew,
  Security,
  DocumentExport,
  Search,
  Play,
  Add,
  Location,
  Calendar,
  Group,
  Home,
  Report,
  Upload,
} from "@carbon/icons-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  BarChart,
  Bar,
  Legend,
  ComposedChart,
} from "recharts";

// ==================== SHARED ====================
const pillMap: Record<string, string> = {
  "Working on it": "bg-amber-100 text-amber-700",
  Stuck: "bg-red-100 text-red-700",
  Done: "bg-emerald-100 text-emerald-700",
  "Not Started": "bg-neutral-100 text-neutral-500",
  "In Review": "bg-blue-100 text-blue-700",
  Passed: "bg-emerald-100 text-emerald-700",
  Fined: "bg-red-100 text-red-700",
  Approved: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Expired: "bg-red-100 text-red-700",
  Active: "bg-emerald-100 text-emerald-700",
  Critical: "bg-red-100 text-red-700",
  Warning: "bg-amber-100 text-amber-700",
  Healthy: "bg-emerald-100 text-emerald-700",
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
  Cleared: "bg-emerald-100 text-emerald-700",
  "On Track": "bg-emerald-100 text-emerald-700",
  Delayed: "bg-red-100 text-red-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Normal: "bg-emerald-100 text-emerald-700",
  "Near Full": "bg-red-100 text-red-700",
  Moderate: "bg-amber-100 text-amber-700",
  Completed: "bg-emerald-100 text-emerald-700",
  Upcoming: "bg-blue-100 text-blue-700",
};

function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] whitespace-nowrap ${pillMap[status] || "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Project Transform · Ormoc City LGU"}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Btn({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success" }) {
  const s: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
  };
  return (
    <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${s[variant]}`}>
      {icon}{label}
    </button>
  );
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat" }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex-1 min-w-[155px]">
      <p className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-1">{value}</p>
      {sub && (
        <p className={`text-[11px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${trend === "up" ? "text-emerald-600" : trend === "down" ? "text-red-600" : "text-neutral-500"}`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{sub}
        </p>
      )}
    </div>
  );
}

// Blockchain seal checkmark
function BlockchainSeal({ sealed }: { sealed: boolean }) {
  if (!sealed) return <span className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">Pending</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
      <CheckmarkOutline size={12} className="text-emerald-500" />
      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-700">Sealed</span>
    </span>
  );
}

// ==================== 3.1A INFRASTRUCTURE (₱450M) ====================

interface InfraTask {
  id: string;
  task: string;
  assignee: string;
  initials: string;
  status: string;
  budget: string;
  budgetPct: number;
  sealed: boolean;
  dependency?: string;
}

const infraPhases: { phase: string; color: string; tasks: InfraTask[] }[] = [
  {
    phase: "Phase 1: Site Preparation",
    color: "#10B981",
    tasks: [
      { id: "SP1", task: "Spillway Excavation", assignee: "Engr. R. Almeda", initials: "RA", status: "Done", budget: "₱18.5M", budgetPct: 4.1, sealed: true },
      { id: "SP2", task: "Land Grading & Clearing", assignee: "Engr. M. Torres", initials: "MT", status: "Done", budget: "₱12.2M", budgetPct: 2.7, sealed: true },
      { id: "SP3", task: "Access Road Foundation", assignee: "Engr. J. Santos", initials: "JS", status: "Working on it", budget: "₱32.8M", budgetPct: 7.3, sealed: false },
      { id: "SP4", task: "Drainage System Install", assignee: "Engr. P. Cruz", initials: "PC", status: "Working on it", budget: "₱21.0M", budgetPct: 4.7, sealed: false },
    ],
  },
  {
    phase: "Phase 2: Vertical Construction",
    color: "#2563EB",
    tasks: [
      { id: "VC1", task: "Visitor Center Structure", assignee: "Engr. L. Tan", initials: "LT", status: "Working on it", budget: "₱85.0M", budgetPct: 18.9, sealed: false, dependency: "SP3" },
      { id: "VC2", task: "Eco-Lodge Units (Batch 1)", assignee: "Engr. A. Reyes", initials: "AR", status: "Not Started", budget: "₱65.0M", budgetPct: 14.4, sealed: false, dependency: "SP4" },
      { id: "VC3", task: "Amphitheater & Event Space", assignee: "Engr. D. Garcia", initials: "DG", status: "Not Started", budget: "₱42.0M", budgetPct: 9.3, sealed: false, dependency: "VC1" },
      { id: "VC4", task: "Restroom & Service Facilities", assignee: "Engr. K. Lim", initials: "KL", status: "Stuck", budget: "₱18.5M", budgetPct: 4.1, sealed: false },
    ],
  },
  {
    phase: "Phase 3: Utilities & Finishing",
    color: "#F59E0B",
    tasks: [
      { id: "UF1", task: "Electrical Grid Connection", assignee: "Engr. S. Ong", initials: "SO", status: "Not Started", budget: "₱38.0M", budgetPct: 8.4, sealed: false, dependency: "VC1" },
      { id: "UF2", task: "Water Treatment Plant", assignee: "Engr. B. Navarro", initials: "BN", status: "Not Started", budget: "₱52.0M", budgetPct: 11.6, sealed: false },
      { id: "UF3", task: "Landscaping & Trail System", assignee: "Engr. C. Flores", initials: "CF", status: "Not Started", budget: "₱35.0M", budgetPct: 7.8, sealed: false, dependency: "VC2" },
      { id: "UF4", task: "Solar Panel Array", assignee: "Engr. H. Mendoza", initials: "HM", status: "Not Started", budget: "₱30.0M", budgetPct: 6.7, sealed: false, dependency: "UF1" },
    ],
  },
];

// Dependency alert data
const dependencyAlerts = [
  { from: "Access Road Foundation (SP3)", to: "Visitor Center Structure (VC1)", delay: "3 days behind", impact: "Pushes VC1 start by 3 days" },
  { from: "Restroom Facilities (VC4)", to: "—", delay: "Stuck: Mayor approval", impact: "Budget frozen at ₱18.5M" },
];

function InfrastructurePage() {
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set([0, 1, 2]));

  const togglePhase = (idx: number) => {
    const next = new Set(expandedPhases);
    next.has(idx) ? next.delete(idx) : next.add(idx);
    setExpandedPhases(next);
  };

  return (
    <div>
      <PageHeader
        title="Eco-Park Infrastructure Build"
        subtitle="Sustainable Tourism & Eco-Park · ₱450M Allocation"
        actions={<>
          <Btn icon={<View size={14} />} label="Gantt Timeline" />
          <Btn icon={<Play size={14} />} label="Run GA Workload Balancer" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Budget" value="₱450M" sub="FY 2026 allocation" />
        <StatCard label="Spent to Date" value="₱84.5M" sub="18.8% utilized" />
        <StatCard label="Tasks Complete" value="2/12" sub="16.7% done" />
        <StatCard label="Active Workers" value="142" sub="+8 this week" trend="up" />
      </div>

      {/* Dependency Alerts */}
      {dependencyAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <Warning size={16} className="text-amber-600" />
            <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-amber-800">Dependency Alerts — Timeline Shift Detected</h4>
          </div>
          <div className="space-y-2">
            {dependencyAlerts.map((a, i) => (
              <div key={i} className="flex items-center gap-3 text-[11px] font-['Lexend:Regular',_sans-serif]">
                <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded">{a.delay}</span>
                <span className="text-neutral-600">{a.from}</span>
                <ChevronRight size={12} className="text-neutral-400" />
                <span className="text-neutral-600">{a.to}</span>
                <span className="text-neutral-400">·</span>
                <span className="text-red-600">{a.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monday-style Multi-Stage Board */}
      <div className="space-y-4">
        {infraPhases.map((phase, pi) => (
          <div key={pi} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            {/* Group Header */}
            <button
              onClick={() => togglePhase(pi)}
              className="w-full flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-neutral-50/50 transition-colors"
            >
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: phase.color }} />
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 flex-1 text-left">{phase.phase}</span>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{phase.tasks.filter(t => t.status === "Done").length}/{phase.tasks.length} complete</span>
              <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expandedPhases.has(pi) ? "" : "-rotate-90"}`} />
            </button>

            {expandedPhases.has(pi) && (
              <>
                {/* Column Headers */}
                <div className="grid grid-cols-[1fr_140px_120px_110px_90px_90px] gap-0 px-5 py-2 border-t border-b border-neutral-100 bg-neutral-50/50">
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Task Name</span>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Assigned To</span>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Status</span>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Budget Draw</span>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide text-right">% of ₱450M</span>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide text-center">BC Seal</span>
                </div>
                {/* Rows */}
                {phase.tasks.map((t) => (
                  <div key={t.id} className="grid grid-cols-[1fr_140px_120px_110px_90px_90px] gap-0 px-5 py-3 border-b border-neutral-50 hover:bg-blue-50/30 transition-colors items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full" style={{ backgroundColor: phase.color, opacity: t.status === "Done" ? 1 : 0.4 }} />
                      <div>
                        <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.task}</span>
                        {t.dependency && (
                          <span className="ml-2 text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded">dep: {t.dependency}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-white" style={{ backgroundColor: phase.color }}>
                        {t.initials}
                      </div>
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 truncate">{t.assignee.split(". ")[1]}</span>
                    </div>
                    <Pill status={t.status} />
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.budget}</span>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <div className="w-12 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(t.budgetPct * 5, 100)}%`, backgroundColor: phase.color }} />
                        </div>
                        <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{t.budgetPct}%</span>
                      </div>
                    </div>
                    <div className="text-center"><BlockchainSeal sealed={t.sealed} /></div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 3.1B ENVIRONMENTAL PROTECTION ====================

interface PermitCard {
  id: string;
  permit: string;
  agency: string;
  status: string;
  daysInStage: number;
  sla: number;
  assignee: string;
  escalated: boolean;
}

const permitData: Record<string, PermitCard[]> = {
  "Application Filed": [
    { id: "P1", permit: "Water Quality Test Certificate", agency: "EMB Region 8", status: "Application Filed", daysInStage: 3, sla: 15, assignee: "ENRO Staff", escalated: false },
  ],
  "Agency Review": [
    { id: "P2", permit: "DENR Environmental Compliance Certificate (ECC)", agency: "DENR Region 8", status: "Agency Review", daysInStage: 18, sla: 15, assignee: "DENR Liaison", escalated: true },
    { id: "P3", permit: "Tree Cutting Permit", agency: "CENRO Ormoc", status: "Agency Review", daysInStage: 9, sla: 15, assignee: "CENRO Staff", escalated: false },
  ],
  "Approved / Cleared": [
    { id: "P4", permit: "Barangay Clearance (Brgy. Can-adieng)", agency: "Barangay Council", status: "Approved / Cleared", daysInStage: 0, sla: 7, assignee: "—", escalated: false },
    { id: "P5", permit: "Zoning Clearance", agency: "City Planning Office", status: "Approved / Cleared", daysInStage: 0, sla: 10, assignee: "—", escalated: false },
    { id: "P6", permit: "Fire Safety Inspection Certificate", agency: "BFP Ormoc", status: "Approved / Cleared", daysInStage: 0, sla: 10, assignee: "—", escalated: false },
  ],
  "Conditional / Pending Revision": [
    { id: "P7", permit: "EIA Study Revision (Habitat Impact)", agency: "DENR Region 8", status: "Conditional / Pending Revision", daysInStage: 6, sla: 20, assignee: "Env. Consultant", escalated: false },
  ],
};

const complianceCleared = 3;
const complianceTotal = 7;
const compliancePct = Math.round((complianceCleared / complianceTotal) * 100);

function EnvironmentalProtection() {
  return (
    <div>
      <PageHeader
        title="EIA & Ecological Compliance"
        subtitle="Sustainable Tourism & Eco-Park · Permits & Clearances"
        actions={<>
          <Btn icon={<Filter size={14} />} label="Overdue SLAs" />
          <Btn icon={<Download size={14} />} label="Export Tracker" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Permits" value="7" sub="Required before construction" />
        <StatCard label="Cleared" value={`${complianceCleared}`} sub={`${compliancePct}% compliance`} trend="up" />
        <StatCard label="In Review" value="3" sub="2 agency, 1 revision" />
        <StatCard label="SLA Breaches" value="1" sub="DENR ECC at 18 days" trend="down" />
      </div>

      {/* Compliance Battery */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Compliance Battery</h3>
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-emerald-600">{compliancePct}% Legal Hurdles Cleared</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-7 bg-neutral-100">
          <div className="bg-emerald-500 flex items-center justify-center transition-all" style={{ width: `${compliancePct}%` }}>
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-white">{complianceCleared} Cleared</span>
          </div>
          <div className="bg-amber-300 flex items-center justify-center" style={{ width: `${Math.round((3 / complianceTotal) * 100)}%` }}>
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-amber-900">3 In Progress</span>
          </div>
          <div className="bg-neutral-200 flex items-center justify-center" style={{ width: `${Math.round((1 / complianceTotal) * 100)}%` }}>
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-600">1</span>
          </div>
        </div>
      </div>

      {/* BPA Escalation Alert */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Warning size={14} className="text-red-600" />
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-red-800">BPA Auto-Escalation Triggered</span>
        </div>
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-700 ml-5">
          DENR ECC has exceeded the 15-day SLA (now at 18 days). The BPA engine has automatically escalated this to the Mayor's Office for intervention.
        </p>
      </div>

      {/* Compliance Kanban */}
      <div className="grid grid-cols-4 gap-3">
        {Object.entries(permitData).map(([stage, cards]) => (
          <div key={stage} className="bg-neutral-50 rounded-xl border border-neutral-200 p-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">{stage}</h4>
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{cards.length}</span>
            </div>
            <div className="space-y-2.5">
              {cards.map((card) => (
                <div key={card.id} className={`bg-white rounded-lg border p-3.5 shadow-sm ${card.escalated ? "border-red-300 ring-1 ring-red-100" : "border-neutral-200"}`}>
                  <h5 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">{card.permit}</h5>
                  <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-2">{card.agency}</p>
                  {card.daysInStage > 0 && (
                    <div className="flex items-center gap-2 mb-2">
                      <Time size={10} className={card.daysInStage > card.sla ? "text-red-500" : "text-neutral-400"} />
                      <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] ${card.daysInStage > card.sla ? "text-red-600" : "text-neutral-600"}`}>
                        {card.daysInStage}d / {card.sla}d SLA
                      </span>
                      {card.daysInStage > card.sla && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-['Lexend:Medium',_sans-serif]">BREACH</span>}
                    </div>
                  )}
                  {card.escalated && (
                    <div className="flex items-center gap-1.5 bg-red-50 rounded px-2 py-1 mt-1">
                      <Warning size={10} className="text-red-500" />
                      <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-red-700">Escalated to Mayor's Office</span>
                    </div>
                  )}
                  {card.status === "Approved / Cleared" && (
                    <div className="mt-1">
                      <BlockchainSeal sealed={true} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 3.1C REVENUE PROJECTIONS ====================
const revenueStreams = [
  { stream: "Entrance Fees", projected: 2800, actual: 3120, variance: 11.4 },
  { stream: "Eco-Lodge Bookings", projected: 4200, actual: 3850, variance: -8.3 },
  { stream: "Concessionaires", projected: 1500, actual: 1680, variance: 12.0 },
  { stream: "Event Space Rental", projected: 800, actual: 920, variance: 15.0 },
  { stream: "Guided Tours", projected: 600, actual: 540, variance: -10.0 },
  { stream: "Parking Fees", projected: 350, actual: 380, variance: 8.6 },
];

const npvHistory = [
  { month: "Jan", npv: 1180, budget: 420 },
  { month: "Feb", npv: 1165, budget: 425 },
  { month: "Mar", npv: 1140, budget: 432 },
  { month: "Apr", npv: 1120, budget: 440 },
  { month: "May", npv: 1105, budget: 445 },
  { month: "Jun", npv: 1095, budget: 448 },
  { month: "Jul", npv: 1085, budget: 450 },
  { month: "Aug", npv: 1070, budget: 452 },
  { month: "Sep", npv: 1060, budget: 453 },
  { month: "Oct", npv: 1055, budget: 454 },
];

const currentNPV = 1055;
const targetNPV = 900;
const npvPct = Math.min(Math.round((currentNPV / 1200) * 100), 100);

function RevenueProjections() {
  return (
    <div>
      <PageHeader
        title="Fiscal Viability Tracker"
        subtitle="Sustainable Tourism & Eco-Park · Revenue & ROI"
        actions={<>
          <Btn icon={<DocumentExport size={14} />} label="ROI Report" variant="primary" />
          <Btn icon={<Renew size={14} />} label="Recalculate NPV" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Projected Monthly Rev." value="₱10.25M" sub="Across 6 streams" />
        <StatCard label="Actual Monthly Rev." value="₱10.49M" sub="2.3% above target" trend="up" />
        <StatCard label="IRR" value="14.2%" sub="Above 10% threshold" trend="up" />
        <StatCard label="NPV" value={`₱${currentNPV}M`} sub="Positive, healthy" trend="up" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* NPV Health Gauge */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">NPV Health Gauge</h3>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-4">Net Present Value vs. threshold</p>
          <div className="flex flex-col items-center">
            {/* Semi-circle gauge */}
            <div className="relative w-48 h-24 overflow-hidden mb-3">
              <div className="absolute inset-0 w-48 h-48 rounded-full border-[16px] border-neutral-100" />
              <div
                className="absolute inset-0 w-48 h-48 rounded-full border-[16px] border-transparent"
                style={{
                  borderTopColor: npvPct > 75 ? "#10B981" : npvPct > 50 ? "#F59E0B" : "#EF4444",
                  borderRightColor: npvPct > 50 ? (npvPct > 75 ? "#10B981" : "#F59E0B") : "transparent",
                  borderLeftColor: npvPct > 25 ? (npvPct > 75 ? "#10B981" : npvPct > 50 ? "#F59E0B" : "#EF4444") : "transparent",
                  transform: `rotate(${-90 + (npvPct * 1.8)}deg)`,
                  transition: "all 1s ease",
                }}
              />
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{currentNPV}M</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-[10px] font-['Lexend:Regular',_sans-serif]">
              <span className="text-red-500">← Danger &lt;₱{targetNPV}M</span>
              <span className="text-emerald-500">Safe Zone →</span>
            </div>
          </div>
        </div>

        {/* NPV Trend */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 col-span-2">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">NPV vs. Cumulative Spend Trend</h3>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">As budget is consumed, NPV adjusts in real-time</p>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={npvHistory}>
              <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis key="x" dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis key="y1" yAxisId="left" tick={{ fontSize: 11 }} domain={[900, 1200]} />
              <YAxis key="y2" yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip key="t" />
              <Legend key="l" wrapperStyle={{ fontSize: 11 }} />
              <Line key="npv" yAxisId="left" type="monotone" dataKey="npv" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="NPV (₱M)" />
              <Bar key="budget" yAxisId="right" dataKey="budget" fill="#DBEAFE" name="Cum. Spend (₱M)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Table */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Monthly Revenue Streams (₱ Thousands)</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Revenue Stream", "Projected Monthly", "Actual Monthly", "Variance", "Status"].map((h) => (
                <th key={h} className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {revenueStreams.map((r) => (
              <tr key={r.stream} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{r.stream}</td>
                <td className="py-3 px-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">₱{r.projected.toLocaleString()}K</td>
                <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">₱{r.actual.toLocaleString()}K</td>
                <td className="py-3 px-3">
                  <span className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${r.variance >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                    {r.variance >= 0 ? "+" : ""}{r.variance}%
                  </span>
                </td>
                <td className="py-3 px-3">
                  <Pill status={r.variance >= 0 ? "On Track" : "At Risk"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 3.1 PARENT: SUSTAINABLE TOURISM ====================
function SustainableTourismOverview() {
  const totalBudget = 450;
  const spent = 84.5;
  const permits = { cleared: 3, total: 7 };
  const revActual = 10.49;

  return (
    <div>
      <PageHeader
        title="Sustainable Tourism & Eco-Park"
        subtitle="Project Transform · Flagship Initiative #1"
        actions={<>
          <Btn icon={<View size={14} />} label="Full Timeline" />
          <Btn icon={<Download size={14} />} label="Initiative Report" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Budget" value={`₱${totalBudget}M`} sub="FY 2026 allocation" />
        <StatCard label="Spent to Date" value={`₱${spent}M`} sub={`${Math.round((spent / totalBudget) * 100)}% utilized`} />
        <StatCard label="Compliance" value={`${permits.cleared}/${permits.total}`} sub={`${Math.round((permits.cleared / permits.total) * 100)}% permits cleared`} trend="up" />
        <StatCard label="Monthly Revenue" value={`₱${revActual}M`} sub="2.3% above target" trend="up" />
      </div>

      {/* Three module cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Infrastructure Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Home size={16} className="text-blue-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Infrastructure (₱450M)</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Physical build progress</p>
            </div>
          </div>
          {/* Mini battery */}
          <div className="flex rounded-full overflow-hidden h-4 bg-neutral-100 mb-2">
            <div className="bg-emerald-500 flex items-center justify-center" style={{ width: "17%" }}>
              <span className="text-[8px] text-white font-['Lexend:Medium',_sans-serif]">Done</span>
            </div>
            <div className="bg-amber-400" style={{ width: "25%" }} />
            <div className="bg-neutral-200" style={{ width: "58%" }} />
          </div>
          <div className="flex justify-between text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            <span>2/12 tasks complete</span>
            <span>142 workers</span>
          </div>
          {dependencyAlerts.length > 0 && (
            <div className="mt-3 flex items-center gap-1.5 text-[10px] font-['Lexend:Medium',_sans-serif] text-amber-700 bg-amber-50 rounded px-2 py-1">
              <Warning size={10} /> {dependencyAlerts.length} dependency alerts
            </div>
          )}
        </div>

        {/* Environmental Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Flag size={16} className="text-emerald-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Environmental Protection</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Permits & clearances</p>
            </div>
          </div>
          <div className="flex rounded-full overflow-hidden h-4 bg-neutral-100 mb-2">
            <div className="bg-emerald-500" style={{ width: `${compliancePct}%` }} />
            <div className="bg-amber-300" style={{ width: `${Math.round((3 / complianceTotal) * 100)}%` }} />
          </div>
          <div className="flex justify-between text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            <span>{complianceCleared}/{complianceTotal} cleared</span>
            <span>{compliancePct}% compliant</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-[10px] font-['Lexend:Medium',_sans-serif] text-red-700 bg-red-50 rounded px-2 py-1">
            <Warning size={10} /> 1 SLA breach — DENR ECC
          </div>
        </div>

        {/* Revenue Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><ChartBar size={16} className="text-violet-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Revenue Projections</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Fiscal viability</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={70}>
            <AreaChart data={npvHistory.slice(-5)}>
              <Area key="a" type="monotone" dataKey="npv" stroke="#8B5CF6" fill="#EDE9FE" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex justify-between text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">
            <span>NPV: ₱{currentNPV}M</span>
            <span className="text-emerald-600">IRR: 14.2%</span>
          </div>
        </div>
      </div>

      {/* Quick board preview */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Priority Tasks Across Phases</h3>
        <div className="space-y-2">
          {infraPhases.flatMap(p => p.tasks).filter(t => t.status === "Working on it" || t.status === "Stuck").map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-neutral-100 hover:bg-neutral-50/50 transition-colors">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-blue-600">{t.initials}</div>
              <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 flex-1">{t.task}</span>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{t.budget}</span>
              <Pill status={t.status} />
              <BlockchainSeal sealed={t.sealed} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 3.2A #SHInEOrmoc INITIATIVE ====================

interface CampaignTask {
  activity: string;
  date: string;
  participation: number;
  budget: string;
  status: string;
  nlpUpdated: boolean;
}

const campaignData: Record<string, CampaignTask[]> = {
  "Brgy. Ipil": [
    { activity: "Coastal Cleanup Drive", date: "Apr 8, 2026", participation: 127, budget: "₱45K", status: "Completed", nlpUpdated: true },
    { activity: "Information Drive — Plastic Ban", date: "Apr 14, 2026", participation: 0, budget: "₱18K", status: "Upcoming", nlpUpdated: false },
  ],
  "Brgy. Punta": [
    { activity: "River Cleanup + Sorting", date: "Apr 6, 2026", participation: 89, budget: "₱52K", status: "Completed", nlpUpdated: true },
    { activity: "School Eco-Education Module", date: "Apr 12, 2026", participation: 210, budget: "₱15K", status: "Working on it", nlpUpdated: false },
  ],
  "Brgy. Can-adieng": [
    { activity: "Mangrove Planting", date: "Apr 10, 2026", participation: 65, budget: "₱38K", status: "Completed", nlpUpdated: true },
    { activity: "Waste Audit Workshop", date: "Apr 16, 2026", participation: 0, budget: "₱22K", status: "Upcoming", nlpUpdated: false },
  ],
  "Brgy. Lao": [
    { activity: "Coastline Assessment", date: "Apr 11, 2026", participation: 42, budget: "₱28K", status: "Working on it", nlpUpdated: true },
  ],
};

function SHInEOrmocInitiative() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(Object.keys(campaignData)));

  const toggleGroup = (g: string) => {
    const n = new Set(expanded);
    n.has(g) ? n.delete(g) : n.add(g);
    setExpanded(n);
  };

  const totalParticipation = Object.values(campaignData).flat().reduce((s, t) => s + t.participation, 0);

  return (
    <div>
      <PageHeader
        title="SHInE Campaign Logistics"
        subtitle="Marine Litter & Circular Economy · #SHInEOrmoc"
        actions={<>
          <Btn icon={<Group size={14} />} label="Dispatch Field Team" variant="primary" />
          <Btn icon={<Filter size={14} />} label="By District" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Barangays" value={`${Object.keys(campaignData).length}`} sub="With scheduled activities" />
        <StatCard label="Total Participation" value={totalParticipation.toLocaleString()} sub="Citizens engaged" trend="up" />
        <StatCard label="Activities This Month" value={`${Object.values(campaignData).flat().length}`} sub="3 completed, 4 upcoming" />
        <StatCard label="NLP Auto-Updates" value="4" sub="From Viber voice notes" trend="up" />
      </div>

      {/* NLP Integration Banner */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.03 2 10.94c0 2.7 1.36 5.12 3.5 6.73V22l3.88-2.13c.83.23 1.71.35 2.62.35 5.52 0 10-4.03 10-8.94S17.52 2 12 2z" fill="#7C3AED" /></svg>
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-violet-800">NLP Voice Note Integration Active</span>
        </div>
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-violet-700 ml-5">
          Last update: <em>"We collected 50 bags in Punta today, 89 volunteers showed up"</em> → Auto-parsed → Participation Count: 89, Status: Completed
        </p>
      </div>

      {/* Dynamic Task Board grouped by Barangay */}
      <div className="space-y-3">
        {Object.entries(campaignData).map(([brgy, tasks]) => (
          <div key={brgy} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
            <button onClick={() => toggleGroup(brgy)} className="w-full flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-neutral-50/50 transition-colors">
              <Location size={14} className="text-emerald-600" />
              <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 flex-1 text-left">{brgy}</span>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{tasks.length} activities</span>
              <ChevronDown size={14} className={`text-neutral-400 transition-transform ${expanded.has(brgy) ? "" : "-rotate-90"}`} />
            </button>

            {expanded.has(brgy) && (
              <>
                <div className="grid grid-cols-[1fr_100px_100px_80px_90px_80px] gap-0 px-5 py-2 border-t border-b border-neutral-100 bg-neutral-50/50">
                  {["Activity", "Date", "Participation", "Budget", "Status", "NLP"].map((h) => (
                    <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
                  ))}
                </div>
                {tasks.map((t, i) => (
                  <div key={i} className="grid grid-cols-[1fr_100px_100px_80px_90px_80px] gap-0 px-5 py-3 border-b border-neutral-50 hover:bg-emerald-50/20 transition-colors items-center">
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.activity}</span>
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{t.date}</span>
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.participation > 0 ? t.participation.toLocaleString() : "—"}</span>
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{t.budget}</span>
                    <Pill status={t.status} />
                    <div>
                      {t.nlpUpdated ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-['Lexend:Medium',_sans-serif] text-violet-700 bg-violet-50 px-2 py-0.5 rounded-full">
                          <CheckmarkOutline size={10} /> Auto
                        </span>
                      ) : (
                        <span className="text-[10px] text-neutral-400">Manual</span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 3.2B PLASTIC REGULATION COMPLIANCE ====================
const businessRegistry = [
  { name: "Ormoc Downtown Market Corp.", zone: "Zone 1", lastInspection: "Mar 28, 2026", status: "Passed", inspector: "Insp. D. Reyes", violations: 0 },
  { name: "LakeMall Commercial Center", zone: "Zone 1", lastInspection: "Mar 15, 2026", status: "Warning", inspector: "Insp. D. Reyes", violations: 2 },
  { name: "Green Valley Grocery", zone: "Zone 2", lastInspection: "Apr 2, 2026", status: "Passed", inspector: "Insp. A. Lim", violations: 0 },
  { name: "Punta Seafood Restaurant", zone: "Zone 3", lastInspection: "Feb 20, 2026", status: "Fined", inspector: "Insp. M. Torres", violations: 5 },
  { name: "Ipil Hardware & Supply", zone: "Zone 2", lastInspection: "Mar 30, 2026", status: "Passed", inspector: "Insp. A. Lim", violations: 0 },
  { name: "City Center Food Court", zone: "Zone 1", lastInspection: "Apr 5, 2026", status: "Warning", inspector: "Insp. D. Reyes", violations: 1 },
  { name: "Eco-Friendly Packaging Co.", zone: "Zone 3", lastInspection: "Apr 8, 2026", status: "Passed", inspector: "Insp. M. Torres", violations: 0 },
  { name: "Ormoc Bay Hotel", zone: "Zone 3", lastInspection: "Jan 15, 2026", status: "Fined", inspector: "Insp. M. Torres", violations: 3 },
];

function PlasticRegulationCompliance() {
  const [searchTerm, setSearchTerm] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string | null>(null);

  const filtered = businessRegistry.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesZone = !zoneFilter || b.zone === zoneFilter;
    return matchesSearch && matchesZone;
  });

  const zones = [...new Set(businessRegistry.map(b => b.zone))];
  const passedCount = businessRegistry.filter(b => b.status === "Passed").length;

  return (
    <div>
      <PageHeader
        title="City Ordinance Enforcement"
        subtitle="Marine Litter & Circular Economy · Plastic Regulation"
        actions={<>
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Search business..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 border border-neutral-200 rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-900 placeholder:text-neutral-400 outline-none focus:ring-2 focus:ring-blue-100 w-48"
            />
          </div>
          <Btn icon={<Download size={14} />} label="Export Registry" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Registered Businesses" value={`${businessRegistry.length}`} sub="In enforcement registry" />
        <StatCard label="Passed" value={`${passedCount}`} sub={`${Math.round((passedCount / businessRegistry.length) * 100)}% compliance`} trend="up" />
        <StatCard label="Warnings Issued" value="3" sub="Pending correction" />
        <StatCard label="Fines Collected" value="₱48K" sub="2 businesses fined" trend="down" />
      </div>

      {/* RLS Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-5 flex items-center gap-2">
        <Security size={14} className="text-blue-600" />
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-blue-700">
          <strong>Row-Level Security:</strong> BPLO inspectors see only their assigned zones. ENRO Head has city-wide visibility. Current view: <strong>ENRO Head (All Zones)</strong>
        </p>
      </div>

      {/* Zone filter tabs */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setZoneFilter(null)}
          className={`px-3 py-1.5 rounded-lg text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${!zoneFilter ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"}`}
        >All Zones</button>
        {zones.map((z) => (
          <button key={z} onClick={() => setZoneFilter(zoneFilter === z ? null : z)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${zoneFilter === z ? "bg-neutral-900 text-white" : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"}`}
          >{z}</button>
        ))}
      </div>

      {/* Audit Registry Table */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-100">
              {["Business Name", "Zone", "Last Inspection", "Violations", "Inspector", "Status"].map((h) => (
                <th key={h} className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.name} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{b.name}</td>
                <td className="py-3 px-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{b.zone}</td>
                <td className="py-3 px-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{b.lastInspection}</td>
                <td className="py-3 px-3">
                  {b.violations > 0 ? (
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-red-600">{b.violations}</span>
                  ) : (
                    <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-400">0</span>
                  )}
                </td>
                <td className="py-3 px-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{b.inspector}</td>
                <td className="py-3 px-3"><Pill status={b.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 3.2C TRASH TRAP INTERCEPTION RATES ====================
interface TrapLocation {
  id: string;
  name: string;
  river: string;
  kgWeekly: number;
  capacity: number;
  clearingTeam: string;
  status: string;
  lat: number;
  lng: number;
}

const trashTraps: TrapLocation[] = [
  { id: "TT1", name: "Bao River — Brgy. Ipil Bridge", river: "Bao River", kgWeekly: 285, capacity: 78, clearingTeam: "Team Alpha", status: "Warning", lat: 11.01, lng: 124.61 },
  { id: "TT2", name: "Bao River — Downtown Weir", river: "Bao River", kgWeekly: 420, capacity: 92, clearingTeam: "Team Alpha", status: "Near Full", lat: 11.00, lng: 124.60 },
  { id: "TT3", name: "Pagsangaan River — Confluence", river: "Pagsangaan River", kgWeekly: 180, capacity: 45, clearingTeam: "Team Bravo", status: "Normal", lat: 10.99, lng: 124.62 },
  { id: "TT4", name: "Malbasag Creek — School Zone", river: "Malbasag Creek", kgWeekly: 95, capacity: 32, clearingTeam: "Team Charlie", status: "Normal", lat: 11.02, lng: 124.59 },
  { id: "TT5", name: "Lao River — Barangay Hall", river: "Lao River", kgWeekly: 340, capacity: 85, clearingTeam: "Team Bravo", status: "Warning", lat: 10.98, lng: 124.63 },
  { id: "TT6", name: "Pagsangaan River — Coastal Outlet", river: "Pagsangaan River", kgWeekly: 510, capacity: 95, clearingTeam: "Team Charlie", status: "Near Full", lat: 10.97, lng: 124.64 },
];

const weatherForecast = [
  { day: "Mon", rain: 12, trapRisk: "TT2, TT6" },
  { day: "Tue", rain: 35, trapRisk: "TT1, TT2, TT5, TT6" },
  { day: "Wed", rain: 48, trapRisk: "ALL — Heavy Rain Alert" },
  { day: "Thu", rain: 22, trapRisk: "TT2, TT6" },
  { day: "Fri", rain: 8, trapRisk: "TT6" },
];

function TrashTrapInterception() {
  return (
    <div>
      <PageHeader
        title="River System Interception"
        subtitle="Marine Litter & Circular Economy · IoT Monitoring"
        actions={<>
          <Btn icon={<Location size={14} />} label="GIS Map View" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export Data" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Traps" value={`${trashTraps.length}`} sub="Across 4 river systems" />
        <StatCard label="Weekly Interception" value={`${trashTraps.reduce((s, t) => s + t.kgWeekly, 0).toLocaleString()} kg`} sub="+12% vs last week" trend="up" />
        <StatCard label="Near Full" value={`${trashTraps.filter(t => t.status === "Near Full").length}`} sub="Requires immediate clearing" trend="down" />
        <StatCard label="Avg. Capacity" value={`${Math.round(trashTraps.reduce((s, t) => s + t.capacity, 0) / trashTraps.length)}%`} sub="Across all traps" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Map Placeholder */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 col-span-2">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Trap Location Map — Ormoc River Systems</h3>
          <div className="bg-gradient-to-br from-blue-50 to-emerald-50 rounded-lg h-[280px] relative overflow-hidden border border-neutral-100">
            {/* Stylized map representation */}
            <svg className="w-full h-full" viewBox="0 0 500 280">
              {/* Rivers */}
              <path d="M50,50 Q150,80 200,150 T350,250" stroke="#93C5FD" strokeWidth="3" fill="none" opacity="0.6" />
              <path d="M120,20 Q200,100 250,180 T400,270" stroke="#93C5FD" strokeWidth="2.5" fill="none" opacity="0.5" />
              <path d="M300,30 Q280,120 260,200 T240,270" stroke="#93C5FD" strokeWidth="2" fill="none" opacity="0.4" />
              <path d="M400,60 Q350,140 320,200" stroke="#93C5FD" strokeWidth="2" fill="none" opacity="0.4" />
              {/* Trap pins */}
              {trashTraps.map((trap, i) => {
                const x = 80 + (i * 65);
                const y = 60 + (i % 3) * 70;
                const color = trap.status === "Near Full" ? "#EF4444" : trap.status === "Warning" ? "#F59E0B" : "#10B981";
                return (
                  <g key={trap.id}>
                    <circle cx={x} cy={y} r="12" fill={color} opacity="0.2" />
                    <circle cx={x} cy={y} r="6" fill={color} stroke="white" strokeWidth="2" />
                    <text x={x} y={y + 22} textAnchor="middle" className="text-[8px]" fill="#6B7280">{trap.id}</text>
                  </g>
                );
              })}
            </svg>
            {/* Legend */}
            <div className="absolute bottom-3 right-3 bg-white/90 rounded-lg px-3 py-2 shadow-sm">
              <div className="flex items-center gap-3">
                {[{ c: "#10B981", l: "Normal" }, { c: "#F59E0B", l: "Warning" }, { c: "#EF4444", l: "Near Full" }].map((x) => (
                  <div key={x.l} className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: x.c }} />
                    <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{x.l}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Predictive Weather Widget */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">AI Storm Predictor</h3>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">Random Forest: rainfall → trap overflow prediction</p>
          <div className="space-y-2.5">
            {weatherForecast.map((w) => (
              <div key={w.day} className={`rounded-lg p-2.5 border ${w.rain > 30 ? "bg-red-50 border-red-200" : w.rain > 15 ? "bg-amber-50 border-amber-200" : "bg-neutral-50 border-neutral-200"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{w.day}</span>
                  <span className={`text-[11px] font-['Lexend:Medium',_sans-serif] ${w.rain > 30 ? "text-red-600" : w.rain > 15 ? "text-amber-600" : "text-neutral-500"}`}>{w.rain}mm</span>
                </div>
                <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">At risk: {w.trapRisk}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
            <p className="text-[10px] font-['Lexend:Medium',_sans-serif] text-amber-800">⚡ Auto-dispatch: Wednesday clearing crews pre-assigned to TT2, TT5, TT6 based on heavy rain forecast.</p>
          </div>
        </div>
      </div>

      {/* Volume Tracking Table */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Volume Tracking — Weekly Interception</h3>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-neutral-100">
              {["ID", "Trap Location", "River System", "Kg/Week", "Capacity", "Clearing Team", "Status"].map((h) => (
                <th key={h} className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trashTraps.map((t) => (
              <tr key={t.id} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                <td className="py-3 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500">{t.id}</td>
                <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.name}</td>
                <td className="py-3 px-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{t.river}</td>
                <td className="py-3 px-3 text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{t.kgWeekly}</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${t.capacity}%`, backgroundColor: t.capacity > 85 ? "#EF4444" : t.capacity > 60 ? "#F59E0B" : "#10B981" }} />
                    </div>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{t.capacity}%</span>
                  </div>
                </td>
                <td className="py-3 px-3 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{t.clearingTeam}</td>
                <td className="py-3 px-3"><Pill status={t.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ==================== 3.2 PARENT: MARINE LITTER ====================
function MarineLitterOverview() {
  const totalKg = trashTraps.reduce((s, t) => s + t.kgWeekly, 0);
  const totalParticipation = Object.values(campaignData).flat().reduce((s, t) => s + t.participation, 0);

  return (
    <div>
      <PageHeader
        title="Marine Litter & Circular Economy"
        subtitle="Project Transform · Flagship Initiative #2"
        actions={<>
          <Btn icon={<Analytics size={14} />} label="Campaign Analytics" />
          <Btn icon={<Download size={14} />} label="Initiative Report" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Weekly Interception" value={`${totalKg.toLocaleString()} kg`} sub="Across 6 traps" trend="up" />
        <StatCard label="Citizen Engagement" value={totalParticipation.toLocaleString()} sub="Campaign participants" trend="up" />
        <StatCard label="Businesses Audited" value={`${businessRegistry.length}`} sub={`${businessRegistry.filter(b => b.status === "Passed").length} compliant`} />
        <StatCard label="Active Barangays" value={`${Object.keys(campaignData).length}`} sub="#SHInEOrmoc reach" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* SHInE Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Group size={16} className="text-emerald-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">#SHInEOrmoc</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Community engagement</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={Object.entries(campaignData).map(([k, v]) => ({ brgy: k.replace("Brgy. ", ""), count: v.reduce((s, t) => s + t.participation, 0) }))}>
              <Bar key="count" dataKey="count" fill="#10B981" radius={[3, 3, 0, 0]} />
              <XAxis key="x" dataKey="brgy" tick={{ fontSize: 9 }} />
              <Tooltip key="t" />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-2">{Object.values(campaignData).flat().length} activities this month</p>
        </div>

        {/* Plastic Compliance Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Security size={16} className="text-blue-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Plastic Regulation</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Ordinance enforcement</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <PieChart>
              <Pie key="pie" data={[
                { name: "Passed", value: businessRegistry.filter(b => b.status === "Passed").length, fill: "#10B981" },
                { name: "Warning", value: businessRegistry.filter(b => b.status === "Warning").length, fill: "#F59E0B" },
                { name: "Fined", value: businessRegistry.filter(b => b.status === "Fined").length, fill: "#EF4444" },
              ]} cx="50%" cy="50%" innerRadius={20} outerRadius={35} dataKey="value">
                {[
                  { fill: "#10B981" },
                  { fill: "#F59E0B" },
                  { fill: "#EF4444" },
                ].map((entry, i) => <Cell key={`c-${i}`} fill={entry.fill} />)}
              </Pie>
              <Tooltip key="t" />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-2">{businessRegistry.length} businesses in registry</p>
        </div>

        {/* Trash Trap Card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Flag size={16} className="text-amber-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Trash Trap Network</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">IoT interception monitoring</p>
            </div>
          </div>
          <div className="space-y-1.5 mt-2">
            {trashTraps.slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.capacity > 85 ? "#EF4444" : t.capacity > 60 ? "#F59E0B" : "#10B981" }} />
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600 flex-1 truncate">{t.id}: {t.name.split(" — ")[1]}</span>
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.capacity}%</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-2">{totalKg.toLocaleString()} kg intercepted this week</p>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Monthly Interception Trend (kg)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={[
            { week: "W1", kg: 1450 },
            { week: "W2", kg: 1620 },
            { week: "W3", kg: 1380 },
            { week: "W4", kg: 1830 },
          ]}>
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis key="y" tick={{ fontSize: 11 }} />
            <Tooltip key="t" />
            <Area key="a" type="monotone" dataKey="kg" stroke="#10B981" fill="#D1FAE5" name="Kg Intercepted" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== EXPORTS ====================
export const transformPages: Record<string, Record<string, React.ComponentType>> = {
  transform: {
    "Sustainable Tourism & Eco-Resorts": SustainableTourismOverview,
    "Infrastructure (₱450M)": InfrastructurePage,
    "Environmental Protection (₱170M)": EnvironmentalProtection,
    "Revenue Projections": RevenueProjections,
    "Marine Litter & Circular Economy": MarineLitterOverview,
    "#SHInEOrmoc Initiative": SHInEOrmocInitiative,
    "Plastic Regulation Compliance": PlasticRegulationCompliance,
    "Trash Trap Interception Rates": TrashTrapInterception,
  },
};
