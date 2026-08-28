import * as React from "react";
import {
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  TextArea,
  TextField,
} from "@vibe/core";
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
    if (open) {
      setConfirmation("");
      setReason("");
      setError("");
    }
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
      setError(
        caught instanceof Error ? caught.message : "Project deletion failed.",
      );
    } finally {
      setDeleting(false);
    }
  };
  return (
    <Modal
      id={`delete-project-${projectId}`}
      show={open}
      size="small"
      alertModal={deleting}
      onClose={deleting ? undefined : onClose}
    >
      <ModalHeader title="Permanently delete project" />
      <ModalContent>
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          <strong>This cannot be undone.</strong>
          <p className="m-1">
            The project, milestones, and membership list will be removed.
            Existing tasks and audit history remain, but their operational
            project links are cleared.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <TextArea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-label="Reason for deletion"
            placeholder="Explain why this project must be permanently removed…"
          />
          <TextField
            value={confirmation}
            onChange={setConfirmation}
            inputAriaLabel={`Type ${projectTitle} to confirm`}
            placeholder={`Type ${projectTitle} to confirm`}
          />
          {error && (
            <div
              role="alert"
              className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {error}
            </div>
          )}
        </div>
      </ModalContent>
      <ModalFooter
        primaryButton={{
          text: deleting ? "Deleting…" : "Delete permanently",
          onClick: () => void handleDelete(),
          disabled: !canDelete || deleting,
        }}
        secondaryButton={{
          text: "Cancel",
          onClick: onClose,
          disabled: deleting,
        }}
      />
    </Modal>
  );
}
