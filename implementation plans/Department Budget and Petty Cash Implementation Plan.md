# eFlow Department Budget and Petty Cash Implementation Plan

## Implementation status — 25 August 2026

The repository implementation is complete through Phase 7. Task-owned proposal budgets, atomic publication commitments, automatic task allocations, guarded subtask funding, staged petty-cash review, daily-cap release scheduling, receipt liquidation, exact-record notifications, the redesigned fiscal workspace, audited adjustments/closeout, Q4 and aging signals, and CSV/print reporting are implemented. Phase 8 compatibility cleanup remains intentionally conservative: legacy public fields are retained while existing callers still consume them.

The code is not considered deployed until migrations `20260824000007`, `20260824000008`, and `20260825000001` have been applied to the target Supabase project and `npm run verify:live-schema` succeeds against that project.

## Purpose

Replace the disconnected proposal-budget form and the incorrect annual petty-cash pool with one department-only fiscal workflow that connects:

`Annual Department Budget -> Proposal -> Task -> Subtask -> Petty Cash -> Receipts -> Actual Expense`

This plan covers the Department Budget redesign, the fiscal-year control, PDF-style task budgets, proposal publication, task and subtask allocations, employee and Team Leader petty-cash requests, two-stage approval, the department's configurable daily release cap, liquidation, notifications, reporting, and audit history.

Inter-department fund sharing and budget transfers are deliberately out of scope for this slice. A collaborative proposal may still use the owner department's budget, but the cross-department fiscal model will be designed separately.

## Confirmed business rules

1. The Department Head prepares the department's annual appropriation and locks it for a fiscal year.
2. A locked annual appropriation cannot be silently edited. Corrections require an audited adjustment.
3. Draft proposals may remain unfunded, but publication requires sufficient available department funding.
4. Proposal money is authored at task level using the OCEDSIPP structure: expense class, category, multiple particulars, quantities, unit costs, amounts, and subtotals.
5. Every task must be explicitly marked `Budget assigned` or `No cost required` before publication.
6. Publication reserves the proposal total once and creates the approved operational task allocations. Petty cash must not deduct the annual appropriation a second time.
7. Team Leaders distribute an approved task allocation to funded subtasks. This is an immediate delegation inside an already approved task budget, not a second department approval; allocations cannot exceed the task balance or overlap with parent-task petty cash.
8. Employees assigned to a subtask may request petty cash against that subtask's approved allocation.
9. Team Leaders may request petty cash for their own assigned subtask, on behalf of an assigned contributor, or for a valid task-level cost.
10. An employee request follows `Employee -> Team Leader -> Head/Assistant Head`.
11. A Team Leader's own request skips self-review and goes directly to the appropriate Head or Assistant Head.
12. Nobody may approve their own allocation, petty-cash request, release, or liquidation.
13. Petty cash has no annual petty-cash pool ceiling. The department instead has a configurable daily release cap, defaulting to PHP 30,000 per calendar day.
14. Requests and approvals may continue after the daily cap is reached. The unreleased amount is scheduled for the next available release date instead of being rejected as "out of petty cash."
15. The previously discussed PHP 5,000 receipt threshold becomes a configurable per-receipt control, not a yearly pool and not a universal hard-coded request ceiling.
16. Receipt totals plus returned cash must equal released cash before settlement.
17. A funded subtask cannot receive final approval while cash is unliquidated, receipts require correction, or a cash difference remains unexplained.
18. Actual spending is posted only after liquidation approval. Returned cash restores the relevant task or subtask balance.
19. Department-to-department budget transfers are not supported in this phase.
20. The dashboard must show Q4 underutilization against the department's configurable target, defaulting to 75 percent.

## Current implementation problems to correct

