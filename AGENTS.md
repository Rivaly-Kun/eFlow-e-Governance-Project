# eFlow contribution rules

## Preserve behaviour

- This repository is in a no-feature-loss modularisation program. Treat current screens, sidebar destinations, role visibility, permissions, Supabase calls, backend routes, and user workflows as compatibility contracts.
- Do not change database schemas, RLS policies, Python endpoints, API payloads, or public service return values as part of a structural refactor.
- Before changing a feature, identify its navigation entry and existing callers. Keep visible behaviour and access rules unchanged; redesign work must be a separate, explicitly requested change.

## Module boundaries

- Organise new application work by feature under src/app/features/<feature>/. A feature may contain components/, hooks/, services/, types.ts, constants.ts, and a deliberately small index.ts public API.
- Keep reusable, domain-neutral controls in src/app/components/ui/; place cross-feature utilities and client adapters in src/app/shared/.
- Keep components, hooks, constants, and service operations focused. Extract code before a file becomes difficult to navigate; do not create new large page-controller files or duplicate business rules in screens.
- Import another feature only through that feature's public index.ts. Keep temporary compatibility re-exports only while callers are migrated.

## Refactor workflow

- Work in small vertical slices that build and test independently. Do not mix unrelated feature moves in one change.
- Add or update a regression test when extracting pure logic, navigation, or a user interaction. Run npm run check, npm test, and npm run build before declaring a slice complete; run the affected Playwright smoke test when the test environment is configured.
- Delete legacy files or compatibility exports only after repository search proves they have no remaining consumers.
