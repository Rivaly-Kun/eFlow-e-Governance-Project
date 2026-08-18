# Sir Gerson Updates — System Implementation Plan

**Prepared:** August 18, 2026  
**Status:** Implemented in repository on August 19, 2026 — apply the three `20260819` Supabase migrations and complete deployment verification before production use  
**Scope:** User access management, Supabase backup/export, ordered subtasks, project supervision, monthly productivity recognition, and inactivity logout.

## 1. Objective

Deliver the requested Sir Gerson updates as small, testable vertical slices without losing any existing eFlow feature or weakening its Supabase security model.

The target operational flow remains:

`Project -> Milestone -> Task -> Ordered subtasks -> Evidence -> Leader review -> Head review -> Completion -> Reports`

This plan covers:

1. Move Permissions into User Management.
2. Support different effective access for two people with the same role.
3. Replace the obsolete Firebase migration utility with a real Supabase Backup & Export tool.
4. Let Task Leads sequence and reorder subtasks.
5. Revamp Projects into a detailed project-supervision workspace for Heads and authorized users.
6. Add a fair monthly productivity leaderboard.
7. Automatically sign users out after one hour of inactivity.

The handwritten “bypass task if automation” item is explicitly **out of scope** until a clear requirement is provided.

## Implementation record — August 19, 2026

All seven approved phases are implemented as additive, modular slices:

- Baseline contracts and regression fixtures were recorded before feature changes.
- Permissions now lives inside User Management as **Users**, **Role Defaults**, and **User Access**; the legacy route remains a compatibility redirect. Page/action entitlements, individual allow/deny overrides, direct-route enforcement, and audited organization-scope grants are implemented.
- The obsolete reachable Firebase migration page was replaced with **Data Tools → Backup & Export**. The gateway creates schema SQL, restore-grade data SQL, table JSONL, manifests, SHA-256 checksums, optional encrypted disaster-recovery archives, and audited temporary jobs. Starting an export requires current-password reauthentication.
- Task Leads can atomically reorder numbered subtasks with drag and keyboard controls. The server validates the exact task set, locks unsafe lifecycle states, and preserves evidence and review records.
- Project Detail is now the shared seven-tab Project Command Workspace: Overview, Plan, Work, People, Reviews, Activity, and Reports. It includes project editing, milestone/member-role management, task-to-milestone linking, ordered work details, live supervision signals, and scoped exports.
- Team Intelligence now includes an approved-work monthly leaderboard with transparent scoring; Reports contains a monthly summary, Employees receive a private score view, and Super Admin receives city/department filtering. Closed-month snapshots are immutable to browser clients and scheduled automatically when `pg_cron` exists.
- Every authenticated role is protected by cross-tab inactivity coordination, a warning at 55 minutes, and local-browser sign-out at 60 minutes. Background traffic and AI queue polling never count as user activity.

Repository verification covers TypeScript, workflow selectors, navigation/access, scoring boundaries, session timing, backup path/checksum/recent-auth helpers, and production compilation. Live Supabase verification is intentionally separate because repository migrations must first be applied to the target project.

## 2. Product decisions

### 2.1 Permissions belongs inside User Management

Permissions should become a sub-tab of User Management instead of remaining a separate primary sidebar destination.

The resulting Super Admin workspace will contain:

- **Users** — create, edit, activate/deactivate, search, and inspect accounts.
- **Role Defaults** — define the capabilities normally inherited by every Head, Assistant Head, Employee, or other supported role.
- **User Access** — grant or deny exceptions for a particular person and show their final effective access.

This is better than simply placing the old Permissions page below the user table because identity, role, organization, inherited access, and exceptions can be understood in one place.

The old `permissions` navigation section remains as a temporary compatibility route that opens `User Management -> User Access`. It can be removed only after navigation and deep-link tests prove there are no remaining consumers.

### 2.2 Same role, different access

Role names remain the baseline, not the complete authorization answer.

Example:

- Head A inherits the standard Head pages and actions.
- Head B inherits the same standard access but receives an individual grant for an additional report or page.
- Head C can receive an explicit denial for one optional capability without changing every other Head.

Effective access is resolved in this order:

`per-user override -> role default -> safe built-in fallback`

Access must be separated into three layers:

