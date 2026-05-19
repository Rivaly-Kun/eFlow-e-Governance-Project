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
  Time,
  User,
  Renew,
  Security,
  DocumentExport,
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
  Treemap,
} from "recharts";

import { transformPages } from "./ProjectTransformContent";
import { financialPages } from "./FinancialOversightContent";
import { auditPages } from "./ImmutableAuditContent";

// ==================== SHARED STYLES ====================
const pillStyles: Record<string, string> = {
  Healthy: "bg-emerald-100 text-emerald-700",
  "On Track": "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-700",
  Breached: "bg-red-100 text-red-700",
  Delayed: "bg-red-100 text-red-700",
  "Under Review": "bg-blue-100 text-blue-700",
  Active: "bg-emerald-100 text-emerald-700",
  Stalled: "bg-red-100 text-red-700",
  Resolved: "bg-neutral-100 text-neutral-500",
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
  Fast: "bg-emerald-100 text-emerald-700",
  Moderate: "bg-amber-100 text-amber-700",
  Slow: "bg-red-100 text-red-700",
  Positive: "bg-emerald-100 text-emerald-700",
  Negative: "bg-red-100 text-red-700",
};

function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] ${pillStyles[status] || "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

function PageHeader({ title, actions }: { title: string; actions: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Executive Portfolio · Ormoc City LGU</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function ActionButton({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
  };
  return (
    <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${styles[variant]}`}>
      {icon}
      {label}
    </button>
  );
}

function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat" }) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex-1 min-w-[160px]">
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

// ==================== BATTERY WIDGET ====================
function BatteryWidget({ project, completion, workforce, phases, status }: {
  project: string; completion: number; workforce: number; status: string;
  phases: { name: string; pct: number; color: string }[];
}) {
  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{project}</h3>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Overall: {completion}% Complete · Active Workforce: {workforce} Staff</p>
        </div>
        <Pill status={status} />
      </div>
      {/* Battery bar */}
      <div className="flex rounded-full overflow-hidden h-6 bg-neutral-100">
        {phases.map((p, i) => (
          <div key={i} className="relative flex items-center justify-center" style={{ width: `${p.pct}%`, backgroundColor: p.color }}>
            {p.pct > 10 && <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-white drop-shadow-sm">{p.name}</span>}
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-2.5">
        {phases.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{p.name} ({p.pct}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 1. PORTFOLIO COMPLETION RATES ====================
const pillarData = [
  { name: "Infrastructure", value: 38, color: "#2563EB" },
  { name: "Health", value: 22, color: "#10B981" },
  { name: "Eco-Tourism", value: 18, color: "#F59E0B" },
  { name: "Education", value: 12, color: "#8B5CF6" },
  { name: "Governance", value: 10, color: "#EC4899" },
];

const projectBatteries = [
  { project: "Lake Danao Road Expansion", completion: 64, workforce: 142, status: "On Track", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 100, color: "#2563EB" }, { name: "Execution", pct: 45, color: "#F59E0B" }, { name: "Liquidation", pct: 0, color: "#9CA3AF" }] },
  { project: "Ormoc Smart Clinic Network", completion: 41, workforce: 87, status: "At Risk", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 78, color: "#2563EB" }, { name: "Execution", pct: 12, color: "#F59E0B" }, { name: "Liquidation", pct: 0, color: "#9CA3AF" }] },
  { project: "Eco-Park Revitalization", completion: 82, workforce: 203, status: "On Track", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 100, color: "#2563EB" }, { name: "Execution", pct: 89, color: "#F59E0B" }, { name: "Liquidation", pct: 38, color: "#9CA3AF" }] },
  { project: "Digital Public Records System", completion: 28, workforce: 34, status: "Delayed", phases: [{ name: "Planning", pct: 100, color: "#10B981" }, { name: "Procurement", pct: 52, color: "#2563EB" }, { name: "Execution", pct: 0, color: "#F59E0B" }, { name: "Liquidation", pct: 0, color: "#9CA3AF" }] },
];

function PortfolioCompletionRates() {
  const [selectedPillar, setSelectedPillar] = useState<string | null>(null);
  const filtered = selectedPillar ? projectBatteries.filter((_, i) => i % 2 === (selectedPillar === "Infrastructure" ? 0 : 1)) : projectBatteries;

  return (
    <div>
      <PageHeader
        title="City-Wide Project Completion"
        actions={<>
          <ActionButton icon={<Filter size={14} />} label="FY 2026" />
          <ActionButton icon={<DocumentExport size={14} />} label="DILG Transparency Report" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Projects" value="47" sub="+3 this quarter" trend="up" />
        <StatCard label="Avg. Completion" value="54%" sub="2.3% above target" trend="up" />
        <StatCard label="Active Workforce" value="1,248" sub="Across 20+ departments" />
        <StatCard label="At-Risk Projects" value="6" sub="2 more than last month" trend="down" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Pillar Sunburst */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 col-span-1">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Pillar Breakdown</h3>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">Click a slice to filter projects</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                key="pillar-pie"
                data={pillarData}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                onClick={(d) => setSelectedPillar(selectedPillar === d.name ? null : d.name)}
                style={{ cursor: "pointer" }}
              >
                {pillarData.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.color} opacity={selectedPillar && selectedPillar !== entry.name ? 0.3 : 1} />
                ))}
              </Pie>
              <Tooltip key="pillar-tooltip" />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {pillarData.map((p) => (
              <button key={p.name} onClick={() => setSelectedPillar(selectedPillar === p.name ? null : p.name)} className={`flex items-center gap-1.5 text-[10px] font-['Lexend:Regular',_sans-serif] px-2 py-1 rounded-full cursor-pointer transition-all ${selectedPillar === p.name ? "ring-2 ring-offset-1" : ""}`} style={{ borderColor: p.color }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {/* Completion Trend */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 col-span-2">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Monthly Completion Trend</h3>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={[
              { month: "Jan", completion: 32, target: 35 },
              { month: "Feb", completion: 36, target: 38 },
              { month: "Mar", completion: 41, target: 42 },
              { month: "Apr", completion: 45, target: 46 },
              { month: "May", completion: 48, target: 50 },
              { month: "Jun", completion: 50, target: 54 },
              { month: "Jul", completion: 54, target: 58 },
              { month: "Aug", completion: 57, target: 62 },
              { month: "Sep", completion: 61, target: 66 },
              { month: "Oct", completion: 64, target: 70 },
            ]}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis key="x" dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis key="y" tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip key="tip" />
              <Area key="target" type="monotone" dataKey="target" stroke="#E5E7EB" fill="#F9FAFB" strokeDasharray="4 4" name="Target" />
              <Area key="completion" type="monotone" dataKey="completion" stroke="#2563EB" fill="#DBEAFE" name="Actual" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Battery Boards */}
      <div>
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">
          Project Battery Boards {selectedPillar && <span className="text-blue-600">· {selectedPillar}</span>}
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {filtered.map((p) => <BatteryWidget key={p.project} {...p} />)}
        </div>
      </div>
    </div>
  );
}

// ==================== 2. BUDGET BURN-DOWN ====================
const burnDownData = [
  { month: "Jan", advanced: 120, liquidated: 45 },
  { month: "Feb", advanced: 185, liquidated: 92 },
  { month: "Mar", advanced: 240, liquidated: 148 },
  { month: "Apr", advanced: 310, liquidated: 201 },
  { month: "May", advanced: 365, liquidated: 255 },
  { month: "Jun", advanced: 420, liquidated: 310 },
  { month: "Jul", advanced: 488, liquidated: 368 },
  { month: "Aug", advanced: 540, liquidated: 412 },
  { month: "Sep", advanced: 595, liquidated: 465 },
  { month: "Oct", advanced: 640, liquidated: 502 },
];

const deptEfficiency = [
  { dept: "Engineering", velocity: 94, pending: "₱2.1M", status: "Fast", daysAvg: 4.2 },
  { dept: "Health", velocity: 88, pending: "₱3.4M", status: "Fast", daysAvg: 5.1 },
  { dept: "BPLO", velocity: 76, pending: "₱5.8M", status: "Moderate", daysAvg: 8.7 },
  { dept: "Social Welfare", velocity: 71, pending: "₱4.2M", status: "Moderate", daysAvg: 9.3 },
  { dept: "Eco-Tourism", velocity: 62, pending: "₱8.1M", status: "Slow", daysAvg: 14.2 },
  { dept: "Agriculture", velocity: 58, pending: "₱6.7M", status: "Slow", daysAvg: 16.8 },
  { dept: "General Services", velocity: 45, pending: "₱12.3M", status: "Slow", daysAvg: 22.1 },
];

function BudgetBurnDown() {
  return (
    <div>
      <PageHeader
        title="Fiscal Utilization & Liquidation"
        actions={<>
          <ActionButton icon={<Security size={14} />} label="Blockchain Ledger Summary" />
          <ActionButton icon={<Download size={14} />} label="Export" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Advanced" value="₱640M" sub="FY 2026 to date" />
        <StatCard label="Total Liquidated" value="₱502M" sub="78.4% recovery rate" trend="up" />
        <StatCard label="Outstanding Gap" value="₱138M" sub="₱12M increase this month" trend="down" />
        <StatCard label="Portfolio NPV" value="₱1.2B" sub="Positive ROI maintained" trend="up" />
      </div>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Advance vs Return dual line */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">Advance vs. Return Scale</h3>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">Cumulative fund flow (₱ Millions)</p>
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={burnDownData}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis key="x" dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis key="y" tick={{ fontSize: 11 }} />
              <Tooltip key="tip" />
              <Legend key="legend" wrapperStyle={{ fontSize: 11 }} />
              <Line key="adv" type="monotone" dataKey="advanced" stroke="#2563EB" strokeWidth={2} dot={{ r: 3 }} name="Funds Advanced" />
              <Line key="liq" type="monotone" dataKey="liquidated" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} name="Funds Liquidated" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* ROI/NPV Summary */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">ROI / NPV Tracker</h3>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">AI-calculated Net Present Value by project pillar</p>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={[
              { pillar: "Infra", npv: 520, roi: 18 },
              { pillar: "Health", npv: 280, roi: 22 },
              { pillar: "Eco-Tour", npv: 180, roi: 31 },
              { pillar: "Education", npv: 140, roi: 15 },
              { pillar: "Governance", npv: 80, roi: 12 },
            ]}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis key="x" dataKey="pillar" tick={{ fontSize: 11 }} />
              <YAxis key="y1" yAxisId="left" tick={{ fontSize: 11 }} />
              <YAxis key="y2" yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
              <Tooltip key="tip" />
              <Legend key="legend" wrapperStyle={{ fontSize: 11 }} />
              <Bar key="npv" yAxisId="left" dataKey="npv" fill="#2563EB" radius={[4, 4, 0, 0]} name="NPV (₱M)" />
              <Bar key="roi" yAxisId="right" dataKey="roi" fill="#10B981" radius={[4, 4, 0, 0]} name="ROI %" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Departmental Efficiency Grid */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Departmental Liquidation Efficiency</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Rank</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Department</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Velocity Score</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Pending</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Avg. Days</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {deptEfficiency.map((d, i) => (
                <tr key={d.dept} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600">#{i + 1}</td>
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 flex items-center gap-2">
                    {d.dept}
                    {d.status === "Slow" && <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Lagging" />}
                  </td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${d.velocity}%`, backgroundColor: d.velocity > 80 ? "#10B981" : d.velocity > 65 ? "#F59E0B" : "#EF4444" }} />
                      </div>
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{d.velocity}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{d.pending}</td>
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{d.daysAvg}d</td>
                  <td className="py-3 px-3"><Pill status={d.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== 3. CRITICAL BOTTLENECKS ====================
const bottleneckCards = [
  { project: "Smart Clinic Network", stuckAt: "Finance Scrutiny", duration: 14, assignee: "M. Reyes", dept: "Finance", severity: "Critical", sla: "7 days" },
  { project: "Lake Danao Access Road", stuckAt: "BAC Evaluation", duration: 21, assignee: "J. Santos", dept: "BAC Secretariat", severity: "Critical", sla: "10 days" },
  { project: "Digital Records Phase 2", stuckAt: "IT Security Audit", duration: 9, assignee: "R. Cruz", dept: "MIS", severity: "Warning", sla: "5 days" },
  { project: "Eco-Park Restroom Facility", stuckAt: "Mayor's Approval", duration: 6, assignee: "Office of the Mayor", dept: "Executive", severity: "Warning", sla: "3 days" },
  { project: "Mobile Health Unit Procurement", stuckAt: "COA Pre-Audit", duration: 18, assignee: "L. Tan", dept: "COA Liaison", severity: "Critical", sla: "7 days" },
  { project: "BPLO System Upgrade", stuckAt: "Vendor Negotiation", duration: 11, assignee: "P. Garcia", dept: "BPLO", severity: "Warning", sla: "10 days" },
];

const kanbanCols = ["Finance Scrutiny", "BAC / Procurement", "Approval Pending"];

function CriticalBottlenecks() {
  return (
    <div>
      <PageHeader
        title="Systemic Stalls & SLA Breaches"
        actions={<>
          <ActionButton icon={<Warning size={14} />} label="Trigger All-Dept Alert" variant="danger" />
          <ActionButton icon={<Filter size={14} />} label="Filter by SLA" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Bottlenecks" value="6" sub="2 new this week" trend="down" />
        <StatCard label="Avg. Stall Duration" value="13.2d" sub="Above 7-day SLA" trend="down" />
        <StatCard label="Resolved This Month" value="9" sub="64% resolution rate" trend="up" />
        <StatCard label="At-Risk Budget Impact" value="₱45M" sub="Frozen due to stalls" />
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        {kanbanCols.map((col) => {
          const cards = bottleneckCards.filter((c) =>
            col === "Finance Scrutiny" ? c.stuckAt.includes("Finance") || c.stuckAt.includes("COA") :
            col === "BAC / Procurement" ? c.stuckAt.includes("BAC") || c.stuckAt.includes("Vendor") :
            c.stuckAt.includes("Approval") || c.stuckAt.includes("Security") || c.stuckAt.includes("IT")
          );
          return (
            <div key={col} className="bg-neutral-50 rounded-xl p-3 border border-neutral-200">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">{col}</h4>
                <span className="text-[11px] font-['Lexend:Medium',_sans-serif] bg-neutral-200 text-neutral-600 rounded-full px-2 py-0.5">{cards.length}</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {cards.map((card) => (
                  <div key={card.project} className="bg-white rounded-lg border border-neutral-200 p-3.5 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <h5 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{card.project}</h5>
                      <Pill status={card.severity} />
                    </div>
                    <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-1">
                      Stuck At: <span className="text-neutral-700">{card.stuckAt}</span>
                    </p>
                    <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-2.5">
                      Duration: <span className={`${card.duration > 10 ? "text-red-600" : "text-amber-600"}`}>{card.duration} Days</span> (SLA: {card.sla})
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                          <User size={10} className="text-blue-600" />
                        </div>
                        <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{card.assignee}</span>
                      </div>
                      <button className="flex items-center gap-1 px-2 py-1 rounded-md bg-violet-50 hover:bg-violet-100 cursor-pointer transition-colors" title="Send Executive Nudge via Viber">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><path d="M12 2C6.48 2 2 6.03 2 10.94c0 2.7 1.36 5.12 3.5 6.73V22l3.88-2.13c.83.23 1.71.35 2.62.35 5.52 0 10-4.03 10-8.94S17.52 2 12 2z" fill="#7C3AED" /><path d="M13.5 8.5l-3 3.5 2.5.5-1.5 3.5 3-3.5-2.5-.5 1.5-3.5z" fill="white" /></svg>
                        <span className="text-[9px] font-['Lexend:Medium',_sans-serif] text-violet-700">Nudge</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* SLA Breach Trend */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">SLA Breach Trend (Weekly)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={[
            { week: "W1", breaches: 3, resolved: 5 },
            { week: "W2", breaches: 5, resolved: 4 },
            { week: "W3", breaches: 2, resolved: 6 },
            { week: "W4", breaches: 4, resolved: 3 },
            { week: "W5", breaches: 6, resolved: 4 },
            { week: "W6", breaches: 3, resolved: 7 },
          ]}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="week" tick={{ fontSize: 11 }} />
            <YAxis key="y" tick={{ fontSize: 11 }} />
            <Tooltip key="tip" />
            <Legend key="legend" wrapperStyle={{ fontSize: 11 }} />
            <Bar key="breaches" dataKey="breaches" fill="#EF4444" radius={[4, 4, 0, 0]} name="Breaches" />
            <Bar key="resolved" dataKey="resolved" fill="#10B981" radius={[4, 4, 0, 0]} name="Resolved" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 4. CITY PROJECT PULSE (PARENT) ====================
function CityProjectPulse() {
  return (
    <div>
      <PageHeader
        title="City Project Pulse"
        actions={<>
          <ActionButton icon={<Filter size={14} />} label="FY 2026" />
          <ActionButton icon={<Renew size={14} />} label="Refresh" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Active Projects" value="47" sub="+3 this quarter" trend="up" />
        <StatCard label="Portfolio Health" value="72%" sub="Weighted completion" trend="up" />
        <StatCard label="Budget Utilization" value="78.4%" sub="₱502M of ₱640M" />
        <StatCard label="Open Bottlenecks" value="6" sub="13.2d avg stall" trend="down" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Quick Pillar Overview */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Project Pillars</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie key="pie" data={pillarData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                {pillarData.map((entry, i) => <Cell key={`cell-${i}`} fill={entry.color} />)}
              </Pie>
              <Tooltip key="tip" />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 mt-2">
            {pillarData.map((p) => (
              <div key={p.name} className="flex items-center gap-1 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} /> {p.name}
              </div>
            ))}
          </div>
        </div>

        {/* Budget Quick View */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Advance vs. Liquidation</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={burnDownData.slice(-6)}>
              <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis key="x" dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis key="y" tick={{ fontSize: 10 }} />
              <Tooltip key="tip" />
              <Line key="adv" type="monotone" dataKey="advanced" stroke="#2563EB" strokeWidth={2} dot={false} name="Advanced" />
              <Line key="liq" type="monotone" dataKey="liquidated" stroke="#10B981" strokeWidth={2} dot={false} name="Liquidated" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* SLA radar */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Dept SLA Compliance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={[
              { dept: "Engineering", score: 94 },
              { dept: "Health", score: 88 },
              { dept: "BPLO", score: 76 },
              { dept: "Social Welfare", score: 71 },
              { dept: "Eco-Tourism", score: 62 },
              { dept: "Agriculture", score: 58 },
            ]}>
              <PolarGrid key="grid" />
              <PolarAngleAxis key="angle" dataKey="dept" tick={{ fontSize: 9 }} />
              <PolarRadiusAxis key="radius" angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
              <Radar key="radar" name="SLA Score" dataKey="score" stroke="#2563EB" fill="#DBEAFE" fillOpacity={0.6} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Battery Widgets */}
      <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Priority Projects</h3>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {projectBatteries.slice(0, 2).map((p) => <BatteryWidget key={p.project} {...p} />)}
      </div>

      {/* Bottleneck Summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Active Bottlenecks</h3>
        <div className="grid grid-cols-3 gap-3">
          {bottleneckCards.slice(0, 3).map((c) => (
            <div key={c.project} className="border border-neutral-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{c.project}</span>
                <Pill status={c.severity} />
              </div>
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Stuck: {c.stuckAt} · {c.duration}d</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 5. PREDICTIVE INSIGHT CARDS ====================
const insightCards = [
  { type: "Burnout Risk", severity: "High", title: "High Risk of Delay in Engineering", body: "The GA Engine detects that 80% of Civil Engineers are at maximum task capacity. Consider delaying the start of Project B by 2 weeks.", confidence: 87, horizon: "30-Day", icon: <Warning size={16} className="text-red-500" />, color: "border-l-red-400" },
  { type: "Budget Warning", severity: "Medium", title: "Projected 15% Overrun on Eco-Park", body: "Historical data suggests the current phase of the Eco-Park typically exceeds budget by 15%. Recommend a preemptive supplementary review.", confidence: 79, horizon: "90-Day", icon: <ChartBar size={16} className="text-amber-500" />, color: "border-l-amber-400" },
  { type: "Workforce", severity: "Medium", title: "Social Welfare Staff Redistribution Needed", body: "Task completion velocity has dropped 23% this quarter. The GA recommends redistributing 4 staff from Agriculture to Social Welfare.", confidence: 82, horizon: "30-Day", icon: <User size={16} className="text-blue-500" />, color: "border-l-blue-400" },
  { type: "Procurement", severity: "High", title: "BAC Timeline Anomaly Detected", body: "The bid evaluation for Mobile Health Units is taking 3.2x longer than the city's historical average. Investigate potential compliance issues.", confidence: 91, horizon: "30-Day", icon: <Time size={16} className="text-red-500" />, color: "border-l-red-400" },
  { type: "Revenue", severity: "Low", title: "Tourism Revenue Ahead of Projections", body: "Eco-Tourism receipts are trending 12% above forecast. Consider accelerating Phase 2 infrastructure to capitalize on momentum.", confidence: 74, horizon: "90-Day", icon: <Analytics size={16} className="text-emerald-500" />, color: "border-l-emerald-400" },
  { type: "Compliance", severity: "Medium", title: "30-Day Liquidation Window Approaching", body: "8 departments have unliquidated cash advances approaching the 30-day COA deadline. Automated reminders have been dispatched.", confidence: 95, horizon: "30-Day", icon: <Flag size={16} className="text-amber-500" />, color: "border-l-amber-400" },
];

function PredictiveInsightCards() {
  const [horizon, setHorizon] = useState<"30-Day" | "90-Day">("30-Day");
  const filtered = insightCards.filter((c) => c.horizon === horizon || horizon === "30-Day");

  return (
    <div>
      <PageHeader
        title="AI Risk Forecasts"
        actions={<>
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            {(["30-Day", "90-Day"] as const).map((h) => (
              <button key={h} onClick={() => setHorizon(h)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${
                  horizon === h ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"
                }`}
              >{h} Horizon</button>
            ))}
          </div>
          <ActionButton icon={<Download size={14} />} label="Export" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Predictions" value={`${filtered.length}`} sub="AI-generated forecasts" />
        <StatCard label="High Severity" value={`${filtered.filter(c => c.severity === "High").length}`} sub="Requires immediate action" trend="down" />
        <StatCard label="Avg. Confidence" value={`${Math.round(filtered.reduce((s, c) => s + c.confidence, 0) / filtered.length)}%`} sub="Model certainty" />
        <StatCard label="Actions Taken" value="12" sub="Based on AI advice this month" trend="up" />
      </div>

      {/* Masonry-style grid of smart cards */}
      <div className="columns-2 gap-4 space-y-4">
        {filtered.map((card, i) => (
          <div key={i} className={`bg-white rounded-xl border border-neutral-200 p-5 border-l-4 ${card.color} break-inside-avoid`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {card.icon}
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{card.type}</span>
              </div>
              <Pill status={card.severity} />
            </div>
            <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1.5">{card.title}</h3>
            <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed mb-3">{card.body}</p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500" style={{ width: `${card.confidence}%` }} />
                </div>
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{card.confidence}% conf.</span>
              </div>
              <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{card.horizon}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 6. PROCUREMENT DELAY ALERTS ====================
const biddingPipeline = [
  { project: "Mobile Health Unit", stage: "Notice of Award", days: 42, avgDays: 14, anomaly: true, status: "Critical" },
  { project: "Road Equipment Lease", stage: "Bid Evaluation", days: 28, avgDays: 10, anomaly: true, status: "Warning" },
  { project: "School Furniture Lot 3", stage: "Post-Qualification", days: 18, avgDays: 12, anomaly: false, status: "On Track" },
  { project: "IT Infrastructure Ph.2", stage: "Opening of Bids", days: 8, avgDays: 7, anomaly: false, status: "On Track" },
  { project: "Eco-Park Landscaping", stage: "Notice of Award", days: 31, avgDays: 14, anomaly: true, status: "Warning" },
  { project: "Water System Upgrade", stage: "Pre-Bid Conference", days: 5, avgDays: 5, anomaly: false, status: "On Track" },
];

const heatmapStages = ["Pre-Bid", "Opening", "Evaluation", "Post-Qual", "NOA"];
const heatmapData = [
  { project: "Mobile Health Unit", values: [1.0, 1.2, 2.1, 1.8, 3.0] },
  { project: "Road Equipment", values: [0.8, 1.0, 2.8, 1.5, 1.2] },
  { project: "School Furniture", values: [1.1, 0.9, 1.5, 1.0, 0.8] },
  { project: "IT Infrastructure", values: [1.0, 1.1, 0.9, 0.7, 0.6] },
  { project: "Eco-Park Landscaping", values: [0.9, 1.3, 1.6, 2.2, 2.2] },
];

function getHeatColor(val: number) {
  if (val >= 2.5) return "bg-red-500 text-white";
  if (val >= 2.0) return "bg-red-300 text-red-900";
  if (val >= 1.5) return "bg-amber-200 text-amber-800";
  if (val >= 1.2) return "bg-amber-100 text-amber-700";
  return "bg-emerald-100 text-emerald-700";
}

function ProcurementDelayAlerts() {
  return (
    <div>
      <PageHeader
        title="NGPA Compliance & Bidding Radar"
        actions={<>
          <ActionButton icon={<Filter size={14} />} label="Active Bids Only" />
          <ActionButton icon={<View size={14} />} label="Open BPMN Viewer" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Procurements" value="14" sub="Through BAC pipeline" />
        <StatCard label="Anomalous" value="3" sub="Statistically delayed" trend="down" />
        <StatCard label="Avg. Cycle Time" value="22d" sub="vs 14d historical avg" trend="down" />
        <StatCard label="Compliance Rate" value="78%" sub="NGPA adherence" />
      </div>

      {/* Heatmap */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">Process Mining Heatmap</h3>
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-4">Duration ratio vs. historical average (1.0 = on par, &gt;2.0 = anomalous)</p>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Project</th>
                {heatmapStages.map((s) => (
                  <th key={s} className="py-2 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide text-center">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row) => (
                <tr key={row.project}>
                  <td className="py-2 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{row.project}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-2 px-3 text-center">
                      <span className={`inline-block px-3 py-1 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] ${getHeatColor(v)}`}>{v.toFixed(1)}x</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bidding Pipeline Table */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Bidding Pipeline</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Project</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Current Stage</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Days Elapsed</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">City Avg</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Anomaly</th>
                <th className="py-2.5 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">Status</th>
              </tr>
            </thead>
            <tbody>
              {biddingPipeline.map((b) => (
                <tr key={b.project} className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{b.project}</td>
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{b.stage}</td>
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{b.days}d</td>
                  <td className="py-3 px-3 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{b.avgDays}d</td>
                  <td className="py-3 px-3">
                    {b.anomaly ? (
                      <span className="flex items-center gap-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-red-600">
                        <Warning size={12} /> {(b.days / b.avgDays).toFixed(1)}x slower
                      </span>
                    ) : (
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Normal</span>
                    )}
                  </td>
                  <td className="py-3 px-3"><Pill status={b.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==================== 7. ACTIONABLE INTELLIGENCE (NLP DIGEST) ====================
const dailyDigests = [
  {
    date: "April 12, 2026",
    bullets: [
      "Roadworks in Brgy. Ipil are progressing fast but face minor cement shortages. Engineering Dept. has contacted suppliers for emergency delivery.",
      "The BPLO inspection team cleared 45 renewals yesterday; no major blockers reported. Backlog reduced to 12 pending.",
      "Health workers report a spike in requests for the new mobile clinic schedule. 3 barangays requesting extended hours.",
    ],
    mood: "Productive",
    sentiment: 72,
    voiceNotes: 148,
    departments: 18,
  },
  {
    date: "April 11, 2026",
    bullets: [
      "Eco-Tourism site managers flagged a drainage issue at Lake Danao trail section B. Maintenance crew dispatched, ETA 2 days.",
      "Finance Dept. processed 23 liquidation reports. 4 flagged for missing OR/AR documentation — automated follow-ups sent.",
      "Agriculture extension workers completed 8 barangay visits for crop damage assessment post-typhoon advisory.",
    ],
    mood: "Steady",
    sentiment: 65,
    voiceNotes: 132,
    departments: 16,
  },
];

function ActionableIntelligence() {
  return (
    <div>
      <PageHeader
        title="Daily Ground-Level Briefing"
        actions={<>
          <ActionButton icon={<DocumentExport size={14} />} label="Export as PDF Brief" variant="primary" />
          <ActionButton icon={<Renew size={14} />} label="Refresh NLP" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Voice Stand-Ups Processed" value="148" sub="Today's submissions" />
        <StatCard label="Departments Reporting" value="18/22" sub="82% participation" trend="up" />
        <StatCard label="Avg. Sentiment Score" value="72%" sub="Positive workforce mood" trend="up" />
        <StatCard label="Action Items Extracted" value="7" sub="Auto-routed to leaders" />
      </div>

      {dailyDigests.map((digest) => (
        <div key={digest.date} className="bg-white rounded-xl border border-neutral-200 p-6 mb-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <DocumentExport size={18} className="text-blue-600" />
              </div>
              <div>
                <h3 className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Morning Briefing — {digest.date}</h3>
                <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{digest.voiceNotes} voice notes · {digest.departments} departments · Mood: <span className={digest.sentiment > 68 ? "text-emerald-600" : "text-amber-600"}>{digest.mood}</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-blue-500" style={{ width: `${digest.sentiment}%` }} />
              </div>
              <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{digest.sentiment}%</span>
            </div>
          </div>
          <div className="space-y-3">
            {digest.bullets.map((bullet, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-1 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-blue-600">{i + 1}</span>
                </div>
                <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">{bullet}</p>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Sentiment Trend */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Weekly Sentiment Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={[
            { day: "Mon", sentiment: 68, notes: 120 },
            { day: "Tue", sentiment: 71, notes: 135 },
            { day: "Wed", sentiment: 65, notes: 142 },
            { day: "Thu", sentiment: 74, notes: 148 },
            { day: "Fri", sentiment: 72, notes: 115 },
          ]}>
            <CartesianGrid key="grid" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="day" tick={{ fontSize: 11 }} />
            <YAxis key="y" tick={{ fontSize: 11 }} domain={[50, 100]} />
            <Tooltip key="tip" />
            <Area key="area" type="monotone" dataKey="sentiment" stroke="#2563EB" fill="#DBEAFE" name="Sentiment %" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 8. STRATEGIC AI INSIGHTS (PARENT) ====================
function StrategicAIInsights() {
  return (
    <div>
      <PageHeader
        title="Strategic AI Insights"
        actions={<>
          <ActionButton icon={<Analytics size={14} />} label="Model Dashboard" />
          <ActionButton icon={<Download size={14} />} label="Export All" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Predictions" value="6" sub="AI-generated this week" />
        <StatCard label="Procurement Anomalies" value="3" sub="Through BAC pipeline" trend="down" />
        <StatCard label="NLP Submissions" value="148" sub="Voice stand-ups today" trend="up" />
        <StatCard label="Model Accuracy" value="87%" sub="Random Forest F1-score" trend="up" />
      </div>

      {/* Top insight cards */}
      <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Priority AI Alerts</h3>
      <div className="grid grid-cols-2 gap-4 mb-5">
        {insightCards.filter(c => c.severity === "High").map((card, i) => (
          <div key={i} className={`bg-white rounded-xl border border-neutral-200 p-5 border-l-4 ${card.color}`}>
            <div className="flex items-center gap-2 mb-2">
              {card.icon}
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{card.type}</span>
              <div className="flex-1" />
              <Pill status={card.severity} />
            </div>
            <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">{card.title}</h4>
            <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">{card.body}</p>
          </div>
        ))}
      </div>

      {/* Procurement Heatmap mini */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Procurement Heatmap (Anomalies)</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500">Project</th>
                {heatmapStages.map((s) => (
                  <th key={s} className="py-2 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 text-center">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.slice(0, 3).map((row) => (
                <tr key={row.project}>
                  <td className="py-2 px-3 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{row.project}</td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-2 px-2 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-['Lexend:Medium',_sans-serif] ${getHeatColor(v)}`}>{v.toFixed(1)}x</span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* NLP Digest Preview */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Today's NLP Digest Preview</h3>
        <div className="space-y-2.5">
          {dailyDigests[0].bullets.map((b, i) => (
            <div key={i} className="flex gap-2.5">
              <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center mt-0.5 shrink-0">
                <span className="text-[9px] font-['Lexend:SemiBold',_sans-serif] text-blue-600">{i + 1}</span>
              </div>
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">{b}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== PAGE MAP & EXPORT ====================

export const executivePages: Record<string, Record<string, React.ComponentType>> = {
  portfolio: {
    "City Project Pulse": CityProjectPulse,
    "Portfolio Completion Rates": PortfolioCompletionRates,
    "Budget Burn-Down": BudgetBurnDown,
    "Critical Bottlenecks": CriticalBottlenecks,
    "Strategic AI Insights": StrategicAIInsights,
    "Predictive Insight Cards": PredictiveInsightCards,
    "Procurement Delay Alerts": ProcurementDelayAlerts,
    "Actionable Intelligence": ActionableIntelligence,
  },
  ...transformPages,
  ...financialPages,
  ...auditPages,
};

export const executiveDefaultPages: Record<string, string> = {
  portfolio: "City Project Pulse",
  transform: "Sustainable Tourism & Eco-Resorts",
  financial: "Master Budget Execution",
  audit: "Cryptographic Ledger",
};

function ExecutivePlaceholder({ section }: { section: string }) {
  return (
    <div className="flex items-center justify-center h-full text-neutral-400">
      <div className="text-center">
        <Settings size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">Blank dashboard</p>
        <p className="text-[12px] mt-1">{section}</p>
      </div>
    </div>
  );
}

export function ExecutiveContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
  const label = activePage || "Blank Dashboard";
  return <ExecutivePlaceholder section={label} />;
}
