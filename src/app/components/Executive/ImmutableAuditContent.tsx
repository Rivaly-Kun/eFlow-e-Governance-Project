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
} from "@carbon/icons-react";
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

// ==================== SHARED STYLES ====================
const pillMap: Record<string, string> = {
  "Cycle Sealed": "bg-blue-100 text-blue-700 border border-blue-200",
  "Audit Mismatch": "bg-red-100 text-red-700 border border-red-200 animate-pulse",
  Verified: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Flagged: "bg-red-100 text-red-700",
  Anomalous: "bg-red-100 text-red-700",
  Valid: "bg-emerald-100 text-emerald-700",
  "Tamper Alert": "bg-red-100 text-red-800 border border-red-300 animate-pulse",
  Sealed: "bg-blue-100 text-blue-700",
  "Hash Match": "bg-emerald-100 text-emerald-700",
  "Hash Mismatch": "bg-red-100 text-red-700",
  Disbursed: "bg-blue-100 text-blue-700",
  Liquidated: "bg-emerald-100 text-emerald-700",
  Returned: "bg-violet-100 text-violet-700",
  "In Transit": "bg-amber-100 text-amber-700",
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
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Immutable Audit Review · Ormoc City LGU"}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

function Btn({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success" | "ghost" }) {
  const s: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
    ghost: "bg-transparent text-neutral-500 hover:bg-neutral-100",
  };
  return (
    <button className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-colors ${s[variant]}`}>
      {icon}{label}
    </button>
  );
}

function StatCard({ label, value, sub, trend, accent }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat"; accent?: string }) {
  return (
    <div className={`bg-white rounded-xl border p-4 flex-1 min-w-[155px] ${accent ? `border-${accent}-200` : "border-neutral-200"}`}>
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

// Monospace hash display
function HashDisplay({ hash, full }: { hash: string; full?: boolean }) {
  return (
    <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] ${full ? "" : "tracking-tight"} text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100`}>
      {full ? hash : `${hash.slice(0, 6)}…${hash.slice(-4)}`}
    </span>
  );
}

// Green shield for verified integrity
function IntegrityShield({ status }: { status: "verified" | "mismatch" | "checking" }) {
  if (status === "checking") {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-full border-4 border-blue-200 border-t-blue-500 animate-spin" />
          <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-blue-600">Re-computing hash from database row…</span>
        </div>
      </div>
    );
  }
  if (status === "mismatch") {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="flex flex-col items-center gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-10 py-6">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
            <Warning size={32} className="text-red-600" />
          </div>
          <span className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-red-700">TAMPER DETECTED</span>
          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-600">Database hash ≠ Blockchain hash. Alert dispatched to Mayor.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-6">
      <div className="flex flex-col items-center gap-3 bg-emerald-50 border-2 border-emerald-300 rounded-2xl px-10 py-6">
        <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <Security size={32} className="text-emerald-600" />
        </div>
        <span className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700">INTEGRITY VERIFIED</span>
        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-emerald-600">Database row matches blockchain hash. No tampering detected.</span>
      </div>
    </div>
  );
}

// Read-only badge
function ReadOnlyBanner() {
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-3">
      <Locked size={16} className="text-cyan-400 bg-[#06040400]" />
      <div><span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400 ml-3">Read-only environment. All data is cryptographically sealed. No writes permitted.</span></div>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-400">Blockchain Sync </span>
      </div>
    </div>
  );
}

// ==================== MOCK DATA ====================

function generateHash() {
  const chars = "0123456789ABCDEFabcdef";
  let hash = "0x";
  for (let i = 0; i < 64; i++) hash += chars[Math.floor(Math.random() * chars.length)];
  return hash;
}

// Stable hashes generated once
const stableHashes = [
  "0x8F2A4C1D6E9B0F7A3D5E8C2B4A1F6D9E0C7B3A2D5F8E1C4B7A9D6F0E3C8B91",
  "0x3E7D2A9F5B8C0E1D6A4F7B3C9E2D5A8F0B7C4E1D6A9F3B5C8E2A7D0F4C6B12",
  "0xA1B5C9D3E7F0A2B6C0D4E8F1A5B9C3D7E0F4A8B2C6D0E3F7A1B5C9D3E7F0A4",
  "0x7C4E9B2D5F8A1C6E3B0D7F4A9C2E5B8D1F6A3C0E7B4D9F2A5C8E1B6D3F0A7",
  "0x2D8F4A6C0E3B9D5F1A7C4E0B6D2F8A3C9E5B1D7F0A6C2E8B4D0F5A1C7E3B9",
  "0xF0E5B8D2A7C3E9B5D1F6A0C4E8B2D7F3A9C5E1B0D6F2A8C4E0B5D9F1A3C7E6",
  "0x5A9C3E7B1D5F0A4C8E2B6D0F3A7C1E5B9D4F8A2C6E0B3D7F1A5C9E4B8D2F0",
  "0x1F6A3C9E5B0D8F2A4C7E1B3D6F9A0C5E8B2D4F7A1C3E6B9D0F5A8C2E4B7D1",
  "0xC8E4B0D6F2A5C9E3B7D1F0A4C8E2B6D9F3A7C1E5B0D4F8A2C6E0B3D7F1A5C9",
  "0x6B1D7F3A9C5E2B8D4F0A6C2E8B4D1F5A0C7E3B9D5F2A8C4E1B6D0F3A9C5E7",
  "0xD4F0A6C2E8B5D1F7A3C9E5B2D8F4A0C6E3B9D5F1A7C4E0B6D2F8A4C0E6B3D9",
  "0x9E3B7D1F5A0C4E8B2D6F0A3C7E1B5D9F4A8C2E6B0D3F7A1C5E9B4D8F2A6C0",
];

