import type { UserRole } from "../../../../types";
import { getRoleLabel } from "../../../../shared/roles";

export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "dept_head", label: "Head" },
  { value: "assistant_head", label: "Assistant Head" },
  { value: "super_admin", label: "Super Admin" },
];

// ─── Status / Role badges ────────────────────────────────────────
export function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    dept_head: "bg-violet-100 text-violet-700",
    assistant_head: "bg-indigo-100 text-indigo-700",
    employee: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${colors[role] || "bg-neutral-100 text-neutral-600"}`}>
      {getRoleLabel(role)}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${
        active ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {active ? "active" : "inactive"}
    </span>
  );
}

export function WorkloadBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-red-500" : value >= 60 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-[11px] font-mono text-neutral-600 tabular-nums">{value}%</span>
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────────────
