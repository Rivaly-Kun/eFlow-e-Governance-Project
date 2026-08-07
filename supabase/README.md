# Supabase database setup

`fresh_schema.sql` is the historical base schema. Apply it only when bootstrapping an empty local database, then apply every file in `migrations/` in filename order. Existing environments should apply only migrations that are not yet recorded by their Supabase migration history.

The current task-flow additions are:

1. `20260807000000_task_review_hardening.sql` — reviewer routing, immutable submission attempts, audited review/assignment/archive/delete RPCs, and subtask authorization.
2. `20260807000001_task_planning_enhancements.sql` — acceptance criteria, definition of done, dependencies, cancellation, and reminder dispatch.
3. `20260807000002_recurring_task_templates.sql` — recurring templates and idempotent task materialization.

These migrations do not require a service-role key in the browser. The frontend must use only the Supabase anonymous client; privileged behavior belongs in RLS policies, database functions, or the backend server.