| Layer | Purpose | Enforcement |
| --- | --- | --- |
| Page entitlement | Whether a sidebar destination and route are available | Navigation resolver and route guard |
| Action capability | Whether an action such as delete, assign, review, export, or manage users is allowed | UI guard plus database/backend validation |
| Data scope | Which departments, projects, tasks, and reports the user may read or modify | Supabase RLS and scoped database functions |

Hiding a tab is not security. A user who is denied a page or action must also be denied when attempting the same operation through a direct URL or Supabase request.

### 2.3 Backup format

The current “Database Migration Tool” is a legacy Firebase array-to-object migrator and no longer represents the active Supabase system. It should be replaced with **Data Tools -> Backup & Export** while preserving the old `migration` section ID temporarily.

Each generated backup will be a timestamped ZIP containing:

```text
eflow-backup-YYYY-MM-DD-HHmm/
  manifest.json
  schema.sql
  data.sql
  data/
    profiles.jsonl
    organizations.jsonl
    projects.jsonl
    tasks.jsonl
    ...one JSONL file per included public table
  storage-manifest.json
  checksums.sha256
```

- `schema.sql` is the authoritative schema-only dump: tables, columns, constraints, indexes, functions, triggers, and RLS policies.
- `data.sql` is the restore-grade SQL data dump in dependency-safe order.
- `data/*.jsonl` is the readable/auditable representation, one JSON object per row, preserving arrays and JSON fields cleanly.
- `manifest.json` records the Supabase project, generation time, schema version, included/excluded tables, row counts, file sizes, and tool version.
- `storage-manifest.json` records private bucket/object metadata; actual evidence files are an optional separate export because they may be large.
- `checksums.sha256` detects corruption or modification.

The default export covers the eFlow `public` schema. Supabase-managed authentication internals and storage objects require an explicitly selected disaster-recovery mode and must never expose service-role keys, environment secrets, passwords, or raw session tokens.

### 2.4 Subtask hierarchy means ordered execution steps

The requested hierarchy will use the existing `subtasks.position` field as an explicit sequence:

```text
Step 1  Invite participants
Step 2  Prepare presentation
Step 3  Prepare venue and refreshments
Step 4  Conduct meeting
Step 5  Submit minutes and evidence
```

Task Leads can drag steps or use accessible Move Up/Move Down controls. Employees see the same numbered order everywhere.

This phase does **not** introduce nested subtasks. It also does not automatically prevent Step 3 from starting before Step 2; the sequence is a management order, while the existing evidence and approval workflow remains authoritative. Strict subtask dependencies can be added later as a separate rule if required.

### 2.5 One project workspace, capability-aware actions

Super Admin, Head, Assistant Head, Team Lead, and Employee project pages must continue to read the same `projects`, `milestones`, `tasks`, `subtasks`, submissions, and activity records.

There will not be separate “Admin projects” and “Employee projects” data models. The shared project workspace exposes more or fewer actions based on effective permissions and RLS scope.

### 2.6 Leaderboard measures approved contribution, not raw clicking

The monthly leaderboard must not reward users for splitting work into many tiny tasks or rushing low-quality submissions.

It will show:

- approved tasks;
- approved subtasks;
- on-time completion rate;
- median active cycle time;
- first-pass approval rate;
- contribution score with a visible breakdown.

Only approved work counts. Speed is normalized against estimated effort when available and is capped so quality and completion remain more important than raw elapsed time.

### 2.7 Inactivity means real user inactivity

The default timeout is 60 minutes for every authenticated eFlow role. Background API calls, Supabase Realtime messages, AI queue updates, animations, and timers do not count as user activity.

Trusted keyboard, pointer, touch, and navigation interactions update the activity timestamp. All eFlow tabs in the same browser share that timestamp.

## 3. Current-state findings

The implementation must start from these verified repository facts:

- `AdminPermissions.tsx` already supports role defaults and per-user overrides.
- `role_permissions` and `user_permission_overrides` already exist in Supabase.
- Permission overrides currently cover only ten action capabilities and do not govern sidebar/page visibility.
- The permission user selector still reads through the legacy Firebase `useUsers()` adapter instead of the canonical Supabase profile directory.
- Super Admin navigation currently exposes `users` and `permissions` as separate top-level sections.
- The current Migration Tool reads and writes Firebase `/departments`, `/employees`, and `/users`; it does not back up the active Supabase database.
- Subtasks already contain `position`; reads are ordered by it and a client-side `reorderSubtasks()` function exists.
- Reordering currently performs several independent updates and therefore is not atomic under failure or concurrent edits.
- The leader-facing subtask widget has no complete drag/reorder experience.
- Project Detail currently has Overview, Milestones, Tasks, and Members tabs but lacks a unified subtask/evidence timeline, review summary, project activity, project-specific supervision, and embedded reporting.
- The project service already supports update, archive/restore, permanent deletion, member operations, milestones, and atomic project creation, so the revamp should expose and compose existing operations rather than duplicate them.
- Department Reports and Team Supervision already contain useful live selectors that should be reused for project-specific views.
- No monthly productivity leaderboard or inactivity timeout currently exists.

