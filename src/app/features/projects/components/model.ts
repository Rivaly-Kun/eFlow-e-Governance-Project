export interface ProjectScope {
  /** super admin sees all orgs; dept head is limited to their subtree. */
  isSuperAdmin: boolean;
  /** org ids the user may create/place projects in (empty = all for admin). */
  scopedOrgIds: string[];
}

export const MILESTONE_STATUS_META: Record<string, { label: string; tone: string }> = {
  not_started: { label: "Not started", tone: "bg-neutral-100 text-neutral-600" },
  in_progress: { label: "In progress", tone: "bg-blue-50 text-blue-700" },
  at_risk: { label: "At risk", tone: "bg-amber-50 text-amber-700" },
  completed: { label: "Completed", tone: "bg-emerald-50 text-emerald-700" },
};

// ─── Main ProjectsWorkspace ───────────────────────────────────────