- `ProposalBudgetEditor` is displayed above the manual work hierarchy and stores proposal-wide lines with no task key.
- `ProposalBudgetDraft` cannot identify which task owns a category or particular.
- Operational task allocations are created manually after publication instead of being produced from the approved proposal task budgets.
- The annual budget currently stores `petty_cash_limit` as if PHP 30,000 were a yearly pool.
- `department_budget_summary` subtracts all reserved and settled petty cash from that yearly PHP 30,000 value.
- `create_petty_cash_request` enforces a PHP 5,000 maximum request rather than applying a configurable receipt policy.
- A petty-cash request currently goes directly to a Head or Assistant Head and has no Team Leader decision stage.
- Liquidation currently goes directly from requester to department approver and has no Team Leader verification stage.
- The request status model cannot represent leader review, department review, release scheduling, partial release, released cash, or overdue liquidation.
- Current RLS lets the requester and department approvers read request records but does not guarantee the responsible Team Leader can review an employee's request.
- The fiscal-year selector is a native dropdown generated from `[selected year - 1, selected year, selected year + 1]`. Its options shift when a year is chosen and it does not communicate current, draft, locked, or closed fiscal years.
- The current overview incorrectly labels PHP 30,000 as `Petty cash available` and describes it as an annual department limit.
- The Department Budget page does not show the proposal-to-task-to-subtask funding hierarchy needed to explain where money is committed and spent.

## Target fiscal data model

All database changes must be additive migrations with compatibility adapters for the existing public TypeScript service shapes until all callers are migrated.

### Annual fiscal policy

Extend the annual fiscal-budget contract with:

- `daily_petty_cash_release_limit`, default PHP 30,000.
- `per_receipt_limit`, default PHP 5,000.
- `liquidation_due_days`.
- `allow_receipt_limit_override`.
- `underutilization_threshold`.
- Existing `petty_cash_limit` and `petty_cash_request_limit` remain temporarily readable through compatibility mapping, but stop driving annual-pool behavior.

Add an audited annual-budget adjustment operation for corrections after locking. It must store the before amount, after amount, reason, actor, timestamp, and supporting attachment when required.

### Task-linked proposal budget

Extend each proposal budget particular with:

- Stable draft task key.
- Expense class.
- Category.
- Particular.
- Quantity.
- Unit label.
- Unit cost.
- Calculated or explicitly entered amount.
- Position.
- Funding organization, fixed to the owner department in this phase.

Extend every draft task with a budget decision:

- `funded` with one or more particulars; or
- `no_cost` with an optional explanation.

Create immutable operational budget-line records at publication so the approved proposal revision can always be reconstructed even when a later revision changes the draft.

### Task and subtask allocations

Keep `work_budget_allocations` as the public allocation boundary, but automatically create the task-level approved allocation during proposal publication. Add child allocation-line records so the operational task retains its approved categories and particulars.

Subtask allocations reference the parent task allocation and, when applicable, its budget category or particular. Database validation must prevent:

- Task allocations exceeding the proposal commitment.
- Subtask allocations exceeding the task allocation.
- Duplicate active allocations.
- Reducing or removing money already reserved, released, or spent.
- Allocations to a task or subtask outside the commitment.

### Petty-cash approvals and releases

Replace the single decision with immutable staged decisions:

1. Team Leader operational review.
2. Head or Assistant Head financial approval.
3. Cash release scheduling and release entries.
4. Team Leader liquidation verification.
5. Head or Assistant Head final settlement.

Add release records instead of treating approval as cash release. Release records contain amount, scheduled date, released date, releaser, recipient, and acknowledgement. Multiple releases may satisfy one request when the daily cap requires the amount to be split across days.

The database must lock the relevant department/date rows when scheduling or releasing cash so concurrent approvals cannot exceed the daily cap.

### Petty-cash state model

Use explicit states:

- `draft`
- `pending_leader_review`
- `leader_changes_requested`
- `pending_department_approval`
- `department_changes_requested`
- `rejected`
- `approved`
- `scheduled_for_release`
- `partially_released`
- `released`
- `liquidation_draft`
- `pending_leader_liquidation_review`
- `liquidation_changes_requested`
- `pending_department_settlement`
- `settled`
- `cancelled`
- `overdue_liquidation`