const disbursements = [
  { id: "DV-2026-0412", timestamp: "2026-04-16 09:14:22 UTC", payee: "Engr. R. Almeda", initials: "RA", amount: 450000, bpaOrigin: "LEDIPO Master Program", hash: stableHashes[0], status: "Verified", tampered: false },
  { id: "DV-2026-0411", timestamp: "2026-04-15 14:32:08 UTC", payee: "Dr. L. Reyes", initials: "LR", amount: 125000, bpaOrigin: "Health Services Workflow", hash: stableHashes[1], status: "Verified", tampered: false },
  { id: "DV-2026-0410", timestamp: "2026-04-15 11:05:44 UTC", payee: "ABC Construction Corp.", initials: "AC", amount: 2800000, bpaOrigin: "Eco-Park Phase 2 Procurement", hash: stableHashes[2], status: "Verified", tampered: false },
  { id: "DV-2026-0409", timestamp: "2026-04-14 16:48:11 UTC", payee: "Dir. J. Navarro", initials: "JN", amount: 85000, bpaOrigin: "Agriculture Extension CA", hash: stableHashes[3], status: "Verified", tampered: false },
  { id: "DV-2026-0408", timestamp: "2026-04-14 10:22:37 UTC", payee: "Green Solutions Inc.", initials: "GS", amount: 1650000, bpaOrigin: "Marine Litter Trap Procurement", hash: stableHashes[4], status: "Flagged", tampered: true },
  { id: "DV-2026-0407", timestamp: "2026-04-13 15:09:55 UTC", payee: "Dir. M. Garcia", initials: "MG", amount: 50000, bpaOrigin: "CSWDO Emergency Relief", hash: stableHashes[5], status: "Verified", tampered: false },
  { id: "DV-2026-0406", timestamp: "2026-04-12 09:44:19 UTC", payee: "Ormoc Power Corp.", initials: "OP", amount: 980000, bpaOrigin: "Utility Payment Batch #14", hash: stableHashes[6], status: "Verified", tampered: false },
  { id: "DV-2026-0405", timestamp: "2026-04-11 13:28:02 UTC", payee: "Juan Dela Cruz", initials: "JC", amount: 15000, bpaOrigin: "Field Cash Advance", hash: stableHashes[7], status: "Verified", tampered: false },
  { id: "DV-2026-0404", timestamp: "2026-04-10 08:55:30 UTC", payee: "Metro Builders Inc.", initials: "MB", amount: 3200000, bpaOrigin: "Road Network Phase 2", hash: stableHashes[8], status: "Verified", tampered: false },
  { id: "DV-2026-0403", timestamp: "2026-04-09 17:11:48 UTC", payee: "Dir. C. Flores", initials: "CF", amount: 72000, bpaOrigin: "ENRO Field Operations", hash: stableHashes[9], status: "Verified", tampered: false },
];

