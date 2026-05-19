import React, { useState, useMemo } from "react";
import { Settings } from "@carbon/icons-react";
import {
  Activity,
  AlertTriangle,
  Brain,
  TrendingDown,
  TrendingUp,
  Users,
  Zap,
  Heart,
  Flame,
  Clock,
  Gauge,
  Sparkles,
  RefreshCw,
  ChevronRight,
  Info,
  CheckCircle2,
  ArrowRight,
  Dna,
  Bell,
  MapPin,
  Calendar,
  DollarSign,
  Fingerprint,
  Shield,
  Download,
  XCircle,
  Pause,
  FileCheck,
  Lock,
  Search,
  Plus,
  User,
  Award,
  Hash,
  ExternalLink,
  Scale,
  BookOpen,
  Link2,
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
          <Dna size={12} /> HRMO · Command Center
        </div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
          {subtitle || "Human Resource Management Office · Ormoc City"}
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
}: {
  icon?: React.ReactNode;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "success";
  onClick?: () => void;
}) {
  const s: Record<string, string> = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
  };
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${s[variant]}`}
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
      <div className={`text-[24px] font-['Lexend:SemiBold',_sans-serif] mt-1 ${toneMap[tone]}`}>{value}</div>
      {trend && <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{trend}</div>}
    </div>
  );
}

// ==================== 9.1.A — DEPARTMENT RISK FLAGS ====================

type RiskLevel = "optimal" | "elevated" | "critical";

type Dept = {
  id: string;
  name: string;
  staff: number;
  fatiguePct: number;
  risk: RiskLevel;
  avgLatencyHrs: number;
  baselineLatencyHrs: number;
  weeksSinceLowLoad: number;
  sprintLoad: number;
  topStrainName: string;
};

const DEPARTMENTS: Dept[] = [
  { id: "eng", name: "Engineering", staff: 142, fatiguePct: 85, risk: "critical", avgLatencyHrs: 18.0, baselineLatencyHrs: 4.2, weeksSinceLowLoad: 31, sprintLoad: 94, topStrainName: "Engr. A. Dela Cruz" },
  { id: "hlth", name: "Health Office", staff: 208, fatiguePct: 71, risk: "critical", avgLatencyHrs: 9.6, baselineLatencyHrs: 3.1, weeksSinceLowLoad: 22, sprintLoad: 88, topStrainName: "Dr. M. Sabando" },
  { id: "led", name: "LEDIPO", staff: 54, fatiguePct: 48, risk: "elevated", avgLatencyHrs: 6.2, baselineLatencyHrs: 3.8, weeksSinceLowLoad: 14, sprintLoad: 72, topStrainName: "L. Bascon" },
  { id: "dswd", name: "Social Welfare", staff: 96, fatiguePct: 52, risk: "elevated", avgLatencyHrs: 7.9, baselineLatencyHrs: 4.6, weeksSinceLowLoad: 18, sprintLoad: 76, topStrainName: "J. Pomentil" },
  { id: "env", name: "Environment (CENRO)", staff: 68, fatiguePct: 41, risk: "elevated", avgLatencyHrs: 5.4, baselineLatencyHrs: 3.5, weeksSinceLowLoad: 12, sprintLoad: 68, topStrainName: "R. Alcantara" },
  { id: "tour", name: "Tourism", staff: 32, fatiguePct: 22, risk: "optimal", avgLatencyHrs: 3.8, baselineLatencyHrs: 3.4, weeksSinceLowLoad: 3, sprintLoad: 44, topStrainName: "—" },
  { id: "agri", name: "Agriculture", staff: 78, fatiguePct: 19, risk: "optimal", avgLatencyHrs: 4.1, baselineLatencyHrs: 3.9, weeksSinceLowLoad: 2, sprintLoad: 38, topStrainName: "—" },
  { id: "gso", name: "General Services", staff: 114, fatiguePct: 28, risk: "optimal", avgLatencyHrs: 4.7, baselineLatencyHrs: 4.2, weeksSinceLowLoad: 5, sprintLoad: 51, topStrainName: "—" },
  { id: "treas", name: "City Treasury", staff: 62, fatiguePct: 34, risk: "elevated", avgLatencyHrs: 5.1, baselineLatencyHrs: 3.7, weeksSinceLowLoad: 9, sprintLoad: 63, topStrainName: "C. Villamor" },
  { id: "pln", name: "City Planning", staff: 40, fatiguePct: 66, risk: "critical", avgLatencyHrs: 11.2, baselineLatencyHrs: 4.0, weeksSinceLowLoad: 20, sprintLoad: 82, topStrainName: "Arch. P. Odal" },
  { id: "leg", name: "Legal Office", staff: 28, fatiguePct: 43, risk: "elevated", avgLatencyHrs: 6.8, baselineLatencyHrs: 4.4, weeksSinceLowLoad: 11, sprintLoad: 65, topStrainName: "Atty. F. Lariosa" },
  { id: "itc", name: "ICT Office", staff: 36, fatiguePct: 24, risk: "optimal", avgLatencyHrs: 3.1, baselineLatencyHrs: 2.9, weeksSinceLowLoad: 4, sprintLoad: 47, topStrainName: "—" },
];

const riskStyles: Record<RiskLevel, { ring: string; chip: string; glow: string; dot: string; label: string }> = {
  optimal: {
    ring: "border-emerald-200",
    chip: "bg-emerald-100 text-emerald-700",
    glow: "from-emerald-50 to-white",
    dot: "bg-emerald-500",
    label: "Optimal",
  },
  elevated: {
    ring: "border-amber-200",
    chip: "bg-amber-100 text-amber-700",
    glow: "from-amber-50 to-white",
    dot: "bg-amber-500",
    label: "Elevated",
  },
  critical: {
    ring: "border-red-300",
    chip: "bg-red-100 text-red-700",
    glow: "from-red-100 to-red-50",
    dot: "bg-red-600",
    label: "Critical",
  },
};

function DepartmentRiskFlags() {
  const [selected, setSelected] = useState<Dept>(DEPARTMENTS[0]);
  const [showIntervention, setShowIntervention] = useState(false);

  const counts = useMemo(() => {
    return DEPARTMENTS.reduce(
      (acc, d) => {
        acc[d.risk]++;
        return acc;
      },
      { optimal: 0, elevated: 0, critical: 0 } as Record<RiskLevel, number>
    );
  }, []);

  return (
    <div>
      <PageHeader
        title="City-Wide Fatigue Radar"
        subtitle="Predictive burnout surveillance across 12 offices · updated 4 minutes ago"
        actions={
          <>
            <Btn icon={<RefreshCw size={14} />} label="Recompute" />
            <Btn icon={<Heart size={14} />} label="Initiate Wellness Intervention" variant="primary" onClick={() => setShowIntervention(true)} />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Workforce" value="2,068" trend="across 12 departments" />
        <Stat label="Optimal" value={String(counts.optimal)} trend="green-zone offices" tone="good" />
        <Stat label="Elevated" value={String(counts.elevated)} trend="require monitoring" tone="warn" />
        <Stat label="Critical" value={String(counts.critical)} trend="intervention recommended" tone="bad" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-4 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Brain size={14} className="text-neutral-700" />
          <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">AI Fatigue Synthesis</span>
          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 ml-auto">model v4.2 · confidence 0.91</span>
        </div>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">
          Three offices are crossing critical fatigue thresholds. <span className="text-red-600 font-['Lexend:Medium',_sans-serif]">Engineering</span> shows the steepest decline — cursor-latency data indicates 85% of staff are operating at 4.3× their baseline response time. Without intervention within <span className="font-['Lexend:Medium',_sans-serif]">72 hours</span>, the model predicts a 38% probability of cascading sick-leave filings.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {DEPARTMENTS.map((d) => {
          const s = riskStyles[d.risk];
          const isActive = selected.id === d.id;
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className={`text-left rounded-xl border bg-gradient-to-br ${s.glow} ${s.ring} p-4 cursor-pointer transition-all hover:shadow-md ${
                isActive ? "ring-2 ring-neutral-900 ring-offset-2" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${s.chip}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
                {d.risk === "critical" && <Flame size={14} className="text-red-600" />}
              </div>
              <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{d.name}</div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
                {d.staff} staff · {d.fatiguePct}% fatigued
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className={`h-full ${d.risk === "critical" ? "bg-red-500" : d.risk === "elevated" ? "bg-amber-400" : "bg-emerald-500"}`}
                  style={{ width: `${d.fatiguePct}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* Drill-down */}
      <div className="mt-6 bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="border-b border-neutral-200 px-5 py-4 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
              Drill-down · {riskStyles[selected.risk].label}
            </div>
            <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">{selected.name}</div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
            The Proof <ChevronRight size={12} />
          </div>
        </div>

        <div className="grid grid-cols-2">
          {/* Response Latency Timeline */}
          <div className="p-5 border-r border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 flex items-center gap-1.5">
                <Clock size={12} /> Response Latency (site permits)
              </div>
              <span className="text-[11px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">14-day window</span>
            </div>
            <LatencyChart baseline={selected.baselineLatencyHrs} current={selected.avgLatencyHrs} />
            <div className="mt-3 p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
              <div className="flex items-center gap-1.5 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-1">
                <Sparkles size={11} /> AI Insight
              </div>
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">
                <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{selected.topStrainName}</span> usually approves tickets in <span className="font-['Lexend:Medium',_sans-serif]">{selected.baselineLatencyHrs}h</span>. Over 14 days, average has dropped to <span className="text-red-600 font-['Lexend:Medium',_sans-serif]">{selected.avgLatencyHrs}h</span> — cognitive fatigue marker.
              </p>
            </div>
          </div>

          {/* Burn rate */}
          <div className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 flex items-center gap-1.5">
                <Flame size={12} /> Cumulative Sprint Load
              </div>
              <span className="text-[11px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">26-week continuous</span>
            </div>
            <BurnRateChart load={selected.sprintLoad} weeksSinceLowLoad={selected.weeksSinceLowLoad} />
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase text-neutral-400 tracking-wider">Weeks since low-load</div>
                <div className={`text-[18px] font-['Lexend:SemiBold',_sans-serif] mt-0.5 ${selected.weeksSinceLowLoad > 24 ? "text-red-600" : selected.weeksSinceLowLoad > 12 ? "text-amber-600" : "text-emerald-600"}`}>
                  {selected.weeksSinceLowLoad}w
                </div>
              </div>
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-lg">
                <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase text-neutral-400 tracking-wider">Sprint load index</div>
                <div className={`text-[18px] font-['Lexend:SemiBold',_sans-serif] mt-0.5 ${selected.sprintLoad > 80 ? "text-red-600" : selected.sprintLoad > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                  {selected.sprintLoad}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {showIntervention && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setShowIntervention(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Heart size={16} className="text-red-600" />
              <h3 className="text-[16px] font-['Lexend:SemiBold',_sans-serif]">Initiate Wellness Intervention</h3>
            </div>
            <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-4">
              Trigger a non-punitive outreach sequence for <span className="font-['Lexend:Medium',_sans-serif]">{selected.name}</span>. Counselor assignment, load-cap mandate, and a private 1:1 will be scheduled automatically.
            </p>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 bg-neutral-100 rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] hover:bg-neutral-200 cursor-pointer" onClick={() => setShowIntervention(false)}>
                Cancel
              </button>
              <button className="flex-1 py-2.5 bg-neutral-900 text-white rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] hover:bg-neutral-800 cursor-pointer" onClick={() => setShowIntervention(false)}>
                Dispatch Intervention
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Latency chart (pure SVG)
function LatencyChart({ baseline, current }: { baseline: number; current: number }) {
  const points = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 14; i++) {
      const t = i / 13;
      const noise = Math.sin(i * 1.3) * 0.6;
      arr.push(baseline + (current - baseline) * t * t + noise);
    }
    return arr;
  }, [baseline, current]);
  const max = Math.max(...points, current) * 1.1;
  const W = 420;
  const H = 130;
  const dx = W / (points.length - 1);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * dx} ${H - (p / max) * H}`).join(" ");
  const baselineY = H - (baseline / max) * H;

  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="lat-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* baseline */}
      <line x1="0" y1={baselineY} x2={W} y2={baselineY} stroke="#10b981" strokeDasharray="3 3" strokeWidth="1" />
      <text x={W - 4} y={baselineY - 4} textAnchor="end" fontSize="9" fill="#10b981" fontFamily="Lexend">
        baseline {baseline}h
      </text>
      {/* area */}
      <path d={`${pathD} L ${W} ${H} L 0 ${H} Z`} fill="url(#lat-grad)" />
      {/* line */}
      <path d={pathD} fill="none" stroke="#ef4444" strokeWidth="1.75" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={i * dx} cy={H - (p / max) * H} r="2" fill="#ef4444" />
      ))}
      <text x="0" y={H + 12} fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
        Day 1
      </text>
      <text x={W} y={H + 12} textAnchor="end" fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
        Today
      </text>
    </svg>
  );
}

// --- Burn rate chart
function BurnRateChart({ load, weeksSinceLowLoad }: { load: number; weeksSinceLowLoad: number }) {
  const weeks = 26;
  const values = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < weeks; i++) {
      const progress = i / (weeks - 1);
      const base = 30 + progress * (load - 30);
      const wiggle = Math.sin(i * 0.9) * 8;
      arr.push(Math.max(8, Math.min(100, base + wiggle)));
    }
    return arr;
  }, [load]);
  const W = 420;
  const H = 130;
  const bw = W / weeks - 2;
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} className="w-full" preserveAspectRatio="none">
      <line x1="0" y1={H - (40 / 100) * H} x2={W} y2={H - (40 / 100) * H} stroke="#d4d4d4" strokeDasharray="2 2" strokeWidth="1" />
      <text x="2" y={H - (40 / 100) * H - 3} fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
        low-load zone
      </text>
      {values.map((v, i) => {
        const h = (v / 100) * H;
        const color = v > 80 ? "#dc2626" : v > 60 ? "#f59e0b" : "#10b981";
        const lowLoadIdx = weeks - weeksSinceLowLoad - 1;
        const isLastLow = i === lowLoadIdx;
        return (
          <g key={i}>
            <rect x={i * (bw + 2)} y={H - h} width={bw} height={h} fill={color} rx="1" opacity={0.85} />
            {isLastLow && (
              <>
                <line x1={i * (bw + 2) + bw / 2} y1={0} x2={i * (bw + 2) + bw / 2} y2={H} stroke="#525252" strokeDasharray="2 2" />
                <text x={i * (bw + 2) + bw / 2 + 4} y={10} fontSize="8" fill="#525252" fontFamily="Lexend">
                  last low-load
                </text>
              </>
            )}
          </g>
        );
      })}
      <text x="0" y={H + 12} fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
        26 weeks ago
      </text>
      <text x={W} y={H + 12} textAnchor="end" fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
        This week
      </text>
    </svg>
  );
}

// ==================== 9.2.A — EQUITABLE DISTRIBUTION ====================

type Emp = { id: number; x: number; y: number; dept: string; name: string; flagged?: boolean };

const DEPT_COLORS: Record<string, string> = {
  Engineering: "#ef4444",
  Health: "#06b6d4",
  LEDIPO: "#8b5cf6",
  Social: "#f59e0b",
  CENRO: "#10b981",
  Tourism: "#ec4899",
  Treasury: "#3b82f6",
  Planning: "#f97316",
  Legal: "#64748b",
  ICT: "#14b8a6",
  Agri: "#84cc16",
  GSO: "#a855f7",
};

function makeEmployees(): Emp[] {
  const depts = Object.keys(DEPT_COLORS);
  const firsts = ["A.", "J.", "M.", "R.", "L.", "C.", "P.", "D.", "E.", "F."];
  const lasts = ["Dela Cruz", "Santos", "Reyes", "Cruz", "Bacalso", "Odal", "Alcantara", "Bascon", "Lariosa", "Villamor"];
  const arr: Emp[] = [];
  // Tight cluster in middle
  for (let i = 0; i < 180; i++) {
    arr.push({
      id: i,
      x: 35 + Math.random() * 35,
      y: 25 + Math.random() * 35,
      dept: depts[i % depts.length],
      name: `${firsts[i % 10]} ${lasts[(i * 3) % 10]}`,
    });
  }
  // Bottom-left underutilized cluster
  for (let i = 180; i < 230; i++) {
    arr.push({
      id: i,
      x: 4 + Math.random() * 18,
      y: 3 + Math.random() * 15,
      dept: depts[i % depts.length],
      name: `${firsts[i % 10]} ${lasts[(i * 7) % 10]}`,
    });
  }
  // The outlier
  arr.push({ id: 999, x: 92, y: 93, dept: "Engineering", name: "Engr. A. Dela Cruz", flagged: true });
  arr.push({ id: 998, x: 86, y: 88, dept: "Planning", name: "Arch. P. Odal", flagged: true });
  return arr;
}

function EquitableDistribution() {
  const [employees] = useState<Emp[]>(makeEmployees);
  const [autoRebalance, setAutoRebalance] = useState(false);
  const [hover, setHover] = useState<Emp | null>(null);

  return (
    <div>
      <PageHeader
        title="Live Load Distribution"
        subtitle="2,000+ city employees · tasks × complexity · watching the GA play fair"
        actions={
          <>
            <button
              onClick={() => setAutoRebalance((v) => !v)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors border ${
                autoRebalance ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-neutral-700 border-neutral-200"
              }`}
            >
              <span className={`w-7 h-4 rounded-full relative transition-colors ${autoRebalance ? "bg-emerald-500" : "bg-neutral-300"}`}>
                <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${autoRebalance ? "left-3.5" : "left-0.5"}`} />
              </span>
              Auto-Rebalance
            </button>
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Employees Tracked" value="2,068" trend="all depts · live" />
        <Stat label="Cluster Tightness" value="0.74" trend="Gini of load" tone="warn" />
        <Stat label="Underutilized" value="312" trend="bottom-left cluster" />
        <Stat label="Overburdened" value="2" trend="outlier zone" tone="bad" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">The Fairness Graph</div>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Ideal state is a tight cluster. Outliers are the story.
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" /> tight cluster
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> underutilized
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-500" /> overburdened
            </span>
          </div>
        </div>

        <div className="relative">
          <svg viewBox="0 0 600 360" className="w-full h-[420px] bg-gradient-to-br from-neutral-50 to-white rounded-lg border border-neutral-200">
            {/* Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
              <g key={i}>
                <line x1={40 + t * 540} y1="20" x2={40 + t * 540} y2="320" stroke="#f5f5f5" strokeWidth="1" />
                <line x1="40" y1={20 + t * 300} x2="580" y2={20 + t * 300} stroke="#f5f5f5" strokeWidth="1" />
              </g>
            ))}
            {/* Ideal zone */}
            <rect x={40 + 0.3 * 540} y={20 + (1 - 0.6) * 300} width={0.4 * 540} height={0.35 * 300} fill="#10b981" opacity="0.05" stroke="#10b981" strokeDasharray="3 3" strokeOpacity="0.3" />
            <text x={40 + 0.5 * 540} y={20 + (1 - 0.6) * 300 - 6} textAnchor="middle" fontSize="9" fill="#10b981" fontFamily="Lexend">
              equitable cluster
            </text>

            {/* Axes */}
            <line x1="40" y1="320" x2="580" y2="320" stroke="#a3a3a3" strokeWidth="1" />
            <line x1="40" y1="20" x2="40" y2="320" stroke="#a3a3a3" strokeWidth="1" />
            <text x="310" y="350" textAnchor="middle" fontSize="10" fill="#525252" fontFamily="Lexend">
              Task Complexity (BPA-weighted) →
            </text>
            <text x="14" y="170" textAnchor="middle" fontSize="10" fill="#525252" fontFamily="Lexend" transform="rotate(-90 14 170)">
              Active Task Count →
            </text>

            {/* Dots */}
            {employees.map((e) => {
              const cx = 40 + (e.x / 100) * 540;
              const cy = 20 + (1 - e.y / 100) * 300;
              const color = e.flagged ? "#dc2626" : e.x < 22 ? "#f59e0b" : DEPT_COLORS[e.dept] || "#10b981";
              return (
                <g key={e.id}>
                  {e.flagged && (
                    <circle cx={cx} cy={cy} r="12" fill="#dc2626" opacity="0.15">
                      <animate attributeName="r" values="8;16;8" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                    </circle>
                  )}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={e.flagged ? 5 : 3}
                    fill={color}
                    opacity={e.flagged ? 1 : 0.7}
                    stroke={e.flagged ? "#7f1d1d" : "none"}
                    strokeWidth={e.flagged ? 1 : 0}
                    onMouseEnter={() => setHover(e)}
                    onMouseLeave={() => setHover(null)}
                    className="cursor-pointer"
                  />
                </g>
              );
            })}
          </svg>

          {hover && (
            <div className="absolute top-4 right-4 bg-neutral-900 text-white rounded-lg px-3 py-2 text-[11px] font-['Lexend:Regular',_sans-serif] shadow-xl pointer-events-none">
              <div className="font-['Lexend:Medium',_sans-serif]">{hover.name}</div>
              <div className="text-neutral-300">
                {hover.dept} · {Math.round(hover.y * 0.4)} tasks · complexity {Math.round(hover.x)}
              </div>
              {hover.flagged && <div className="text-red-400 mt-0.5">⚠ Overburdened — candidate for rebalance</div>}
            </div>
          )}
        </div>

        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertTriangle size={14} className="text-red-600 mt-0.5" />
          <div className="flex-1">
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-red-700">Inequity detected</div>
            <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-red-600">
              2 employees in the top-right outlier zone are carrying 40+ complex tasks. 312 employees in the bottom-left are underutilized. Head to <span className="font-['Lexend:Medium',_sans-serif]">GA Allocation Review</span> to rebalance.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 9.2.B — GA ALLOCATION REVIEW ====================

type TaskMove = {
  id: number;
  task: string;
  complexity: number;
  from: string;
  to: string;
  skillMatch: number;
};

const REBALANCE_MOVES: TaskMove[] = [
  { id: 1, task: "Site Permit Review · Brgy Cogon", complexity: 8, from: "Engr. A. Dela Cruz", to: "Engr. T. Ocaña", skillMatch: 0.94 },
  { id: 2, task: "Drainage Inspection · Linao", complexity: 6, from: "Engr. A. Dela Cruz", to: "Engr. V. Saavedra", skillMatch: 0.89 },
  { id: 3, task: "Road Closure Approval · Real St.", complexity: 5, from: "Engr. A. Dela Cruz", to: "Engr. R. Montes", skillMatch: 0.92 },
  { id: 4, task: "Subdivision Plan Review", complexity: 9, from: "Arch. P. Odal", to: "Arch. K. Sumalpong", skillMatch: 0.87 },
  { id: 5, task: "Zoning Variance · District 2", complexity: 7, from: "Arch. P. Odal", to: "Planner J. Elumba", skillMatch: 0.81 },
  { id: 6, task: "Building Permit · Lot 14-B", complexity: 4, from: "Engr. A. Dela Cruz", to: "Engr. D. Tablate", skillMatch: 0.95 },
  { id: 7, task: "Infra Compliance Audit", complexity: 8, from: "Engr. A. Dela Cruz", to: "Engr. Q. Lagbas", skillMatch: 0.90 },
];

function GAAllocationReview() {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [generation, setGeneration] = useState(0);
  const [fitness, setFitness] = useState(0.42);
  const [confirmed, setConfirmed] = useState(false);

  function runBalancer() {
    setPhase("running");
    setGeneration(0);
    setFitness(0.42);
    setConfirmed(false);
    let gen = 0;
    const timer = setInterval(() => {
      gen += 1;
      setGeneration(gen);
      setFitness((f) => Math.min(0.97, f + (0.97 - f) * 0.18));
      if (gen >= 24) {
        clearInterval(timer);
        setPhase("done");
      }
    }, 80);
  }

  return (
    <div>
      <PageHeader
        title="Genetic Algorithm Adjustments"
        subtitle="Instead of 40 manual drag-and-drops — one click, the algorithm takes over."
        actions={
          <>
            <Btn icon={<Info size={14} />} label="GA Parameters" />
            <Btn
              icon={phase === "running" ? <RefreshCw size={14} className="animate-spin" /> : <Zap size={14} />}
              label={phase === "running" ? "Running..." : phase === "done" ? "Re-run" : "Run Load Balancer"}
              variant="primary"
              onClick={runBalancer}
            />
          </>
        }
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Overburdened Staff" value="2" trend="flagged by fairness graph" tone="bad" />
        <Stat label="Tasks to Redistribute" value="40" trend="complexity-weighted" />
        <Stat label="Eligible Receivers" value="312" trend="matched by skill matrix" tone="good" />
      </div>

      {/* GA Engine */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-5">
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Dna size={16} />
            <span className="font-['Lexend:Medium',_sans-serif] text-[13px]">Genetic Algorithm · Fitness Optimization</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-300">
            <span>pop: 240</span>
            <span>mutation: 0.04</span>
            <span>gen: {generation}/24</span>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-br from-neutral-50 to-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">Fitness Score</span>
            <span className={`text-[13px] font-['Lexend:SemiBold',_sans-serif] ${fitness > 0.85 ? "text-emerald-600" : fitness > 0.6 ? "text-amber-600" : "text-neutral-700"}`}>
              {fitness.toFixed(3)}
            </span>
          </div>
          <div className="h-3 rounded-full bg-neutral-100 overflow-hidden relative">
            <div
              className="h-full transition-all duration-100 bg-gradient-to-r from-red-400 via-amber-400 to-emerald-500"
              style={{ width: `${fitness * 100}%` }}
            />
            {phase === "running" && (
              <div className="absolute inset-0 opacity-30 bg-[linear-gradient(90deg,transparent,white,transparent)] animate-pulse" />
            )}
          </div>

          {/* Genome viz */}
          <div className="mt-4 flex gap-0.5 h-6 rounded overflow-hidden">
            {Array.from({ length: 80 }).map((_, i) => {
              const seed = (i * 17 + generation * 3) % 7;
              const on = phase === "idle" ? seed > 4 : seed > Math.max(1, 5 - generation * 0.2);
              return (
                <div
                  key={i}
                  className={`flex-1 transition-colors duration-150 ${on ? "bg-neutral-900" : "bg-neutral-200"}`}
                />
              );
            })}
          </div>
          <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1 text-center">
            chromosome · {phase === "running" ? "mutating" : phase === "done" ? "converged" : "initial population"}
          </div>
        </div>
      </div>

      {/* Proposed moves */}
      {phase === "done" && (
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Proposed Redistribution</div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                7 of 40 moves shown · skill match ≥ 0.80 · projected fitness 0.94
              </div>
            </div>
            {!confirmed ? (
              <Btn icon={<CheckCircle2 size={14} />} label="Commit Rebalance" variant="primary" onClick={() => setConfirmed(true)} />
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-['Lexend:Medium',_sans-serif]">
                <CheckCircle2 size={12} /> Committed · GA dispatched
              </span>
            )}
          </div>

          <div className="divide-y divide-neutral-100">
            {REBALANCE_MOVES.map((m, idx) => (
              <div
                key={m.id}
                className="px-5 py-3 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
                style={{ animation: `slideIn 0.4s ${idx * 60}ms backwards ease-out` }}
              >
                <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-400 w-6">#{m.id}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{m.task}</div>
                  <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">complexity {m.complexity} · skill match {m.skillMatch.toFixed(2)}</div>
                </div>
                <div className="flex items-center gap-2 text-[11px] font-['Lexend:Regular',_sans-serif]">
                  <span className="line-through text-red-600">{m.from}</span>
                  <ArrowRight size={12} className="text-neutral-400" />
                  <span className="text-emerald-700 font-['Lexend:Medium',_sans-serif]">{m.to}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {phase === "idle" && (
        <div className="bg-white border border-dashed border-neutral-300 rounded-xl p-10 text-center">
          <Gauge size={32} className="mx-auto text-neutral-300 mb-2" />
          <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Balancer idle</div>
          <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">
            Click <span className="font-['Lexend:Medium',_sans-serif]">Run Load Balancer</span> to let the GA redistribute the 40 overburdened tasks.
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(-8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// ==================== VELOCITY OVERVIEW (Workload Velocity Metrics landing) ====================

function WorkloadVelocityOverview() {
  return (
    <div>
      <PageHeader
        title="Workload Velocity Metrics"
        subtitle="Supervising the Genetic Algorithm · ensuring the robot plays fair"
        actions={<Btn icon={<Activity size={14} />} label="Live Feed" />}
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Avg Completion Velocity" value="2.4×" trend="vs baseline" tone="good" />
        <Stat label="GA Allocations / day" value="1,482" trend="automated assignments" />
        <Stat label="Manual Overrides" value="3" trend="last 24h · low" tone="good" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <a
          href="#"
          className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-neutral-700" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Equitable Distribution</span>
          </div>
          <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500 leading-relaxed mb-3">
            Scatter plot of 2,068 employees mapped by tasks × complexity. Spot outliers at a glance.
          </p>
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 flex items-center gap-1 group-hover:gap-2 transition-all">
            Open graph <ArrowRight size={12} />
          </div>
        </a>
        <a
          href="#"
          className="bg-white border border-neutral-200 rounded-xl p-5 hover:border-neutral-900 transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-2 mb-2">
            <Dna size={16} className="text-neutral-700" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">GA Allocation Review</span>
          </div>
          <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-500 leading-relaxed mb-3">
            Run the Genetic Algorithm load balancer. No drag-and-drop — one click redistribution.
          </p>
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 flex items-center gap-1 group-hover:gap-2 transition-all">
            Open engine <ArrowRight size={12} />
          </div>
        </a>
      </div>

      <div className="mt-5 bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-emerald-600" />
          <span className="text-[12px] font-['Lexend:Medium',_sans-serif]">Task Completion Velocity · 30 days</span>
        </div>
        <VelocitySparkline />
      </div>
    </div>
  );
}

function VelocitySparkline() {
  const values = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 30; i++) arr.push(1.4 + Math.sin(i * 0.4) * 0.3 + i * 0.04);
    return arr;
  }, []);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const W = 800;
  const H = 100;
  const dx = W / (values.length - 1);
  const path = values
    .map((v, i) => `${i === 0 ? "M" : "L"} ${i * dx} ${H - ((v - min) / (max - min)) * H}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-24">
      <defs>
        <linearGradient id="vg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${W} ${H} L 0 ${H} Z`} fill="url(#vg)" />
      <path d={path} fill="none" stroke="#10b981" strokeWidth="2" />
    </svg>
  );
}

