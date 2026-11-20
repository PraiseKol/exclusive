import { MonetizationView } from './MonetizationView'
import { createClient } from '@/lib/supabase/server'

export default async function Monetization() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ data: me }, { data: bal }, { data: earnings }, { data: acct }, { data: payouts }] = await Promise.all([
    sb.from('profiles').select('premium_tier,tip_jar_enabled,paid_slots_enabled,slot_price_kobo').eq('id', user!.id).single(),
    sb.rpc('my_balance'),
    sb.from('earnings').select('id,kind,gross_kobo,fee_kobo,net_kobo,created_at,available_at,refunded_at,from:profiles!earnings_from_user_fkey(display_name)').order('created_at', { ascending: false }).limit(30),
    sb.from('payout_accounts').select('bank_name,account_name,account_last4').eq('user_id', user!.id).maybeSingle(),
    sb.from('payouts').select('id,amount_kobo,status,requested_at').order('requested_at', { ascending: false }).limit(10),
  ])
  return (
    <MonetizationView me={me as any} balance={{ earned: Number((bal as any)?.earned ?? 0), released: Number((bal as any)?.released ?? 0), pending: Number((bal as any)?.pending ?? 0), nextRelease: ((bal as any)?.next_release_at as string | null) ?? null, withdrawn: Number((bal as any)?.withdrawn ?? 0) }}
      earnings={(earnings ?? []) as any[]} account={acct as any} payouts={(payouts ?? []) as any[]} />
  )
}
