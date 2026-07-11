// ─── Super Admin: Org Tree Builder ──────────────────────────────
// React Flow canvas for building the org structure visually.
// Drag users from the right panel onto org nodes to assign them.

import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  NodeProps,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
import { useOrgs } from '../../hooks/useSupabaseData';
import { useProfiles } from '../../hooks/useSupabaseData';
import {
  createOrg,
  updateOrg,
  deleteOrg,
  assignOrgHead,
  assignUserToOrg,
  recreateOrg,
} from '../../../lib/supabaseService';
import { Modal, ModalButton } from '../ui/Modal';
import { FormField, TextInput, SelectInput } from '../ui/FormField';
import { useToast } from '../ui/Toast';
import type { Organization, UserProfile, OrgType } from '../../types';

// ─── Constants ───────────────────────────────────────────────────
const ORG_TYPE_ICONS: Record<OrgType, string> = {
  lgu: '\u{1F3DB}',
  department: '\u{1F3E2}',
  division: '\u{1F4C2}',
  section: '\u{1F4C1}',
  unit: '\u{1F4C4}',
};

const ORG_TYPE_COLORS: Record<OrgType, string> = {
  lgu: 'bg-slate-800 text-white',
  department: 'bg-blue-600 text-white',
  division: 'bg-indigo-500 text-white',
  section: 'bg-violet-500 text-white',
  unit: 'bg-purple-400 text-white',
};

const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: 'department', label: 'Department' },
  { value: 'division', label: 'Division' },
  { value: 'section', label: 'Section' },
  { value: 'unit', label: 'Unit' },
];

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  dept_head: 'bg-violet-100 text-violet-700',
  employee: 'bg-emerald-100 text-emerald-700',
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  dept_head: 'Dept Head',
  employee: 'Employee',
};

// ─── Dagre layout helper ─────────────────────────────────────────
function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 40 });

  for (const node of nodes) {
    g.setNode(node.id, { width: 180, height: 90 });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - 90,
        y: pos.y - 45,
      },
    };
  });
}

// ─── Build graph from flat org list ──────────────────────────────
function buildGraph(orgs: Organization[]): { nodes: Node[]; edges: Edge[] } {
  const nodes: Node[] = orgs
    .filter((o) => o.is_active)
    .map((o) => ({
      id: o.id,
      type: 'orgNode',
      position: { x: 0, y: 0 },
      data: { ...o } as Record<string, unknown>,
    }));

  const edges: Edge[] = orgs
    .filter((o) => o.parent_id && o.is_active)
    .map((o) => ({
      id: `e-${o.parent_id}-${o.id}`,
      source: o.parent_id!,
      target: o.id,
      type: 'smoothstep',
      style: { stroke: '#d4d4d4', strokeWidth: 2 },
    }));

  return { nodes, edges };
}