// ==================== 10.1.A — AUTOMATED ALERTS (HR INBOX) ====================

type Alert = {
  id: number;
  priority: "high" | "medium" | "low";
  employee: string;
  role: string;
  dept: string;
  signal: string;
  detail: string;
  ageMin: number;
  read: boolean;
};

const INITIAL_ALERTS: Alert[] = [
  { id: 1, priority: "high", employee: "Engr. Juan Dela Cruz", role: "Senior Civil Engineer", dept: "Engineering", signal: "Burnout Critical", detail: "Logged 65h this week on Eco-Park project. Task latency ↓ 40% vs baseline.", ageMin: 12, read: false },
  { id: 2, priority: "high", employee: "Arch. Patricia Odal", role: "City Planning Architect", dept: "Planning", signal: "Weeks-since-low-load: 20", detail: "No system-recognized recovery week since Nov 2025. Cognitive markers rising.", ageMin: 47, read: false },
  { id: 3, priority: "high", employee: "Dr. Maria Sabando", role: "Health Officer II", dept: "Health Office", signal: "Post-incident fatigue", detail: "Led 18h dengue outbreak response. Post-event debriefing not yet scheduled.", ageMin: 90, read: false },
  { id: 4, priority: "medium", employee: "Lynnette Bascon", role: "LEDIPO Coordinator", dept: "LEDIPO", signal: "Elevated stress markers", detail: "Stand-up sentiment analysis flags negative tone for 6 consecutive days.", ageMin: 145, read: false },
  { id: 5, priority: "medium", employee: "Carlos Villamor", role: "Treasury Analyst", dept: "Treasury", signal: "Missed lunch windows", detail: "No keyboard-idle gap > 15min in 9 consecutive workdays.", ageMin: 210, read: true },
  { id: 6, priority: "low", employee: "Rey Alcantara", role: "CENRO Inspector", dept: "Environment", signal: "Field fatigue", detail: "GPS logs show 11 barangay visits in single day. Flag for welfare check.", ageMin: 380, read: true },
];

