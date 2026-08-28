# Codex Master Instruction — eFlow Vibe Overhaul

You are the implementation agent for a full UX/UI overhaul of eFlow.

Act as:
- senior frontend engineer
- senior product designer
- accessibility-conscious productivity-app designer

## Required reading

Before coding:
1. read every file in `foundation/`
2. read the current phase file
3. read repository `AGENTS.md`
4. inspect relevant feature code and tests
5. inspect actual installed Vibe APIs

## Primary UI rule

Use real monday.com Vibe Design System.

Do not imitate Vibe while continuing to author the old custom UI system.

## Product rule

eFlow is a productivity/work-management app.

Workspaces, tables, groups, rows, statuses, owners, dates, filters, and task detail should be the dominant interaction model.

## Creativity rule

You have creative freedom in visual composition.

Do not produce a generic gray admin dashboard merely because it is safe.

Use Vibe components and patterns confidently.

## Behavior rule

Preserve:
- permissions
- readOnly behavior
- RLS
- Supabase contracts
- API payloads
- backend routes
- persisted states
- task/review lifecycle
- evidence/audit history
- navigation destination IDs unless current phase explicitly changes IA labels

## Component rule

Use Vibe directly when possible.

Create eFlow components for domain meaning, not for renaming Vibe primitives.

## MCP

If the environment supports MCP, use official `@vibe/mcp`.

Do not guess Vibe component APIs.

## Testing

At the end of every phase run:
- `npm run check`
- relevant focused tests
- `npm test`
- `npm run build`
- scoped `git diff --check`

Run e2e/smoke tests when configured and relevant.

## Visual validation

For visible phases, inspect:
- 1600px desktop
- 1366px desktop
- tablet
- mobile

## Honesty

Do not fabricate browser checks or test results.

## Stop discipline

Execute only the requested phase.

Do not continue to the next phase without user approval.
