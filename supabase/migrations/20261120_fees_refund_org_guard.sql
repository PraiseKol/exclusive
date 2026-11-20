-- 1) Minimum paid-slot price is NGN 2,000 (10% commission must cover Paystack's fee on international cards).
--    A stricter check is added next to the old one (which stays, harmlessly, at 50,000).
alter table public.profiles add constraint profiles_slot_price_min_check
  check (slot_price_kobo is null or slot_price_kobo >= 200000);

-- 2) Refunded earnings are kept for the record (zeroed and stamped) instead of being removed.
alter table public.earnings add column if not exists refunded_at timestamptz;

-- 3) apply_payment: 10% commission on tips; org plans get the same no-downgrade guard as Premium.
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
    select tier, tier_expires_at into cur_tier, cur_exp from public.organizations where id = p.target_org for update;
    if found and cur_exp > now() and cur_tier > p.tier then
      update public.payments set needs_refund = true where id = p.id;
      insert into public.notifications (user_id, type, body) values (p.user_id, 'premium',
        'Your organization is already on Tier ' || cur_tier || ', so your Tier ' || p.tier || ' payment was not applied. It will be refunded.');
    else
      update public.organizations set tier = p.tier, tier_expires_at = greatest(coalesce(tier_expires_at, now()), now()) + interval '30 days' where id = p.target_org;
      insert into public.notifications (user_id, type, body) values (p.user_id, 'premium', 'Your organization plan is active for 30 days.');
    end if;

  elsif p.kind = 'tip' then
    fee := round(p.amount_kobo * 0.10);
    insert into public.earnings (user_id, payment_id, kind, gross_kobo, fee_kobo, net_kobo, from_user, available_at)
    values (p.target_user, p.id, 'tip', p.amount_kobo, fee, p.amount_kobo - fee, p.user_id, now());
    insert into public.notifications (user_id, actor_id, type, body)
    values (p.target_user, p.user_id, 'tip', 'sent you a tip of NGN ' || (p.amount_kobo / 100)::text
      || ' (NGN ' || round((p.amount_kobo - fee) / 100.0)::text || ' after the platform fee)' || coalesce(': ' || nullif(p.message, ''), ''));

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

-- 4) Admin: list mentee-slot payments still inside the 7-day hold, and refund one in a single step.
create or replace function public.admin_list_held_slots()
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  return (select coalesce(jsonb_agg(x order by x->>'available_at'), '[]'::jsonb) from (
    select jsonb_build_object('payment_id', p.id, 'reference', p.reference, 'amount_kobo', p.amount_kobo, 'net_kobo', e.net_kobo,
      'paid_at', p.paid_at, 'available_at', e.available_at, 'mentee_name', m.display_name, 'mentor_name', u.display_name) as x
    from public.earnings e
    join public.payments p on p.id = e.payment_id
    join public.profiles u on u.id = e.user_id
    join public.profiles m on m.id = p.user_id
    where e.kind = 'slot' and e.refunded_at is null and e.available_at > now()
    order by e.available_at limit 100) t);
end $function$;

create or replace function public.admin_refund_slot(p_payment uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare p public.payments; e public.earnings;
begin
  if not private.is_admin() then raise exception 'Not allowed'; end if;
  select * into p from public.payments where id = p_payment for update;
  if not found or p.kind <> 'slot' or p.status <> 'success' then raise exception 'That is not a paid mentee slot'; end if;
  select * into e from public.earnings where payment_id = p.id for update;
  if found then
    if e.refunded_at is not null then raise exception 'This slot was already refunded'; end if;
    if e.available_at <= now() then raise exception 'This money was already released to the mentor, so it cannot be cancelled automatically'; end if;
    update public.earnings set net_kobo = 0, fee_kobo = 0, refunded_at = now() where id = e.id;
  end if;
  update public.payments set needs_refund = true where id = p.id;
  update public.connections set status = 'ended' where id = p.target_conn and status = 'active';
  insert into public.notifications (user_id, type, body) values
    (p.target_user, 'payment_received', 'A mentee slot payment was refunded, so its earnings were removed and the mentorship has ended.'),
    (p.user_id, 'payment_received', 'Your mentee slot payment is being refunded and the mentorship has ended.');
end $function$;

revoke execute on function public.admin_list_held_slots() from public, anon;
revoke execute on function public.admin_refund_slot(uuid) from public, anon;

-- 5) "Next release" ignores refunded earnings.
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
    'next_release_at', (select min(available_at) from public.earnings where user_id = auth.uid() and available_at > now() and refunded_at is null),
    'withdrawn', coalesce((select sum(amount_kobo) from public.payouts where user_id = auth.uid() and status in ('requested','paid')), 0)); $function$;
