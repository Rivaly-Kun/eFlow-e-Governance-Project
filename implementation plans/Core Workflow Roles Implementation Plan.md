# Core Workflow and Role Completion Plan

## Goal

Close the capstone-critical gaps for Department Heads, Super Admins, and Employees without creating separate copies of projects, reports, comments, or activity history for each role. The core workflow is:

`Project -> Milestone -> Task -> Progress update / discussion -> Submission -> Review -> Completion / rework -> Report / audit`

Department Head work is first priority because it establishes the operational project and review workflow that Admin oversight and Employee screens must share.

## Scope and boundaries

In scope:

- Internal LEDIPO project, task, review, reporting, announcement, audit, and permission functionality.
- Responsive web delivery for desktop, tablet, and mobile browsers.
- Real data from Supabase, with realtime subscriptions where a user must immediately see a change.

Out of scope for this release:

- Citizen/public service requests.
- Native mobile application delivery.
- Enhancements to the existing AI/LLM features, genetic-algorithm optimization, blockchain enhancements, and process-mining capabilities.

## Product decisions to make once

### 1. Shared workflow statuses

Keep the existing task statuses where possible and make the review lifecycle explicit:

| Status | Meaning | Who moves it |
| --- | --- | --- |
| `pending_assignment` | Task exists but has no owner | Department Head/Admin |
| `todo` | Assigned and not started | Department Head/Admin |
| `in_progress` | Employee is actively working | Employee |
| `for_review` | Employee submitted output for validation | Employee |
| `rejected` | Review needs changes; feedback is mandatory | Department Head/Admin |
| `completed` | Output approved | Department Head/Admin |
| `archived` | Retained but excluded from active work | Department Head/Admin |

Reopen and archive actions must write an audit event. Completion should never be silently overwritten.

### 2. One shared data model

Create migrations and narrow services before adding new dashboards. Suggested tables:

| Entity | Essential fields |
| --- | --- |
| `projects` | id, org_id, title, description, owner_id, status, priority, start_date, target_date, archived_at, created_by |
| `project_members` | project_id, user_id, role (`owner`, `member`, `viewer`) |
| `milestones` | id, project_id, title, due_date, status, sort_order |
| `task_progress_updates` | id, task_id, author_id, percent_complete, blocker, next_step, note, created_at |
| `task_comments` | id, task_id, author_id, body, created_at, edited_at, deleted_at |
| `task_comment_attachments` | comment_id, storage path, original file name, mime type, size |
| `announcements` | id, title, body, audience (`all`, `org`, `users`), org_id, published_at, expires_at, created_by |
| `announcement_recipients` | announcement_id, user_id, read_at |
| `audit_events` | id, actor_id, entity_type, entity_id, action, before_data, after_data, metadata, created_at |
| `role_permissions` | role, permission key, allowed |
| `user_permission_overrides` | user_id, permission key, allowed, set_by |

Extend `tasks` only with direct task fields such as `project_id`, `milestone_id`, `percent_complete`, `archived_at`, and `last_activity_at`. Preserve existing submission, verification, attachment, and status-history records; do not migrate them into UI-only state.

### 3. Security baseline

- All writes must use authenticated actor identity, not a client supplied user ID.
- Supabase RLS must scope Department Heads to their organization subtree, Employees to assigned/member tasks, and Admins to their granted permissions.
- Storage objects for task outputs and comment attachments must be private and authorized through storage policies.
- Audit events are append-only for normal users. No client may update or delete them.
- Add a `can(permission)` helper to the auth context. UI checks improve usability, but RLS/database checks remain the enforcement boundary.

## Phase 0 - Shared foundation

### Deliverables

1. Add one dated Supabase migration for projects, milestones, comments, progress updates, announcements, audit events, and permissions.
2. Add RLS policies and indexes for common queries:
   - active projects by organization and target date;
   - tasks by project, assignee, status, and deadline;
   - review queue by `for_review` status;
   - audit history by entity and timestamp.
3. Add `projectService`, `taskDiscussionService`, `announcementService`, `reportService`, `auditService`, and `permissionService`.
4. Refactor current task mutations to consistently:
   - validate the action;
   - update the main record;
   - append status history;
   - append an audit event;
   - send targeted in-app/email notifications;
   - trigger local and Supabase realtime refreshes.
