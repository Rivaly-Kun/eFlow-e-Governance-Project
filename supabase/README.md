# Supabase database setup

`fresh_schema.sql` is the historical base schema. Apply it only when bootstrapping an empty local database, then apply every file in `migrations/` in filename order. Existing environments should apply only migrations that are not yet recorded by their Supabase migration history.

The current task-flow additions are:

1. `20260807000000_task_review_hardening.sql` — reviewer routing, immutable submission attempts, audited review/assignment/archive/delete RPCs, and subtask authorization.
2. `20260807000001_task_planning_enhancements.sql` — acceptance criteria, definition of done, dependencies, cancellation, and reminder dispatch.
3. `20260807000002_recurring_task_templates.sql` — recurring templates and idempotent task materialization.
4. `20260814000000_assistant_head_review_routing.sql` — generic Head/Assistant Head organization assignments, shared scoped-management enforcement, and reciprocal review routing for leadership-led tasks.

5. `20260815000000_project_creation_rls.sql` — scoped project and task creation for Super Admin, Head, Assistant Head, and legacy Department Head accounts.

6. `20260815000001_atomic_project_creation.sql` — authenticated atomic project, member, and milestone creation that avoids partial saves and browser-side RLS insert races.
7. `20260815000002_atomic_task_creation.sql` — authenticated task creation through a validated database RPC, preserving lifecycle triggers without browser-side task INSERT RLS failures.
8. `20260815000003_restore_review_decision_rpc.sql` — restores the deployed task-review decision contract when an older database is missing the RPC.
9. `20260815000004_fix_review_audit_hash_extension.sql` — makes approved-submission audit hashing independent of the extension schema search path.
10. `20260816000000_project_deletion.sql` — adds scoped, audited permanent project deletion for Head, Assistant Head, and Super Admin while retaining task history.
11. `20260816000001_subtask_evidence_review.sql` — replaces direct subtask check-off with progress, evidence submission, Team Leader review, revision, approval, and parent-task readiness enforcement.
12. `20260817000000_fix_task_chat_uuid_members.sql` — repairs the task-chat synchronization trigger so parent-task rollups consistently handle UUID team-member arrays.
13. `20260817000001_normalize_subtask_assignee_ids.sql` — converts legacy subtask multi-assignee arrays from text to UUID values and restores the scoped update policy.
14. `20260817000002_subtask_progress_leader_notifications.sql` — notifies the resolved Team Leader after every employee subtask progress update.
15. `20260817000003_work_template_library.sql` — moves recurring work under Projects, adds governed personal/department subtask templates, seeds an editable Meeting Preparation checklist, and atomically applies templates with safe merge/replace protection.
16. `20260819000000_sir_gerson_access_control.sql` — unifies role defaults and individual page/action overrides, adds audited organization-scope grants, and extends canonical project/task scope helpers without weakening RLS.
17. `20260819000001_ordered_subtasks.sql` — normalizes subtask positions and adds one atomic, audited reorder RPC with workflow locking and exact-ID validation.
18. `20260819000002_monthly_productivity_leaderboard.sql` — adds approved-work monthly contribution snapshots, audited closed-month recalculation, Manila time boundaries, and automatic month close when `pg_cron` is enabled.
19. `20260819000003_fix_project_deletion_task_links.sql` — clears canonical project and milestone links together before permanent project deletion.
20. `20260819000004_subtask_execution_dependencies.sql` — enforces ordered subtask prerequisites while retaining explicitly independent subtasks.
21. `20260819000005_proposal_portfolios_and_unique_leadership.sql` — persists Proposal and Program identity on operational projects, groups imported work reliably even when projects are empty, limits Head/Assistant project scope to their exact organization, and enforces one active Head plus one active Assistant Head per organization.
22. `20260819000006_super_admin_project_read_only.sql` — makes Super Admin proposal/project access oversight-only in the database while Heads and Assistant Heads retain exact-organization project management.
23. `20260819000007_super_admin_task_read_only.sql` — makes Super Admin task access oversight-only while operational task changes remain with the responsible organization and workflow participants.

Apply these files in the listed order. The Assistant Head migration defensively
creates the two reviewer columns when absent, but it does not replace the full
review-hardening migration that supplies submission history, evidence records,
and the review RPCs.

The Sir Gerson migrations must be applied in the order above. After applying them, run `npm run verify:live-schema`. A hosted Supabase project with `pg_cron` enabled schedules the previous-month productivity snapshot automatically; otherwise a Super Admin can run the audited recalculation RPC for a closed month.

These migrations do not require a service-role key in the browser. The frontend must use only the Supabase anonymous client; privileged behavior belongs in RLS policies, database functions, or the backend server.
