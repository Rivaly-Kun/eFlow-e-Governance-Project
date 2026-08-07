# eFlow feature inventory and compatibility baseline

This inventory is the no-feature-loss baseline for the modularisation effort. Every listed entry must remain reachable with the same role access and sidebar destination until a separately approved product change says otherwise.

## Shared shell

- Authentication, loading state, profile preferences, quick account switching, notifications, chat, incoming-call listener, account settings, and logout.
- Role routing: superadmin, depthead, employee, teamleader, executive, legislative, councilor_pad, hrmo, and finance.

## Active workflow roles

- Department Head: Overview, Projects, Task Board, Work I'm Leading, My Subtasks, Reviews, Team Supervision, Team Intelligence, Reports, and Announcements.
- Employee / Team Leader: My Tasks, Work I'm Leading, My Subtasks, Leader Reviews, Deadlines, Task History, Performance, Work Report, and Announcements. Leadership entries remain conditional on leading work.
- Shared workflow operations: task lifecycle, assignments, reviews, subtasks, project milestones, task discussions/activity, reports, announcements, and employee performance/workload views.

## Administration and specialist roles

- Super Admin: dashboard, projects, tasks, reports, announcements, users, organization tree, permissions, audit log, system settings, and migration.
- Executive: Portfolio Intelligence, Project Transformation, Financial Oversight, and Immutable Audit; default `portfolio / City Project Pulse`.
- Legislative: Legislative Dashboard, Session Management, Committee Affairs, and Councilor Workspace; defaults remain the first registered page in each section.
- HRMO: Workforce Intelligence, Wellness & Attendance, and Performance Compliance; default `workforce / Burnout Prediction Radar`.
- Finance: Project Finance, Liquidation, and Immutable Ledger; default `projfin / Programmatic Buckets`.
- Councilor Pad opens the Councilor Dashboard and retains access to legislative measures, sessions, and committees.
- Proposal import and PDS parsing, AI recommendation/decomposition, audit, notifications, chat/calls, and the FastAPI administration endpoints remain behaviourally and contractually unchanged.

## Verification baseline

- npm run build passes before this program begins.
- Sidebar section identifiers, page labels, default destinations, and role mappings are tested as a public navigation contract.
