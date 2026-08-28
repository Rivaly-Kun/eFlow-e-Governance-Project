# Migration Guardrails

## What "remove the old design" means

It means:

- remove old visual styling
- remove obsolete presentation components
- remove redundant UI libraries after migration
- replace the application shell
- replace old page layouts
- replace old cards/tables/forms/buttons/dialogs where Vibe equivalents are appropriate
- replace mixed icon systems
- remove old theme CSS after no migrated screen depends on it

It does NOT mean:

- delete business logic
- rewrite APIs
- change persisted workflow states
- change RLS
- change permissions
- remove features
- remove routes
- change review authority
- rewrite Supabase queries for visual reasons

## Repository contracts to preserve

Preserve:
- current screens/features
- sidebar destinations
- role visibility
- permissions
- Supabase calls
- backend routes
- user workflows

The UX overhaul is an explicitly approved visual/product redesign, but behavior remains protected unless a phase says otherwise.

## Feature architecture

Keep feature-owned code under:

`src/app/features/<feature>/`

Do not move the application back into giant role-based page-controller files.

Old paths under `src/app/components/<Role>/` may remain as temporary compatibility adapters.

## Vertical migration

Migrate one vertical slice at a time.

For each slice:

1. inspect existing behavior
2. identify route/navigation callers
3. identify permissions/readOnly rules
4. identify queries/mutations
5. replace presentation
6. run tests
7. manually inspect
8. search for legacy consumers
9. remove only dead presentation code

## No big-bang dependency uninstall

Do not uninstall Radix/MUI/Carbon/Lucide/etc. on day one.

First migrate consumers.

At final cleanup:
- search imports
- prove zero consumers
- remove packages/files safely

## Old CSS

Do not delete `globals.css`, `default_theme.css`, or other compatibility CSS while unmigrated screens still depend on them.

The final phase removes them after the application is fully Vibe-driven.

## Authorization

Presentation receives resolved authorization.

A Vibe Button should not infer whether a user is allowed to perform an action.

## Inline editing

monday-like inline editing is encouraged only when current workflow semantics allow it.

Do not allow direct status mutation that bypasses formal workflow rules.
