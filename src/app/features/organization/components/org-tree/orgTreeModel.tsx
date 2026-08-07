import dagre from "@dagrejs/dagre";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { Edge, Node } from "@xyflow/react";
import type { Organization, OrgType } from "../../../../types";

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

export const ORG_TYPE_OPTIONS: { value: OrgType; label: string }[] = [
  { value: 'department', label: 'Department' },
  { value: 'division', label: 'Division' },
  { value: 'section', label: 'Section' },
  { value: 'unit', label: 'Unit' },
];

export const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-red-100 text-red-700',
  dept_head: 'bg-violet-100 text-violet-700',
  employee: 'bg-emerald-100 text-emerald-700',
};

export const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  dept_head: 'Dept Head',
  employee: 'Employee',
};

// ─── Dagre layout helper ─────────────────────────────────────────
export function layoutNodes(nodes: Node[], edges: Edge[]): Node[] {
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
export function buildGraph(orgs: Organization[]): { nodes: Node[]; edges: Edge[] } {
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

export const nodeTypes = { orgNode: OrgNodeComp };

// ─── Context Menu ────────────────────────────────────────────────