## 4. Architecture and module boundaries

All work follows the root `AGENTS.md` modularity rules.

Suggested feature ownership:

```text
src/app/features/
  administration/
    components/user-management/
    components/data-tools/
    hooks/
    services/
  permissions/
    components/
    selectors/
    services/
    types.ts
    constants.ts
    index.ts
  projects/
    components/project-detail/
    hooks/
    selectors/
    services/
    types.ts
    index.ts
  subtasks/
    components/sequencing/
    services/
    selectors/
    types.ts
    index.ts
  productivity/
    components/
    selectors/
    services/
    types.ts
    index.ts
  session-security/
    components/
    hooks/
    services/
    constants.ts
    index.ts
```

The Python gateway adds focused backup modules instead of expanding `server/main.py` or `server/routers/admin.py` into oversized files:

```text
server/
  routers/backups.py
  services/backup_service.py
  services/backup_manifest.py
  services/backup_security.py
```

## 5. Incremental implementation phases

## Phase 0 — Baseline and contracts

### Work

1. Record the existing Super Admin navigation IDs, default pages, permission keys, project routes, project detail actions, and subtask review rules.
2. Add fixtures representing:
   - two Heads in the same role with different user overrides;
   - two organizations that must remain isolated;
   - one project with milestones, tasks, ordered subtasks, evidence, reviews, and activity;
   - completed work across two different calendar months.
3. Add a live-schema preflight for the permission, project, task, subtask, review, and audit tables used by these phases.
4. Do not alter AI decomposition or Team Intelligence assignment inputs during this program.

### Acceptance

- Existing navigation and workflow tests pass before feature changes begin.
- The baseline proves that current proposal import, project creation, task assignment, subtask evidence, leader review, Head review, reports, and notifications remain available.

## Phase 1 — Unified User Management and individual access

### 1.1 User Management workspace

Refactor User Management into a small tabbed shell:

- `UsersTab`
- `RoleDefaultsTab`
- `UserAccessTab`

Move the existing permission matrix into the new tabs without duplicating its business rules.

Add an **Access** action to each user row. It opens a drawer containing:

- role and organization;
- inherited role defaults;
- individual allows and denies;
- organization scope grants;
- final effective pages and actions;
- who last changed access and when.

Use Supabase `profiles` as the only user directory source. Remove `useUsers()` from the permission workspace after callers migrate.

### 1.2 Permission catalog

Retain the existing action keys and add explicit page entitlements, for example:

```text
navigation.projects
navigation.tasks
navigation.reviews
navigation.team_supervision
navigation.team_intelligence
navigation.reports
navigation.announcements
navigation.user_management
navigation.organization
navigation.audit
navigation.system_settings
navigation.data_tools
```

Action permissions remain separate, including:

```text
projects.create
projects.archive
projects.delete
tasks.assign
tasks.verify
reports.export
announcements.publish
users.manage
audit.read
settings.manage
database.backup
```

### 1.3 Navigation and route enforcement

1. Resolve visible role navigation from role defaults plus per-user overrides.
2. Apply the same permission to direct route resolution; denied destinations show a clear Access Denied page rather than silently falling back to an unrelated dashboard.
3. Keep Dashboard, personal Settings, Notifications, and Logout available to every active authenticated user.
4. Redirect the old `permissions` section to `users/access` during the compatibility period.

### 1.4 Data-scope grants

Add an optional, audited `user_org_scope_grants` table for exceptions that truly require access beyond the user’s normal organization:

```text
user_id
org_id
access_level: read | manage | review
reason
granted_by
expires_at
created_at
updated_at
```

Add `has_permission(user_id, permission)` and `can_access_org(user_id, org_id, access_level)` database helpers. Update only the relevant RLS policies to use these helpers.