// ─── Custom OrgNode Component ────────────────────────────────────
function OrgNodeComp({ data }: NodeProps) {
  const org = data as unknown as Organization;
  const isRoot = org.org_type === 'lgu';
  const icon = ORG_TYPE_ICONS[org.org_type] || '\u{1F4C2}';
  const colorClass = ORG_TYPE_COLORS[org.org_type] || 'bg-blue-600 text-white';

  return (
    <div
      className={`relative min-w-[160px] rounded-xl border shadow-sm p-3 transition-all
        ${isRoot ? 'bg-slate-900 text-white border-slate-700' : 'bg-white border-neutral-200'}
        hover:shadow-md`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 !bg-neutral-400" />
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <div className="flex-1 min-w-0">
          <div
            className={`text-[13px] truncate font-['Lexend:SemiBold',_sans-serif] font-semibold
              ${isRoot ? 'text-white' : 'text-neutral-900'}`}
          >
            {org.name}
          </div>
        </div>
      </div>
      <div className="mt-1.5 flex items-center gap-1.5">
        <span
          className={`px-1.5 py-0.5 rounded-full text-[9px] font-['Lexend:Medium',_sans-serif] font-medium ${colorClass}`}
        >
          {org.org_type}
        </span>
        {org.member_count != null && org.member_count > 0 && (
          <span className="px-1.5 py-0.5 rounded-full bg-neutral-100 text-[9px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-600">
            {org.member_count} members
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 !bg-neutral-400" />
    </div>
  );
}

const nodeTypes = { orgNode: OrgNodeComp };

// ─── Context Menu ────────────────────────────────────────────────
interface ContextMenuState {
  x: number;
  y: number;
  orgId?: string;
}

function ContextMenu({
  menu,
  onClose,
  onAddChild,
  onEdit,
  onAssignHead,
  onDelete,
  canDelete,
}: {
  menu: ContextMenuState;
  onClose: () => void;
  onAddChild: () => void;
  onEdit: () => void;
  onAssignHead: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.context-menu')) onClose();
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', escHandler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', escHandler);
    };
  }, [onClose]);

  return (
    <div
      className="context-menu fixed z-50 bg-white rounded-xl border border-neutral-200 shadow-lg py-1 min-w-[180px]"
      style={{ left: menu.x, top: menu.y }}
    >
      {menu.orgId && (
        <>
          <button
            onClick={() => { onAddChild(); onClose(); }}
            className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
          >
            <span className="text-[14px]">+</span> Add child dept
          </button>
          <button
            onClick={() => { onEdit(); onClose(); }}
            className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
          >
            <span className="text-[14px]">✏️</span> Edit
          </button>
          <button
            onClick={() => { onAssignHead(); onClose(); }}
            className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
          >
            <span className="text-[14px]">👤</span> Assign head
          </button>
          <div className="border-t border-neutral-100 my-1" />
          <button
            onClick={() => { onDelete(); onClose(); }}
            disabled={!canDelete}
            className={`w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] cursor-pointer flex items-center gap-2
              ${canDelete ? 'text-red-600 hover:bg-red-50' : 'text-neutral-300 cursor-not-allowed'}`}
          >
            <span className="text-[14px]">🗑</span> Delete
          </button>
        </>
      )}
      {!menu.orgId && (
        <button
          onClick={() => { onAddChild(); onClose(); }}
          className="w-full text-left px-3 py-2 text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-700 hover:bg-neutral-50 cursor-pointer flex items-center gap-2"
        >
          <span className="text-[14px]">+</span> Add department
        </button>
      )}
    </div>
  );
}

