# eFlow to Monday Work Management plus AI roadmap

## Current assessment

eFlow is currently assessed at **55% readiness** compared with monday Work Management plus its AI capabilities. The target is a governance-first work-management platform for local government, not a clone of monday CRM, Dev, or Service.

| Capability | Current maturity |
|---|---:|
| Task lifecycle, subtasks, reviews, boards | 80% |
| Project and milestone management | 60% |
| Collaboration, announcements, chat, calls | 68% |
| Roles, permissions, governance, audit | 78% |
| Reports and resource visibility | 55% |
| Automations and integrations | 25% |
| AI assistance | 35% |
| Mobile and platform extensibility | 20% |
| **Weighted overall readiness** | **55%** |

Existing strengths include role-specific workspaces, a reviewed task lifecycle, recurring templates, reminders, immutable evidence submissions, project workspaces, proposal decomposition, employee recommendations, reports, notifications, collaboration, permissions, organization management, and audit/data-health tooling.

Important gaps include complete project editing and staffing, reliable operational project links on manual tasks, atomic project creation, derived project health, configurable submission requirements, server-scheduled maintenance, automations, integrations, custom fields, saved views, workload/portfolio planning, a unified permission-aware copilot, mobile readiness, authenticated browser coverage, and live migration verification.

## Phase 0 - Secure and verifiable AI foundation

Phase 0 establishes the safe deployment boundary required before friends or evaluators use the AI features.

### Implemented locally

- The raw DeepSeek server binds only to `127.0.0.1:8321`.
- A modular FastAPI gateway binds to `127.0.0.1:8322` and is the only Cloudflare tunnel target.
- The gateway verifies the caller's Supabase session and active eFlow profile.
- The browser sends its Supabase access token and never receives the internal AI key or service-role key.
- The AI repository's `start.py` supervises the private model process and an automatic Quick Tunnel publisher; the eFlow gateway remains a separate process.
- The publisher detects every rotating hostname, publishes the endpoint/status/message to `system_config`, and restarts failed tunnels with backoff.
- React receives endpoint/status changes through Supabase Realtime with polling fallback, discovers the current endpoint before AI work, and never requires admin URL entry.
- DeepSeek work uses a single-worker FIFO queue with user-scoped job status, position, automatic next-job execution, one-hour result retention, and idempotent submissions.
- Proposal decomposition displays queued and processing states instead of treating model contention as an error.
- A production bundle secret check is available through `npm run verify:client-secrets`.

### Required live gates

- [ ] Create a replacement Supabase `sb_secret_...` key and update both local Python services.
- [ ] Remove the obsolete `VITE_SUPABASE_SERVICE_ROLE_KEY` setting everywhere, including hosting configuration.
- [ ] Rebuild and pass `npm run verify:client-secrets`.
- [ ] Apply and verify migrations `20260807000000_task_review_hardening.sql`, `20260807000001_task_planning_enhancements.sql`, and `20260807000002_recurring_tasks_and_reminders.sql` in the target Supabase project.
- [ ] Apply `20260807000003_ai_runtime_realtime.sql` so endpoint rotations reach clients immediately through Realtime.
- [ ] Start the AI server, gateway, and Quick Tunnel publisher using the replacement key.
- [ ] Deploy the frontend with only browser-safe Supabase variables.
- [ ] Configure dedicated non-production accounts and run authenticated role navigation smoke tests.
- [ ] Run an end-to-end two-user queue test through the deployed frontend.
- [ ] Disable the compromised legacy service-role key only after every private service has moved to the replacement.

Phase 0 is accepted only when every live gate is checked. Local code completion alone is not a production-completion claim.

## Phase 1 - Finish the core project and task flow

- Add project editing, member-role management, milestone editing, and ownership controls.
- Add operational project and milestone selectors to task creation and editing.
- Make project creation atomic through a database RPC.
- Derive project progress and schedule health from linked work.
- Add configurable submission readiness rules for dependencies, acceptance criteria, evidence, and subtasks.
- Add dependency-cycle validation, blocked explanations, and repair actions.
- Move reminder and recurring-template processing to a scheduled server job.

## Phase 2 - Flexible work management

- Add typed task/project custom fields.
- Add saved, role-aware views with filters, sorting, grouping, and column selection.
- Add project, task, milestone, and workflow templates.
- Add authenticated intake forms that create drafts for approval.
- Add calendar, timeline, workload, dependency, and portfolio views.
- Add audited bulk operations and import/export.

## Phase 3 - Governed automations and integrations

- Add triggers, conditions, allowlisted actions, execution logs, retries, and failure visibility.
- Support task/review/deadline/dependency/schedule triggers.
- Support notifications, assignments, status updates, task creation, review requests, reminders, and webhooks.
- Execute scheduled work through server-side jobs rather than browser lifecycle hooks.
- Add secure outbound webhooks and initial email/calendar integrations.
- Enforce user scope, RLS, permissions, and audit rules for every execution.

## Phase 4 - Human-approved AI copilot

- Create a provider-neutral, backend-only AI layer.
- Generate draft projects, milestones, tasks, subtasks, dependencies, acceptance criteria, and definitions of done.
- Summarize health, blockers, queues, workload, and department performance.
- Recommend assignees using skills, scope, availability, workload, and assignment history.
- Detect schedule, evidence, description, dependency, and capacity risks.
- Draft updates, briefs, review feedback, meeting summaries, and reports.
- Add permission-filtered natural-language search with source records and confidence.
- Store material AI changes as structured proposals requiring explicit human approval.

## Phase 5 - Portfolio and resource intelligence

- Add programs and portfolios with schedule, budget, progress, risk, and ownership rollups.
- Add cross-project dependencies, critical-path indicators, and executive health summaries.
- Add capacity calendars, planned effort, availability, utilization, and conflict warnings.
- Connect finance information without changing finance workflow ownership.
- Add human-approved scenario planning and AI corrective-plan suggestions.

## Phase 6 - Product readiness

- Add responsive/PWA workflows for updates, evidence, notifications, reviews, and approvals.
- Add keyboard accessibility and consistent loading, empty, and error states.
- Add offline-safe drafts where appropriate.
- Document the API, webhooks, and integration surface.
- Add telemetry for jobs, automation latency, AI usage, approvals, and recurring tasks.
- Keep the feature inventory, module map, and readiness score synchronized with tested delivery.

## Compatibility and acceptance rules

- Existing task, project, review, Supabase, backend, sidebar, role-routing, and service interfaces remain compatibility contracts.
- AI receives only role-filtered context and returns schema-validated proposals.
- AI and automation actions call domain services rather than writing from UI components.
- Database migrations are additive and reversible.
- Every slice must pass TypeScript checks, unit tests, affected Playwright tests, the production build, and client-secret verification.
- Target readiness is approximately 70% after core completion, 80% after flexible work management and automation, and 90% after the copilot and portfolio/resource phases.
