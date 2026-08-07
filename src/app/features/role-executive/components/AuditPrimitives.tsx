import * as React from "react";
import * as Carbon from "@carbon/icons-react";

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

export function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] whitespace-nowrap ${pillMap[status] || "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions: React.ReactNode }) {
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

export function Btn({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success" | "ghost" }) {
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

export function StatCard({ label, value, sub, trend, accent }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat"; accent?: string }) {
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
export function HashDisplay({ hash, full }: { hash: string; full?: boolean }) {
  return (
    <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] ${full ? "" : "tracking-tight"} text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100`}>
      {full ? hash : `${hash.slice(0, 6)}…${hash.slice(-4)}`}
    </span>
  );
}

// Green shield for verified integrity
export function IntegrityShield({ status }: { status: "verified" | "mismatch" | "checking" }) {
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
            <Carbon.Warning size={32} className="text-red-600" />
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
          <Carbon.Security size={32} className="text-emerald-600" />
        </div>
        <span className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-emerald-700">INTEGRITY VERIFIED</span>
        <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-emerald-600">Database row matches blockchain hash. No tampering detected.</span>
      </div>
    </div>
  );
}

// Read-only badge
export function ReadOnlyBanner() {
  return (
    <div className="bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-3">
      <Carbon.Locked size={16} className="text-cyan-400 bg-[#06040400]" />
      <div><span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-slate-400 ml-3">Read-only environment. All data is cryptographically sealed. No writes permitted.</span></div>
      <div className="ml-auto flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-400">Blockchain Sync </span>
      </div>
    </div>
  );
}

// ==================== MOCK DATA ====================

// Stable hashes generated once
