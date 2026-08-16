import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { getSubtaskEvidenceUrl } from "../services/subtaskWorkflowService";

export function SubtaskEvidenceLink({ fileName, filePath }: { fileName: string; filePath: string }) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSubtaskEvidenceUrl(filePath).then((next) => { if (active) setUrl(next); });
    return () => { active = false; };
  }, [filePath]);

  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noreferrer"
      aria-disabled={!url}
      className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-[11.5px] ${
        url ? "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400" : "pointer-events-none border-neutral-100 text-neutral-400"
      }`}
    >
      <FileText size={14} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{fileName}</span>
      <Download size={13} className="shrink-0" />
    </a>
  );
}
