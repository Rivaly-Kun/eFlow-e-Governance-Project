import { AlertCircle, Loader2, Upload } from "lucide-react";
import { AssignmentModal } from "./AssignmentModal";
import { DraftCockpit } from "./DraftCockpit";
import { useProposalImportController } from "../hooks/useProposalImportController";

export default function ProposalImport({ onClose }: { onClose?: () => void }) {
  const {
    allEmployees, employeeNotes, deptEmployees, pdfFileRef, pdfPhase,
    setPdfPhase, pdfFileName, setPdfFileName, pdfError, setPdfError,
    draftTasks, setDraftTasks, committing, commitMessage, setCommitMessage,
    assignModalOpen, setAssignModalOpen, assignModalTaskKey,
    setAssignModalTaskKey, currentDraftTask, handlePdfFile,
    handleDraftUpdate, handleDraftDelete, handleDraftAdd, handleCommit,
  } = useProposalImportController(onClose);

  return (
    <div className="p-6 font-['Lexend:Regular',_sans-serif]">
      {/* Importer container */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-neutral-100">
          <div>
            <h1 className="text-[20px] font-['Lexend:SemiBold',_sans-serif] text-neutral-900">
              PDF Proposal Importer
            </h1>
            <p className="text-[12px] text-neutral-500 mt-1">
              Decompose a government proposal PDF into Programs, Projects, and Tasks with AI recommendation.
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-[12px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-900"
            >
              Cancel
            </button>
          )}
        </div>

        {/* PDF Import Tab content */}
        <div>
          {/* Idle — drop zone */}
          {pdfPhase === "idle" && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) handlePdfFile(f);
              }}
              onClick={() => pdfFileRef.current?.click()}
              className="cursor-pointer rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-14 text-center hover:border-violet-400 hover:bg-violet-50/30 transition group"
            >
              <Upload
                size={40}
                className="mx-auto mb-3 text-neutral-300 group-hover:text-violet-400 transition"
              />
              <div className="text-[15px] font-['Lexend:SemiBold',_sans-serif] text-neutral-700">
                Drop a government proposal PDF here
              </div>
              <div className="text-[12px] text-neutral-400 mt-1">
                or click to browse · AI decomposes it into Programs → Projects → Activities → Tasks
              </div>
              <div className="mt-4 text-[11px] text-neutral-400 bg-white border border-neutral-200 rounded-full px-4 py-1.5 inline-block">
                Results appear here as an editable draft · nothing is saved until you commit
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

          {/* Extracting / Decomposing */}
          {(pdfPhase === "extracting" ||
            pdfPhase === "decomposing") && (
            <div className="rounded-2xl border border-neutral-200 bg-white p-14 text-center">
              <Loader2
                size={36}
                className="mx-auto mb-4 text-violet-600 animate-spin"
              />
              <div className="text-[16px] font-['Lexend:SemiBold',_sans-serif] text-neutral-800">
                {pdfPhase === "extracting"
                  ? "Extracting text from PDF…"
                  : "AI is decomposing the proposal…"}
              </div>
              <div className="text-[12px] text-neutral-400 mt-1">
                {pdfFileName} ·{" "}
                {pdfPhase === "extracting"
                  ? "Reading pages"
                  : "This may take up to 2 minutes for large proposals"}
              </div>
              <div className="flex justify-center gap-3 mt-6">
                <div
                  className={`w-2 h-2 rounded-full ${pdfPhase === "extracting" ? "bg-violet-600 animate-pulse" : "bg-emerald-500"}`}
                />
                <div
                  className={`w-2 h-2 rounded-full ${pdfPhase === "decomposing" ? "bg-violet-600 animate-pulse" : "bg-neutral-200"}`}
                />
              </div>
            </div>
          )}

          {/* Error */}
          {pdfPhase === "error" && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-10 text-center">
              <AlertCircle
                size={32}
                className="mx-auto mb-3 text-red-500"
              />
              <div className="text-[14px] font-['Lexend:SemiBold',_sans-serif] text-red-800">
                Import Failed
              </div>
              <div className="text-[12px] text-red-600 mt-1">
                {pdfError}
              </div>
              <button
                onClick={() => {
                  setPdfPhase("idle");
                  setPdfError("");
                }}
                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white text-[12px] font-['Lexend:Medium',_sans-serif] rounded-xl hover:bg-red-700 transition"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Review Draft */}
          {pdfPhase === "review" && draftTasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[12px] text-neutral-500 font-['Lexend:Regular',_sans-serif]">
                  AI draft loaded from{" "}
                  <span className="text-neutral-800 font-['Lexend:Medium',_sans-serif]">
                    {pdfFileName}
                  </span>{" "}
                  · Review and edit each task before committing.
                </div>
                <button
                  onClick={() => {
                    setPdfPhase("idle");
                    setPdfFileName("");
                    setCommitMessage("");
                    setDraftTasks([]);
                  }}
                  className="text-[11px] font-['Lexend:Medium',_sans-serif] text-neutral-500 hover:text-neutral-800"
                >
                  Import Another
                </button>
              </div>

              <DraftCockpit
                draftTasks={draftTasks}
                employees={deptEmployees}
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
            });
          }
        }}
      />
    </div>
  );
}
