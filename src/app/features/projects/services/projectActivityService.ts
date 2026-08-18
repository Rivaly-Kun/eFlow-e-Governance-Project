import { supabase } from "../../../../lib/supabase";
import type { ProjectActivityItem } from "../components/project-command/types";

export async function fetchProjectAuditActivity(entityIds: string[]): Promise<ProjectActivityItem[]> {
  const ids = Array.from(new Set(entityIds.filter(Boolean)));
  if (ids.length === 0) return [];
  const { data, error } = await supabase.from("audit_events").select("id,entity_type,entity_id,action,reason,actor_name,created_at").in("entity_id", ids).order("created_at", { ascending: false }).limit(250);
  if (error) return [];
  return (data || []).map((row) => ({
    id: `audit:${row.id}`,
    kind: "project" as const,
    title: String(row.action || "Project updated").replace(/[._]/g, " "),
    detail: String(row.reason || `${row.entity_type || "Record"} ${row.entity_id || ""}`).trim(),
    actorName: String(row.actor_name || "System"),
    occurredAt: new Date(String(row.created_at)).getTime(),
    taskId: row.entity_type === "task" ? String(row.entity_id) : undefined,
  }));
}
