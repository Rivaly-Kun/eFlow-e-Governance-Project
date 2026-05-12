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
  Locked,
  Send,
  UserMultiple,
  Report,
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
  BarChart,
  Bar,
  Legend,
  ComposedChart,
} from "recharts";

// ==================== SHARED ====================
const pillMap: Record<string, string> = {
  "On Track": "bg-emerald-100 text-emerald-700",
  "At Risk": "bg-amber-100 text-amber-700",
  Critical: "bg-red-100 text-red-700",
  Healthy: "bg-emerald-100 text-emerald-700",
  Warning: "bg-amber-100 text-amber-700",
  Danger: "bg-red-100 text-red-700",
  High: "bg-red-100 text-red-700",
  Medium: "bg-amber-100 text-amber-700",
  Low: "bg-emerald-100 text-emerald-700",
  Floating: "bg-blue-100 text-blue-700",
  "Liquidation Submitted": "bg-amber-100 text-amber-700",
  "Verified & Sealed": "bg-emerald-100 text-emerald-700",
  Frozen: "bg-blue-100 text-blue-700",
  "Auto-Escalated": "bg-red-100 text-red-700",
  Resolved: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
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
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Financial Oversight · Ormoc City LGU"}</p>
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

function BlockchainSeal({ sealed }: { sealed: boolean }) {
  if (!sealed) return <span className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">Pending</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
      <CheckmarkOutline size={12} className="text-emerald-500" />
      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-700">Sealed</span>
    </span>
  );
}

// ==================== 4.1 PARENT: MASTER BUDGET EXECUTION ====================

const departmentBudgets = [
  { dept: "City Engineering", appropriated: 285, disbursed: 142.5, velocity: [30, 42, 55, 68, 80, 95, 110, 125, 142], sealed: true },
  { dept: "Health Office", appropriated: 180, disbursed: 98.2, velocity: [15, 28, 40, 52, 65, 72, 82, 90, 98], sealed: true },
  { dept: "Social Welfare (CSWDO)", appropriated: 120, disbursed: 85.1, velocity: [10, 22, 35, 48, 55, 62, 70, 78, 85], sealed: true },
  { dept: "Agriculture Office", appropriated: 95, disbursed: 38.4, velocity: [5, 8, 12, 18, 22, 28, 32, 35, 38], sealed: true },
  { dept: "ENRO", appropriated: 75, disbursed: 42.8, velocity: [8, 14, 20, 25, 28, 32, 36, 40, 43], sealed: true },
  { dept: "City Planning", appropriated: 65, disbursed: 31.2, velocity: [4, 8, 12, 16, 20, 24, 27, 29, 31], sealed: true },
  { dept: "City Treasurer", appropriated: 45, disbursed: 28.9, velocity: [3, 6, 10, 14, 18, 22, 24, 26, 29], sealed: true },
  { dept: "Tourism Office", appropriated: 40, disbursed: 18.5, velocity: [2, 4, 6, 8, 10, 12, 14, 16, 19], sealed: false },
];

