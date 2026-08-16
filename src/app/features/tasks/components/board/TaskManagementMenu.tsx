import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  UserRoundCog,
  XCircle,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import type { Task } from "../../../../services/taskService";

export function TaskManagementMenu({
  task,
  onEdit,
  onEditTeam,
  onArchive,
  onCancel,
  onDelete,
  onReopen,
}: {
  task: Task;
  onEdit?: (task: Task) => void;
  onEditTeam?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  onCancel?: (task: Task) => void;
  onDelete?: (task: Task) => void;
  onReopen?: (task: Task) => void;
}) {
  const [open, setOpen] = useState(false);
  const invoke = (action: ((task: Task) => void) | undefined) => {
    setOpen(false);
    action?.(task);
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={`Manage ${task.title}`}
        onClick={(event) => { event.stopPropagation(); setOpen((value) => !value); }}
        className="rounded-lg border border-transparent p-1.5 text-neutral-400 transition hover:border-neutral-200 hover:bg-white hover:text-neutral-700"
      >
        <MoreHorizontal size={15} />
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-30 cursor-default" aria-label="Close task actions" onClick={(event) => { event.stopPropagation(); setOpen(false); }} />
          <div className="absolute right-0 top-8 z-40 w-48 overflow-hidden rounded-xl border border-neutral-200 bg-white py-1 shadow-xl">
            {onEdit && <MenuItem icon={<Pencil size={13} />} label="Edit task details" onClick={() => invoke(onEdit)} />}
            {onEditTeam && <MenuItem icon={<UserRoundCog size={13} />} label="Edit team and lead" onClick={() => invoke(onEditTeam)} />}
            {task.status === "completed" && onReopen && <MenuItem icon={<RotateCcw size={13} />} label="Reopen task" tone="warn" onClick={() => invoke(onReopen)} />}
            {!task.archivedAt && !["completed", "cancelled", "for_review"].includes(task.status) && onCancel && (
              <MenuItem icon={<XCircle size={13} />} label="Cancel task" tone="warn" onClick={() => invoke(onCancel)} />
            )}
            {onArchive && (
              <MenuItem
                icon={task.archivedAt ? <ArchiveRestore size={13} /> : <Archive size={13} />}
                label={task.archivedAt ? "Restore from archive" : "Archive task"}
                onClick={() => invoke(onArchive)}
              />
            )}
            {onDelete && (
              <>
                <div className="my-1 border-t border-neutral-100" />
                <MenuItem icon={<Trash2 size={13} />} label="Delete task" tone="danger" onClick={() => invoke(onDelete)} />
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ icon, label, tone = "default", onClick }: { icon: ReactNode; label: string; tone?: "default" | "warn" | "danger"; onClick: () => void }) {
  const toneClass = tone === "danger"
    ? "text-rose-600 hover:bg-rose-50"
    : tone === "warn"
      ? "text-amber-700 hover:bg-amber-50"
      : "text-neutral-700 hover:bg-neutral-50";
  return <button type="button" onClick={onClick} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[11px] ${toneClass}`}>{icon}<span>{label}</span></button>;
}
