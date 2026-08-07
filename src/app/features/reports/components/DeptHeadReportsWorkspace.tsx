import { useScopedOrgIds } from "../../../hooks/useSupabaseData";
import { ReportsWorkspace } from "../../../components/workflow/ReportsWorkspace";

/** Preserves Department Head subtree scoping for the shared reports workspace. */
export function DeptHeadReportsWorkspace() {
  const { scopedOrgIds, isSuperAdmin } = useScopedOrgIds();
  return (
    <ReportsWorkspace
      scope={{ isSuperAdmin, scopedOrgIds }}
      eyebrow="Dept. Head · Reports"
    />
  );
}
