import { supabase } from "../../../../lib/supabase";
import type { BudgetLineInput, DepartmentBudgetBundle, ReceiptDraft } from "../types";
import { mapAdjustment, mapAllocation, mapAllocationLine, mapBudgetLine, mapBudgetSummary, mapCommitment, mapLedger, mapLiquidation, mapReceipt, mapRelease, mapRequest } from "./budgetMappers";

const throwIf = (error: { message: string } | null) => { if (error) throw new Error(error.message); };

export async function fetchDepartmentFiscalYears(orgId: string) {
  const { data, error } = await supabase.from("department_fiscal_budgets")
    .select("fiscal_year,status,approved_amount")
    .eq("org_id", orgId)
    .order("fiscal_year", { ascending: false });
  throwIf(error);
  return (data || []).map((row) => ({
    year: Number(row.fiscal_year),
    status: String(row.status),
    amount: Number(row.approved_amount || 0),
  }));
}

export async function fetchDepartmentBudgetBundle(orgId: string, fiscalYear: number): Promise<DepartmentBudgetBundle> {
  const summaryResult = await supabase.rpc("department_budget_summary", { p_org_id: orgId, p_fiscal_year: fiscalYear });
  if (summaryResult.error) {
    if (/not found|schema cache/i.test(summaryResult.error.message)) throw new Error("Apply the department budget migration, then refresh this page.");
    throw new Error(summaryResult.error.message);
  }
  const summary = summaryResult.data ? mapBudgetSummary(summaryResult.data as Record<string, unknown>) : null;
  if (!summary) return { summary: null, lines: [], commitments: [], allocations: [], allocationLines: [], requests: [], releases: [], liquidations: [], ledger: [], adjustments: [] };
  const [linesResult, commitmentsResult, requestsResult, ledgerResult, adjustmentsResult] = await Promise.all([
    supabase.from("department_budget_lines").select("*").eq("fiscal_budget_id", summary.id).order("position"),
    supabase.from("budget_commitments").select("*").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }),
    supabase.from("petty_cash_requests").select("*").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }),
    supabase.from("budget_ledger_entries").select("*").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }).limit(100),
    supabase.from("department_budget_adjustments").select("*").eq("fiscal_budget_id", summary.id).order("created_at", { ascending: false }),
  ]);
  [linesResult.error, commitmentsResult.error, requestsResult.error, ledgerResult.error].forEach(throwIf);
  if (adjustmentsResult.error && !isMissingSchemaObject(adjustmentsResult.error.message)) throwIf(adjustmentsResult.error);
  const commitments = (commitmentsResult.data || []).map((row) => mapCommitment(row as Record<string, unknown>));
  const commitmentIds = commitments.map((item) => item.id);
  const requestRows = (requestsResult.data || []) as Array<Record<string, unknown>>;
  const profileIds = uniqueIds(requestRows.flatMap((row) => [row.requester_id, row.task_leader_id, row.cash_recipient_id]));
  const taskIds = uniqueIds(requestRows.map((row) => row.task_id));
  const subtaskIds = uniqueIds(requestRows.map((row) => row.subtask_id));
  const [profilesResult, tasksResult, requestSubtasksResult] = await Promise.all([
    profileIds.length ? supabase.from("profiles").select("id,full_name").in("id", profileIds) : Promise.resolve({ data: [], error: null }),
    taskIds.length ? supabase.from("tasks").select("id,title").in("id", taskIds) : Promise.resolve({ data: [], error: null }),
    subtaskIds.length ? supabase.from("subtasks").select("id,title").in("id", subtaskIds) : Promise.resolve({ data: [], error: null }),
  ]);
  throwIf(profilesResult.error); throwIf(tasksResult.error); throwIf(requestSubtasksResult.error);
  const profileById = rowMap(profilesResult.data || []);
  const taskById = rowMap(tasksResult.data || []);
  const requestSubtaskById = rowMap(requestSubtasksResult.data || []);
  const requests = requestRows.map((row) => mapRequest({
    ...row,
    requester: profileById.get(String(row.requester_id || "")),
    task_leader: profileById.get(String(row.task_leader_id || "")),
    cash_recipient: profileById.get(String(row.cash_recipient_id || "")),
    task: taskById.get(String(row.task_id || "")),
    subtask: requestSubtaskById.get(String(row.subtask_id || "")),
  }));
  const requestIds = requests.map((item) => item.id);
  const [allocationsResult, liquidationsResult, releasesResult] = await Promise.all([
    commitmentIds.length ? supabase.from("work_budget_allocations").select("*").in("commitment_id", commitmentIds).order("requested_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    requestIds.length ? supabase.from("petty_cash_liquidations").select("*").in("request_id", requestIds).order("submitted_at", { ascending: false }) : Promise.resolve({ data: [], error: null }),
    requestIds.length ? supabase.from("petty_cash_releases").select("*").in("request_id", requestIds).order("scheduled_date", { ascending: false }) : Promise.resolve({ data: [], error: null }),
  ]);
  throwIf(allocationsResult.error); throwIf(liquidationsResult.error); throwIf(releasesResult.error);
  const allocationRows = (allocationsResult.data || []) as Array<Record<string, unknown>>;
  const allocationSubtaskIds = uniqueIds(allocationRows.map((row) => row.subtask_id));
  const allocationSubtasksResult = allocationSubtaskIds.length
    ? await supabase.from("subtasks").select("id,title,assigned_to_ids").in("id", allocationSubtaskIds)
    : { data: [], error: null };
  throwIf(allocationSubtasksResult.error);
  const allocationSubtaskById = rowMap(allocationSubtasksResult.data || []);
  const allocations = allocationRows.map((row) => mapAllocation({
    ...row,
    subtask: allocationSubtaskById.get(String(row.subtask_id || "")),
  }));
  const allocationIds = allocations.map((item) => item.id);
  const allocationLinesResult = allocationIds.length
    ? await supabase.from("work_budget_allocation_lines").select("*").in("allocation_id", allocationIds).order("position")
    : { data: [], error: null };
  throwIf(allocationLinesResult.error);
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
    allocations,
    allocationLines: (allocationLinesResult.data || []).map((row) => mapAllocationLine(row as Record<string, unknown>)),
    requests,
    releases: (releasesResult.data || []).map((row) => mapRelease(row as Record<string, unknown>)),
    liquidations: liquidationRows.map((row) => mapLiquidation(row as Record<string, unknown>, receipts)),
    ledger: (ledgerResult.data || []).map((row) => mapLedger(row as Record<string, unknown>)),
    adjustments: adjustmentsResult.error ? [] : (adjustmentsResult.data || []).map((row) => mapAdjustment(row as Record<string, unknown>)),
    schemaWarnings: adjustmentsResult.error ? ["The latest fiscal controls update has not been applied to the live system."] : [],
  };
}

