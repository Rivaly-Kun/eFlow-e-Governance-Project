import { supabase } from "../../../../lib/supabase";
import type { ProjectActivityItem } from "../components/project-command/types";

function presentAuditAction(action: string, entityType: string): string {
  const known: Record<string, string> = {
    "project.milestones_reordered": "reordered project milestones",
    "project.updated": "updated the project",
    "milestone.status_override": "updated an activity status",
    "milestone.created": "added a delivery activity",
    "milestone.updated": "updated a delivery activity",
    "milestone.deleted": "removed a delivery activity",
  };
  if (known[action]) return known[action];
  const label = action.replace(/[._]/g, " ").trim();
  if (label) return label.charAt(0).toLowerCase() + label.slice(1);
  return `updated ${entityType || "a record"}`;
}

export async function fetchProjectAuditActivity(entityIds: string[]): Promise<ProjectActivityItem[]> {
  const ids = Array.from(new Set(entityIds.filter(Boolean)));
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("audit_events").select("id,entity_type,entity_id,action,reason,actor_name,created_at").in("entity_id", ids).order("created_at", { ascending: false }).limit(250);
  if (error) return [];
  return (data || []).map((row) => ({
    id: `audit:${row.id}`,
    kind: "project" as const,
    title: presentAuditAction(String(row.action || ""), String(row.entity_type || "")),
    detail: String(row.reason || `${String(row.entity_type || "Record").replace(/_/g, " ")} update`).trim(),
    actorName: String(row.actor_name || "System"),
    occurredAt: new Date(String(row.created_at)).getTime(),
    taskId: row.entity_type === "task" ? String(row.entity_id) : undefined,
  }));
}
