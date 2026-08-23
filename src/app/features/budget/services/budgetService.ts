import { supabase } from "../../../../lib/supabase";
import type { BudgetLineInput, DepartmentBudgetBundle, ReceiptDraft } from "../types";
import { mapAllocation, mapBudgetLine, mapBudgetSummary, mapCommitment, mapLedger, mapLiquidation, mapReceipt, mapRequest } from "./budgetMappers";

const throwIf = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

export async function fetchDepartmentBudgetBundle(orgId: string, fiscalYear: number): Promise<DepartmentBudgetBundle> {
  const summaryResult = await supabase.rpc("department_budget_summary", { p_org_id: orgId, p_fiscal_year: fiscalYear });
  if (summaryResult.error) {
    if (/not found|schema cache/i.test(summaryResult.error.message)) throw new Error("Apply the department budget migration, then refresh this page.");
    throw new Error(summaryResult.error.message);
  }
  const summary = summaryResult.data ? mapBudgetSummary(summaryResult.data as Record<string, unknown>) : null;
  if (!summary) return { summary: null, lines: [], commitments: [], allocations: [], requests: [], liquidations: [], ledger: [] };
  const [linesResult, commitmentsResult, requestsResult, ledgerResult] = await Promise.all([
    supabase.from("department_budget_lines").select("*").eq("fiscal_budget_id", summary.id).order("position"),
    supabase.from("budget_commitments").select("*").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }),
    supabase.from("petty_cash_requests").select("*, requester:profiles!requester_id(full_name), task:tasks!task_id(title), subtask:subtasks!subtask_id(title)").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }),
    supabase.from("budget_ledger_entries").select("*").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }).limit(100),
  ]);
  [linesResult.error, commitmentsResult.error, requestsResult.error, ledgerResult.error].forEach(throwIf);
  const commitments = (commitmentsResult.data || []).map((row) => mapCommitment(row as Record<string, unknown>));
  const commitmentIds = commitments.map((item) => item.id);
  const requests = (requestsResult.data || []).map((row) => mapRequest(row as unknown as Record<string, unknown>));
  const requestIds = requests.map((item) => item.id);
  const [allocationsResult, liquidationsResult] = await Promise.all([
    commitmentIds.length ? supabase.from("work_budget_allocations").select("*").in("commitment_id", commitmentIds).order("requested_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    requestIds.length ? supabase.from("petty_cash_liquidations").select("*").in("request_id", requestIds).order("submitted_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  throwIf(allocationsResult.error); throwIf(liquidationsResult.error);
  const liquidationRows = liquidationsResult.data || [];
  const liquidationIds = liquidationRows.map((row) => String((row as Record<string, unknown>).id));
  const receiptsResult = liquidationIds.length
    ? await supabase.from("petty_cash_receipts").select("*").in("liquidation_id", liquidationIds)
    : { data: [], error: null };
  throwIf(receiptsResult.error);
  const receipts = (receiptsResult.data || []).map((row) => mapReceipt(row as Record<string, unknown>));
  return {
    summary,
    lines: (linesResult.data || []).map((row) => mapBudgetLine(row as Record<string, unknown>)),
    commitments,
    allocations: (allocationsResult.data || []).map((row) => mapAllocation(row as Record<string, unknown>)),
    requests,
    liquidations: liquidationRows.map((row) => mapLiquidation(row as Record<string, unknown>, receipts)),
    ledger: (ledgerResult.data || []).map((row) => mapLedger(row as Record<string, unknown>)),
  };
}

export async function saveDepartmentFiscalBudget(input: {
  orgId: string; fiscalYear: number; pettyCashLimit: number; requestLimit: number;
  threshold: number; notes: string; lines: BudgetLineInput[];
}) {
  const { data, error } = await supabase.rpc("save_department_fiscal_budget", {
    p_org_id: input.orgId, p_fiscal_year: input.fiscalYear,
    p_petty_cash_limit: input.pettyCashLimit, p_request_limit: input.requestLimit,
    p_underutilization_threshold: input.threshold, p_notes: input.notes,
    p_lines: input.lines.map((line, position) => ({ ...line, position })),
  });
  throwIf(error); return String(data);
}

export async function lockDepartmentFiscalBudget(budgetId: string) {
  const { error } = await supabase.rpc("lock_department_fiscal_budget", { p_budget_id: budgetId }); throwIf(error);
}

export async function createWorkBudgetAllocation(input: { taskId: string; subtaskId?: string; amount: number; reason: string }) {
  const { data, error } = await supabase.rpc("create_work_budget_allocation", {
    p_task_id: input.taskId, p_subtask_id: input.subtaskId || null, p_amount: input.amount, p_reason: input.reason,
  }); throwIf(error); return String(data);
}

export async function decideWorkBudgetAllocation(id: string, approve: boolean, reason: string) {
  const { error } = await supabase.rpc("decide_work_budget_allocation", { p_allocation_id: id, p_approve: approve, p_reason: reason }); throwIf(error);
}

export async function createPettyCashRequest(input: { allocationId: string; amount: number; purpose: string; neededBy?: string }) {
  const { data, error } = await supabase.rpc("create_petty_cash_request", {
    p_allocation_id: input.allocationId, p_amount: input.amount, p_purpose: input.purpose, p_needed_by: input.neededBy || null,
  }); throwIf(error); return String(data);
}

export async function decidePettyCashRequest(id: string, approve: boolean, reason: string) {
  const { error } = await supabase.rpc("decide_petty_cash_request", { p_request_id: id, p_approve: approve, p_reason: reason }); throwIf(error);
}

function safeFileName(name: string) { return (name.trim() || "receipt").replace(/[^a-zA-Z0-9._-]/g, "_"); }

export async function submitPettyCashLiquidation(input: { orgId: string; requestId: string; spent: number; note: string; receipts: ReceiptDraft[] }) {
  const uploaded: Array<{ fileName: string; filePath: string; mimeType: string; fileSize: number }> = [];
  try {
    for (const receipt of input.receipts) {
      if (!receipt.file) throw new Error("Attach a file for every receipt row.");
      const filePath = `${input.orgId}/${input.requestId}/${crypto.randomUUID()}-${safeFileName(receipt.file.name)}`;
      const { error } = await supabase.storage.from("budget-receipts").upload(filePath, receipt.file, { upsert: false });
      throwIf(error);
      uploaded.push({ fileName: receipt.file.name, filePath, mimeType: receipt.file.type || "application/octet-stream", fileSize: receipt.file.size });
    }
    const payload = input.receipts.map((receipt, index) => ({
      vendor: receipt.vendor, receiptNumber: receipt.receiptNumber, receiptDate: receipt.receiptDate,
      description: receipt.description, amount: receipt.amount, ...uploaded[index],
    }));
    const { data, error } = await supabase.rpc("submit_petty_cash_liquidation", {
      p_request_id: input.requestId, p_declared_spent: input.spent, p_note: input.note, p_receipts: payload,
    });
    if (error) throw error;
    return String(data);
  } catch (error) {
    if (uploaded.length) await supabase.storage.from("budget-receipts").remove(uploaded.map((item) => item.filePath));
    throw new Error(error instanceof Error ? error.message : "Could not submit the liquidation.");
  }
}

export async function decidePettyCashLiquidation(id: string, approve: boolean, reason: string) {
  const { error } = await supabase.rpc("decide_petty_cash_liquidation", { p_liquidation_id: id, p_approve: approve, p_reason: reason }); throwIf(error);
}

export async function createReceiptSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("budget-receipts").createSignedUrl(path, 600); throwIf(error); return data!.signedUrl;
}

