// Compatibility bridge: new consumers import task behavior from this feature.
export * from "./services/taskService";
export * from "./selectors";
export { DeptHeadTaskBoardView } from "./components/DeptHeadTaskBoardView";
export { useDeptHeadTaskBoard } from "./hooks/useDeptHeadTaskBoard";
export { RecurringTaskTemplatesPanel } from "./components/RecurringTaskTemplatesPanel";
export { MondayBoard } from "./components/board/MondayBoard";
export { ScopedTaskKanban } from "./components/board/ScopedTaskKanban";
export type { MondayBoardProps } from "./components/board/model";
export { EmployeeTaskWorkspace } from "../../components/Employee/EmployeeTaskWorkspace";
export { YouAreLeadingView } from "../../components/workflow/YouAreLeadingView";
export { TaskDetailDrawer } from "../../components/workflow/TaskDetailDrawer";
export { TaskTeamEditorDialog } from "./components/team/TaskTeamEditorDialog";
export { TaskTeamMemberList } from "./components/team/TaskTeamMemberList";
export { AdminTaskOversight } from "./components/AdminTaskOversight";
export { resolveTaskDetailCapabilities } from "./components/taskDetailAccess";
export { cancelTask } from "./services/taskLifecycleService";
export { runTaskMaintenance } from "./services/taskMaintenanceService";
export {
  createTaskTemplate,
  deleteTaskTemplate,
  fetchTaskTemplates,
  setTaskTemplateActive,
} from "./services/taskTemplateService";
export type {
  RecurrenceFrequency,
  RecurrenceRule,
  TaskTemplate,
  TaskTemplateInput,
} from "./types";
