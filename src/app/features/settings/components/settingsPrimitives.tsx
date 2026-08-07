import type { ReactNode } from 'react';
import { Check, CircleAlert } from 'lucide-react';

export type Result = { tone: 'success' | 'error'; text: string } | null;

export const inputClass = 'h-11 rounded-xl border-neutral-200 bg-white px-3.5 text-[13px] text-neutral-900 shadow-sm placeholder:text-neutral-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || '?';
}

export function formatRole(role: string): string {
  return role.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ResultMessage({ result }: { result: Result }) {
  if (!result) return null;
  const isSuccess = result.tone === 'success';
  return (
    <div className={`mt-3 flex items-start gap-2 rounded-xl border px-3 py-2.5 text-[12px] ${isSuccess ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/70 dark:bg-red-950/30 dark:text-red-300'}`}>
      {isSuccess ? <Check size={15} className="mt-0.5 shrink-0" /> : <CircleAlert size={15} className="mt-0.5 shrink-0" />}
      <span>{result.text}</span>
    </div>
  );
}

export function Surface({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950 ${className}`}>{children}</section>;
}

export function SectionHeading({ icon, eyebrow, title, description }: { icon: ReactNode; eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">{icon}</div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600 dark:text-blue-400">{eyebrow}</p>
        <h2 className="mt-0.5 text-[16px] font-semibold text-neutral-900 dark:text-slate-100">{title}</h2>
        <p className="mt-1 text-[12px] leading-5 text-neutral-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
  );
}

export function IdentityItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-3.5 sm:px-4 first:pl-0 last:pr-0">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-slate-900 dark:text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-neutral-400 dark:text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-[12px] font-medium text-neutral-800 dark:text-slate-200">{value}</p>
      </div>
    </div>
  );
}

export function SettingsLoading({ label }: { label: string }) {
  return (
    <div className="flex min-h-72 items-center justify-center">
      <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-4 py-3 text-[12px] text-neutral-500 shadow-sm dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        <span className="size-4 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
        {label}
      </div>
    </div>
  );
}