const liquidations = [
  { id: "LQ-2026-0088", advanceRef: "CA-2026-0155", payee: "Juan Dela Cruz", dept: "City Engineering", amount: 15000, liquidated: 12800, returned: 2200, hash: stableHashes[0], fileHash: "sha256:a4f2e8…c91d", fileType: "Official Receipt", uploadedAt: "2026-04-14 10:05:22 UTC", uploadedBy: "Juan Dela Cruz (Field)", geoTag: "11.0044° N, 124.6075° E — Ormoc City Hall", status: "Verified", imageValid: true },
  { id: "LQ-2026-0087", advanceRef: "CA-2026-0148", payee: "Maria Santos", dept: "Health Office", amount: 25000, liquidated: 24200, returned: 800, hash: stableHashes[1], fileHash: "sha256:b8d3f1…e42a", fileType: "Delivery Receipt + Photo", uploadedAt: "2026-04-13 14:22:08 UTC", uploadedBy: "Maria Santos (Field)", geoTag: "11.0052° N, 124.6092° E — Brgy. District 14", status: "Verified", imageValid: true },
  { id: "LQ-2026-0086", advanceRef: "CA-2026-0142", payee: "Pedro Reyes", dept: "Agriculture Office", amount: 8000, liquidated: 5500, returned: 2500, hash: stableHashes[2], fileHash: "sha256:c2a7d4…f03b", fileType: "Official Receipt", uploadedAt: "2026-04-12 09:38:44 UTC", uploadedBy: "Pedro Reyes (Field)", geoTag: "11.0088° N, 124.5941° E — Municipal Agri Office", status: "Verified", imageValid: true },
  { id: "LQ-2026-0085", advanceRef: "CA-2026-0139", payee: "Carlos Garcia", dept: "Health Office", amount: 20000, liquidated: 15200, returned: 4800, hash: stableHashes[3], fileHash: "sha256:d5f0e9…a81c", fileType: "Geo-tagged Purchase Photo", uploadedAt: "2026-04-11 16:11:55 UTC", uploadedBy: "Carlos Garcia (Field)", geoTag: "11.0031° N, 124.6118° E — Ormoc District Hospital", status: "Flagged", imageValid: false },
  { id: "LQ-2026-0084", advanceRef: "CA-2026-0133", payee: "Ana Torres", dept: "CSWDO", amount: 12000, liquidated: 11800, returned: 200, hash: stableHashes[4], fileHash: "sha256:e9b1c3…d47f", fileType: "Official Receipt", uploadedAt: "2026-04-10 11:28:02 UTC", uploadedBy: "Ana Torres (Field)", geoTag: "11.0067° N, 124.6005° E — CSWDO Office", status: "Verified", imageValid: true },
  { id: "LQ-2026-0083", advanceRef: "CA-2026-0127", payee: "Elena Cruz", dept: "ENRO", amount: 18000, liquidated: 17500, returned: 500, hash: stableHashes[5], fileHash: "sha256:f3d8a2…b56e", fileType: "Delivery Receipt", uploadedAt: "2026-04-09 08:52:30 UTC", uploadedBy: "Elena Cruz (Field)", geoTag: "11.0095° N, 124.5978° E — ENRO Field Station", status: "Verified", imageValid: true },
];