function MasterBudgetExecution() {
  const totalApprop = departmentBudgets.reduce((s, d) => s + d.appropriated, 0);
  const totalDisbursed = departmentBudgets.reduce((s, d) => s + d.disbursed, 0);

  return (
    <div>
      <PageHeader
        title="Master Budget Execution"
        subtitle="Financial Oversight · FY 2026 Fiscal Year"
        actions={<>
          <Btn icon={<Analytics size={14} />} label="Execution Analytics" />
          <Btn icon={<Download size={14} />} label="Initiative Report" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Appropriated" value={`₱${totalApprop}M`} sub="SP Resolution #402" />
        <StatCard label="Total Disbursed" value={`₱${totalDisbursed.toFixed(1)}M`} sub={`${Math.round((totalDisbursed / totalApprop) * 100)}% execution rate`} />
        <StatCard label="Remaining Balance" value={`₱${(totalApprop - totalDisbursed).toFixed(1)}M`} sub="Unobligated" />
        <StatCard label="At-Risk Depts" value="2" sub="Agriculture, Tourism underspent" trend="down" />
      </div>

      {/* Three summary cards */}
      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><ChartBar size={16} className="text-blue-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Expenditure vs Approved</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Central fiscal ledger</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={departmentBudgets.slice(0, 5).map(d => ({ name: d.dept.split(" ")[0], app: d.appropriated, dis: d.disbursed }))}>
              <Bar key="app" dataKey="app" fill="#DBEAFE" name="Approved" />
              <Bar key="dis" dataKey="dis" fill="#2563EB" name="Disbursed" />
              <XAxis key="x" dataKey="name" tick={{ fontSize: 9 }} />
              <Tooltip key="t" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Warning size={16} className="text-red-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Overspending Risk</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">AI burn-rate analysis</p>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-red-600">₱28.5M</span>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">At-risk capital across 3 projects</p>
          </div>
          <div className="flex rounded-full overflow-hidden h-3 bg-neutral-100">
            <div className="bg-red-400" style={{ width: "35%" }} />
            <div className="bg-amber-300" style={{ width: "25%" }} />
            <div className="bg-emerald-400" style={{ width: "40%" }} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><Time size={16} className="text-amber-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Underutilization Alerts</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Idle funds tracker</p>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-amber-600">₱78.3M</span>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Idle funds with &lt;90 days left</p>
          </div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-red-600">2 departments at critical countdown</span>
          </div>
        </div>
      </div>

      {/* Execution velocity chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Execution Velocity — All Departments</h3>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={departmentBudgets.map(d => ({
            dept: d.dept.length > 12 ? d.dept.slice(0, 12) + "…" : d.dept,
            appropriated: d.appropriated,
            disbursed: d.disbursed,
            remaining: d.appropriated - d.disbursed,
            pct: Math.round((d.disbursed / d.appropriated) * 100),
          }))}>
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="dept" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" height={50} />
            <YAxis key="y" tick={{ fontSize: 11 }} />
            <Tooltip key="t" />
            <Legend key="l" wrapperStyle={{ fontSize: 11 }} />
            <Bar key="b1" dataKey="disbursed" fill="#2563EB" name="Disbursed (₱M)" stackId="a" />
            <Bar key="b2" dataKey="remaining" fill="#DBEAFE" name="Remaining (₱M)" stackId="a" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 4.1A EXPENDITURE VS APPROVED ====================

function ExpenditureVsApproved() {
  const [lockShake, setLockShake] = useState<string | null>(null);

  const handleLockClick = (dept: string) => {
    setLockShake(dept);
    setTimeout(() => setLockShake(null), 600);
  };

  return (
    <div>
      <PageHeader
        title="Fiscal Year Execution"
        subtitle="Master Budget Execution · Expenditure vs Approved Ledger"
        actions={<>
          <Btn icon={<Filter size={14} />} label="Project Transform Only" />
          <Btn icon={<DocumentExport size={14} />} label="COA Ledger" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Appropriated" value="₱905M" sub="SP Resolution #402" />
        <StatCard label="Total Disbursed" value="₱485.6M" sub="53.7% execution" />
        <StatCard label="Remaining" value="₱419.4M" sub="Unobligated balance" />
        <StatCard label="Blockchain Sealed" value="7/8" sub="87.5% verified" trend="up" />
      </div>

      {/* Immutable locking notice */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 mb-5 flex items-center gap-2">
        <Locked size={14} className="text-violet-600" />
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-violet-700">
          <strong>Immutable Locking Active:</strong> Appropriated Budget values are cryptographically sealed by SP Resolution #402. Manual edits require legislative override.
        </p>
      </div>

      {/* Monday-style Financial Board */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_140px_140px_130px_180px_90px] gap-0 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100">
          {["Department", "Appropriated", "Actual Disbursed", "Remaining", "Execution Velocity", "BC Seal"].map(h => (
            <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {/* Rows */}
        {departmentBudgets.map((d) => {
          const remaining = d.appropriated - d.disbursed;
          const pct = Math.round((d.disbursed / d.appropriated) * 100);
          const status = pct > 70 ? "On Track" : pct > 40 ? "At Risk" : "Critical";
          return (
            <div key={d.dept} className="grid grid-cols-[1fr_140px_140px_130px_180px_90px] gap-0 px-5 py-3.5 border-b border-neutral-50 hover:bg-blue-50/20 transition-colors items-center">
              <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{d.dept}</span>
              {/* Appropriated — locked cell */}
              <div className="flex items-center gap-1.5">
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">₱{d.appropriated}M</span>
                <button
                  onClick={() => handleLockClick(d.dept)}
                  title="Cryptographically sealed by SP Resolution #402. Edits require legislative override."
                  className={`cursor-pointer transition-transform ${lockShake === d.dept ? "animate-[shake_0.3s_ease-in-out_2]" : ""}`}
                  style={lockShake === d.dept ? { animation: "shake 0.3s ease-in-out 2" } : {}}
                >
                  <Locked size={12} className={`transition-colors ${lockShake === d.dept ? "text-red-500" : "text-neutral-300"}`} />
                </button>
              </div>
              <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">₱{d.disbursed}M</span>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">₱{remaining.toFixed(1)}M</span>
                <Pill status={status} />
              </div>
              {/* Sparkline */}
              <div className="flex items-center gap-2">
                <LineChart width={100} height={24} data={d.velocity.map((v, i) => ({ m: i, v }))}>
                  <Line key="v" type="monotone" dataKey="v" stroke={pct > 60 ? "#10B981" : pct > 40 ? "#F59E0B" : "#EF4444"} strokeWidth={1.5} dot={false} />
                </LineChart>
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500">{pct}%</span>
              </div>
              <div className="text-center"><BlockchainSeal sealed={d.sealed} /></div>
            </div>
          );
        })}
      </div>

      {/* CSS for shake animation */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

// ==================== 4.1B OVERSPENDING RISK ====================

const overspendingProjects = [
  {
    project: "Eco-Park Spillway Excavation",
    dept: "City Engineering",
    budget: 18.5,
    burned: 22.2,
    burnRate: 120,
    daysToExhaust: 14,
    aiInsight: "Based on the last 3 weeks of procurement data, this project will run out of funds 14 days before completion.",
    risk: "High",
  },
  {
    project: "Mobile Health Unit Procurement",
    dept: "Health Office",
    budget: 35,
    burned: 30.8,
    burnRate: 112,
    daysToExhaust: 28,
    aiInsight: "Bid evaluation anomaly detected. BAC timeline is 3.2x historical average. Material costs trending up 8%.",
    risk: "High",
  },
  {
    project: "Barangay Road Network Phase 2",
    dept: "City Engineering",
    budget: 42,
    burned: 33.6,
    burnRate: 105,
    daysToExhaust: 45,
    aiInsight: "Fuel cost increases are driving 5% above baseline. Consider reallocating from Phase 3 contingency.",
    risk: "Medium",
  },
  {
    project: "Agricultural Extension Program",
    dept: "Agriculture Office",
    budget: 12,
    burned: 9.8,
    burnRate: 98,
    daysToExhaust: 60,
    aiInsight: "Spending is marginally within bounds but trending upward. Monitor seed procurement costs next month.",
    risk: "Low",
  },
];

const totalAtRisk = overspendingProjects.filter(p => p.risk === "High" || p.risk === "Medium").reduce((s, p) => s + (p.burned - p.budget * (p.burnRate > 100 ? 1 : 0)), 0);

function OverspendingRisk() {
  return (
    <div>
      <PageHeader
        title="Budget Burn-Rate Alerts"
        subtitle="Master Budget Execution · AI Overspending Detection"
        actions={<>
          <Btn icon={<Warning size={14} />} label="Freeze Non-Essential Funds" variant="danger" />
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Projects Monitored" value={`${overspendingProjects.length}`} sub="Active AI monitoring" />
        <StatCard label="High Risk" value={`${overspendingProjects.filter(p => p.risk === "High").length}`} sub="Immediate attention" trend="down" />
        <StatCard label="At-Risk Capital" value="₱28.5M" sub="Funds in danger zone" trend="down" />
        <StatCard label="Avg Burn Rate" value={`${Math.round(overspendingProjects.reduce((s, p) => s + p.burnRate, 0) / overspendingProjects.length)}%`} sub="vs expected pace" />
      </div>

      {/* At-Risk Capital Battery */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">At-Risk Capital Battery</h3>
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-red-600">₱28.5M in danger zone</span>
        </div>
        <div className="flex rounded-full overflow-hidden h-7 bg-neutral-100">
          <div className="bg-red-400 flex items-center justify-center" style={{ width: "35%" }}>
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-white">High: ₱10.2M</span>
          </div>
          <div className="bg-amber-300 flex items-center justify-center" style={{ width: "25%" }}>
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-amber-900">Medium: ₱8.3M</span>
          </div>
          <div className="bg-emerald-400 flex items-center justify-center" style={{ width: "40%" }}>
            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-white">Safe: ₱10.0M</span>
          </div>
        </div>
      </div>

      {/* Risk Kanban */}
      <div className="grid grid-cols-3 gap-4">
        {(["High", "Medium", "Low"] as const).map((level) => {
          const cards = overspendingProjects.filter(p => p.risk === level);
          const colors = { High: "border-t-red-400", Medium: "border-t-amber-400", Low: "border-t-emerald-400" };
          const bgColors = { High: "bg-red-50", Medium: "bg-amber-50", Low: "bg-neutral-50" };
          return (
            <div key={level} className={`${bgColors[level]} rounded-xl border border-neutral-200 p-3`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Pill status={level} />
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">Risk</span>
                </div>
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-white text-neutral-600 rounded-full px-2 py-0.5 border border-neutral-200">{cards.length}</span>
              </div>
              <div className="space-y-3">
                {cards.map((c) => (
                  <div key={c.project} className={`bg-white rounded-lg border border-t-4 ${colors[level]} p-4 shadow-sm`}>
                    <h5 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">{c.project}</h5>
                    <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">{c.dept}</p>

                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div>
                        <p className="text-[9px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase">Budget</p>
                        <p className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{c.budget}M</p>
                      </div>
                      <div>
                        <p className="text-[9px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase">Burned</p>
                        <p className={`text-[13px] font-['Lexend:SemiBold',_sans-serif] ${c.burnRate > 100 ? "text-red-600" : "text-neutral-900"}`}>₱{c.burned}M</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500">Burn Rate:</span>
                      <span className={`text-[12px] font-['Lexend:SemiBold',_sans-serif] ${c.burnRate > 100 ? "text-red-600" : "text-emerald-600"}`}>{c.burnRate}%</span>
                      {c.daysToExhaust < 30 && (
                        <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-['Lexend:Medium',_sans-serif]">{c.daysToExhaust}d to exhaust</span>
                      )}
                    </div>

                    {/* AI Insight */}
                    <div className="bg-blue-50 rounded-lg p-2.5 border border-blue-100">
                      <div className="flex items-start gap-1.5">
                        <Analytics size={12} className="text-blue-600 mt-0.5 shrink-0" />
                        <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-blue-800 leading-relaxed">{c.aiInsight}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 4.1C UNDERUTILIZATION ALERTS ====================

const idleFunds = [
  { project: "Agricultural Livelihood Grants", dept: "Agriculture Office", unspent: 56.6, expiry: "Dec 31, 2026", daysLeft: 259, totalBudget: 95, pctUnspent: 59.6 },
  { project: "Tourism Marketing Campaign", dept: "Tourism Office", unspent: 21.5, expiry: "Dec 31, 2026", daysLeft: 259, totalBudget: 40, pctUnspent: 53.8 },
  { project: "Flood Control Phase 3", dept: "City Engineering", unspent: 45.2, expiry: "Sep 30, 2026", daysLeft: 167, totalBudget: 65, pctUnspent: 69.5 },
  { project: "Senior Citizen Welfare Program", dept: "CSWDO", unspent: 15.8, expiry: "Jun 30, 2026", daysLeft: 75, totalBudget: 28, pctUnspent: 56.4 },
  { project: "Drainage Master Plan", dept: "City Planning", unspent: 33.8, expiry: "Jun 15, 2026", daysLeft: 60, totalBudget: 65, pctUnspent: 52.0 },
  { project: "Fish Cage Monitoring System", dept: "Agriculture Office", unspent: 8.2, expiry: "May 31, 2026", daysLeft: 45, totalBudget: 12, pctUnspent: 68.3 },
];

function UnderutilizationAlerts() {
  return (
    <div>
      <PageHeader
        title="Idle Funds Radar"
        subtitle="Master Budget Execution · Underutilization Alerts"
        actions={<>
          <Btn icon={<Send size={14} />} label="Nudge Dept Heads" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Idle Funds" value="₱181.1M" sub="Across 6 projects" />
        <StatCard label="Critical (<60 days)" value="2" sub="₱42.0M at risk of reversion" trend="down" />
        <StatCard label="BPA Escalations" value="1" sub="Auto-pushed to Mayor" trend="down" />
        <StatCard label="Avg. Utilization" value="41%" sub="Below 60% target" trend="down" />
      </div>

      {/* BPA Escalation Alert */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Warning size={14} className="text-red-600" />
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-red-800">BPA Auto-Escalation Triggered</span>
        </div>
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-700 ml-5">
          "Fish Cage Monitoring System" is 68% unspent with only 45 days remaining. The BPA engine has escalated this to the Mayor's Executive Cockpit for urgent intervention.
        </p>
      </div>

      {/* Countdown Board */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_110px_110px_140px_90px] gap-0 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100">
          {["Project Name", "Department", "Unspent Amount", "Expiration", "Days Remaining", "% Unspent"].map(h => (
            <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>
        {idleFunds.sort((a, b) => a.daysLeft - b.daysLeft).map((f) => {
          const isCritical = f.daysLeft < 60;
          const isWarning = f.daysLeft < 90 && !isCritical;
          return (
            <div
              key={f.project}
              className={`grid grid-cols-[1fr_120px_110px_110px_140px_90px] gap-0 px-5 py-3.5 border-b transition-colors items-center ${
                isCritical ? "border-l-4 border-l-red-400 bg-red-50/30 border-b-red-100" : isWarning ? "border-l-4 border-l-amber-300 bg-amber-50/20 border-b-neutral-50" : "border-b-neutral-50 hover:bg-neutral-50/50"
              }`}
            >
              <div>
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{f.project}</span>
                {isCritical && <span className="ml-2 text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-['Lexend:Medium',_sans-serif]">CRITICAL</span>}
              </div>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{f.dept}</span>
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{f.unspent}M</span>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{f.expiry}</span>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${isCritical ? "bg-red-100" : isWarning ? "bg-amber-100" : "bg-neutral-100"}`}>
                  {isCritical && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                  <span className={`text-[13px] font-['Lexend:SemiBold',_sans-serif] ${isCritical ? "text-red-700" : isWarning ? "text-amber-700" : "text-neutral-700"}`}>
                    {f.daysLeft}d
                  </span>
                </div>
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">remaining</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${f.pctUnspent}%`, backgroundColor: f.pctUnspent > 60 ? "#EF4444" : f.pctUnspent > 40 ? "#F59E0B" : "#10B981" }} />
                </div>
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{f.pctUnspent}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 4.2 PARENT: UNLIQUIDATED CASH ADVANCES ====================

const cashAdvances = [
  { payee: "Juan Dela Cruz", initials: "JC", dept: "City Engineering", amount: 15000, spent: 12800, aging: 8, status: "Floating", leader: "Engr. R. Almeda" },
  { payee: "Maria Santos", initials: "MS", dept: "Health Office", amount: 25000, spent: 24200, aging: 12, status: "Liquidation Submitted", leader: "Dr. L. Reyes" },
  { payee: "Pedro Reyes", initials: "PR", dept: "Agriculture Office", amount: 8000, spent: 5500, aging: 22, status: "Floating", leader: "Dir. J. Navarro" },
  { payee: "Ana Torres", initials: "AT", dept: "CSWDO", amount: 12000, spent: 11800, aging: 5, status: "Verified & Sealed", leader: "Dir. M. Garcia" },
  { payee: "Ricardo Lim", initials: "RL", dept: "City Engineering", amount: 45000, spent: 32000, aging: 35, status: "Floating", leader: "Engr. R. Almeda" },
  { payee: "Elena Cruz", initials: "EC", dept: "ENRO", amount: 18000, spent: 17500, aging: 28, status: "Liquidation Submitted", leader: "Dir. C. Flores" },
  { payee: "Jose Mendoza", initials: "JM", dept: "Tourism Office", amount: 6000, spent: 3200, aging: 42, status: "Floating", leader: "Dir. B. Tan" },
  { payee: "Luz Navarro", initials: "LN", dept: "City Planning", amount: 10000, spent: 9800, aging: 3, status: "Verified & Sealed", leader: "Engr. D. Ong" },
  { payee: "Carlos Garcia", initials: "CG", dept: "Health Office", amount: 20000, spent: 15200, aging: 18, status: "Floating", leader: "Dr. L. Reyes" },
  { payee: "Rosa Fernandez", initials: "RF", dept: "Agriculture Office", amount: 30000, spent: 8000, aging: 55, status: "Floating", leader: "Dir. J. Navarro" },
];

function UnliquidatedCashAdvances() {
  const totalFloating = cashAdvances.filter(c => c.status === "Floating").reduce((s, c) => s + (c.amount - c.spent), 0);
  const overdue = cashAdvances.filter(c => c.aging > 15 && c.aging <= 30);
  const critical = cashAdvances.filter(c => c.aging > 30);

  return (
    <div>
      <PageHeader
        title="Unliquidated Cash Advances"
        subtitle="Financial Oversight · COA Compliance Hub"
        actions={<>
          <Btn icon={<Analytics size={14} />} label="Aging Analysis" />
          <Btn icon={<Download size={14} />} label="COA Report" variant="primary" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Floating Cash" value={`₱${(totalFloating / 1000).toFixed(1)}K`} sub="Unrecovered from field" trend="down" />
        <StatCard label="Active Advances" value={`${cashAdvances.length}`} sub="10 staff with open CA" />
        <StatCard label="Overdue (15-30d)" value={`${overdue.length}`} sub="Demand letter stage" trend="down" />
        <StatCard label="Critical (>30d)" value={`${critical.length}`} sub="Salary deduction trigger" trend="down" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Outstanding Funds card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><ChartBar size={16} className="text-blue-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Outstanding Funds</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Daily tracking board</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={[
              { group: "Current", count: cashAdvances.filter(c => c.aging <= 15).length },
              { group: "Overdue", count: overdue.length },
              { group: "Critical", count: critical.length },
            ]}>
              <Bar key="count" dataKey="count" radius={[3, 3, 0, 0]}>
                {[
                  <Cell key="c1" fill="#2563EB" />,
                  <Cell key="c2" fill="#F59E0B" />,
                  <Cell key="c3" fill="#EF4444" />,
                ]}
              </Bar>
              <XAxis key="x" dataKey="group" tick={{ fontSize: 9 }} />
              <Tooltip key="t" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Leader Tracking card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center"><UserMultiple size={16} className="text-amber-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Leader Tracking</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Accountability leaderboard</p>
            </div>
          </div>
          <div className="space-y-2">
            {[...new Set(cashAdvances.map(c => c.leader))].slice(0, 3).map(leader => {
              const subs = cashAdvances.filter(c => c.leader === leader);
              const totalFloat = subs.reduce((s, c) => s + (c.amount - c.spent), 0);
              return (
                <div key={leader} className="flex items-center justify-between">
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">{leader}</span>
                  <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-red-600">₱{(totalFloat / 1000).toFixed(1)}K</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stalled Funds card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center"><Warning size={16} className="text-red-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Stalled Funds Alert</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">BPA enforcement</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={80}>
            <PieChart>
              <Pie key="pie" data={[
                { name: "Resolved via Viber", value: 78 },
                { name: "Demand Letter", value: 15 },
                { name: "Salary Deduction", value: 7 },
              ]} cx="50%" cy="50%" innerRadius={18} outerRadius={32} dataKey="value">
                <Cell key="p1" fill="#10B981" />
                <Cell key="p2" fill="#F59E0B" />
                <Cell key="p3" fill="#EF4444" />
              </Pie>
              <Tooltip key="t" />
            </PieChart>
          </ResponsiveContainer>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 text-center mt-1">78% resolve at Viber warning stage</p>
        </div>
      </div>

      {/* Aging distribution chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Aging Distribution — All Open Advances</h3>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart data={cashAdvances.sort((a, b) => b.aging - a.aging).map(c => ({
            payee: c.payee.split(" ")[1],
            amount: c.amount / 1000,
            spent: c.spent / 1000,
            aging: c.aging,
          }))}>
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="payee" tick={{ fontSize: 10 }} />
            <YAxis key="y1" yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis key="y2" yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
            <Tooltip key="t" />
            <Legend key="l" wrapperStyle={{ fontSize: 11 }} />
            <Bar key="b1" yAxisId="left" dataKey="amount" fill="#DBEAFE" name="Advanced (₱K)" />
            <Bar key="b2" yAxisId="left" dataKey="spent" fill="#2563EB" name="Reported Spent (₱K)" />
            <Line key="line" yAxisId="right" dataKey="aging" stroke="#EF4444" strokeWidth={2} dot={{ r: 3 }} name="Aging (Days)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 4.2A OUTSTANDING FUNDS ====================

function OutstandingFunds() {
  const [viewMode, setViewMode] = useState<"table" | "aging">("table");

  const groups = {
    "Current (< 15 Days)": cashAdvances.filter(c => c.aging <= 15),
    "Overdue (15–30 Days)": cashAdvances.filter(c => c.aging > 15 && c.aging <= 30),
    "Critical (> 30 Days)": cashAdvances.filter(c => c.aging > 30),
  };

  const groupColors: Record<string, string> = {
    "Current (< 15 Days)": "#2563EB",
    "Overdue (15–30 Days)": "#F59E0B",
    "Critical (> 30 Days)": "#EF4444",
  };

  return (
    <div>
      <PageHeader
        title="Active Field Advances"
        subtitle="Unliquidated Cash Advances · Outstanding Funds"
        actions={<>
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            {(["table", "aging"] as const).map((v) => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${viewMode === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >{v === "table" ? "Tracking Table" : "Aging Report"}</button>
            ))}
          </div>
          <Btn icon={<CheckmarkOutline size={14} />} label="Batch Verify Liquidations" variant="success" />
        </>}
      />
      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Advances" value={`${cashAdvances.length}`} sub="Field staff" />
        <StatCard label="Total Advanced" value={`₱${(cashAdvances.reduce((s, c) => s + c.amount, 0) / 1000).toFixed(0)}K`} sub="Across all open CA" />
        <StatCard label="Reported Spent" value={`₱${(cashAdvances.reduce((s, c) => s + c.spent, 0) / 1000).toFixed(0)}K`} sub="Via mobile portal" />
        <StatCard label="Expected Return" value={`₱${(cashAdvances.reduce((s, c) => s + (c.amount - c.spent), 0) / 1000).toFixed(1)}K`} sub="System calculated" trend="down" />
      </div>

      {/* High-Density Tracking Table grouped by aging */}
      <div className="space-y-4">
        {Object.entries(groups).map(([groupName, items]) => {
          if (items.length === 0) return null;
          const isCritical = groupName.includes("Critical");
          return (
            <div key={groupName} className={`bg-white rounded-xl border overflow-hidden ${isCritical ? "border-red-200" : "border-neutral-200"}`}>
              <div className="flex items-center gap-3 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: groupColors[groupName] }} />
                <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{groupName}</span>
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{items.length} advances</span>
              </div>
              <div className="grid grid-cols-[40px_1fr_110px_100px_100px_100px_120px] gap-0 px-5 py-2 border-b border-neutral-100 bg-neutral-50/30">
                {["", "Payee", "Amount", "Spent", "Return", "Aging", "Status"].map(h => (
                  <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {items.map((c) => (
                <div
                  key={c.payee}
                  className={`grid grid-cols-[40px_1fr_110px_100px_100px_100px_120px] gap-0 px-5 py-3 border-b transition-colors items-center ${
                    isCritical ? "border-b-red-50 hover:bg-red-50/30" : "border-b-neutral-50 hover:bg-neutral-50/50"
                  } ${isCritical ? "ring-1 ring-inset ring-red-100" : ""}`}
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-white`} style={{ backgroundColor: groupColors[groupName] }}>
                    {c.initials}
                  </div>
                  <div>
                    <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{c.payee}</span>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 ml-2">{c.dept}</span>
                  </div>
                  <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">₱{c.amount.toLocaleString()}</span>
                  <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">₱{c.spent.toLocaleString()}</span>
                  <span className={`text-[12px] font-['Lexend:SemiBold',_sans-serif] ${(c.amount - c.spent) > 5000 ? "text-red-600" : "text-neutral-900"}`}>
                    ₱{(c.amount - c.spent).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1">
                    {isCritical && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
                    <span className={`text-[12px] font-['Lexend:SemiBold',_sans-serif] ${isCritical ? "text-red-600" : c.aging > 15 ? "text-amber-600" : "text-neutral-700"}`}>{c.aging}d</span>
                  </div>
                  <Pill status={c.status} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 4.2B LEADER TRACKING ====================

function LeaderTracking() {
  const [sortBy, setSortBy] = useState<"liability" | "rate">("liability");

  const leaders = [...new Set(cashAdvances.map(c => c.leader))].map(leader => {
    const subs = cashAdvances.filter(c => c.leader === leader);
    const totalFloat = subs.reduce((s, c) => s + (c.amount - c.spent), 0);
    const totalAdvanced = subs.reduce((s, c) => s + c.amount, 0);
    const sealed = subs.filter(c => c.status === "Verified & Sealed").length;
    const onTimeRate = subs.length > 0 ? Math.round((sealed / subs.length) * 100) : 0;
    const dept = subs[0]?.dept || "";
    return { leader, dept, staffCount: subs.length, totalFloat, totalAdvanced, onTimeRate, sealed };
  });

  const sorted = [...leaders].sort((a, b) =>
    sortBy === "liability" ? b.totalFloat - a.totalFloat : a.onTimeRate - b.onTimeRate
  );

  return (
    <div>
      <PageHeader
        title="Accountability Leaderboard"
        subtitle="Unliquidated Cash Advances · Leader Tracking"
        actions={<>
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            {([{ v: "liability", l: "Highest Liability" }, { v: "rate", l: "Lowest Liquidation Rate" }] as const).map((h) => (
              <button key={h.v} onClick={() => setSortBy(h.v as any)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${sortBy === h.v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >{h.l}</button>
            ))}
          </div>
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />

      {/* The Debt Dashboard */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-4">Leader Liability Ranking</h3>
        <div className="space-y-4">
          {sorted.map((l, i) => {
            const isTop = i < 2 && l.totalFloat > 5000;
            return (
              <div key={l.leader} className={`rounded-xl border p-4 ${isTop ? "border-red-200 bg-red-50/30" : "border-neutral-200"}`}>
                <div className="flex items-center gap-4">
                  {/* Rank badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-['Lexend:SemiBold',_sans-serif] ${
                    isTop ? "bg-red-100 text-red-700" : "bg-neutral-100 text-neutral-600"
                  }`}>
                    #{i + 1}
                  </div>
                  {/* Leader info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{l.leader}</span>
                      {isTop && <span className="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-['Lexend:Medium',_sans-serif]">HIGH LIABILITY</span>}
                    </div>
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{l.dept} · {l.staffCount} subordinates with open CA</span>
                  </div>
                  {/* Metrics */}
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase">Floating Cash</p>
                      <p className={`text-[18px] font-['Lexend:SemiBold',_sans-serif] ${l.totalFloat > 10000 ? "text-red-600" : "text-neutral-900"}`}>₱{(l.totalFloat / 1000).toFixed(1)}K</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase">On-Time Rate</p>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-2.5 bg-neutral-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all" style={{ width: `${l.onTimeRate}%`, backgroundColor: l.onTimeRate > 60 ? "#10B981" : l.onTimeRate > 30 ? "#F59E0B" : "#EF4444" }} />
                        </div>
                        <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">{l.onTimeRate}%</span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase">Sealed</p>
                      <p className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{l.sealed}/{l.staffCount}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Comparison chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Floating Cash vs On-Time Liquidation Rate by Leader</h3>
        <ResponsiveContainer width="100%" height={220}>
          <ComposedChart data={sorted.map(l => ({
            leader: l.leader.split(". ")[1] || l.leader.split(" ").pop(),
            floating: l.totalFloat / 1000,
            rate: l.onTimeRate,
          }))}>
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="leader" tick={{ fontSize: 10 }} />
            <YAxis key="y1" yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis key="y2" yAxisId="right" orientation="right" tick={{ fontSize: 11 }} domain={[0, 100]} />
            <Tooltip key="t" />
            <Legend key="l" wrapperStyle={{ fontSize: 11 }} />
            <Bar key="b" yAxisId="left" dataKey="floating" fill="#FCA5A5" name="Floating Cash (₱K)" />
            <Line key="line" yAxisId="right" dataKey="rate" stroke="#10B981" strokeWidth={2} dot={{ r: 4 }} name="On-Time Rate (%)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 4.2C STALLED FUNDS ALERT ====================

const enforcementLog = [
  { id: "E1", payee: "Ricardo Lim", action: "Viber Warning Dispatched", day: 15, date: "Mar 12, 2026", status: "Pending", resolved: false },
  { id: "E2", payee: "Ricardo Lim", action: "Demand Letter Auto-Generated → Dept Head", day: 30, date: "Mar 27, 2026", status: "Pending", resolved: false },
  { id: "E3", payee: "Ricardo Lim", action: "Notice of Salary Deduction → HRMO", day: 42, date: "Apr 8, 2026", status: "Auto-Escalated", resolved: false },
  { id: "E4", payee: "Jose Mendoza", action: "Viber Warning Dispatched", day: 15, date: "Mar 5, 2026", status: "Pending", resolved: false },
  { id: "E5", payee: "Jose Mendoza", action: "Demand Letter Auto-Generated → Dept Head", day: 30, date: "Mar 20, 2026", status: "Pending", resolved: false },
  { id: "E6", payee: "Jose Mendoza", action: "Notice of Salary Deduction → HRMO", day: 45, date: "Apr 4, 2026", status: "Auto-Escalated", resolved: false },
  { id: "E7", payee: "Rosa Fernandez", action: "Viber Warning Dispatched", day: 15, date: "Feb 21, 2026", status: "Resolved", resolved: true },
  { id: "E8", payee: "Rosa Fernandez", action: "Demand Letter Auto-Generated → Dept Head", day: 30, date: "Mar 8, 2026", status: "Pending", resolved: false },
  { id: "E9", payee: "Rosa Fernandez", action: "Notice of Salary Deduction → HRMO", day: 55, date: "Apr 12, 2026", status: "Auto-Escalated", resolved: false },
  { id: "E10", payee: "Pedro Reyes", action: "Viber Warning Dispatched", day: 15, date: "Apr 1, 2026", status: "Resolved", resolved: true },
  { id: "E11", payee: "Elena Cruz", action: "Viber Warning Dispatched", day: 15, date: "Mar 25, 2026", status: "Resolved", resolved: true },
  { id: "E12", payee: "Carlos Garcia", action: "Viber Warning Dispatched", day: 15, date: "Apr 3, 2026", status: "Pending", resolved: false },
];

const resolutionData = [
  { name: "Resolved at Viber (Day 15)", value: 78 },
  { name: "Resolved at Demand Letter (Day 30)", value: 15 },
  { name: "Escalated to Salary Deduction (Day 60)", value: 7 },
];

function StalledFundsAlert() {
  const [autoLetters, setAutoLetters] = useState(true);

  return (
    <div>
      <PageHeader
        title="Escalations & Sanctions"
        subtitle="Unliquidated Cash Advances · BPA Enforcement"
        actions={<>
          <div className="flex items-center gap-2 bg-white border border-neutral-200 rounded-lg px-3 py-2">
            <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600">Auto-Demand Letters</span>
            <button
              onClick={() => setAutoLetters(!autoLetters)}
              className={`w-9 h-5 rounded-full transition-colors cursor-pointer ${autoLetters ? "bg-emerald-500" : "bg-neutral-300"}`}
            >
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform mx-0.5 ${autoLetters ? "translate-x-4" : "translate-x-0"}`} />
            </button>
          </div>
          <Btn icon={<Download size={14} />} label="Export Log" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Escalations" value={`${enforcementLog.length}`} sub="Automated actions taken" />
        <StatCard label="Viber Warnings" value={`${enforcementLog.filter(e => e.action.includes("Viber")).length}`} sub="78% resolve at this stage" trend="up" />
        <StatCard label="Demand Letters" value={`${enforcementLog.filter(e => e.action.includes("Demand")).length}`} sub="Auto-generated" />
        <StatCard label="Salary Deduction" value={`${enforcementLog.filter(e => e.action.includes("Salary")).length}`} sub="HRMO-triggered" trend="down" />
      </div>

      <div className="grid grid-cols-3 gap-5 mb-5">
        {/* Resolution Rate Pie */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-1">Resolution Effectiveness</h3>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-3">% of staff that liquidate at each stage</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie key="pie" data={resolutionData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" label={({ name, value }) => `${value}%`}>
                <Cell key="c1" fill="#10B981" />
                <Cell key="c2" fill="#F59E0B" />
                <Cell key="c3" fill="#EF4444" />
              </Pie>
              <Tooltip key="t" />
              <Legend key="l" wrapperStyle={{ fontSize: 10 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* BPA Tiered Actions Summary */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5 col-span-2">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">BPA Tiered Automated Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { day: "Day 15", action: "Viber Warning", desc: "Automated reminder via Viber to staff with open CA approaching 15 days.", color: "border-l-blue-400 bg-blue-50/30", icon: <Send size={14} className="text-blue-600" />, rate: "78% resolve" },
              { day: "Day 30", action: "Demand Letter", desc: "Auto-generated formal demand letter emailed to the Department Head for accountability.", color: "border-l-amber-400 bg-amber-50/30", icon: <DocumentExport size={14} className="text-amber-600" />, rate: "15% resolve" },
              { day: "Day 60", action: "Salary Deduction", desc: "COA-compliant notice of salary deduction triggered to HRMO for payroll offset.", color: "border-l-red-400 bg-red-50/30", icon: <Warning size={14} className="text-red-600" />, rate: "Last resort" },
            ].map(t => (
              <div key={t.day} className={`rounded-lg border-l-4 ${t.color} p-4 border border-neutral-200`}>
                <div className="flex items-center gap-2 mb-2">
                  {t.icon}
                  <div>
                    <p className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{t.day}: {t.action}</p>
                    <p className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-600">{t.rate}</p>
                  </div>
                </div>
                <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Enforcement Feed */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Enforcement Activity Log</h3>
        <div className="space-y-2">
          {enforcementLog.map((e) => {
            const isViber = e.action.includes("Viber");
            const isDemand = e.action.includes("Demand");
            const isSalary = e.action.includes("Salary");
            const borderColor = isSalary ? "border-l-red-400" : isDemand ? "border-l-amber-400" : "border-l-blue-400";
            return (
              <div key={e.id} className={`flex items-center gap-3 p-3 rounded-lg border border-l-4 ${borderColor} ${e.resolved ? "bg-emerald-50/30 border-neutral-100" : "bg-white border-neutral-200"} transition-colors`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSalary ? "bg-red-100" : isDemand ? "bg-amber-100" : "bg-blue-100"}`}>
                  {isSalary ? <Warning size={14} className="text-red-600" /> : isDemand ? <DocumentExport size={14} className="text-amber-600" /> : <Send size={14} className="text-blue-600" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{e.payee}</span>
                    <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-400">Day {e.day}</span>
                  </div>
                  <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{e.action}</p>
                </div>
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{e.date}</span>
                <Pill status={e.resolved ? "Resolved" : e.status} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== EXPORTS ====================
export const financialPages: Record<string, Record<string, React.ComponentType>> = {
  financial: {
    "Master Budget Execution": MasterBudgetExecution,
    "Expenditure vs Approved": ExpenditureVsApproved,
    "Overspending Risk": OverspendingRisk,
    "Underutilization Alerts": UnderutilizationAlerts,
    "Unliquidated Cash Advances": UnliquidatedCashAdvances,
    "Outstanding Funds": OutstandingFunds,
    "Leader Tracking": LeaderTracking,
    "Stalled Funds Alert": StalledFundsAlert,
  },
};
