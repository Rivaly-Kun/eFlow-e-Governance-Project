# Phase 08 — Legacy UI Purge & Final System QA

## Goal

Complete the instruction to remove the old design system after all active workspaces have been migrated.

## 1. Import audit

Search for remaining imports/usages of:

- `@radix-ui/*`
- `@mui/material`
- `@mui/icons-material`
- `@emotion/*`
- `@carbon/icons-react`
- `lucide-react`
- old shadcn-like `src/app/components/ui/*`
- old custom Modal/Button/Badge/DataTable equivalents
- generated Figma design components
- `default_theme.css`
- legacy generic theme variables
- hardcoded Lexend classes
- old workflow presentation primitives

Classify every remaining consumer.

## 2. Remove old presentation

Delete old components only when:
- no consumers remain
- Vibe replacement is verified
- relevant tests pass

## 3. Dependency cleanup

Remove UI dependencies from package.json only after zero import consumers are proven.

Keep non-UI libraries still required by product behavior.

Tailwind may remain only if it still materially helps layout/responsive implementation.

It should no longer function as a separate visual design system.

## 4. CSS cleanup

Remove:
- default shadcn theme
- compatibility theme overrides
- unused old CSS variables
- duplicate design tokens
- orphaned CSS

Keep:
- minimal application reset
- Vibe tokens
- eFlow ThemeProvider/product-theme integration
- necessary layout/responsive CSS
- domain-specific visual rules not supplied by Vibe

## 5. Icon cleanup

Prefer Vibe icons across the product.

Remove Carbon/Lucide/MUI icon packages if no consumers remain.

## 6. Full UX consistency audit

Check every active role and workspace.

## 7. Full behavior regression

Run all repository verification commands, including frontend, server, schema, and configured e2e checks.

## 8. Final visual review

No screen should visibly fall back to the old design language.

## Final output

Produce:
- deleted legacy UI inventory
- remaining intentional non-Vibe components
- dependency reduction report
- screenshot set
- test/build results
- accessibility audit
- known limitations

Then freeze the overhaul.
