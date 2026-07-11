# eFlow — Master Phase Roadmap
*Last updated: after Phase 9 + AI Recommendation Pipeline Fix, going into Phase 10*

---

## ✅ Done

**Phase 1 — Foundation**
Supabase schema, ltree-based org tree builder (drag-and-drop, right-click to add nodes), Super Admin panel, user management.

**Phase 2 — Auth & RBAC**
Firebase Auth → Supabase Auth. Roles simplified to `super_admin` / `dept_head` / `team_leader` / `employee`. User creation routed through FastAPI so the service role key never touches the browser.

**Phase 3 — Data Layer Migration**
Every Firebase service — tasks, employees, notifications, notes, workflow — rewritten onto Supabase with realtime subscriptions, keeping every function signature identical so nothing downstream broke.

**Phase 4 — DeptHead Board + Subtask Layer**
ProposalImport/MondayBoard wired to real Supabase tasks. Added the `subtasks` table with AI-extracted checklists pulled from the PDF's own methodology text, falling back to keyword templates when there's nothing to extract.

**Phase 5 — Employee Panel**
Fixed a real Phase 3 gap — submitted attachments were silently vanishing instead of uploading. Built Profile & Account from scratch, including a Postgres trigger guarding against self-privilege escalation via the profile-edit RLS policy.

**Phase 6 — Team Leader Panel + Org Hierarchy Scoping**
Fixed the org_id gap — tasks were scoped by a coincidental string match on a free-text field, not real hierarchy. Also caught and fixed a live bug where team leads landed on the Super Admin dashboard instead of a real panel, due to missing registry entries in the sidebar shell.

**Phase 7 — Email Notifications**
Redirected from FCM push to Gmail SMTP — no domain dependency, works immediately for real recipients. In-app bell untouched, still what James's mobile app reads from. Sending logic isolated in one swappable function for an easy future move to Resend once a real domain exists.

**Phase 8 — Task Group Chat**
Auto-generated GC per task. Membership synced via a Postgres trigger on assignment changes, so it can't drift regardless of which code path reassigns someone. Reserved `'direct'` channel type in the schema for future 1-on-1 use.

**Phase 9 — Standing Dept/Team Channels + Rich Submission Editor**
Hierarchy-derived standing channels — no membership table, computed live from the org tree via ltree ancestor checks. ELMS-style rich text + simple table editor replacing the plain textarea for task submissions.

**Patch (unnumbered) — AI Recommendation Pipeline Fix**
Found and fixed: a deterministic local scorer was silently overwriting every real LLM recommendation with no guard clause; the LLM was being asked to decompose all 8 proposal parts in one call and only ever managing 1-2 before the pipeline fell back to the local scorer; three employee profiles had byte-identical skill sets, making meaningful differentiation impossible; a regex bug (`[^\n]` instead of `[\s\S]`) was silently dropping Part 3 of any multi-part proposal from extraction entirely.

---

## ⬜ Next

**Phase 10 — Voice/Video Calling**
1-on-1 WebRTC calls, signaling via Supabase Realtime broadcast (no new server infrastructure needed for that part), reuses the `'direct'` channel type reserved since Phase 8. Needs a TURN server for reliable connection behind restrictive office networks. Group calling explicitly deferred — would need a fundamentally different architecture (SFU server), out of scope for now.

---

## ⬜ Planned

**Phase 11 — PyGAD + Process Mining**
The HRMO panel's genetic algorithm UI and the process-mining bottleneck view already exist visually — this phase wires them to real FastAPI endpoints doing actual workload optimization and workflow analysis against real Supabase data.

**Phase 12 — Blockchain Audit Trail**
Hash-chained action log in Supabase as the real tamper-evidence mechanism, with a daily Merkle root pushed to Polygon for permanent, independently-verifiable proof. Audit UI already built, needs real data flowing into it.

**Phase 13 — Analytics & Reporting**
Finance and Executive dashboards already have chart components built — this phase wires them to real Supabase aggregation queries and adds PDF export for the reports LEDIPO actually needs to hand upward.

**Phase 14 — Cloudflare Production Deployment**
The dev-stage ngrok tunnel already works today for demos. This phase is the real thing: LEDIPO-sponsored domain, genuine Cloudflare Tunnel, Zero Trust access rules restricting to office IPs, and the FastAPI server running as a proper background service instead of a terminal window that has to stay open.

**Phase 15 — QA, UAT & Defense Prep**
Full role-by-role test pass across every panel, a real walkthrough with actual LEDIPO staff, the scripted OCEDSIPP demo for the capstone panel, James's mobile sync checklist, and the supporting documentation the defense itself needs.

---

## Running in parallel, not a numbered phase

James's mobile build — reads directly off the same Supabase `notifications`/`tasks`/`chat_messages` tables already in place. No separate backend work required on the web side for this; it's a client, not a new system.