A page grant alone never expands data scope. Cross-department access requires a separate explicit scope grant with a reason and optional expiry.

### 1.5 Safety rules

- Super Admin core access cannot be revoked through the UI.
- A Super Admin cannot remove their own `users.manage` or `database.backup` access while they are the only active Super Admin.
- Every role-default, user-override, and organization-scope change creates an audit event.
- Permission changes invalidate/refetch the affected user’s effective-access cache through Supabase Realtime.

### Acceptance

- Two Heads with the same role can see different optional tabs and actions.
- Both remain limited to their permitted organizational data.
- Changing one Head does not modify the Head role default or the other Head.
- Refreshing or opening a direct link preserves the same access decision.
- The standalone Permissions sidebar item is no longer displayed, while its old route safely redirects.

## Phase 2 — Supabase Backup & Export workspace

### 2.1 Replace the obsolete utility

Rename the displayed section from **Migration Tool** to **Data Tools**, with **Backup & Export** as its first page. Retain the internal `migration` route as a temporary redirect.

Remove Firebase-specific language and operations from the reachable UI. Keep the legacy code only until repository search and compatibility tests prove it is unused.

### 2.2 Secure backend job

Add JWT-protected gateway endpoints:

```text
POST /controlpanelEflow/api/admin/backups
GET  /controlpanelEflow/api/admin/backups/{job_id}
GET  /controlpanelEflow/api/admin/backups/{job_id}/download
DELETE /controlpanelEflow/api/admin/backups/{job_id}
```

Requirements:

- Require active Super Admin plus `database.backup`.
- Require a fresh confirmation/reauthentication step before starting a full export.
- Use a server-only direct database URL such as `EFLOW_DATABASE_URL`; never expose it or the service-role key to React.
- Invoke `pg_dump` with a fixed argument list, never string-built shell commands.
- Allow only one export job per administrator at a time.
- Write output into a verified temporary backup directory, not the repository.
- Automatically delete server-side export files after a short retention period such as 24 hours or immediately after the administrator chooses Delete.
- Record start, completion, failure, download, actor, archive hash, included scope, and row totals in the audit log.

### 2.3 Backup modes

**Operational export — default**

- eFlow `public` schema and permitted public data;
- secret-bearing configuration values redacted;
- readable JSONL plus schema/data SQL;
- storage object manifest without downloading all binary evidence.

**Disaster-recovery export — explicit advanced option**

- complete approved schema set;
- unredacted application configuration only after reauthentication and a typed confirmation;
- optional private storage objects;
- encrypted archive with an administrator-provided passphrase that is never stored.

Passwords, refresh tokens, service-role keys, process environment variables, and live session tokens are never included.

### 2.4 Data Tools UI

Show:

- connection/status preflight;
- discovered public tables;
- estimated row counts and export size;
- included/excluded tables;
- export mode and storage-file option;
- live phase/progress messages;
- final archive size, SHA-256 hash, generated time, and Download/Delete controls;
- recent backup audit history without retaining download credentials.

Do not add an in-place Restore button in this phase. Restore is destructive and should first be validated against a separate Supabase test project using a documented runbook.

### Acceptance

- The generated ZIP contains schema SQL, data SQL, one JSONL stream per included table, manifest, and checksums.
- Row totals in the manifest reconcile with the dump.
- A restore rehearsal into an empty test database recreates constraints and representative workflow data.
- A non-Super Admin and a Super Admin without `database.backup` receive 403 from the backend even when calling the endpoint manually.
- No secret appears in the browser bundle, logs, manifest, or default archive.

## Phase 3 — Ordered subtask sequencing

### 3.1 Atomic database operation

Add `reorder_task_subtasks(p_task_id uuid, p_ordered_ids uuid[])` as an audited transaction.

The function must:

- derive the actor from `auth.uid()`;
- require that the actor can manage the parent task’s subtasks;
- lock the parent task and its subtasks during reorder;
- verify every supplied ID belongs to the same parent task;
- reject missing, duplicated, foreign, or deleted IDs;
- reject changes while the parent task is under review, completed, cancelled, archived, or otherwise locked by existing workflow rules;
- rewrite positions to contiguous zero-based values;
- create one audit event describing the before/after order;
- return the final ordered rows.

Normalize existing duplicate/gapped positions before applying an appropriate `(task_id, position)` integrity rule.

