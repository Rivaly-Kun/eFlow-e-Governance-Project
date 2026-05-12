// ─── Dashboard Metric Card ───────────────────────────────────────
import React from "react";

interface MetricCardProps {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: { value: number; label: string };
  color?: string;
  loading?: boolean;
}

export function MetricCard({ label, value, icon, trend, color = "#0085FF", loading }: MetricCardProps) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
        <div className="h-3 w-20 bg-neutral-100 rounded mb-3" />
        <div className="h-8 w-16 bg-neutral-100 rounded mb-2" />
        <div className="h-2 w-24 bg-neutral-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}10` }}
          >
            <div style={{ color }}>{icon}</div>
          </div>
        )}
      </div>
      <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-900 tabular-nums">
        {value}
      </div>
      {trend && (
        <div className="flex items-center gap-1 mt-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              trend.value >= 0 ? "bg-emerald-500" : "bg-red-500"
            }`}
          />
          <span
            className={`text-[10px] font-['Lexend:Medium',_sans-serif] ${
              trend.value >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {trend.value >= 0 ? "+" : ""}
            {trend.value}% {trend.label}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Wide Metric (inline label + value) ──────────────────────────
export function MetricCardWide({
  label,
  value,
  suffix,
  color = "#0085FF",
  loading,
}: {
  label: string;
  value: number | string;
  suffix?: string;
  color?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-neutral-200 p-4 flex items-center justify-center animate-pulse">
        <div className="h-10 w-20 bg-neutral-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-neutral-200 p-4 flex flex-col items-center justify-center">
      <div className="text-[28px] font-['Lexend:SemiBold',_sans-serif] font-semibold tabular-nums" style={{ color }}>
        {value}
        {suffix && <span className="text-[14px] text-neutral-400 ml-1">{suffix}</span>}
      </div>
      <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-500 mt-1">{label}</div>
    </div>
  );
}
