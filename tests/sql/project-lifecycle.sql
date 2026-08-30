select reset_project_test();
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
set role authenticated;
select test_assert((get_project_completion_readiness('30000000-0000-4000-8000-000000000001')->>'canComplete')::boolean,'ready project');
select test_throws($q$select project_completion_readiness_internal('30000000-0000-4000-8000-000000000001')$q$,'permission denied');
select test_throws($q$select archive_completed_project('30000000-0000-4000-8000-000000000001')$q$,'Complete the project before archiving');
select test_throws($q$update projects set status='archived' where id='30000000-0000-4000-8000-000000000001'$q$,'Complete the project before archiving');
select test_throws($q$update projects set archived_at=now() where id='30000000-0000-4000-8000-000000000001'$q$,'do not hide an active project');
select complete_project('30000000-0000-4000-8000-000000000001','Work verified');
select complete_project('30000000-0000-4000-8000-000000000001','Duplicate confirmation');
select test_assert((select status='completed' from projects where id='30000000-0000-4000-8000-000000000001'),'selected project completes');
select test_assert((select status='active' from projects where id='30000000-0000-4000-8000-000000000002'),'sibling unchanged');
select test_assert((select count(*)=1 from audit_events where action='project.completed'),'completion audited once');
select archive_completed_project('30000000-0000-4000-8000-000000000001','Retain history');
select archive_completed_project('30000000-0000-4000-8000-000000000001','Duplicate archive');
select test_assert((select status='archived' and archived_at is not null from projects where id='30000000-0000-4000-8000-000000000001'),'archive recorded');
select test_assert((select count(*)=2 from audit_events),'archive audited once');
select test_assert((select count(*)=1 from tasks),'archive retains work history');
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'already archived');
update projects set status='active', archived_at=null where id='30000000-0000-4000-8000-000000000001';
select test_throws($q$select archive_completed_project('30000000-0000-4000-8000-000000000001')$q$,'Complete the project before archiving');
reset role;

-- Only existing project managers can inspect/act. No employee, foreign Head,
-- anonymous, inactive owner or oversight-admin privilege expansion.
do $$
begin
  for n in 3..5 loop
    perform set_config('request.jwt.claim.sub','20000000-0000-4000-8000-'||lpad(n::text,12,'0'),false);
    perform test_throws($q$select get_project_completion_readiness('30000000-0000-4000-8000-000000000001')$q$,'Only an authorized');
    perform test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'Only an authorized');
  end loop;
end $$;
select set_config('request.jwt.claim.sub','',false);
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'Only an authorized');
update projects set owner_id=null, created_by=null where id='30000000-0000-4000-8000-000000000002';
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000003',false);
select test_throws($q$select get_project_completion_readiness('30000000-0000-4000-8000-000000000002')$q$,'Only an authorized');
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
update profiles set is_active=false where id=auth.uid();
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'Only an authorized');
update profiles set is_active=true where id=auth.uid();
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',false);
select complete_project('30000000-0000-4000-8000-000000000001','Assistant verifies');

select reset_project_test();
select set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000001',false);
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000002')$q$,'No delivery tasks');
update tasks set status='for_review';
select test_assert(get_project_completion_readiness('30000000-0000-4000-8000-000000000001')->'blockers'->0->>'title'='New Tasks','exact task title');
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'New Tasks');
update tasks set status='completed';
update subtasks set status='for_review';
select test_throws($q$update projects set status='completed' where id='30000000-0000-4000-8000-000000000001'$q$,'New Tasks → Order Food');
update tasks set status='cancelled';
select test_assert((get_project_completion_readiness('30000000-0000-4000-8000-000000000001')->>'canComplete')::boolean,'cancelled task excludes unfinished subtask');
update tasks set status='completed'; update subtasks set status='completed';

insert into petty_cash_requests(id,task_id,subtask_id,request_number,status,requested_amount) values
('60000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001',6,'pending_department_settlement',5000);
select test_assert(get_project_completion_readiness('30000000-0000-4000-8000-000000000001')->'blockers'->0->>'title'='FR-00006 · New Tasks → Order Food','cash identifies request and subtask');
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'FR-00006');
update tasks set deleted_at=now();
select test_assert(exists(select 1 from jsonb_array_elements(get_project_completion_readiness('30000000-0000-4000-8000-000000000001')->'blockers') b where b->>'kind'='cash'),'deleted work cannot hide cash');
update tasks set deleted_at=null;
update petty_cash_requests set status='settled';
select complete_project('30000000-0000-4000-8000-000000000001');
update petty_cash_requests set status='pending_leader_review';
select test_throws($q$select archive_completed_project('30000000-0000-4000-8000-000000000001')$q$,'FR-00006');
update petty_cash_requests set status='cancelled';
select archive_completed_project('30000000-0000-4000-8000-000000000001');

-- Governance is required only where the source proposal already requires it.
select reset_project_test();
update projects set source_collaboration_draft_id='70000000-0000-4000-8000-000000000001' where id='30000000-0000-4000-8000-000000000001';
insert into project_organizations values ('30000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner');
insert into proposal_collaboration_orgs values ('70000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','governance');
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'Final proposal governance closeout');
insert into proposal_delivery_closeouts values ('70000000-0000-4000-8000-000000000001','approved');
select complete_project('30000000-0000-4000-8000-000000000001');
select test_assert((select status='approved' from proposal_delivery_closeouts),'single-project completion does not complete the proposal');

-- A failed audit insert rolls the status update back too.
select reset_project_test();
create function fail_project_audit() returns trigger language plpgsql as $$ begin raise exception 'Audit unavailable'; end $$;
create trigger fail_audit before insert on audit_events for each row execute function fail_project_audit();
select test_throws($q$select complete_project('30000000-0000-4000-8000-000000000001')$q$,'Audit unavailable');
select test_assert((select status='active' from projects where id='30000000-0000-4000-8000-000000000001'),'audit failure rolls back completion');
drop trigger fail_audit on audit_events;
