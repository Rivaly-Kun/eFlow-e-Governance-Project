// ─── Department Management Module ───────────────────────────────
import React, { useState, useMemo } from "react";
import { useDepartments, useUsers, useProjects } from "../../hooks/useFirebaseData";
import {
  createDepartment,
  updateDepartment,
  archiveDepartment,
  assignDepartmentHead,
  checkDepartmentCodeExists,
} from "../../services/firebaseService";
import { DataTable, Column } from "../ui/DataTable";
import { Modal, ModalButton } from "../ui/Modal";
import { FormField, TextInput, SelectInput } from "../ui/FormField";
import { useToast } from "../ui/Toast";
import type { Department, UserProfile } from "../../types";

// ─── Create Department Modal ─────────────────────────────────────
function CreateDeptModal({
  isOpen,
  onClose,
  headOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  headOptions: { value: string; label: string }[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ id: "", name: "", description: "", headUserId: "" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.id.trim()) errs.id = "Required";
    if (!/^[A-Z0-9_]+$/.test(form.id.trim())) errs.id = "Uppercase letters, numbers, underscores only";
    if (!form.name.trim()) errs.name = "Required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const code = form.id.trim().toUpperCase();
      const exists = await checkDepartmentCodeExists(code);
      if (exists) {
        setErrors({ id: "Department code already exists" });
        setSaving(false);
        return;
      }
      await createDepartment({
        id: code,
        name: form.name.trim(),
        description: form.description.trim(),
        headUserId: form.headUserId,
        employeeCount: 0,
        status: "active",
        createdAt: Date.now(),
      });
      toast(`Department "${form.name}" created`, "success");
      onClose();
      setForm({ id: "", name: "", description: "", headUserId: "" });
      setErrors({});
    } catch (err: any) {
      toast(err?.message || "Failed to create department", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Department"
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSubmit} disabled={saving}>
            {saving ? "Creating..." : "Create Department"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[120px_1fr] gap-4">
          <FormField label="Code" error={errors.id} required>
            <TextInput
              value={form.id}
              onChange={(e) => setForm({ ...form, id: e.target.value.toUpperCase() })}
              placeholder="EPW"
              maxLength={10}
              hasError={!!errors.id}
            />
          </FormField>
          <FormField label="Department Name" error={errors.name} required>
            <TextInput
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Engineering & Public Works"
              hasError={!!errors.name}
            />
          </FormField>
        </div>

        <FormField label="Description">
          <TextInput
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description of the department..."
          />
        </FormField>

        <FormField label="Department Head">
          <SelectInput
            value={form.headUserId}
            onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
            options={[{ value: "", label: "No head assigned" }, ...headOptions]}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Edit Department Modal ───────────────────────────────────────
function EditDeptModal({
  isOpen,
  onClose,
  dept,
  headOptions,
}: {
  isOpen: boolean;
  onClose: () => void;
  dept: Department | null;
  headOptions: { value: string; label: string }[];
}) {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", description: "", headUserId: "" });
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (dept) {
      setForm({
        name: dept.name,
        description: dept.description,
        headUserId: dept.headUserId,
      });
    }
  }, [dept]);

  const handleSave = async () => {
    if (!dept) return;
    setSaving(true);
    try {
      await updateDepartment(dept.id, {
        name: form.name.trim(),
        description: form.description.trim(),
        headUserId: form.headUserId,
      });
      if (form.headUserId && form.headUserId !== dept.headUserId) {
        await assignDepartmentHead(dept.id, form.headUserId);
      }
      toast(`Department "${form.name}" updated`, "success");
      onClose();
    } catch (err: any) {
      toast(err?.message || "Failed to update", "error");
    } finally {
      setSaving(false);
    }
  };

  if (!dept) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit — ${dept.name}`}
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
        <FormField label="Department Name" required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </FormField>
        <FormField label="Description">
          <TextInput
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </FormField>
        <FormField label="Department Head">
          <SelectInput
            value={form.headUserId}
            onChange={(e) => setForm({ ...form, headUserId: e.target.value })}
            options={[{ value: "", label: "No head assigned" }, ...headOptions]}
          />
        </FormField>
        <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
          Code: {dept.id} · Created: {dept.createdAt ? new Date(dept.createdAt).toLocaleDateString() : "—"}
        </div>
      </div>
    </Modal>
  );
}

// ─── Department Detail Drawer ────────────────────────────────────
function DeptDetailDrawer({
  dept,
  users,
  projects,
  onClose,
}: {
  dept: Department;
  users: UserProfile[];
  projects: { id: string; title: string; status: string; department?: string }[];
  onClose: () => void;
}) {
  const deptUsers = users.filter((u) => u.departmentId === dept.id);
  const deptProjects = projects.filter((p) => p.department === dept.id);
  const head = users.find((u) => u.uid === dept.headUserId);

  return (
    <div className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
        <span className="text-[13px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800">
          {dept.name}
        </span>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 cursor-pointer">
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
          </svg>
        </button>
      </div>
      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        <div>
          <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Description
          </div>
          <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
            {dept.description || "—"}
          </p>
        </div>
        <div>
          <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-1">
            Department Head
          </div>
          <p className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
            {head ? head.fullName : "Not assigned"}
          </p>
        </div>
        <div>
          <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-2">
            Employees ({deptUsers.length})
          </div>
          {deptUsers.length === 0 ? (
            <div className="text-[11px] text-neutral-400">No employees</div>
          ) : (
            <div className="space-y-1.5">
              {deptUsers.map((u) => (
                <div key={u.uid} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-neutral-50">
                  <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
                    <span className="text-[8px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-600">
                      {u.fullName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700 flex-1 truncate">
                    {u.fullName}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-500">{u.workload}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-400 uppercase tracking-wider mb-2">
            Projects ({deptProjects.length})
          </div>
          {deptProjects.length === 0 ? (
            <div className="text-[11px] text-neutral-400">No projects</div>
          ) : (
            <div className="space-y-1.5">
              {deptProjects.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-neutral-50">
                  <span className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-700 truncate flex-1">
                    {p.title}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-['Lexend:Medium',_sans-serif] font-medium shrink-0 ml-2">
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────
export function DepartmentManagement() {
  const { departments, loading } = useDepartments();
  const { users } = useUsers();
  const { projects } = useProjects();
  const { toast } = useToast();
  const [showCreate, setShowCreate] = useState(false);
  const [editDept, setEditDept] = useState<Department | null>(null);
  const [detailDept, setDetailDept] = useState<Department | null>(null);

  const headOptions = useMemo(
    () =>
      users
        .filter((u) => u.status === "active")
        .map((u) => ({ value: u.uid, label: `${u.fullName} (${u.email})` })),
    [users]
  );

  const userMap = useMemo(
    () => Object.fromEntries(users.map((u) => [u.uid, u])),
    [users]
  );

  const handleArchive = async (dept: Department) => {
    try {
      await archiveDepartment(dept.id);
      toast(`Department "${dept.name}" archived`, "warning");
    } catch (err: any) {
      toast(err?.message || "Failed to archive", "error");
    }
  };



  const columns: Column<Department>[] = [
    {
      key: "code",
      header: "Code",
      sortable: true,
      sortValue: (d) => d.id,
      width: "80px",
      render: (d) => (
        <span className="text-[12px] font-mono font-medium text-neutral-900 bg-neutral-100 px-2 py-0.5 rounded">
          {d.id}
        </span>
      ),
    },
    {
      key: "name",
      header: "Department Name",
      sortable: true,
      sortValue: (d) => d.name,
      render: (d) => (
        <div>
          <div className="text-[12px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900">{d.name}</div>
          <div className="text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate max-w-[200px]">
            {d.description || "—"}
          </div>
        </div>
      ),
    },
    {
      key: "head",
      header: "Head",
      render: (d) => {
        const head = userMap[d.headUserId];
        return (
          <span className="text-[12px] font-['Lexend:Regular',_sans-serif] text-neutral-700">
            {head ? head.fullName : "—"}
          </span>
        );
      },
    },
    {
      key: "employees",
      header: "Employees",
      sortable: true,
      sortValue: (d) => d.employeeCount,
      render: (d) => {
        const actual = users.filter((u) => u.departmentId === d.id && u.status === "active").length;
        return (
          <span className="text-[12px] font-mono text-neutral-700 tabular-nums">
            {actual}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "Status",
      render: (d) => (
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-['Lexend:Medium',_sans-serif] font-medium ${
            d.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {d.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "140px",
      render: (d) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setEditDept(d); }}
            className="px-2 py-1 rounded text-[10px] font-['Lexend:Medium',_sans-serif] font-medium bg-neutral-100 text-neutral-600 hover:bg-neutral-200 cursor-pointer transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDetailDept(d); }}
            className="px-2 py-1 rounded text-[10px] font-['Lexend:Medium',_sans-serif] font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 cursor-pointer transition-colors"
          >
            Detail
          </button>
          {d.status === "active" && (
            <button
              onClick={(e) => { e.stopPropagation(); handleArchive(d); }}
              className="px-2 py-1 rounded text-[10px] font-['Lexend:Medium',_sans-serif] font-medium bg-red-50 text-red-600 hover:bg-red-100 cursor-pointer transition-colors"
            >
              Archive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="text-[11px] font-['Lexend:Regular',_sans-serif] text-neutral-400 mb-3">
        Super Admin <span className="mx-1.5">/</span> <span className="text-neutral-700">Departments</span>
      </div>

      <div className="flex items-center justify-between mb-6">
        <h2 className="font-['Lexend:SemiBold',_sans-serif] font-semibold text-[20px] text-neutral-900">
          Department Management
        </h2>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
            <path d="M8 2a.5.5 0 0 1 .5.5v5h5a.5.5 0 0 1 0 1h-5v5a.5.5 0 0 1-1 0v-5h-5a.5.5 0 0 1 0-1h5v-5A.5.5 0 0 1 8 2z" />
          </svg>
          Create Department
        </button>
      </div>

      <div className={`flex gap-4 ${detailDept ? "" : ""}`}>
        <div className={detailDept ? "flex-1 min-w-0" : "w-full"}>
          <DataTable
            data={departments}
            columns={columns}
            keyExtractor={(d) => d.id}
            onRowClick={(d) => setDetailDept(d)}
            loading={loading}
            searchPlaceholder="Search departments..."
            searchFilter={(d, q) =>
              d.id.toLowerCase().includes(q) ||
              d.name.toLowerCase().includes(q) ||
              d.description.toLowerCase().includes(q)
            }
            emptyMessage="No departments found"
          />
        </div>

        {detailDept && (
          <div className="w-[320px] shrink-0">
            <DeptDetailDrawer
              dept={detailDept}
              users={users}
              projects={projects}
              onClose={() => setDetailDept(null)}
            />
          </div>
        )}
      </div>

      <CreateDeptModal isOpen={showCreate} onClose={() => setShowCreate(false)} headOptions={headOptions} />
      <EditDeptModal isOpen={!!editDept} onClose={() => setEditDept(null)} dept={editDept} headOptions={headOptions} />
    </div>
  );
}