const returnedFunds = [
  { id: "RF-2026-0044", advanceRef: "CA-2026-0155", payee: "Juan Dela Cruz", original: 15000, liquidated: 12800, returned: 2200, expected: 2200, sealed: true, treasurySigned: true, hash: stableHashes[7], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0043", advanceRef: "CA-2026-0148", payee: "Maria Santos", original: 25000, liquidated: 24200, returned: 800, expected: 800, sealed: true, treasurySigned: true, hash: stableHashes[1], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0042", advanceRef: "CA-2026-0142", payee: "Pedro Reyes", original: 8000, liquidated: 5500, returned: 2500, expected: 2500, sealed: true, treasurySigned: true, hash: stableHashes[2], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0041", advanceRef: "CA-2026-0139", payee: "Carlos Garcia", original: 20000, liquidated: 15200, returned: 4799, expected: 4800, sealed: false, treasurySigned: false, hash: stableHashes[3], cycleStatus: "Audit Mismatch" as const },
  { id: "RF-2026-0040", advanceRef: "CA-2026-0133", payee: "Ana Torres", original: 12000, liquidated: 11800, returned: 200, expected: 200, sealed: true, treasurySigned: true, hash: stableHashes[4], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0039", advanceRef: "CA-2026-0127", payee: "Elena Cruz", original: 18000, liquidated: 17500, returned: 500, expected: 500, sealed: true, treasurySigned: true, hash: stableHashes[5], cycleStatus: "Cycle Sealed" as const },
  { id: "RF-2026-0038", advanceRef: "CA-2026-0121", payee: "Luz Navarro", original: 10000, liquidated: 9800, returned: 200, expected: 200, sealed: true, treasurySigned: true, hash: stableHashes[9], cycleStatus: "Cycle Sealed" as const },
];

// ==================== 5.1 PARENT: CRYPTOGRAPHIC LEDGER ====================

function CryptographicLedger() {
  const totalDisbursed = disbursements.reduce((s, d) => s + d.amount, 0);
  const totalVerified = disbursements.filter(d => d.status === "Verified").length;
  const totalFlagged = disbursements.filter(d => d.status === "Flagged").length;

  const dailyVolume = [
    { date: "Apr 9", count: 3, amount: 1.2 },
    { date: "Apr 10", count: 5, amount: 4.8 },
    { date: "Apr 11", count: 2, amount: 0.9 },
    { date: "Apr 12", count: 4, amount: 2.1 },
    { date: "Apr 13", count: 3, amount: 1.7 },
    { date: "Apr 14", count: 6, amount: 3.5 },
    { date: "Apr 15", count: 4, amount: 2.9 },
    { date: "Apr 16", count: 3, amount: 2.4 },
  ];

  return (
    <div>
      <PageHeader
        title="Cryptographic Ledger"
        subtitle="Immutable Audit Review · Zero-Trust Verification Dashboard"
        actions={<>
          <Btn icon={<Security size={14} />} label="Run Full Integrity Scan" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export Audit Trail" />
        </>}
      />
      <ReadOnlyBanner />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Ledger Entries" value={`${disbursements.length + liquidations.length + returnedFunds.length}`} sub="Across all sub-ledgers" />
        <StatCard label="Total Disbursed" value={`₱${(totalDisbursed / 1e6).toFixed(1)}M`} sub="Blockchain-sealed" />
        <StatCard label="Integrity Score" value={`${Math.round((totalVerified / disbursements.length) * 100)}%`} sub={`${totalVerified}/${disbursements.length} verified`} trend="up" />
        <StatCard label="Tamper Alerts" value={`${totalFlagged}`} sub="Requires investigation" trend="down" />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        {/* Disbursements summary */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center"><DocumentExport size={16} className="text-blue-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Financial Disbursements</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{disbursements.length} sealed records</p>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{(totalDisbursed / 1e6).toFixed(1)}M</span>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">All funds leaving treasury</p>
          </div>
          <div className="flex rounded-full overflow-hidden h-2.5 bg-neutral-100 mt-2">
            <div className="bg-emerald-400" style={{ width: `${(totalVerified / disbursements.length) * 100}%` }} />
            <div className="bg-red-400" style={{ width: `${(totalFlagged / disbursements.length) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-emerald-600">{totalVerified} verified</span>
            <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-red-600">{totalFlagged} flagged</span>
          </div>
        </div>

        {/* Liquidations summary */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckmarkOutline size={16} className="text-emerald-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Project Liquidations</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{liquidations.length} evidence records</p>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{liquidations.filter(l => l.status === "Verified").length}/{liquidations.length}</span>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Receipts with valid file hash</p>
          </div>
          <ResponsiveContainer width="100%" height={50}>
            <BarChart data={liquidations.map(l => ({ name: l.payee.split(" ")[1], amt: l.liquidated / 1000 }))}>
              <Bar key="amt" dataKey="amt" fill="#10B981" radius={[2, 2, 0, 0]} />
              <Tooltip key="t" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Returned Funds summary */}
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center"><Renew size={16} className="text-violet-600" /></div>
            <div>
              <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Returned Funds</h4>
              <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{returnedFunds.length} closed loops</p>
            </div>
          </div>
          <div className="text-center py-2">
            <span className="text-[28px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{returnedFunds.filter(r => r.cycleStatus === "Cycle Sealed").length}/{returnedFunds.length}</span>
            <p className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Perfectly balanced cycles</p>
          </div>
          {returnedFunds.filter(r => r.cycleStatus === "Audit Mismatch").length > 0 && (
            <div className="bg-red-50 rounded-lg p-2 mt-2 flex items-center gap-1.5">
              <Warning size={12} className="text-red-600" />
              <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-red-700">{returnedFunds.filter(r => r.cycleStatus === "Audit Mismatch").length} mismatch detected</span>
            </div>
          )}
        </div>
      </div>

      {/* Daily transaction volume */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Daily Ledger Volume — Last 8 Days</h3>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyVolume}>
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis key="y" tick={{ fontSize: 11 }} />
            <Tooltip key="t" />
            <Legend key="l" wrapperStyle={{ fontSize: 11 }} />
            <Area key="a1" type="monotone" dataKey="amount" stroke="#2563EB" fill="#DBEAFE" name="Amount (₱M)" />
            <Area key="a2" type="monotone" dataKey="count" stroke="#8B5CF6" fill="#EDE9FE" name="Transactions" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ==================== 5.1A FINANCIAL DISBURSEMENTS ====================

function FinancialDisbursements() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [verifyState, setVerifyState] = useState<Record<string, "idle" | "checking" | "verified" | "mismatch">>({});
  const [searchQuery, setSearchQuery] = useState("");

  const handleVerify = useCallback((id: string, tampered: boolean) => {
    setVerifyState(prev => ({ ...prev, [id]: "checking" }));
    setTimeout(() => {
      setVerifyState(prev => ({ ...prev, [id]: tampered ? "mismatch" : "verified" }));
    }, 1800);
  }, []);

  const filtered = disbursements.filter(d =>
    searchQuery === "" ||
    d.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.payee.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div>
      <PageHeader
        title="Sealed Disbursements"
        subtitle="Cryptographic Ledger · Financial Disbursements"
        actions={<>
          <div className="flex items-center gap-1.5 bg-white border border-neutral-200 rounded-lg px-3 py-1.5">
            <Search size={14} className="text-neutral-400" />
            <input
              type="text"
              placeholder="Search voucher number…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700 bg-transparent outline-none w-44 placeholder:text-neutral-400"
            />
          </div>
          <Btn icon={<DocumentExport size={14} />} label="COA Audit Log" variant="primary" />
        </>}
      />
      <ReadOnlyBanner />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Disbursements" value={`${disbursements.length}`} sub="Sealed transactions" />
        <StatCard label="Total Amount" value={`₱${(disbursements.reduce((s, d) => s + d.amount, 0) / 1e6).toFixed(1)}M`} sub="All outflows" />
        <StatCard label="Verified" value={`${disbursements.filter(d => d.status === "Verified").length}`} sub="Hash match confirmed" trend="up" />
        <StatCard label="Flagged" value={`${disbursements.filter(d => d.status === "Flagged").length}`} sub="Potential tampering" trend="down" />
      </div>

      {/* High-Density Hash Table */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-[90px_170px_1fr_120px_1fr_180px_70px] gap-0 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100">
          {["Timestamp", "Payee / Target", "Amount", "BPA Origin Node", "Cryptographic Hash", "Status", ""].map(h => (
            <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {filtered.map((d) => {
          const isExpanded = expandedRow === d.id;
          const vState = verifyState[d.id] || "idle";
          const isTampered = d.tampered;
          return (
            <React.Fragment key={d.id}>
              <div
                onClick={() => setExpandedRow(isExpanded ? null : d.id)}
                className={`grid grid-cols-[90px_170px_1fr_120px_1fr_180px_70px] gap-0 px-5 py-3.5 border-b transition-all items-center cursor-pointer ${
                  isTampered ? "bg-red-50/40 border-b-red-100 hover:bg-red-50/60" : isExpanded ? "bg-blue-50/30 border-b-blue-100" : "border-b-neutral-50 hover:bg-neutral-50/50"
                }`}
              >
                <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-neutral-500">{d.timestamp.slice(5, 19)}</span>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-[9px] font-['Lexend:SemiBold',_sans-serif] text-white">
                    {d.initials}
                  </div>
                  <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{d.payee}</span>
                </div>
                <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{d.amount.toLocaleString()}</span>
                <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-600 leading-tight">{d.bpaOrigin}</span>
                <HashDisplay hash={d.hash} />
                <Pill status={d.status} />
                <div className="flex items-center justify-end">
                  {isExpanded ? <ChevronDown size={14} className="text-neutral-400" /> : <ChevronRight size={14} className="text-neutral-400" />}
                </div>
              </div>

              {/* Expanded verification panel */}
              {isExpanded && (
                <div className={`px-8 py-5 border-b ${isTampered ? "bg-red-50/20 border-b-red-100" : "bg-slate-50/50 border-b-neutral-100"}`}>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Left: details */}
                    <div>
                      <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Transaction Details</h4>
                      <div className="space-y-2">
                        {[
                          ["Voucher ID", d.id],
                          ["Full Timestamp", d.timestamp],
                          ["Payee", d.payee],
                          ["Amount", `₱${d.amount.toLocaleString()}`],
                          ["BPA Workflow", d.bpaOrigin],
                        ].map(([label, val]) => (
                          <div key={label} className="flex items-start gap-3">
                            <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase w-28 shrink-0">{label}</span>
                            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-800">{val}</span>
                          </div>
                        ))}
                        <div className="flex items-start gap-3">
                          <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase w-28 shrink-0">Blockchain Hash</span>
                          <HashDisplay hash={d.hash} full />
                        </div>
                      </div>
                    </div>
                    {/* Right: integrity check */}
                    <div className="flex flex-col items-center justify-center">
                      {vState === "idle" && (
                        <div className="text-center">
                          <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600 mb-3">Click to re-calculate the hash of this database row and compare it to the blockchain record.</p>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleVerify(d.id, isTampered); }}
                            className="px-5 py-2.5 bg-slate-800 text-white rounded-lg text-[12px] font-['Lexend:SemiBold',_sans-serif] cursor-pointer hover:bg-slate-700 transition-colors flex items-center gap-2 mx-auto"
                          >
                            <Security size={16} /> Verify Ledger Match
                          </button>
                        </div>
                      )}
                      {vState === "checking" && <IntegrityShield status="checking" />}
                      {vState === "verified" && <IntegrityShield status="verified" />}
                      {vState === "mismatch" && <IntegrityShield status="mismatch" />}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ==================== 5.1B PROJECT LIQUIDATIONS ====================

function ProjectLiquidations() {
  const [selectedId, setSelectedId] = useState<string | null>(liquidations[0]?.id || null);
  const [filterMode, setFilterMode] = useState<"all" | "flagged">("all");

  const filtered = filterMode === "flagged" ? liquidations.filter(l => l.status === "Flagged") : liquidations;
  const selected = liquidations.find(l => l.id === selectedId);

  return (
    <div>
      <PageHeader
        title="Verified Receipts & Liquidations"
        subtitle="Cryptographic Ledger · Project Liquidations"
        actions={<>
          <div className="flex bg-neutral-100 rounded-lg p-0.5">
            {(["all", "flagged"] as const).map(v => (
              <button key={v} onClick={() => setFilterMode(v)}
                className={`px-3 py-1.5 rounded-md text-[11px] font-['Lexend:Medium',_sans-serif] cursor-pointer transition-all ${filterMode === v ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500 hover:text-neutral-700"}`}
              >{v === "all" ? "All Records" : "Flagged / Anomalous"}</button>
            ))}
          </div>
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />
      <ReadOnlyBanner />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Liquidations" value={`${liquidations.length}`} sub="Evidence records" />
        <StatCard label="File Hashes Valid" value={`${liquidations.filter(l => l.imageValid).length}/${liquidations.length}`} sub="Image integrity" trend="up" />
        <StatCard label="Total Liquidated" value={`₱${(liquidations.reduce((s, l) => s + l.liquidated, 0) / 1000).toFixed(0)}K`} sub="Proven spend" />
        <StatCard label="Flagged" value={`${liquidations.filter(l => l.status === "Flagged").length}`} sub="Anomalous evidence" trend="down" />
      </div>

      {/* Split-Pane Verification View */}
      <div className="grid grid-cols-[1fr_1fr] gap-0 rounded-xl border border-neutral-200 overflow-hidden bg-white" style={{ minHeight: 520 }}>
        {/* Left Pane — The Ledger */}
        <div className="border-r border-neutral-200">
          <div className="px-5 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2">
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Liquidation Ledger</span>
            <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{filtered.length} records</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
            {filtered.map((l) => {
              const isActive = selectedId === l.id;
              const isFlagged = l.status === "Flagged";
              return (
                <div
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={`px-5 py-3.5 border-b cursor-pointer transition-all ${
                    isActive ? "bg-blue-50 border-b-blue-100 border-l-4 border-l-blue-500" :
                    isFlagged ? "bg-red-50/30 border-b-red-50 hover:bg-red-50/50" :
                    "border-b-neutral-50 hover:bg-neutral-50/50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-neutral-500">{l.id}</span>
                      <Pill status={l.status} />
                    </div>
                    <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{l.liquidated.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700">{l.payee}</span>
                    <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{l.dept}</span>
                  </div>
                  <div className="mt-1.5">
                    <HashDisplay hash={l.hash} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Pane — The Evidence Inspector */}
        <div className="bg-slate-50/30">
          <div className="px-5 py-3 bg-neutral-50/50 border-b border-neutral-100 flex items-center gap-2">
            <View size={14} className="text-neutral-500" />
            <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Evidence Inspector</span>
          </div>
          {selected ? (
            <div className="p-5 space-y-4">
              {/* File info */}
              <div className={`rounded-xl border-2 p-5 ${selected.imageValid ? "border-emerald-200 bg-emerald-50/30" : "border-red-300 bg-red-50/30"}`}>
                <div className="flex items-center gap-2 mb-3">
                  {selected.imageValid ? (
                    <Security size={20} className="text-emerald-600" />
                  ) : (
                    <Warning size={20} className="text-red-600" />
                  )}
                  <div>
                    <span className={`text-[13px] font-['Lexend:SemiBold',_sans-serif] ${selected.imageValid ? "text-emerald-700" : "text-red-700"}`}>
                      File Integrity: {selected.imageValid ? "Valid" : "COMPROMISED"}
                    </span>
                    <p className={`text-[10px] font-['Lexend:Regular',_sans-serif] ${selected.imageValid ? "text-emerald-600" : "text-red-600"}`}>
                      {selected.imageValid
                        ? `This image has not been altered since it was uploaded by the field worker at ${selected.uploadedAt.split(" ")[1]}.`
                        : "File hash does not match blockchain record. This evidence may have been tampered with."
                      }
                    </p>
                  </div>
                </div>
                {/* Simulated document preview */}
                <div className="bg-white rounded-lg border border-neutral-200 p-4 text-center">
                  <div className="w-full h-32 bg-neutral-100 rounded-lg flex items-center justify-center mb-3">
                    <div className="text-center">
                      <DocumentExport size={28} className="text-neutral-300 mx-auto mb-1" />
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400">{selected.fileType}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500">SHA-256:</span>
                    <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded">{selected.fileHash}</span>
                  </div>
                </div>
              </div>

              {/* Evidence metadata */}
              <div className="bg-white rounded-xl border border-neutral-200 p-4">
                <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Evidence Metadata</h4>
                <div className="space-y-2.5">
                  {[
                    ["Liquidation ID", selected.id],
                    ["Advance Reference", selected.advanceRef],
                    ["Payee", selected.payee],
                    ["Department", selected.dept],
                    ["Amount Advanced", `₱${selected.amount.toLocaleString()}`],
                    ["Amount Liquidated", `₱${selected.liquidated.toLocaleString()}`],
                    ["Amount Returned", `₱${selected.returned.toLocaleString()}`],
                    ["Uploaded By", selected.uploadedBy],
                    ["Upload Timestamp", selected.uploadedAt],
                    ["Geo-Tag", selected.geoTag],
                  ].map(([label, val]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase w-32 shrink-0">{label}</span>
                      <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-800">{val}</span>
                    </div>
                  ))}
                  <div className="flex items-start gap-3">
                    <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase w-32 shrink-0">Blockchain Hash</span>
                    <HashDisplay hash={selected.hash} full />
                  </div>
                </div>
              </div>

              {/* The Immutable Seal */}
              <div className={`rounded-xl p-4 text-center ${selected.imageValid ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-300"}`}>
                <div className="flex items-center justify-center gap-2">
                  {selected.imageValid ? (
                    <>
                      <Locked size={14} className="text-emerald-600" />
                      <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700">IMMUTABLE SEAL: INTACT</span>
                    </>
                  ) : (
                    <>
                      <Warning size={14} className="text-red-600" />
                      <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-red-700">IMMUTABLE SEAL: BROKEN — TAMPER ALERT DISPATCHED</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400">
              <p className="text-[13px] font-['Lexend:Regular',_sans-serif]">Select a record from the ledger</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ==================== 5.1C RETURNED FUNDS ====================

function ReturnedFunds() {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const totalOriginal = returnedFunds.reduce((s, r) => s + r.original, 0);
  const totalLiquidated = returnedFunds.reduce((s, r) => s + r.liquidated, 0);
  const totalReturned = returnedFunds.reduce((s, r) => s + r.returned, 0);
  const sealedCount = returnedFunds.filter(r => r.cycleStatus === "Cycle Sealed").length;
  const mismatchCount = returnedFunds.filter(r => r.cycleStatus === "Audit Mismatch").length;

  return (
    <div>
      <PageHeader
        title="Treasury Returns Log"
        subtitle="Cryptographic Ledger · Returned Funds"
        actions={<>
          <Btn icon={<Renew size={14} />} label="Reconcile Cycle" variant="primary" />
          <Btn icon={<Download size={14} />} label="Export" />
        </>}
      />
      <ReadOnlyBanner />

      <div className="flex gap-3 mb-5 flex-wrap">
        <StatCard label="Total Cycles" value={`${returnedFunds.length}`} sub="Fund lifecycle records" />
        <StatCard label="Cycles Sealed" value={`${sealedCount}`} sub="Math balanced + Treasury signed" trend="up" />
        <StatCard label="Audit Mismatches" value={`${mismatchCount}`} sub="Discrepancies detected" trend="down" />
        <StatCard label="Total Returned" value={`₱${(totalReturned / 1000).toFixed(1)}K`} sub="Cash back to Treasury" />
      </div>

      {/* Architecture explanation */}
      <div className="bg-slate-800 rounded-xl p-5 mb-5 border border-slate-600">
        <div className="flex items-start gap-3">
          <Security size={20} className="text-cyan-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-cyan-300 mb-1">Why This Matters: The Closed-Loop Guarantee</h4>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400 leading-relaxed">
              Every peso follows a sealed lifecycle: <span className="text-blue-300">₱Advanced</span> → <span className="text-emerald-300">₱Liquidated</span> → <span className="text-violet-300">₱Returned</span>. The logic engine enforces that <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-white">Original − Liquidated = Returned</span>. If even a ₱1 discrepancy exists, the blockchain <strong className="text-red-400">refuses</strong> to seal the cycle, and a Tamper Alert is dispatched to the Mayor's Office.
            </p>
          </div>
        </div>
      </div>

      {/* Cycle visualization */}
      <div className="bg-white rounded-xl border border-neutral-200 p-5 mb-5">
        <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Fund Lifecycle Overview</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={returnedFunds.map(r => ({
            payee: r.payee.split(" ")[1],
            original: r.original / 1000,
            liquidated: r.liquidated / 1000,
            returned: r.returned / 1000,
            mismatch: r.cycleStatus === "Audit Mismatch",
          }))}>
            <CartesianGrid key="g" strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis key="x" dataKey="payee" tick={{ fontSize: 11 }} />
            <YAxis key="y" tick={{ fontSize: 11 }} />
            <Tooltip key="t" formatter={(value: number) => `₱${value}K`} />
            <Legend key="l" wrapperStyle={{ fontSize: 11 }} />
            <Bar key="b1" dataKey="original" fill="#93C5FD" name="Original (₱K)" radius={[2, 2, 0, 0]} />
            <Bar key="b2" dataKey="liquidated" fill="#10B981" name="Liquidated (₱K)" radius={[2, 2, 0, 0]} />
            <Bar key="b3" dataKey="returned" fill="#8B5CF6" name="Returned (₱K)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* The Closed-Loop Board */}
      <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
        <div className="grid grid-cols-[90px_130px_110px_110px_110px_110px_130px_100px] gap-0 px-5 py-3 bg-neutral-50/50 border-b border-neutral-100">
          {["Ref ID", "Payee", "Original", "Liquidated", "Returned", "Expected", "Cycle Status", "BC Seal"].map(h => (
            <span key={h} className="text-[10px] font-['Lexend:Medium',_sans-serif] text-neutral-500 uppercase tracking-wide">{h}</span>
          ))}
        </div>

        {returnedFunds.map((r) => {
          const isMismatch = r.cycleStatus === "Audit Mismatch";
          const discrepancy = r.returned - r.expected;
          const isExpanded = expandedRow === r.id;
          return (
            <React.Fragment key={r.id}>
              <div
                onClick={() => setExpandedRow(isExpanded ? null : r.id)}
                className={`grid grid-cols-[90px_130px_110px_110px_110px_110px_130px_100px] gap-0 px-5 py-3.5 border-b transition-all items-center cursor-pointer ${
                  isMismatch ? "bg-red-50/50 border-b-red-100 hover:bg-red-50/70 border-l-4 border-l-red-500" :
                  "border-b-neutral-50 hover:bg-neutral-50/50"
                }`}
              >
                <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[10px] text-neutral-500">{r.advanceRef.slice(-7)}</span>
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{r.payee}</span>
                <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">₱{r.original.toLocaleString()}</span>
                <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-emerald-700">₱{r.liquidated.toLocaleString()}</span>
                <span className={`text-[12px] font-['Lexend:SemiBold',_sans-serif] ${isMismatch ? "text-red-600" : "text-violet-700"}`}>₱{r.returned.toLocaleString()}</span>
                <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-600">₱{r.expected.toLocaleString()}</span>
                <Pill status={r.cycleStatus} />
                <div className="flex items-center justify-center">
                  {r.sealed ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200">
                      <Locked size={11} className="text-blue-500" />
                      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-blue-700">Sealed</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200">
                      <Warning size={11} className="text-red-500" />
                      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-red-700">Refused</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className={`px-8 py-5 border-b ${isMismatch ? "bg-red-50/30 border-b-red-100" : "bg-slate-50/30 border-b-neutral-100"}`}>
                  <div className="grid grid-cols-2 gap-6">
                    {/* Math verification */}
                    <div>
                      <h4 className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Closed-Loop Arithmetic</h4>
                      <div className="bg-white rounded-lg border border-neutral-200 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">Original Advanced</span>
                          <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[13px] text-blue-600">₱{r.original.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-600">− Liquidated Amount</span>
                          <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[13px] text-emerald-600">₱{r.liquidated.toLocaleString()}</span>
                        </div>
                        <div className="border-t border-neutral-200 pt-2 flex items-center justify-between">
                          <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">= Expected Return</span>
                          <span className="font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[13px] text-neutral-900">₱{r.expected.toLocaleString()}</span>
                        </div>
                        <div className={`flex items-center justify-between p-2 rounded-lg ${isMismatch ? "bg-red-50" : "bg-emerald-50"}`}>
                          <span className={`text-[11px] font-['Lexend:SemiBold',_sans-serif] ${isMismatch ? "text-red-700" : "text-emerald-700"}`}>Actual Returned</span>
                          <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[13px] ${isMismatch ? "text-red-600" : "text-emerald-600"}`}>₱{r.returned.toLocaleString()}</span>
                        </div>
                        {isMismatch && (
                          <div className="bg-red-100 rounded-lg p-3 flex items-center gap-2">
                            <Warning size={14} className="text-red-600 shrink-0" />
                            <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-red-700">
                              Discrepancy of <strong className="font-['JetBrains_Mono',_'Fira_Code',_monospace]">₱{Math.abs(discrepancy).toLocaleString()}</strong> detected. Blockchain has refused to seal this cycle.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Seal status */}
                    <div className="flex flex-col items-center justify-center">
                      {isMismatch ? (
                        <div className="flex flex-col items-center gap-3 bg-red-50 border-2 border-red-300 rounded-2xl px-8 py-6">
                          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                            <Warning size={28} className="text-red-600" />
                          </div>
                          <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-red-700">AUDIT MISMATCH</span>
                          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-red-600 text-center">₱{Math.abs(discrepancy)} discrepancy. Tamper Alert auto-dispatched to Mayor's Office.</span>
                          <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-1">Treasury digital signature: WITHHELD</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3 bg-blue-50 border-2 border-blue-300 rounded-2xl px-8 py-6">
                          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center">
                            <Security size={28} className="text-blue-600" />
                          </div>
                          <span className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-blue-700">CYCLE SEALED</span>
                          <span className="text-[10px] font-['Lexend:Regular',_sans-serif] text-blue-600 text-center">Math balanced. Treasury digitally signed.</span>
                          <HashDisplay hash={r.hash} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Cycle completion pie */}
      <div className="grid grid-cols-2 gap-4 mt-5">
        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Cycle Completion Rate</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie key="pie" data={[
                { name: "Sealed", value: sealedCount },
                { name: "Mismatch", value: mismatchCount },
              ]} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                <Cell key="s" fill="#3B82F6" />
                <Cell key="m" fill="#EF4444" />
              </Pie>
              <Tooltip key="t" />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-neutral-200 p-5">
          <h3 className="text-[13px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 mb-3">Fund Flow Reconciliation</h3>
          <div className="space-y-4 mt-4">
            {[
              { label: "Total Advanced", value: totalOriginal, color: "bg-blue-400" },
              { label: "Total Liquidated", value: totalLiquidated, color: "bg-emerald-400" },
              { label: "Total Returned", value: totalReturned, color: "bg-violet-400" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600">{item.label}</span>
                  <span className="text-[12px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">₱{(item.value / 1000).toFixed(1)}K</span>
                </div>
                <div className="w-full h-3 bg-neutral-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${(item.value / totalOriginal) * 100}%` }} />
                </div>
              </div>
            ))}
            <div className="border-t border-neutral-200 pt-3 flex items-center justify-between">
              <span className="text-[11px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">Unaccounted</span>
              <span className={`text-[12px] font-['Lexend:SemiBold',_sans-serif] ${(totalOriginal - totalLiquidated - totalReturned) === 0 ? "text-emerald-600" : "text-red-600"}`}>
                ₱{((totalOriginal - totalLiquidated - totalReturned) / 1000).toFixed(1)}K
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== EXPORTS ====================
export const auditPages: Record<string, Record<string, React.ComponentType>> = {
  audit: {
    "Cryptographic Ledger": CryptographicLedger,
    "Financial Disbursements": FinancialDisbursements,
    "Project Liquidations": ProjectLiquidations,
    "Returned Funds": ReturnedFunds,
  },
};