const priorityStyles: Record<string, { bar: string; chip: string; text: string; icon: string }> = {
  high: { bar: "bg-red-500", chip: "bg-red-100 text-red-700", text: "High Priority", icon: "text-red-600" },
  medium: { bar: "bg-amber-400", chip: "bg-amber-100 text-amber-700", text: "Medium", icon: "text-amber-600" },
  low: { bar: "bg-neutral-300", chip: "bg-neutral-100 text-neutral-600", text: "Low", icon: "text-neutral-500" },
};

function AutomatedAlerts() {
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);
  const [expanded, setExpanded] = useState<number | null>(1);
  const unread = alerts.filter((a) => !a.read).length;

  function bulkAck() {
    setAlerts((arr) => arr.map((a) => ({ ...a, read: true })));
  }

  return (
    <div>
      <PageHeader
        title="System-Generated Wellness Flags"
        subtitle="AI-triaged inbox · the action-arm of the Burnout Radar"
        actions={
          <>
            <Btn icon={<Bell size={14} />} label={`${unread} unread`} />
            <Btn icon={<CheckCircle2 size={14} />} label="Bulk Acknowledge" variant="primary" onClick={bulkAck} />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Active Flags" value={String(alerts.length)} trend="system-generated" />
        <Stat label="High Priority" value={String(alerts.filter((a) => a.priority === "high").length)} trend="require action ≤ 4h" tone="bad" />
        <Stat label="Avg Triage Time" value="6.2m" trend="↓ 58% since manual" tone="good" />
        <Stat label="Resolution Rate" value="94%" trend="last 30 days" tone="good" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-neutral-100">
          {alerts.map((a) => {
            const s = priorityStyles[a.priority];
            const isOpen = expanded === a.id;
            return (
              <div key={a.id} className={`${a.read ? "opacity-70" : ""} transition-opacity`}>
                <button
                  onClick={() => setExpanded(isOpen ? null : a.id)}
                  className="w-full flex items-stretch gap-0 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <div className={`w-1 ${s.bar}`} />
                  <div className="flex-1 px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${s.chip}`}>
                        {a.priority === "high" && <Flame size={9} />}
                        {s.text}
                      </span>
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{a.signal}</span>
                      {!a.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                      <span className="ml-auto text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
                        {a.ageMin < 60 ? `${a.ageMin}m ago` : `${Math.floor(a.ageMin / 60)}h ago`}
                      </span>
                    </div>
                    <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                      <span className={s.icon}>[{s.text}]</span> {a.employee}
                      <span className="text-neutral-400 font-['Lexend:Regular',_sans-serif]"> · {a.role} · {a.dept}</span>
                    </div>
                    <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mt-0.5">{a.detail}</div>
                  </div>
                  <div className="flex items-center px-4 text-neutral-300">
                    <ChevronRight size={14} className={`transition-transform ${isOpen ? "rotate-90" : ""}`} />
                  </div>
                </button>
                {isOpen && (
                  <div className="bg-neutral-50 px-5 py-4 border-t border-neutral-100 flex gap-2">
                    <Btn icon={<Pause size={13} />} label="Auto-Reassign 30% Workload" />
                    <Btn icon={<Calendar size={13} />} label="Mandate 2-Day Wellness Leave" />
                    <Btn icon={<Heart size={13} />} label="Schedule 1:1 Debriefing" variant="primary" />
                    <Btn icon={<XCircle size={13} />} label="Dismiss" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==================== 10.1.B — WELLNESS INTERVENTIONS (KANBAN) ====================

type KColumn = "flagged" | "active" | "monitoring" | "resolved";
type KCard = {
  id: string;
  name: string;
  role: string;
  dept: string;
  reason: string;
  col: KColumn;
  daysIn: number;
};

const INITIAL_CARDS: KCard[] = [
  { id: "k1", name: "Engr. J. Dela Cruz", role: "Civil Engineer", dept: "Engineering", reason: "Latency ↓ 40%", col: "flagged", daysIn: 0 },
  { id: "k2", name: "Arch. P. Odal", role: "City Planner", dept: "Planning", reason: "20w no low-load", col: "flagged", daysIn: 0 },
  { id: "k3", name: "Dr. M. Sabando", role: "Health Officer", dept: "Health", reason: "Post-incident burnout", col: "active", daysIn: 2 },
  { id: "k4", name: "L. Bascon", role: "LEDIPO Coord.", dept: "LEDIPO", reason: "Negative sentiment 6d", col: "active", daysIn: 1 },
  { id: "k5", name: "C. Villamor", role: "Treasury Analyst", dept: "Treasury", reason: "No breaks 9d", col: "monitoring", daysIn: 5 },
  { id: "k6", name: "F. Lariosa", role: "Legal Counsel", dept: "Legal", reason: "Overtime spike", col: "monitoring", daysIn: 7 },
  { id: "k7", name: "J. Pomentil", role: "Social Worker", dept: "Social Welfare", reason: "Field fatigue", col: "resolved", daysIn: 14 },
  { id: "k8", name: "R. Alcantara", role: "CENRO Inspector", dept: "Environment", reason: "11 visits / day", col: "resolved", daysIn: 21 },
];

const COLS: { id: KColumn; label: string; tint: string; chip: string }[] = [
  { id: "flagged", label: "Flagged (Review)", tint: "bg-red-50", chip: "bg-red-100 text-red-700" },
  { id: "active", label: "Intervention Active", tint: "bg-amber-50", chip: "bg-amber-100 text-amber-700" },
  { id: "monitoring", label: "Monitoring", tint: "bg-blue-50", chip: "bg-blue-100 text-blue-700" },
  { id: "resolved", label: "Resolved", tint: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-700" },
];

function WellnessInterventions() {
  const [cards, setCards] = useState(INITIAL_CARDS);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ card: KCard; target: KColumn } | null>(null);

  function onDrop(target: KColumn) {
    if (!draggedId) return;
    const card = cards.find((c) => c.id === draggedId);
    if (!card || card.col === target) {
      setDraggedId(null);
      return;
    }
    if (target === "active") {
      setModal({ card, target });
    } else {
      setCards((cs) => cs.map((c) => (c.id === draggedId ? { ...c, col: target, daysIn: 0 } : c)));
    }
    setDraggedId(null);
  }

  function commitIntervention(type: string) {
    if (!modal) return;
    setCards((cs) => cs.map((c) => (c.id === modal.card.id ? { ...c, col: modal.target, daysIn: 0, reason: `${c.reason} · ${type}` } : c)));
    setModal(null);
  }

  return (
    <div>
      <PageHeader
        title="Active Intervention Workflows"
        subtitle="Drag cards between stages · the GA Load Balancer reacts in real-time"
        actions={
          <>
            <Btn icon={<Search size={14} />} label="Filter: All Departments" />
            <Btn icon={<Plus size={14} />} label="New Flag" variant="primary" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3">
        {COLS.map((col) => {
          const items = cards.filter((c) => c.col === col.id);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              className={`${col.tint} rounded-xl p-3 min-h-[520px]`}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${col.chip}`}>
                    {items.length}
                  </span>
                  <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">{col.label}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {items.map((c) => (
                  <div
                    key={c.id}
                    draggable
                    onDragStart={() => setDraggedId(c.id)}
                    onDragEnd={() => setDraggedId(null)}
                    className={`bg-white rounded-lg border border-neutral-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-all ${
                      draggedId === c.id ? "opacity-40" : ""
                    }`}
                  >
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{c.name}</div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
                      {c.role} · {c.dept}
                    </div>
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{c.reason}</span>
                      <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{c.daysIn}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <div className="fixed inset-0 bg-neutral-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-2">
              <Heart size={16} className="text-red-600" />
              <h3 className="text-[16px] font-['Lexend:SemiBold',_sans-serif]">Activate Intervention</h3>
            </div>
            <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-4">
              Select a response for <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{modal.card.name}</span>. The BPA engine will dispatch automatically.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => commitIntervention("30% reassign")}
                className="w-full text-left bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Pause size={13} className="text-neutral-700" />
                  <span className="text-[13px] font-['Lexend:Medium',_sans-serif]">Auto-Reassign 30% Workload</span>
                </div>
                <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                  Signals the GA Load Balancer · redistributes complex tasks to matched peers.
                </div>
              </button>
              <button
                onClick={() => commitIntervention("2d paid leave")}
                className="w-full text-left bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar size={13} className="text-neutral-700" />
                  <span className="text-[13px] font-['Lexend:Medium',_sans-serif]">Mandate 2-Day Paid Wellness Leave</span>
                </div>
                <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                  Overrides schedule · pauses all pending deadlines · notifies team lead.
                </div>
              </button>
              <button
                onClick={() => commitIntervention("1:1 debriefing")}
                className="w-full text-left bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg p-3 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Brain size={13} className="text-neutral-700" />
                  <span className="text-[13px] font-['Lexend:Medium',_sans-serif]">Schedule 1:1 Counselor Debriefing</span>
                </div>
                <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                  Books next available slot with LGU-accredited psychologist.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 10.1.C — STRESS DEBRIEFING ====================

type DebriefEvent = {
  id: number;
  event: string;
  date: string;
  dept: string;
  frontline: number;
  debriefed: number;
  deadline: string;
  status: "pending" | "in-progress" | "complete";
};

const DEBRIEFS: DebriefEvent[] = [
  { id: 1, event: "Typhoon Kristine Response", date: "2026-03-28", dept: "CDRRMO", frontline: 86, debriefed: 42, deadline: "2026-04-28", status: "in-progress" },
  { id: 2, event: "Brgy. Cogon Fire Incident", date: "2026-04-11", dept: "Bureau of Fire", frontline: 24, debriefed: 24, deadline: "2026-05-11", status: "complete" },
  { id: 3, event: "Dengue Outbreak · Dist. 2", date: "2026-04-14", dept: "City Health", frontline: 38, debriefed: 12, deadline: "2026-05-14", status: "in-progress" },
  { id: 4, event: "Flash Flood · Isla Verde", date: "2026-04-18", dept: "CDRRMO", frontline: 52, debriefed: 0, deadline: "2026-05-18", status: "pending" },
  { id: 5, event: "Road Accident Mass Casualty", date: "2026-04-20", dept: "EMS / Traffic", frontline: 18, debriefed: 4, deadline: "2026-05-20", status: "pending" },
];

function StressDebriefing() {
  return (
    <div>
      <PageHeader
        title="Post-Incident Debriefing Tracker"
        subtitle="Mandatory psychological debriefings for frontline responders · no one slips through"
        actions={<Btn icon={<Plus size={14} />} label="Log New Event" variant="primary" />}
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Open Events" value={String(DEBRIEFS.filter((d) => d.status !== "complete").length)} trend="across frontline depts" />
        <Stat label="Frontline Responders" value="218" trend="awaiting debrief" tone="warn" />
        <Stat label="Coverage Rate" value={`${Math.round((DEBRIEFS.reduce((s, d) => s + d.debriefed, 0) / DEBRIEFS.reduce((s, d) => s + d.frontline, 0)) * 100)}%`} trend="of frontline staff" />
        <Stat label="Overdue" value="0" trend="SLA maintained" tone="good" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
          <div className="col-span-4">Critical Event</div>
          <div className="col-span-2">Date · Dept</div>
          <div className="col-span-3">Debriefing Coverage</div>
          <div className="col-span-2">SLA Deadline</div>
          <div className="col-span-1 text-right">Action</div>
        </div>
        {DEBRIEFS.map((d) => {
          const pct = Math.round((d.debriefed / d.frontline) * 100);
          const statusStyle = d.status === "complete" ? "bg-emerald-100 text-emerald-700" : d.status === "in-progress" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700";
          return (
            <div key={d.id} className="grid grid-cols-12 px-5 py-4 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50 transition-colors">
              <div className="col-span-4">
                <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{d.event}</div>
                <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${statusStyle}`}>
                  {d.status}
                </span>
              </div>
              <div className="col-span-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
                {d.date}
                <div className="text-[10px] text-neutral-400">{d.dept}</div>
              </div>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                    <div className={`h-full ${pct === 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 w-20 text-right">
                    {d.debriefed}/{d.frontline}
                  </span>
                </div>
              </div>
              <div className="col-span-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{d.deadline}</div>
              <div className="col-span-1 text-right">
                <button className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 hover:underline cursor-pointer">Schedule</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 10.2.A — TERMINAL LEAVE CREDITS ====================

type LeaveRow = {
  id: number;
  name: string;
  position: string;
  dept: string;
  vac: number;
  sick: number;
  special: number;
  monetizable: boolean;
  lastAutoApproved?: string;
};

const LEAVE_DATA: LeaveRow[] = [
  { id: 1, name: "Arnel Dela Cruz", position: "Sr. Civil Engineer", dept: "Engineering", vac: 28.5, sick: 42.0, special: 3.0, monetizable: true, lastAutoApproved: "2026-04-18" },
  { id: 2, name: "Maria Sabando", position: "Health Officer II", dept: "Health", vac: 12.0, sick: 18.5, special: 0, monetizable: false, lastAutoApproved: "2026-04-12" },
  { id: 3, name: "Patricia Odal", position: "City Planning Arch.", dept: "Planning", vac: 35.0, sick: 38.0, special: 5.0, monetizable: true, lastAutoApproved: "2026-03-28" },
  { id: 4, name: "Juanito Pomentil", position: "Social Worker III", dept: "Social Welfare", vac: 8.5, sick: 22.0, special: 0, monetizable: false },
  { id: 5, name: "Carlos Villamor", position: "Treasury Analyst", dept: "Treasury", vac: 45.0, sick: 51.0, special: 10.0, monetizable: true, lastAutoApproved: "2026-04-02" },
  { id: 6, name: "Rey Alcantara", position: "CENRO Inspector", dept: "Environment", vac: 15.0, sick: 20.5, special: 2.0, monetizable: false, lastAutoApproved: "2026-04-15" },
  { id: 7, name: "Lynnette Bascon", position: "LEDIPO Coord.", dept: "LEDIPO", vac: 22.0, sick: 30.0, special: 0, monetizable: true },
  { id: 8, name: "Francis Lariosa", position: "Legal Counsel II", dept: "Legal", vac: 9.5, sick: 14.0, special: 0, monetizable: false, lastAutoApproved: "2026-04-10" },
];

function TerminalLeaveCredits() {
  const [query, setQuery] = useState("");
  const filtered = LEAVE_DATA.filter((r) => r.name.toLowerCase().includes(query.toLowerCase()) || r.dept.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <PageHeader
        title="City-Wide Leave Balances"
        subtitle="Mobile auto-approval ledger · zero paperwork · BPA-audited"
        actions={
          <>
            <Btn icon={<Download size={14} />} label="Export: COA Audit Report" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total Employees" value="2,068" trend="active leave credits" />
        <Stat label="Auto-Approvals · 30d" value="1,284" trend="zero HR touch" tone="good" />
        <Stat label="Manual Reviews" value="6" trend="flagged by BPA" tone="warn" />
        <Stat label="Avg Approval Time" value="4.2s" trend="from mobile submit" tone="good" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-neutral-200 flex items-center gap-3">
          <Search size={14} className="text-neutral-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search employee or department..."
            className="flex-1 text-[13px] font-['Lexend:Regular',_sans-serif] bg-transparent outline-none placeholder:text-neutral-400"
          />
          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{filtered.length} of {LEAVE_DATA.length}</span>
        </div>
        <div className="grid grid-cols-12 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
          <div className="col-span-3">Employee</div>
          <div className="col-span-2">Department</div>
          <div className="col-span-1 text-right">Vacation</div>
          <div className="col-span-1 text-right">Sick</div>
          <div className="col-span-1 text-right">Special</div>
          <div className="col-span-2">Last Auto-Approved</div>
          <div className="col-span-2 text-right">Status</div>
        </div>
        {filtered.map((r) => (
          <div key={r.id} className="grid grid-cols-12 px-5 py-3 border-b border-neutral-100 last:border-0 items-center text-[12px] font-['Lexend:Regular',_sans-serif] hover:bg-neutral-50 transition-colors">
            <div className="col-span-3">
              <div className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{r.name}</div>
              <div className="text-[10px] text-neutral-400">{r.position}</div>
            </div>
            <div className="col-span-2 text-neutral-600">{r.dept}</div>
            <div className="col-span-1 text-right font-['Lexend:Medium',_sans-serif] tabular-nums">{r.vac.toFixed(1)}</div>
            <div className="col-span-1 text-right font-['Lexend:Medium',_sans-serif] tabular-nums">{r.sick.toFixed(1)}</div>
            <div className="col-span-1 text-right font-['Lexend:Medium',_sans-serif] tabular-nums">{r.special.toFixed(1)}</div>
            <div className="col-span-2 text-neutral-500">{r.lastAutoApproved || "—"}</div>
            <div className="col-span-2 text-right">
              {r.monetizable ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-blue-100 text-blue-700 font-['Lexend:Medium',_sans-serif]">
                  <DollarSign size={9} /> Monetizable
                </span>
              ) : (
                <span className="text-[10px] text-neutral-400">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 10.2.B — MONETIZATION ====================

type MonetRequest = {
  id: number;
  employee: string;
  salaryGrade: string;
  monthlyRate: number;
  daysConverted: number;
  computed: number;
  status: "computed" | "mayor-review" | "signed";
  submitted: string;
};

const MONET_REQUESTS: MonetRequest[] = [
  { id: 1, employee: "Arnel Dela Cruz", salaryGrade: "SG-19 · Step 4", monthlyRate: 58420, daysConverted: 15, computed: 58420 * 15 / 22, status: "mayor-review", submitted: "2026-04-19" },
  { id: 2, employee: "Patricia Odal", salaryGrade: "SG-22 · Step 6", monthlyRate: 72648, daysConverted: 20, computed: 72648 * 20 / 22, status: "signed", submitted: "2026-04-11" },
  { id: 3, employee: "Carlos Villamor", salaryGrade: "SG-15 · Step 2", monthlyRate: 41508, daysConverted: 10, computed: 41508 * 10 / 22, status: "computed", submitted: "2026-04-20" },
  { id: 4, employee: "Lynnette Bascon", salaryGrade: "SG-18 · Step 3", monthlyRate: 54751, daysConverted: 12, computed: 54751 * 12 / 22, status: "mayor-review", submitted: "2026-04-17" },
];

function Monetization() {
  const peso = (n: number) => `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 2 })}`;
  return (
    <div>
      <PageHeader
        title="Leave Monetization Pipeline"
        subtitle="Auto-computed · routed to Mayor for digital signature · no spreadsheets"
        actions={<Btn icon={<Download size={14} />} label="Export Pipeline" />}
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="In Pipeline" value={String(MONET_REQUESTS.length)} trend="across all grades" />
        <Stat label="Awaiting Signature" value={String(MONET_REQUESTS.filter((r) => r.status === "mayor-review").length)} trend="at Mayor's desk" tone="warn" />
        <Stat label="Total Disbursement" value={peso(MONET_REQUESTS.reduce((s, r) => s + r.computed, 0))} trend="this batch" />
        <Stat label="Avg Processing" value="2.8d" trend="submit → signed" tone="good" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {[
          { key: "computed", label: "Auto-Computed", icon: <Zap size={12} />, tint: "bg-blue-50" },
          { key: "mayor-review", label: "Mayor Review", icon: <User size={12} />, tint: "bg-amber-50" },
          { key: "signed", label: "Digitally Signed", icon: <CheckCircle2 size={12} />, tint: "bg-emerald-50" },
        ].map((stage) => {
          const items = MONET_REQUESTS.filter((r) => r.status === stage.key);
          return (
            <div key={stage.key} className={`${stage.tint} rounded-xl p-3 col-span-1`}>
              <div className="flex items-center gap-2 mb-3 px-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">
                {stage.icon} {stage.label} · {items.length}
              </div>
              <div className="space-y-2">
                {items.map((r) => (
                  <div key={r.id} className="bg-white border border-neutral-200 rounded-lg p-3">
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{r.employee}</div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{r.salaryGrade}</div>
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-end justify-between">
                      <div>
                        <div className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">{r.daysConverted} days</div>
                        <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(Math.round(r.computed))}</div>
                      </div>
                      {r.status === "signed" && <Lock size={12} className="text-emerald-600" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        <div className="bg-neutral-900 rounded-xl p-4 text-white col-span-1">
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] mb-3">
            <Fingerprint size={12} /> Mayor Digital Signing Panel
          </div>
          <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-300 mb-4">
            {MONET_REQUESTS.filter((r) => r.status === "mayor-review").length} requests pending. Batch-sign with PKI credential.
          </div>
          <div className="bg-neutral-800 rounded-lg p-3 font-mono text-[10px] text-emerald-400 mb-3">
            sig::0x4f8a...c72e<br />
            batch::LGU-ORMOC-MONET-2026-042<br />
            timestamp::{new Date().toISOString()}
          </div>
          <button className="w-full py-2 bg-white text-neutral-900 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer hover:bg-neutral-100">
            Sign & Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== 10.2.C — OVERTIME CLAIMS (GPS VALIDATION) ====================

type OTClaim = {
  id: number;
  employee: string;
  dept: string;
  date: string;
  hoursClaimed: number;
  gpsLocations: { time: string; location: string; valid: boolean }[];
  tasksCompleted: { time: string; task: string }[];
  verdict: "clean" | "suspicious" | "invalid";
};

const OT_CLAIMS: OTClaim[] = [
  {
    id: 1,
    employee: "Arnel Dela Cruz",
    dept: "Engineering",
    date: "2026-04-19",
    hoursClaimed: 4,
    gpsLocations: [
      { time: "18:12", location: "City Hall, Engineering Office", valid: true },
      { time: "19:45", location: "City Hall, Engineering Office", valid: true },
      { time: "21:30", location: "City Hall, Engineering Office", valid: true },
    ],
    tasksCompleted: [
      { time: "18:40", task: "Site Permit #4482 approved" },
      { time: "19:22", task: "Drainage report finalized" },
      { time: "20:55", task: "3 inspection logs filed" },
    ],
    verdict: "clean",
  },
  {
    id: 2,
    employee: "Juanito Pomentil",
    dept: "Social Welfare",
    date: "2026-04-18",
    hoursClaimed: 4,
    gpsLocations: [
      { time: "18:05", location: "Brgy. Cogon field", valid: true },
      { time: "19:30", location: "Home · District 2", valid: false },
      { time: "21:15", location: "Home · District 2", valid: false },
    ],
    tasksCompleted: [
      { time: "18:22", task: "1 case note submitted" },
    ],
    verdict: "invalid",
  },
  {
    id: 3,
    employee: "Lynnette Bascon",
    dept: "LEDIPO",
    date: "2026-04-17",
    hoursClaimed: 3,
    gpsLocations: [
      { time: "17:45", location: "City Hall, LEDIPO Office", valid: true },
      { time: "19:10", location: "City Hall, LEDIPO Office", valid: true },
    ],
    tasksCompleted: [
      { time: "18:02", task: "Investor brief drafted" },
    ],
    verdict: "suspicious",
  },
];

const verdictStyle: Record<string, { ring: string; chip: string; label: string; icon: React.ReactNode }> = {
  clean: { ring: "border-emerald-200 bg-emerald-50/40", chip: "bg-emerald-100 text-emerald-700", label: "Clean — GPS & tasks match", icon: <CheckCircle2 size={12} /> },
  suspicious: { ring: "border-amber-200 bg-amber-50/40", chip: "bg-amber-100 text-amber-700", label: "Suspicious — partial task proof", icon: <AlertTriangle size={12} /> },
  invalid: { ring: "border-red-300 bg-red-50/40", chip: "bg-red-100 text-red-700", label: "Invalid — GPS off-site, no tasks", icon: <XCircle size={12} /> },
};

function OvertimeClaims() {
  const [selected, setSelected] = useState<OTClaim>(OT_CLAIMS[1]);
  return (
    <div>
      <PageHeader
        title="Overtime Claim Validation"
        subtitle="Split-screen proof — the system checks GPS and task completion so HR doesn't have to guess"
        actions={<Btn icon={<FileCheck size={14} />} label="Export Approved" />}
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <Stat label="Submitted · 7d" value="142" trend="claims received" />
        <Stat label="Auto-Cleared" value="118" trend="GPS + task matched" tone="good" />
        <Stat label="Flagged Red" value="9" trend="requires HR review" tone="bad" />
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-4">
        {/* Claim queue */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            Validation Queue
          </div>
          {OT_CLAIMS.map((c) => {
            const v = verdictStyle[c.verdict];
            const active = selected.id === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
              >
                <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${active ? "text-white" : "text-neutral-900"}`}>{c.employee}</div>
                <div className={`text-[10px] font-['Lexend:Regular',_sans-serif] ${active ? "text-neutral-300" : "text-neutral-500"} mt-0.5`}>
                  {c.date} · {c.hoursClaimed}h claimed
                </div>
                <span className={`inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-['Lexend:Medium',_sans-serif] ${v.chip}`}>
                  {v.icon} {c.verdict}
                </span>
              </button>
            );
          })}
        </div>

        {/* Split-screen proof */}
        <div className={`rounded-xl border-2 ${verdictStyle[selected.verdict].ring} overflow-hidden`}>
          <div className="bg-white px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
                Claim #{selected.id.toString().padStart(5, "0")}
              </div>
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
                {selected.employee} · {selected.dept}
              </div>
            </div>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] ${verdictStyle[selected.verdict].chip}`}>
              {verdictStyle[selected.verdict].icon} {verdictStyle[selected.verdict].label}
            </span>
          </div>

          <div className="grid grid-cols-2">
            {/* Left: Employee claim */}
            <div className="bg-white p-5 border-r border-neutral-200">
              <div className="flex items-center gap-2 mb-3">
                <User size={14} className="text-neutral-500" />
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Employee Claim</span>
              </div>
              <div className="space-y-3 text-[12px] font-['Lexend:Regular',_sans-serif]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Date</div>
                  <div className="text-neutral-900">{selected.date}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Hours claimed</div>
                  <div className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selected.hoursClaimed}h</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Reason</div>
                  <div className="text-neutral-700">Urgent project deliverables · backlog processing</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Self-attested window</div>
                  <div className="text-neutral-700">18:00 — 22:00</div>
                </div>
              </div>
            </div>

            {/* Right: System proof */}
            <div className="bg-neutral-900 text-white p-5">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={14} className="text-emerald-400" />
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif]">System Proof</span>
              </div>
              <div className="mb-4">
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1">
                  <MapPin size={10} /> Mobile GPS Log
                </div>
                <div className="space-y-1.5 font-mono text-[11px]">
                  {selected.gpsLocations.map((g, i) => (
                    <div key={i} className={`flex items-center gap-2 ${g.valid ? "text-emerald-400" : "text-red-400"}`}>
                      <span className="text-neutral-500">[{g.time}]</span>
                      <span>{g.valid ? "✓" : "✗"}</span>
                      <span>{g.location}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-2 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Task Completion Timestamps
                </div>
                {selected.tasksCompleted.length === 0 ? (
                  <div className="text-red-400 text-[11px] font-mono">No tasks moved to "Done" during window.</div>
                ) : (
                  <div className="space-y-1.5 font-mono text-[11px] text-emerald-400">
                    {selected.tasksCompleted.map((t, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-neutral-500">[{t.time}]</span>
                        <span className="flex-1">{t.task}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white px-5 py-3 border-t border-neutral-200 flex gap-2 justify-end">
            <Btn icon={<XCircle size={13} />} label="Reject Claim" variant="danger" />
            <Btn icon={<CheckCircle2 size={13} />} label="Approve" variant="primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 10.2.D — PAYROLL PRE-AUDIT ====================

type AuditCheck = { label: string; status: "pass" | "fail" | "pending"; detail: string };

const AUDIT_CHECKS: AuditCheck[] = [
  { label: "Attendance logs reconciled", status: "pass", detail: "2,068 employees · 44,620 records · zero gaps" },
  { label: "Leave credits deducted correctly", status: "pass", detail: "124 leave events processed · BPA-verified" },
  { label: "Overtime claims validated", status: "pass", detail: "118 cleared · 9 flagged · 15 rejected" },
  { label: "Tax withholding computed", status: "pass", detail: "BIR schedule 2026-Q2 applied" },
  { label: "GSIS / PhilHealth contributions", status: "pass", detail: "Employer match reconciled" },
  { label: "Night differential cross-check", status: "pending", detail: "Awaiting Traffic Ops schedule sync" },
  { label: "Hazard pay allocation", status: "pass", detail: "CDRRMO · Health · Fire confirmed" },
  { label: "Loan deductions applied", status: "pass", detail: "GSIS · Pag-IBIG · salary loans matched" },
];

function PayrollPreAudit() {
  const passes = AUDIT_CHECKS.filter((c) => c.status === "pass").length;
  const fails = AUDIT_CHECKS.filter((c) => c.status === "fail").length;
  const pending = AUDIT_CHECKS.filter((c) => c.status === "pending").length;
  const canCommit = fails === 0 && pending === 0;

  return (
    <div>
      <PageHeader
        title="Payroll Pre-Audit · April 2026 · Cycle 2"
        subtitle="Final gate before money is released · cryptographically hashed and forwarded to Financial Disbursement"
        actions={
          <>
            <Btn icon={<Download size={14} />} label="Audit Trail" />
            <Btn
              icon={<Fingerprint size={14} />}
              label={canCommit ? "Generate Hash & Forward" : "Awaiting resolution"}
              variant={canCommit ? "primary" : "secondary"}
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Gross Payroll" value="₱ 142.8M" trend="2,068 employees" />
        <Stat label="Checks Passed" value={`${passes}/${AUDIT_CHECKS.length}`} trend="cross-referenced" tone={passes === AUDIT_CHECKS.length ? "good" : "warn"} />
        <Stat label="Pending" value={String(pending)} trend="awaiting sync" tone="warn" />
        <Stat label="Failures" value={String(fails)} trend="blocks disbursement" tone={fails > 0 ? "bad" : "good"} />
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center gap-2">
            <FileCheck size={14} className="text-neutral-700" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Reconciliation Checklist</span>
          </div>
          {AUDIT_CHECKS.map((c, i) => {
            const icon =
              c.status === "pass" ? <CheckCircle2 size={14} className="text-emerald-600" /> :
              c.status === "fail" ? <XCircle size={14} className="text-red-600" /> :
              <Clock size={14} className="text-amber-600" />;
            return (
              <div key={i} className="px-5 py-3 border-b border-neutral-100 last:border-0 flex items-start gap-3 hover:bg-neutral-50 transition-colors">
                <div className="mt-0.5">{icon}</div>
                <div className="flex-1">
                  <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{c.label}</div>
                  <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{c.detail}</div>
                </div>
                <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider ${
                  c.status === "pass" ? "text-emerald-600" : c.status === "fail" ? "text-red-600" : "text-amber-600"
                }`}>
                  {c.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Hash preview */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
            <Fingerprint size={14} className="text-emerald-400" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Cryptographic Seal</span>
            {canCommit && <span className="ml-auto text-[10px] text-emerald-400 font-['Lexend:Medium',_sans-serif]">READY</span>}
          </div>
          <div className="p-5">
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">SHA-256</div>
            <div className="font-mono text-[10px] text-emerald-400 break-all leading-relaxed bg-neutral-950 border border-neutral-800 rounded-lg p-3 mb-4">
              {canCommit ? "8f4a9c2e7b1d3e5f0a6c8d1e4b7a9f2c3d5e8b1a4c7d9e2f5a8b1c4d7e0f3a6b" : "— pending reconciliation —"}
            </div>
            <div className="space-y-2 text-[11px] font-['Lexend:Regular',_sans-serif]">
              <div className="flex justify-between"><span className="text-neutral-400">Cycle</span><span>2026-04-C2</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Employees</span><span className="tabular-nums">2,068</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Gross</span><span className="tabular-nums">₱142,840,218.00</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Net</span><span className="tabular-nums">₱118,922,415.40</span></div>
              <div className="flex justify-between"><span className="text-neutral-400">Block height</span><span className="tabular-nums">#482,917</span></div>
            </div>
            <button
              disabled={!canCommit}
              className={`w-full mt-4 py-2.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-colors ${
                canCommit ? "bg-emerald-500 text-white hover:bg-emerald-400 cursor-pointer" : "bg-neutral-800 text-neutral-500 cursor-not-allowed"
              }`}
            >
              {canCommit ? "Seal & Forward to Disbursement" : "Resolve pending items first"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 11.1.A — CSC APPRAISALS (IPCR/OPCR) ====================

type IPCRTarget = {
  id: number;
  mfo: string;
  output: string;
  target: string;
  actualQ: number;
  actualE: number;
  actualT: number;
  workflowsCited: number;
  evidenceHash: string;
};

type AppraisalEmployee = {
  id: string;
  name: string;
  position: string;
  dept: string;
  rating: number;
  label: string;
  period: string;
  workflows: number;
  slaMet: number;
  revisions: number;
  aheadOfSchedule: number;
  targets: IPCRTarget[];
};

const APPRAISALS: AppraisalEmployee[] = [
  {
    id: "emp-001",
    name: "Engr. Arnel Dela Cruz",
    position: "Sr. Civil Engineer · SG-19",
    dept: "Engineering",
    rating: 4.5,
    label: "Very Satisfactory",
    period: "Jan–Jun 2026",
    workflows: 142,
    slaMet: 94,
    revisions: 2,
    aheadOfSchedule: 38,
    targets: [
      { id: 1, mfo: "MFO 1 · Infrastructure", output: "Site permit reviews", target: "120 reviews, ≤5d each", actualQ: 5, actualE: 4, actualT: 5, workflowsCited: 142, evidenceHash: "0x4f8a...c72e" },
      { id: 2, mfo: "MFO 1 · Infrastructure", output: "Drainage inspections", target: "48 inspections, ≤7d", actualQ: 5, actualE: 5, actualT: 4, workflowsCited: 51, evidenceHash: "0x9a12...bd8c" },
      { id: 3, mfo: "MFO 2 · Coordination", output: "Barangay compliance audits", target: "24 audits, monthly", actualQ: 4, actualE: 4, actualT: 5, workflowsCited: 26, evidenceHash: "0x27fe...4a09" },
      { id: 4, mfo: "MFO 3 · Capacity Building", output: "Junior engineer mentoring logs", target: "Weekly standups, 6mo", actualQ: 4, actualE: 5, actualT: 5, workflowsCited: 24, evidenceHash: "0x881d...6f02" },
    ],
  },
  {
    id: "emp-002",
    name: "Arch. Patricia Odal",
    position: "City Planning Architect · SG-22",
    dept: "Planning",
    rating: 5.0,
    label: "Outstanding",
    period: "Jan–Jun 2026",
    workflows: 187,
    slaMet: 98,
    revisions: 1,
    aheadOfSchedule: 62,
    targets: [
      { id: 1, mfo: "MFO 1 · Zoning", output: "Zoning clearance reviews", target: "80 reviews, ≤10d", actualQ: 5, actualE: 5, actualT: 5, workflowsCited: 94, evidenceHash: "0x3e7f...0d41" },
      { id: 2, mfo: "MFO 2 · Planning", output: "Subdivision plan approvals", target: "12 plans, quality ≥4.0", actualQ: 5, actualE: 5, actualT: 5, workflowsCited: 14, evidenceHash: "0xab33...1779" },
    ],
  },
  {
    id: "emp-003",
    name: "Lynnette Bascon",
    position: "LEDIPO Coordinator · SG-18",
    dept: "LEDIPO",
    rating: 3.2,
    label: "Satisfactory",
    period: "Jan–Jun 2026",
    workflows: 68,
    slaMet: 72,
    revisions: 14,
    aheadOfSchedule: 8,
    targets: [
      { id: 1, mfo: "MFO 1 · Investment", output: "Investor briefs", target: "20 briefs, ≤14d", actualQ: 3, actualE: 3, actualT: 4, workflowsCited: 21, evidenceHash: "0x51c0...ee22" },
      { id: 2, mfo: "MFO 2 · Promotion", output: "Tourism campaign coordination", target: "8 campaigns", actualQ: 3, actualE: 3, actualT: 3, workflowsCited: 8, evidenceHash: "0x7722...9e51" },
    ],
  },
  {
    id: "emp-004",
    name: "Juanito Pomentil",
    position: "Social Worker III · SG-15",
    dept: "Social Welfare",
    rating: 2.4,
    label: "Unsatisfactory",
    period: "Jan–Jun 2026",
    workflows: 34,
    slaMet: 48,
    revisions: 22,
    aheadOfSchedule: 2,
    targets: [
      { id: 1, mfo: "MFO 1 · Welfare", output: "Case assessments", target: "60 cases, ≤5d", actualQ: 2, actualE: 2, actualT: 3, workflowsCited: 34, evidenceHash: "0xcc29...01a4" },
    ],
  },
];

const ratingTone = (r: number) =>
  r >= 4.5 ? { chip: "bg-emerald-100 text-emerald-700", text: "text-emerald-600", ring: "border-emerald-300" } :
  r >= 3.5 ? { chip: "bg-blue-100 text-blue-700", text: "text-blue-600", ring: "border-blue-200" } :
  r >= 2.5 ? { chip: "bg-amber-100 text-amber-700", text: "text-amber-600", ring: "border-amber-200" } :
  { chip: "bg-red-100 text-red-700", text: "text-red-600", ring: "border-red-300" };

function CSCAppraisals() {
  const [selected, setSelected] = useState(APPRAISALS[0]);
  const [target, setTarget] = useState<IPCRTarget | null>(APPRAISALS[0].targets[0]);
  const [generating, setGenerating] = useState(false);

  function pickEmployee(e: AppraisalEmployee) {
    setSelected(e);
    setTarget(e.targets[0]);
  }

  function computeAvg(t: IPCRTarget) {
    return (t.actualQ + t.actualE + t.actualT) / 3;
  }

  return (
    <div>
      <PageHeader
        title="Strategic Performance Management System"
        subtitle="Semi-annual IPCR · evidence-anchored · no more last-minute Excel sheets"
        actions={
          <>
            <Btn icon={<BookOpen size={14} />} label="CSC MC No. 6, s.2012" />
            <Btn
              icon={generating ? <RefreshCw size={14} className="animate-spin" /> : <Scale size={14} />}
              label={generating ? "Generating..." : "Generate Semi-Annual Ratings"}
              variant="primary"
              onClick={() => {
                setGenerating(true);
                setTimeout(() => setGenerating(false), 1400);
              }}
            />
          </>
        }
      />

      <div className="grid grid-cols-[280px_1fr_340px] gap-4">
        {/* Left: Employee roster */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-fit sticky top-0">
          <div className="px-4 py-3 border-b border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            Roster · {APPRAISALS.length} employees
          </div>
          {APPRAISALS.map((e) => {
            const t = ratingTone(e.rating);
            const active = selected.id === e.id;
            return (
              <button
                key={e.id}
                onClick={() => pickEmployee(e)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
              >
                <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${active ? "text-white" : "text-neutral-900"}`}>{e.name}</div>
                <div className={`text-[10px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                  {e.dept}
                </div>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-['Lexend:Medium',_sans-serif] ${t.chip}`}>
                    {e.rating.toFixed(1)}
                  </span>
                  <span className={`text-[10px] font-['Lexend:Regular',_sans-serif] ${active ? "text-neutral-300" : "text-neutral-500"}`}>{e.label}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Center: Official IPCR form */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="border-b border-neutral-200 px-6 py-4 bg-[linear-gradient(135deg,#fafaf9_0%,#f5f5f4_100%)]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-[0.15em] text-neutral-500">
                Republic of the Philippines · Civil Service Commission
              </span>
              <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">CSC Form No. IPCR</span>
            </div>
            <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              Individual Performance Commitment and Review
            </div>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
              {selected.period} · Local Government Unit · City of Ormoc
            </div>
          </div>

          <div className="px-6 py-4 grid grid-cols-2 gap-x-8 gap-y-2 border-b border-neutral-200">
            <Field label="Ratee" value={selected.name} />
            <Field label="Position" value={selected.position} />
            <Field label="Office" value={selected.dept} />
            <Field label="Rating Period" value={selected.period} />
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-12 gap-2 px-2 py-2 bg-neutral-900 text-white rounded-t-md text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider">
              <div className="col-span-3">MFO · Output</div>
              <div className="col-span-3">Success Indicator</div>
              <div className="col-span-1 text-center">Q</div>
              <div className="col-span-1 text-center">E</div>
              <div className="col-span-1 text-center">T</div>
              <div className="col-span-1 text-center">Avg</div>
              <div className="col-span-2 text-right">Evidence</div>
            </div>
            {selected.targets.map((t) => {
              const avg = computeAvg(t);
              const tone = ratingTone(avg);
              const isActive = target?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTarget(t)}
                  className={`w-full grid grid-cols-12 gap-2 px-2 py-3 border-b border-neutral-100 items-center text-[11px] font-['Lexend:Regular',_sans-serif] text-left cursor-pointer transition-colors ${
                    isActive ? "bg-blue-50" : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="col-span-3">
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">{t.mfo}</div>
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{t.output}</div>
                  </div>
                  <div className="col-span-3 text-neutral-600">{t.target}</div>
                  <RatingCell value={t.actualQ} />
                  <RatingCell value={t.actualE} />
                  <RatingCell value={t.actualT} />
                  <div className={`col-span-1 text-center font-['Lexend:SemiBold',_sans-serif] ${tone.text}`}>{avg.toFixed(1)}</div>
                  <div className="col-span-2 text-right font-mono text-[10px] text-neutral-500 flex items-center justify-end gap-1">
                    <Link2 size={9} />
                    {t.evidenceHash}
                  </div>
                </button>
              );
            })}

            <div className="mt-4 p-4 rounded-md bg-gradient-to-r from-neutral-50 to-white border-l-4 border-neutral-900">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">Final Adjectival Rating</span>
                <Award size={14} className={ratingTone(selected.rating).text} />
              </div>
              <div className="flex items-baseline gap-3">
                <span className={`text-[40px] font-['Lexend:SemiBold',_sans-serif] leading-none ${ratingTone(selected.rating).text}`}>{selected.rating.toFixed(1)}</span>
                <span className={`text-[14px] font-['Lexend:Medium',_sans-serif] ${ratingTone(selected.rating).text}`}>{selected.label}</span>
              </div>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-neutral-200 flex items-center justify-between text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            <span>Digitally signed · Ratee + Rater + Approver</span>
            <span className="font-mono">ipcr::{selected.id}::{selected.period.replace(/\s+/g, "")}</span>
          </div>
        </div>

        {/* Right: AI Justification */}
        <div className={`rounded-xl border-2 ${ratingTone(selected.rating).ring} bg-gradient-to-br from-white to-neutral-50 overflow-hidden h-fit`}>
          <div className="px-5 py-4 border-b border-neutral-200 bg-white">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-neutral-700" />
              <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">AI Justification</span>
            </div>
            <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">
              {target ? `Target · ${target.output}` : "Select a row to see evidence"}
            </div>
          </div>

          {target && (
            <div className="p-5">
              <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 leading-relaxed mb-4">
                Rating generated based on <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{target.workflowsCited} completed workflows</span>. <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{selected.slaMet}%</span> met SLA timelines. Quality score: only <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{selected.revisions}%</span> of submitted drafts were returned for revision.
              </p>

              <div className="space-y-2.5 mb-4">
                <MetricBar label="SLA Adherence" value={selected.slaMet} tone="good" />
                <MetricBar label="First-Pass Quality" value={100 - selected.revisions} tone="good" />
                <MetricBar label="Ahead of Schedule" value={selected.aheadOfSchedule} tone="neutral" />
              </div>

              <div className="rounded-lg bg-neutral-900 text-white p-3 mb-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">Evidence chain</span>
                  <Hash size={10} className="text-emerald-400" />
                </div>
                <div className="font-mono text-[10px] text-emerald-400 break-all">{target.evidenceHash}</div>
                <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1">
                  Merkle-verified · {target.workflowsCited} workflows anchored
                </div>
              </div>

              <button className="w-full py-2 bg-white border border-neutral-200 rounded-lg text-[11px] font-['Lexend:Medium',_sans-serif] hover:bg-neutral-50 cursor-pointer flex items-center justify-center gap-1">
                Open Evidence Locker <ExternalLink size={11} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[9px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{value}</div>
    </div>
  );
}

function RatingCell({ value }: { value: number }) {
  const color = value >= 5 ? "text-emerald-600" : value >= 4 ? "text-blue-600" : value >= 3 ? "text-amber-600" : "text-red-600";
  return <div className={`col-span-1 text-center font-['Lexend:SemiBold',_sans-serif] ${color}`}>{value}</div>;
}

function MetricBar({ label, value, tone }: { label: string; value: number; tone: "good" | "neutral" | "bad" }) {
  const barColor = tone === "good" ? "bg-emerald-500" : tone === "bad" ? "bg-red-500" : "bg-blue-500";
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-0.5">
        <span>{label}</span>
        <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{value}%</span>
      </div>
      <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full ${barColor}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

// ==================== 11.1.B — TASK COMPLETION RATES (BELL CURVE) ====================

const BELL_BUCKETS = [
  { rating: 1, label: "Poor", count: 42, color: "#dc2626", flag: "Mandatory retraining" },
  { rating: 2, label: "Unsatisfactory", count: 148, color: "#f97316", flag: "Performance plan" },
  { rating: 3, label: "Satisfactory", count: 1204, color: "#10b981", flag: "Baseline" },
  { rating: 4, label: "Very Satisfactory", count: 548, color: "#3b82f6", flag: "Merit increase eligible" },
  { rating: 5, label: "Outstanding", count: 126, color: "#8b5cf6", flag: "Promotion fast-track" },
];

function TaskCompletionRates() {
  const [period, setPeriod] = useState<"q1" | "q2" | "compare">("q2");
  const total = BELL_BUCKETS.reduce((s, b) => s + b.count, 0);
  const maxCount = Math.max(...BELL_BUCKETS.map((b) => b.count));

  const W = 800;
  const H = 260;
  const pad = 50;

  // Smooth bell curve path
  const curvePoints = useMemo(() => {
    const mean = 3;
    const sd = 0.9;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= 100; i++) {
      const r = 1 + (i / 100) * 4;
      const y = Math.exp(-0.5 * Math.pow((r - mean) / sd, 2));
      pts.push({ x: r, y });
    }
    const maxY = Math.max(...pts.map((p) => p.y));
    return pts.map((p) => ({
      px: pad + ((p.x - 1) / 4) * (W - pad * 2),
      py: H - pad - (p.y / maxY) * (H - pad * 2),
    }));
  }, []);

  const curveD = curvePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.px} ${p.py}`).join(" ");

  return (
    <div>
      <PageHeader
        title="Departmental Velocity · Bell Curve"
        subtitle="2,068 employees distributed by evidence-based rating · outliers auto-flagged"
        actions={
          <div className="flex items-center bg-white border border-neutral-200 rounded-lg p-0.5">
            {(["q1", "q2", "compare"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${
                  period === p ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {p === "compare" ? "Q1 vs Q2" : p.toUpperCase()}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total Tasks Assigned" value="38,412" trend={period === "q2" ? "Q2 2026" : "Q1 2026"} />
        <Stat label="Ahead of Schedule" value="14,082" trend="36.7% of assignments" tone="good" />
        <Stat label="SLA Breaches" value="1,284" trend="3.3% overdue" tone="warn" />
        <Stat label="Avg Cycle Time" value="4.8d" trend="↓ 22% vs Q1" tone="good" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6 mb-5">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[280px]">
          <defs>
            <linearGradient id="bellFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>
          {/* Baseline */}
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#e5e5e5" />

          {/* Area */}
          <path d={`${curveD} L ${W - pad} ${H - pad} L ${pad} ${H - pad} Z`} fill="url(#bellFill)" />
          <path d={curveD} fill="none" stroke="#3b82f6" strokeWidth="1.5" />

          {/* Bars */}
          {BELL_BUCKETS.map((b, i) => {
            const barW = (W - pad * 2) / BELL_BUCKETS.length - 12;
            const cx = pad + (i / (BELL_BUCKETS.length - 1)) * (W - pad * 2);
            const bx = cx - barW / 2;
            const barH = (b.count / maxCount) * (H - pad * 2);
            return (
              <g key={b.rating}>
                <rect x={bx} y={H - pad - barH} width={barW} height={barH} fill={b.color} opacity="0.85" rx="2" />
                <text x={cx} y={H - pad - barH - 6} textAnchor="middle" fontSize="11" fontFamily="Lexend" fill={b.color} fontWeight="600">
                  {b.count}
                </text>
                <text x={cx} y={H - pad + 16} textAnchor="middle" fontSize="11" fontFamily="Lexend" fill="#525252">
                  {b.rating} · {b.label}
                </text>
                <text x={cx} y={H - pad + 30} textAnchor="middle" fontSize="9" fontFamily="Lexend" fill="#a3a3a3">
                  {((b.count / total) * 100).toFixed(1)}%
                </text>
                {/* Outlier flags */}
                {(b.rating === 1 || b.rating === 5) && (
                  <>
                    <line x1={cx} y1={H - pad - barH - 18} x2={cx} y2={20} stroke={b.color} strokeDasharray="2 2" />
                    <rect x={cx - 50} y={10} width="100" height="18" fill={b.color} rx="3" />
                    <text x={cx} y={22} textAnchor="middle" fontSize="9" fontFamily="Lexend" fill="white" fontWeight="600">
                      {b.rating === 5 ? "TOP 5% · FAST-TRACK" : "BOTTOM 5% · RETRAIN"}
                    </text>
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="grid grid-cols-5 gap-3">
        {BELL_BUCKETS.map((b) => (
          <div key={b.rating} className="bg-white border border-neutral-200 rounded-xl p-4" style={{ borderTopColor: b.color, borderTopWidth: 3 }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider" style={{ color: b.color }}>
                Rating {b.rating}
              </span>
              {b.rating === 5 && <Award size={12} style={{ color: b.color }} />}
              {b.rating === 1 && <AlertTriangle size={12} style={{ color: b.color }} />}
            </div>
            <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{b.count}</div>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{b.label}</div>
            <div className="mt-2 pt-2 border-t border-neutral-100 text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              {b.flag}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== 11.1.C — EFLOW DATA INTEGRATION (EVIDENCE LOCKER) ====================

type Evidence = {
  hash: string;
  timestamp: string;
  type: string;
  label: string;
  block: number;
  verified: boolean;
};

const DEPT_RATINGS = [
  { dept: "Engineering", rating: 4.8, label: "Outstanding", workflows: 2842, evidenceCount: 2842 },
  { dept: "City Planning", rating: 4.6, label: "Very Satisfactory", workflows: 1204, evidenceCount: 1204 },
  { dept: "Health Office", rating: 4.4, label: "Very Satisfactory", workflows: 3108, evidenceCount: 3108 },
  { dept: "LEDIPO", rating: 3.2, label: "Satisfactory", workflows: 428, evidenceCount: 428 },
];

const EVIDENCE_SAMPLE: Evidence[] = [
  { hash: "0x4f8ac72e9b1d3e5f0a6c8d1e4b7a9f2c", timestamp: "2026-01-14 09:42:18", type: "Building Permit", label: "Permit #BP-2026-0184 · Lot 14-B Cogon", block: 482731, verified: true },
  { hash: "0x9a12bd8c4e7f1a3d6b9e2c5f8a0d3b67", timestamp: "2026-01-22 14:08:51", type: "Inspection Report", label: "Drainage audit · Brgy. Linao", block: 482988, verified: true },
  { hash: "0x27fe4a09cd1b6e82a3f7d4c9b0e5a172", timestamp: "2026-02-03 11:21:07", type: "Infrastructure Milestone", label: "Real St. road closure completed", block: 483412, verified: true },
  { hash: "0x881d6f0235ae9c14b7f2d8e4a6c1b390", timestamp: "2026-02-17 16:54:32", type: "Site Permit", label: "Permit #SP-2026-0318 · Isla Verde", block: 483892, verified: true },
  { hash: "0x3e7f0d4182acb54e9f1d6b3c8a2e7045", timestamp: "2026-03-04 10:12:49", type: "Subdivision Plan", label: "Approval · Villa Nova Phase 3", block: 484571, verified: true },
  { hash: "0xab331779f2c8d5e14a0b6e3f9d72c815", timestamp: "2026-03-19 13:47:22", type: "Variance Approval", label: "Zoning variance · District 2", block: 485208, verified: true },
  { hash: "0x51c0ee22bd9a847f13e6c2a0d5b89176", timestamp: "2026-04-02 08:33:11", type: "Compliance Audit", label: "Barangay infra audit · Cogon", block: 485902, verified: true },
  { hash: "0x77229e51a44cd0fb1e8326c579b0ad14", timestamp: "2026-04-15 15:29:04", type: "Inspection Report", label: "Flash flood damage · Isla Verde", block: 486418, verified: true },
];

function EflowDataIntegration() {
  const [selectedDept, setSelectedDept] = useState(DEPT_RATINGS[0]);
  const [selectedEvidence, setSelectedEvidence] = useState<Evidence | null>(EVIDENCE_SAMPLE[0]);

  return (
    <div>
      <PageHeader
        title="Cryptographic Performance Audit"
        subtitle="Every rating anchored to immutable eFlow workflow evidence · for CSC and COA auditors"
        actions={
          <>
            <Btn icon={<Download size={14} />} label="Export: COA/CSC Audit Log" />
            <Btn icon={<Shield size={14} />} label="Verify Merkle Root" variant="primary" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Departments Audited" value={String(DEPT_RATINGS.length)} trend="semester period" />
        <Stat label="Workflows Anchored" value="7,582" trend="cryptographically sealed" />
        <Stat label="Merkle Proofs" value="2,068" trend="one per employee" tone="good" />
        <Stat label="Ledger Integrity" value="100%" trend="zero tampered blocks" tone="good" />
      </div>

      {/* Dept selector */}
      <div className="grid grid-cols-4 gap-3 mb-5">
        {DEPT_RATINGS.map((d) => {
          const tone = ratingTone(d.rating);
          const active = selectedDept.dept === d.dept;
          return (
            <button
              key={d.dept}
              onClick={() => setSelectedDept(d)}
              className={`text-left rounded-xl border p-4 cursor-pointer transition-all ${active ? "bg-neutral-900 text-white border-neutral-900" : "bg-white border-neutral-200 hover:border-neutral-900"}`}
            >
              <div className={`text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider ${active ? "text-neutral-400" : "text-neutral-400"}`}>OPCR</div>
              <div className={`text-[14px] font-['Lexend:SemiBold',_sans-serif] mt-0.5 ${active ? "text-white" : "text-neutral-900"}`}>{d.dept}</div>
              <div className="flex items-center justify-between mt-2">
                <span className={`text-[22px] font-['Lexend:SemiBold',_sans-serif] ${active ? "text-white" : tone.text}`}>{d.rating.toFixed(1)}</span>
                <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] px-2 py-0.5 rounded-full ${active ? "bg-neutral-800 text-neutral-300" : tone.chip}`}>{d.label}</span>
              </div>
              <div className={`mt-2 text-[10px] font-['Lexend:Regular',_sans-serif] ${active ? "text-neutral-400" : "text-neutral-500"}`}>
                {d.workflows.toLocaleString()} workflows anchored
              </div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-[1fr_360px] gap-4">
        {/* Evidence list */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Blockchain Evidence · {selectedDept.dept}</div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
                Showing 8 of {selectedDept.evidenceCount.toLocaleString()} anchored records · Jan–Jun 2026
              </div>
            </div>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-['Lexend:Medium',_sans-serif]">
              <Shield size={10} /> All verified
            </span>
          </div>
          <div className="divide-y divide-neutral-100">
            {EVIDENCE_SAMPLE.map((e, i) => {
              const active = selectedEvidence?.hash === e.hash;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedEvidence(e)}
                  className={`w-full text-left px-5 py-3 cursor-pointer transition-colors ${active ? "bg-blue-50" : "hover:bg-neutral-50"}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-md bg-neutral-900 text-white flex items-center justify-center text-[9px] font-mono flex-shrink-0 mt-0.5">
                      #{i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{e.type}</span>
                        <span className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">· {e.timestamp}</span>
                      </div>
                      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{e.label}</div>
                      <div className="font-mono text-[10px] text-neutral-500 truncate mt-0.5">{e.hash}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">Block</div>
                      <div className="text-[11px] font-mono text-neutral-700">#{e.block}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Evidence detail */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
            <Fingerprint size={14} className="text-emerald-400" />
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif]">Evidence Detail</span>
            {selectedEvidence?.verified && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400 font-['Lexend:Medium',_sans-serif]">
                <CheckCircle2 size={10} /> Verified
              </span>
            )}
          </div>
          {selectedEvidence && (
            <div className="p-5 space-y-3">
              <div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Workflow Type</div>
                <div className="text-[13px] font-['Lexend:Medium',_sans-serif]">{selectedEvidence.type}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Description</div>
                <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-200">{selectedEvidence.label}</div>
              </div>
              <div>
                <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Cryptographic Hash</div>
                <div className="font-mono text-[10px] text-emerald-400 break-all bg-neutral-950 border border-neutral-800 rounded p-2">
                  {selectedEvidence.hash}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Block</div>
                  <div className="font-mono text-[12px] text-white">#{selectedEvidence.block}</div>
                </div>
                <div>
                  <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Committed</div>
                  <div className="font-mono text-[11px] text-white">{selectedEvidence.timestamp}</div>
                </div>
              </div>
              <div className="pt-3 border-t border-neutral-800 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={11} /> Merkle proof valid
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={11} /> Non-repudiation signature intact
                </div>
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <CheckCircle2 size={11} /> Tied to ratee workflow log
                </div>
              </div>
              <button className="w-full mt-2 py-2 bg-emerald-500 text-white rounded-lg text-[11px] font-['Lexend:Medium',_sans-serif] hover:bg-emerald-400 cursor-pointer flex items-center justify-center gap-1">
                <ExternalLink size={11} /> Open on Ledger Explorer
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== WELLNESS LANDING ====================

function WellnessOverview() {
  return <AutomatedAlerts />;
}

function LeaveAttendanceOverview() {
  return <TerminalLeaveCredits />;
}

// ==================== ROUTER ====================

export const hrmoPages: Record<string, Record<string, React.ComponentType>> = {
  workforce: {
    "Burnout Prediction Radar": DepartmentRiskFlags,
    "Department Risk Flags": DepartmentRiskFlags,
    "Response Latencies": DepartmentRiskFlags,
    "Cumulative Work Experience": DepartmentRiskFlags,
    "Logged Project Hours": DepartmentRiskFlags,
    "Workload Velocity Metrics": WorkloadVelocityOverview,
    "Task Completion Velocity": WorkloadVelocityOverview,
    "Equitable Distribution": EquitableDistribution,
    "GA Allocation Review": GAAllocationReview,
  },
  compliance: {
    "Performance Evaluations": CSCAppraisals,
    "CSC Appraisals": CSCAppraisals,
    "Task Completion Rates": TaskCompletionRates,
    "eFlow Data Integration": EflowDataIntegration,
  },
  wellness: {
    "Preemptive Interventions": WellnessOverview,
    "Automated Alerts": AutomatedAlerts,
    "Wellness Interventions": WellnessInterventions,
    "Stress Debriefing": StressDebriefing,
    "Leave & Attendance Management": LeaveAttendanceOverview,
    "Terminal Leave Credits": TerminalLeaveCredits,
    "Monetization": Monetization,
    "Overtime Claims": OvertimeClaims,
    "Payroll Pre-Audit": PayrollPreAudit,
  },
};

export const hrmoDefaultPages: Record<string, string> = {
  workforce: "Burnout Prediction Radar",
  wellness: "Automated Alerts",
  compliance: "CSC Appraisals",
};

export function HRMOContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
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
