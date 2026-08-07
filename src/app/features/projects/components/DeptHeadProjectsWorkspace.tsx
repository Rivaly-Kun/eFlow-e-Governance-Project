import { useScopedOrgIds } from "../../../hooks/useSupabaseData";
import { ProjectsWorkspace } from "./ProjectsWorkspace";

/** Preserves Department Head subtree scoping for the shared projects workspace. */
export function DeptHeadProjectsWorkspace() {
  const { scopedOrgIds, isSuperAdmin } = useScopedOrgIds();
  return (
    <ProjectsWorkspace
      scope={{ isSuperAdmin, scopedOrgIds }}
      eyebrow="Dept. Head · Projects"
    />
  );
}
