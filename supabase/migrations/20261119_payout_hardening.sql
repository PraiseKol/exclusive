-- request_payout: serialize per person (no double requests), reject null amounts and suspended accounts.
create or replace function public.request_payout(p_amount bigint)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare uid uuid := auth.uid(); earned bigint; used bigint; pid uuid;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_amount is null or p_amount < 500000 then raise exception 'The minimum payout is NGN 5,000'; end if;
  -- one request at a time per person, even if two arrive together
  perform pg_advisory_xact_lock(hashtextextended('payout:' || uid::text, 0));
  if exists (select 1 from public.account_flags where id = uid and suspended_at is not null) then raise exception 'Your account is suspended'; end if;
  if not exists (select 1 from public.payout_accounts where user_id = uid) then raise exception 'Add a payout account first'; end if;
  if exists (select 1 from public.payouts where user_id = uid and status = 'requested') then raise exception 'You already have a payout waiting to be processed'; end if;
  select coalesce(sum(net_kobo), 0) into earned from public.earnings where user_id = uid;
  select coalesce(sum(amount_kobo), 0) into used from public.payouts where user_id = uid and status in ('requested','paid');
  if p_amount > earned - used then raise exception 'That is more than your available balance'; end if;
  insert into public.payouts (user_id, amount_kobo) values (uid, p_amount) returning id into pid;
  return pid;
end $function$;

-- admin_mark_payout: only notify (and only succeed) when a waiting payout was actually updated.
create or replace function public.admin_mark_payout(p_id uuid, p_status text, p_ref text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare owner uuid;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  if p_status not in ('paid','failed','cancelled') then raise exception 'Invalid status'; end if;
  update public.payouts set status = p_status, paystack_reference = coalesce(p_ref, paystack_reference), resolved_at = now()
    where id = p_id and status = 'requested' returning user_id into owner;
  if owner is null then raise exception 'That payout is no longer waiting'; end if;
  insert into public.notifications (user_id, type, body)
  values (owner, 'payment_received', case p_status when 'paid' then 'Your payout has been sent.' else 'Your payout request could not be completed. Please contact support.' end);
end $function$;
