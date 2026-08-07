import React from "react";

export const pillColors: Record<string, string> = {
  "LIVE SESSION ACTIVE": "bg-red-500 text-white animate-pulse",
  Completed: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Broadcasting: "bg-emerald-100 text-emerald-700 border border-emerald-300",
  "Up Next": "bg-blue-100 text-blue-700",
  Paused: "bg-yellow-100 text-yellow-700 border border-yellow-300",
  Deferred: "bg-amber-100 text-amber-700",
  Done: "bg-emerald-100 text-emerald-700",
  Skipped: "bg-neutral-100 text-neutral-500",
  Published: "bg-emerald-100 text-emerald-700",
  Draft: "bg-amber-100 text-amber-700",
  "AI Generated": "bg-blue-100 text-blue-700",
  Finalized: "bg-emerald-100 text-emerald-700",
  "Unfinished Business": "bg-orange-100 text-orange-700",
};

export function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] whitespace-nowrap ${pillColors[status] || "bg-neutral-100 text-neutral-600"}`}>
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

export function Btn({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" | "success" | "live" }) {
  const s: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100",
    live: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
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

// ==================== BROADCAST HISTORY ====================
