# Phase 03 — Projects & Project Workspace
## The defining eFlow productivity phase

## Goal

Make Projects and Project Workspace the strongest representation of eFlow's monday-like productivity identity.

## Targets

Inspect and migrate:
- `src/app/features/projects/`
- Project Command Workspace
- project list/grid
- project detail tabs/views
- milestones
- project members/departments
- project task rollups
- archive/restore UI
- manual/AI project entry points only where presentation is shared

## Projects landing

Prefer productivity views over card-wall dashboards.

Provide a strong toolbar:

- Add approved project
- Search
- Filter
- Person / lead
- Department
- Status
- Health
- Schedule
- Sort
- View options
- More

Use Vibe components.

Primary view should be a Vibe Table or another Vibe-native productivity presentation.

Suggested columns:
- Project
- Lead department
- Project lead
- Status
- Health
- Schedule
- Progress
- Target date
- Actions

Only show data that exists.

## Project Workspace

Use a broad work canvas.

Header:
- project name
- code/context
- status
- health
- schedule
- lead department
- responsible people
- contextual actions

Views/tabs should map to existing real functionality.

## Main execution table

Use monday-like grouping.

Milestones are natural work groups.

Example:

Milestone 1
Task | Owner | Department | Status | Priority | Due date | Review | ...

Rows...

+ Add task

Milestone 2
...

## Vibe Table

Use real Vibe table primitives and supporting controls.

Verify exact installed APIs.

Use sticky columns / scroll / row sizes where useful.

## Inline interaction

Encourage quick work-management interaction.

Safe metadata may support inline changes when existing mutations and permissions already support them.

Do not bypass formal workflow transitions.

Task title opens Task Detail.

## Project states

Keep independent:
- lifecycle
- health
- schedule

## Read-only

Oversight/read-only users get the same high-quality workspace without mutation controls.

## Visual quality

This phase must be screenshot-reviewed.

If it still resembles a generic admin table, continue refining.

STOP after project flow validation.
