-- ISOLATED TEST DATABASE ONLY. Minimal Supabase/Postgres contracts, not a
-- replacement for running migrations against a representative staging clone.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create function auth.role() returns text language sql stable as $$
  select nullif(current_setting('request.jwt.claim.role', true), '');
$$;
grant usage on schema auth, storage to anon, authenticated, service_role;
grant execute on all functions in schema auth to anon, authenticated, service_role;
create table storage.buckets(id text primary key, public boolean not null default false);
create table storage.objects(
  id uuid primary key default gen_random_uuid(), bucket_id text not null,
  name text not null, owner_id text, metadata jsonb,
  created_at timestamptz not null default now(), unique(bucket_id,name)
);
alter table storage.objects enable row level security;
-- Intentionally broad unrelated policy: the new RESTRICTIVE guards must win.
create policy test_overly_broad on storage.objects for all to anon, authenticated using (true) with check (true);
create policy taskfiles_rw on storage.objects for all using (auth.uid() is not null) with check (auth.uid() is not null);
grant all on storage.objects to anon, authenticated, service_role;
insert into storage.buckets values ('task-attachments', false), ('unrelated-bucket', false);
create table public.profiles(id uuid primary key, full_name text, is_active boolean default true);
create table public.organizations(id uuid primary key, head_user_id uuid);
create table public.tasks(
  id uuid primary key, title text default 'Fixture task', status text default 'in_progress',
  org_id uuid, assigned_to uuid, recommendation_lead_id uuid, created_by uuid,
  reviewer_id uuid, backup_reviewer_id uuid, team_member_ids uuid[] default '{}',
  deleted_at timestamptz, archived_at timestamptz, latest_submission jsonb,
  feedback text, percent_complete integer default 0, last_activity_at timestamptz
);
create table public.subtasks(
  id uuid primary key, task_id uuid references public.tasks(id), title text default 'Fixture subtask',
  assigned_to uuid, assigned_to_ids uuid[] default '{}', status text default 'todo',
  percent_complete integer default 0, reviewer_id uuid, latest_submission_id uuid,
  is_completed boolean default false, completed_by uuid, completed_at timestamptz
);
create table public.task_submissions(
  id uuid primary key, task_id uuid, version integer, submitter_id uuid, submitter_name text,
  note text, status text default 'pending', decided_by uuid, decided_by_name text,
  decision_feedback text, decided_at timestamptz, submitted_at timestamptz default now(),
  created_at timestamptz default now(), unique(task_id,version)
);
create table public.subtask_submissions(
  id uuid primary key, subtask_id uuid, task_id uuid, version integer, submitter_id uuid,
  submitter_name text, reviewer_id uuid, note text, status text default 'pending',
  decided_by uuid, decided_by_name text, decision_feedback text, decided_at timestamptz,
  submitted_at timestamptz default now(), created_at timestamptz default now(), unique(subtask_id,version)
);
create table public.task_attachments(
  id uuid primary key default gen_random_uuid(), task_id uuid, submission_id uuid,
  uploaded_by uuid, uploader_name text, file_name text, file_path text, file_size bigint,
  mime_type text, created_at timestamptz default now()
);
create table public.subtask_submission_attachments(
  id uuid primary key default gen_random_uuid(), submission_id uuid, subtask_id uuid,
  task_id uuid, uploaded_by uuid, file_name text, file_path text, file_size bigint, mime_type text
);
create table public.subtask_progress_updates(
  id uuid primary key default gen_random_uuid(), subtask_id uuid, task_id uuid,
  author_id uuid, author_name text, percent_complete integer, blocker_category text,
  blocker text, next_step text, note text, attachment_path text, attachment_name text,
  created_at timestamptz default now()
);
create table public.task_status_history(task_id uuid, from_status text, to_status text, actor_id uuid, actor_name text, note text);
create table public.task_activities(task_id uuid, type text, content text, actor_id uuid, actor_name text);
create table public.audit_events(actor_id uuid, actor_name text, entity_type text, entity_id text, action text, reason text, before_data jsonb, after_data jsonb, org_id uuid);
create table public.notifications(user_id uuid, type text, title text, message text, task_id uuid, task_title text, actor_id uuid, actor_name text, status_from text, status_to text, reason text);
create function public.can_see_task(p_task uuid, p_actor uuid) returns boolean language sql stable security definer as $$
  select exists(select 1 from public.tasks t where t.id = p_task and t.deleted_at is null
    and (p_actor in (t.assigned_to,t.reviewer_id,t.backup_reviewer_id,t.created_by)
      or p_actor = any(t.team_member_ids)));
$$;
-- Fixture deliberately allows direct writes: the migration triggers must
-- withstand an overly permissive legacy metadata policy, too.
grant all on all tables in schema public to authenticated, service_role;
insert into public.profiles values
 ('10000000-0000-4000-8000-000000000001','Lead',true),
 ('10000000-0000-4000-8000-000000000002','Contributor',true),
 ('10000000-0000-4000-8000-000000000003','Reviewer',true),
 ('10000000-0000-4000-8000-000000000004','Unrelated',true),
 ('10000000-0000-4000-8000-000000000005','Stale planning lead',true),
 ('10000000-0000-4000-8000-000000000006','Inactive',false);
insert into public.tasks(id,assigned_to,recommendation_lead_id,reviewer_id,team_member_ids) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000005','10000000-0000-4000-8000-000000000003',array['10000000-0000-4000-8000-000000000002']::uuid[]),
 ('20000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001',null,'10000000-0000-4000-8000-000000000003','{}'),
 ('20000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000004',null,null,'{}'),
 ('20000000-0000-4000-8000-000000000004',null,null,'10000000-0000-4000-8000-000000000003','{}');
insert into public.subtasks(id,task_id,assigned_to) values
 ('30000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002'),
 ('30000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000003',null);
-- Existing evidence is sealed during migration, including a missing file.
insert into public.task_attachments(task_id,uploaded_by,file_name,file_path,file_size,mime_type) values
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','legacy.pdf','legacy/retained.pdf',20,'application/pdf'),
 ('20000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','missing.pdf','legacy/missing.pdf',20,'application/pdf');
insert into storage.objects(bucket_id,name,owner_id,metadata) values
 ('task-attachments','legacy/retained.pdf','10000000-0000-4000-8000-000000000001','{"size":20,"mimetype":"application/pdf"}');
create function public.test_assert(p_ok boolean,p_message text) returns void language plpgsql as $$
begin if p_ok is distinct from true then raise exception 'ASSERTION FAILED: %',p_message; end if; end; $$;
create function public.test_throws(p_sql text,p_message text) returns void language plpgsql as $$
declare caught boolean := false;
begin
  begin execute p_sql; exception when others then
    if position(p_message in sqlerrm) = 0 then raise exception 'Wrong failure: %, expected %',sqlerrm,p_message; end if;
    caught := true;
  end;
  if not caught then raise exception 'Expected failure containing: %',p_message; end if;
end; $$;
