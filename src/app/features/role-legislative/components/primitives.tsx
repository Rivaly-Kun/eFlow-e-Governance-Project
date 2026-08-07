import React from "react";

export const pillMap: Record<string, string> = {
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
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Sangguniang Panlungsod · Ormoc City"}</p>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}

export function Btn({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success" }) {
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

export function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat" }) {
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

export function HashDisplay({ hash, full }: { hash: string; full?: boolean }) {
  return (
    <span className={`font-['JetBrains_Mono',_'Fira_Code',_monospace] text-[11px] tracking-tight text-neutral-600 bg-neutral-50 px-2 py-0.5 rounded border border-neutral-100`}>
      {full ? hash : `${hash.slice(0, 6)}…${hash.slice(-4)}`}
    </span>
  );
}

// ==================== MOCK DATA ====================

export const stableHashes = [
  "0x9A3F1D7E5B0C8A2D6F4E1B9C7A3D5F8E0B2C4A6D8F1E3B5C7A9D0F2E4B6C8",
  "0xB5E2C8D0F4A6E1B3C9D7F5A0E2B8C4D6F1A3E5B7C0D9F2A4E6B8C1D3F5A7E9",
  "0xC7D4A1E8B5F2C0D6A3E9B7F4C1D8A5E2B0F6C3D9A7E4B1F8C5D2A0E6B3F9C4",
  "0xD0F6A8E3B5C1D7A4E0B2F9C6D3A8E5B1F7C4D0A6E2B8F5C1D9A3E7B4F0C6D2",
  "0xE4B9C2D5F8A1E3B6C0D4F7A9E2B5C8D1F3A6E0B4C7D9F2A5E8B1C3D6F0A4E7",
  "0xF1A5E8B2C6D0F3A7E1B4C9D5F8A2E6B0C3D7F1A4E9B5C2D8F0A3E7B6C1D4F9",
];
