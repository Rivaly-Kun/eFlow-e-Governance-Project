# eFlow Web

eFlow is a role-based local-government work-management application built with React, TypeScript, Vite, Supabase, and a JWT-protected FastAPI control gateway. It combines governed task and project workflows with a separately hosted local DeepSeek node.

## Current capabilities

- Role-specific workspaces for Super Admin, Department Head, Employee, Team Leader, Executive, Legislative, HRMO, Finance, and Settings users.
- Project and milestone workspaces with members, task rollups, archive/restore behavior, filtering, and schedule-health calculation.
- Complete reviewed-task lifecycle: assignment, dependencies, progress, delegated subtasks, evidence submission, versioned review attempts, changes requested, approval, completion, reopening, cancellation, reminders, notifications, and audit history.
- Primary and backup reviewers, prevention of self-review, immutable submission evidence, and server-generated approval audit hashes.
- Recurring task templates, reminder/escalation generation, reports, announcements, chat/calls, permissions, organization management, and data-health checks.
- Proposal PDF decomposition through `deepseek-r1:8b`, including queued execution, employee recommendations, task/subtask generation, and structured draft review before commit. Proposal decomposition is AI-required: an unavailable or malformed AI response produces a visible error and never fabricates a local fallback proposal.
- Automatic Cloudflare Quick Tunnel discovery through Supabase `system_config`, so deployed clients receive rotated AI gateway URLs without a rebuild or manual Admin entry.
- A shared FIFO AI queue: concurrent users receive queue positions while the local node processes one DeepSeek job at a time.
- Privileged Admin user creation through the authenticated gateway, including unique placeholder employee IDs, recovery of incomplete Auth/profile creation, and cleanup after partial failures.

## Development

Install dependencies and start eFlow:

```powershell
npm install
npm run dev
```

`npm run dev` starts only the eFlow repository's two development processes:

- the control gateway on `127.0.0.1:8322`;
- the Vite frontend, normally on `5173` or the next available port.

The gateway launcher creates `server/.venv`, installs `server/requirements.txt` when needed, and replaces a verified stale eFlow gateway so backend code changes are not served by an older process. You no longer need to run `python server/main.py` separately.

Focused commands remain available for diagnosis:

```powershell
npm run dev:gateway
npm run dev:frontend
```

### Running eFlow with the AI server

The two repositories remain separate. Start each from its own terminal:

```powershell
# Terminal 1 — eFlow frontend and eFlow gateway
Set-Location "C:\Users\gabri\OneDrive\Desktop\EflowWeb"
npm run dev

# Terminal 2 — private AI API, AI dashboard, and automatic tunnel publisher
Set-Location "C:\Users\gabri\OneDrive\Desktop\Ollama reactjs LLM DeepSeek Integration"
npm run dev
```

If the AI-side processes become duplicated or stuck, use its clean restart command:

```powershell
npm run restart
```

That command stops and replaces only the Ollama/AI repository's API, dashboard, queue worker, tunnel supervisor, and matching Quick Tunnel. It does not launch or stop eFlow.

| Service | Address | Responsibility |
|---|---|---|
| eFlow web | `http://localhost:5173` (or next free port) | Role workspaces and normal application UI |
| eFlow gateway | `http://127.0.0.1:8322` | Supabase JWT validation, Admin APIs, notification delivery, and AI proxy |
| Private AI API | `http://127.0.0.1:8321` | Model loading, inference, and FIFO jobs |
| AI dashboard | `http://localhost:5175` | Local AI administration and logs |
| Quick Tunnel | Rotating `https://*.trycloudflare.com` | Remote authenticated access to the eFlow gateway |

Normal eFlow work continues when the AI node is offline. Only AI-backed actions report the outage. The gateway and Cloudflare endpoint remain available for Admin and other control routes while the supervised AI process restarts.

Keep SMTP and service credentials in local environment files. Never expose a Supabase service-role key through a `VITE_` variable.

## Verification

```powershell
npm run check
npm test
npm run build
npm run verify:client-secrets
```

After applying the task-flow migrations to the target Supabase project, verify the live API schema with `npm run verify:live-schema`.

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
- `guided-tours`: accessible role-aware onboarding with first-login prompts, page walkthroughs, smooth spotlight highlighting, keyboard navigation, automatic scrolling, replay controls, optional natural English AI voice narration, and versioned per-user resume and voice preferences.
- `tasks`: task contracts, mapping, realtime subscriptions, focused mutation/review/activity/archive services, recurring-task scheduling, maintenance, and decomposed list/Kanban/hierarchy/timeline boards with controller hooks and a consistent overflow-management menu.
- `work-templates`: the Projects-owned template workspace for recurring whole-task schedules and reusable subtask checklists, including personal/department sharing, leadership approval, editable assignment previews, and guarded merge-or-replace application.
- `reviews`: reviewer authorization, review services, immutable submission history, inbox, and decision components.
- `subtasks`: permission-aware subtask services and task checklist UI.
- `ai`: Supabase-authenticated AI gateway client, dynamic Quick Tunnel endpoint discovery, AI-only runtime gating, FIFO job submission/polling, queue-position updates, model configuration, and common response handling.
- `team-management`: the shared Department Head operations model for live task/subtask workload, attention signals, review quality, delivery health, skill coverage, safe lead/member reassignment, and AI-compatible employee coaching inputs. The persisted AI assignment fields remain `strengths`, `weaknesses`, `notes`, and `tags`; the clearer “Development areas” label still writes to `weaknesses` for compatibility.
- `reports`: the Department Head report library for department operations, projects, full team/subtask contributions, review attempts, evidence, risks, and lifecycle history; exact-row CSV/PDF export; and an optional queue-aware DeepSeek management brief using only visible permission-scoped rows. The legacy shared Super Admin report workspace remains intact.
- `projects`, `employees`, `announcements`: active workflow workspaces with project query/mutation/member/milestone operations, the manual/AI work-plan entry points and Projects-owned template library, PDS parser stages, employee core-work pages, and announcement inbox controllers kept in focused modules.
- `proposal-import`: PDF extraction, AI-required per-part/whole-document DeepSeek decomposition, hierarchy validation/repair of the same AI response, employee-scope selection, draft model, queue-aware controller hook, assignment UI, import cockpit, and a separate project/task commit operation. It contains no silent non-AI proposal fallback.
- `role-department-head`, `role-executive`, `role-finance`, `role-hrmo`, `role-legislative`: role registries and focused page components, including committee, session, councilor, portfolio, finance, audit, and project-health submodules.
- `chat-calls`: chat/call public API plus separate controller, channel-list, active-chat, reaction, and message-codec modules.
- `administration`, `organization`, `permissions`, `audit`, `settings`: administrative boundaries, including componentized user management and organization-tree tooling.

Generated design imports and reusable UI primitive collections can remain physically long when they already consist of small independent functions; application page controllers and service workflows should not.

See [task-management-flow.md](docs/task-management-flow.md) for the end-to-end workflow, [feature-inventory.md](docs/feature-inventory.md) for the compatibility baseline, and [ai-quick-tunnel.md](docs/ai-quick-tunnel.md) for secure remote AI testing. Database setup and migration order are documented in [supabase/README.md](supabase/README.md).