Compatibility mapping may continue returning the existing broad statuses until all old consumers are migrated.

## Proposal builder redesign

### Remove the floating budget editor

Remove the standalone editable budget table from above the manual hierarchy. Budget authoring moves into each `DraftTaskRow`.

Each task row displays:

- Task name, description, schedule, Team Leader, and members.
- `Budget assigned`, `No cost`, or `Budget missing` state.
- Task total.
- `Manage task budget` action.

### Task budget drawer

`Manage task budget` opens a focused drawer with:

- Fixed fund source: `<Department Name> Department Budget`.
- Expense-class selector.
- Nested category cards.
- Multiple particulars per category.
- Particular, quantity, unit, unit cost, and calculated amount.
- Category subtotal and task total.
- `No cost required` option with a reason.
- Remaining annual funding preview.
- Autosave state.

The UI must follow the PDF's visual logic without reproducing a cramped document table. Category cards remain readable on normal laptops and collapse on smaller screens.

### Proposal funding summary

The proposal Budget tab becomes a generated review surface, not a disconnected editor. It groups totals by:

- Program.
- Project.
- Activity.
- Task.
- Expense class.
- Category.
- Particular.

It shows proposal total, department appropriation, already committed amount, available amount, projected balance after publication, funded tasks, no-cost tasks, and missing budget decisions. Every task row includes `Open task budget`.

### Publication gate

Publication must atomically:

1. Validate the latest proposal revision.
2. Validate every enabled task's budget decision.
3. Validate sufficient locked annual funding.
4. Create operational projects and tasks.
5. Create one proposal commitment exactly once.
6. Create the approved task allocations and budget-line details.
7. Write ledger entries and notifications.

Retrying the same publication cannot duplicate commitments or allocations.

## Department Budget workspace redesign

### Fiscal-year control

Replace the native dropdown with a compact fiscal-year navigator in the page header:

- Previous-year arrow.
- Prominent `FY 2026` button.
- Next-year arrow.
- Status pill: `Draft`, `Locked`, `Closed`, or `Not configured`.
- `Current FY` shortcut when viewing another year.

Pressing the year button opens a polished popover listing actual configured years and one future setup option. Every year shows its status and approved amount. Selecting a year must not mutate the list of available years. The current year defaults from Asia/Manila time.

### Header

Use one command header containing:

- `Department Budget`.
- Department name.
- Selected fiscal year and status.
- Last update or lock time.
- Contextual action: `Prepare budget`, `Continue draft`, `View locked budget`, or `Close fiscal year`.

### Navigation

Replace the current crowded tab row with these domain tabs:

1. `Overview`
2. `Annual Budget`
3. `Proposal & Task Funding`
4. `Petty Cash Inbox`
5. `Releases & Liquidations`
6. `Expenses`
7. `Audit Ledger`

### Overview

Primary financial cards:

- Approved annual appropriation.
- Available for new proposals.
- Active proposal commitments.
- Actual verified spending.

Daily petty-cash control strip:

- Today's configurable limit.
- Released today.
- Remaining release capacity today.
- Scheduled for today.
- Awaiting Team Leader review.
- Awaiting department approval.
- Released cash awaiting liquidation.
- Overdue liquidations.

Additional panels:

- Annual utilization and Q4 target.
- Commitment versus actual-spending chart.
- Proposal funding health.
- Upcoming release schedule.
- Oldest outstanding cash.
- Recent audited financial activity.

Remove `Petty cash available PHP 30,000` and all language describing PHP 30,000 as an annual pool.

### Annual Budget

Show the appropriation, policy controls, status, notes, and lock history. Policy controls include daily release limit, per-receipt threshold, liquidation deadline, receipt override policy, and Q4 utilization target.

### Proposal & Task Funding

Use collapsible hierarchy cards:

`Proposal -> Task -> Subtask`

