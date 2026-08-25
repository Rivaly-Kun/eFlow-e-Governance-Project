# Department Budget and Petty Cash Flow

## Scope

This workflow connects every verified expense to authorized work:

`Annual appropriation -> Proposal task budget -> Task allocation -> Subtask allocation -> Petty cash -> Release -> Receipts -> Actual expense`

The current funding authority is the proposal owner's organization. Cross-department transfers and shared-cost funding remain a later phase.

## 1. Annual appropriation

The Department Head prepares a fiscal-year budget and configures:

- approved annual amount;
- daily petty-cash release ceiling (default PHP 30,000);
- per-receipt review threshold (default PHP 5,000);
- liquidation deadline;
- receipt-threshold override policy; and
- Q4 utilization target.

Locking activates the fiscal year. A locked amount is changed only through an audited adjustment. Fiscal close is blocked while cash remains unsettled.

## 2. Proposal and task funding

Every enabled proposal task must be explicitly classified:

- **Funded** — one or more expense classes, categories, and particulars with quantity, unit, unit cost, and amount; or
- **No cost** — no department funding is required, with an optional explanation.

Drafts do not consume money. Publication validates the latest revision, staffing, schedules, task-budget decisions, and available annual funding. One database operation then:

1. creates operational projects and tasks;
2. reserves one proposal commitment;
3. creates approved task allocations;
4. preserves immutable task budget particulars; and
5. writes ledger and notification records.

Retrying publication does not create a second commitment or duplicate allocation.

## 3. Subtask funding

The Task Leader distributes an approved task allocation to subtasks. A subtask allocation selects an originating task-budget particular and cannot exceed that particular or the parent task's available balance.

The Head or Assistant Head approves the allocation. The requester cannot approve their own allocation. Money already reserved, released, or spent cannot be silently removed.

## 4. Petty-cash request

Eligible requesters are:

- an employee assigned to the funded subtask;
- the Task Leader for a task-level operational cost; or
- the Task Leader for an assigned subtask.

An ordinary task member cannot request from the parent Task Leader allocation.

Approval routes are:

- employee request: Team Leader -> Head/Assistant Head;
- Team Leader request: Head/Assistant Head;
- Department Head request: Assistant Head;
- Assistant Head request: Department Head.

Self-approval is blocked at every stage. Changes requested by either reviewer may be corrected and resubmitted without losing the prior decision history.

## 5. Daily release scheduling

Approval reserves the amount against the work allocation. The daily ceiling controls when cash can be released; it is not a separate annual petty-cash pool and it is not a request limit.

If the requested amount does not fit on one day, the server creates partial release tranches on the next available dates. Concurrency-safe database locking prevents simultaneous approvals from exceeding a department/date ceiling.

A Head or Assistant marks each tranche released. The named recipient must acknowledge receiving it before liquidation can be submitted.

## 6. Liquidation and actual spending

The recipient provides receipt file, vendor, receipt date, receipt number, description, and amount, plus returned cash and a note. Receipts above the configured threshold require an override reason when overrides are allowed.

The package must reconcile:

`Receipt total + returned cash = released cash`

Employee liquidation follows Team Leader verification and then Head/Assistant settlement. A Team Leader's own liquidation goes directly to the eligible Head/Assistant. Only final settlement posts actual spending; returned money restores the work balance.

Funded work cannot receive final approval while it has pending cash, unacknowledged releases, receipt corrections, or unsettled liquidation.

## 7. Role workspaces

### Department Head / Assistant Head

- Department Budget: annual plan, proposal/task funding, approval inbox, releases, expenses, and ledger.
- Reviews: exact allocation, request, release, and liquidation records opened from notifications.
- Reports: verified expenses by proposal, task, subtask, employee, category, and month.

### Team Leader

- Work I'm Leading: task and subtask budget position.
- Reviews: employee allocation/request/liquidation decisions.
- Petty Cash: own eligible requests, release acknowledgement, and liquidation.

### Employee

- My Subtasks: allocation position for assigned work.
- Petty Cash: request, decision timeline, release acknowledgement, receipts, returned cash, and corrections.

## 8. Monitoring and reports

The Department Budget overview shows annual appropriation, available funds, active commitments, verified spending, today's release capacity, scheduled releases, outstanding cash aging, Q4 utilization, proposal-versus-actual bars, and recent ledger activity.

The Expenses register is permission-scoped and supports proposal, employee, and month filters, receipt access, CSV export, and print/PDF output.

## 9. Required migrations and verification

Apply migrations through `20260825000001_subtask_budget_distribution_guard.sql` in order. Then run:

```powershell
npm run verify:live-schema
npm run check
npm test
npm run build
```

The live-schema command verifies the fiscal tables, notification deep-link columns, and public database operations used by the UI.
