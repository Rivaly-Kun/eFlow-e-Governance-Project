import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

async function verifyLiveSchema() {
  const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const env = loadEnv("production", projectRoot, "");
  const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || "").replace(/\/+$/, "");
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!supabaseUrl || !serviceKey) {
    console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
    return false;
  }

  let response;
  try {
    response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Accept: "application/openapi+json",
      },
    });
  } catch (error) {
    console.error(`Could not reach the live Supabase schema: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }

  if (!response.ok) {
    console.error(`Could not read the live PostgREST schema (${response.status}).`);
    return false;
  }

  const schema = await response.json();
  const definitions = schema.definitions || schema.components?.schemas || {};
  const paths = schema.paths || {};
  const missing = [];

  for (const table of [
    "audit_events",
    "budget_commitments",
    "budget_ledger_entries",
    "department_budget_lines",
    "department_fiscal_budgets",
    "milestones",
    "hierarchy_deadline_reminders",
    "monthly_productivity_snapshots",
    "project_members",
    "project_organizations",
    "projects",
    "organization_memberships",
    "proposal_collaboration_approvals",
    "proposal_collaboration_change_requests",
    "proposal_collaboration_drafts",
    "proposal_collaboration_messages",
    "proposal_collaboration_orgs",
    "proposal_collaboration_revisions",
    "proposal_governance_assignments",
    "proposal_governance_signoffs",
    "proposal_governance_records",
    "petty_cash_liquidations",
    "petty_cash_receipts",
    "petty_cash_requests",
    "proposal_delivery_closeouts",
    "proposal_delivery_closeout_decisions",
    "role_permissions",
    "subtasks",
    "task_submissions",
    "task_reminders",
    "task_templates",
    "task_template_runs",
    "subtask_progress_updates",
    "subtask_submissions",
    "subtask_submission_attachments",
    "subtask_templates",
    "subtask_template_items",
    "tasks",
    "task_organizations",
    "milestone_organizations",
    "user_permission_overrides",
    "user_org_scope_grants",
    "work_budget_allocations",
  ]) {
    if (!definitions[table]) missing.push(`table:${table}`);
  }

  for (const column of [
    "reviewer_id",
    "backup_reviewer_id",
    "acceptance_criteria",
    "definition_of_done",
    "dependency_ids",
    "cancellation_reason",
    "cancelled_at",
    "cancelled_by",
    "review_route_mode",
    "source_collaboration_draft_id",
    "source_collaboration_revision_id",
    "governance_approval_mode",
    "governance_organization_id",
  ]) {
    if (!definitions.tasks?.properties?.[column]) missing.push(`tasks.${column}`);
  }

  if (!definitions.task_attachments?.properties?.submission_id) {
    missing.push("task_attachments.submission_id");
  }
  if (!definitions.organizations?.properties?.assistant_head_user_id) {
    missing.push("organizations.assistant_head_user_id");
  }
  for (const column of ["source_collaboration_draft_id", "source_collaboration_revision_id"]) {
    if (!definitions.projects?.properties?.[column]) missing.push(`projects.${column}`);
  }
  for (const column of ["status", "percent_complete", "reviewer_id", "latest_submission_id", "is_standalone", "due_date", "due_date_change_reason", "due_date_changed_at", "due_date_changed_by"]) {
    if (!definitions.subtasks?.properties?.[column]) missing.push(`subtasks.${column}`);
  }
  for (const column of ["project_id", "proposal_id", "org_id", "entity_type"]) {
    if (!definitions.notifications?.properties?.[column]) missing.push(`notifications.${column}`);
  }
  if (definitions.subtasks?.properties?.assigned_to_ids?.format !== "uuid[]") {
    missing.push(
      `subtasks.assigned_to_ids:expected-uuid[]:actual-${definitions.subtasks?.properties?.assigned_to_ids?.format || "missing"}`,
    );
  }

  for (const [column, format] of Object.entries({
    team_member_ids: "uuid[]",
    team_member_names: "text[]",
    tags: "text[]",
    recommended_employee_ids: "uuid[]",
    dependency_ids: "uuid[]",
  })) {
    const actual = definitions.tasks?.properties?.[column]?.format;
    if (actual !== format) missing.push(`tasks.${column}:expected-${format}:actual-${actual || "missing"}`);
  }

  for (const rpc of [
    "assign_task_with_details",
    "cancel_task",
    "create_project_with_details",
    "create_task_with_details",
    "delete_project_permanently",
    "decide_task_review",
    "decide_subtask_review",
    "dispatch_task_reminders",
    "dispatch_hierarchy_deadline_reminders",
    "materialize_due_task_templates",
    "recalculate_monthly_productivity",
    "set_organization_leadership",
    "set_subtask_due_date",
    "save_subtask_progress",
    "save_subtask_template",
    "review_subtask_template",
    "reorder_task_subtasks",
    "apply_subtask_template",
    "submit_subtask_for_review",
    "submit_task_for_review",
    "has_permission",
    "can_access_org",
    "can_manage_collaboration_draft",
    "autosave_collaboration_draft",
    "can_manage_collaboration_project",
    "can_see_collaboration_project",
    "collaboration_readiness",
    "commit_collaboration_draft",
    "create_collaboration_change_request",
    "create_collaboration_draft",
    "decide_collaboration_review",
    "is_collaboration_participant",
    "is_organization_approver",
    "request_collaboration_review",
    "save_collaboration_revision",
    "save_collaboration_staffing_revision",
    "send_collaboration_message",
    "set_collaboration_organizations",
    "set_proposal_governance_configuration",
    "recuse_and_delegate_collaboration_review",
    "save_proposal_governance_record",
    "request_proposal_closeout",
    "decide_proposal_closeout",
    "complete_proposal_delivery",
    "archive_proposal_delivery",
    "set_task_governance_route",
    "run_governance_review_escalations",
    "set_organization_approvers",
    "save_department_fiscal_budget",
    "lock_department_fiscal_budget",
    "create_work_budget_allocation",
    "decide_work_budget_allocation",
    "create_petty_cash_request",
    "decide_petty_cash_request",
    "submit_petty_cash_liquidation",
    "decide_petty_cash_liquidation",
    "department_budget_summary",
  ]) {
    if (!paths[`/rpc/${rpc}`]) missing.push(`rpc:${rpc}`);
  }

  if (missing.length > 0) {
    console.error("Live eFlow schema is missing required workflow objects:");
    for (const item of missing) console.error(`- ${item}`);
    return false;
  }

  console.log("Live task, project, subtask, collaboration, and budget workflow schema verification passed.");
  return true;
}

if (!await verifyLiveSchema()) process.exitCode = 1;
