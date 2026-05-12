import React, { useState, useMemo } from "react";
import { Settings } from "@carbon/icons-react";
import {
  Lock,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Scale,
  Shield,
  Fingerprint,
  ArrowRight,
  ExternalLink,
  Building2,
  Megaphone,
  HandHeart,
  Hammer,
  TrendingDown,
  TrendingUp,
  Wallet,
  Landmark,
  FileText,
  Clock,
  Banknote,
  Hash,
  Layers,
  Info,
  Zap,
  Link2,
  Search,
  Filter,
  Receipt,
  ScanLine,
  Bell,
  MessageSquare,
  Flame,
  Download,
  Undo2,
  RefreshCw,
  Sparkles,
  ArrowLeftRight,
  Minus,
  Equal,
  KeyRound,
  Terminal,
  GitCommit,
  Gavel,
  CalendarX,
  Timer,
  Siren,
  Ban,
  ShieldAlert,
  Copy,
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
          <Landmark size={12} /> Finance · Operational Ledger
        </div>
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{title}</h1>
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
          {subtitle || "Office of the City Accountant & Treasurer · Ormoc City"}
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
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
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
      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className={`text-[22px] font-['Lexend:SemiBold',_sans-serif] mt-1 tabular-nums ${toneMap[tone]}`}>{value}</div>
      {trend && <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{trend}</div>}
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

// ==================== 12.1.A — PROGRAMMATIC BUCKETS ====================

type Bucket = {
  id: string;
  name: string;
  ordinance: string;
  appropriated: number;
  obligated: number;
  released: number;
  category: "infrastructure" | "social" | "economic" | "governance";
};

const BUCKETS: Bucket[] = [
  { id: "b1", name: "Eco-Park Infrastructure", ordinance: "SP Ord. 2026-014", appropriated: 50_000_000, obligated: 32_400_000, released: 18_200_000, category: "infrastructure" },
  { id: "b2", name: "Coastal Road Rehabilitation", ordinance: "SP Ord. 2026-018", appropriated: 180_000_000, obligated: 92_000_000, released: 64_000_000, category: "infrastructure" },
  { id: "b3", name: "Health Services Modernization", ordinance: "SP Ord. 2026-009", appropriated: 85_000_000, obligated: 71_200_000, released: 58_400_000, category: "social" },
  { id: "b4", name: "Senior Citizens Welfare Fund", ordinance: "SP Ord. 2026-007", appropriated: 24_000_000, obligated: 11_800_000, released: 9_600_000, category: "social" },
  { id: "b5", name: "SME Livelihood Grants", ordinance: "SP Ord. 2026-021", appropriated: 45_000_000, obligated: 28_500_000, released: 22_100_000, category: "economic" },
  { id: "b6", name: "Tourism Campaign 2026", ordinance: "SP Ord. 2026-011", appropriated: 18_000_000, obligated: 9_400_000, released: 6_100_000, category: "economic" },
  { id: "b7", name: "City Hall ICT Upgrade", ordinance: "SP Ord. 2026-025", appropriated: 32_000_000, obligated: 14_200_000, released: 8_000_000, category: "governance" },
  { id: "b8", name: "Disaster Preparedness", ordinance: "SP Ord. 2026-003", appropriated: 68_000_000, obligated: 41_600_000, released: 28_400_000, category: "governance" },
];

const categoryStyle: Record<string, { bg: string; border: string; icon: React.ReactNode; label: string }> = {
  infrastructure: { bg: "bg-orange-50", border: "border-orange-200", icon: <Hammer size={12} />, label: "Infrastructure" },
  social: { bg: "bg-rose-50", border: "border-rose-200", icon: <HandHeart size={12} />, label: "Social Services" },
  economic: { bg: "bg-emerald-50", border: "border-emerald-200", icon: <TrendingUp size={12} />, label: "Economic Devt." },
  governance: { bg: "bg-blue-50", border: "border-blue-200", icon: <Building2 size={12} />, label: "Governance" },
};

function ProgrammaticBuckets() {
  const [selected, setSelected] = useState<Bucket>(BUCKETS[0]);
  const totalAppr = BUCKETS.reduce((s, b) => s + b.appropriated, 0);
  const totalOblg = BUCKETS.reduce((s, b) => s + b.obligated, 0);
  const totalRel = BUCKETS.reduce((s, b) => s + b.released, 0);

  const categories = Array.from(new Set(BUCKETS.map((b) => b.category)));

  return (
    <div>
      <PageHeader
        title="Master Appropriations Ledger"
        subtitle="Approved by Sangguniang Panlungsod · cryptographically deposited · mathematically locked"
        actions={
          <>
            <Btn icon={<Scale size={14} />} label="View SP Ordinance Link" variant="primary" />
            <Btn icon={<FileText size={14} />} label="Export FY 2026 Annual Budget" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total Appropriated" value={pesoShort(totalAppr)} trend={`${BUCKETS.length} programmatic buckets`} />
        <Stat label="Obligated" value={pesoShort(totalOblg)} trend={`${((totalOblg / totalAppr) * 100).toFixed(0)}% committed`} tone="warn" />
        <Stat label="Released" value={pesoShort(totalRel)} trend={`${((totalRel / totalAppr) * 100).toFixed(0)}% disbursed`} tone="good" />
        <Stat label="Unobligated" value={pesoShort(totalAppr - totalOblg)} trend="available for new ORS" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-3 mb-5">
        <div className="flex items-center gap-2 mb-3 px-2">
          <Lock size={13} className="text-neutral-700" />
          <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Immutable Ordinance Linkage</span>
          <span className="ml-auto text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">
            Finance cannot edit appropriation totals · requires new SP ordinance
          </span>
        </div>

        {/* Tree-grid */}
        <div className="space-y-3">
          {categories.map((cat) => {
            const catBuckets = BUCKETS.filter((b) => b.category === cat);
            const catTotal = catBuckets.reduce((s, b) => s + b.appropriated, 0);
            const cs = categoryStyle[cat];
            return (
              <div key={cat} className={`rounded-lg border ${cs.border} ${cs.bg} overflow-hidden`}>
                <div className="px-4 py-2 flex items-center gap-2 border-b border-white/60">
                  <span className="text-neutral-700">{cs.icon}</span>
                  <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{cs.label}</span>
                  <span className="ml-auto text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 tabular-nums">
                    {pesoShort(catTotal)}
                  </span>
                </div>
                <div className="bg-white divide-y divide-neutral-100">
                  {catBuckets.map((b) => {
                    const oblgPct = (b.obligated / b.appropriated) * 100;
                    const relPct = (b.released / b.appropriated) * 100;
                    const active = selected.id === b.id;
                    return (
                      <button
                        key={b.id}
                        onClick={() => setSelected(b)}
                        className={`w-full px-4 py-3 flex items-center gap-4 hover:bg-neutral-50 cursor-pointer transition-colors text-left ${
                          active ? "bg-blue-50 hover:bg-blue-50" : ""
                        }`}
                      >
                        <Lock size={11} className="text-neutral-400 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{b.name}</span>
                            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 flex-shrink-0">{b.ordinance}</span>
                          </div>
                          <div className="mt-1.5 relative h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-amber-400" style={{ width: `${oblgPct}%` }} />
                            <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${relPct}%` }} />
                          </div>
                        </div>
                        <div className="flex gap-4 text-right text-[11px] font-['Lexend:Regular',_sans-serif] tabular-nums flex-shrink-0">
                          <div>
                            <div className="text-neutral-400 text-[10px]">Appr.</div>
                            <div className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">{pesoShort(b.appropriated)}</div>
                          </div>
                          <div>
                            <div className="text-amber-600 text-[10px]">Oblg.</div>
                            <div className="text-amber-700 font-['Lexend:Medium',_sans-serif]">{pesoShort(b.obligated)}</div>
                          </div>
                          <div>
                            <div className="text-emerald-600 text-[10px]">Rel.</div>
                            <div className="text-emerald-700 font-['Lexend:Medium',_sans-serif]">{pesoShort(b.released)}</div>
                          </div>
                        </div>
                        <ChevronRight size={14} className="text-neutral-300 flex-shrink-0" />
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Lock size={14} className="text-emerald-400" />
            <span className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">Locked Appropriation</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">{selected.ordinance}</span>
        </div>
        <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] mb-1">{selected.name}</div>
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-neutral-800">
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Appropriated</div>
            <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">{peso(selected.appropriated)}</div>
          </div>
          <div>
            <div className="text-[10px] text-amber-400 uppercase tracking-wider">Obligated</div>
            <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] tabular-nums text-amber-400">{peso(selected.obligated)}</div>
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 uppercase tracking-wider">Released</div>
            <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] tabular-nums text-emerald-400">{peso(selected.released)}</div>
          </div>
          <div>
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider">Remaining</div>
            <div className="text-[18px] font-['Lexend:SemiBold',_sans-serif] tabular-nums">{peso(selected.appropriated - selected.obligated)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 12.1.B — CATEGORICAL SLICES (ALLOCATION SLIDERS) ====================

type Slice = {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  amount: number;
};

function CategoricalSlices() {
  const MASTER = 50_000_000; // Eco-Park Infrastructure master bucket
  const [slices, setSlices] = useState<Slice[]>([
    { id: "facilities", label: "Facilities", icon: <Hammer size={14} />, color: "#f97316", amount: 40_000_000 },
    { id: "marketing", label: "Marketing", icon: <Megaphone size={14} />, color: "#3b82f6", amount: 5_000_000 },
    { id: "community", label: "Community Engagement", icon: <HandHeart size={14} />, color: "#10b981", amount: 5_000_000 },
  ]);
  const [locked, setLocked] = useState(false);

  const allocated = slices.reduce((s, x) => s + x.amount, 0);
  const remaining = MASTER - allocated;

  function adjustSlice(id: string, newAmount: number) {
    if (locked) return;
    const other = slices.filter((s) => s.id !== id).reduce((s, x) => s + x.amount, 0);
    const maxAllowed = MASTER - other;
    const capped = Math.max(0, Math.min(maxAllowed, newAmount));
    setSlices((ss) => ss.map((s) => (s.id === id ? { ...s, amount: capped } : s)));
  }

  return (
    <div>
      <PageHeader
        title="Categorical Slice Allocation"
        subtitle="Programmatic Bucket · Eco-Park Infrastructure · SP Ord. 2026-014"
        actions={
          <>
            <Btn
              icon={locked ? <Lock size={14} /> : <Unlock size={14} />}
              label={locked ? "Sealed" : "Seal Allocation"}
              variant={locked ? "success" : "primary"}
              onClick={() => setLocked((l) => !l)}
            />
          </>
        }
      />

      {/* Master Bucket Visualization */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">Master Bucket</div>
            <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Eco-Park Infrastructure</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">Locked by ordinance</div>
            <div className="text-[24px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(MASTER)}</div>
          </div>
        </div>

        {/* Stacked visualization */}
        <div className="h-14 rounded-lg overflow-hidden flex relative bg-neutral-100 border border-neutral-200">
          {slices.map((s) => {
            const pct = (s.amount / MASTER) * 100;
            return (
              <div
                key={s.id}
                className="flex items-center justify-center gap-1.5 text-white text-[11px] font-['Lexend:Medium',_sans-serif] transition-all duration-300"
                style={{ width: `${pct}%`, background: s.color }}
              >
                {pct > 8 && (
                  <>
                    {s.icon} {s.label}
                  </>
                )}
              </div>
            );
          })}
          {remaining > 0 && (
            <div
              className="flex items-center justify-center text-neutral-500 text-[11px] font-['Lexend:Medium',_sans-serif] border-l-2 border-dashed border-neutral-400"
              style={{ width: `${(remaining / MASTER) * 100}%` }}
            >
              Unallocated
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-[11px] font-['Lexend:Regular',_sans-serif]">
          <span className="text-neutral-500">
            Allocated: <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">{peso(allocated)}</span>
          </span>
          <span className={remaining === 0 ? "text-emerald-600" : "text-amber-600"}>
            {remaining === 0 ? "✓ Fully allocated" : `${peso(remaining)} unallocated`}
          </span>
          <span className="text-neutral-500">
            Ceiling: <span className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">{peso(MASTER)}</span>
          </span>
        </div>
      </div>

      {/* Sliders */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-5">
          <Layers size={14} className="text-neutral-700" />
          <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Allocation Controls</span>
          <span className="ml-auto text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">
            Sliders physically cannot exceed the master bucket total
          </span>
        </div>

        <div className="space-y-5">
          {slices.map((s) => {
            const pct = (s.amount / MASTER) * 100;
            return (
              <div key={s.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md flex items-center justify-center text-white" style={{ background: s.color }}>
                      {s.icon}
                    </div>
                    <span className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{s.label}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-[18px] font-['Lexend:SemiBold',_sans-serif] tabular-nums" style={{ color: s.color }}>
                      {peso(s.amount)}
                    </span>
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 tabular-nums">{pct.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={MASTER}
                    step={100_000}
                    value={s.amount}
                    onChange={(e) => adjustSlice(s.id, Number(e.target.value))}
                    disabled={locked}
                    className="w-full cursor-pointer disabled:cursor-not-allowed"
                    style={{ accentColor: s.color }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {locked && (
          <div className="mt-5 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2">
            <Shield size={14} className="text-emerald-600 mt-0.5" />
            <div className="flex-1">
              <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-emerald-700">Allocation sealed</div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-emerald-700">
                Categorical slices committed. Sub-bucket ceilings now enforce ORS validation downstream.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ==================== 12.2.A — OBLIGATION REQUESTS (ORS) ====================

type ORS = {
  id: string;
  requester: string;
  dept: string;
  purpose: string;
  amount: number;
  bucketId: string;
  bucketName: string;
  bucketBalance: number;
  submitted: string;
  supplier: string;
  prNumber: string;
};

const ORS_QUEUE: ORS[] = [
  { id: "ors-2026-0482", requester: "Engr. R. Mapalad", dept: "Engineering", purpose: "Cement procurement — 2,000 bags for Eco-Park Phase 2 retaining wall", amount: 2_000_000, bucketId: "facilities", bucketName: "Eco-Park · Facilities", bucketBalance: 5_000_000, submitted: "2026-04-20 09:14", supplier: "Oriental Cement Corp.", prNumber: "PR-2026-0891" },
  { id: "ors-2026-0483", requester: "Dr. M. Sabando", dept: "Health Office", purpose: "Medical supplies Q2 restock — BHS provincial network", amount: 3_800_000, bucketId: "health-ops", bucketName: "Health Services · Operations", bucketBalance: 12_400_000, submitted: "2026-04-20 10:38", supplier: "MedEast Supply Inc.", prNumber: "PR-2026-0894" },
  { id: "ors-2026-0484", requester: "Arch. P. Odal", dept: "Planning", purpose: "GIS software licenses and surveyor stipend", amount: 1_200_000, bucketId: "ict", bucketName: "City Hall ICT · Software", bucketBalance: 4_800_000, submitted: "2026-04-20 13:22", supplier: "ESRI Philippines", prNumber: "PR-2026-0896" },
  { id: "ors-2026-0485", requester: "L. Bascon", dept: "LEDIPO", purpose: "Tourism campaign print run and billboard rental", amount: 4_500_000, bucketId: "marketing", bucketName: "Tourism · Marketing", bucketBalance: 1_000_000, submitted: "2026-04-20 14:51", supplier: "Visayan Print Works", prNumber: "PR-2026-0898" },
  { id: "ors-2026-0486", requester: "F. Lariosa", dept: "Legal", purpose: "Legal opinion honoraria and research fees", amount: 380_000, bucketId: "legal", bucketName: "Legal · Professional Services", bucketBalance: 2_100_000, submitted: "2026-04-20 15:17", supplier: "Dela Rama & Partners", prNumber: "PR-2026-0900" },
];

function ObligationRequests() {
  const [selected, setSelected] = useState<ORS>(ORS_QUEUE[0]);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());

  const canApprove = selected.amount <= selected.bucketBalance;
  const postBalance = selected.bucketBalance - selected.amount;
  const deficitAmount = selected.amount - selected.bucketBalance;

  return (
    <div>
      <PageHeader
        title="Pending Obligation Requests"
        subtitle="Deficit spending is software-impossible · BPA cross-references every bucket in real-time"
        actions={
          <>
            <Btn icon={<Filter size={14} />} label="Filter: All Departments" />
            <Btn icon={<Search size={14} />} label="Search" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Pending ORS" value={String(ORS_QUEUE.length - confirmed.size)} trend="awaiting gatekeeper" />
        <Stat label="Today's Obligation Volume" value={pesoShort(ORS_QUEUE.reduce((s, o) => s + o.amount, 0))} />
        <Stat label="Blocked by BPA" value={String(ORS_QUEUE.filter((o) => o.amount > o.bucketBalance).length)} trend="insufficient bucket balance" tone="bad" />
        <Stat label="Avg Gatekeeper Time" value="0.4s" trend="vs 9.2d manual legacy" tone="good" />
      </div>

      <div className="grid grid-cols-[300px_1fr] gap-4">
        {/* Queue */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            ORS Queue
          </div>
          {ORS_QUEUE.map((o) => {
            const active = selected.id === o.id;
            const blocked = o.amount > o.bucketBalance;
            const done = confirmed.has(o.id);
            return (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${
                  active ? "bg-neutral-900 text-white" : done ? "bg-emerald-50" : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] ${active ? "text-neutral-400" : "text-neutral-400"}`}>{o.id}</span>
                  {blocked && !done && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  {done && <CheckCircle2 size={11} className="text-emerald-600 ml-auto" />}
                </div>
                <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${active ? "text-white" : "text-neutral-900"} truncate`}>
                  {o.dept}
                </div>
                <div className={`text-[10px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${active ? "text-neutral-300" : "text-neutral-500"} truncate`}>
                  {o.purpose}
                </div>
                <div className={`text-[13px] font-['Lexend:SemiBold',_sans-serif] mt-1 tabular-nums ${active ? "text-white" : blocked ? "text-red-600" : "text-neutral-900"}`}>
                  {pesoShort(o.amount)}
                </div>
              </button>
            );
          })}
        </div>

        {/* Split-screen review */}
        <div className={`rounded-xl border-2 overflow-hidden ${canApprove ? "border-emerald-200" : "border-red-300"}`}>
          <div className="bg-white px-5 py-4 border-b border-neutral-200 flex items-center justify-between">
            <div>
              <div className="text-[11px] font-mono text-neutral-400">{selected.id}</div>
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">
                {selected.dept} · {selected.requester}
              </div>
            </div>
            {canApprove ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-['Lexend:Medium',_sans-serif]">
                <CheckCircle2 size={12} /> Math checks out
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-[11px] font-['Lexend:Medium',_sans-serif]">
                <XCircle size={12} /> Bucket insufficient
              </span>
            )}
          </div>

          <div className="grid grid-cols-2">
            {/* Incoming request */}
            <div className="bg-white p-5 border-r border-neutral-200">
              <div className="flex items-center gap-2 mb-4">
                <FileText size={14} className="text-neutral-500" />
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Incoming Request</span>
              </div>
              <div className="space-y-3 text-[12px] font-['Lexend:Regular',_sans-serif]">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Purpose</div>
                  <div className="text-neutral-900 leading-relaxed">{selected.purpose}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400">Amount Requested</div>
                  <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(selected.amount)}</div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-neutral-100">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">Supplier</div>
                    <div className="text-neutral-700">{selected.supplier}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">PR Reference</div>
                    <div className="font-mono text-neutral-700 text-[11px]">{selected.prNumber}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">Submitted</div>
                    <div className="text-neutral-700">{selected.submitted}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">Requester</div>
                    <div className="text-neutral-700">{selected.requester}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* System cross-reference */}
            <div className={`p-5 ${canApprove ? "bg-gradient-to-br from-emerald-50 to-white" : "bg-gradient-to-br from-red-50 to-white"}`}>
              <div className="flex items-center gap-2 mb-4">
                <Zap size={14} className={canApprove ? "text-emerald-600" : "text-red-600"} />
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">BPA Gatekeeper · Live</span>
              </div>

              <div className="space-y-3">
                <div className="bg-white border border-neutral-200 rounded-lg p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-neutral-400 mb-1">
                    <Link2 size={10} /> Cross-referenced bucket
                  </div>
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{selected.bucketName}</div>
                </div>

                <div className="bg-white border border-neutral-200 rounded-lg p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Current Balance</span>
                    <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(selected.bucketBalance)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Less: This ORS</span>
                    <span className="text-[13px] font-['Lexend:Medium',_sans-serif] text-red-600 tabular-nums">−{peso(selected.amount)}</span>
                  </div>
                  <div className="border-t border-neutral-100 pt-2 flex items-center justify-between">
                    <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Post-Obligation Balance</span>
                    <span className={`text-[15px] font-['Lexend:SemiBold',_sans-serif] tabular-nums ${canApprove ? "text-emerald-700" : "text-red-600"}`}>
                      {canApprove ? peso(postBalance) : `−${peso(deficitAmount)}`}
                    </span>
                  </div>
                </div>

                {/* Bucket utilization bar */}
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 mb-1">Bucket Utilization Preview</div>
                  <div className="h-6 rounded-md overflow-hidden bg-neutral-100 flex relative border border-neutral-200">
                    <div
                      className="bg-emerald-500"
                      style={{ width: `${Math.max(0, (postBalance / selected.bucketBalance) * 100)}%` }}
                    />
                    <div
                      className="bg-amber-400"
                      style={{ width: `${Math.min(100, (selected.amount / selected.bucketBalance) * 100)}%` }}
                    />
                    {!canApprove && <div className="flex-1 bg-red-500/40 bg-[repeating-linear-gradient(45deg,#dc2626,#dc2626_4px,#991b1b_4px,#991b1b_8px)]" />}
                  </div>
                </div>

                {!canApprove && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                    <AlertTriangle size={13} className="text-red-600 mt-0.5" />
                    <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-700">
                      Bucket deficit of <span className="font-['Lexend:Medium',_sans-serif]">{peso(deficitAmount)}</span>. Requester must
                      reduce amount or await the next SP ordinance for augmentation.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white px-5 py-3 border-t border-neutral-200 flex items-center justify-between">
            <div className="text-[10px] font-mono text-neutral-400">
              gatekeeper::bpa-v4.2 · evaluated {new Date().toISOString().slice(11, 19)}
            </div>
            <div className="flex gap-2">
              <Btn icon={<XCircle size={13} />} label="Return to Requester" variant="secondary" />
              <Btn
                icon={<Shield size={13} />}
                label={canApprove ? (confirmed.has(selected.id) ? "Obligated ✓" : "Approve & Obligate") : "Disabled — Deficit"}
                variant={canApprove ? "success" : "secondary"}
                disabled={!canApprove || confirmed.has(selected.id)}
                onClick={() => {
                  if (canApprove) setConfirmed((s) => new Set([...s, selected.id]));
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 12.2.B — FUND RELEASES (DISBURSEMENT PIPELINE) ====================

type Disb = {
  id: string;
  payee: string;
  purpose: string;
  amount: number;
  col: "voucher" | "treasurer" | "ready" | "released";
  orsRef: string;
  aging: number;
};

const DISB_INITIAL: Disb[] = [
  { id: "DV-2026-1882", payee: "Oriental Cement Corp.", purpose: "2,000 bags cement · Eco-Park P2", amount: 2_000_000, col: "voucher", orsRef: "ORS-2026-0482", aging: 1 },
  { id: "DV-2026-1883", payee: "MedEast Supply Inc.", purpose: "Q2 medical restock", amount: 3_800_000, col: "voucher", orsRef: "ORS-2026-0483", aging: 0 },
  { id: "DV-2026-1879", payee: "ESRI Philippines", purpose: "GIS licenses", amount: 1_200_000, col: "treasurer", orsRef: "ORS-2026-0484", aging: 2 },
  { id: "DV-2026-1880", payee: "Visayan Print Works", purpose: "Tourism print run", amount: 950_000, col: "treasurer", orsRef: "ORS-2026-0481", aging: 3 },
  { id: "DV-2026-1876", payee: "Bureau of Internal Revenue", purpose: "Withholding tax remittance", amount: 1_840_000, col: "ready", orsRef: "ORS-2026-0471", aging: 4 },
  { id: "DV-2026-1877", payee: "Construction Workers Union #4", purpose: "Payroll batch April C2", amount: 8_420_000, col: "ready", orsRef: "ORS-2026-0472", aging: 1 },
  { id: "DV-2026-1870", payee: "Asian Integrated Marine", purpose: "Coastal dredging · milestone 3", amount: 24_000_000, col: "released", orsRef: "ORS-2026-0462", aging: 0 },
  { id: "DV-2026-1871", payee: "GreenSpace Landscaping", purpose: "Phase 1 softscape", amount: 3_200_000, col: "released", orsRef: "ORS-2026-0458", aging: 2 },
];

const DISB_COLS: { id: Disb["col"]; label: string; tint: string; chip: string; icon: React.ReactNode }[] = [
  { id: "voucher", label: "Awaiting Voucher", tint: "bg-neutral-50", chip: "bg-neutral-200 text-neutral-700", icon: <FileText size={12} /> },
  { id: "treasurer", label: "Pending Treasurer Sig.", tint: "bg-amber-50", chip: "bg-amber-100 text-amber-700", icon: <Fingerprint size={12} /> },
  { id: "ready", label: "Ready for Release", tint: "bg-blue-50", chip: "bg-blue-100 text-blue-700", icon: <Wallet size={12} /> },
  { id: "released", label: "Funds Released", tint: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 size={12} /> },
];

function FundReleases() {
  const [cards, setCards] = useState(DISB_INITIAL);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [releaseModal, setReleaseModal] = useState<Disb | null>(null);
  const [lastHash, setLastHash] = useState<string | null>(null);

  function onDrop(target: Disb["col"]) {
    if (!draggedId) return;
    const c = cards.find((x) => x.id === draggedId);
    if (!c || c.col === target) {
      setDraggedId(null);
      return;
    }
    if (target === "released") {
      setReleaseModal(c);
      setDraggedId(null);
      return;
    }
    setCards((cs) => cs.map((x) => (x.id === draggedId ? { ...x, col: target, aging: 0 } : x)));
    setDraggedId(null);
  }

  function confirmRelease() {
    if (!releaseModal) return;
    const hash = `0x${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}${Math.random().toString(16).slice(2, 10)}`;
    setLastHash(hash);
    setCards((cs) => cs.map((x) => (x.id === releaseModal.id ? { ...x, col: "released", aging: 0 } : x)));
    setReleaseModal(null);
  }

  const totalReleased = cards.filter((c) => c.col === "released").reduce((s, c) => s + c.amount, 0);
  const pendingRelease = cards.filter((c) => c.col === "ready").reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <PageHeader
        title="Disbursement Pipeline"
        subtitle="Treasurer workspace · drag between stages · cryptographic release to Immutable Audit"
        actions={
          <>
            <Btn icon={<Fingerprint size={14} />} label="Treasurer PKI · Connected" variant="success" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Pipeline Value" value={pesoShort(cards.reduce((s, c) => s + c.amount, 0))} trend={`${cards.length} vouchers`} />
        <Stat label="Ready for Release" value={pesoShort(pendingRelease)} trend="treasurer action required" tone="warn" />
        <Stat label="Released Today" value={pesoShort(totalReleased)} trend="cryptographically sealed" tone="good" />
        <Stat label="Avg Stage Time" value="2.1h" trend="voucher → release" tone="good" />
      </div>

      {lastHash && (
        <div className="bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 rounded-lg p-3 mb-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <div className="flex-1">
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-emerald-800">Release committed to blockchain</div>
            <div className="font-mono text-[10px] text-emerald-700">{lastHash}</div>
          </div>
          <ExternalLink size={13} className="text-emerald-600 cursor-pointer" />
        </div>
      )}

      <div className="grid grid-cols-4 gap-3">
        {DISB_COLS.map((col) => {
          const items = cards.filter((c) => c.col === col.id);
          const sum = items.reduce((s, c) => s + c.amount, 0);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              className={`${col.tint} rounded-xl p-3 min-h-[520px]`}
            >
              <div className="flex items-center gap-2 mb-1 px-1">
                <span className="text-neutral-700">{col.icon}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${col.chip}`}>{items.length}</span>
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800">{col.label}</span>
              </div>
              <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 px-1 mb-3 tabular-nums">{pesoShort(sum)} staged</div>
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
                    <div className="flex items-center gap-1 mb-1">
                      <span className="font-mono text-[10px] text-neutral-400">{c.id}</span>
                      {c.aging > 2 && <span className="ml-auto text-[9px] text-red-500 font-['Lexend:Medium',_sans-serif]">{c.aging}d aging</span>}
                      {c.col === "released" && <Lock size={10} className="text-emerald-600 ml-auto" />}
                    </div>
                    <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{c.payee}</div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate mt-0.5">{c.purpose}</div>
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 font-mono">{c.orsRef}</span>
                      <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{pesoShort(c.amount)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Release modal */}
      {releaseModal && (
        <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-6" onClick={() => setReleaseModal(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-neutral-900 to-neutral-800 text-white px-6 py-4">
              <div className="flex items-center gap-2">
                <Fingerprint size={16} className="text-emerald-400" />
                <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif]">Release Funds · PKI Signature Required</span>
              </div>
            </div>
            <div className="p-6">
              <div className="text-[11px] text-neutral-400 uppercase tracking-wider mb-1">Payee</div>
              <div className="text-[15px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{releaseModal.payee}</div>
              <div className="text-[11px] text-neutral-500 mt-0.5">{releaseModal.purpose}</div>

              <div className="mt-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                <div className="flex items-baseline justify-between">
                  <span className="text-[11px] text-neutral-500">Amount to disburse</span>
                  <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(releaseModal.amount)}</span>
                </div>
              </div>

              <div className="mt-4 space-y-1.5 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">
                <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-600" /> ORS reference validated ({releaseModal.orsRef})</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-600" /> Treasurer PKI credential present</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-600" /> Treasury cash balance sufficient</div>
                <div className="flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-600" /> Hash will forward to Immutable Audit module</div>
              </div>

              <div className="mt-5 flex gap-2">
                <button onClick={() => setReleaseModal(null)} className="flex-1 py-2.5 bg-neutral-100 rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] cursor-pointer hover:bg-neutral-200">
                  Cancel
                </button>
                <button onClick={confirmRelease} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-[13px] font-['Lexend:Medium',_sans-serif] cursor-pointer hover:bg-emerald-700 flex items-center justify-center gap-1.5">
                  <Fingerprint size={13} /> Sign & Release
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== 12.2.C — EARMARKED FUNDS (BURN RATE) ====================

function EarmarkedFunds() {
  // 30-day obligation vs release curve
  const data = useMemo(() => {
    const arr: { day: number; obligated: number; released: number }[] = [];
    let oblg = 0;
    let rel = 0;
    for (let i = 0; i < 30; i++) {
      oblg += 4 + Math.sin(i * 0.35) * 2 + Math.random() * 2.5;
      rel += 2.4 + Math.sin(i * 0.32) * 1.2 + Math.random() * 1.8;
      arr.push({ day: i + 1, obligated: oblg, released: rel });
    }
    return arr;
  }, []);

  const totalObligated = data[data.length - 1].obligated;
  const totalReleased = data[data.length - 1].released;
  const earmarkedGap = totalObligated - totalReleased;

  const W = 860;
  const H = 280;
  const pad = 50;
  const maxY = Math.max(totalObligated, totalReleased) * 1.08;
  const scaleX = (d: number) => pad + ((d - 1) / 29) * (W - pad * 2);
  const scaleY = (v: number) => H - pad - (v / maxY) * (H - pad * 2);

  const oblgPath = data.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.day)} ${scaleY(p.obligated)}`).join(" ");
  const relPath = data.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.day)} ${scaleY(p.released)}`).join(" ");

  // Gap ribbon
  const ribbonPath = [
    ...data.map((p, i) => `${i === 0 ? "M" : "L"} ${scaleX(p.day)} ${scaleY(p.obligated)}`),
    ...[...data].reverse().map((p) => `L ${scaleX(p.day)} ${scaleY(p.released)}`),
    "Z",
  ].join(" ");

  const byPayee = [
    { payee: "Asian Integrated Marine", amt: 18_400_000, due: "2026-05-04" },
    { payee: "Oriental Cement Corp.", amt: 2_000_000, due: "2026-05-08" },
    { payee: "MedEast Supply Inc.", amt: 3_800_000, due: "2026-05-10" },
    { payee: "ESRI Philippines", amt: 1_200_000, due: "2026-05-15" },
    { payee: "Visayan Print Works", amt: 950_000, due: "2026-05-16" },
    { payee: "Construction Workers Union #4", amt: 8_420_000, due: "2026-04-28" },
  ];

  return (
    <div>
      <PageHeader
        title="Earmarked Funds · Treasury Liquidity View"
        subtitle="Money legally promised (obligated) but not yet released · the gap Treasurer must manage"
        actions={
          <>
            <Btn icon={<Wallet size={14} />} label="Open Treasury Cash Position" variant="primary" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Total Obligated · 30d" value={`₱${totalObligated.toFixed(1)}M`} trend="legal commitments" tone="warn" />
        <Stat label="Total Released · 30d" value={`₱${totalReleased.toFixed(1)}M`} trend="cash actually out" tone="good" />
        <Stat label="Earmarked Gap" value={`₱${earmarkedGap.toFixed(1)}M`} trend="obligated but not released" tone="bad" />
        <Stat label="Treasury Cash on Hand" value="₱ 412.8M" trend="gap is safely covered" tone="good" />
      </div>

      {/* Burn rate chart */}
      <div className="bg-white border border-neutral-200 rounded-xl p-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Obligation vs Release Burn Rate</div>
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">The shaded area is money on the hook but not yet paid.</div>
          </div>
          <div className="flex items-center gap-3 text-[11px] font-['Lexend:Regular',_sans-serif]">
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-amber-500" /> Obligated</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-emerald-500" /> Released</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-amber-200 rounded-sm" /> Earmarked gap</span>
          </div>
        </div>

        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[300px]">
          <defs>
            <linearGradient id="gapGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.08" />
            </linearGradient>
          </defs>

          {/* Y grid */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = H - pad - t * (H - pad * 2);
            const val = (maxY * t).toFixed(0);
            return (
              <g key={t}>
                <line x1={pad} y1={y} x2={W - pad} y2={y} stroke="#f5f5f5" />
                <text x={pad - 6} y={y + 3} textAnchor="end" fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
                  ₱{val}M
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={pad} y1={H - pad} x2={W - pad} y2={H - pad} stroke="#d4d4d4" />
          <line x1={pad} y1={pad / 2} x2={pad} y2={H - pad} stroke="#d4d4d4" />

          {/* Gap ribbon */}
          <path d={ribbonPath} fill="url(#gapGrad)" />

          {/* Obligated line */}
          <path d={oblgPath} fill="none" stroke="#f59e0b" strokeWidth="2.25" />
          {/* Released line */}
          <path d={relPath} fill="none" stroke="#10b981" strokeWidth="2.25" />

          {/* Endpoint markers */}
          <circle cx={scaleX(30)} cy={scaleY(totalObligated)} r="4" fill="#f59e0b" />
          <circle cx={scaleX(30)} cy={scaleY(totalReleased)} r="4" fill="#10b981" />

          {/* Gap label */}
          <line
            x1={scaleX(30) + 8}
            y1={scaleY(totalObligated)}
            x2={scaleX(30) + 8}
            y2={scaleY(totalReleased)}
            stroke="#f59e0b"
            strokeWidth="1.5"
          />
          <text x={scaleX(30) + 14} y={(scaleY(totalObligated) + scaleY(totalReleased)) / 2 + 3} fontSize="10" fill="#b45309" fontFamily="Lexend" fontWeight="600">
            gap ₱{earmarkedGap.toFixed(1)}M
          </text>

          {/* X axis labels */}
          {[1, 7, 14, 21, 30].map((d) => (
            <text key={d} x={scaleX(d)} y={H - pad + 14} textAnchor="middle" fontSize="9" fill="#a3a3a3" fontFamily="Lexend">
              D{d}
            </text>
          ))}
        </svg>
      </div>

      {/* Upcoming release obligations */}
      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center gap-2">
          <Clock size={14} className="text-neutral-700" />
          <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Upcoming Cash-Out Windows</span>
          <span className="ml-auto text-[11px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">Plan treasury inflows accordingly</span>
        </div>
        <div className="grid grid-cols-12 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
          <div className="col-span-5">Payee / Counterparty</div>
          <div className="col-span-3">Due by</div>
          <div className="col-span-2 text-right">Obligated</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        {byPayee.map((p, i) => {
          const dueDate = new Date(p.due);
          const today = new Date("2026-04-21");
          const days = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          const urgent = days <= 7;
          return (
            <div key={i} className="grid grid-cols-12 px-5 py-3 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50 text-[12px] font-['Lexend:Regular',_sans-serif]">
              <div className="col-span-5">
                <div className="font-['Lexend:Medium',_sans-serif] text-neutral-900">{p.payee}</div>
              </div>
              <div className="col-span-3">
                <span className={`text-[11px] ${urgent ? "text-red-600 font-['Lexend:Medium',_sans-serif]" : "text-neutral-600"}`}>
                  {p.due} · {days}d
                </span>
              </div>
              <div className="col-span-2 text-right font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(p.amt)}</div>
              <div className="col-span-2 text-right">
                <button className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 hover:underline cursor-pointer inline-flex items-center gap-1">
                  Release <ArrowRight size={11} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 13.1.A — RECEIPT VERIFICATION ====================

type ReceiptLine = { desc: string; qty: number; unit: number; total: number };

type ReceiptDoc = {
  id: string;
  employee: string;
  dept: string;
  submitted: string;
  caRef: string;
  imgBg: string;
  extracted: {
    vendor: string;
    tin: string;
    date: string;
    orNumber: string;
    total: number;
    lines: ReceiptLine[];
  };
  confidence: number;
  status: "pending" | "verified" | "flagged";
};

const RECEIPTS: ReceiptDoc[] = [
  {
    id: "RCP-2026-1842",
    employee: "Engr. R. Mapalad",
    dept: "Engineering",
    submitted: "2026-04-19 14:22",
    caRef: "CA-2026-0091",
    imgBg: "linear-gradient(135deg,#fef3c7 0%,#fde68a 40%,#fef9c3 100%)",
    extracted: {
      vendor: "Oriental Hardware Trading",
      tin: "219-482-557-000",
      date: "2026-04-19",
      orNumber: "OR #48217",
      total: 4285,
      lines: [
        { desc: "Cement (40kg)", qty: 12, unit: 285, total: 3420 },
        { desc: "Rebar tie wire", qty: 5, unit: 120, total: 600 },
        { desc: "Construction nails", qty: 1, unit: 265, total: 265 },
      ],
    },
    confidence: 0.97,
    status: "pending",
  },
  {
    id: "RCP-2026-1843",
    employee: "Dr. M. Sabando",
    dept: "Health",
    submitted: "2026-04-19 16:04",
    caRef: "CA-2026-0088",
    imgBg: "linear-gradient(135deg,#dbeafe 0%,#bfdbfe 40%,#eff6ff 100%)",
    extracted: {
      vendor: "MedEast Supply Inc.",
      tin: "004-218-992-000",
      date: "2026-04-18",
      orNumber: "OR #10041",
      total: 18450,
      lines: [
        { desc: "Paracetamol 500mg (100s)", qty: 20, unit: 620, total: 12400 },
        { desc: "Gauze pads sterile", qty: 15, unit: 320, total: 4800 },
        { desc: "Surgical gloves (box)", qty: 5, unit: 250, total: 1250 },
      ],
    },
    confidence: 0.92,
    status: "pending",
  },
  {
    id: "RCP-2026-1844",
    employee: "L. Bascon",
    dept: "LEDIPO",
    submitted: "2026-04-20 09:41",
    caRef: "CA-2026-0093",
    imgBg: "linear-gradient(135deg,#fce7f3 0%,#fbcfe8 40%,#fdf2f8 100%)",
    extracted: {
      vendor: "Visayan Print Works",
      tin: "182-667-441-000",
      date: "2026-04-19",
      orNumber: "OR #88203",
      total: 6780,
      lines: [
        { desc: "Tarpaulin print 8x4ft", qty: 8, unit: 480, total: 3840 },
        { desc: "A4 flyer 500pcs", qty: 3, unit: 980, total: 2940 },
      ],
    },
    confidence: 0.68,
    status: "flagged",
  },
  {
    id: "RCP-2026-1845",
    employee: "J. Pomentil",
    dept: "Social Welfare",
    submitted: "2026-04-20 11:18",
    caRef: "CA-2026-0087",
    imgBg: "linear-gradient(135deg,#dcfce7 0%,#bbf7d0 40%,#f0fdf4 100%)",
    extracted: {
      vendor: "Ormoc Catering Services",
      tin: "003-882-140-000",
      date: "2026-04-20",
      orNumber: "OR #22108",
      total: 8400,
      lines: [
        { desc: "Senior citizen meals (120 pax)", qty: 120, unit: 70, total: 8400 },
      ],
    },
    confidence: 0.98,
    status: "pending",
  },
];

function ReceiptVerification() {
  const [selected, setSelected] = useState<ReceiptDoc>(RECEIPTS[0]);
  const [verified, setVerified] = useState<Set<string>>(new Set());
  const [scanning, setScanning] = useState(false);

  function bulkScan() {
    setScanning(true);
    setTimeout(() => setScanning(false), 1400);
  }

  return (
    <div>
      <PageHeader
        title="Audit Queue: Submitted Receipts"
        subtitle="AI-extracted OR data · auditor just looks and confirms"
        actions={
          <>
            <Btn icon={<Filter size={14} />} label="Filter: All Depts" />
            <Btn
              icon={scanning ? <RefreshCw size={14} className="animate-spin" /> : <ScanLine size={14} />}
              label={scanning ? "Scanning..." : "Bulk AI Scan"}
              variant="primary"
              onClick={bulkScan}
            />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="In Queue" value={String(RECEIPTS.length - verified.size)} trend="awaiting verify" />
        <Stat label="High Confidence" value={String(RECEIPTS.filter((r) => r.confidence >= 0.9).length)} trend="≥ 90% OCR match" tone="good" />
        <Stat label="Flagged Low Conf." value={String(RECEIPTS.filter((r) => r.confidence < 0.8).length)} trend="requires manual review" tone="warn" />
        <Stat label="Avg Verification Time" value="12s" trend="vs 4.5 min manual" tone="good" />
      </div>

      <div className="grid grid-cols-[300px_1fr_1fr] gap-4">
        {/* Queue */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            Receipt Queue
          </div>
          {RECEIPTS.map((r) => {
            const active = selected.id === r.id;
            const done = verified.has(r.id);
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${
                  active ? "bg-neutral-900 text-white" : done ? "bg-emerald-50" : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] ${active ? "text-neutral-400" : "text-neutral-400"}`}>{r.id}</span>
                  {done && <CheckCircle2 size={10} className="text-emerald-600 ml-auto" />}
                  {r.confidence < 0.8 && !done && <AlertTriangle size={10} className="text-amber-500 ml-auto" />}
                </div>
                <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${active ? "text-white" : "text-neutral-900"} truncate`}>
                  {r.employee}
                </div>
                <div className={`text-[10px] font-['Lexend:Regular',_sans-serif] mt-0.5 ${active ? "text-neutral-300" : "text-neutral-500"}`}>
                  {r.dept} · {peso(r.extracted.total)}
                </div>
                <div className="mt-1.5 h-1 bg-neutral-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${r.confidence >= 0.9 ? "bg-emerald-500" : r.confidence >= 0.8 ? "bg-amber-400" : "bg-red-500"}`}
                    style={{ width: `${r.confidence * 100}%` }}
                  />
                </div>
                <div className={`text-[9px] mt-0.5 ${active ? "text-neutral-400" : "text-neutral-500"} font-['Lexend:Regular',_sans-serif]`}>
                  OCR confidence {Math.round(r.confidence * 100)}%
                </div>
              </button>
            );
          })}
        </div>

        {/* Receipt photo */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-200 flex items-center gap-2">
            <Receipt size={13} className="text-neutral-700" />
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700">Official Receipt · Photo</span>
            <span className="ml-auto text-[10px] text-neutral-400 font-mono">{selected.id}</span>
          </div>
          <div className="p-5 bg-neutral-100">
            <div
              className="relative mx-auto rounded shadow-xl overflow-hidden"
              style={{ background: selected.imgBg, width: "100%", maxWidth: 360, aspectRatio: "3/4" }}
            >
              {/* Mock OR layout */}
              <div className="absolute inset-0 p-4 text-neutral-800">
                <div className="text-center pb-2 border-b-2 border-dashed border-neutral-400/60">
                  <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] uppercase tracking-wider">{selected.extracted.vendor}</div>
                  <div className="text-[8px] mt-0.5 font-mono">TIN {selected.extracted.tin}</div>
                  <div className="text-[8px] font-mono mt-0.5">OFFICIAL RECEIPT</div>
                </div>
                <div className="text-[8px] font-mono flex justify-between mt-2 text-neutral-700">
                  <span>{selected.extracted.orNumber}</span>
                  <span>{selected.extracted.date}</span>
                </div>
                <div className="mt-3 space-y-1">
                  {selected.extracted.lines.map((l, i) => (
                    <div key={i} className="flex justify-between text-[9px] font-mono">
                      <span className="truncate pr-2">
                        {l.qty}× {l.desc}
                      </span>
                      <span className="tabular-nums whitespace-nowrap">₱{l.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-2 border-t-2 border-dashed border-neutral-400/60 flex justify-between text-[11px] font-['Lexend:SemiBold',_sans-serif]">
                  <span>TOTAL</span>
                  <span className="tabular-nums">₱{selected.extracted.total.toLocaleString()}.00</span>
                </div>
                <div className="absolute bottom-3 left-4 right-4 text-center text-[7px] font-mono text-neutral-600 opacity-70">
                  VAT-INCLUSIVE · THIS SERVES AS YOUR OFFICIAL RECEIPT
                </div>
              </div>
              {/* Scan overlay animation */}
              {scanning && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="absolute left-0 right-0 h-8 bg-gradient-to-b from-transparent via-emerald-400/60 to-transparent" style={{ animation: "scanMove 1.4s ease-in-out infinite" }} />
                </div>
              )}
            </div>
            <div className="mt-3 text-center text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Submitted via Level 5 mobile · {selected.submitted}
            </div>
          </div>
        </div>

        {/* Extracted data */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-neutral-800 flex items-center gap-2">
            <Sparkles size={13} className="text-emerald-400" />
            <span className="text-[12px] font-['Lexend:Medium',_sans-serif]">AI-Extracted Data</span>
            <span className="ml-auto text-[10px] text-emerald-400 font-['Lexend:Medium',_sans-serif]">
              {Math.round(selected.confidence * 100)}% conf.
            </span>
          </div>
          <div className="p-4 space-y-3 text-[12px]">
            <ExtractRow label="Vendor" value={selected.extracted.vendor} />
            <ExtractRow label="TIN" value={selected.extracted.tin} mono />
            <ExtractRow label="Date" value={selected.extracted.date} mono />
            <ExtractRow label="OR Number" value={selected.extracted.orNumber} mono />
            <ExtractRow label="Cash Advance Ref" value={selected.caRef} mono />
            <div className="border-t border-neutral-800 pt-3">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-1">Line items</div>
              <div className="space-y-1.5">
                {selected.extracted.lines.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px] font-['Lexend:Regular',_sans-serif]">
                    <span className="text-neutral-300 truncate pr-2">{l.qty}× {l.desc}</span>
                    <span className="tabular-nums font-mono text-emerald-400 whitespace-nowrap">₱{l.total.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-neutral-800 pt-3 flex items-center justify-between">
              <span className="text-[11px] text-neutral-400">Extracted total</span>
              <span className="text-[20px] font-['Lexend:SemiBold',_sans-serif] text-emerald-400 tabular-nums">{peso(selected.extracted.total)}</span>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-neutral-800 flex gap-2">
            <button className="flex-1 py-2 rounded-md bg-neutral-800 text-neutral-300 text-[11px] font-['Lexend:Medium',_sans-serif] hover:bg-neutral-700 cursor-pointer">
              Re-scan
            </button>
            <button
              onClick={() => setVerified((v) => new Set([...v, selected.id]))}
              disabled={verified.has(selected.id)}
              className="flex-1 py-2 rounded-md bg-emerald-500 text-white text-[11px] font-['Lexend:Medium',_sans-serif] hover:bg-emerald-400 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1"
            >
              <CheckCircle2 size={12} /> {verified.has(selected.id) ? "Verified" : "Match & Verify"}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scanMove {
          0% { top: -20%; }
          100% { top: 110%; }
        }
      `}</style>
    </div>
  );
}

function ExtractRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[9px] text-neutral-400 uppercase tracking-wider">{label}</div>
      <div className={`text-[12px] text-white ${mono ? "font-mono" : "font-['Lexend:Medium',_sans-serif]"}`}>{value}</div>
    </div>
  );
}

// ==================== 13.1.B — EXACT COST REVIEW (PRICE ANOMALY) ====================

type PriceAnomaly = {
  id: string;
  employee: string;
  dept: string;
  item: string;
  unit: string;
  claimed: number;
  historical: number;
  variance: number;
  severity: "high" | "medium";
  receiptId: string;
  note?: string;
  explained?: string;
};

const ANOMALIES: PriceAnomaly[] = [
  { id: "an1", employee: "L. Bascon", dept: "LEDIPO", item: "Tarpaulin print 8×4ft", unit: "pc", claimed: 480, historical: 220, variance: 118.2, severity: "high", receiptId: "RCP-2026-1844" },
  { id: "an2", employee: "Engr. R. Mapalad", dept: "Engineering", item: "Cement (40kg)", unit: "bag", claimed: 450, historical: 250, variance: 80.0, severity: "high", receiptId: "RCP-2026-1839", note: "Submitted in Cogon field receipt" },
  { id: "an3", employee: "Dr. M. Sabando", dept: "Health", item: "Paracetamol 500mg (100s)", unit: "box", claimed: 620, historical: 540, variance: 14.8, severity: "medium" , receiptId: "RCP-2026-1843"},
  { id: "an4", employee: "Arch. P. Odal", dept: "Planning", item: "Blueprint plotter paper", unit: "roll", claimed: 3200, historical: 1800, variance: 77.8, severity: "high", receiptId: "RCP-2026-1840" },
  { id: "an5", employee: "F. Lariosa", dept: "Legal", item: "Legal folder premium", unit: "dozen", claimed: 780, historical: 640, variance: 21.9, severity: "medium", receiptId: "RCP-2026-1836" },
];

function ExactCostReview() {
  const [items, setItems] = useState(ANOMALIES);
  const [requested, setRequested] = useState<Set<string>>(new Set());

  function requestExplanation(id: string) {
    setRequested((s) => new Set([...s, id]));
  }

  return (
    <div>
      <PageHeader
        title="AI Price Anomaly Detector"
        subtitle="Cross-referenced against 38,000 historical LGU procurement records · graft pre-emption"
        actions={
          <>
            <Btn icon={<Download size={14} />} label="Export COA Flags" />
            <Btn icon={<Bell size={14} />} label="Notify All Flagged" variant="primary" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Items Scanned" value="1,482" trend="this week" />
        <Stat label="Anomalies Detected" value={String(items.length)} trend={`${items.filter((i) => i.severity === "high").length} high severity`} tone="warn" />
        <Stat label="High-Variance Flags" value={String(items.filter((i) => i.variance > 50).length)} trend="> 50% over historical" tone="bad" />
        <Stat label="Explanations Pending" value={String(requested.size)} trend="awaiting employee reply" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
          <div className="col-span-3">Flagged Item</div>
          <div className="col-span-2">Submitted by</div>
          <div className="col-span-2 text-right">Claimed Unit Price</div>
          <div className="col-span-2 text-right">LGU Historical Avg</div>
          <div className="col-span-1 text-right">Variance</div>
          <div className="col-span-2 text-right">Action</div>
        </div>
        {items.map((a) => {
          const pending = requested.has(a.id);
          return (
            <div key={a.id} className={`grid grid-cols-12 px-5 py-4 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50 transition-colors`}>
              <div className="col-span-3">
                <div className="flex items-center gap-2">
                  <Flame size={12} className={a.severity === "high" ? "text-red-600" : "text-amber-500"} />
                  <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{a.item}</span>
                </div>
                <div className="text-[10px] text-neutral-500 font-['Lexend:Regular',_sans-serif] mt-0.5 ml-5">per {a.unit} · receipt {a.receiptId}</div>
              </div>
              <div className="col-span-2 text-[12px] font-['Lexend:Regular',_sans-serif]">
                <div className="text-neutral-900 font-['Lexend:Medium',_sans-serif]">{a.employee}</div>
                <div className="text-[10px] text-neutral-500">{a.dept}</div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-red-600 tabular-nums">₱{a.claimed.toLocaleString()}</div>
              </div>
              <div className="col-span-2 text-right">
                <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-700 tabular-nums">₱{a.historical.toLocaleString()}</div>
              </div>
              <div className="col-span-1 text-right">
                <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${
                  a.severity === "high" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                }`}>
                  +{a.variance.toFixed(0)}%
                </span>
              </div>
              <div className="col-span-2 text-right">
                {pending ? (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-[10px] font-['Lexend:Medium',_sans-serif]">
                    <MessageSquare size={10} /> Explanation requested
                  </span>
                ) : (
                  <button
                    onClick={() => requestExplanation(a.id)}
                    className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 hover:underline cursor-pointer"
                  >
                    Request Explanation →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-white border border-neutral-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={14} className="text-neutral-500 mt-0.5" />
        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">
          LGU historical averages are computed from <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">38,214 prior procurements</span> across all City Hall offices over the past 36 months, weighted by recency. The threshold for "high severity" is ≥50% variance from the rolling average.
        </div>
      </div>
    </div>
  );
}

// ==================== 13.1.C — CASH ADVANCE MATCHING (EQUATION) ====================

type CashAdvance = {
  id: string;
  employee: string;
  dept: string;
  purpose: string;
  advanced: number;
  verified: number;
  returned: number;
  overdueDays: number;
};

const CASH_ADVANCES: CashAdvance[] = [
  { id: "CA-2026-0091", employee: "Engr. R. Mapalad", dept: "Engineering", purpose: "Eco-Park P2 materials advance", advanced: 10000, verified: 8500, returned: 0, overdueDays: 0 },
  { id: "CA-2026-0088", employee: "Dr. M. Sabando", dept: "Health", purpose: "Provincial medical outreach", advanced: 25000, verified: 18450, returned: 6550, overdueDays: 0 },
  { id: "CA-2026-0093", employee: "L. Bascon", dept: "LEDIPO", purpose: "Tourism campaign pilot", advanced: 12000, verified: 6780, returned: 0, overdueDays: 4 },
  { id: "CA-2026-0087", employee: "J. Pomentil", dept: "Social Welfare", purpose: "Senior citizen event", advanced: 10000, verified: 8400, returned: 1600, overdueDays: 0 },
  { id: "CA-2026-0072", employee: "R. Alcantara", dept: "Environment", purpose: "Brgy. tree planting drive", advanced: 8000, verified: 4200, returned: 0, overdueDays: 38 },
];

function CashAdvanceMatching() {
  const [selected, setSelected] = useState<CashAdvance>(CASH_ADVANCES[0]);
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

  const filtered = showOverdueOnly ? CASH_ADVANCES.filter((c) => c.overdueDays > 30) : CASH_ADVANCES;
  const expected = selected.advanced - selected.verified;
  const shortfall = expected - selected.returned;
  const balanced = shortfall === 0;

  return (
    <div>
      <PageHeader
        title="Liquidation Balancer"
        subtitle="Mathematical gate · you cannot close the cycle until every centavo reconciles"
        actions={
          <button
            onClick={() => setShowOverdueOnly((v) => !v)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors border ${
              showOverdueOnly ? "bg-red-50 text-red-700 border-red-200" : "bg-white text-neutral-700 border-neutral-200"
            }`}
          >
            <Filter size={13} /> Overdue &gt; 30 days
          </button>
        }
      />

      <div className="grid grid-cols-[300px_1fr] gap-4">
        {/* Queue */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            Cash Advances ({filtered.length})
          </div>
          {filtered.map((c) => {
            const active = selected.id === c.id;
            const short = c.advanced - c.verified - c.returned;
            const overdue = c.overdueDays > 30;
            return (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${active ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`font-mono text-[10px] ${active ? "text-neutral-400" : "text-neutral-400"}`}>{c.id}</span>
                  {overdue && <span className="px-1 py-0.5 rounded bg-red-600 text-white text-[8px] font-['Lexend:Medium',_sans-serif] uppercase">{c.overdueDays}d</span>}
                </div>
                <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${active ? "text-white" : "text-neutral-900"}`}>{c.employee}</div>
                <div className={`text-[10px] ${active ? "text-neutral-300" : "text-neutral-500"} mt-0.5`}>{c.dept} · {peso(c.advanced)}</div>
                <div className={`text-[10px] font-['Lexend:Regular',_sans-serif] mt-1 ${short === 0 ? (active ? "text-emerald-400" : "text-emerald-600") : active ? "text-amber-400" : "text-amber-600"}`}>
                  {short === 0 ? "✓ Reconciled" : `₱${short.toLocaleString()} unreconciled`}
                </div>
              </button>
            );
          })}
        </div>

        {/* Equation UI */}
        <div className="bg-gradient-to-br from-neutral-50 to-white border-2 border-neutral-200 rounded-xl p-6">
          <div className="flex items-center justify-between mb-1">
            <div>
              <div className="text-[11px] font-mono text-neutral-400">{selected.id}</div>
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mt-0.5">{selected.employee}</div>
              <div className="text-[11px] text-neutral-500">{selected.dept} · {selected.purpose}</div>
            </div>
            {selected.overdueDays > 30 && (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-red-100 text-red-700 text-[11px] font-['Lexend:Medium',_sans-serif]">
                <Flame size={11} /> Overdue {selected.overdueDays} days
              </span>
            )}
          </div>

          {/* The Equation */}
          <div className="mt-8 flex items-stretch gap-4">
            <EqBlock label="Original Cash Advance" value={selected.advanced} tone="neutral" />
            <OpChar>−</OpChar>
            <EqBlock label="Total Verified Receipts" value={selected.verified} tone="warn" />
            <OpChar>=</OpChar>
            <EqBlock label="Expected Return" value={expected} tone="blue" big />
          </div>

          <div className="mt-6 flex items-stretch gap-4">
            <EqBlock label="Expected Return" value={expected} tone="blue" />
            <OpChar>−</OpChar>
            <EqBlock label="Physical Cash Returned to Treasury" value={selected.returned} tone={selected.returned > 0 ? "good" : "neutral"} />
            <OpChar>=</OpChar>
            <EqBlock
              label={shortfall === 0 ? "Balanced" : "Shortfall"}
              value={shortfall}
              tone={shortfall === 0 ? "good" : "bad"}
              big
            />
          </div>

          {/* Status + action */}
          <div className="mt-7 p-4 rounded-lg border-2 flex items-center gap-3"
            style={{ borderColor: balanced ? "#10b981" : "#f59e0b", background: balanced ? "#ecfdf5" : "#fffbeb" }}>
            {balanced ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Clock size={20} className="text-amber-600" />}
            <div className="flex-1">
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif]" style={{ color: balanced ? "#047857" : "#b45309" }}>
                {balanced ? "Equation balanced" : "Cycle cannot close"}
              </div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif]" style={{ color: balanced ? "#047857" : "#b45309" }}>
                {balanced
                  ? "Physical cash has been reconciled. Ready to seal the liquidation."
                  : `₱${shortfall.toLocaleString()} must be physically returned before the auditor can close this cycle.`}
              </div>
            </div>
            <Btn
              icon={<Shield size={13} />}
              label={balanced ? "Seal Liquidation" : "Blocked — Awaiting Return"}
              variant={balanced ? "success" : "secondary"}
              disabled={!balanced}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function EqBlock({ label, value, tone, big }: { label: string; value: number; tone: "neutral" | "good" | "warn" | "bad" | "blue"; big?: boolean }) {
  const tones = {
    neutral: { bg: "bg-white border-neutral-200", txt: "text-neutral-900" },
    good: { bg: "bg-emerald-50 border-emerald-200", txt: "text-emerald-700" },
    warn: { bg: "bg-amber-50 border-amber-200", txt: "text-amber-700" },
    bad: { bg: "bg-red-50 border-red-200", txt: "text-red-700" },
    blue: { bg: "bg-blue-50 border-blue-200", txt: "text-blue-700" },
  };
  const t = tones[tone];
  return (
    <div className={`flex-1 rounded-xl border-2 ${t.bg} p-4`}>
      <div className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{label}</div>
      <div className={`${big ? "text-[26px]" : "text-[20px]"} font-['Lexend:SemiBold',_sans-serif] tabular-nums ${t.txt} mt-0.5`}>{peso(value)}</div>
    </div>
  );
}

function OpChar({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-400 w-4 flex-shrink-0">{children}</div>;
}

// ==================== 13.2.A — UNSPENT FUNDS (ESCALATION KANBAN) ====================

type UnspentCard = {
  id: string;
  employee: string;
  dept: string;
  amount: number;
  daysSinceVerify: number;
  col: "verified" | "viber" | "memo" | "deducted";
};

const UNSPENT_INITIAL: UnspentCard[] = [
  { id: "u1", employee: "Engr. R. Mapalad", dept: "Engineering", amount: 1500, daysSinceVerify: 3, col: "verified" },
  { id: "u2", employee: "J. Pomentil", dept: "Social Welfare", amount: 1600, daysSinceVerify: 7, col: "verified" },
  { id: "u3", employee: "K. Abarquez", dept: "GSO", amount: 820, daysSinceVerify: 12, col: "verified" },
  { id: "u4", employee: "Dr. M. Sabando", dept: "Health", amount: 6550, daysSinceVerify: 17, col: "viber" },
  { id: "u5", employee: "L. Bascon", dept: "LEDIPO", amount: 5220, daysSinceVerify: 22, col: "viber" },
  { id: "u6", employee: "T. Salcedo", dept: "Tourism", amount: 940, daysSinceVerify: 24, col: "viber" },
  { id: "u7", employee: "R. Alcantara", dept: "Environment", amount: 3800, daysSinceVerify: 38, col: "memo" },
  { id: "u8", employee: "O. Perez", dept: "CENRO", amount: 1200, daysSinceVerify: 42, col: "memo" },
  { id: "u9", employee: "G. Hingpit", dept: "City Planning", amount: 2100, daysSinceVerify: 58, col: "deducted" },
];

const UNSPENT_COLS: { id: UnspentCard["col"]; label: string; tint: string; chip: string; icon: React.ReactNode; hint: string }[] = [
  { id: "verified", label: "Receipts Verified · Owes Change", tint: "bg-neutral-50", chip: "bg-neutral-200 text-neutral-700", icon: <Receipt size={12} />, hint: "0–14 days: grace period" },
  { id: "viber", label: "Viber Warning Sent", tint: "bg-amber-50", chip: "bg-amber-100 text-amber-700", icon: <MessageSquare size={12} />, hint: "15–29 days: auto-nudged" },
  { id: "memo", label: "HR Memo · Payroll Deduction Drafted", tint: "bg-orange-50", chip: "bg-orange-100 text-orange-700", icon: <FileText size={12} />, hint: "30+ days: BPA-drafted memo" },
  { id: "deducted", label: "Deducted from Payroll", tint: "bg-emerald-50", chip: "bg-emerald-100 text-emerald-700", icon: <CheckCircle2 size={12} />, hint: "resolved · funds returned" },
];

function UnspentFunds() {
  const [cards, setCards] = useState(UNSPENT_INITIAL);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  function onDrop(target: UnspentCard["col"]) {
    if (!draggedId) return;
    setCards((cs) => cs.map((c) => (c.id === draggedId ? { ...c, col: target } : c)));
    setDraggedId(null);
  }

  const totalOutstanding = cards.filter((c) => c.col !== "deducted").reduce((s, c) => s + c.amount, 0);

  return (
    <div>
      <PageHeader
        title="Outstanding Treasury Returns"
        subtitle="BPA auto-escalates: 15d Viber → 30d HR memo → 45d payroll deduction"
        actions={
          <>
            <Btn icon={<MessageSquare size={14} />} label="Broadcast Viber Reminder" />
            <Btn icon={<Undo2 size={14} />} label="Issue Salary Deduction Notice" variant="primary" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Outstanding" value={peso(totalOutstanding)} trend={`${cards.filter((c) => c.col !== "deducted").length} employees`} tone="warn" />
        <Stat label="At HR-Memo Stage" value={String(cards.filter((c) => c.col === "memo").length)} trend="30+ days overdue" tone="bad" />
        <Stat label="Auto-Recovered · 30d" value="₱ 48,220" trend="via payroll deduction" tone="good" />
        <Stat label="Viber Nudges Sent" value="142" trend="BPA-automated" />
      </div>

      <div className="grid grid-cols-4 gap-3">
        {UNSPENT_COLS.map((col) => {
          const items = cards.filter((c) => c.col === col.id);
          const sum = items.reduce((s, c) => s + c.amount, 0);
          return (
            <div
              key={col.id}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onDrop(col.id)}
              className={`${col.tint} rounded-xl p-3 min-h-[520px]`}
            >
              <div className="flex items-center gap-2 px-1 mb-1">
                <span className="text-neutral-700">{col.icon}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] ${col.chip}`}>{items.length}</span>
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-800 leading-tight">{col.label}</span>
              </div>
              <div className="text-[10px] px-1 text-neutral-500 mb-1">{col.hint}</div>
              <div className="text-[10px] px-1 text-neutral-700 font-['Lexend:Medium',_sans-serif] mb-3 tabular-nums">{peso(sum)} outstanding</div>
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
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{c.employee}</span>
                      <span className={`text-[9px] font-['Lexend:Medium',_sans-serif] px-1 py-0.5 rounded ${
                        c.daysSinceVerify >= 30 ? "bg-red-100 text-red-700" : c.daysSinceVerify >= 15 ? "bg-amber-100 text-amber-700" : "bg-neutral-100 text-neutral-600"
                      }`}>
                        {c.daysSinceVerify}d
                      </span>
                    </div>
                    <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{c.dept}</div>
                    <div className="mt-2 pt-2 border-t border-neutral-100 flex items-center justify-between">
                      <span className="text-[9px] text-neutral-400 font-mono">spare change</span>
                      <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(c.amount)}</span>
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

// ==================== 13.2.B — CRYPTOGRAPHIC VERIFICATION (SEAL) ====================

type SealCandidate = {
  id: string;
  employee: string;
  dept: string;
  advance: number;
  receiptCount: number;
  verifiedTotal: number;
  returned: number;
  orsRef: string;
};

const SEAL_READY: SealCandidate[] = [
  { id: "LIQ-2026-0482", employee: "Engr. R. Mapalad", dept: "Engineering", advance: 10000, receiptCount: 8, verifiedTotal: 8500, returned: 1500, orsRef: "ORS-2026-0482" },
  { id: "LIQ-2026-0483", employee: "Dr. M. Sabando", dept: "Health", advance: 25000, receiptCount: 14, verifiedTotal: 18450, returned: 6550, orsRef: "ORS-2026-0483" },
  { id: "LIQ-2026-0487", employee: "J. Pomentil", dept: "Social Welfare", advance: 10000, receiptCount: 3, verifiedTotal: 8400, returned: 1600, orsRef: "ORS-2026-0485" },
];

function CryptographicVerification() {
  const [selected, setSelected] = useState<SealCandidate>(SEAL_READY[0]);
  const [sealing, setSealing] = useState(false);
  const [sealed, setSealed] = useState<{ id: string; hash: string; block: number } | null>(null);

  function doSeal() {
    setSealing(true);
    setTimeout(() => {
      const hash = `0x${Array.from({ length: 8 }).map(() => Math.random().toString(16).slice(2, 10)).join("")}`;
      setSealed({ id: selected.id, hash, block: 486000 + Math.floor(Math.random() * 1000) });
      setSealing(false);
    }, 1800);
  }

  return (
    <div>
      <PageHeader
        title="Seal Liquidation · COA Proof Generator"
        subtitle="Bundles ORS + receipts + return log into a single Merkle hash, forwarded to Immutable Audit"
        actions={<Btn icon={<Shield size={14} />} label="View Immutable Audit" />}
      />

      <div className="grid grid-cols-[320px_1fr] gap-4">
        {/* Ready queue */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-neutral-200 text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            Ready to Seal ({SEAL_READY.length})
          </div>
          {SEAL_READY.map((s) => {
            const active = selected.id === s.id;
            const isSealed = sealed?.id === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left px-4 py-3 border-b border-neutral-100 last:border-0 cursor-pointer transition-colors ${active ? "bg-neutral-900 text-white" : isSealed ? "bg-emerald-50" : "hover:bg-neutral-50"}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-mono text-[10px] ${active ? "text-neutral-400" : "text-neutral-400"}`}>{s.id}</span>
                  {isSealed && <Lock size={10} className="text-emerald-600 ml-auto" />}
                </div>
                <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] ${active ? "text-white" : "text-neutral-900"}`}>{s.employee}</div>
                <div className={`text-[10px] ${active ? "text-neutral-300" : "text-neutral-500"}`}>{s.dept}</div>
                <div className={`text-[11px] mt-1 ${active ? "text-emerald-400" : "text-emerald-600"}`}>✓ Equation balanced</div>
              </button>
            );
          })}
        </div>

        {/* Seal panel */}
        <div className="bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 text-white rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
            <Fingerprint size={14} className="text-emerald-400" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Liquidation Package · {selected.id}</span>
            {sealed?.id === selected.id && (
              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-emerald-400 font-['Lexend:Medium',_sans-serif]">
                <CheckCircle2 size={10} /> Sealed
              </span>
            )}
          </div>

          <div className="p-5">
            {/* Bundle contents */}
            <div className="text-[11px] text-neutral-400 uppercase tracking-wider mb-3">Bundled for Merkle hashing</div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <BundleChip icon={<FileText size={14} />} label="Obligation Request" value={selected.orsRef} />
              <BundleChip icon={<Receipt size={14} />} label="Verified Receipts" value={`${selected.receiptCount} photos`} />
              <BundleChip icon={<Undo2 size={14} />} label="Return Log" value={peso(selected.returned)} />
            </div>

            {/* Equation preview */}
            <div className="bg-neutral-950 border border-neutral-800 rounded-lg p-4 mb-5">
              <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">Reconciliation proof</div>
              <div className="font-mono text-[11px] text-neutral-300 space-y-1">
                <div>advance   = <span className="text-white">{peso(selected.advance)}</span></div>
                <div>verified  = <span className="text-amber-400">{peso(selected.verifiedTotal)}</span></div>
                <div>returned  = <span className="text-emerald-400">{peso(selected.returned)}</span></div>
                <div className="pt-1 mt-1 border-t border-neutral-800">delta     = <span className="text-emerald-400">{peso(selected.advance - selected.verifiedTotal - selected.returned)} (balanced)</span></div>
              </div>
            </div>

            {/* Hash output */}
            <div className="text-[10px] text-neutral-400 uppercase tracking-wider mb-2">SHA-256 · blockchain commit</div>
            <div className="font-mono text-[11px] break-all bg-neutral-950 border border-neutral-800 rounded-lg p-3 mb-4 min-h-[56px] flex items-center">
              {sealing ? (
                <span className="text-amber-400 flex items-center gap-2">
                  <RefreshCw size={12} className="animate-spin" /> Hashing Merkle tree across {selected.receiptCount + 2} leaves...
                </span>
              ) : sealed?.id === selected.id ? (
                <span className="text-emerald-400">{sealed.hash}</span>
              ) : (
                <span className="text-neutral-600">— not yet sealed —</span>
              )}
            </div>

            {sealed?.id === selected.id && (
              <div className="flex items-center justify-between text-[11px] font-['Lexend:Regular',_sans-serif] mb-4">
                <span className="text-neutral-400">Block height</span>
                <span className="font-mono text-white">#{sealed.block.toLocaleString()}</span>
              </div>
            )}

            <div className="flex gap-2">
              <Btn icon={<Download size={13} />} label="Export Package (PDF)" />
              <button
                onClick={doSeal}
                disabled={sealing || sealed?.id === selected.id}
                className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] hover:bg-emerald-400 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <Shield size={13} />
                {sealed?.id === selected.id ? "Sealed & Forwarded ✓" : sealing ? "Sealing..." : "Seal Liquidation → Immutable Audit"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BundleChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 uppercase tracking-wider mb-1">
        {icon} {label}
      </div>
      <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-white">{value}</div>
    </div>
  );
}

// ==================== 13.2.C — LGU POOL RETURNS (GENERAL FUND SWEEP) ====================

type PoolReturn = {
  id: number;
  employee: string;
  dept: string;
  amount: number;
  returnedOn: string;
  swept: boolean;
};

const POOL_RETURNS: PoolReturn[] = [
  { id: 1, employee: "Engr. R. Mapalad", dept: "Engineering", amount: 1500, returnedOn: "2026-04-16", swept: false },
  { id: 2, employee: "J. Pomentil", dept: "Social Welfare", amount: 1600, returnedOn: "2026-04-17", swept: false },
  { id: 3, employee: "Dr. M. Sabando", dept: "Health", amount: 6550, returnedOn: "2026-04-17", swept: false },
  { id: 4, employee: "K. Abarquez", dept: "GSO", amount: 820, returnedOn: "2026-04-18", swept: false },
  { id: 5, employee: "T. Salcedo", dept: "Tourism", amount: 940, returnedOn: "2026-04-18", swept: false },
  { id: 6, employee: "O. Perez", dept: "CENRO", amount: 1200, returnedOn: "2026-04-19", swept: false },
  { id: 7, employee: "F. Lariosa", dept: "Legal", amount: 2100, returnedOn: "2026-04-19", swept: false },
  { id: 8, employee: "G. Hingpit", dept: "Planning", amount: 780, returnedOn: "2026-04-20", swept: false },
  { id: 9, employee: "R. Alcantara", dept: "Environment", amount: 3800, returnedOn: "2026-04-20", swept: false },
  { id: 10, employee: "L. Bascon", dept: "LEDIPO", amount: 5220, returnedOn: "2026-04-20", swept: false },
];

function LGUPoolReturns() {
  const [rows, setRows] = useState(POOL_RETURNS);
  const [selected, setSelected] = useState<Set<number>>(new Set(POOL_RETURNS.map((r) => r.id)));
  const [sweeping, setSweeping] = useState(false);
  const [swept, setSwept] = useState<{ amount: number; hash: string } | null>(null);

  const unsweptRows = rows.filter((r) => !r.swept);
  const selectedRows = unsweptRows.filter((r) => selected.has(r.id));
  const totalSelected = selectedRows.reduce((s, r) => s + r.amount, 0);

  function toggle(id: number) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function doSweep() {
    if (totalSelected === 0) return;
    setSweeping(true);
    setTimeout(() => {
      const hash = `0x${Array.from({ length: 6 }).map(() => Math.random().toString(16).slice(2, 10)).join("")}`;
      setRows((rs) => rs.map((r) => (selected.has(r.id) ? { ...r, swept: true } : r)));
      setSwept({ amount: totalSelected, hash });
      setSelected(new Set());
      setSweeping(false);
    }, 1200);
  }

  const sweptTotal = rows.filter((r) => r.swept).reduce((s, r) => s + r.amount, 0);

  return (
    <div>
      <PageHeader
        title="General Fund Sweep · Macro Re-Injection"
        subtitle="Accumulated spare change returned from field workers · re-inject into appropriation buckets"
        actions={
          <>
            <Btn icon={<ArrowLeftRight size={14} />} label="Choose Target Bucket: General Fund" />
          </>
        }
      />

      <div className="grid grid-cols-4 gap-3 mb-5">
        <Stat label="Rows Available" value={String(unsweptRows.length)} trend="spare change ready to sweep" />
        <Stat label="Rows Selected" value={String(selected.size)} trend={peso(totalSelected)} />
        <Stat label="Swept This Session" value={peso(sweptTotal)} trend="re-injected to GF" tone="good" />
        <Stat label="YTD General Fund Replenishment" value="₱ 1.28M" trend="2026 running total" tone="good" />
      </div>

      {swept && (
        <div className="bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 rounded-lg p-3 mb-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-emerald-800">
              Swept {peso(swept.amount)} into General Fund · re-available to SP for appropriation
            </div>
            <div className="font-mono text-[10px] text-emerald-700 mt-0.5">{swept.hash}</div>
          </div>
          <ExternalLink size={13} className="text-emerald-600" />
        </div>
      )}

      <div className="grid grid-cols-[1fr_320px] gap-4">
        {/* Ledger */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-neutral-200 flex items-center gap-2">
            <Landmark size={13} className="text-neutral-700" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Pool Return Ledger</span>
            <span className="ml-auto text-[11px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">Tick to include in sweep</span>
          </div>
          <div className="grid grid-cols-12 px-5 py-2 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
            <div className="col-span-1"></div>
            <div className="col-span-4">Employee</div>
            <div className="col-span-3">Department</div>
            <div className="col-span-2">Returned on</div>
            <div className="col-span-2 text-right">Amount</div>
          </div>
          {rows.map((r) => {
            const isSelected = selected.has(r.id);
            return (
              <label
                key={r.id}
                className={`grid grid-cols-12 px-5 py-3 border-b border-neutral-100 last:border-0 items-center hover:bg-neutral-50 cursor-pointer text-[12px] font-['Lexend:Regular',_sans-serif] ${
                  r.swept ? "opacity-40" : ""
                }`}
              >
                <div className="col-span-1">
                  <input
                    type="checkbox"
                    checked={isSelected && !r.swept}
                    disabled={r.swept}
                    onChange={() => toggle(r.id)}
                    className="w-4 h-4 accent-neutral-900 cursor-pointer"
                  />
                </div>
                <div className="col-span-4 font-['Lexend:Medium',_sans-serif] text-neutral-900">
                  {r.employee}
                  {r.swept && <span className="ml-2 text-[9px] text-emerald-600 font-['Lexend:Medium',_sans-serif] uppercase">· swept</span>}
                </div>
                <div className="col-span-3 text-neutral-600">{r.dept}</div>
                <div className="col-span-2 text-neutral-500">{r.returnedOn}</div>
                <div className="col-span-2 text-right font-['Lexend:SemiBold',_sans-serif] text-neutral-900 tabular-nums">{peso(r.amount)}</div>
              </label>
            );
          })}
        </div>

        {/* Sweep summary */}
        <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 text-white rounded-xl overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
            <ArrowLeftRight size={14} className="text-emerald-400" />
            <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif]">Sweep Summary</span>
          </div>
          <div className="p-5">
            <div className="text-[10px] uppercase tracking-wider text-neutral-400">Selected for sweep</div>
            <div className="text-[32px] font-['Lexend:SemiBold',_sans-serif] text-emerald-400 tabular-nums">{peso(totalSelected)}</div>
            <div className="text-[11px] text-neutral-400 mt-1">from {selectedRows.length} employees</div>

            <div className="mt-5 pt-5 border-t border-neutral-800 space-y-2">
              <div className="flex items-center gap-2 text-[11px]">
                <Minus size={11} className="text-neutral-500" />
                <span className="text-neutral-400">Source</span>
                <span className="ml-auto text-white">Pool Return Ledger</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Equal size={11} className="text-neutral-500" />
                <span className="text-neutral-400">Target bucket</span>
                <span className="ml-auto text-white font-['Lexend:Medium',_sans-serif]">General Fund (GF-001)</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <Info size={11} className="text-neutral-500" />
                <span className="text-neutral-400">GF balance (pre-sweep)</span>
                <span className="ml-auto text-white tabular-nums">₱ 42.8M</span>
              </div>
              <div className="flex items-center gap-2 text-[11px]">
                <TrendingUp size={11} className="text-emerald-400" />
                <span className="text-emerald-400">GF balance (post-sweep)</span>
                <span className="ml-auto text-emerald-400 tabular-nums font-['Lexend:Medium',_sans-serif]">
                  ₱{(42_800_000 + totalSelected).toLocaleString("en-PH")}
                </span>
              </div>
            </div>

            <button
              onClick={doSweep}
              disabled={totalSelected === 0 || sweeping}
              className="w-full mt-5 py-2.5 bg-emerald-500 text-white rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] hover:bg-emerald-400 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {sweeping ? <RefreshCw size={13} className="animate-spin" /> : <ArrowLeftRight size={13} />}
              {sweeping ? "Sweeping..." : "Execute Sweep to General Fund"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 14.1.A — HASHED LIQUIDATIONS ====================

type HashedVoucher = {
  id: string;
  voucher: string;
  payee: string;
  amount: number;
  sealed: string;
  block: number;
  hash: string;
  status: "verified" | "verified" | "verified";
};

const HASHED_VOUCHERS: HashedVoucher[] = [
  { id: "h1", voucher: "DV-2026-04-00318", payee: "Tanchuling Construction Corp.", amount: 5_240_000, sealed: "Apr 18, 2026 · 14:22:10", block: 88421, hash: "0x77229e51a44cd0fb1e8326c579b0ad14b3a9c1ffde2a8e014dbe7723a5f1b0c9", status: "verified" },
  { id: "h2", voucher: "DV-2026-04-00319", payee: "LGU Ormoc Payroll Batch 04-B", amount: 12_800_000, sealed: "Apr 18, 2026 · 14:30:01", block: 88422, hash: "0x3fa1bcd09e8711244ab6ec90ffa3d8c2771ae4d3a8c5e78190bb231fd4ea9c10", status: "verified" },
  { id: "h3", voucher: "DV-2026-04-00320", payee: "Medika Pharmaceuticals Inc.", amount: 1_680_000, sealed: "Apr 18, 2026 · 14:44:47", block: 88423, hash: "0xb9ec220f451aa88c713e609dcba4120e9ffcd1a73b826408ea7718fa0c9e14bd", status: "verified" },
  { id: "h4", voucher: "DV-2026-04-00321", payee: "Ormoc Electric Utility (OEDC)", amount: 842_300, sealed: "Apr 18, 2026 · 15:01:22", block: 88424, hash: "0x22ef0911c6a84bd22d71a3f408cab5e09011af3c9b764102fffe2e0a8c73115e", status: "verified" },
  { id: "h5", voucher: "DV-2026-04-00322", payee: "Sagip Kabataan Feeding Program", amount: 360_000, sealed: "Apr 18, 2026 · 15:12:05", block: 88425, hash: "0xa49ec6da3280114411cb90ec2af8b70c55d9701af22683de8712cc402ae8f7d4", status: "verified" },
];

function HashedLiquidations() {
  const [selected, setSelected] = useState<HashedVoucher>(HASHED_VOUCHERS[0]);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(selected.hash); setCopied(true); setTimeout(() => setCopied(false), 1400); };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Hashed Liquidations"
        subtitle="SHA-256 cryptographic seals · Immutable Expense Ledger"
        actions={<><Btn icon={<Download size={13} />} label="Export: COA Verification File" /><Btn icon={<Shield size={13} />} label="Independent Hash Checker" variant="primary" /></>}
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Sealed This Quarter" value="2,184" trend="Vouchers hashed" tone="neutral" />
        <Stat label="Total Disbursed" value={pesoShort(1_842_000_000)} trend="Cryptographically verified" tone="good" />
        <Stat label="Block Height" value="88,425" trend="Latest commit · 15:12 UTC" tone="neutral" />
        <Stat label="Hash Collisions" value="0" trend="Since genesis block" tone="good" />
      </div>

      <div className="grid grid-cols-[1.3fr_1fr] gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-neutral-100 flex items-center gap-2">
            <Hash size={14} className="text-neutral-900" />
            <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">Sealed Voucher Registry</div>
            <div className="ml-auto text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Read-only · SHA-256</div>
          </div>
          <div className="divide-y divide-neutral-100">
            {HASHED_VOUCHERS.map(v => (
              <button key={v.id} onClick={() => setSelected(v)} className={`w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors ${selected.id === v.id ? "bg-emerald-50/40" : ""}`}>
                <div className="flex items-center justify-between mb-1">
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{v.voucher}</div>
                  <div className="flex items-center gap-1 text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5">
                    <CheckCircle2 size={10} /> VERIFIED
                  </div>
                </div>
                <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">{v.payee} · {peso(v.amount)}</div>
                <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mt-1 font-mono truncate">{v.hash.slice(0, 40)}…</div>
              </button>
            ))}
          </div>
        </div>

        <div className="bg-neutral-950 rounded-xl p-5 text-neutral-100 relative overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none" style={{ backgroundImage: "repeating-linear-gradient(0deg,#fff 0 1px,transparent 1px 3px)" }} />
          <div className="relative">
            <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-emerald-400 uppercase tracking-wider mb-1">
              <KeyRound size={12} /> Cryptographic Seal
            </div>
            <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] mb-4">{selected.voucher}</div>

            <div className="space-y-3 text-[11px] font-['Lexend:Regular',_sans-serif]">
              <div><div className="text-neutral-500 mb-0.5">Payee</div><div className="text-neutral-100">{selected.payee}</div></div>
              <div className="grid grid-cols-2 gap-3">
                <div><div className="text-neutral-500 mb-0.5">Amount</div><div className="text-neutral-100 tabular-nums">{peso(selected.amount)}</div></div>
                <div><div className="text-neutral-500 mb-0.5">Block #</div><div className="text-neutral-100 tabular-nums">{selected.block.toLocaleString()}</div></div>
              </div>
              <div><div className="text-neutral-500 mb-0.5">Sealed At</div><div className="text-neutral-100">{selected.sealed}</div></div>

              <div>
                <div className="text-neutral-500 mb-1 flex items-center justify-between">
                  <span>SHA-256 Digest</span>
                  <button onClick={copy} className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                    <Copy size={10} /> {copied ? "Copied" : "Copy"}
                  </button>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 font-mono text-[10.5px] text-emerald-300 break-all leading-relaxed">{selected.hash}</div>
              </div>

              <div className="bg-emerald-950/40 border border-emerald-900 rounded-lg p-3 mt-2">
                <div className="flex items-start gap-2">
                  <Shield size={12} className="text-emerald-400 mt-0.5" />
                  <div className="text-[11px] text-emerald-200 leading-relaxed">
                    If COA hashes the original receipt file with SHA-256 and the digest matches, the document is mathematically proven unaltered since {selected.sealed}.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 14.1.B — NON-REPUDIATION RECORDS ====================

type Signer = { name: string; role: string; method: string; timestamp: string; device: string; ip: string };

const SIGNERS: Signer[] = [
  { name: "Engr. Rolando Dacayo", role: "Department Head · Engineering Office", method: "PhilSys Biometric · Fingerprint", timestamp: "Apr 18, 2026 · 10:14:22", device: "eFlow Kiosk · Engineering-01", ip: "10.14.22.5" },
  { name: "Atty. Marissa Uy", role: "City Accountant", method: "PhilSys eSign · PIN + OTP", timestamp: "Apr 18, 2026 · 11:48:07", device: "MacBook Pro · MU-042", ip: "10.12.4.118" },
  { name: "Hon. Lucy Torres-Gomez", role: "City Mayor", method: "PhilSys Biometric · Face + PIN", timestamp: "Apr 18, 2026 · 13:02:59", device: "iPad · Mayor's Office", ip: "10.10.1.7" },
];

function NonRepudiationRecords() {
  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Non-Repudiation Records"
        subtitle="Biometric & cryptographic signature chain · DV-2026-04-00318"
        actions={<><Btn icon={<FileText size={13} />} label="View Voucher" /><Btn icon={<Download size={13} />} label="Export Signature Chain" variant="primary" /></>}
      />

      <div className="grid grid-cols-3 gap-3 mb-6">
        <Stat label="Signatures Captured" value="3 / 3" trend="All parties attested" tone="good" />
        <Stat label="Authentication Method" value="PhilSys" trend="National ID biometrics" tone="neutral" />
        <Stat label="Repudiation Risk" value="0.00%" trend="Cryptographically bound" tone="good" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-6">
          <Fingerprint size={16} className="text-neutral-900" />
          <div className="text-[14px] font-['Lexend:Medium',_sans-serif] text-neutral-900">Signature Chain of Custody</div>
          <div className="ml-auto text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">DV-2026-04-00318 · ₱5,240,000</div>
        </div>

        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-emerald-200" />
          <div className="space-y-6">
            {SIGNERS.map((s, i) => (
              <div key={i} className="relative pl-10">
                <div className="absolute left-0 top-1 w-[30px] h-[30px] rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center">
                  <Fingerprint size={13} className="text-emerald-700" />
                </div>
                <div className="flex items-start justify-between mb-1">
                  <div>
                    <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{s.name}</div>
                    <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{s.role}</div>
                  </div>
                  <div className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-2 py-0.5 flex items-center gap-1">
                    <CheckCircle2 size={10} /> IDENTITY BOUND
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-3 bg-neutral-50 border border-neutral-200 rounded-lg p-3 text-[10.5px] font-['Lexend:Regular',_sans-serif]">
                  <div><div className="text-neutral-400 uppercase tracking-wider text-[9px] mb-0.5">Method</div><div className="text-neutral-800">{s.method}</div></div>
                  <div><div className="text-neutral-400 uppercase tracking-wider text-[9px] mb-0.5">Timestamp</div><div className="text-neutral-800 tabular-nums">{s.timestamp}</div></div>
                  <div><div className="text-neutral-400 uppercase tracking-wider text-[9px] mb-0.5">Device</div><div className="text-neutral-800">{s.device}</div></div>
                  <div><div className="text-neutral-400 uppercase tracking-wider text-[9px] mb-0.5">IP</div><div className="text-neutral-800 font-mono">{s.ip}</div></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <Info size={13} className="text-neutral-600 mt-0.5" />
            <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-relaxed">
              <span className="font-['Lexend:Medium',_sans-serif] text-neutral-900">Non-repudiation principle.</span> Each signer's PhilSys identity is cryptographically bound to the voucher hash above. The statement "My staff stamped that, not me" is mathematically refuted.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 14.1.C — BLOCKCHAIN COMMITS ====================

type BlockCommit = { height: number; time: string; txCount: number; size: string; hash: string; prev: string };

const BLOCKS: BlockCommit[] = [
  { height: 88425, time: "15:12:05", txCount: 14, size: "4.2 KB", hash: "0xa49ec6da3280114411cb90ec2af8b70c", prev: "0x22ef0911c6a84bd22d71a3f408cab5e0" },
  { height: 88424, time: "15:02:01", txCount: 22, size: "6.8 KB", hash: "0x22ef0911c6a84bd22d71a3f408cab5e0", prev: "0xb9ec220f451aa88c713e609dcba4120e" },
  { height: 88423, time: "14:52:04", txCount: 9, size: "2.9 KB", hash: "0xb9ec220f451aa88c713e609dcba4120e", prev: "0x3fa1bcd09e8711244ab6ec90ffa3d8c2" },
  { height: 88422, time: "14:42:00", txCount: 31, size: "9.1 KB", hash: "0x3fa1bcd09e8711244ab6ec90ffa3d8c2", prev: "0x77229e51a44cd0fb1e8326c579b0ad14" },
  { height: 88421, time: "14:32:07", txCount: 18, size: "5.4 KB", hash: "0x77229e51a44cd0fb1e8326c579b0ad14", prev: "0x991aac7213fbee4482bde1c0a7182c44" },
];

function BlockchainCommits() {
  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Blockchain Commits"
        subtitle="Private LGU ledger · Live heartbeat monitor"
        actions={<><Btn icon={<RefreshCw size={13} />} label="Refresh Feed" /><Btn icon={<Terminal size={13} />} label="Open Node Console" variant="primary" /></>}
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Chain Height" value="88,425" trend="Healthy · 10-min cadence" tone="good" />
        <Stat label="Pending Tx Pool" value="7" trend="Next commit in 04:22" tone="neutral" />
        <Stat label="Uptime (30d)" value="99.998%" trend="1 scheduled maintenance" tone="good" />
        <Stat label="Validator Nodes" value="5 / 5" trend="City Hall · DILG · COA · BIR · NEDA" tone="good" />
      </div>

      <div className="grid grid-cols-[1.4fr_1fr] gap-4">
        <div className="bg-neutral-950 rounded-xl p-5 text-neutral-100 min-h-[440px]">
          <div className="flex items-center gap-2 text-[11px] font-['Lexend:Medium',_sans-serif] text-emerald-400 uppercase tracking-wider mb-4">
            <Terminal size={12} /> Live Block Feed · eflow-chain://mainnet
          </div>
          <div className="space-y-2 font-mono text-[11px]">
            {BLOCKS.map((b, i) => (
              <div key={b.height} className={`border-l-2 ${i === 0 ? "border-emerald-400" : "border-neutral-700"} pl-3 py-1.5`}>
                <div className="flex items-center gap-2 text-emerald-300">
                  <GitCommit size={12} /> <span>BLOCK #{b.height.toLocaleString()}</span>
                  <span className="text-neutral-500">· {b.time}</span>
                  {i === 0 && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 animate-pulse">LIVE</span>}
                </div>
                <div className="text-neutral-400 mt-0.5">tx:{b.txCount} · size:{b.size} · hash:<span className="text-neutral-200">{b.hash.slice(0, 18)}…</span></div>
                <div className="text-neutral-600 text-[10px]">prev: {b.prev.slice(0, 18)}…</div>
              </div>
            ))}
            <div className="text-neutral-500 pl-3">$ _<span className="animate-pulse">▮</span></div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white border border-neutral-200 rounded-xl p-4">
            <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 mb-3">Chain Health</div>
            <div className="space-y-2.5">
              {[
                { label: "Block Finality", value: "Instant", tone: "good" },
                { label: "Fork Events (30d)", value: "0", tone: "good" },
                { label: "Consensus", value: "5-of-5 PoA", tone: "good" },
                { label: "Tx Throughput", value: "~3.2 tx/s", tone: "neutral" },
                { label: "Avg. Commit Interval", value: "9m 58s", tone: "good" },
              ].map(r => (
                <div key={r.label} className="flex items-center justify-between">
                  <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{r.label}</div>
                  <div className={`text-[12px] font-['Lexend:Medium',_sans-serif] tabular-nums ${r.tone === "good" ? "text-emerald-700" : "text-neutral-900"}`}>{r.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <Shield size={14} className="text-emerald-700 mt-0.5" />
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-emerald-900 leading-relaxed">
                <span className="font-['Lexend:Medium',_sans-serif]">System healthy.</span> Every 10 minutes a new block seals ~20 vouchers. COA and DILG validator nodes independently confirm the chain — one corrupt official cannot rewrite history alone.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 14.2.A — PUBLIC BIDDING BYPASSES ====================

type SplitCase = {
  id: string;
  vendor: string;
  office: string;
  item: string;
  pos: { po: string; date: string; amount: number }[];
  threshold: number;
  risk: "high" | "medium" | "critical";
  status: "flagged" | "explained" | "frozen";
};

const SPLIT_CASES: SplitCase[] = [
  {
    id: "s1",
    vendor: "Golden Supply Hardware Co.",
    office: "General Services Office (GSO)",
    item: "Office Equipment",
    pos: [
      { po: "PO-2026-04-0812", date: "Apr 04", amount: 420_000 },
      { po: "PO-2026-04-0847", date: "Apr 09", amount: 498_000 },
      { po: "PO-2026-04-0881", date: "Apr 14", amount: 490_000 },
    ],
    threshold: 1_000_000,
    risk: "critical",
    status: "flagged",
  },
  {
    id: "s2",
    vendor: "Reyes Construction Supplies",
    office: "City Engineering Office",
    item: "Cement & Rebar · Coastal Rd.",
    pos: [
      { po: "PO-2026-04-0721", date: "Apr 02", amount: 500_000 },
      { po: "PO-2026-04-0795", date: "Apr 07", amount: 600_000 },
    ],
    threshold: 1_000_000,
    risk: "high",
    status: "flagged",
  },
  {
    id: "s3",
    vendor: "Maribojoc Catering Services",
    office: "Office of the Mayor",
    item: "Event Catering",
    pos: [
      { po: "PO-2026-03-0612", date: "Mar 22", amount: 148_000 },
      { po: "PO-2026-03-0640", date: "Mar 26", amount: 152_000 },
      { po: "PO-2026-04-0701", date: "Apr 01", amount: 170_000 },
    ],
    threshold: 500_000,
    risk: "medium",
    status: "flagged",
  },
];

function PublicBiddingBypasses() {
  const [selected, setSelected] = useState<SplitCase>(SPLIT_CASES[0]);
  const [frozen, setFrozen] = useState<Set<string>>(new Set());
  const total = selected.pos.reduce((s, p) => s + p.amount, 0);
  const riskTone: Record<string, string> = { critical: "bg-red-50 border-red-200 text-red-700", high: "bg-orange-50 border-orange-200 text-orange-700", medium: "bg-amber-50 border-amber-200 text-amber-700" };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="Public Bidding Bypasses"
        subtitle="Contract Splitting Radar · AI anomaly detection on Purchase Orders"
        actions={<><Btn icon={<Filter size={13} />} label="Filter by Office" /><Btn icon={<Gavel size={13} />} label="Referral to BAC" variant="primary" /></>}
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Active Flags" value="7" trend="3 critical · 2 high · 2 medium" tone="bad" />
        <Stat label="Frozen POs" value={frozen.size.toString()} trend="Pending written justification" tone="warn" />
        <Stat label="Est. Bypass Value" value={pesoShort(6_420_000)} trend="Would require public bidding" tone="bad" />
        <Stat label="AI Confidence" value="94%" trend="Pattern match threshold" tone="neutral" />
      </div>

      <div className="grid grid-cols-[0.9fr_1.4fr] gap-4">
        <div className="space-y-2">
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400 px-1 mb-1">Flagged Cases</div>
          {SPLIT_CASES.map(c => (
            <button key={c.id} onClick={() => setSelected(c)} className={`w-full text-left bg-white border rounded-xl p-3 hover:shadow-sm transition ${selected.id === c.id ? "border-neutral-900 shadow-sm" : "border-neutral-200"}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{c.vendor}</div>
                <span className={`text-[9px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-1.5 py-0.5 ${riskTone[c.risk]}`}>{c.risk}</span>
              </div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{c.office}</div>
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{c.pos.length} POs · {peso(c.pos.reduce((s, p) => s + p.amount, 0))}</div>
            </button>
          ))}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selected.vendor}</div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{selected.office} · {selected.item}</div>
            </div>
            <div className={`text-[10px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-2 py-1 ${riskTone[selected.risk]}`}>{selected.risk} risk</div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <ShieldAlert size={14} className="text-red-600 mt-0.5" />
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-red-900 leading-relaxed">
                <span className="font-['Lexend:Medium',_sans-serif]">AI Insight · 94% confidence.</span> The {selected.office} has issued {selected.pos.length} separate POs for "{selected.item}" to {selected.vendor} totaling {peso(total)} in 14 days. High probability of Contract Splitting to bypass the {peso(selected.threshold)} Public Bidding threshold (RA 9184).
              </div>
            </div>
          </div>

          <div className="border border-neutral-200 rounded-lg overflow-hidden mb-4">
            <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2 px-3 py-2 bg-neutral-50 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
              <div>PO Number</div><div>Date Issued</div><div className="text-right">Amount</div><div>&nbsp;</div>
            </div>
            {selected.pos.map(p => (
              <div key={p.po} className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2 px-3 py-2.5 border-t border-neutral-100 items-center">
                <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 font-mono">{p.po}</div>
                <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">{p.date}, 2026</div>
                <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums text-right">{peso(p.amount)}</div>
                <div>{frozen.has(p.po) ? <span className="text-[10px] text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5 flex items-center gap-1"><Ban size={10} /> FROZEN</span> : <span className="text-[10px] text-neutral-500">pending</span>}</div>
              </div>
            ))}
            <div className="grid grid-cols-[1.2fr_1fr_1fr_auto] gap-2 px-3 py-2.5 border-t border-neutral-200 bg-neutral-50 items-center">
              <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-900 col-span-2">Aggregate · within 14-day window</div>
              <div className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-red-700 tabular-nums text-right">{peso(total)}</div>
              <div />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFrozen(new Set(selected.pos.map(p => p.po)))}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] bg-red-600 text-white hover:bg-red-700"
            >
              <Ban size={13} /> Freeze POs
            </button>
            <Btn icon={<MessageSquare size={13} />} label="Demand Written Justification" />
            <div className="ml-auto text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Action logged to Immutable Audit</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== 14.2.B — COA TIMELINE FLAGS ====================

type Deadline = { id: string; name: string; owner: string; start: number; end: number; due: number; status: "ontrack" | "warning" | "overdue" };

const DEADLINES: Deadline[] = [
  { id: "d1", name: "Trial Balance · Q1 2026", owner: "Bookkeeping · Ms. Evangelista", start: 1, end: 25, due: 30, status: "ontrack" },
  { id: "d2", name: "Bank Reconciliation · March", owner: "Treasury · Mr. Padojinog", start: 5, end: 28, due: 28, status: "warning" },
  { id: "d3", name: "Quarter-End Report Q1", owner: "Accounting · Atty. Uy", start: 10, end: 35, due: 32, status: "overdue" },
  { id: "d4", name: "Monthly Cash Report · April", owner: "Treasury · Mr. Padojinog", start: 15, end: 42, due: 45, status: "ontrack" },
  { id: "d5", name: "Disbursement Voucher Registry", owner: "Accounting · Ms. Villanueva", start: 8, end: 34, due: 40, status: "ontrack" },
  { id: "d6", name: "Statement of Appropriations", owner: "Budget · Ms. Aseniero", start: 3, end: 32, due: 30, status: "warning" },
];

function COATimelineFlags() {
  const today = 27;
  const max = 50;
  const tone: Record<string, { bar: string; chip: string; dot: string }> = {
    ontrack: { bar: "bg-emerald-400", chip: "bg-emerald-50 border-emerald-200 text-emerald-700", dot: "bg-emerald-500" },
    warning: { bar: "bg-amber-400", chip: "bg-amber-50 border-amber-200 text-amber-700", dot: "bg-amber-500" },
    overdue: { bar: "bg-red-500", chip: "bg-red-50 border-red-200 text-red-700", dot: "bg-red-500" },
  };

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="COA Timeline Flags"
        subtitle="Statutory submission Gantt · AOM prevention dashboard"
        actions={<><Btn icon={<Bell size={13} />} label="Nudge All Owners" /><Btn icon={<Download size={13} />} label="Export COA Package" variant="primary" /></>}
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Active Submissions" value={DEADLINES.length.toString()} trend="Tracked statutory items" tone="neutral" />
        <Stat label="Overdue" value={DEADLINES.filter(d => d.status === "overdue").length.toString()} trend="AOM exposure" tone="bad" />
        <Stat label="At Risk (≤5d)" value={DEADLINES.filter(d => d.status === "warning").length.toString()} trend="Auto-nudged" tone="warn" />
        <Stat label="AOMs YTD" value="0" trend="Zero observations issued" tone="good" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <CalendarX size={15} className="text-neutral-900" />
          <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">Submission Gantt · Day 1–50 rolling window</div>
          <div className="ml-auto text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">Today: Day {today}</div>
        </div>

        <div className="space-y-3">
          {DEADLINES.map(d => {
            const leftPct = (d.start / max) * 100;
            const widthPct = ((d.end - d.start) / max) * 100;
            const duePct = (d.due / max) * 100;
            const t = tone[d.status];
            return (
              <div key={d.id} className="grid grid-cols-[220px_1fr_90px] gap-3 items-center">
                <div>
                  <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 truncate">{d.name}</div>
                  <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">{d.owner}</div>
                </div>
                <div className="relative h-7 bg-neutral-100 rounded-md overflow-hidden">
                  <div className={`absolute top-0 bottom-0 ${t.bar} opacity-80 rounded-md`} style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
                  <div className="absolute top-0 bottom-0 w-0.5 bg-neutral-900" style={{ left: `${(today / max) * 100}%` }} title="Today" />
                  <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-red-500" style={{ left: `${duePct}%` }} title={`Due: Day ${d.due}`}>
                    <div className="absolute -top-0.5 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                  </div>
                </div>
                <div className="flex justify-end">
                  <span className={`text-[10px] font-['Lexend:Medium',_sans-serif] uppercase border rounded px-1.5 py-0.5 flex items-center gap-1 ${t.chip}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${t.dot}`} />{d.status === "ontrack" ? "on track" : d.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center gap-4 text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500 pt-4 border-t border-neutral-100">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> On track</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> ≤5 days to due</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Overdue · AOM risk</div>
          <div className="flex items-center gap-1.5"><span className="w-0.5 h-3 bg-neutral-900" /> Today</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> COA due date</div>
          <div className="ml-auto text-neutral-600">Red T-5 auto-nudges responsible owners via eFlow + SMS</div>
        </div>
      </div>
    </div>
  );
}

// ==================== 14.2.C — 30-DAY LIQUIDATION ALERTS ====================

type Delinquent = { id: string; employee: string; office: string; purpose: string; amount: number; issued: string; dayNo: number };

const DELINQUENTS: Delinquent[] = [
  { id: "p1", employee: "Mr. Danilo Escario", office: "GSO", purpose: "Travel · DILG Summit Manila", amount: 42_000, issued: "Mar 12, 2026", dayNo: 40 },
  { id: "p2", employee: "Ms. Aurelia Bontuyan", office: "Health Office", purpose: "Dengue Outreach · Brgy. 14", amount: 28_500, issued: "Mar 14, 2026", dayNo: 38 },
  { id: "p3", employee: "Engr. Rafael Tambago", office: "Engineering", purpose: "Site Inspection · Coastal Rd.", amount: 36_000, issued: "Mar 20, 2026", dayNo: 32 },
  { id: "p4", employee: "Ms. Cherry Lumapas", office: "Mayor's Office", purpose: "Seminar Registration · Cebu", amount: 18_000, issued: "Mar 25, 2026", dayNo: 27 },
  { id: "p5", employee: "Mr. Jonathan Pial", office: "Treasury", purpose: "Bank Errand Float", amount: 12_000, issued: "Mar 30, 2026", dayNo: 22 },
  { id: "p6", employee: "Ms. Rosario Villamor", office: "Accounting", purpose: "Training · COA Circular Update", amount: 22_000, issued: "Apr 05, 2026", dayNo: 16 },
];

function ThirtyDayLiquidationAlerts() {
  const blocked = DELINQUENTS.filter(d => d.dayNo > 30);
  const totalOut = DELINQUENTS.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="p-8 min-h-full">
      <PageHeader
        title="30-Day Liquidation Alerts"
        subtitle="Cash advance delinquency matrix · COA Circular 97-002 enforcement"
        actions={<><Btn icon={<Bell size={13} />} label="Broadcast Reminder" /><Btn icon={<Ban size={13} />} label="Sync Block List to HR" variant="primary" /></>}
      />

      <div className="grid grid-cols-4 gap-3 mb-6">
        <Stat label="Holding Cash Advances" value={DELINQUENTS.length.toString()} trend="Active unliquidated" tone="neutral" />
        <Stat label="Day 31+ (Delinquent)" value={blocked.length.toString()} trend="Auto-blocked from new advances" tone="bad" />
        <Stat label="Total Outstanding" value={peso(totalOut)} trend="Across 6 employees" tone="warn" />
        <Stat label="Avg. Days Held" value="29.2" trend="Target: < 30" tone="warn" />
      </div>

      <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1.3fr_1fr_1.5fr_1fr_1fr_0.9fr_auto] gap-3 px-5 py-3 bg-neutral-50 border-b border-neutral-200 text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-500">
          <div>Employee</div><div>Office</div><div>Purpose</div><div>Amount</div><div>Issued</div><div>Countdown</div><div>Status</div>
        </div>
        {DELINQUENTS.map(d => {
          const isBlocked = d.dayNo > 30;
          const daysLeft = 30 - d.dayNo;
          const progress = Math.min(100, (d.dayNo / 30) * 100);
          return (
            <div key={d.id} className={`grid grid-cols-[1.3fr_1fr_1.5fr_1fr_1fr_0.9fr_auto] gap-3 px-5 py-3.5 border-b border-neutral-100 items-center ${isBlocked ? "bg-red-50/40" : ""}`}>
              <div>
                <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{d.employee}</div>
                <div className="text-[10.5px] font-['Lexend:Regular',_sans-serif] text-neutral-500">CA Ref · {d.id.toUpperCase()}-2026</div>
              </div>
              <div className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">{d.office}</div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 truncate">{d.purpose}</div>
              <div className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900 tabular-nums">{peso(d.amount)}</div>
              <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-neutral-600 tabular-nums">{d.issued}</div>
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Timer size={11} className={isBlocked ? "text-red-600" : daysLeft <= 5 ? "text-amber-600" : "text-neutral-500"} />
                  <span className={`text-[11px] font-['Lexend:Medium',_sans-serif] tabular-nums ${isBlocked ? "text-red-700" : daysLeft <= 5 ? "text-amber-700" : "text-neutral-700"}`}>
                    {isBlocked ? `Day ${d.dayNo} · +${d.dayNo - 30} over` : `${daysLeft}d left`}
                  </span>
                </div>
                <div className="h-1 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full ${isBlocked ? "bg-red-500" : daysLeft <= 5 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${progress}%` }} />
                </div>
              </div>
              <div>
                {isBlocked ? (
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase bg-red-600 text-white rounded px-2 py-1 flex items-center gap-1">
                    <Siren size={10} /> Delinquent
                  </span>
                ) : daysLeft <= 5 ? (
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase bg-amber-50 border border-amber-200 text-amber-700 rounded px-2 py-1">Due Soon</span>
                ) : (
                  <span className="text-[10px] font-['Lexend:Medium',_sans-serif] uppercase bg-emerald-50 border border-emerald-200 text-emerald-700 rounded px-2 py-1">In Window</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-start gap-2">
          <Ban size={14} className="text-red-600 mt-0.5" />
          <div className="text-[11.5px] font-['Lexend:Regular',_sans-serif] text-red-900 leading-relaxed">
            <span className="font-['Lexend:Medium',_sans-serif]">Mathematical enforcement.</span> Employees past Day 30 are automatically tagged <span className="font-['Lexend:Medium',_sans-serif]">Delinquent</span>. The HRMO module is signaled to block any new cash advance request, leave application, or travel order until the prior CA is fully liquidated — per COA Circular 97-002 §5.1.3.
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== ROUTER ====================

export const financePages: Record<string, Record<string, React.ComponentType>> = {
  projfin: {
    "Master Budget Allocation": ProgrammaticBuckets,
    "Programmatic Buckets": ProgrammaticBuckets,
    "Facilities Budget": CategoricalSlices,
    "Marketing Budget": CategoricalSlices,
    "Community Engagement": CategoricalSlices,
    "Program Fund Distribution": ObligationRequests,
    "Obligation Requests (ORS)": ObligationRequests,
    "Fund Releases": FundReleases,
    "Earmarked Funds": EarmarkedFunds,
  },
  liquidation: {
    "Pending Liquidations": ReceiptVerification,
    "Receipt Verification": ReceiptVerification,
    "Exact Cost Review": ExactCostReview,
    "Cash Advance Matching": CashAdvanceMatching,
    "Budget Reconciliation & Returns": UnspentFunds,
    "Unspent Funds": UnspentFunds,
    "Cryptographic Verification": CryptographicVerification,
    "LGU Pool Returns": LGUPoolReturns,
  },
  crypto: {
    "Immutable Expense Ledger": HashedLiquidations,
    "Hashed Liquidations": HashedLiquidations,
    "Non-Repudiation Records": NonRepudiationRecords,
    "Blockchain Commits": BlockchainCommits,
    "Real-Time Conformance Alerts": PublicBiddingBypasses,
    "Public Bidding Bypasses": PublicBiddingBypasses,
    "COA Timeline Flags": COATimelineFlags,
    "30-Day Liquidation Alerts": ThirtyDayLiquidationAlerts,
  },
};

export const financeDefaultPages: Record<string, string> = {
  projfin: "Programmatic Buckets",
  liquidation: "Receipt Verification",
  crypto: "Hashed Liquidations",
};

export function FinanceContent({ activeSection, activePage }: { activeSection: string; activePage?: string }) {
  const section = financePages[activeSection];
  if (!section) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-400">
        <div className="text-center">
          <Settings size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-[14px] font-['Lexend:Regular',_sans-serif]">Section coming soon</p>
          <p className="text-[12px] mt-1">Section: {activeSection}</p>
        </div>
      </div>
    );
  }
  const pageName = activePage || financeDefaultPages[activeSection] || Object.keys(section)[0];
  const PageComponent = section[pageName] || Object.values(section)[0];
  return <PageComponent />;
}
