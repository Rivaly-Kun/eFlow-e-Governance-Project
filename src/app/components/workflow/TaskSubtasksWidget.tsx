// Compatibility bridge. New code should import from the subtasks feature's
// public API. This legacy workflow bridge points at the focused component so
// it does not pull the Subtasks workspace back through the feature index.
export { TaskSubtasksWidget } from "../../features/subtasks/components/TaskSubtasksWidget";