Replace the current multi-request `reorderSubtasks()` implementation with this RPC while keeping the same public feature export for callers.

### 3.2 Leader experience

In every Team Lead/authorized manager subtask list:

- show `Step 1`, `Step 2`, and so on;
- add drag handles;
- add Move Up/Move Down controls for keyboard and older-device accessibility;
- optimistically preview the order, then reconcile with the RPC response;
- restore the previous order and show a clear message if the transaction fails;
- disable sequencing while the parent workflow is locked;
- preserve all assignees, evidence, progress, submissions, and review state during reorder.

Employees receive a read-only numbered sequence in My Subtasks, task details, notifications, and review evidence views.

### 3.3 Realtime and templates

- Broadcast the final order through the existing Supabase Realtime subscription.
- Ensure AI-created, manually created, and template-created subtasks use contiguous positions.
- Preserve template order when applying or replacing a template.
- Reordering does not restart tasks, change progress, or resubmit evidence.

### Acceptance

- A Team Lead can reorder five subtasks and every open client immediately shows the same sequence.
- Two simultaneous reorder attempts produce one valid contiguous order, never partial ordering.
- Contributors cannot reorder through the UI or direct RPC.
- Evidence and approval history remain attached to the correct subtask IDs.

## Phase 4 — Project Command Workspace revamp

### 4.1 Shared project shell

Replace the large Project Detail controller with a small shared shell and focused tabs:

```text
ProjectCommandWorkspace
  ProjectHeader
  ProjectHealthStrip
  ProjectOverviewTab
  ProjectPlanTab
  ProjectWorkTab
  ProjectPeopleTab
  ProjectReviewsTab
  ProjectActivityTab
  ProjectReportsTab
```

The visual design should match the current Team Supervision, Team Intelligence, Reviews, and Reports pages: consistent page headers, status badges, stat cards, filter bars, drawers, empty states, and loading/error treatment.

### 4.2 Project list revamp

Add useful, filterable portfolio information to project cards/rows:

- derived schedule health: on track, due soon, overdue, at risk, completed;
- completion percentage and task totals;
- open versus completed milestones;
- overdue, blocked, awaiting-review, and changes-requested counts;
- owner and active Task Leads;
- member count;
- next milestone/deadline;
- last meaningful activity time.

Add list/grid switching, saved filter state for the current browser, status/health/owner/lead/date filters, and clear empty states. Do not create a second task or project source of truth.

### 4.3 Project overview and plan

Overview contains:

- project description, owner, department, priority, status, dates, and created/updated metadata;
- weighted progress derived from linked tasks/subtasks;
- schedule and review health;
- current blockers and attention queue;
- milestone timeline;
- recent activity;
- next required actions.

Plan contains:

- editable project fields for authorized users;
- milestone create/edit/delete/reorder;
- operational Project/Milestone links for tasks;
- project member add/remove/role management;
- documented status and ownership changes;
- archive, restore, and permanent deletion through the existing audited operations.

### 4.4 Project work supervision

The Work tab shows the complete hierarchy:

`Milestone -> Task -> ordered subtasks`

For each task, Heads can inspect:

- Task Lead and contributors;
- task status, progress, priority, deadline, dependencies, and review routing;
- numbered subtasks, assignees, progress, blockers, next steps, and evidence state;
- subtask submission/revision status;
- latest task submission and Head-review state;
- overdue/stalled indicators;
- full task/subtask details through the existing drawers.

Reuse the Team Supervision attention selectors and subtask evidence components. Do not copy their calculations into Project components.

### 4.5 Reviews, activity, and reports

**Reviews tab**

- awaiting Leader subtask reviews;
- awaiting Head task reviews;
- requested-changes items;
- review aging and turnaround;
- deep links to the existing review decision workflow.

**Activity tab**

- project changes;
- member and milestone changes;
- task/subtask progress;
- submissions, reviews, reopening, cancellation, archive, and restore events;
- filters for actor, event kind, and date.

**Reports tab**

- project progress and status aging;
- milestone schedule report;
- people/contribution report;
- task/subtask evidence report;
- blockers and risks;
- review turnaround;
- CSV/PDF exports using the existing report service and the exact visible filters.

### 4.6 Role behavior

