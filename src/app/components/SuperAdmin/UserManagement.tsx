// ─── User Management Module ─────────────────────────────────────
import React, { useState, useMemo } from "react";
import { useUsers, useDepartments } from "../../hooks/useFirebaseData";
import { useAuth } from "../../contexts/AuthContext";
import { updateUserProfile, deactivateUser, activateUser, incrementDeptEmployeeCount } from "../../services/firebaseService";
import { parsePdsFile, type PdsEmployeeNotes } from "../../services/pdsParser";
import { DataTable, Column } from "../ui/DataTable";
import { Modal, ModalButton } from "../ui/Modal";
import { FormField, TextInput, SelectInput } from "../ui/FormField";
import { useToast } from "../ui/Toast";
import type { UserProfile, UserRole } from "../../types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "department_head", label: "Department Head" },
  { value: "executive", label: "Executive" },
  { value: "legislative", label: "Legislative" },
  { value: "hrmo", label: "HRMO" },
  { value: "finance", label: "Finance" },
  { value: "councilor_pad", label: "Councilor Pad" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  department_head: "Department Head",
  employee: "Employee",
  executive: "Executive",
  legislative: "Legislative",
  hrmo: "HRMO",
  finance: "Finance",
  councilor_pad: "Councilor Pad",
};

// ─── Status / Role badges ────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    department_head: "bg-violet-100 text-violet-700",
    employee: "bg-emerald-100 text-emerald-700",
    executive: "bg-indigo-100 text-indigo-700",
    legislative: "bg-sky-100 text-sky-700",
    hrmo: "bg-rose-100 text-rose-700",
    finance: "bg-amber-100 text-amber-700",
    councilor_pad: "bg-cyan-100 text-cyan-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${colors[role] || "bg-neutral-100 text-neutral-600"}`}>
      {ROLE_LABELS[role] || role.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${
        status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
      }`}
    >
      {status}
    </span>
  );
}

function WorkloadBar({ value }: { value: number }) {
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
function CreateUserModal({
  isOpen,
  onClose,
  departments,
}: {
  isOpen: boolean;
  onClose: () => void;
  departments: { value: string; label: string }[];
}) {
  const { createManagedUser, user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
    departmentId: "",
    workload: 0,
  });
  const [adminPassword, setAdminPassword] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [importedNotes, setImportedNotes] = useState<PdsEmployeeNotes | null>(null);
  const [pdsFileName, setPdsFileName] = useState("");
  const [pdsError, setPdsError] = useState("");
  const [pdsImporting, setPdsImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setForm({ fullName: "", email: "", password: "", role: "employee", departmentId: "", workload: 0 });
    setAdminPassword("");
    setImportedNotes(null);
    setPdsFileName("");
    setPdsError("");
    setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    if (!form.password || form.password.length < 6) errs.password = "Min 6 characters";
    if (!form.departmentId) errs.departmentId = "Required";
    if (!adminPassword) errs.adminPassword = "Required to re-authenticate";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handlePdsFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!/\.xlsx$/i.test(file.name)) {
      const message = "Please upload a .xlsx Personal Data Sheet.";
      setPdsError(message);
      toast(message, "error");
      return;
    }

    setPdsImporting(true);
    setPdsError("");

    try {
      const parsed = await parsePdsFile(file, departments);
      setForm((prev) => ({
        ...prev,
        fullName: parsed.profile.fullName || prev.fullName,
        email: parsed.profile.email || prev.email,
        role: parsed.profile.role,
        departmentId: parsed.profile.departmentId || prev.departmentId,
        workload: parsed.profile.workload,
      }));
      setImportedNotes(parsed.employeeNotes);
      setPdsFileName(file.name);
      setErrors((prev) => {
        const next = { ...prev };
        delete next.fullName;
        delete next.email;
        delete next.departmentId;
        return next;
      });
      toast("PDS imported. Review the pre-filled fields before creating the user.", "success");
    } catch (err: any) {
      const message = err?.message || "Failed to import PDS file.";
      setPdsError(message);
      toast(message, "error");
    } finally {
      setPdsImporting(false);
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createManagedUser(
        user?.email || "",
        adminPassword,
        form.email.trim(),
        form.password,
        {
          employeeId: "",
          fullName: form.fullName.trim(),
          email: form.email.trim(),
          role: form.role,
          departmentId: form.departmentId,
          skills: {},
          workload: form.workload,
          burnoutLevel: form.workload >= 80 ? "high" : form.workload >= 50 ? "medium" : "low",
          status: "active",
        },
        importedNotes
          ? {
              ...importedNotes,
              updatedBy: user?.uid,
            }
          : undefined
      );

      // Increment department employee count
      await incrementDeptEmployeeCount(form.departmentId, 1);

      toast(`User "${form.fullName}" created successfully`, "success");
      onClose();
      resetForm();
    } catch (err: any) {
      toast(err?.message || "Failed to create user", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New User"
      width="max-w-xl"
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create User"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-900">
                Import from PDS
              </p>
              <p className="mt-0.5 text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
                Upload a CSC PDS .xlsx to pre-fill profile fields.
              </p>
              {pdsFileName && (
                <p className="mt-1 text-[11px] font-['Lexend:Regular',_sans-serif] text-emerald-700">
                  Imported {pdsFileName}; Team Intelligence notes will be saved automatically.
                </p>
              )}
              {pdsError && (
                <p className="mt-1 text-[11px] font-['Lexend:Regular',_sans-serif] text-red-600">
                  {pdsError}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={pdsImporting}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdsImporting ? "Importing..." : "Choose .xlsx"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={handlePdsFileChange}
            />
          </div>
        </div>

        <FormField label="Full Name" error={errors.fullName} required>
          <TextInput
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            placeholder="Juan Dela Cruz"
            hasError={!!errors.fullName}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" error={errors.email} required>
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="j.delacruz@eflow.gov.ph"
              hasError={!!errors.email}
            />
          </FormField>
          <FormField label="Password" error={errors.password} required>
            <TextInput
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min. 6 characters"
              hasError={!!errors.password}
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Role" required>
            <SelectInput
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              options={ROLE_OPTIONS}
            />
          </FormField>
          <FormField label="Department" error={errors.departmentId} required>
            <SelectInput
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={departments}
              placeholder="Select department"
              hasError={!!errors.departmentId}
            />
          </FormField>
        </div>

        <FormField label="Initial Workload (%)">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={form.workload}
            onChange={(e) => setForm({ ...form, workload: Math.min(100, Math.max(0, Number(e.target.value))) })}
          />
        </FormField>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" fill="currentColor">
            <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1zm0 2a1 1 0 1 1 0 2 1 1 0 0 1 0-2zM6.5 7h3l-.5 5h-2L6.5 7z" />
          </svg>
          <div>
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-amber-800">
              <strong>Your password</strong> is required to re-authenticate after creating the user account.
            </p>
          </div>
        </div>

        <FormField label="Your Admin Password" error={errors.adminPassword} required>
          <TextInput
            type="password"
            value={adminPassword}
            onChange={(e) => setAdminPassword(e.target.value)}
            placeholder="Enter your current password"
            hasError={!!errors.adminPassword}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Edit User Modal ─────────────────────────────────────────────
function EditUserModal({
  isOpen,
  onClose,
  user: editUser,
  departments,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  departments: { value: string; label: string }[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "",
    role: "employee" as UserRole,
    departmentId: "",
    workload: 0,
  });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (editUser) {
      setForm({
        fullName: editUser.fullName,
        role: editUser.role,
        departmentId: editUser.departmentId,
        workload: editUser.workload,
      });
    }
  }, [editUser]);

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateUserProfile(editUser.uid, {
        fullName: form.fullName,
        role: form.role,
        departmentId: form.departmentId,
        workload: form.workload,
        burnoutLevel: form.workload >= 80 ? "high" : form.workload >= 50 ? "medium" : "low",
      });
      toast(`User "${form.fullName}" updated`, "success");
      onClose();
    } catch (err: any) {
      toast(err?.message || "Failed to update user", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!editUser) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit User — ${editUser.fullName}`}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Full Name" required>
          <TextInput
            value={form.fullName}
            onChange={(e) => setForm({ ...form, fullName: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Role">
            <SelectInput
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
              options={ROLE_OPTIONS}
            />
          </FormField>
          <FormField label="Department">
            <SelectInput
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              options={departments}
              placeholder="Select department"
            />
          </FormField>
        </div>
        <FormField label="Workload (%)">
          <TextInput
            type="number"
            min={0}
            max={100}
            value={form.workload}
            onChange={(e) => setForm({ ...form, workload: Math.min(100, Math.max(0, Number(e.target.value))) })}
          />
        </FormField>
        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
          Email: {editUser.email} · UID: {editUser.uid.slice(0, 12)}...
        </div>
      </div>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function UserManagement() {
  const { users, loading } = useUsers();
  const { departments } = useDepartments();
  const { resetPassword } = useAuth();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);

  const deptOptions = useMemo(
    () => departments.filter((d) => d.status === "active").map((d) => ({ value: d.id, label: d.name || d.id })),
    [departments]
  );

  const deptMap = useMemo(
    () => Object.fromEntries(departments.map((d) => [d.id, d.name || d.id])),
    [departments]
  );

  const handleToggleStatus = async (user: UserProfile) => {
    try {
      if (user.status === "active") {
        await deactivateUser(user.uid);
        toast(`${user.fullName} deactivated`, "warning");
      } else {
        await activateUser(user.uid);
        toast(`${user.fullName} activated`, "success");
      }
    } catch (err: any) {
      toast(err?.message || "Failed to update status", "error");
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await resetPassword(email);
      toast(`Password reset email sent to ${email}`, "success");
    } catch (err: any) {
      toast(err?.message || "Failed to send reset email", "error");
    }
  };

  const columns: Column<UserProfile>[] = [
    {
      key: "name",
      header: "Name",
      sortable: true,
      sortValue: (u) => u.fullName,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-600">
              {u.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{u.fullName}</div>
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
      key: "department",
      header: "Department",
      sortable: true,
      sortValue: (u) => deptMap[u.departmentId] || u.departmentId,
      render: (u) => (
        <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
          {deptMap[u.departmentId] || u.departmentId || "—"}
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
      sortValue: (u) => u.status,
      render: (u) => <StatusBadge status={u.status} />,
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
              u.status === "active"
                ? "bg-red-50 text-red-600 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            }`}
          >
            {u.status === "active" ? "Deactivate" : "Activate"}
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
        data={users}
        columns={columns}
        keyExtractor={(u) => u.uid}
        onRowClick={(u) => setEditUser(u)}
        loading={loading}
        searchPlaceholder="Search by name, email, or department..."
        searchFilter={(u, q) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (deptMap[u.departmentId] || "").toLowerCase().includes(q) ||
          u.role.toLowerCase().includes(q)
        }
        emptyMessage="No users found"
      />

      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} departments={deptOptions} />
      <EditUserModal isOpen={!!editUser} onClose={() => setEditUser(null)} user={editUser} departments={deptOptions} />
    </div>
  );
}
