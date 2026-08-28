import { AlertCircle, Clock3, Loader2, Upload } from "lucide-react";
import { AssignmentModal } from "./AssignmentModal";
import { DraftCockpit } from "./DraftCockpit";
import { useProposalImportController } from "../hooks/useProposalImportController";
import { OrganizationScopePicker } from "../../interdepartment-collaboration";

export default function ProposalImport({ onClose, inDialog = false, embedded = false }: { onClose?: () => void; inDialog?: boolean; embedded?: boolean }) {
  const {
    allEmployees, employeeNotes, deptEmployees, orgs, collaborationOrganizations,
    setCollaborationOrganizations, pdfFileRef, pdfPhase,
    setPdfPhase, pdfFileName, setPdfFileName, pdfError, setPdfError,
    aiQueueStatus, decompositionProgress,
    draftTasks, setDraftTasks, committing, autoSaveState, commitMessage, setCommitMessage,
    assignModalOpen, setAssignModalOpen, assignModalTaskKey,
    setAssignModalTaskKey, currentDraftTask, handlePdfFile,
    handleDraftUpdate, handleDraftDelete, handleDraftAdd, handleCommit,
  } = useProposalImportController(onClose);

  return (
    <div className={`${embedded ? "p-0" : "p-6"} font-['Montserrat',sans-serif] ${inDialog ? "eflow-creation-builder" : ""}`}>
      <div className="max-w-4xl mx-auto space-y-6">
        {!embedded && (
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
            <div>
              <h1 className="text-[18px] font-bold text-neutral-900">
                PDF Proposal Importer
              </h1>
              <p className="text-xs text-neutral-500 mt-1">
                Decompose a government proposal PDF into Programs, Projects, and Tasks with AI recommendation.
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs font-semibold text-neutral-500 hover:text-neutral-900"
              >
                Cancel
              </button>
            )}
          </div>
        )}

        <div>
          {pdfPhase === "idle" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handlePdfFile(f);
              }}
              onClick={() => pdfFileRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/20 p-14 text-center hover:border-indigo-400 hover:bg-indigo-50/40 transition group"
            >
              <Upload
                size={40}
                className="mx-auto mb-3 text-indigo-300 group-hover:text-indigo-500 transition"
              />
              <div className="text-sm font-bold text-neutral-800">
                Drop a government proposal PDF here
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                or click to browse · AI decomposes it into Programs → Projects → Activities → Tasks
              </div>
              <div className="mt-4 text-[11px] text-neutral-500 bg-white border border-indigo-100 rounded-full px-4 py-1.5 inline-block shadow-xs">
                The editable result is saved as a persistent draft before approval · no operational work is created yet
              </div>
              <input
                ref={pdfFileRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePdfFile(f);
                }}
              />
            </div>
          )}

          {(pdfPhase === "extracting" || pdfPhase === "decomposing") && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-14 text-center">
              <Loader2
                size={36}
                className="mx-auto mb-4 text-indigo-600 animate-spin"
              />
              <div className="text-base font-bold text-neutral-800">
                {pdfPhase === "extracting"
                  ? "Extracting text from PDF…"
                  : aiQueueStatus?.status === "queued"
                    ? "Your AI request is queued"
                    : "AI is decomposing the proposal…"}
              </div>
              <div className="text-xs text-neutral-500 mt-1">
                {pdfFileName} ·{" "}
                {pdfPhase === "extracting"
                  ? "Reading pages"
                  : aiQueueStatus?.status === "queued"
                    ? `${aiQueueStatus.jobsAhead} request${aiQueueStatus.jobsAhead === 1 ? "" : "s"} ahead of you`
                    : decompositionProgress
                      ? `Part ${decompositionProgress.current} of ${decompositionProgress.total}: ${decompositionProgress.partTitle}`
                      : "Processing with DeepSeek R1 8B"}
              </div>
              {pdfPhase === "decomposing" && aiQueueStatus?.status === "queued" && (
                <div className="mx-auto mt-5 flex max-w-md items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left">
                  <Clock3 size={18} className="mt-0.5 shrink-0 text-amber-600" />
                  <div>
                    <div className="text-xs font-bold text-amber-900">
                      Queue position {aiQueueStatus.position ?? "—"}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-relaxed text-amber-700">
                      {aiQueueStatus.jobsAhead > 0
                        ? "Another user is currently using the AI. Your proposal will start automatically when the requests ahead of it finish—please keep this page open."
                        : "The AI worker is preparing your request. Processing will start automatically—please keep this page open."}
                    </div>
                  </div>
                </div>
              )}
              <div className="flex justify-center gap-3 mt-6">
                <div
                  className={`w-2 h-2 rounded-full ${pdfPhase === "extracting" ? "bg-indigo-600 animate-pulse" : "bg-emerald-500"}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${pdfPhase === "decomposing" ? "bg-indigo-600 animate-pulse" : "bg-neutral-200"}`}
                />
              </div>
            </div>
          )}

          {pdfPhase === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <AlertCircle
                size={32}
                className="mx-auto mb-3 text-red-500"
              />
              <div className="text-sm font-bold text-red-800">
                Import Failed
              </div>
              <div className="text-xs text-red-600 mt-1">
                {pdfError}
              </div>
              <button
                onClick={() => {
                  setPdfPhase("idle");
                  setPdfError("");
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {pdfPhase === "review" && draftTasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-xs text-neutral-500">
                  AI draft loaded from{" "}
                  <span className="text-neutral-800 font-semibold">
                    {pdfFileName}
                  </span>{" "}
                  · Review the scope, responsibilities, and staffing while eFlow autosaves the draft.
                </div>
                <button
                  onClick={() => {
                    setPdfPhase("idle");
                    setPdfFileName("");
                    setCommitMessage("");
                    setDraftTasks([]);
                  }}
                  className="text-xs font-semibold text-neutral-500 hover:text-neutral-800"
                >
                  Import Another
                </button>
              </div>

              <div className="mb-4">
                <OrganizationScopePicker
                  organizations={orgs}
                  value={collaborationOrganizations}
                  ownerOrgId={collaborationOrganizations.find((item) => item.participationRole === "owner")?.orgId || ""}
                  onChange={setCollaborationOrganizations}
                />
              </div>

              <DraftCockpit
                draftTasks={draftTasks}
                employees={allEmployees.length > 0 ? allEmployees : deptEmployees}
                allEmployees={allEmployees}
                employeeNotes={employeeNotes}
                onUpdate={handleDraftUpdate}
                onDelete={handleDraftDelete}
                onAdd={handleDraftAdd}
                onOpenModal={(key) => {
                  setAssignModalTaskKey(key);
                  setAssignModalOpen(true);
                }}
                onCommit={handleCommit}
                committing={committing}
                autoSaveState={autoSaveState}
                commitMessage={commitMessage}
              />
            </div>
          )}
        </div>
      </div>

      <AssignmentModal
        open={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setAssignModalTaskKey(null);
        }}
        employees={allEmployees && allEmployees.length > 0 ? allEmployees : deptEmployees}
        employeeNotes={employeeNotes}
        selectedIds={currentDraftTask?.assignedMemberIds || []}
        leadId={currentDraftTask?.leadMemberId || null}
        onConfirm={(memberIds, leadId) => {
          if (assignModalTaskKey) {
            handleDraftUpdate(assignModalTaskKey, {
              assignedMemberIds: memberIds,
              leadMemberId: leadId,
              assignmentException: undefined,
              teamComposition: undefined,
              reasoning: "Team assignment manually adjusted by the reviewing manager.",
            });
          }
        }}
      />
    </div>
  );
}
