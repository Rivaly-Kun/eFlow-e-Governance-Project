# Phase 06 — Administration, Organization, Permissions, Audit & Settings

## Goal

Replace admin-template styling with a cohesive Vibe enterprise/productivity experience.

## Targets

- Super Admin dashboard
- Super Admin projects/tasks/reports/announcements presentation
- `src/app/features/administration/`
- `src/app/features/organization/`
- `src/app/features/permissions/`
- `src/app/features/audit/`
- `src/app/features/settings/`
- users
- organization tree
- permission/access management
- migration/data-health tools
- backup/export surfaces

## Principles

Admin UX should still feel like eFlow, not a separate admin product.

Use real Vibe controls.

## Permissions

Make access understandable.

Separate:
- organizational position
- system permission/access
- scope
- project/task responsibility

Do not redesign actual authorization semantics unless a separate access-model phase authorizes it.

## Audit

Audit should be dense, searchable, filterable, readable.

Use wide table patterns.

## Settings

Group settings progressively.

Avoid enormous pages of cards.

STOP.
