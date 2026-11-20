-- 1) Earnings can be held until a release date. Tips release at once; mentee-slot money after 7 days.
alter table public.earnings add column if not exists available_at timestamptz not null default now();
update public.earnings set available_at = created_at + interval '7 days' where kind = 'slot';
create index if not exists earnings_user_release_idx on public.earnings (user_id, available_at);

-- 2) Balance split: released (withdrawable) vs pending, plus when the next amount unlocks.
create or replace function public.my_balance()
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
  select jsonb_build_object(
    'earned',   coalesce((select sum(net_kobo) from public.earnings where user_id = auth.uid()), 0),
    'released', coalesce((select sum(net_kobo) from public.earnings where user_id = auth.uid() and available_at <= now()), 0),
    'pending',  coalesce((select sum(net_kobo) from public.earnings where user_id = auth.uid() and available_at > now()), 0),
    'next_release_at', (select min(available_at) from public.earnings where user_id = auth.uid() and available_at > now()),
    'withdrawn', coalesce((select sum(amount_kobo) from public.payouts where user_id = auth.uid() and status in ('requested','paid')), 0)); $function$;

-- 3) Payout requests only count released earnings.
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
  perform pg_advisory_xact_lock(hashtextextended('payout:' || uid::text, 0));
  if exists (select 1 from public.account_flags where id = uid and suspended_at is not null) then raise exception 'Your account is suspended'; end if;
  if not exists (select 1 from public.payout_accounts where user_id = uid) then raise exception 'Add a payout account first'; end if;
  if exists (select 1 from public.payouts where user_id = uid and status = 'requested') then raise exception 'You already have a payout waiting to be processed'; end if;
  select coalesce(sum(net_kobo), 0) into earned from public.earnings where user_id = uid and available_at <= now();
  select coalesce(sum(amount_kobo), 0) into used from public.payouts where user_id = uid and status in ('requested','paid');
  if p_amount > earned - used then raise exception 'That is more than your available balance. Mentee slot earnings are released 7 days after payment.'; end if;
  insert into public.payouts (user_id, amount_kobo) values (uid, p_amount) returning id into pid;
  return pid;
end $function$;

-- 4) apply_payment: slot earnings held 7 days; a lower plan can never replace an active higher one
--    (that payment is kept aside and flagged for refund instead).
create or replace function public.apply_payment(p_reference text, p_amount_kobo bigint)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare p public.payments; c public.connections; fee bigint; exp timestamptz;
        cur_tier int; cur_exp timestamptz;
begin
  select * into p from public.payments where reference = p_reference for update;
  if not found then return 'unknown'; end if;
  if p.status = 'success' then return 'already'; end if;
  if p.amount_kobo <> p_amount_kobo then
    update public.payments set status = 'failed' where id = p.id;
    return 'amount_mismatch';
  end if;

  if p.kind = 'premium' then
    select tier, expires_at into cur_tier, cur_exp from public.subscriptions where user_id = p.user_id for update;
    if found and cur_exp > now() and cur_tier > p.tier then
      update public.payments set needs_refund = true where id = p.id;
      insert into public.notifications (user_id, type, body) values (p.user_id, 'premium',
        'You are already on Premium Tier ' || cur_tier || ', so your Tier ' || p.tier || ' payment was not applied. It will be refunded.');
    else
      insert into public.subscriptions (user_id, tier, expires_at) values (p.user_id, p.tier, now() + interval '30 days')
      on conflict (user_id) do update set tier = excluded.tier,
        expires_at = greatest(public.subscriptions.expires_at, now()) + interval '30 days', updated_at = now();
      update public.profiles set premium_tier = p.tier where id = p.user_id;
      insert into public.notifications (user_id, type, body) values (p.user_id, 'premium', 'Your Premium Tier ' || p.tier || ' plan is active for 30 days. Thank you!');
    end if;

  elsif p.kind = 'org_premium' then
    update public.organizations set tier = p.tier, tier_expires_at = greatest(coalesce(tier_expires_at, now()), now()) + interval '30 days' where id = p.target_org;
    insert into public.notifications (user_id, type, body) values (p.user_id, 'premium', 'Your organization plan is active for 30 days.');

  elsif p.kind = 'tip' then
    insert into public.earnings (user_id, payment_id, kind, gross_kobo, fee_kobo, net_kobo, from_user, available_at)
    values (p.target_user, p.id, 'tip', p.amount_kobo, 0, p.amount_kobo, p.user_id, now());
    insert into public.notifications (user_id, actor_id, type, body)
    values (p.target_user, p.user_id, 'tip', 'sent you a tip of NGN ' || (p.amount_kobo / 100)::text || coalesce(': ' || nullif(p.message, ''), ''));

  elsif p.kind = 'slot' then
    select * into c from public.connections where id = p.target_conn for update;
    if found and c.status = 'awaiting_payment' then
      exp := case when c.expires_at = 'infinity' then c.expires_at else c.expires_at + (now() - c.started_at) end;
      update public.connections set status = 'active', started_at = now(), expires_at = exp, reminder_sent = false where id = c.id;
      fee := round(p.amount_kobo * 0.10);
      insert into public.earnings (user_id, payment_id, kind, gross_kobo, fee_kobo, net_kobo, from_user, available_at)
      values (p.target_user, p.id, 'slot', p.amount_kobo, fee, p.amount_kobo - fee, p.user_id, now() + interval '7 days');
      insert into public.notifications (user_id, actor_id, type, body) values (p.target_user, p.user_id, 'payment_received', 'paid for their mentee slot. The mentorship is now active. The money is released to your balance in 7 days.');
    else
      update public.payments set needs_refund = true where id = p.id;  -- the mentorship was cancelled before payment arrived
    end if;
  end if;

  update public.payments set status = 'success', paid_at = now() where id = p.id;
  return 'ok';
end $function$;