5. Create shared components: `ProjectStatusBadge`, `TaskReviewPanel`, `TaskActivityTimeline`, `TaskDiscussion`, `ProgressUpdateForm`, `ExportMenu`, `FilterBar`, and `EmptyState`.

### Acceptance criteria

- Existing task creation, assignment, submission, approval, rejection, reopen, and attachment behavior still works.
- A user cannot discover or mutate another department's private project/task data using a direct Supabase request.
- Every state-changing workflow action creates exactly one auditable event with actor, time, object, and outcome.

## Phase 1 - Department Head command center

### 1. Department dashboard

Create `DeptHeadDashboard.tsx` as the default Department Head landing page, driven by scoped organization data rather than sample cards.

Show:

- project health: on track, at risk, delayed, complete;
- overdue task count and the five most urgent tasks;
- pending-review count with direct links to each submission;
- workload by employee, including unassigned work and capacity warnings;
- completion rate for a selectable period;
- upcoming deadlines and milestones for the next 7/14/30 days.

Interactions:

- filters for date range, project, team, and employee;
- clicking a metric opens the filtered source list;
- empty/error/loading states; no invented metrics when data is missing.

### 2. Project lifecycle management

Add Department Head routes:

- `Projects` - list, search, filter, create, archive, and restore allowed projects.
- `Project details` - overview, milestones, tasks, members, documents, activity, and reports tabs.
- `Project composer` - title, description, priority, dates, owner, members, milestones, and initial tasks.

Rules:

- Department Heads can create/edit/archive projects only inside their organization subtree.
- Project archive blocks new work but preserves history and allows read-only report access.
- A milestone's state is calculated from its tasks but can also carry a documented manual status override.
- Every task created from a project automatically receives `project_id`; avoid duplicated project names as the relationship.

### 3. For Review inbox

Add a dedicated `ForReviewInbox.tsx`, not merely a filtered Kanban column.

Each review row must include task, employee, project/milestone, submission time, latest progress update, attachments, and any earlier rejection feedback.

Actions:

- Approve -> `completed`, optional feedback, employee notification.
- Request changes -> `rejected`, feedback required, employee notification, task returns to active work.
- Reassign/reopen only with reason.
- Download/view private attachments using a fresh signed URL.

### 4. Departmental reports

Add a Reports route with data tables and visual summaries for:

- task progress and status aging;
- employee productivity (completed, overdue, review turnaround, workload);
- workload distribution;
- overdue tasks and delayed milestones.

Exports:

- CSV from the exact filtered rows;
- PDF with report title, selected filters, generated time, totals, table, and chart snapshot;
- no export should contain data the user cannot view on screen.

### 5. Discussion and activity

Add an Activity tab to Project Details and Task Details. Combine chronological, immutable system events with regular user comments but style them differently.

Employees and the assigned reviewers can post comments on a task. Department Heads can moderate only when policy requires it; a removal must leave an audit event rather than erase history.

### Department Head acceptance criteria

- A head can create a project, add a milestone, create/assign a task, receive a submission, reject it with feedback, approve the corrected work, and export a filtered report.
- Another department's project never appears in the dashboard, lists, reports, or direct URLs.
- The dashboard numbers reconcile with the underlying filtered tasks.

## Phase 2 - Admin operational control

### 1. System-wide Projects and Tasks

Add `Projects` and `Tasks` to the Super Admin navigation. Reuse the same project and task components but give Admin a cross-organization filter and system-wide scope.

Admin actions:

- create/update/archive projects across departments;
- inspect any task and its complete review/activity history;
- correct task ownership/status only with a reason;
- see unassigned, overdue, orphaned, and blocked tasks.

Do not fork the Department Head project data model or build a second task board.

### 2. System-wide reporting

Build an Admin Reports workspace with filters for department, employee, project, date, task status, priority, and review state. Include portfolio health, cross-department workload, completion trends, overdue trends, and employee productivity.

Reuse the shared export service to generate CSV/PDF from the active filters.

### 3. Announcements

Add an Admin Announcements page for drafting, previewing, publishing, expiring, editing, and withdrawing announcements.

Audience choices:

- everyone;
- one organization subtree;
- selected users.

Publishing creates recipient records and notifications. Employees and Heads get an Announcement center with unread/read state. Announcements must not be implemented as ad-hoc chat messages.

### 4. Audit-log screen

Add an Admin-only `AuditLog.tsx` with filters for actor, action, entity type, organization, date, and entity ID. A detail drawer should show a safe field-by-field before/after diff; redact passwords, tokens, and sensitive personal data.