// ─── Add/Edit Org Modal ──────────────────────────────────────────
function OrgModal({
  isOpen,
  onClose,
  org,
  parentId,
  orgs,
  profiles,
}: {
  isOpen: boolean;
  onClose: () => void;
  org?: Organization;
  parentId?: string;
  orgs: Organization[];
  profiles: UserProfile[];
}) {
  const { toast } = useToast();
  const isEdit = !!org;
  const [form, setForm] = useState({ name: '', org_type: 'department' as OrgType, description: '', parent_id: '', head_user_id: '' });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (org) {
      setForm({
        name: org.name,
        org_type: org.org_type,
        description: org.description,
        parent_id: org.parent_id || '',
        head_user_id: org.head_user_id || '',
      });
    } else {
      setForm({
        name: '',
        org_type: parentId ? 'division' : 'department',
        description: '',
        parent_id: parentId || '',
        head_user_id: '',
      });
    }
  }, [org, parentId, isOpen]);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      if (isEdit && org) {
        await updateOrg(org.id, {
          name: form.name.trim(),
          description: form.description.trim(),
        });
        if (form.head_user_id !== org.head_user_id) {
          await assignOrgHead(org.id, form.head_user_id || null);
        }
        toast(`"${form.name}" updated`, 'success');
      } else {
        const newOrg = await createOrg({
          name: form.name.trim(),
          parent_id: form.parent_id || null,
          org_type: form.org_type,
          description: form.description.trim(),
        });
        if (form.head_user_id) {
          await assignOrgHead(newOrg.id, form.head_user_id);
        }
        toast(`"${form.name}" created`, 'success');
      }
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const parentOptions = orgs
    .filter((o) => o.id !== org?.id)
    .map((o) => ({ value: o.id, label: o.name }));

  const headOptions = profiles
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: `${p.full_name} (${p.email})` }));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Organization — ${org?.name}` : 'Add Organization'}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create'}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Name" error={errors.name} required>
          <TextInput
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. LEDIPO"
            hasError={!!errors.name}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Org Type">
            <SelectInput
              value={form.org_type}
              onChange={(e) => setForm({ ...form, org_type: e.target.value as OrgType })}
              options={ORG_TYPE_OPTIONS}
            />
          </FormField>
          <FormField label="Parent">
            <SelectInput
              value={form.parent_id}
              onChange={(e) => setForm({ ...form, parent_id: e.target.value })}
              options={[{ value: '', label: 'No parent (root-level)' }, ...parentOptions]}
            />
          </FormField>
        </div>
        <FormField label="Description">
          <TextInput
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Brief description..."
          />
        </FormField>
        <FormField label="Department Head">
          <SelectInput
            value={form.head_user_id}
            onChange={(e) => setForm({ ...form, head_user_id: e.target.value })}
            options={[{ value: '', label: 'No head assigned' }, ...headOptions]}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Assign Head Modal ───────────────────────────────────────────
function AssignHeadModal({
  isOpen,
  onClose,
  org,
  profiles,
}: {
  isOpen: boolean;
  onClose: () => void;
  org: Organization | null;
  profiles: UserProfile[];
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) setSelected(org.head_user_id || '');
  }, [org, isOpen]);

  const handleSave = async () => {
    if (!org) return;
    setSaving(true);
    try {
      await assignOrgHead(org.id, selected || null);
      toast(`Head updated for ${org.name}`, 'success');
      onClose();
    } catch (err: any) {
      toast(err?.message || 'Failed to assign head', 'error');
    } finally {
      setSaving(false);
    }
  };

  const headOptions = profiles
    .filter((p) => p.is_active)
    .map((p) => ({ value: p.id, label: `${p.full_name} (${p.email})` }));

  if (!org) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Assign Head — ${org.name}`}
      footer={
        <>
          <ModalButton onClick={onClose}>Cancel</ModalButton>
          <ModalButton variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Assign'}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <FormField label="Department Head">
          <SelectInput
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            options={[{ value: '', label: 'No head assigned' }, ...headOptions]}
          />
        </FormField>
      </div>
    </Modal>
  );
}

