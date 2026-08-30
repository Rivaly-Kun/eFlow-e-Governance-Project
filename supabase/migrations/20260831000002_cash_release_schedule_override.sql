-- Explicit date-only cash release override. No RLS or approval-boundary changes.
-- Existing callers keep mark_petty_cash_released(uuid); both paths use one
-- locked release engine and the server's existing calendar-day convention.
begin;

create or replace function public.record_petty_cash_release_internal(
  p_release_id uuid, p_override_reason text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  caller uuid := auth.uid();
  release public.petty_cash_releases;
  request public.petty_cash_requests;
  budget public.department_fiscal_budgets;
  request_id_value uuid;
  released_total numeric;
  used_today numeric;
  override_reason text := nullif(btrim(p_override_reason), '');
  actor_role_value text;
begin
  if caller is null then raise exception 'Sign in before recording a cash release' using errcode = '42501'; end if;
  select request_id into request_id_value from public.petty_cash_releases where id = p_release_id;
  if not found then raise exception 'Scheduled release not found' using errcode = 'P0002'; end if;
  -- Match the request -> budget -> release order used by scheduling/cancellation.
  select * into request from public.petty_cash_requests where id = request_id_value for update;
  if not found then raise exception 'Cash request not found' using errcode = 'P0002'; end if;
  if not public.is_department_budget_approver(request.org_id, caller) then
    raise exception 'Only the Head or Assistant Head can record a cash release' using errcode = '42501';
  end if;
  select * into budget from public.department_fiscal_budgets where id = request.fiscal_budget_id and status = 'locked' for update;
  if not found then raise exception 'The annual department budget is no longer open' using errcode = '22023'; end if;
  -- Serializes normal releases and overrides, including across fiscal budgets
  -- for the same department. Scheduling below uses this same lock.
  perform pg_advisory_xact_lock(hashtextextended('eflow:cash-release:' || request.org_id::text, 0));
  select * into release from public.petty_cash_releases where id = p_release_id and request_id = request.id for update;
  if not found then raise exception 'Scheduled release not found' using errcode = 'P0002'; end if;
  if release.status <> 'scheduled' then raise exception 'This cash tranche has already been processed' using errcode = '22023'; end if;
  if request.status not in ('approved', 'scheduled_for_release', 'partially_released') or request.approved_amount is null then
    raise exception 'Cash must be fiscally approved before release; a schedule override cannot approve funding' using errcode = '22023';
  end if;
  if release.scheduled_date > current_date and override_reason is null then
    raise exception 'This tranche is scheduled for %. Use Override schedule and provide a reason to release it early.', release.scheduled_date using errcode = '22023';
  end if;
  if p_override_reason is not null and (override_reason is null or length(override_reason) < 10 or length(override_reason) > 1000) then
    raise exception 'Explain the schedule override in 10 to 1000 characters' using errcode = '22023';
  end if;
  select coalesce(sum(amount), 0) into released_total from public.petty_cash_releases
    where request_id = request.id and status = 'released';
  if released_total + release.amount > request.approved_amount then
    raise exception 'This tranche would exceed the approved cash request amount' using errcode = '22023';
  end if;
  -- Preserve room already promised to today's scheduled tranches. An early or
  -- late release consumes its actual release day, not its original schedule.
  select coalesce(sum(amount), 0) into used_today from public.petty_cash_releases
    where org_id = request.org_id and id <> release.id and (
      (status = 'released' and coalesce(released_at::date, scheduled_date) = current_date)
      or (status = 'scheduled' and scheduled_date = current_date)
    );
  if used_today + release.amount > budget.daily_petty_cash_release_limit then
    raise exception 'Daily release ceiling exceeded. Only % remains on server date % after released cash and today''s scheduled tranches; this tranche needs %. The schedule override cannot bypass this limit.',
      greatest(0, budget.daily_petty_cash_release_limit - used_today), current_date, release.amount using errcode = '22023';
  end if;
  update public.petty_cash_releases set status = 'released', released_by = caller, released_at = now() where id = release.id;
  released_total := released_total + release.amount;
  update public.petty_cash_requests set released_amount = released_total,
    status = case when released_total >= approved_amount then 'released' else 'partially_released' end,
    liquidation_due_at = case when released_total >= approved_amount then now() + budget.liquidation_due_days * interval '1 day' else liquidation_due_at end,
    updated_at = now() where id = request.id;
  insert into public.budget_ledger_entries(fiscal_budget_id, org_id, commitment_id, allocation_id, petty_cash_request_id, entry_type, amount, description, actor_id)
  values (request.fiscal_budget_id, request.org_id, request.commitment_id, request.allocation_id, request.id,
    'petty_cash_released', release.amount, 'Scheduled petty-cash tranche released to recipient', caller);
  if override_reason is not null then
    select role::text into actor_role_value from public.profiles where id = caller;
    insert into public.budget_ledger_entries(
      fiscal_budget_id, org_id, commitment_id, allocation_id, petty_cash_request_id,
      task_id, subtask_id, allocation_line_id, entry_type, amount, description,
      actor_id, actor_role, previous_state, new_state, reason, metadata
    ) values (
      request.fiscal_budget_id, request.org_id, request.commitment_id, request.allocation_id, request.id,
      request.task_id, request.subtask_id, request.allocation_line_id, 'financial_override', 0,
      format('Cash release schedule override: %s -> %s. Reason: %s', release.scheduled_date, current_date, override_reason),
      caller, actor_role_value, 'scheduled', 'released', override_reason,
      jsonb_build_object('overrideType', 'cash_release_schedule', 'releaseId', release.id,
        'originalScheduledDate', release.scheduled_date, 'actualReleaseDate', current_date,
        'releasedAt', now(), 'releaseAmount', release.amount, 'recipientId', release.recipient_id,
        'dailyLimit', budget.daily_petty_cash_release_limit, 'previousDailyUsage', used_today)
    );
  end if;
  insert into public.notifications(user_id, type, title, message, task_id, actor_id, actor_name, financial_record_id, financial_record_type)
  select request.cash_recipient_id, 'petty_cash_released', 'Petty cash released',
    to_char(release.amount, 'FM999G999G999G990D00') || ' was recorded as released for your work request.',
    request.task_id, caller, coalesce(full_name, ''), release.id, 'petty_cash_release' from public.profiles where id = caller;
end;
$$;

create or replace function public.mark_petty_cash_released(p_release_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.record_petty_cash_release_internal(p_release_id, null);
end;
$$;

create or replace function public.override_petty_cash_release_schedule(p_release_id uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_reason is null or length(btrim(p_reason)) < 10 or length(btrim(p_reason)) > 1000 then
    raise exception 'Explain the schedule override in 10 to 1000 characters' using errcode = '22023';
  end if;
  perform public.record_petty_cash_release_internal(p_release_id, p_reason);
end;
$$;

revoke all on function public.record_petty_cash_release_internal(uuid, text) from public, anon, authenticated;
revoke all on function public.mark_petty_cash_released(uuid) from public, anon;
revoke all on function public.override_petty_cash_release_schedule(uuid, text) from public, anon;
grant execute on function public.mark_petty_cash_released(uuid) to authenticated;
grant execute on function public.override_petty_cash_release_schedule(uuid, text) to authenticated;

-- Original scheduled dates are retained for traceability, while daily room
-- reflects the date cash actually leaves custody.
create or replace function public.schedule_petty_cash_releases(p_request_id uuid, p_actor uuid)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.petty_cash_requests;
  budget public.department_fiscal_budgets;
  schedule_day date;
  remaining numeric;
  used_on_day numeric;
  tranche numeric;
  scheduled_total numeric := 0;
begin
  select * into request from public.petty_cash_requests where id = p_request_id for update;
  if not found then raise exception 'Petty-cash request not found' using errcode = 'P0002'; end if;
  select * into budget from public.department_fiscal_budgets where id = request.fiscal_budget_id and status = 'locked' for update;
  if not found then raise exception 'The annual department budget is no longer open' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended('eflow:cash-release:' || request.org_id::text, 0));
  delete from public.petty_cash_releases where request_id = request.id and status = 'scheduled';
  schedule_day := greatest(current_date, coalesce(request.needed_by, current_date));
  remaining := coalesce(request.approved_amount, request.requested_amount);
  while remaining > 0 loop
    select coalesce(sum(amount), 0) into used_on_day
    from public.petty_cash_releases
    where org_id = request.org_id and (
      (status = 'scheduled' and scheduled_date = schedule_day)
      or (status = 'released' and coalesce(released_at::date, scheduled_date) = schedule_day)
    );
    tranche := least(remaining, greatest(0, budget.daily_petty_cash_release_limit - used_on_day));
    if tranche > 0 then
      insert into public.petty_cash_releases(request_id, org_id, scheduled_date, amount, recipient_id, created_by)
      values (request.id, request.org_id, schedule_day, tranche, coalesce(request.cash_recipient_id, request.requester_id), p_actor);
      scheduled_total := scheduled_total + tranche;
      remaining := remaining - tranche;
    end if;
    if remaining > 0 then schedule_day := schedule_day + 1; end if;
  end loop;
  update public.petty_cash_requests set scheduled_amount = scheduled_total,
    status = 'scheduled_for_release', updated_at = now() where id = request.id;
  return scheduled_total;
end;
$$;

create or replace function public.department_budget_summary(p_org_id uuid, p_fiscal_year int)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  budget public.department_fiscal_budgets;
  committed numeric := 0;
  spent numeric := 0;
  petty_reserved numeric := 0;
  released_today numeric := 0;
  scheduled_today numeric := 0;
begin
  if auth.uid() is null or not public.can_view_department_budget(p_org_id, auth.uid()) then raise exception 'Budget access denied' using errcode = '42501'; end if;
  select * into budget from public.department_fiscal_budgets where org_id = p_org_id and fiscal_year = p_fiscal_year;
  if not found then return null; end if;
  select coalesce(sum(amount), 0) into committed from public.budget_commitments where fiscal_budget_id = budget.id and status = 'active';
  select coalesce(sum(actual_spent), 0) into spent from public.petty_cash_requests where fiscal_budget_id = budget.id and status = 'settled';
  select coalesce(sum(case when status = 'settled' then 0 else greatest(coalesce(approved_amount, 0) - coalesce(actual_spent, 0) - coalesce(returned_amount, 0), 0) end), 0)
  into petty_reserved from public.petty_cash_requests where fiscal_budget_id = budget.id
    and status in ('approved','scheduled_for_release','partially_released','released','liquidation_submitted','pending_leader_liquidation_review','pending_department_settlement','changes_requested','overdue_liquidation');
  select coalesce(sum(amount), 0) into released_today from public.petty_cash_releases where org_id = p_org_id and coalesce(released_at::date, scheduled_date) = current_date and status = 'released';
  select coalesce(sum(amount), 0) into scheduled_today from public.petty_cash_releases where org_id = p_org_id and scheduled_date = current_date and status = 'scheduled';
  return jsonb_build_object(
    'id', budget.id, 'orgId', budget.org_id, 'fiscalYear', budget.fiscal_year, 'status', budget.status,
    'approvedAmount', budget.approved_amount, 'committedAmount', committed, 'spentAmount', spent,
    'availableAmount', greatest(0, budget.approved_amount - committed), 'commitmentRemaining', greatest(0, committed - spent),
    'dailyPettyCashReleaseLimit', budget.daily_petty_cash_release_limit, 'perReceiptLimit', budget.per_receipt_limit,
    'liquidationDueDays', budget.liquidation_due_days, 'allowReceiptLimitOverride', budget.allow_receipt_limit_override,
    'releasedToday', released_today, 'scheduledToday', scheduled_today,
    'dailyReleaseRemaining', greatest(0, budget.daily_petty_cash_release_limit - released_today - scheduled_today),
    'pettyCashLimit', budget.daily_petty_cash_release_limit, 'pettyCashRequestLimit', budget.per_receipt_limit,
    'pettyCashReserved', petty_reserved, 'pettyCashSpent', spent,
    'pettyCashAvailable', greatest(0, budget.daily_petty_cash_release_limit - released_today - scheduled_today),
    'underutilizationThreshold', budget.underutilization_threshold, 'notes', budget.notes,
    'lockedAt', budget.locked_at, 'updatedAt', budget.updated_at
  );
end;
$$;

notify pgrst, 'reload schema';
commit;
