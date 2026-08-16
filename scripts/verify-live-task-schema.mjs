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

  const response = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Accept: "application/openapi+json",
    },
  });

  if (!response.ok) {
    console.error(`Could not read the live PostgREST schema (${response.status}).`);
    return false;
  }

  const schema = await response.json();
  const definitions = schema.definitions || schema.components?.schemas || {};
  const paths = schema.paths || {};
  const missing = [];

  for (const table of [
    "task_submissions",
    "task_reminders",
    "task_templates",
    "task_template_runs",
    "subtask_progress_updates",
    "subtask_submissions",
    "subtask_submission_attachments",
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
  ]) {
    if (!definitions.tasks?.properties?.[column]) missing.push(`tasks.${column}`);
  }

  if (!definitions.task_attachments?.properties?.submission_id) {
    missing.push("task_attachments.submission_id");
  }
  if (!definitions.organizations?.properties?.assistant_head_user_id) {
    missing.push("organizations.assistant_head_user_id");
  }
  for (const column of ["status", "percent_complete", "reviewer_id", "latest_submission_id"]) {
    if (!definitions.subtasks?.properties?.[column]) missing.push(`subtasks.${column}`);
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
    "materialize_due_task_templates",
    "set_organization_leadership",
    "save_subtask_progress",
    "submit_subtask_for_review",
    "submit_task_for_review",
  ]) {
    if (!paths[`/rpc/${rpc}`]) missing.push(`rpc:${rpc}`);
  }

  if (missing.length > 0) {
    console.error("Live eFlow schema is missing required workflow objects:");
    for (const item of missing) console.error(`- ${item}`);
    return false;
  }

  console.log("Live task, project, and subtask workflow schema verification passed.");
  return true;
}

if (!await verifyLiveSchema()) process.exitCode = 1;