Each level shows approved, allocated, reserved, released, spent, returned, and remaining amounts. Provide filters for proposal, task leader, status, category, and attention signal.

### Petty Cash Inbox

Separate queues for:

- Awaiting Team Leader review.
- Awaiting Head/Assistant approval.
- Changes requested.
- Approved but unscheduled.

Every row shows requester, complete work hierarchy, purpose, category/particular, requested amount, available allocation, daily-cap effect, needed date, attachments, decision history, and the correct role-aware actions.

### Releases & Liquidations

Show scheduled releases, partial releases, released cash, upcoming liquidation deadlines, overdue liquidation, Team Leader receipt review, and final department settlement. Include an explicit `Mark released` operation and recipient acknowledgement.

### Expenses and ledger

Expenses group verified actuals by proposal, task, subtask, employee, expense class, category, and month. The ledger provides readable event titles, actor, hierarchy, amount, before/after balances, reason, and links to receipts or decisions instead of exposing raw identifiers as the primary UI.

## Employee and Team Leader experience

### Subtask detail

Funded subtasks always show:

- Approved allocation.
- Reserved cash.
- Released cash.
- Actual spending.
- Returned cash.
- Remaining balance.
- Budget category and particular.
- `Request petty cash` when the signed-in user is an assigned contributor or the Team Leader.

### Request form

The request inherits proposal, task, subtask, department, allocation, and requester. The user supplies purpose, category/particular, requested amount, needed date, intended recipient, and optional supporting document.

The form displays the subtask balance and the department's daily release schedule. It must explain that approval can continue even if today's PHP 30,000 release capacity is full.

### Role routing

- Assigned employee request: Team Leader review, then Head/Assistant approval.
- Ordinary Team Leader request: Head/Assistant approval.
- Department Head request: Assistant Head approval.
- Assistant Head request: Department Head approval.
- Self-approval is always blocked.

### Liquidation

The cash recipient submits receipt files, vendor, date, receipt number, description, amount, returned cash, and note. Per-receipt threshold exceptions require a reason and department approval.

An employee liquidation goes to the Team Leader first, then Head/Assistant settlement. A Team Leader's own liquidation goes directly to the eligible Head/Assistant. Settlement posts actual spending and restores returned cash.

## Notifications and deep links

Add role-aware notifications for every material transition:

- Employee request submitted to Team Leader.
- Leader approval, rejection, or changes request.
- Department approval, rejection, or changes request.
- Release scheduled, partially released, and fully released.
- Liquidation due soon and overdue.
- Receipts submitted to Team Leader.
- Leader-verified liquidation awaiting settlement.
- Settlement approved or corrections requested.
- Annual budget approaching Q4 underutilization threshold.
- Daily release capacity approaching or reaching its limit.

Each notification opens the exact request, allocation, release, or liquidation in the correct workspace and marks itself read.

## Implementation sequence

### Phase 0 — Regression baseline

- Inventory all current budget consumers and navigation contracts.
- Add tests around existing proposal publication, budget summary, task allocation, petty-cash request, and liquidation behavior.
- Capture the live migration verification baseline.

### Phase 1 — Task-linked proposal budget model

- Extend proposal budget types with task identity, quantity, unit, unit cost, and budget-decision state.
- Add pure roll-up and validation selectors.
- Move budget authoring into task rows and create the task-budget drawer.
- Convert the proposal Budget tab into a generated roll-up.
- Preserve old snapshot budget lines through a compatibility adapter and mark them for owner review instead of discarding them.

### Phase 2 — Atomic publication and operational allocations

- Add immutable operational task-budget lines.
- Update publication RPCs to create the commitment and task allocations atomically and idempotently.
- Add insufficient-budget and missing-task-budget publication checks.
- Verify the annual commitment is reserved exactly once.

### Phase 3 — Correct daily petty-cash policy

- Add daily release, per-receipt, liquidation-deadline, and exception policy fields.
- Migrate the existing PHP 30,000 value to daily-release semantics.
- Remove annual-pool calculations from summary and request approval.
- Add concurrency-safe daily scheduling and partial release operations.
- Maintain temporary compatibility fields for existing UI consumers.

