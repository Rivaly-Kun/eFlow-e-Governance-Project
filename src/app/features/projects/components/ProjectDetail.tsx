// Compatibility export for existing callers. The implementation is now the
// shared, role-aware Project Command Workspace.
export {
  ProjectCommandWorkspace as ProjectDetail,
  type ProjectCommandWorkspaceProps as ProjectDetailProps,
} from "./project-command/ProjectCommandWorkspace";
