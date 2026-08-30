create role anon;
create role authenticated;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
grant usage on schema auth to authenticated;
create table profiles(id uuid primary key, full_name text, role text, org_id uuid, is_active boolean default true);
create table projects(id uuid primary key, title text, status text, org_id uuid, owner_id uuid, created_by uuid, source_collaboration_draft_id uuid, archived_at timestamptz, updated_at timestamptz);
create table project_organizations(project_id uuid, organization_id uuid, participation_role text);
create table tasks(id uuid primary key, linked_project_id uuid references projects(id), title text, status text, deleted_at timestamptz, archived_at timestamptz);
create table subtasks(id uuid primary key, task_id uuid references tasks(id), title text, status text);
create table petty_cash_requests(id uuid primary key, task_id uuid references tasks(id), subtask_id uuid, request_number bigint, status text, approved_amount numeric, requested_amount numeric);
create table proposal_collaboration_orgs(draft_id uuid, org_id uuid, participation_role text);
create table proposal_delivery_closeouts(draft_id uuid primary key, status text);
create table audit_events(id uuid primary key default gen_random_uuid(), actor_id uuid, actor_name text, entity_type text, entity_id text, action text, reason text, before_data jsonb, after_data jsonb, org_id uuid);
create function auth_role(caller uuid) returns text language sql stable as $$ select role from profiles where id=caller $$;
create function can_access_org(caller uuid, org uuid, level text) returns boolean language sql stable as $$ select exists(select 1 from profiles where id=caller and org_id=org and role in ('dept_head','assistant_head') and is_active) $$;
create function is_organization_approver(org uuid, caller uuid) returns boolean language sql stable as $$ select can_access_org(caller,org,'manage') $$;
create function test_assert(value boolean, message text) returns void language plpgsql as $$ begin if value is distinct from true then raise exception 'Assertion failed: %', message; end if; end $$;
create function test_throws(command text, expected text) returns void language plpgsql as $$
begin
  begin execute command; exception when others then
    if position(expected in sqlerrm)=0 then raise exception 'Expected %, got %', expected, sqlerrm; end if;
    return;
  end;
  raise exception 'Expected failure: %', expected;
end $$;
insert into profiles(id,full_name,role,org_id) values
('20000000-0000-4000-8000-000000000001','Head','dept_head','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000002','Assistant','assistant_head','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000003','Employee','employee','10000000-0000-4000-8000-000000000001'),
('20000000-0000-4000-8000-000000000004','Foreign Head','dept_head','10000000-0000-4000-8000-000000000002'),
('20000000-0000-4000-8000-000000000005','Admin','super_admin','10000000-0000-4000-8000-000000000001');
create function reset_project_test() returns void language plpgsql as $$
begin
  truncate projects, tasks, subtasks, petty_cash_requests, audit_events, project_organizations, proposal_collaboration_orgs, proposal_delivery_closeouts;
  insert into projects(id,title,status,org_id,owner_id,created_by) values
    ('30000000-0000-4000-8000-000000000001','Project Issa','active','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001'),
    ('30000000-0000-4000-8000-000000000002','Sibling Project','active','10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001');
  insert into tasks(id,linked_project_id,title,status) values
    ('40000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','New Tasks','completed');
  insert into subtasks(id,task_id,title,status) values
    ('50000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001','Order Food','completed');
end $$;
grant select on all tables in schema public to authenticated;
grant update on projects to authenticated;
