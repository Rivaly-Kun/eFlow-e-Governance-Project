// ─── Shared workflow page primitives ─────────────────────────────
// House-style building blocks reused by every Phase 1-3 screen so Dept Head,
// Admin, and Employee surfaces read as one system. Matches the existing
// DeptHeadContent/EmployeeContent look: Lexend, rounded-xl white cards,
// neutral borders, emerald/amber/red tone system.

import React from "react";
import { Loader2, AlertCircle, Search, X, Download, FileDown } from "lucide-react";

// ─── PageHeader ──────────────────────────────────────────────────
export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
      <div className="min-w-0">
        {eyebrow && (
          <div className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-400 uppercase tracking-wider mb-1">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[22px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
  );
}

// ─── Button ──────────────────────────────────────────────────────
export function WButton({
  icon,
  children,
  variant = "secondary",
  onClick,
  disabled,
  type = "button",
  className = "",
}: {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "success" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary: "bg-neutral-900 text-white hover:bg-neutral-800",
    secondary: "bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50",
    danger: "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100",
    success: "bg-emerald-600 text-white hover:bg-emerald-700",
    ghost: "text-neutral-600 hover:bg-neutral-100",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] transition-colors ${styles[variant]} ${
        disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
      } ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

// ─── StatCard ────────────────────────────────────────────────────
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
  icon,
  onClick,
  active,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "neutral" | "good" | "warn" | "bad" | "info";
  icon?: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
}) {
  const toneMap: Record<string, string> = {
    neutral: "text-neutral-900",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
    info: "text-blue-600",
  };
  const iconTone: Record<string, string> = {
    neutral: "bg-neutral-100 text-neutral-500",
    good: "bg-emerald-50 text-emerald-600",
    warn: "bg-amber-50 text-amber-600",
    bad: "bg-red-50 text-red-600",
    info: "bg-blue-50 text-blue-600",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left bg-white border rounded-xl p-4 transition-all w-full ${
        onClick ? "hover:shadow-sm hover:border-neutral-300 cursor-pointer" : "cursor-default"
      } ${active ? "border-neutral-900 ring-1 ring-neutral-900/10" : "border-neutral-200"}`}
    >
      <div className="flex items-start justify-between">
        <div className="text-[11px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">
          {label}
        </div>
        {icon && (
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${iconTone[tone]}`}>
            {icon}
          </div>
        )}
      </div>
      <div className={`text-[24px] font-['Lexend:SemiBold',_sans-serif] mt-1 tabular-nums ${toneMap[tone]}`}>
        {value}
      </div>
      {hint && (
        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">
          {hint}
        </div>
      )}
    </button>
  );
}

// ─── Card ────────────────────────────────────────────────────────
export function Card({
  title,
  subtitle,
  right,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: string;
  subtitle?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`bg-white border border-neutral-200 rounded-xl ${className}`}>
      {(title || right) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100">
          <div>
            {title && (
              <div className="text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{title}</div>
            )}
            {subtitle && (
              <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500 mt-0.5">{subtitle}</div>
            )}
          </div>
          {right}
        </div>
      )}
      <div className={bodyClassName || "p-4"}>{children}</div>
    </div>
  );
}

// ─── SearchInput ─────────────────────────────────────────────────
export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative flex items-center bg-white border border-neutral-200 rounded-lg h-[34px] focus-within:border-neutral-400 focus-within:ring-1 focus-within:ring-neutral-200 ${className}`}>
      <Search size={14} className="text-neutral-400 ml-2.5" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent px-2 text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 placeholder:text-neutral-400 focus:outline-none"
      />
      {value && (
        <button onClick={() => onChange("")} className="pr-2 text-neutral-400 hover:text-neutral-700">
          <X size={13} />
        </button>
      )}
    </div>
  );
}

// ─── Select ──────────────────────────────────────────────────────
export function WSelect({
  value,
  onChange,
  options,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-[34px] px-2.5 border border-neutral-200 rounded-lg text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-800 bg-white focus:outline-none focus:border-neutral-400 focus:ring-1 focus:ring-neutral-200 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

// ─── FilterBar ───────────────────────────────────────────────────
export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-4 flex-wrap">
      {children}
    </div>
  );
}

// ─── ExportMenu ──────────────────────────────────────────────────
// Consistent CSV/PDF export cluster. Callers wire the two handlers to
// reportService.exportCsv / exportPdf with their filtered rows.
export function ExportMenu({
  onCsv,
  onPdf,
  disabled,
}: {
  onCsv: () => void;
  onPdf: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={`inline-flex items-center bg-white border border-neutral-200 rounded-lg overflow-hidden h-[34px] ${disabled ? "opacity-40 pointer-events-none" : ""}`}>
      <button
        onClick={onPdf}
        className="flex items-center gap-1.5 px-3 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 h-full"
      >
        <FileDown size={13} /> PDF
      </button>
      <div className="w-px h-4 bg-neutral-200" />
      <button
        onClick={onCsv}
        className="flex items-center gap-1.5 px-3 text-[11.5px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 h-full"
      >
        <Download size={13} /> CSV
      </button>
    </div>
  );
}

// ─── Section states ──────────────────────────────────────────────
export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
      <Loader2 size={26} className="animate-spin mb-3" />
      <p className="text-[13px] font-['Lexend:Regular',_sans-serif]">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <AlertCircle size={28} className="text-red-400 mb-3" />
      <p className="text-[14px] font-['Lexend:Medium',_sans-serif] text-neutral-700 mb-1">Something went wrong</p>
      <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-400 max-w-sm mb-4">
        {message || "We couldn't load this data. Please try again."}
      </p>
      {onRetry && <WButton onClick={onRetry}>Retry</WButton>}
    </div>
  );
}

export function SectionEmpty({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-neutral-300 mb-3">{icon}</div>}
      <h3 className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700 mb-1">{title}</h3>
      {description && (
        <p className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-400 max-w-sm mb-4">
          {description}
        </p>
      )}
      {action}
    </div>
  );
}

// ─── Progress bar ────────────────────────────────────────────────
export function ProgressBar({ value, tone = "neutral" }: { value: number; tone?: "neutral" | "good" | "warn" | "bad" }) {
  const map: Record<string, string> = {
    neutral: "bg-neutral-800",
    good: "bg-emerald-500",
    warn: "bg-amber-500",
    bad: "bg-red-500",
  };
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
      <div className={`h-full ${map[tone]} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Formatting helpers ──────────────────────────────────────────
export function formatDate(d?: string | number | null): string {
  if (!d) return "—";
  const date = typeof d === "number" ? new Date(d) : new Date(d);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function relativeDays(d?: string | number | null): { label: string; overdue: boolean } {
  if (!d) return { label: "No deadline", overdue: false };
  const date = typeof d === "number" ? new Date(d) : new Date(d);
  if (isNaN(date.getTime())) return { label: "No deadline", overdue: false };
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return { label: `${Math.abs(days)}d overdue`, overdue: true };
  if (days === 0) return { label: "Due today", overdue: false };
  if (days === 1) return { label: "Due tomorrow", overdue: false };
  return { label: `${days}d left`, overdue: false };
}
