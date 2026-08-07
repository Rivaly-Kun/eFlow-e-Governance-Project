import * as React from "react";
import * as Carbon from "@carbon/icons-react";

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
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle || "Project Transform · Ormoc City LGU"}</p>
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

// Blockchain seal checkmark
export function BlockchainSeal({ sealed }: { sealed: boolean }) {
  if (!sealed) return <span className="text-[10px] text-neutral-400 font-['Lexend:Regular',_sans-serif]">Pending</span>;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200">
      <Carbon.CheckmarkOutline size={12} className="text-emerald-500" />
      <span className="text-[10px] font-['Lexend:Medium',_sans-serif] text-emerald-700">Sealed</span>
    </span>
  );
}

// ==================== 3.1A INFRASTRUCTURE (₱450M) ====================