### Phase 4 — Two-stage request and liquidation workflow

- Add immutable stage decisions and expanded statuses.
- Implement employee-to-leader-to-department request routing.
- Implement reciprocal Head/Assistant routing and self-approval prevention.
- Add release scheduling, release confirmation, liquidation deadlines, Team Leader receipt review, and final settlement.
- Expand RLS so requesters, responsible Team Leaders, eligible department approvers, and auditors see only their permitted records.

### Phase 5 — Department Budget redesign

- Replace the fiscal-year dropdown with the fiscal-year navigator and configured-year popover.
- Build the new command header, overview, daily release strip, hierarchy funding view, approval inbox, release/liquidation workspace, expenses, and readable ledger.
- Add realtime refresh for all fiscal tables and transition events.

### Phase 6 — Employee and Team Leader surfaces

- Upgrade task and subtask budget cards.
- Add the role-aware request wizard.
- Add request status timelines, daily-cap messaging, receipt upload, return calculation, and corrective resubmission.
- Add deep-linked notifications and review counters.
- Block funded subtask final approval while financial settlement is outstanding.

### Phase 7 — Reporting and fiscal close

- Add utilization trends, Q4 underutilization warnings, outstanding-cash aging, category analysis, proposal budget-versus-actual, and employee accountability views.
- Add audited annual-budget adjustments and fiscal-year closeout rules.
- Provide CSV/PDF exports from permission-filtered services.

### Phase 8 — Compatibility cleanup

- Migrate all callers from annual `pettyCashLimit` semantics to daily-release semantics.
- Remove temporary adapters only after repository search proves there are no consumers.
- Update README, module map, walkthrough steps, and feature inventory.

## Verification and acceptance

### Unit tests

- Proposal, task, category, and particular roll-ups.
- Funded versus no-cost task validation.
- Annual available balance and no-double-deduction behavior.
- Task and subtask remaining balances.
- Daily release scheduling across multiple requests and dates.
- Partial release calculations.
- Approval-route resolution for employee, Team Leader, Head, and Assistant Head.
- Self-approval prevention.
- Receipt threshold and reconciliation rules.
- Q4 utilization signals.
- Fiscal-year selector options and statuses.

### Database integration tests

- Atomic, idempotent proposal publication.
- Concurrent proposal commitments cannot overspend annual funding.
- Concurrent daily releases cannot exceed the department/date cap.
- RLS isolation between departments.
- Team Leader visibility over assigned employees' requests.
- Head/Assistant reciprocal approval.
- Immutable decision and liquidation attempts.
- Returned cash and actual spending ledger entries.
- Funded subtask completion blocked until settlement.

### Component tests

- Task budget drawer and multiple particulars.
- Proposal funding roll-up and task jump links.
- Fiscal-year navigator and configured-year popover.
- Employee request form.
- Team Leader decision queue.
- Head/Assistant approval and release scheduling.
- Receipt submission and settlement.
- Empty, loading, error, and permission-denied states.

### Browser acceptance flow

1. Head creates and locks FY 2026 annual funding.
2. Head creates a department-only proposal with funded and no-cost tasks.
3. Publication reserves the proposal total and creates task allocations exactly once.
4. Team Leader allocates part of a task budget to an employee subtask.
5. Employee requests petty cash.
6. Team Leader approves operationally.
7. Head or Assistant approves financially.
8. Requests beyond today's PHP 30,000 release capacity are scheduled without being rejected.
9. Cash is released and the employee submits receipts and returned cash.
10. Team Leader verifies the package.
11. Head or Assistant settles it.
12. Proposal, task, subtask, department overview, expenses, ledger, notifications, and reports all show the same balances without a refresh.

Every phase requires `npm run check`, `npm test`, affected Playwright coverage, `npm run build`, and live-schema verification before acceptance.
