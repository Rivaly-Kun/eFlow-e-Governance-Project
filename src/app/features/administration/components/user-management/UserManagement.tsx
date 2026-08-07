import { useMemo, useState } from "react";
import { useOrgs, useProfiles } from "../../../../hooks/useSupabaseData";
import { toggleUserActive } from "../../../../../lib/supabaseService";
import { DataTable, type Column } from "../../../../components/ui/DataTable";
import { useToast } from "../../../../components/ui/Toast";
import type { UserProfile } from "../../../../types";
import { CreateUserModal } from "./CreateUserModal";
import { EditUserModal } from "./EditUserModal";
import { RoleBadge, StatusBadge, WorkloadBar } from "./userManagementPrimitives";

export function UserManagement() {
  const { profiles, loading } = useProfiles();
  const { orgs } = useOrgs();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);

  const orgOptions = useMemo(
    () => orgs.filter((o) => o.is_active).map((o) => ({ value: o.id, label: o.name })),
    [orgs]
  );

  const orgMap = useMemo(
    () => Object.fromEntries(orgs.map((o) => [o.id, o.name])),
    [orgs]
  );

  const handleToggleStatus = async (user: UserProfile) => {
    try {
      if (user.is_active) {
        await toggleUserActive(user.id, false);
        toast(`${user.full_name} deactivated`, "warning");
      } else {
        await toggleUserActive(user.id, true);
        toast(`${user.full_name} activated`, "success");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to update status", "error");
    }
  };

  const columns: Column<UserProfile>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (u) => u.full_name,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-600">
              {u.full_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{u.full_name}</div>
            <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      sortable: true,
      sortValue: (u) => u.role,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: "organization",
      header: "Organization",
      sortable: true,
      sortValue: (u) => orgMap[u.org_id || ""] || "",
      render: (u) => (
        <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
          {orgMap[u.org_id || ""] || "—"}
        </span>
      ),
    },
    {
      key: "workload",
      header: "Workload",
      sortable: true,
      sortValue: (u) => u.workload,
      render: (u) => <WorkloadBar value={u.workload} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      sortValue: (u) => (u.is_active ? 1 : 0),
      render: (u) => <StatusBadge active={u.is_active} />,
    },
    {
      key: "actions",
      header: "",
      width: "120px",
      render: (u) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditUser(u); }}
            className="px-2 py-1 rounded text-[10px] font-['Lexend:Medium',_sans-serif] font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleStatus(u); }}
            className={`px-2 py-1 rounded text-[10px] font-['Lexend:Medium',_sans-serif] font-medium cursor-pointer transition-colors ${
              u.is_active
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            {u.is_active ? "Deactivate" : "Activate"}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        Super Admin <span className="mx-1.5">/</span> <span className="text-neutral-700">User Management</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900">
          User Management
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
          </svg>
          Create User
        </button>
      </div>

      <DataTable
        data={profiles}
        columns={columns}
        keyExtractor={(u) => u.id}
        onRowClick={(u) => setEditUser(u)}
        loading={loading}
        searchPlaceholder="Search by name, email, or organization..."
        searchFilter={(u, q) =>
          u.full_name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (orgMap[u.org_id || ""] || "").toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        }
        emptyMessage="No users found"
      />

      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} orgOptions={orgOptions} />
      <EditUserModal isOpen={!!editUser} onClose={() => setEditUser(null)} user={editUser} orgOptions={orgOptions} />
    </div>
  );
}
