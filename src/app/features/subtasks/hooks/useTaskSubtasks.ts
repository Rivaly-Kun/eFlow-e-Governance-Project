import { useEffect, useState } from "react";
import { subscribeToSubtasks, type Subtask } from "../../../services/subtaskService";

export function useTaskSubtasks(taskId?: string | null) {
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  useEffect(() => {
    if (!taskId) {
      setSubtasks([]);
      return;
    }
    return subscribeToSubtasks(taskId, setSubtasks);
  }, [taskId]);
  return { subtasks, setSubtasks };
}
