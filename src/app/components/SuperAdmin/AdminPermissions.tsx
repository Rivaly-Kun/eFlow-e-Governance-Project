// ─── Admin Permission Management ─────────────────────────────────
// Role default matrix + auditable per-user overrides over a small, explicit
// capability set. RLS remains the enforcement boundary; this is the admin
// surface for tuning role_permissions and user_permission_overrides.

import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Users, RotateCcw, Check, Minus } from "lucide-react";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  fetchRolePermissions,
  fetchUserOverrides,
  setRolePermission,
  setUserOverride,
  resolvePermissions,
  type RolePermissionRow,
  type UserOverrideRow,
} from "../../services/permissionService";
import { useUsers } from "../../hooks/useFirebaseData";
import { useAuth } from "../../contexts/AuthContext";
import { useToast } from "../ui/Toast";
import {
  PageHeader,
  Card,
  WSelect,
  LoadingState,
} from "../workflow/primitives";
import { InitialsAvatar } from "../workflow/StatusBadges";

const ROLES = [
  { key: "dept_head", label: "Department Head" },
  { key: "employee", label: "Employee" },
  { key: "super_admin", label: "Super Admin" },
];

export function AdminPermissions() {
  const [tab, setTab] = useState<"roles" | "users">("roles");
  const [rolePerms, setRolePerms] = useState<RolePermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const load = () => fetchRolePermissions().then((r) => { setRolePerms(r); setLoading(false); });
  useEffect(() => { load(); }, []);

  const allowed = (role: string, perm: string) => {
    const row = rolePerms.find((r) => r.role === role && r.permission === perm);
    if (row) return row.allowed;
    // fall back to seeded defaults for display before the table is populated
    if (role === "super_admin") return true;
    if (role === "dept_head") return ["projects.create", "projects.archive", "tasks.assign", "tasks.verify", "reports.export"].includes(perm);
    if (role === "employee") return perm === "reports.export";
    return false;
  };

  const toggle = async (role: string, perm: string) => {
    if (role === "super_admin") { toast("Super Admin always has every capability.", "info"); return; }
    const next = !allowed(role, perm);
    try {
      await setRolePermission(role, perm, next);
      await load();
    } catch (e: any) {
      toast(e?.message || "Failed to update permission.", "error");
    }
  };

  if (loading) return <div className="p-8"><LoadingState label="Loading permissions…" /></div>;

  return (
    <div className="p-6 sm:p-8 min-h-full">
      <PageHeader
        eyebrow="Administration · Access Control"
        title="Permissions"
        subtitle="Define role defaults and per-user overrides for a small, comprehensible capability set."
      />

      <div className="flex items-center gap-1 mb-4">
        {([
          { id: "roles", label: "Role defaults", icon: <ShieldCheck size={13} /> },
          { id: "users", label: "User overrides", icon: <Users size={13} /> },
        ] as const).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-['Lexend:Medium',_sans-serif] ${tab === t.id ? "bg-neutral-900 text-white" : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-50"}`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {tab === "roles" ? (
        <Card bodyClassName="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-neutral-50 border-b border-neutral-200">
                  <th className="px-4 py-3 text-left text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">Capability</th>
                  {ROLES.map((r) => (
                    <th key={r.key} className="px-4 py-3 text-center text-[10px] font-['Lexend:Medium',_sans-serif] uppercase tracking-wider text-neutral-400">{r.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_KEYS.map((perm) => (
                  <tr key={perm} className="border-b border-neutral-50">
                    <td className="px-4 py-3">
                      <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{PERMISSION_LABELS[perm]}</div>
                      <div className="text-[10.5px] font-mono text-neutral-400">{perm}</div>
                    </td>
                    {ROLES.map((r) => {
                      const on = allowed(r.key, perm);
                      const locked = r.key === "super_admin";
                      return (
                        <td key={r.key} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(r.key, perm)}
                            disabled={locked}
                            className={`w-9 h-5 rounded-full relative transition-colors ${on ? "bg-emerald-500" : "bg-neutral-200"} ${locked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"}`}
                            title={locked ? "Super Admin always allowed" : on ? "Allowed — click to revoke" : "Denied — click to grant"}
                          >
                            <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? "translate-x-4" : ""}`} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <UserOverridesPanel rolePerms={rolePerms} allowed={allowed} />
      )}
    </div>
  );
}

function UserOverridesPanel({
  rolePerms,
  allowed,
}: {
  rolePerms: RolePermissionRow[];
  allowed: (role: string, perm: string) => boolean;
}) {
  const { users } = useUsers();
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const [userId, setUserId] = useState("");
  const [overrides, setOverrides] = useState<UserOverrideRow[]>([]);

  const manageable = users.filter((u) => u.role !== "super_admin");
  const selected = users.find((u) => u.id === userId);

  const load = () => { if (userId) fetchUserOverrides(userId).then(setOverrides); };
  useEffect(() => { load(); }, [userId]);

  const effective = useMemo(() => {
    if (!selected) return new Set<string>();
    return resolvePermissions(selected.role, rolePerms, overrides);
  }, [selected, rolePerms, overrides]);

  const overrideFor = (perm: string) => overrides.find((o) => o.permission === perm);

  const cycle = async (perm: string) => {
    if (!selected || !userProfile) return;
    const current = overrideFor(perm);
    // cycle: default → allow → deny → default
    let next: boolean | null;
    if (!current) next = true;
    else if (current.allowed) next = false;
    else next = null;
    try {
      await setUserOverride(selected.id, perm, next, userProfile.id);
      load();
      toast(next === null ? "Reset to role default." : next ? "Override: allowed." : "Override: denied.", "success");
    } catch (e: any) {
      toast(e?.message || "Failed to set override.", "error");
    }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-600">User</span>
        <WSelect
          value={userId}
          onChange={setUserId}
          options={[{ value: "", label: "Choose a user…" }, ...manageable.map((u) => ({ value: u.id, label: `${u.full_name} · ${u.role}` }))]}
          className="min-w-[260px]"
        />
      </div>

      {!selected ? (
        <div className="text-center py-12 text-[13px] text-neutral-400">Select a user to view and override their permissions.</div>
      ) : (
        <div>
          <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-neutral-100">
            <InitialsAvatar name={selected.full_name} size={36} />
            <div>
              <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{selected.full_name}</div>
              <div className="text-[11.5px] text-neutral-400 capitalize">{selected.role.replace("_", " ")}</div>
            </div>
          </div>

          <div className="space-y-1.5">
            {PERMISSION_KEYS.map((perm) => {
              const roleDefault = allowed(selected.role, perm);
              const ov = overrideFor(perm);
              const isEffective = effective.has(perm);
              return (
                <div key={perm} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-neutral-50">
                  <div className="flex-1 min-w-0">
                    <div className="text-[12.5px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{PERMISSION_LABELS[perm]}</div>
                    <div className="text-[10.5px] text-neutral-400">
                      Role default: {roleDefault ? "Allowed" : "Denied"}
                      {ov && <span className="ml-1 text-blue-600">· override active</span>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[11px] font-['Lexend:Medium',_sans-serif] rounded-full px-2 py-0.5 ${isEffective ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {isEffective ? <Check size={11} /> : <Minus size={11} />} {isEffective ? "Allowed" : "Denied"}
                  </span>
                  <button
                    onClick={() => cycle(perm)}
                    className="inline-flex items-center gap-1 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600 border border-neutral-200 rounded-lg px-2 py-1 hover:bg-neutral-100"
                    title="Cycle: default → allow → deny"
                  >
                    {ov ? <RotateCcw size={11} /> : null}
                    {!ov ? "Set override" : ov.allowed ? "Allowed" : "Denied"}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[11px] text-neutral-400">Click “Set override” to cycle a capability through allow → deny → back to the role default. Every change is written to the audit log.</div>
        </div>
      )}
    </Card>
  );
}
