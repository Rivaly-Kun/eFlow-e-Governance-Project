# Phase 04 — Tasks, My Work, Subtasks & Reviews

## Goal

Unify eFlow's personal/team work-management surfaces into a consistent Vibe productivity experience.

## Targets

Inspect/migrate:
- `src/app/features/tasks/`
- task board
- Admin task oversight
- Employee / Team Leader My Tasks
- Work I'm Leading
- My Subtasks
- Deadlines
- Task History
- `src/app/features/subtasks/`
- `src/app/features/reviews/`
- Leader Reviews
- task detail surfaces

## Work views

Use view patterns such as:
- All work
- Assigned to me
- Leading
- Due soon
- Overdue
- For review
- Completed

Use Tabs/filters only when they reflect real current data.

## Core table

Prefer Vibe Table with:
- task
- project
- owner
- department
- status
- priority
- due date
- review state
- progress
- actions

## Grouping

Where useful:
- by project
- by status
- by due period
- by milestone
- by assignee

Do not invent persisted grouping preferences unless authorized.

## Task Detail

Redesign task detail using Vibe Dialog/side-panel composition if suitable.

Preserve all existing task lifecycle, evidence, review, reminder, discussion, and audit behavior.

## Review UX

Review surfaces should feel formal and clear.

No self-review regression.

## Accessibility

Complex rows must not become giant pseudo-buttons when they contain nested controls.

Prefer task title/open action as the navigation target.

STOP.