- Super Admin: all projects and authorized corrective actions.
- Head/Assistant Head: full project supervision inside effective organizational scope.
- Team Lead: full detail for projects/tasks they lead, with subtask-management actions.
- Employee: read-only accessible project context plus their own work/evidence actions.
- Additional access follows the Phase 1 permission and scope-grant model.

### Acceptance

- A Head can open a project and trace every milestone, task, ordered subtask, evidence submission, Leader decision, Head decision, blocker, and activity event without switching among unrelated pages.
- Project counts reconcile with Team Supervision and Reports because all three use shared selectors.
- Every role sees the same underlying project but only permitted actions and data.
- Existing project creation, AI import, manual work-plan builder, templates, archive/restore, and delete workflows still function.

## Phase 5 — Monthly Contribution Leaderboard

### 5.1 Metrics and scoring

Create a transparent monthly score with separate visible components:

| Component | Rule |
| --- | --- |
| Approved delivery | Count only approved tasks and approved subtasks |
| Priority/effort weight | Weight parent tasks using priority and estimated effort; cap extreme values |
| On-time quality | Bonus for approval by the due date |
| Cycle time | Capped bonus based on active duration versus estimated effort; no estimate means no speed bonus |
| First-pass quality | Full quality factor for first-pass approval; reduced bonus after changes are requested |
| Collaboration | Credit approved subtask contribution without allowing unlimited tiny-subtask farming |

Recommended display columns:

- rank;
- employee;
- approved tasks;
- approved subtasks;
- on-time rate;
- median cycle time;
- first-pass approval rate;
- contribution score;
- View Breakdown.

Do not rank cancelled, deleted, unapproved, self-reviewed, or reopened-invalid work as completed contribution.

### 5.2 Monthly periods and snapshots

- Use `Asia/Manila` month boundaries.
- Current month calculates from live approved workflow facts.
- At month close, a scheduled database job writes an immutable monthly snapshot per employee and department.
- Corrections require an audited administrative recalculation with a reason.
- Historical rankings do not silently change when old records are later edited.

### 5.3 Visibility

- Head/Assistant Head: department leaderboard and drill-down.
- Super Admin: department filter, city-wide view, and comparative department summaries.
- Employee: their own position and score breakdown; top performers may be shown according to the final LGU visibility policy.

Place the leaderboard in Team Intelligence and expose a summary card in Reports. Keep AI assignment inputs unchanged; leaderboard rank must never become the sole AI-assignment signal.

### Acceptance

- Rankings are reproducible from approved records and visible scoring rules.
- A user cannot improve rank by creating many unapproved subtasks.
- An employee never appears with another department’s restricted work details.
- The previous-month snapshot remains stable after the calendar changes.

## Phase 6 — One-hour inactivity logout

### 6.1 Session-security module

Create a focused `session-security` provider mounted inside the authenticated app.

Track activity from:

- pointer/touch interaction;
- meaningful keyboard input;
- route/navigation interaction;
- returning to a visible tab followed by user interaction.

Do not reset from:

- Supabase Realtime events;
- network responses;
- AI queue polling;
- timers/animations;
- background maintenance jobs.

### 6.2 Cross-tab behavior

- Persist only the last-activity timestamp and timeout coordination metadata.
- Synchronize through `BroadcastChannel`, with the storage event as fallback.
- Throttle writes so mouse movement does not continuously write to storage.
- Compare actual timestamps when a throttled/background tab becomes visible; do not rely only on `setTimeout` accuracy.

### 6.3 User experience

- At 55 minutes, show a five-minute warning dialog with countdown.
- **Stay signed in** records real activity and closes the warning.
- At 60 minutes, sign out the local browser session, clear eFlow user/profile/permission state, close sensitive drawers, and return to Login.
- Show “You were signed out after one hour of inactivity.”
- AI/background jobs may continue server-side, but their result cannot be accessed until the user signs in again.

The default is 60 minutes. If made configurable in System Settings, enforce a safe range and retain 60 minutes when configuration cannot be loaded.

### 6.4 Server/session alignment

- Gateway endpoints continue verifying the Supabase JWT on every protected request.
- Review the Supabase JWT expiry so a stolen browser token cannot remain useful far beyond the intended policy.
- Do not use global sign-out unless LGU policy explicitly requires signing the user out from every device.

### Acceptance

- Fake-timer tests prove warning at 55 minutes and logout at 60 minutes.
- Activity in one eFlow tab keeps the other same-browser tabs signed in.
- Background Realtime traffic does not prevent logout.
- Login, logout, password recovery, quick-login development mode, and the recently fixed authentication-loading flow remain functional.

