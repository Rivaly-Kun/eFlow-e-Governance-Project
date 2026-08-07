import { useState } from "react";
import type { TaskCard } from "./councilorData";
import { mockTasks } from "./councilorData";
import { InboxView } from "./InboxView";
import { FocusReader } from "./FocusReader";
import { ConfirmationPad } from "./ConfirmationPad";

export function CouncilorPanel() {
  const [tasks, setTasks] = useState<TaskCard[]>(mockTasks);
  const [activeTask, setActiveTask] = useState<TaskCard | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [view, setView] = useState<"inbox" | "reader">("inbox");

  const handleTaskTap = (task: TaskCard) => {
    setActiveTask(task);
    setView("reader");
  };

  const handleBack = () => {
    setView("inbox");
    setActiveTask(null);
  };

  const handleAction = (action: string) => {
    setPendingAction(action);
  };

  const handleConfirm = () => {
    if (activeTask) {
      setTasks((prev) => prev.filter((t) => t.id !== activeTask.id));
    }
    setPendingAction(null);
    setView("inbox");
    setActiveTask(null);
  };

  return (
    <div className="h-full flex flex-col bg-neutral-50">
      {view === "inbox" ? (
        <InboxView tasks={tasks} onTaskTap={handleTaskTap} />
      ) : activeTask ? (
        <FocusReader task={activeTask} onBack={handleBack} onAction={handleAction} />
      ) : null}

      {/* Confirmation Modal */}
      {pendingAction && activeTask && (
        <ConfirmationPad
          task={activeTask}
          action={pendingAction}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </div>
  );
}