### 5. Permission management

Define explicit capabilities, for example:

- `projects.create`, `projects.archive`, `tasks.assign`, `tasks.verify`, `reports.export`, `announcements.publish`, `users.manage`, `audit.read`, `settings.manage`.

Seed default matrices for Admin, Department Head, and Employee, then add Admin UI for role defaults and auditable per-user overrides. Start with a small, comprehensible permission set; do not expose arbitrary database privileges.

### 6. Dedicated Admin system settings

Separate personal account settings from administrative configuration:

- the global gear remains personal Profile/Appearance/Notifications/Security;
- add `Administration > System Settings` to the Super Admin navigation;
- mount the existing system configuration component there and restrict it to `settings.manage`.

### Admin acceptance criteria

- An Admin can monitor all departments without using Department Head routes.
- A Department Head cannot access Admin reports, audit logs, permissions, or global configuration by changing a client route.
- Every Admin corrective action produces an audit event with its reason.

## Phase 3 - Employee daily-work flow

### 1. My Projects

Add a `My Projects` route that lists only projects where the employee has assigned/member tasks. Project Details should show accessible milestones, their tasks, deadlines, documents, recent updates, and team context without exposing confidential personnel information.

### 2. Task history

Add `Task History` with tabs/filters for completed, rejected, reopened, and archived tasks. Include review feedback, submission dates, outputs, and an activity timeline. Default active work must remain uncluttered by history.

### 3. Structured progress update

Create `ProgressUpdateForm` in task details with:

- percent complete;
- blocker category and free-text blocker;
- next step;
- optional note;
- optional private attachment.

Saving an update should not falsely mark a task complete. It updates the progress timeline, project metrics, and assigned reviewer notification when a blocker is raised.

### 4. Task discussion

Expose the shared Task Discussion component inside employee task details. Restrict participation to employee assignees/team members and authorized reviewers. Comment notifications should deep-link to the exact task/activity item.

### 5. Announcements and reminders

Add an Announcement Center and a `Deadlines` view. Show upcoming, due today, overdue, and awaiting-review tasks. Use scheduled server-side jobs for approaching-deadline reminders; do not rely on a browser tab being open.

### 6. Personal report/export

Add `My Work Report` with date/status/project filters and CSV/PDF export of only the user's visible tasks, progress updates, and submitted outputs.

### Employee acceptance criteria

- An employee can find a project, post a progress update and comment, submit output, receive review feedback, correct the task, and later find the completed record in history.
- Employees cannot read other employees' private task outputs or personal reports.

## Phase 4 - Responsive web completion

### Responsive completion

- Test every primary screen at 360px, 768px, 1024px, and desktop widths.
- Use mobile-first task actions: update progress, comment, upload output, read announcement, and view deadline.
- Add accessible touch targets, keyboard support, loading/error states, and low-bandwidth attachment handling.

## Delivery order and verification

1. Phase 0 foundation and migration/RLS tests.
2. Department Head dashboard, project lifecycle, review inbox, discussion/activity, reports.
3. Admin projects/tasks, reports, announcements, audit, permissions, system settings route.
4. Employee projects/history/progress/discussion/announcements/reports.
5. Responsive web completion.

For every phase:

- run `npm.cmd run build`;
- test with separate Employee, Department Head, and Admin accounts;
- verify direct Supabase access is denied outside the user's allowed scope;
- test empty, loading, error, and permission-denied states;
- add at least one end-to-end test for the role workflow;
- update the capstone requirements traceability matrix with the covered REQ IDs.

## Requirements traceability

| Capstone requirements | Planned delivery |
| --- | --- |
| REQ007-020: dashboards, project/task management, lifecycle/history | Phases 1-3 |
| REQ021-024: collaboration, realtime updates, notifications | Phases 0, 1, and 3 |
| REQ025-028: reports, analytics, export | Phases 1 and 2 |
| REQ029-032: assignments, reminders, announcements | Phases 0, 2, and 3 |
| REQ033-035: profile, history, credentials | Settings work plus Phase 3 |
| REQ036-040: user management, settings, activity logs | Phase 2 |
| REQ041-046: responsive, simultaneous/realtime use, reliability | Phase 4 plus platform tests |
| REQ047-052: authentication, RBAC, secure storage, audit | Phase 0 and Phase 2 |
