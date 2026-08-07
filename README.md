# eFlow Web

eFlow is a role-based local-government workflow application built with React, TypeScript, Vite, Supabase, and a FastAPI companion server.

## Development

Install dependencies and run the frontend:

```powershell
npm install
npm run dev
```

Run the backend separately when proposal decomposition, administrative APIs, or mail delivery are needed:

```powershell
python server/main.py
```

Keep SMTP and service credentials in local environment files. Never expose a Supabase service-role key through a `VITE_` variable.

## Verification

```powershell
npm run check
npm test
npm run build
```

Authenticated browser smoke tests require dedicated non-production accounts:

```powershell
$env:EFLOW_E2E = "1"
$env:EFLOW_E2E_ACCOUNTS = '[{"role":"superadmin","email":"...","password":"..."}]'
npm run test:e2e
```

## Module map

Feature-owned application code lives under `src/app/features/`. Each feature exposes a deliberately small `index.ts`; files under old component paths are temporary compatibility bridges only.

- `app-shell`: providers, authentication gate, loading state, role resolution, and development quick-login handling.
- `navigation`: declarative role sections, default destinations, sidebar state, lazy role-content loading, and role dispatch.
- `tasks`: task contracts, mapping, realtime subscriptions, focused mutation/review/activity/archive services, recurring templates, maintenance, and decomposed list/Kanban/hierarchy/timeline boards with controller hooks.
- `reviews`: reviewer authorization, review services, immutable submission history, inbox, and decision components.
- `subtasks`: permission-aware subtask services and task checklist UI.
- `projects`, `reports`, `employees`, `announcements`: active workflow workspaces with project query/mutation/member/milestone operations, PDS parser stages, employee core-work pages, and announcement inbox controllers kept in focused modules.
- `proposal-import`: PDF extraction, employee-scope selection, draft model, controller hook, assignment UI, import cockpit, and a separate project/task commit operation.
- `role-department-head`, `role-executive`, `role-finance`, `role-hrmo`, `role-legislative`: role registries and focused page components, including committee, session, councilor, portfolio, finance, audit, and project-health submodules.
- `chat-calls`: chat/call public API plus separate controller, channel-list, active-chat, reaction, and message-codec modules.
- `administration`, `organization`, `permissions`, `audit`, `settings`: administrative boundaries, including componentized user management and organization-tree tooling.

Generated design imports and reusable UI primitive collections can remain physically long when they already consist of small independent functions; application page controllers and service workflows should not.

See [task-management-flow.md](docs/task-management-flow.md) for the end-to-end workflow and [feature-inventory.md](docs/feature-inventory.md) for the compatibility baseline. Database setup and migration order are documented in [supabase/README.md](supabase/README.md).
