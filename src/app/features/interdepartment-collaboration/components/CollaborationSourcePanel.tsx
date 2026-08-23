import * as React from "react";
import { Eye, FileText, Loader2, Upload } from "lucide-react";
import { useToast } from "../../../components/ui/Toast";
import { getCollaborationSourceUrl, uploadCollaborationSource } from "../services/collaborationDraftService";
import type { CollaborationDraft } from "../types";
import { SourcePdfPreviewDialog } from "./SourcePdfPreviewDialog";

const MAX_SOURCE_PDF_BYTES = 25 * 1024 * 1024;

export function CollaborationSourcePanel({ draft, canUpload, onUploaded }: {
  draft: CollaborationDraft;
  canUpload: boolean;
  onUploaded: () => Promise<void>;
}) {
  const [loading, setLoading] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const preview = async () => {
    if (!draft.sourceFilePath) return;
    setLoading(true);
    try { setPreviewUrl(await getCollaborationSourceUrl(draft.sourceFilePath)); }
    catch (error) { toast(error instanceof Error ? error.message : "Could not open source PDF.", "error"); }
    finally { setLoading(false); }
  };

  const upload = async (file?: File) => {
    if (!file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      toast("Select a PDF document.", "error");
      return;
    }
    if (file.size > MAX_SOURCE_PDF_BYTES) {
      toast("The source PDF must be 25 MB or smaller.", "error");
      return;
    }
    setUploading(true);
    try {
      await uploadCollaborationSource(draft.id, file, { cleanupOnMetadataFailure: false });
      await onUploaded();
      toast(draft.sourceFilePath ? "Source PDF replaced." : "Source PDF attached.", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Could not attach the source PDF.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const uploadControl = canUpload ? <>
    <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(event) => void upload(event.target.files?.[0])} />
    <button type="button" disabled={uploading} onClick={() => inputRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-[10px] text-neutral-700 hover:bg-neutral-50 disabled:opacity-50">{uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />} {draft.sourceFilePath ? "Replace PDF" : "Attach PDF"}</button>
  </> : null;

  if (!draft.sourceFilePath) {
    return <div className="rounded-2xl border border-dashed border-neutral-200 bg-white px-6 py-14 text-center"><FileText size={28} className="mx-auto text-neutral-300" /><div className="mt-3 text-[12px] text-neutral-700">No source PDF attached</div><div className="mx-auto mt-1 max-w-md text-[10px] leading-relaxed text-neutral-400">The owning office may attach the signed proposal, supporting plan, or reference document for all participating reviewers.</div>{canUpload && <div className="mt-4 flex justify-center">{uploadControl}</div>}</div>;
  }
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6">
      <div className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600"><FileText size={22} /></div>
        <div className="min-w-0 flex-1"><div className="truncate text-[13px] font-['Lexend:Medium',_sans-serif] text-neutral-900">{draft.sourceFileName}</div><div className="mt-1 text-[10px] text-neutral-400">Private source document · signed access expires after 10 minutes</div></div>
        <div className="flex flex-wrap gap-2">{uploadControl}<button type="button" onClick={preview} disabled={loading} className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-[10px] text-white disabled:opacity-50">{loading ? <Loader2 size={12} className="animate-spin" /> : <Eye size={12} />} {loading ? "Loading…" : "View PDF"}</button></div>
      </div>
      {previewUrl && <SourcePdfPreviewDialog title={draft.sourceFileName || "Proposal source PDF"} url={previewUrl} onClose={() => setPreviewUrl(null)} />}
    </div>
  );
}
