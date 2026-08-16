import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { Modal, ModalButton } from "../../../components/ui/Modal";
import { deleteProject } from "../services/projectService";

export function ProjectDeleteDialog({
  projectId,
  projectTitle,
  open,
  onClose,
  onDeleted,
}: {
  projectId: string;
  projectTitle: string;
  open: boolean;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmation, setConfirmation] = React.useState("");
  const [reason, setReason] = React.useState("");
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setConfirmation("");
    setReason("");
    setError("");
  }, [open, projectId]);

  const canDelete = confirmation === projectTitle && reason.trim().length >= 5;
  const handleDelete = async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await deleteProject(projectId, confirmation, reason);
      onDeleted();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Project deletion failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={deleting ? () => undefined : onClose}
      title="Permanently delete project"
      footer={
        <>
          <ModalButton onClick={onClose} disabled={deleting}>Cancel</ModalButton>
          <ModalButton variant="danger" onClick={handleDelete} disabled={!canDelete || deleting}>
            {deleting ? "Deleting…" : "Delete permanently"}
          </ModalButton>
        </>
      }
    >
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-[12px] text-red-900">
        <div className="flex items-center gap-2 font-['Lexend:Medium',_sans-serif]">
          <AlertTriangle size={15} /> This cannot be undone
        </div>
        <p className="mt-1 text-red-800">
          The project, milestones, and membership list will be removed. Existing tasks and their audit history remain, but their operational project links will be cleared.
        </p>
      </div>

      <label className="mt-4 block text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600">
        Reason for deletion
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Explain why this project must be permanently removed…"
          className="mt-1 min-h-20 w-full rounded-lg border border-neutral-200 px-3 py-2 text-[12px] outline-none focus:border-neutral-500"
        />
      </label>

      <label className="mt-3 block text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-600">
        Type <span className="font-['Lexend:SemiBold',_sans-serif] text-neutral-900">{projectTitle}</span> to confirm
        <input
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          className="mt-1 h-9 w-full rounded-lg border border-neutral-200 px-3 text-[12px] outline-none focus:border-red-400"
        />
      </label>

      {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11.5px] text-red-700">{error}</div>}
    </Modal>
  );
}