// ─── Users Panel (right sidebar) ─────────────────────────────────
function UsersPanel({
  profiles,
  orgs,
  search,
  setSearch,
  onCreateUser,
}: {
  profiles: UserProfile[];
  orgs: Organization[];
  search: string;
  setSearch: (v: string) => void;
  onCreateUser: () => void;
}) {
  const orgMap = useMemo(
    () => Object.fromEntries(orgs.map((o) => [o.id, o.name])),
    [orgs]
  );

  const filtered = useMemo(
    () =>
      search
        ? profiles.filter(
            (p) =>
              p.full_name.toLowerCase().includes(search.toLowerCase()) ||
              p.email.toLowerCase().includes(search.toLowerCase()) ||
              p.role.toLowerCase().includes(search.toLowerCase())
          )
        : profiles,
    [profiles, search]
  );

  const unassigned = profiles.filter((p) => !p.org_id).length;
  const assigned = profiles.filter((p) => p.org_id).length;

  return (
    <div className="w-[280px] shrink-0 bg-white border-l border-neutral-200 flex flex-col h-full">
      <div className="p-3 border-b border-neutral-100">
        <div className="text-[12px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-800 mb-2">
          Users
        </div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users..."
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-[12px] font-['Lexend:Regular',_sans-serif] placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {filtered.map((p) => (
          <div
            key={p.id}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('userId', p.id);
              e.dataTransfer.effectAllowed = 'move';
            }}
            className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 cursor-grab active:cursor-grabbing transition-colors border border-transparent hover:border-neutral-200"
          >
            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-['Lexend:SemiBold',_sans-serif] font-semibold text-neutral-600">
                {p.full_name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-900 truncate">
                {p.full_name}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`px-1 py-0.5 rounded-full text-[8px] font-['Lexend:Medium',_sans-serif] font-medium ${ROLE_COLORS[p.role] || 'bg-neutral-100 text-neutral-600'}`}
                >
                  {ROLE_LABELS[p.role] || p.role}
                </span>
                {p.org_id ? (
                  <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-500 truncate">
                    {orgMap[p.org_id] || '—'}
                  </span>
                ) : (
                  <span className="text-[9px] font-['Lexend:Regular',_sans-serif] text-neutral-400">Unassigned</span>
                )}
              </div>
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-[11px] text-neutral-400 text-center py-8">No users found</div>
        )}
      </div>

      <div className="p-3 border-t border-neutral-100 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
          <span>Unassigned: {unassigned}</span>
          <span>Assigned: {assigned}</span>
        </div>
        <button
          onClick={onCreateUser}
          className="w-full px-4 py-2.5 rounded-lg bg-neutral-900 text-white text-[12px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 cursor-pointer transition-colors"
        >
          + Create User
        </button>
      </div>
    </div>
  );
}

