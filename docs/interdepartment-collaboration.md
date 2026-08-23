# Inter-Department Collaboration

AI PDF import and the manual work-plan builder now feed one governed proposal engine. Working drafts autosave to Supabase and survive a closed browser; they do not directly create operational projects or assign employees. Autosave updates the mutable working copy, while requesting review finalizes that copy as a new immutable revision.

## Workflow

```text
AI PDF or manual plan
  → persistent collaboration draft
  → owner confirms participant and governance organizations
  → mixed-team and responsibility proposal
  → organization staffing review, discussion, and formal changes
  → immutable revision approvals from every organization
  → readiness gate
  → atomic operational commit
  → projects, milestones, tasks, mixed members, and Board review routing
  → all operational tasks approved
  → owner requests final closeout when governance is required
  → governance organizations verify final deliverables
  → atomic proposal completion
  → atomic archive removes linked tasks from active Task Boards
```

The UI deliberately distinguishes proposed staffing from assigned staffing. Editing structure, responsibility, schedule, or people publishes a new revision; approvals on older revisions remain auditable but no longer satisfy readiness. Comments do not create revisions. Open formal change requests block commit.

## Authority boundaries

- The owning Head or Assistant Head controls proposal structure, organization scope, and commit.
- A receiving Head or Assistant Head can inspect the full proposal and private source PDF, then approve, decline, request a formal change, or revise only their own organization's proposed staffing.
- Board and Committee approvers use secondary memberships, so their normal home organization is unchanged.
- Super Admin retains read-only oversight and cannot approve, alter staffing, or commit operational work.
- Raw cross-department employee notes stay server-side. The browser receives only bounded recommendation scores, reasons, workload signals, roles, and record identifiers.
- Operational collaboration visibility and mutation authority use separate database predicates. Seeing a shared project does not grant permission to edit it.

## Governance routing and named people

Each task or activity has one explicit route:

- **Department approval** — the responsible organization uses its normal Head/Assistant review route.
- **Governance approval required** — the owner selects the specific participating Board or Committee that reviews that task.
- **Governance at final closeout** — routine task approval stays with the department; the Board verifies the combined final delivery.

Proposal governance adds named primary approvers, backups, liaisons, technical reviewers, observers, and temporary delegates without replacing organization authority. Approval policies can require one authorized signer, all primary signers, or a quorum. Approval stages are parallel when they share a sequence number and sequential when a later organization has a higher stage number.

Consulted and observer organizations can read, discuss, and follow the proposal without blocking publication. Required participant and required governance organizations remain part of the commit gate.

Conflicted decision makers can formally recuse and optionally delegate to another active member. A new proposal revision reopens decisions; an organization that approved the current revision is locked from deciding twice.

## Completion and archive

Single-organization proposals use the same delivery lifecycle as collaborative proposals. After all tasks are approved, the owner completes all linked projects in one database transaction. Archive then updates the proposal, every linked project, and every linked task in one transaction. Archived proposal tasks disappear from active Task Boards while evidence, submissions, audit hashes, approvals, and governance history remain available from the archived proposal record.

Governed proposals add a final closeout gate:

```text
all tasks approved
  → owner requests closeout
  → every required governance organization decides
  → owner completes proposal delivery
  → archive becomes available
```

The Governance workspace also records resolution numbers, meeting dates, signed minutes, endorsements, revision decisions, task submissions, and closeout decisions in one timeline. Its decision packet is print-ready and includes the approved revision, signatories, formal records, evidence index, and task audit hashes.

## Deployment

Apply these migrations in order:

1. `20260821000000_collaboration_organizations.sql`
2. `20260821000001_collaboration_drafts.sql`
3. `20260821000002_collaboration_security.sql`
4. `20260821000003_collaboration_runtime.sql`
5. `20260821000004_collaboration_commit.sql`
6. `20260821000005_collaboration_owner_auto_accept.sql`
7. `20260821000006_task_team_removal_guard.sql`
8. `20260822000000_fix_task_team_assignment_array_types.sql`
9. `20260822000001_scope_organization_leadership_to_direct_members.sql`
10. `20260822000002_governance_delivery_lifecycle.sql`
11. `20260822000003_governance_approval_routing.sql`
12. `20260822000004_task_governance_routes_and_storage.sql`
13. `20260822000005_advisory_collaboration_autosave.sql`
14. `20260822000006_fix_interdepartment_department_review_routing.sql`
15. `20260822000007_inherit_activity_responsibility.sql`

Then restart the eFlow gateway and run:

```powershell
npm run verify:live-schema
```

The secure AI staffing route is:

```text
POST /controlpanelEflow/api/collaboration/drafts/{draftId}/recommend-assignments
```

It requires the caller's Supabase JWT and uses the gateway's service credential only on the server.

## Required live acceptance fixture

Use an owner organization (LEDIPO), two staffing participants (CPDO and BPLO), a consulted office, an observer, and at least two governance Boards with named primary and backup approvers. Verify staffing revisions, advisory non-blocking access, quorum and sequential decisions, recusal/delegation, per-task Board routing, final closeout, one-operation completion/archive, active Task Board removal, formal minutes, and decision-packet generation.