## Phase 7 — Integrated verification and rollout

### Automated verification

Add or update:

- unit tests for role defaults, user overrides, navigation resolution, organization scope, leaderboard scoring, project rollups, and subtask ordering;
- component tests for User Management tabs, access drawer, backup progress, reorder interactions, Project Command tabs, leaderboard filters, and timeout warning;
- database tests for RLS isolation, atomic reordering, permission helpers, scope grants, audit records, and monthly snapshots;
- gateway tests for backup authentication, allowlists, cleanup, archive contents, redaction, and concurrent-job rejection;
- Playwright role tests for Super Admin, two differently configured Heads, Assistant Head, Team Lead, and Employee.

Every slice must pass:

```text
npm run check
npm test
npm run build
affected Playwright smoke tests
npm run verify:live-schema   # after applying the corresponding migration
```

### Manual end-to-end scenarios

1. Super Admin opens User Management, changes only Head B’s access, and confirms Head A is unchanged.
2. Head B sees the newly granted destination; direct URLs and actions still obey RLS.
3. Super Admin generates a safe backup, verifies manifest counts/checksum, downloads it, and deletes the server copy.
4. Team Lead creates and reorders subtasks; Employee sees the same numbered sequence and submits evidence.
5. Team Lead approves subtasks; Head sees the complete project work/review/activity context and approves the parent task.
6. Reports and the project workspace show identical progress and review totals.
7. Approved work appears in the correct Manila monthly leaderboard with an explainable score.
8. An inactive signed-in browser warns at 55 minutes and logs out at 60 minutes while active tabs remain synchronized.

### Rollout order

1. Baseline and permission tests.
2. Backup & Export foundation, so a verified export exists before later database migrations.
3. Unified User Management and access enforcement.
4. Atomic subtask sequencing.
5. Project Command Workspace revamp.
6. Monthly leaderboard and snapshots.
7. Inactivity logout.
8. Full role-based regression and documentation update.

## 6. Additive database changes

Expected additive migrations include:

- new navigation permission seed rows;
- optional `user_org_scope_grants` plus RLS helper functions;
- permission metadata timestamps if missing;
- atomic `reorder_task_subtasks` RPC and position normalization/integrity;
- monthly contribution snapshot tables and scheduled aggregation function;
- backup audit/job metadata only if server-local job tracking is insufficient.

No existing table, status, Supabase return shape, backend route, review RPC, proposal-import contract, or sidebar compatibility ID may be silently replaced.

## 7. Risks and safeguards

| Risk | Safeguard |
| --- | --- |
| Tab access is mistaken for database authorization | Route guards plus RLS and backend checks |
| A user override accidentally grants cross-department data | Separate explicit organization-scope grants |
| Admin locks everyone out | Immutable Super Admin core access and last-admin guard |
| Backup exposes sensitive configuration | Default redaction, reauthentication, backend-only credentials, audit, optional encryption |
| Backup cannot actually restore | Automated restore rehearsal against an empty test database |
| Reordering corrupts progress/evidence | Reorder immutable IDs only in one transaction |
| Two leaders reorder simultaneously | Row locks, exact ID validation, contiguous server-generated positions |
| Project metrics disagree across pages | One shared project/team/report selector layer |
| Leaderboard rewards low-quality busywork | Approved-only, capped speed, effort weighting, quality breakdown |
| Idle timer is kept alive by background traffic | Only trusted human interaction updates activity |

## 8. Definition of complete

This update program is complete only when:

- Permissions is integrated into User Management and the old standalone destination is compatibility-only or removed safely.
- Users with the same role can have different effective pages/actions without weakening data isolation.
- The Supabase backup archive is complete, checksummed, audited, redacted by default, and restore-rehearsed.
- Task Leads can atomically reorder numbered subtasks and every role sees the same order.
- Project Detail provides project-level supervision, work hierarchy, evidence/reviews, activity, and reports using shared live data.
- Monthly rankings use approved, explainable contribution metrics and immutable historical snapshots.
- All authenticated roles are warned and signed out after one hour of genuine inactivity.
- Existing AI decomposition, Team Intelligence recommendation inputs, project/task/subtask/review workflows, notifications, reports, role routing, and Supabase contracts remain functional.
