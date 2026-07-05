// ─── User Management Module (Supabase) ──────────────────────────
import React, { useState, useMemo } from "react";
import { useProfiles } from "../../hooks/useSupabaseData";
import { useOrgs } from "../../hooks/useSupabaseData";
import { useAuth } from "../../contexts/AuthContext";
import { updateProfile, toggleUserActive } from "../../../lib/supabaseService";
import { DataTable, Column } from "../ui/DataTable";
import { Modal, ModalButton } from "../ui/Modal";
import { FormField, TextInput, SelectInput } from "../ui/FormField";
import { useToast } from "../ui/Toast";
import type { UserProfile, UserRole } from "../../types";

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "team_leader", label: "Team Leader" },
  { value: "dept_head", label: "Department Head" },
  { value: "super_admin", label: "Super Admin" },
];

const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  dept_head: "Dept Head",
  team_leader: "Team Leader",
  employee: "Employee",
};

// ─── Status / Role badges ────────────────────────────────────────
function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    super_admin: "bg-red-100 text-red-700",
    dept_head: "bg-violet-100 text-violet-700",
    team_leader: "bg-blue-100 text-blue-700",
    employee: "bg-emerald-100 text-emerald-700",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${colors[role] || "bg-neutral-100 text-neutral-600"}`}>
      {ROLE_LABELS[role] || role.replace(/_/g, " ")}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
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
  orgOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  orgOptions: { value: string; label: string }[];
}) {
  const { createManagedUser } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    role: "employee" as UserRole,
    orgId: "",
    workload: 0,
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Skills tab state
  const [activeTab, setActiveTab] = useState<"basic" | "skills">("basic");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setForm({ fullName: "", email: "", password: "", role: "employee", orgId: "", workload: 0 });
    setErrors({});
    setActiveTab("basic");
    setSkillInput("");
    setSkills({});
  };

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills[trimmed]) return;
    setSkills((prev) => ({ ...prev, [trimmed]: true }));
    setSkillInput("");
  };

  const removeSkill = (key: string) => {
    setSkills((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.fullName.trim()) errs.fullName = "Required";
    if (!form.email.trim()) errs.email = "Required";
    if (!form.password || form.password.length < 6) errs.password = "Min 6 characters";
    if (!form.orgId) errs.orgId = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createManagedUser(
        form.email.trim(),
        form.password,
        {
          full_name: form.fullName.trim(),
          role: form.role,
          org_id: form.orgId,
          employee_id: "",
          skills,
        },
      );

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
      <>
        {/* Tab bar */}
        <div className="flex border-b border-neutral-200 mb-4 -mt-1">
          <button
            onClick={() => setActiveTab("basic")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "basic"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "skills"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Skills
            {Object.keys(skills).length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-['Lexend:SemiBold',_sans-serif]">
                {Object.keys(skills).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "basic" && (
          <div className="space-y-4">
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
              <FormField label="Organization" error={errors.orgId} required>
                <SelectInput
                  value={form.orgId}
                  onChange={(e) => setForm({ ...form, orgId: e.target.value })}
                  options={orgOptions}
                  placeholder="Select organization"
                  hasError={!!errors.orgId}
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
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-3">
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Add skills that the AI recommendation engine will use to match this employee to tasks. Each skill is a keyword (e.g. "data analysis", "coordination", "budgeting").
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter or +"
                className="flex-1 px-3 py-2 text-[12px] font-['Lexend:Regular',_sans-serif] border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white text-neutral-900 placeholder:text-neutral-400"
              />
              <button
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
            {Object.keys(skills).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-[12px] font-['Lexend:Regular',_sans-serif]">
                No skills added yet. Skills help the AI recommend the right employee for each task.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.keys(skills).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    </Modal>
  );
}

// ─── Edit User Modal ─────────────────────────────────────────────
function EditUserModal({
  isOpen,
  onClose,
  user: editUser,
  orgOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  orgOptions: { value: string; label: string }[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    fullName: "",
    role: "employee" as UserRole,
    orgId: "",
    workload: 0,
  });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"basic" | "skills">("basic");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (editUser) {
      setForm({
        fullName: editUser.full_name,
        role: editUser.role,
        orgId: editUser.org_id || "",
        workload: editUser.workload,
      });
      setSkills(editUser.skills || {});
      setActiveTab("basic");
      setSkillInput("");
    }
  }, [editUser]);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (!trimmed || skills[trimmed]) return;
    setSkills((prev) => ({ ...prev, [trimmed]: true }));
    setSkillInput("");
  };

  const removeSkill = (key: string) => {
    setSkills((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await updateProfile(editUser.id, {
        full_name: form.fullName,
        role: form.role,
        org_id: form.orgId || null,
        workload: form.workload,
        burnout_level: form.workload >= 80 ? "high" : form.workload >= 50 ? "medium" : "low",
        skills,
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
      title={`Edit User — ${editUser.full_name}`}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </ModalButton>
        </>
      }
    >
      <>
        {/* Tab bar */}
        <div className="flex border-b border-neutral-200 mb-4 -mt-1">
          <button
            onClick={() => setActiveTab("basic")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "basic"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab("skills")}
            className={`px-4 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === "skills"
                ? "border-neutral-900 text-neutral-900"
                : "border-transparent text-neutral-400 hover:text-neutral-700"
            }`}
          >
            Skills
            {Object.keys(skills).length > 0 && (
              <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-neutral-900 text-white text-[9px] font-['Lexend:SemiBold',_sans-serif]">
                {Object.keys(skills).length}
              </span>
            )}
          </button>
        </div>

        {activeTab === "basic" && (
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
              <FormField label="Organization">
                <SelectInput
                  value={form.orgId}
                  onChange={(e) => setForm({ ...form, orgId: e.target.value })}
                  options={orgOptions}
                  placeholder="Select organization"
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
              Email: {editUser.email} · ID: {editUser.id.slice(0, 12)}...
            </div>
          </div>
        )}

        {activeTab === "skills" && (
          <div className="space-y-3">
            <p className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
              Add or remove skills for this employee. The AI recommendation engine uses these to match tasks. Each skill is a keyword (e.g. "data analysis", "coordination", "budgeting").
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                placeholder="Type a skill and press Enter or +"
                className="flex-1 px-3 py-2 text-[12px] font-['Lexend:Regular',_sans-serif] border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-900 bg-white text-neutral-900 placeholder:text-neutral-400"
              />
              <button
                onClick={addSkill}
                disabled={!skillInput.trim()}
                className="px-3 py-2 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition-colors"
              >
                +
              </button>
            </div>
            {Object.keys(skills).length === 0 ? (
              <div className="text-center py-8 text-neutral-400 text-[12px] font-['Lexend:Regular',_sans-serif]">
                No skills added yet. Skills help the AI recommend the right employee for each task.
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {Object.keys(skills).map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-['Lexend:Medium',_sans-serif] font-medium"
                  >
                    {skill}
                    <button
                      onClick={() => removeSkill(skill)}
                      className="text-neutral-400 hover:text-neutral-700 cursor-pointer transition-colors leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </>
    </Modal>
  );
}

// ─── Main Component ──────────────────────────────────────────────
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
