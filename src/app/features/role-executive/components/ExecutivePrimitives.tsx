import * as React from "react";

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

export function Pill({ status }: { status: string }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-['Lexend:Medium',_sans-serif] ${pillStyles[status] || "bg-neutral-100 text-neutral-600"}`}>
      {status}
    </span>
  );
}

export function PageHeader({ title, actions }: { title: string; actions: React.ReactNode }) {
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

export function ActionButton({ icon, label, variant = "secondary" }: { icon: React.ReactNode; label: string; variant?: "primary" | "secondary" | "danger" }) {
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

export function StatCard({ label, value, sub, trend }: { label: string; value: string; sub?: string; trend?: "up" | "down" | "flat" }) {
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
export function BatteryWidget({ project, completion, workforce, phases, status }: {
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
