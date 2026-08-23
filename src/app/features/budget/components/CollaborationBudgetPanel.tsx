import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { createEmptyProposalBudget } from "../constants";
import type { ProposalBudgetDraft } from "../types";
import type { CollaborationDraftSnapshot } from "../../interdepartment-collaboration";
import { ProposalBudgetEditor } from "./ProposalBudgetEditor";

export function CollaborationBudgetPanel({ snapshot, editable, onSave }: { snapshot: CollaborationDraftSnapshot; editable: boolean; onSave: (snapshot: CollaborationDraftSnapshot, summary: string) => Promise<void> }) {
  const [value, setValue] = useState<ProposalBudgetDraft>(snapshot.budget || createEmptyProposalBudget());
  const [saving, setSaving] = useState(false);
  useEffect(() => setValue(snapshot.budget || createEmptyProposalBudget()), [snapshot]);
  const dirty = JSON.stringify(value) !== JSON.stringify(snapshot.budget || createEmptyProposalBudget());
  return <div className="space-y-3"><ProposalBudgetEditor value={value} onChange={setValue} readOnly={!editable} /><div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-[10.5px] leading-relaxed text-blue-800"><strong>Funding gate:</strong> this proposal can remain saved as a draft at any amount. Publishing requires a locked annual budget with enough available balance.</div>{editable && <div className="flex justify-end"><button type="button" disabled={!dirty || saving} onClick={async () => { setSaving(true); try { await onSave({ ...snapshot, budget: value }, "Proposal budget updated"); } finally { setSaving(false); } }} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-neutral-900 px-4 text-[10.5px] font-['Lexend:Medium',_sans-serif] text-white disabled:opacity-40"><Save size={12} />{saving ? "Publishing…" : "Publish budget revision"}</button></div>}</div>;
}
