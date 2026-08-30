select public.reset_cash_test();
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
set role authenticated;
select public.test_assert(not has_function_privilege('authenticated','public.record_petty_cash_release_internal(uuid,text)','execute'),'internal engine is not a public RPC');
select public.test_assert(not has_function_privilege('anon','public.override_petty_cash_release_schedule(uuid,text)','execute'),'anonymous override denied');
select public.test_throws($q$select public.mark_petty_cash_released('50000000-0000-4000-8000-000000000001')$q$,'This tranche is scheduled');
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001',null)$q$,'10 to 1000');
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','   ')$q$,'10 to 1000');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',false);
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today')$q$,'Only the Head or Assistant Head');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000004',false);
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today')$q$,'Only the Head or Assistant Head');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today');
select public.test_assert((select status='released' and scheduled_date=current_date+1 and released_at::date=current_date from petty_cash_releases where id='50000000-0000-4000-8000-000000000001'),'release now and preserve original schedule');
select public.test_assert((select status='released' and released_amount=5000 and liquidation_due_at > now() from petty_cash_requests where id='40000000-0000-4000-8000-000000000001'),'normal request lifecycle and due date');
select public.test_assert((select count(*)=1 from budget_ledger_entries where entry_type='financial_override' and amount=0 and reason='Supplier needs payment today' and actor_id=auth.uid() and metadata->>'originalScheduledDate'=(current_date+1)::text and metadata->>'actualReleaseDate'=current_date::text),'reasoned, attributed audit');
select public.test_assert((select count(*)=1 from notifications where financial_record_id='50000000-0000-4000-8000-000000000001'),'recipient notified once');
select public.test_assert((public.department_budget_summary('10000000-0000-4000-8000-000000000001',2026)->>'releasedToday')::numeric=5000,'summary uses actual release day');
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Duplicate click retry test')$q$,'already been processed');
select public.test_assert((select count(*)=1 from budget_ledger_entries where entry_type='financial_override'),'no duplicate audit');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',false);
select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000002','Assistant authorizes early release');
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000003','Supplier needs payment today')$q$,'Daily release ceiling exceeded');
select public.test_assert((select status='scheduled' from petty_cash_releases where id='50000000-0000-4000-8000-000000000003'),'failed override rolls back');
reset role;

select public.reset_cash_test();
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
update petty_cash_requests set status='pending_department_approval' where id='40000000-0000-4000-8000-000000000001';
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today')$q$,'must be fiscally approved');
update petty_cash_requests set status='scheduled_for_release', approved_amount=4000 where id='40000000-0000-4000-8000-000000000001';
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today')$q$,'exceed the approved');
update department_fiscal_budgets set status='closed';
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000002','Supplier needs payment today')$q$,'no longer open');

select public.reset_cash_test();
update petty_cash_releases set scheduled_date=current_date, amount=6000 where id='50000000-0000-4000-8000-000000000002';
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today')$q$,'Daily release ceiling exceeded');
select public.test_assert((select count(*)=0 from budget_ledger_entries),'today bookings are protected with no side effects');

select public.reset_cash_test();
-- An early release consumes today and frees its former schedule day.
select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today');
update petty_cash_releases set status='cancelled' where id='50000000-0000-4000-8000-000000000003';
update petty_cash_requests set needed_by=current_date+1 where id='40000000-0000-4000-8000-000000000002';
select public.schedule_petty_cash_releases('40000000-0000-4000-8000-000000000002',auth.uid());
select public.test_assert((select count(*)=1 from petty_cash_releases where request_id='40000000-0000-4000-8000-000000000002' and scheduled_date=current_date+1 and status='scheduled'),'scheduler uses actual cash dates');

select public.reset_cash_test();
-- Multiple tranches keep the normal partial-release lifecycle.
update petty_cash_requests set approved_amount=10000 where id='40000000-0000-4000-8000-000000000001';
select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs first tranche');
select public.test_assert((select status='partially_released' and released_amount=5000 and liquidation_due_at is null from petty_cash_requests where id='40000000-0000-4000-8000-000000000001'),'partial release stays partial');
update petty_cash_releases set scheduled_date=current_date where id='50000000-0000-4000-8000-000000000002';
select public.mark_petty_cash_released('50000000-0000-4000-8000-000000000002');
select public.test_assert((select count(*)=1 from budget_ledger_entries where entry_type='financial_override'),'normal release needs no override audit');

-- Force a post-update audit failure: cash, ledger and notification must roll back together.
select public.reset_cash_test();
alter table budget_ledger_entries add constraint reject_test_override check(entry_type <> 'financial_override');
select public.test_throws($q$select public.override_petty_cash_release_schedule('50000000-0000-4000-8000-000000000001','Supplier needs payment today')$q$,'reject_test_override');
select public.test_assert((select status='scheduled' from petty_cash_releases where id='50000000-0000-4000-8000-000000000001'),'audit failure rolls release back');
select public.test_assert((select count(*)=0 from notifications),'audit failure sends no notification');
alter table budget_ledger_entries drop constraint reject_test_override;