// ─── Main Org Tree Builder Component ────────────────────────────
function OrgTreeBuilderInner() {
  const { orgs, loading: orgsLoading } = useOrgs();
  const { profiles, loading: profilesLoading } = useProfiles();
  const { toast } = useToast();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | undefined>(undefined);
  const [addingParentId, setAddingParentId] = useState<string | undefined>(undefined);
  const [showHeadModal, setShowHeadModal] = useState(false);
  const [headOrg, setHeadOrg] = useState<Organization | null>(null);
  const [search, setSearch] = useState('');
  const reactFlowInstance = useReactFlow();
  const pendingLayoutRef = useRef(false);

  interface UndoItem {
    id: string;
    org: Organization;
    expiresAt: number;
  }

  const [undoStack, setUndoStack] = useState<UndoItem[]>([]);

  // Periodically clean up expired undo items
  useEffect(() => {
    const interval = setInterval(() => {
      setUndoStack((prev) => {
        const now = Date.now();
        const active = prev.filter((item) => item.expiresAt > now);
        if (active.length !== prev.length) {
          return active;
        }
        return prev;
      });
    }, 500);
    return () => clearInterval(interval);
  }, []);

  // Build graph from orgs
  useEffect(() => {
    const { nodes: newNodes, edges: newEdges } = buildGraph(orgs);
    const laidOut = layoutNodes(newNodes, newEdges);
    setNodes(laidOut);
    setEdges(newEdges);
    pendingLayoutRef.current = false;
  }, [orgs, setNodes, setEdges]);

  const runLayout = useCallback(() => {
    setNodes((nds) => layoutNodes(nds, edges));
  }, [setNodes, edges]);

  // Auto-layout after operations
  useEffect(() => {
    if (pendingLayoutRef.current) {
      pendingLayoutRef.current = false;
      runLayout();
    }
  }, [nodes.length, runLayout]);

  // Context menu handlers
  const handleNodeContext = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      setContextMenu({ x: event.clientX, y: event.clientY, orgId: node.id });
    },
    []
  );

  const handlePaneContext = useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      event.preventDefault();
      setContextMenu({ x: (event as React.MouseEvent).clientX, y: (event as React.MouseEvent).clientY });
    },
    []
  );

  const handleAddChild = useCallback(() => {
    if (contextMenu?.orgId) {
      setAddingParentId(contextMenu.orgId);
    } else {
      setAddingParentId(undefined);
    }
    setEditingOrg(undefined);
    setShowOrgModal(true);
  }, [contextMenu]);

  const handleEdit = useCallback(() => {
    const org = orgs.find((o) => o.id === contextMenu?.orgId);
    if (org) {
      setEditingOrg(org);
      setAddingParentId(undefined);
      setShowOrgModal(true);
    }
  }, [contextMenu, orgs]);

  const handleAssignHead = useCallback(() => {
    const org = orgs.find((o) => o.id === contextMenu?.orgId);
    if (org) {
      setHeadOrg(org);
      setShowHeadModal(true);
    }
  }, [contextMenu, orgs]);

  const handleDelete = useCallback(async () => {
    const orgId = contextMenu?.orgId;
    if (!orgId) return;

    const org = orgs.find((o) => o.id === orgId);
    if (!org) return;

    if (org.org_type === 'lgu') {
      toast('Cannot delete the root LGU node', 'error');
      return;
    }

    try {
      await deleteOrg(orgId);
      const toastId = Math.random().toString(36).slice(2);
      setUndoStack((prev) => [
        ...prev,
        {
          id: toastId,
          org,
          expiresAt: Date.now() + 30000,
        },
      ]);
      toast(`"${org.name}" deleted`, 'success');
    } catch (err: any) {
      toast(err?.message || 'Failed to delete', 'error');
    }
  }, [contextMenu, orgs, toast]);

  const handleUndo = useCallback(async (item: UndoItem) => {
    try {
      await recreateOrg(item.org);
      toast(`Restored "${item.org.name}"`, 'success');
      setUndoStack((prev) => prev.filter((t) => t.id !== item.id));
    } catch (err: any) {
      toast(err?.message || 'Failed to restore', 'error');
    }
  }, [toast]);

  const dismissUndo = useCallback((id: string) => {
    setUndoStack((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Drag-drop from users panel onto org nodes
  const onNodeDrop: React.DragEventHandler<HTMLDivElement> = useCallback(
    async (event) => {
      const userId = event.dataTransfer.getData('userId');
      if (!userId) return;
      event.preventDefault();

      const target = event.target as HTMLElement;
      const nodeEl = target.closest('.react-flow__node');
      if (!nodeEl) return;
      const nodeId = nodeEl.getAttribute('data-id');
      if (!nodeId) return;

      try {
        await assignUserToOrg(userId, nodeId);
        const profile = profiles.find((p) => p.id === userId);
        const org = orgs.find((o) => o.id === nodeId);
        toast(
          `${profile?.full_name || 'User'} assigned to ${org?.name || 'org'}`,
          'success'
        );
      } catch (err: any) {
        toast(err?.message || 'Failed to assign user', 'error');
      }
    },
    [profiles, orgs, toast]
  );

  const onDragOverNode: React.DragEventHandler<HTMLDivElement> = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Can delete check
  const canDelete = useCallback(
    (orgId?: string) => {
      if (!orgId) return false;
      const hasChildren = orgs.some((o) => o.parent_id === orgId);
      const hasUsers = profiles.some((p) => p.org_id === orgId);
      const org = orgs.find((o) => o.id === orgId);
      if (org?.org_type === 'lgu') return false;
      return !hasChildren && !hasUsers;
    },
    [orgs, profiles]
  );

  // Attach node properties for drag-drop
  const nodesWithHandlers: Node[] = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...(n.data as Record<string, unknown>),
          member_count: profiles.filter((p) => p.org_id === n.id).length,
        },
      })),
    [nodes, profiles]
  );

  if (orgsLoading || profilesLoading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neutral-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
          <span className="text-[13px] font-['Lexend:Regular',_sans-serif] text-neutral-500">
            Loading org structure...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Main canvas area */}
      <div className="flex-1 min-w-0 flex flex-col relative">
        {/* Stacked Undo Notifications */}
        <div className="absolute top-4 right-4 z-[100] flex flex-col gap-2.5 pointer-events-none w-80">
          {undoStack.map((item) => (
            <div
              key={item.id}
              className="pointer-events-auto relative overflow-hidden bg-neutral-950/95 backdrop-blur-md border border-neutral-800 text-white rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.5)] px-4 py-3 flex items-center justify-between gap-3 animate-[undo-slide-in_0.3s_ease-out] font-['Lexend:Regular',_sans-serif]"
            >
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-[9px] font-['Lexend:Bold',_sans-serif] font-bold text-neutral-400 uppercase tracking-wider">Deleted</span>
                <span className="text-[13px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-100 truncate block">
                  {item.org.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => handleUndo(item)}
                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[11px] font-['Lexend:SemiBold',_sans-serif] font-semibold cursor-pointer transition-all shadow-md shadow-blue-900/30"
                >
                  Undo
                </button>
                <button
                  onClick={() => dismissUndo(item.id)}
                  className="text-neutral-400 hover:text-neutral-200 cursor-pointer p-1 rounded-md hover:bg-neutral-900 transition-colors"
                >
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="currentColor">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                  </svg>
                </button>
              </div>
              
              {/* Progress/Timer Bar */}
              <div 
                className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-blue-600 to-blue-400"
                style={{ 
                  animation: 'undo-shrink 30s linear forwards',
                  width: '100%'
                }} 
              />
            </div>
          ))}
        </div>

        <style>{`
          @keyframes undo-shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
          @keyframes undo-slide-in {
            from { transform: translateX(120%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
        `}</style>

        {/* Toolbar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-neutral-200 bg-white shrink-0">
          <button
            onClick={() => { setAddingParentId(undefined); setEditingOrg(undefined); setShowOrgModal(true); }}
            className="px-3 py-1.5 rounded-lg bg-neutral-900 text-white text-[11px] font-['Lexend:Medium',_sans-serif] font-medium hover:bg-neutral-800 cursor-pointer transition-colors"
          >
            + Add Root Dept
          </button>
          <button
            onClick={runLayout}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Auto Layout
          </button>
          <div className="w-px h-5 bg-neutral-200 mx-1" />
          <button
            onClick={() => reactFlowInstance.zoomIn()}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Zoom In
          </button>
          <button
            onClick={() => reactFlowInstance.zoomOut()}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Zoom Out
          </button>
          <button
            onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
            className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-[11px] font-['Lexend:Medium',_sans-serif] font-medium text-neutral-700 hover:bg-neutral-50 cursor-pointer transition-colors"
          >
            Fit View
          </button>
        </div>

        {/* Flow canvas */}
        <div className="flex-1">
          <ReactFlow
            nodes={nodesWithHandlers}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeContextMenu={handleNodeContext}
            onPaneContextMenu={handlePaneContext}
            onDrop={onNodeDrop}
            onDragOver={onDragOverNode}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#e5e5e5" />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
      </div>

      {/* Users panel */}
      <UsersPanel
        profiles={profiles.filter((p) => p.role !== 'super_admin')}
        orgs={orgs}
        search={search}
        setSearch={setSearch}
        onCreateUser={() => toast('Use the User Management page to create users', 'info')}
      />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onAddChild={handleAddChild}
          onEdit={handleEdit}
          onAssignHead={handleAssignHead}
          onDelete={handleDelete}
          canDelete={canDelete(contextMenu.orgId)}
        />
      )}

      {/* Modals */}
      <OrgModal
        isOpen={showOrgModal}
        onClose={() => { setShowOrgModal(false); setEditingOrg(undefined); setAddingParentId(undefined); }}
        org={editingOrg}
        parentId={addingParentId}
        orgs={orgs}
        profiles={profiles}
      />
      <AssignHeadModal
        isOpen={showHeadModal}
        onClose={() => { setShowHeadModal(false); setHeadOrg(null); }}
        org={headOrg}
        profiles={profiles}
      />
    </div>
  );
}

export function OrgTreeBuilder() {
  return (
    <ReactFlowProvider>
      <OrgTreeBuilderInner />
    </ReactFlowProvider>
  );
}
