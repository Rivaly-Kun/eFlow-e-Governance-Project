import React, { useState, useCallback } from "react";
import {
  CheckmarkOutline,
  Warning,
  Download,
  Filter,
  Search,
  Security,
  DocumentExport,
  Locked,
  View,
  Renew,
  Time,
  User,
  Analytics,
  ChevronDown,
  ChevronRight,
  Settings,
  Flag,
  Task,
  Archive,
  UserMultiple,
  Report,
  DocumentAdd,
  Play,
  Send,
  Pending,
  Group,
} from "@carbon/icons-react";
import { CouncilorPanel } from "./CouncilorPanel";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  AreaChart,
  Area,
  LineChart,
  Line,
} from "recharts";
import { sessionPages, sessionDefaultPages } from "./SessionManagementContent";
import { committeePages, committeeDefaultPages } from "./CommitteeAffairsContent";

// ==================== SHARED ====================
const pillMap: Record<string, string> = {
  "First Reading": "bg-blue-100 text-blue-700",
  "Committee Level": "bg-violet-100 text-violet-700",
  "Second Reading": "bg-amber-100 text-amber-700",
  "Third Reading": "bg-orange-100 text-orange-700",
  "Mayoral Approval": "bg-cyan-100 text-cyan-700",
  Favorable: "bg-emerald-100 text-emerald-700",
  Archived: "bg-neutral-100 text-neutral-600",
  Pending: "bg-amber-100 text-amber-700",
  Passed: "bg-emerald-100 text-emerald-700",
  Vetoed: "bg-red-100 text-red-700",
  Signed: "bg-emerald-100 text-emerald-700",
  "Enacted (Lapsed)": "bg-blue-100 text-blue-700",
  Active: "bg-emerald-100 text-emerald-700",
  Repealed: "bg-red-100 text-red-700",
  Amended: "bg-amber-100 text-amber-700",
  "In Session": "bg-blue-100 text-blue-700",
  Referred: "bg-violet-100 text-violet-700",
  "Under Review": "bg-amber-100 text-amber-700",
  YES: "bg-emerald-100 text-emerald-700",
  NO: "bg-red-100 text-red-700",
  ABSTAIN: "bg-neutral-100 text-neutral-600",
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
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Sangguniang Panlungsod · Ormoc City"}</p>
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

function HashDisplay({ hash, full }: { hash: string; full?: boolean }) {
  return (
    <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] tracking-tight text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100`}>
      {full ? hash : `${hash.slice(0, 6)}…${hash.slice(-4)}`}
    </span>
  );
}

// ==================== MOCK DATA ====================

const stableHashes = [
  "0x9A3F1D7E5B0C8A2D6F4E1B9C7A3D5F8E0B2C4A6D8F1E3B5C7A9D0F2E4B6C8",
  "0xB5E2C8D0F4A6E1B3C9D7F5A0E2B8C4D6F1A3E5B7C0D9F2A4E6B8C1D3F5A7E9",
  "0xC7D4A1E8B5F2C0D6A3E9B7F4C1D8A5E2B0F6C3D9A7E4B1F8C5D2A0E6B3F9C4",
  "0xD0F6A8E3B5C1D7A4E0B2F9C6D3A8E5B1F7C4D0A6E2B8F5C1D9A3E7B4F0C6D2",
  "0xE4B9C2D5F8A1E3B6C0D4F7A9E2B5C8D1F3A6E0B4C7D9F2A5E8B1C3D6F0A4E7",
  "0xF1A5E8B2C6D0F3A7E1B4C9D5F8A2E6B0C3D7F1A4E9B5C2D8F0A3E7B6C1D4F9",
];

interface Measure {
  trackingNo: string;
  title: string;
  author: string;
  authorInitials: string;
  dateReceived: string;
  stage: string;
  committee?: string;
  type: "Ordinance" | "Resolution";
  budget?: number;
}

const measures: Measure[] = [
  { trackingNo: "ORD-2026-042", title: "An Ordinance Establishing the Ormoc City Sustainable Tourism and Eco-Park Zone", author: "Hon. R. Almario", authorInitials: "RA", dateReceived: "2026-03-05", stage: "Mayoral Approval", committee: "Committee on Tourism & Environment", type: "Ordinance", budget: 450 },
  { trackingNo: "ORD-2026-043", title: "An Ordinance Regulating Single-Use Plastics within Ormoc City Limits", author: "Hon. M. Delgado", authorInitials: "MD", dateReceived: "2026-03-10", stage: "Third Reading", committee: "Committee on Environment", type: "Ordinance" },
  { trackingNo: "ORD-2026-044", title: "An Ordinance Appropriating ₱5M for the Marine Litter Interception Program", author: "Hon. L. Santos", authorInitials: "LS", dateReceived: "2026-03-12", stage: "Second Reading", committee: "Committee on Appropriations", type: "Ordinance", budget: 5 },
  { trackingNo: "RES-2026-018", title: "Resolution Endorsing the City's Application for Green City Certification", author: "Hon. C. Torres", authorInitials: "CT", dateReceived: "2026-03-18", stage: "Committee Level", committee: "Committee on Tourism & Environment", type: "Resolution" },
  { trackingNo: "ORD-2026-045", title: "An Ordinance Amending the Ormoc City Revenue Code — Real Property Tax Adjustments", author: "Hon. J. Cruz", authorInitials: "JC", dateReceived: "2026-03-22", stage: "Committee Level", committee: "Committee on Appropriations", type: "Ordinance", budget: 0 },
  { trackingNo: "ORD-2026-046", title: "An Ordinance Creating the Ormoc City Digital Governance and eFlow Implementation Fund", author: "Hon. B. Navarro", authorInitials: "BN", dateReceived: "2026-03-28", stage: "First Reading", type: "Ordinance", budget: 8 },
  { trackingNo: "RES-2026-019", title: "Resolution Commending the Ormoc City Fire Department for Outstanding Service", author: "Hon. A. Reyes", authorInitials: "AR", dateReceived: "2026-04-01", stage: "First Reading", type: "Resolution" },
  { trackingNo: "ORD-2026-047", title: "An Ordinance Establishing a City-Wide CCTV Surveillance Network", author: "Hon. P. Garcia", authorInitials: "PG", dateReceived: "2026-04-05", stage: "First Reading", type: "Ordinance", budget: 12 },
  { trackingNo: "ORD-2026-048", title: "An Ordinance Mandating Disaster Preparedness Training in All Barangays", author: "Hon. E. Lim", authorInitials: "EL", dateReceived: "2026-04-08", stage: "Committee Level", committee: "Committee on Public Safety", type: "Ordinance", budget: 3 },
  { trackingNo: "RES-2026-020", title: "Resolution Urging DPWH to Expedite the Ormoc-Kananga Road Widening Project", author: "Hon. R. Almario", authorInitials: "RA", dateReceived: "2026-04-10", stage: "First Reading", type: "Resolution" },
];

const adoptedOrdinances = [
  { number: "ORD-2025-038", title: "An Ordinance Imposing Fines for Illegal Dumping within the Eco-Park Zone", dateEnacted: "2025-12-15", status: "Active", hash: stableHashes[0], author: "Hon. R. Almario" },
  { number: "ORD-2025-035", title: "An Ordinance Establishing the Anti-Littering Program (#SHInEOrmoc)", dateEnacted: "2025-11-20", status: "Active", hash: stableHashes[1], author: "Hon. M. Delgado" },
  { number: "ORD-2025-031", title: "An Ordinance Appropriating the Annual Budget for FY 2026 — General Fund", dateEnacted: "2025-10-28", status: "Active", hash: stableHashes[2], author: "Hon. L. Santos" },
  { number: "ORD-2025-028", title: "An Ordinance Regulating Tricycle Operations within the City Center", dateEnacted: "2025-09-15", status: "Amended", hash: stableHashes[3], author: "Hon. C. Torres" },
  { number: "ORD-2025-024", title: "An Ordinance Granting Tax Incentives for Ormoc City-based Startups", dateEnacted: "2025-08-02", status: "Active", hash: stableHashes[4], author: "Hon. J. Cruz" },
  { number: "ORD-2024-055", title: "An Ordinance Prohibiting the Sale of Alcohol within 200m of Schools", dateEnacted: "2024-06-18", status: "Active", hash: stableHashes[5], author: "Hon. B. Navarro" },
  { number: "ORD-2024-048", title: "An Ordinance Creating the Ormoc City Scholarship Fund", dateEnacted: "2024-04-22", status: "Active", hash: "0xA2B4C6D8E0F1A3B5C7D9E1F3A5B7C9D1E3F5A7B9C0D2E4F6A8B0C2D4E6F8A0", author: "Hon. A. Reyes" },
  { number: "ORD-2024-041", title: "An Ordinance Declaring Ormoc City as a Plastic-Free Zone (Original)", dateEnacted: "2024-02-14", status: "Repealed", hash: "0xB3C5D7E9F1A2B4C6D8E0F2A4B6C8D0E2F4A6B8C1D3E5F7A9B1C3D5E7F9A1B3", author: "Hon. M. Delgado" },
];

// ==================== 6.1 PARENT: ACTIVE MEASURES PIPELINE ====================

const stageColors: Record<string, string> = {
  "First Reading": "#3B82F6",
  "Committee Level": "#8B5CF6",
  "Second Reading": "#F59E0B",
  "Third Reading": "#F97316",
  "Mayoral Approval": "#06B6D4",
};

function ActiveMeasuresPipeline() {
  const stageData = ["First Reading", "Committee Level", "Second Reading", "Third Reading", "Mayoral Approval"].map(stage => ({
    stage: stage.split(" ")[0],
    count: measures.filter(m => m.stage === stage).length,
    full: stage,
  }));

  return (
    <div>
      <PageHeader
        title="Active Measures Pipeline"
        subtitle="Legislative Dashboard · Sangguniang Panlungsod Workspace"
        actions={<>
          <Btn icon={<Analytics size={14} />} label="Pipeline Analytics" />
          <Btn icon={<Download size={14} />} label="Session Report" variant="primary" />
        </>}
      />

      {/* BPA Enforcement notice */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-3">
        <Locked size={14} className="text-violet-600" />
        <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-violet-700">
          <strong>BPA Sequence Enforcement Active:</strong> The Flowable engine mathematically prevents any measure from bypassing a reading stage. The Three Readings rule (R.A. 7160) is automatically enforced.
        </p>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Active Measures" value={`${measures.length}`} sub="In pipeline" />
        <StatCard label="Ordinances" value={`${measures.filter(m => m.type === "Ordinance").length}`} sub="Pending enactment" />
        <StatCard label="Resolutions" value={`${measures.filter(m => m.type === "Resolution").length}`} sub="Non-binding" />
        <StatCard label="Avg. Cycle Time" value="42d" sub="First to Third Reading" trend="up" />
      </div>

      {/* Pipeline overview — mini kanban */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {["First Reading", "Committee Level", "Second Reading", "Third Reading", "Mayoral Approval"].map((stage) => {
          const items = measures.filter(m => m.stage === stage);
          return (
            <div key={stage} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-3 py-2.5 border-b border-neutral-100 flex items-center justify-between" style={{ borderTop: `3px solid ${stageColors[stage]}` }}>
                <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{stage}</span>
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-neutral-100 text-neutral-600 rounded-full px-2 py-0.5">{items.length}</span>
              </div>
              <div className="p-2 space-y-2 max-h-[220px] overflow-y-auto">
                {items.map(m => (
                  <div key={m.trackingNo} className="p-2.5 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors bg-neutral-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-['JetBrains_Mono',_'Fira_Code',_monospace] text-neutral-400">{m.trackingNo}</span>
                      <Pill status={m.type} />
                    </div>
                    <p className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-800 leading-tight line-clamp-2">{m.title.length > 60 ? m.title.slice(0, 60) + "…" : m.title}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <div className="w-4 h-4 rounded-full bg-slate-700 flex items-center justify-center text-[7px] font-['Lexend:SemiBold',_sans-serif] text-white">{m.authorInitials}</div>
                      <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{m.author}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pipeline volume chart */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Pipeline Distribution</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stageData} layout="vertical">
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" type="number" tick={{ fontSize: 11 }} />
            <YAxis key="y" dataKey="stage" type="category" tick={{ fontSize: 11 }} width={80} />
            <Tooltip key="t" />
            <Bar key="b" dataKey="count" name="Measures" radius={[0, 4, 4, 0]}>
              {stageData.map((entry) => (
                <Cell key={entry.full} fill={stageColors[entry.full] || "#94A3B8"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 6.1A FIRST READING ====================

function FirstReading() {
  const items = measures.filter(m => m.stage === "First Reading");
  const committees = [
    "Committee on Appropriations",
    "Committee on Tourism & Environment",
    "Committee on Public Safety",
    "Committee on Good Government",
    "Committee on Education",
    "Committee on Infrastructure",
  ];

  const [referrals, setReferrals] = useState<Record<string, string>>({});

  return (
    <div>
      <PageHeader
        title="Plenary Calendaring"
        subtitle="Active Measures Pipeline · First Reading (Intake & Referral)"
        actions={<>
          <Btn icon={<DocumentAdd size={14} />} label="Log New Measure" variant="primary" />
          <Btn icon={<DocumentExport size={14} />} label="Session Agenda" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Pending Intake" value={`${items.length}`} sub="Awaiting referral" />
        <StatCard label="Ordinances" value={`${items.filter(m => m.type === "Ordinance").length}`} sub="Requires 3 readings" />
        <StatCard label="Resolutions" value={`${items.filter(m => m.type === "Resolution").length}`} sub="Non-binding measures" />
        <StatCard label="Oldest Pending" value="8d" sub="ORD-2026-046" />
      </div>

      {/* Intake list */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-[100px_1fr_150px_100px_200px] gap-0 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100">
          {["Tracking No.", "Title", "Principal Author", "Date Received", "Referral Action"].map(h => (
            <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {items.map(m => (
          <div key={m.trackingNo} className="grid grid-cols-[100px_1fr_150px_100px_200px] gap-0 px-5 py-4 border-b border-neutral-50 hover:bg-blue-50/20 transition-colors items-center">
            <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-blue-600">{m.trackingNo}</span>
            <div>
              <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 leading-tight">{m.title}</p>
              <Pill status={m.type} />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[8px] font-['Lexend:SemiBold',_sans-serif] text-white">{m.authorInitials}</div>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{m.author}</span>
            </div>
            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{m.dateReceived}</span>
            {/* Referral dropdown */}
            <div className="relative">
              <select
                value={referrals[m.trackingNo] || ""}
                onChange={(e) => setReferrals(prev => ({ ...prev, [m.trackingNo]: e.target.value }))}
                className={`w-full px-3 py-2 rounded-lg border text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer appearance-none bg-white pr-8 ${
                  referrals[m.trackingNo] ? "border-violet-300 bg-violet-50 text-violet-700" : "border-neutral-200 text-neutral-600"
                }`}
              >
                <option value="">Assign to Committee…</option>
                {committees.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none" />
              {referrals[m.trackingNo] && (
                <div className="mt-1.5 flex items-center gap-1">
                  <CheckmarkOutline size={12} className="text-violet-500" />
                  <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-violet-600">Referred → moves to Committee Level</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 6.1B COMMITTEE LEVEL ====================

function CommitteeLevel() {
  const items = measures.filter(m => m.stage === "Committee Level");
  const [filterMyCommittees, setFilterMyCommittees] = useState(false);

  return (
    <div>
      <PageHeader
        title="Committee Workspaces"
        subtitle="Active Measures Pipeline · Committee Level (Scrutiny & Hearings)"
        actions={<>
          <button
            onClick={() => setFilterMyCommittees(!filterMyCommittees)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
              filterMyCommittees ? "bg-violet-100 text-violet-700 border border-violet-200" : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <Filter size={14} />{filterMyCommittees ? "My Committees" : "All Committees"}
          </button>
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Under Review" value={`${items.length}`} sub="Assigned to committees" />
        <StatCard label="Committees Active" value={`${[...new Set(items.map(m => m.committee))].length}`} sub="With pending measures" />
        <StatCard label="Avg. Review Time" value="18d" sub="Committee deliberation" />
        <StatCard label="Hearings Scheduled" value="2" sub="This week" trend="up" />
      </div>

      {/* Scrutiny Board — cards grouped by committee */}
      <div className="space-y-4">
        {[...new Set(items.map(m => m.committee))].map(committee => {
          const committeeMeasures = items.filter(m => m.committee === committee);
          return (
            <div key={committee} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
              <div className="px-5 py-3 bg-violet-50/50 border-b border-violet-100 flex items-center gap-2">
                <Group size={14} className="text-violet-600" />
                <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{committee}</span>
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">{committeeMeasures.length}</span>
              </div>
              <div className="p-4 space-y-3">
                {committeeMeasures.map(m => (
                  <div key={m.trackingNo} className="rounded-xl border border-neutral-200 p-5 hover:border-violet-200 transition-colors">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-violet-600">{m.trackingNo}</span>
                          <Pill status={m.type} />
                        </div>
                        <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-snug">{m.title}</h4>
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[7px] font-['Lexend:SemiBold',_sans-serif] text-white">{m.authorInitials}</div>
                          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{m.author} · Received {m.dateReceived}</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Reality Check integration */}
                    {m.budget && m.budget > 0 && (
                      <div className="bg-blue-50 rounded-lg p-3 border border-blue-100 mb-3">
                        <div className="flex items-start gap-2">
                          <Analytics size={14} className="text-blue-600 mt-0.5 shrink-0" />
                          <div>
                            <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-blue-800">AI "Reality Check" — NPV/IRR Validation</span>
                            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-blue-700 mt-0.5 leading-relaxed">
                              This ordinance requests ₱{m.budget}M in appropriations. The AI engine has validated this against the city's current fiscal capacity.
                              NPV: <strong>₱{(m.budget * 1.35).toFixed(1)}M</strong> · IRR: <strong>{(12.5 + Math.random() * 8).toFixed(1)}%</strong> · Payback: <strong>{Math.ceil(m.budget / 2.5)}yr</strong>.
                              Assessment: <span className="text-emerald-700 font-['Lexend:SemiBold',_sans-serif]">Fiscally feasible.</span>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Committee actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-neutral-100">
                      <Btn icon={<DocumentAdd size={14} />} label="Upload Committee Report" />
                      <Btn icon={<CheckmarkOutline size={14} />} label="Vote: Favorable" variant="success" />
                      <Btn icon={<Archive size={14} />} label="Archive" variant="danger" />
                      <span className="ml-auto text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Favorable vote → auto-push to Second Reading</span>
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

// ==================== 6.1C SECOND READING ====================

const originalDraft = [
  { line: 1, text: "SECTION 1. Short Title. — This ordinance shall be known as the", type: "unchanged" },
  { line: 2, text: '"Marine Litter Interception Program Ordinance of 2026."', type: "unchanged" },
  { line: 3, text: "", type: "unchanged" },
  { line: 4, text: "SECTION 2. Purpose. — The City Government of Ormoc shall", type: "unchanged" },
  { line: 5, text: "establish a comprehensive marine litter interception program", type: "unchanged" },
  { line: 6, text: "covering all major waterways within the city limits.", type: "deletion" },
  { line: 7, text: "", type: "unchanged" },
  { line: 8, text: "SECTION 3. Appropriation. — The amount of FIVE MILLION", type: "unchanged" },
  { line: 9, text: "PESOS (₱5,000,000.00) is hereby appropriated from the", type: "deletion" },
  { line: 10, text: "General Fund for the implementation of this program.", type: "unchanged" },
  { line: 11, text: "", type: "unchanged" },
  { line: 12, text: "SECTION 4. Implementing Agency. — The City ENRO shall be", type: "unchanged" },
  { line: 13, text: "the primary implementing agency for this ordinance.", type: "unchanged" },
  { line: 14, text: "", type: "unchanged" },
  { line: 15, text: "SECTION 5. Penalties. — Any person found violating the", type: "unchanged" },
  { line: 16, text: "provisions of this ordinance shall be fined not less than", type: "unchanged" },
  { line: 17, text: "₱500.00 and not more than ₱5,000.00.", type: "deletion" },
];

const amendedDraft = [
  { line: 1, text: "SECTION 1. Short Title. — This ordinance shall be known as the", type: "unchanged" },
  { line: 2, text: '"Marine Litter Interception Program Ordinance of 2026."', type: "unchanged" },
  { line: 3, text: "", type: "unchanged" },
  { line: 4, text: "SECTION 2. Purpose. — The City Government of Ormoc shall", type: "unchanged" },
  { line: 5, text: "establish a comprehensive marine litter interception program", type: "unchanged" },
  { line: 6, text: "covering all major waterways and coastal areas within the", type: "insertion" },
  { line: 7, text: "city limits, including Ormoc Bay.", type: "insertion" },
  { line: 8, text: "", type: "unchanged" },
  { line: 9, text: "SECTION 3. Appropriation. — The amount of SEVEN MILLION", type: "insertion" },
  { line: 10, text: "FIVE HUNDRED THOUSAND PESOS (₱7,500,000.00) is hereby", type: "insertion" },
  { line: 11, text: "appropriated from the General Fund for the implementation", type: "unchanged" },
  { line: 12, text: "of this program.", type: "unchanged" },
  { line: 13, text: "", type: "unchanged" },
  { line: 14, text: "SECTION 4. Implementing Agency. — The City ENRO shall be", type: "unchanged" },
  { line: 15, text: "the primary implementing agency for this ordinance.", type: "unchanged" },
  { line: 16, text: "", type: "unchanged" },
  { line: 17, text: "SECTION 5. Penalties. — Any person found violating the", type: "unchanged" },
  { line: 18, text: "provisions of this ordinance shall be fined not less than", type: "unchanged" },
  { line: 19, text: "₱1,000.00 and not more than ₱10,000.00, or imprisonment", type: "insertion" },
  { line: 20, text: "of not more than six (6) months, or both.", type: "insertion" },
];

function SecondReading() {
  const [trackChanges, setTrackChanges] = useState(true);
  const items = measures.filter(m => m.stage === "Second Reading");

  return (
    <div>
      <PageHeader
        title="Floor Deliberations"
        subtitle="Active Measures Pipeline · Second Reading (Debate & Amendment)"
        actions={<>
          <button
            onClick={() => setTrackChanges(!trackChanges)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
              trackChanges ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-white text-neutral-700 border border-neutral-200"
            }`}
          >
            <View size={14} />{trackChanges ? "Track Changes: ON" : "Track Changes: OFF"}
          </button>
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Measures in Debate" value={`${items.length}`} sub="On the floor" />
        <StatCard label="Amendments Proposed" value="4" sub="Across all measures" />
        <StatCard label="Session" value="42nd" sub="Regular session, 2026" />
        <StatCard label="Presiding" value="VM Reyes" sub="Vice Mayor" />
      </div>

      {/* Measure selector */}
      <div className="bg-white rounded-xl border border-neutral-200 p-4 mb-5">
        <div className="flex items-center gap-3">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Currently Debating:</span>
          {items.map(m => (
            <div key={m.trackingNo} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200">
              <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-amber-700">{m.trackingNo}</span>
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-amber-800">{m.title.slice(0, 45)}…</span>
            </div>
          ))}
        </div>
      </div>

      {/* Split-screen Version Control UI */}
      <div className="grid grid-cols-2 gap-0 rounded-xl border border-neutral-200 overflow-hidden bg-white">
        {/* Left — Original */}
        <div className="border-r border-neutral-200">
          <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
            <Report size={14} className="text-neutral-500" />
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Original Committee Draft</span>
            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 ml-auto">v1.0 — Committee on Appropriations</span>
          </div>
          <div className="p-4 font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] leading-[22px]">
            {originalDraft.map(line => (
              <div
                key={`orig-${line.line}`}
                className={`flex gap-3 px-2 py-0.5 rounded ${
                  trackChanges && line.type === "deletion" ? "bg-red-50 line-through text-red-600" : "text-neutral-700"
                }`}
              >
                <span className="text-neutral-300 w-5 text-right shrink-0 select-none">{line.line}</span>
                <span>{line.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right — Amended */}
        <div>
          <div className="px-4 py-2.5 bg-neutral-50 border-b border-neutral-100 flex items-center gap-2">
            <DocumentExport size={14} className="text-blue-500" />
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Live Amended Draft</span>
            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 ml-auto">v2.3 — Floor amendments applied</span>
          </div>
          <div className="p-4 font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] leading-[22px]">
            {amendedDraft.map(line => (
              <div
                key={`amend-${line.line}`}
                className={`flex gap-3 px-2 py-0.5 rounded ${
                  trackChanges && line.type === "insertion" ? "bg-emerald-50 text-emerald-700" : "text-neutral-700"
                }`}
              >
                <span className="text-neutral-300 w-5 text-right shrink-0 select-none">{line.line}</span>
                <span>
                  {trackChanges && line.type === "insertion" && <span className="text-emerald-400 mr-1">+</span>}
                  {line.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Amendment summary */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mt-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Amendment Summary</h3>
        <div className="space-y-2">
          {[
            { section: "Section 2", change: "Expanded coverage to include coastal areas and Ormoc Bay", author: "Hon. M. Delgado", type: "Expansion" },
            { section: "Section 3", change: "Increased appropriation from ₱5M to ₱7.5M to cover coastal operations", author: "Hon. L. Santos", type: "Budget Increase" },
            { section: "Section 5", change: "Doubled penalty fines and added imprisonment clause", author: "Hon. R. Almario", type: "Penalty Enhancement" },
          ].map(a => (
            <div key={a.section} className="flex items-center gap-4 p-3 rounded-lg bg-neutral-50 border border-neutral-100">
              <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-amber-600 w-20 shrink-0">{a.section}</span>
              <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700 flex-1">{a.change}</span>
              <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{a.author}</span>
              <span className="text-[9px] font-['Lexend:Medium',_sans-serif] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{a.type}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ==================== 6.1D THIRD READING ====================

const councilors = [
  { name: "Hon. R. Almario", initials: "RA", vote: "YES" },
  { name: "Hon. M. Delgado", initials: "MD", vote: "YES" },
  { name: "Hon. L. Santos", initials: "LS", vote: "YES" },
  { name: "Hon. C. Torres", initials: "CT", vote: "YES" },
  { name: "Hon. J. Cruz", initials: "JC", vote: "NO" },
  { name: "Hon. B. Navarro", initials: "BN", vote: "YES" },
  { name: "Hon. A. Reyes", initials: "AR", vote: "YES" },
  { name: "Hon. P. Garcia", initials: "PG", vote: "YES" },
  { name: "Hon. E. Lim", initials: "EL", vote: "ABSTAIN" },
  { name: "Hon. D. Fernandez", initials: "DF", vote: "YES" },
  { name: "Hon. S. Ong", initials: "SO", vote: "NO" },
  { name: "Hon. G. Tan", initials: "GT", vote: "YES" },
];

function ThirdReading() {
  const [showConfetti, setShowConfetti] = useState(false);
  const yesCount = councilors.filter(c => c.vote === "YES").length;
  const noCount = councilors.filter(c => c.vote === "NO").length;
  const abstainCount = councilors.filter(c => c.vote === "ABSTAIN").length;
  const majority = Math.ceil(councilors.length / 2) + 1; // simple majority
  const passed = yesCount >= majority;

  const currentMeasure = measures.find(m => m.stage === "Third Reading");

  return (
    <div className="relative">
      <PageHeader
        title="Final Plenary Vote"
        subtitle="Active Measures Pipeline · Third Reading"
        actions={<>
          <Btn icon={<UserMultiple size={14} />} label="Call for Division of the House" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Quorum Required" value={`${Math.ceil(councilors.length / 2 + 1)}`} sub={`of ${councilors.length} members`} />
        <StatCard label="Present" value={`${councilors.length}`} sub="All members present" trend="up" />
        <StatCard label="Majority Needed" value={`${majority}`} sub="For passage" />
        <StatCard label="Status" value={passed ? "PASSED" : "Voting"} sub={passed ? "Majority achieved" : "In progress"} trend={passed ? "up" : "flat"} />
      </div>

      {/* Current measure banner */}
      {currentMeasure && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-orange-600">{currentMeasure.trackingNo}</span>
            <Pill status="Third Reading" />
          </div>
          <p className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{currentMeasure.title}</p>
          <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">Author: {currentMeasure.author} · No further debate permitted. Final vote only.</p>
        </div>
      )}

      {/* Live Tally Widget */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-5 text-center">Live Vote Tally</h3>
        <div className="flex items-end justify-center gap-8">
          {/* YES */}
          <div className="text-center">
            <div className="w-32 bg-neutral-100 rounded-xl overflow-hidden flex flex-col justify-end" style={{ height: 180 }}>
              <div className="bg-emerald-400 rounded-t-lg transition-all duration-500 flex items-center justify-center" style={{ height: `${(yesCount / councilors.length) * 100}%` }}>
                <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-white">{yesCount}</span>
              </div>
            </div>
            <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700 mt-2 block">YES</span>
          </div>
          {/* NO */}
          <div className="text-center">
            <div className="w-32 bg-neutral-100 rounded-xl overflow-hidden flex flex-col justify-end" style={{ height: 180 }}>
              <div className="bg-red-400 rounded-t-lg transition-all duration-500 flex items-center justify-center" style={{ height: `${(noCount / councilors.length) * 100}%` }}>
                <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-white">{noCount}</span>
              </div>
            </div>
            <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-red-700 mt-2 block">NO</span>
          </div>
          {/* ABSTAIN */}
          <div className="text-center">
            <div className="w-32 bg-neutral-100 rounded-xl overflow-hidden flex flex-col justify-end" style={{ height: 180 }}>
              <div className="bg-neutral-400 rounded-t-lg transition-all duration-500 flex items-center justify-center" style={{ height: `${(abstainCount / councilors.length) * 100}%` }}>
                <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-white">{abstainCount}</span>
              </div>
            </div>
            <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-600 mt-2 block">ABSTAIN</span>
          </div>
        </div>
        {/* Majority line */}
        <div className="flex items-center justify-center gap-2 mt-4">
          <div className="h-px bg-emerald-300 flex-1 max-w-[200px]" />
          <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-emerald-600">Majority threshold: {majority} votes</span>
          <div className="h-px bg-emerald-300 flex-1 max-w-[200px]" />
        </div>
        {/* Passed banner */}
        {passed && (
          <div className="mt-5 bg-emerald-50 border-2 border-emerald-300 rounded-xl p-4 text-center relative overflow-hidden">
            <div className="text-[20px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700">🎉 MEASURE PASSED 🎉</div>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-emerald-600 mt-1">
              {yesCount}-{noCount}-{abstainCount} (Yes-No-Abstain) · Document locked · Auto-forwarded to Mayoral Approval
            </p>
          </div>
        )}
      </div>

      {/* Individual councilor votes */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Quorum Roll — Individual Votes</h3>
        <div className="grid grid-cols-4 gap-3">
          {councilors.map(c => {
            const voteColors: Record<string, string> = {
              YES: "border-emerald-300 bg-emerald-50",
              NO: "border-red-300 bg-red-50",
              ABSTAIN: "border-neutral-300 bg-neutral-50",
            };
            const dotColors: Record<string, string> = {
              YES: "bg-emerald-500",
              NO: "bg-red-500",
              ABSTAIN: "bg-neutral-400",
            };
            return (
              <div key={c.name} className={`flex items-center gap-3 p-3 rounded-lg border ${voteColors[c.vote]}`}>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-white">{c.initials}</div>
                <div className="flex-1">
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 block">{c.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${dotColors[c.vote]}`} />
                  <span className={`text-[11px] font-['Lexend:SemiBold',_sans-serif] ${c.vote === "YES" ? "text-emerald-700" : c.vote === "NO" ? "text-red-700" : "text-neutral-600"}`}>{c.vote}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== 6.1E MAYORAL APPROVAL ====================

const pendingApproval = [
  {
    trackingNo: "ORD-2026-042",
    title: "An Ordinance Establishing the Ormoc City Sustainable Tourism and Eco-Park Zone",
    passedDate: "2026-04-10",
    daysElapsed: 6,
    deadlineDays: 10,
    author: "Hon. R. Almario",
    voteResult: "9-2-1",
    status: "Pending" as const,
  },
];

function MayoralApproval() {
  const item = pendingApproval[0];
  const daysRemaining = item.deadlineDays - item.daysElapsed;
  const pctElapsed = (item.daysElapsed / item.deadlineDays) * 100;

  return (
    <div>
      <PageHeader
        title="Pending Executive Action"
        subtitle="Active Measures Pipeline · Mayoral Approval"
        actions={<>
          <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <Time size={14} className="text-amber-600" />
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-amber-700">10-Day Lapse Timer Active</span>
          </div>
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Pending Signature" value={`${pendingApproval.length}`} sub="Awaiting Mayor" />
        <StatCard label="Days Remaining" value={`${daysRemaining}`} sub={`of ${item.deadlineDays} day limit`} trend={daysRemaining < 4 ? "down" : "flat"} />
        <StatCard label="Vote Result" value={item.voteResult} sub="Yes-No-Abstain" />
        <StatCard label="Auto-Lapse" value={daysRemaining <= 0 ? "TRIGGERED" : `In ${daysRemaining}d`} sub="If unsigned" />
      </div>

      {/* BPA Lapse Timer explanation */}
      <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 mb-5">
        <div className="flex items-start gap-3">
          <Renew size={16} className="text-cyan-600 mt-0.5 shrink-0" />
          <div>
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-cyan-800">Automated Lapse Rule (R.A. 7160, Sec. 54)</span>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-cyan-700 mt-0.5">
              If the Mayor does not sign or veto this ordinance within the legally mandated {item.deadlineDays}-day timeframe, the BPA engine will automatically change the status to <strong>"Enacted into Law (Lapsed)"</strong> and push it to the Adopted Ordinances Archive.
            </p>
          </div>
        </div>
      </div>

      {/* Pending approval board */}
      {pendingApproval.map(p => (
        <div key={p.trackingNo} className="bg-white rounded-xl border border-neutral-200 p-6 mb-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-cyan-600">{p.trackingNo}</span>
                <Pill status="Mayoral Approval" />
              </div>
              <h3 className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{p.title}</h3>
              <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Author: {p.author} · Passed: {p.passedDate} · Vote: {p.voteResult}</p>
            </div>
          </div>

          {/* Countdown timer */}
          <div className="bg-neutral-50 rounded-xl p-5 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Executive Action Countdown</span>
              <span className={`text-[14px] font-['Lexend:SemiBold',_sans-serif] ${daysRemaining < 4 ? "text-red-600" : "text-cyan-700"}`}>
                {daysRemaining} days remaining
              </span>
            </div>
            <div className="w-full h-6 bg-neutral-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 flex items-center justify-end pr-3 ${
                  pctElapsed > 80 ? "bg-red-400" : pctElapsed > 50 ? "bg-amber-400" : "bg-cyan-400"
                }`}
                style={{ width: `${pctElapsed}%` }}
              >
                <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] text-white">{item.daysElapsed}d elapsed</span>
              </div>
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Passed ({p.passedDate})</span>
              <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Deadline (2026-04-20)</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-neutral-100">
            <button className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-emerald-700 transition-colors">
              <CheckmarkOutline size={16} /> Sign into Law
            </button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-red-100 transition-colors">
              <Warning size={16} /> Veto with Remarks
            </button>
            <span className="ml-auto text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
              If no action is taken by deadline, measure auto-enacts via lapse provision.
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ==================== 6.2 PARENT: ADOPTED ORDINANCES ARCHIVE ====================

function AdoptedOrdinancesArchive() {
  const activeCount = adoptedOrdinances.filter(o => o.status === "Active").length;
  const byYear = [
    { year: "2024", count: 3 },
    { year: "2025", count: 5 },
    { year: "2026 YTD", count: 0 },
  ];

  return (
    <div>
      <PageHeader
        title="Adopted Ordinances Archive"
        subtitle="Legislative Dashboard · The Digital Law Library"
        actions={<>
          <Btn icon={<Search size={14} />} label="AI Legal Research" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export Registry" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Ordinances" value={`${adoptedOrdinances.length}`} sub="In digital archive" />
        <StatCard label="Active" value={`${activeCount}`} sub="Currently enforced" trend="up" />
        <StatCard label="Amended" value={`${adoptedOrdinances.filter(o => o.status === "Amended").length}`} sub="Modified post-enactment" />
        <StatCard label="Repealed" value={`${adoptedOrdinances.filter(o => o.status === "Repealed").length}`} sub="No longer in force" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-5">
        {/* Semantic Search card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><Search size={16} className="text-blue-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">AI Semantic Search</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">NLP-powered legal assistant</p>
            </div>
          </div>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-3">Ask questions in natural language instead of searching by ordinance number. The NLP engine parses all adopted ordinances and highlights the exact paragraph.</p>
          <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 italic">"What is the fine for illegal dumping in the Eco-Park?"</p>
          </div>
        </div>

        {/* Full Index card */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><Archive size={16} className="text-emerald-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Immutable Registry</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Blockchain-sealed ordinances</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={100}>
            <BarChart data={byYear}>
              <Bar key="count" dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
              <XAxis key="x" dataKey="year" tick={{ fontSize: 10 }} />
              <Tooltip key="t" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent ordinances preview */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="px-5 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2">
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Recent Ordinances</span>
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Last 5 enacted</span>
        </div>
        {adoptedOrdinances.slice(0, 5).map(o => (
          <div key={o.number} className="flex items-center gap-4 px-5 py-3 border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors">
            <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-blue-600 w-28 shrink-0">{o.number}</span>
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 flex-1">{o.title}</span>
            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 w-24">{o.dateEnacted}</span>
            <Pill status={o.status} />
            <HashDisplay hash={o.hash} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 6.2A SEMANTIC SEARCH ====================

const sampleResults = [
  {
    ordinance: "ORD-2025-038",
    title: "An Ordinance Imposing Fines for Illegal Dumping within the Eco-Park Zone",
    relevance: 97,
    excerpt: "SECTION 5. Penalties. — Any person caught illegally dumping waste within the designated Eco-Park Zone shall be fined not less than **₱5,000.00** and not more than **₱25,000.00** for the first offense, and not less than ₱25,000.00 and not more than ₱50,000.00 for subsequent offenses.",
    highlight: "₱5,000.00 and not more than ₱25,000.00",
    section: "Section 5, Paragraph 1",
  },
  {
    ordinance: "ORD-2025-035",
    title: "An Ordinance Establishing the Anti-Littering Program (#SHInEOrmoc)",
    relevance: 82,
    excerpt: "SECTION 8. Prohibited Acts within Eco-Zones. — The following acts are strictly prohibited: (a) Dumping of solid waste; (b) Discharge of liquid waste into waterways; (c) Open burning of waste materials.",
    highlight: "Dumping of solid waste",
    section: "Section 8, Paragraph 1",
  },
  {
    ordinance: "ORD-2024-041",
    title: "An Ordinance Declaring Ormoc City as a Plastic-Free Zone (Original)",
    relevance: 45,
    excerpt: "SECTION 3. Coverage. — This ordinance applies to all commercial establishments within the city, including areas adjacent to the Eco-Park development zone.",
    highlight: "Eco-Park development zone",
    section: "Section 3",
  },
];

function SemanticSearch() {
  const [query, setQuery] = useState("What is the fine for illegal dumping in the Eco-Park?");
  const [hasSearched, setHasSearched] = useState(true);

  return (
    <div>
      <PageHeader
        title="AI Legal Research"
        subtitle="Adopted Ordinances Archive · NLP Semantic Search"
        actions={<>
          <Btn icon={<Download size={14} />} label="Export Results" />
        </>}
      />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Ordinances Indexed" value={`${adoptedOrdinances.length}`} sub="In NLP corpus" />
        <StatCard label="Sections Parsed" value="156" sub="Full-text indexed" />
        <StatCard label="Avg. Response" value="0.4s" sub="NLP query time" trend="up" />
        <StatCard label="Accuracy" value="94%" sub="Relevance score" trend="up" />
      </div>

      {/* Google-style search interface */}
      <div className="bg-white rounded-xl border border-neutral-200 p-6 mb-5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <Analytics size={20} className="text-blue-600" />
            <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Ask the Legal Assistant</span>
          </div>
          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mb-4">
            Ask questions in plain language. The NLP engine understands context, synonyms, and legal cross-references.
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 focus-within:border-blue-300 focus-within:bg-white transition-colors">
              <Search size={18} className="text-neutral-400 shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask a question about city ordinances…"
                className="flex-1 bg-transparent outline-none text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400"
              />
            </div>
            <button
              onClick={() => setHasSearched(true)}
              className="px-5 py-3 bg-blue-600 text-white rounded-xl text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-blue-700 transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Results */}
      {hasSearched && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{sampleResults.length} results found in 0.4 seconds</span>
          </div>

          {sampleResults.map(r => (
            <div key={r.ordinance} className="bg-white rounded-xl border border-neutral-200 p-5 hover:border-blue-200 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-blue-600">{r.ordinance}</span>
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">·</span>
                  <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{r.section}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-16 h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-blue-500" style={{ width: `${r.relevance}%` }} />
                  </div>
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-blue-600">{r.relevance}% match</span>
                </div>
              </div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-2">{r.title}</h4>
              <div className="bg-neutral-50 rounded-lg p-3 border border-neutral-100">
                <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed">
                  "…{r.excerpt.split(r.highlight).map((part, i, arr) => (
                    <React.Fragment key={i}>
                      {part}
                      {i < arr.length - 1 && <mark className="bg-yellow-200 px-0.5 rounded">{r.highlight}</mark>}
                    </React.Fragment>
                  ))}…"
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Btn icon={<View size={14} />} label="View Full PDF" />
                <Btn icon={<DocumentExport size={14} />} label="Cite This Section" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ==================== 6.2B FULL INDEX ====================

function FullIndex() {
  const [showHashes, setShowHashes] = useState(true);

  return (
    <div>
      <PageHeader
        title="City Ordinance Registry"
        subtitle="Adopted Ordinances Archive · Immutable Full Index"
        actions={<>
          <button
            onClick={() => setShowHashes(!showHashes)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
              showHashes ? "bg-slate-800 text-cyan-300 hover:bg-slate-700" : "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50"
            }`}
          >
            <Security size={14} />{showHashes ? "Blockchain Hashes: ON" : "Blockchain Hashes: OFF"}
          </button>
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />

      {/* Zero-trust banner */}
      <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-3">
        <Locked size={16} className="text-cyan-400" />
        <div>
          <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-cyan-300">IMMUTABLE LAW REGISTRY</span>
          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400 ml-3">Every enacted ordinance is cryptographically sealed. No one can secretly alter the text of a law after it has been passed.</span>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-400">Chain Synced</span>
        </div>
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Ordinances" value={`${adoptedOrdinances.length}`} sub="In immutable ledger" />
        <StatCard label="Chain Verified" value={`${adoptedOrdinances.length}`} sub="100% hash-checked" trend="up" />
        <StatCard label="Tamper Alerts" value="0" sub="All hashes match" trend="up" />
        <StatCard label="Last Sync" value="2m ago" sub="Blockchain block #48,291" />
      </div>

      {/* Master List */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className={`grid gap-0 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100 ${showHashes ? "grid-cols-[100px_1fr_100px_90px_130px_180px]" : "grid-cols-[100px_1fr_130px_100px_90px]"}`}>
          {showHashes
            ? ["Ordinance No.", "Title", "Date Enacted", "Status", "Author", "Blockchain Hash"].map(h => (
                <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
              ))
            : ["Ordinance No.", "Title", "Author", "Date Enacted", "Status"].map(h => (
                <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
              ))
          }
        </div>

        {adoptedOrdinances.map(o => (
          <div
            key={o.number}
            className={`grid gap-0 px-5 py-3.5 border-b border-neutral-50 hover:bg-blue-50/20 transition-colors items-center ${showHashes ? "grid-cols-[100px_1fr_100px_90px_130px_180px]" : "grid-cols-[100px_1fr_130px_100px_90px]"}`}
          >
            <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] text-blue-600">{o.number}</span>
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 pr-3">{o.title}</span>
            {showHashes ? (
              <>
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{o.dateEnacted}</span>
                <Pill status={o.status} />
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{o.author}</span>
                <div className="flex items-center gap-1.5">
                  <HashDisplay hash={o.hash} />
                  <div className="flex items-center gap-0.5">
                    <CheckmarkOutline size={12} className="text-emerald-500" />
                  </div>
                </div>
              </>
            ) : (
              <>
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{o.author}</span>
                <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{o.dateEnacted}</span>
                <Pill status={o.status} />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Connection to Financial Oversight */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mt-5">
        <div className="flex items-start gap-3">
          <Analytics size={18} className="text-blue-600 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-blue-800 mb-1">Architectural Link: Law → Budget → Execution</h4>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-blue-700 leading-relaxed">
              When an ordinance with a ₱5M budget is passed through this pipeline and sealed on the blockchain, that exact ₱5M is automatically generated as the "Master Budget" in the Financial Oversight module. There is zero manual entry, zero discrepancy, and perfect traceability from the council floor to the final contractor receipt.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== EXPORTS ====================
export const legislativePages: Record<string, Record<string, React.ComponentType>> = {
  legdash: {
    "Active Measures Pipeline": ActiveMeasuresPipeline,
    "First Reading": FirstReading,
    "Committee Level": CommitteeLevel,
    "Second Reading": SecondReading,
    "Third Reading": ThirdReading,
    "Mayoral Approval": MayoralApproval,
    "Adopted Ordinances Archive": AdoptedOrdinancesArchive,
    "Semantic Search": SemanticSearch,
    "Full Index": FullIndex,
  },
  ...sessionPages,
  ...committeePages,
  councilor: {
    "Councilor Dashboard": CouncilorPanel,
  },
};

export const legislativeDefaultPages: Record<string, string> = {
  legdash: "Active Measures Pipeline",
  ...sessionDefaultPages,
  ...committeeDefaultPages,
  councilor: "Councilor Dashboard",
};

export function LegislativeContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
  const label = activePage || "Blank Dashboard";

  return (
    <div className="flex items-center justify-center h-full text-neutral-400">
      <div className="text-center">
        <Settings size={40} className="mx-auto mb-3 opacity-30" />
        <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">Blank dashboard</p>
        <p className="text-[12px] mt-1">{label}</p>
      </div>
    </div>
  );
}
