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

  for (const rpc of [
    "assign_task_with_details",
    "cancel_task",
    "dispatch_task_reminders",
    "materialize_due_task_templates",
  ]) {
    if (!paths[`/rpc/${rpc}`]) missing.push(`rpc:${rpc}`);
  }

  if (missing.length > 0) {
    console.error("Live task schema is missing required Phase 0 objects:");
    for (const item of missing) console.error(`- ${item}`);
    return false;
  }

  console.log("Live task schema verification passed.");
  return true;
}

if (!await verifyLiveSchema()) process.exitCode = 1;
