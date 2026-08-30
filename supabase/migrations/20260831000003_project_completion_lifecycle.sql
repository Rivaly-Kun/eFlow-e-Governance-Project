-- Per-project closeout: completing one project never completes its siblings.
-- Keep existing RLS/management rules and existing proposal governance boundaries.
begin;

create or replace function public.project_completion_readiness_internal(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  project_row public.projects;
  blockers jsonb := '[]'::jsonb;
  delivery_count int;
  closeout_status text;
begin
  select * into project_row from public.projects where id = p_project_id;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
  select count(*) into delivery_count from public.tasks t
    where t.linked_project_id = p_project_id and t.deleted_at is null;
  if delivery_count = 0 and project_row.status not in ('completed', 'archived') then
    blockers := blockers || jsonb_build_array(jsonb_build_object('kind', 'work', 'id', p_project_id,
      'title', 'No delivery tasks', 'status', 'not_started',
      'detail', 'Add and finish the project work before marking it complete.'));
  end if;
  blockers := blockers || coalesce((select jsonb_agg(jsonb_build_object(
    'kind', 'task', 'id', t.id, 'taskId', t.id, 'title', t.title, 'status', t.status,
    'detail', case when t.status = 'for_review' then 'Awaiting reviewer approval in Reviews → Project Tasks.'
      when t.status = 'changes_requested' then 'Correct the requested changes and resubmit this task.'
      else 'Finish and submit this task for approval, or cancel it if it is no longer required.' end
  ) order by t.title, t.id) from public.tasks t where t.linked_project_id = p_project_id
    and t.deleted_at is null and t.status not in ('completed', 'cancelled')), '[]'::jsonb);
  blockers := blockers || coalesce((select jsonb_agg(jsonb_build_object(
    'kind', 'subtask', 'id', s.id, 'taskId', t.id, 'title', t.title || ' → ' || s.title, 'status', s.status,
    'detail', 'Finish this subtask and obtain its assigned reviewer approval in the task details.'
  ) order by t.title, s.title, s.id) from public.subtasks s join public.tasks t on t.id = s.task_id
    where t.linked_project_id = p_project_id and t.deleted_at is null and t.status <> 'cancelled'
      and s.status <> 'completed'), '[]'::jsonb);
  -- Include cash on deleted/cancelled/archived tasks: hiding work never settles money.
  blockers := blockers || coalesce((select jsonb_agg(jsonb_build_object(
    'kind', 'cash', 'id', r.id, 'taskId', t.id,
    'title', 'FR-' || lpad(r.request_number::text, 5, '0') || ' · ' || t.title || coalesce(' → ' || s.title, ''),
    'status', r.status, 'amount', coalesce(r.approved_amount, r.requested_amount),
    'detail', case
      when r.status = 'pending_leader_review' then 'Task Leader must review this cash request in Reviews → Budget.'
      when r.status in ('pending', 'pending_department_approval') then 'Department Head must review this cash request in Reviews → Budget.'
      when r.status = 'pending_leader_liquidation_review' then 'Task Leader must endorse the receipt package in Reviews → Budget.'
      when r.status in ('liquidation_submitted', 'pending_department_settlement') then 'Department Head must settle the receipts and unused cash in Reviews → Budget.'
      when r.status in ('approved', 'scheduled_for_release', 'partially_released') then 'Check Department Budget → Releases & Settlement; this cash request remains open.'
      when r.status in ('released', 'overdue_liquidation', 'liquidation_draft', 'changes_requested') then 'Cash recipient must submit or correct the receipts and unused cash return in task/subtask Funding activity.'
      else 'Resolve or cancel this open cash request in task/subtask Funding activity before completion.' end
  ) order by r.request_number, r.id) from public.petty_cash_requests r
    join public.tasks t on t.id = r.task_id left join public.subtasks s on s.id = r.subtask_id
    where t.linked_project_id = p_project_id and r.status not in ('settled', 'rejected', 'cancelled')), '[]'::jsonb);
  if project_row.source_collaboration_draft_id is not null and exists (
    select 1 from public.proposal_collaboration_orgs o
      where o.draft_id = project_row.source_collaboration_draft_id and o.participation_role = 'governance'
  ) then
    select c.status into closeout_status from public.proposal_delivery_closeouts c
      where c.draft_id = project_row.source_collaboration_draft_id;
    if coalesce(closeout_status, 'draft') not in ('approved', 'completed', 'archived') then
      blockers := blockers || jsonb_build_array(jsonb_build_object(
        'kind', 'governance', 'id', project_row.source_collaboration_draft_id,
        'title', 'Final proposal governance closeout', 'status', coalesce(closeout_status, 'draft'),
        'detail', 'Open the source proposal’s Governance → Final governance closeout to request verification and resolve the listed organization decisions.'));
    end if;
  end if;
  return jsonb_build_object('projectId', project_row.id, 'title', project_row.title, 'status', project_row.status,
    'canComplete', project_row.status in ('planning', 'active', 'on_hold') and jsonb_array_length(blockers) = 0,
    'blockers', blockers);
end;
$$;

create or replace function public.get_project_completion_readiness(p_project_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not coalesce(public.can_manage_project(p_project_id, auth.uid()), false)
     or not exists (select 1 from public.profiles where id = auth.uid() and is_active) then
    raise exception 'Only an authorized project manager can complete or archive this project' using errcode = '42501';
  end if;
  return public.project_completion_readiness_internal(p_project_id);
end;
$$;

-- Cover direct table updates and legacy clients as well as the new RPCs.
create or replace function public.guard_project_completion_lifecycle()
returns trigger language plpgsql security definer set search_path = public as $$
declare readiness jsonb;
begin
  if new.status = 'archived' and old.status not in ('completed', 'archived') then
    raise exception 'Complete the project before archiving it' using errcode = '22023';
  end if;
  if new.status <> 'archived' and new.archived_at is not null then
    raise exception 'Only a completed project can be archived; do not hide an active project' using errcode = '22023';
  end if;
  if new.status in ('completed', 'archived') and new.status is distinct from old.status then
    readiness := public.project_completion_readiness_internal(old.id);
    if jsonb_array_length(readiness->'blockers') > 0 then
      raise exception 'Project closeout is blocked: %', readiness->'blockers'->0->>'title'
        using errcode = '22023', detail = (readiness->'blockers')::text,
        hint = 'Open Mark project complete to see the outstanding work, cash, and sign-offs.';
    end if;
  end if;
  if new.status = 'archived' then new.archived_at := coalesce(new.archived_at, now()); end if;
  return new;
end;
$$;
drop trigger if exists project_completion_lifecycle_guard on public.projects;
create trigger project_completion_lifecycle_guard before update of status, archived_at on public.projects
for each row execute function public.guard_project_completion_lifecycle();

create or replace function public.complete_project(p_project_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare project_row public.projects;
begin
  perform public.get_project_completion_readiness(p_project_id);
  select * into project_row from public.projects where id = p_project_id for update;
  if project_row.status = 'completed' then return; end if;
  if project_row.status = 'archived' then raise exception 'This project is already archived' using errcode = '22023'; end if;
  -- The trigger rechecks readiness at the actual update, never trusting the UI.
  update public.projects set status = 'completed', updated_at = now() where id = p_project_id;
  insert into public.audit_events(actor_id, actor_name, entity_type, entity_id, action, reason, before_data, after_data, org_id)
  values (auth.uid(), coalesce((select full_name from public.profiles where id = auth.uid()), 'Project manager'),
    'project', p_project_id::text, 'project.completed', nullif(btrim(p_note), ''),
    jsonb_build_object('status', project_row.status), jsonb_build_object('status', 'completed'), project_row.org_id);
end;
$$;

create or replace function public.archive_completed_project(p_project_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare project_row public.projects;
begin
  perform public.get_project_completion_readiness(p_project_id);
  select * into project_row from public.projects where id = p_project_id for update;
  if project_row.status = 'archived' then return; end if;
  if project_row.status <> 'completed' then raise exception 'Complete the project before archiving it' using errcode = '22023'; end if;
  update public.projects set status = 'archived', archived_at = now(), updated_at = now() where id = p_project_id;
  insert into public.audit_events(actor_id, actor_name, entity_type, entity_id, action, reason, before_data, after_data, org_id)
  values (auth.uid(), coalesce((select full_name from public.profiles where id = auth.uid()), 'Project manager'),
    'project', p_project_id::text, 'project.archived', nullif(btrim(p_reason), ''),
    jsonb_build_object('status', project_row.status), jsonb_build_object('status', 'archived'), project_row.org_id);
end;
$$;

revoke all on function public.project_completion_readiness_internal(uuid) from public, anon, authenticated;
revoke all on function public.guard_project_completion_lifecycle() from public, anon, authenticated;
revoke all on function public.get_project_completion_readiness(uuid) from public, anon;
revoke all on function public.complete_project(uuid, text) from public, anon;
revoke all on function public.archive_completed_project(uuid, text) from public, anon;
grant execute on function public.get_project_completion_readiness(uuid) to authenticated;
grant execute on function public.complete_project(uuid, text) to authenticated;
grant execute on function public.archive_completed_project(uuid, text) to authenticated;
notify pgrst, 'reload schema';
commit;