export async function saveDepartmentFiscalBudget(input: {
  orgId: string; fiscalYear: number; pettyCashLimit: number; requestLimit: number;
  liquidationDueDays?: number; allowReceiptLimitOverride?: boolean;
  threshold: number; notes: string; lines: BudgetLineInput[];
}) {
  const { data, error } = await supabase.rpc("save_department_fiscal_budget_v2", {
    p_org_id: input.orgId, p_fiscal_year: input.fiscalYear,
    p_daily_release_limit: input.pettyCashLimit, p_per_receipt_limit: input.requestLimit,
    p_liquidation_due_days: input.liquidationDueDays ?? 5,
    p_allow_receipt_limit_override: input.allowReceiptLimitOverride ?? false,
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

export async function createSubtaskBudgetAllocation(input: { taskId: string; subtaskId: string; parentAllocationLineId?: string; amount: number; reason: string }) {
  const { data, error } = await supabase.rpc("create_subtask_budget_allocation", {
    p_task_id: input.taskId, p_subtask_id: input.subtaskId,
    p_parent_allocation_line_id: input.parentAllocationLineId || null,
    p_amount: input.amount, p_reason: input.reason,
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

export async function resubmitPettyCashRequest(input: { requestId: string; amount: number; purpose: string; neededBy?: string }) {
  const { error } = await supabase.rpc("resubmit_petty_cash_request", {
    p_request_id: input.requestId, p_amount: input.amount,
    p_purpose: input.purpose, p_needed_by: input.neededBy || null,
  }); throwIf(error);
}

export async function decidePettyCashRequest(id: string, approve: boolean, reason: string) {
  const { error } = await supabase.rpc("decide_petty_cash_request", { p_request_id: id, p_approve: approve, p_reason: reason }); throwIf(error);
}

export async function decidePettyCashLeaderReview(id: string, approve: boolean, reason: string) {
  const { error } = await supabase.rpc("decide_petty_cash_leader_review", { p_request_id: id, p_approve: approve, p_reason: reason }); throwIf(error);
}

export async function markPettyCashReleased(releaseId: string) {
  const { error } = await supabase.rpc("mark_petty_cash_released", { p_release_id: releaseId }); throwIf(error);
}

export async function acknowledgePettyCashRelease(releaseId: string) {
  const { error } = await supabase.rpc("acknowledge_petty_cash_release", { p_release_id: releaseId }); throwIf(error);
}

export async function adjustDepartmentFiscalBudget(input: { budgetId: string; adjustedAmount: number; reason: string; supportFilePath?: string }) {
  const { data, error } = await supabase.rpc("adjust_department_fiscal_budget", {
    p_budget_id: input.budgetId, p_adjusted_amount: input.adjustedAmount,
    p_reason: input.reason, p_support_file_path: input.supportFilePath || null,
  }); throwIf(error); return String(data);
}

export async function closeDepartmentFiscalBudget(budgetId: string, reason: string) {
  const { error } = await supabase.rpc("close_department_fiscal_budget", { p_budget_id: budgetId, p_reason: reason }); throwIf(error);
}

let maintenancePromise: Promise<void> | null = null;
export function runDepartmentBudgetMaintenance() {
  if (maintenancePromise) return maintenancePromise;
  maintenancePromise = (async () => {
    const { error } = await supabase.rpc("run_department_budget_maintenance");
    if (error && !/not found|schema cache/i.test(error.message)) throw new Error(error.message);
  })();
  const current = maintenancePromise;
  void current.finally(() => { if (maintenancePromise === current) maintenancePromise = null; });
  return current;
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
      description: receipt.description, amount: receipt.amount, overrideReason: receipt.overrideReason, ...uploaded[index],
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

export async function decidePettyCashLiquidationLeaderReview(id: string, approve: boolean, reason: string) {
  const { error } = await supabase.rpc("decide_petty_cash_liquidation_leader_review", { p_liquidation_id: id, p_approve: approve, p_reason: reason }); throwIf(error);
}

export async function createReceiptSignedUrl(path: string) {
  const { data, error } = await supabase.storage.from("budget-receipts").createSignedUrl(path, 600); throwIf(error); return data!.signedUrl;
}

function uniqueIds(values: unknown[]) {
  return Array.from(new Set(values.map((value) => String(value || "")).filter(Boolean)));
}

function rowMap(rows: Array<Record<string, unknown>>) {
  return new Map(rows.map((row) => [String(row.id), row]));
}

function isMissingSchemaObject(message: string) {
  return /schema cache|could not find the table|does not exist/i.test(message);
}
