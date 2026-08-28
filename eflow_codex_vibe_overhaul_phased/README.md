# eFlow × Vibe — Codex UX/UI Overhaul Pack

This pack replaces the previous conservative/custom-design-system direction.

## Core decision

eFlow will use **monday.com Vibe Design System as the primary real UI library and design language**.

The goal is not to make eFlow "inspired by monday.com" while keeping the old UI.

The goal is to progressively **replace the existing presentation layer** with real Vibe components, Vibe tokens, Vibe interaction patterns, Vibe UX-writing principles, and a productivity-first workspace model.

Business logic, permissions, routes, Supabase/RLS behavior, backend contracts, workflow states, audit/evidence rules, and feature behavior remain intact unless a separate product-change phase explicitly changes them.

## Important baseline

These documents were prepared from the GitHub `main` branch of:

`Rivaly-Kun/eFlow-e-Governance-Project`

at tree/commit snapshot:

`508aabc8881630b37a62a973645ecb0bb386e99e`

The coding agent MUST compare its local working tree with `origin/main` before editing because local uncommitted design experiments may differ from this baseline.

## Read order

1. `foundation/01_SOURCE_AUDIT.md`
2. `foundation/02_PRODUCT_UX_NORTH_STAR.md`
3. `foundation/03_VIBE_IMPLEMENTATION_STANDARD.md`
4. `foundation/04_UX_WRITING_STANDARD.md`
5. `foundation/05_MIGRATION_GUARDRAILS.md`
6. `foundation/06_VISUAL_QUALITY_BAR.md`
7. `agent/CODEX_MASTER_INSTRUCTION.md`
8. `phases/PHASE_00_RECONCILE_AND_BASELINE.md`
9. Then execute exactly one phase at a time, in order.

## Phase sequence

- Phase 00 — Reconcile local state and establish baseline
- Phase 01 — Vibe foundation and migration infrastructure
- Phase 02 — App shell, navigation, authentication surfaces
- Phase 03 — Projects and Project Workspace
- Phase 04 — Tasks, My Work, Subtasks, Reviews
- Phase 05 — Team, Reports, Announcements, Communications
- Phase 06 — Super Admin, Organization, Permissions, Audit, Settings
- Phase 07 — Specialist, AI, Budget, Governance workspaces
- Phase 08 — Legacy UI purge, dependency cleanup, final system QA

Do not skip directly to the final purge.
The old design is removed progressively as each vertical slice is successfully migrated.
