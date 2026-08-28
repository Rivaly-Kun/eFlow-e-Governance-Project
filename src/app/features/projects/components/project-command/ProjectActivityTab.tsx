import { EmptyState, Label, TextField } from "@vibe/core";
import { useMemo, useState } from "react";
import type { ProjectCommandData, ProjectActivityItem } from "./types";

export function ProjectActivityTab({ data }: { data: ProjectCommandData }) {
  const [kind, setKind] = useState("all");
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      data.activity.filter(
        (item) =>
          (kind === "all" || item.kind === kind) &&
          `${item.title} ${item.detail} ${item.actorName || ""}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [data.activity, kind, query],
  );
  return (
    <section className="eflow-section-card">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2>Project activity</h2>
          <p className="m-0 mt-1 text-sm">
            Immutable history of task activity, evidence submissions, reviews,
            and revisions.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <TextField
            value={query}
            onChange={setQuery}
            inputAriaLabel="Search project activity"
            placeholder="Search activity"
          />
          <select
            aria-label="Filter activity type"
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            className="eflow-control"
          >
            <option value="all">All activity</option>
            <option value="status">Status</option>
            <option value="progress">Progress</option>
            <option value="submission">Reviews</option>
          </select>
        </div>
      </header>
      <div>
        {rows.length ? (
          rows.map((item) => <ActivityRow key={item.id} item={item} />)
        ) : (
          <EmptyState
            title="No activity matches these filters"
            description="Try a different search or activity type."
          />
        )}
      </div>
    </section>
  );
}
function ActivityRow({ item }: { item: ProjectActivityItem }) {
  const color =
    item.kind === "submission"
      ? "working_orange"
      : item.kind === "status"
        ? "primary"
        : "dark";
  return (
    <article className="grid grid-cols-[auto_1fr] gap-3 border-b border-neutral-100 px-4 py-3 last:border-0">
      <Label
        text={
          item.kind === "submission"
            ? "Review"
            : item.kind === "status"
              ? "Status"
              : "Activity"
        }
        color={color}
      />
      <div>
        <strong className="block text-sm">{item.actorName || "System"} {item.title}</strong>
        <p className="m-1 text-sm text-secondary">{item.detail}</p>
        <span className="text-xs text-secondary">
          {new Date(item.occurredAt).toLocaleString()} · {item.kind === "submission" ? "Review workflow" : "Project history"}
        </span>
      </div>
    </article>
  );
}
