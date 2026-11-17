import { PlanCards } from './PlanCards'
import { createClient } from '@/lib/supabase/server'

export default async function Premium() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ data: me }, { data: sub }] = await Promise.all([
    sb.from('profiles').select('premium_tier').eq('id', user!.id).single(),
    sb.from('subscriptions').select('tier,expires_at').eq('user_id', user!.id).maybeSingle(),
  ])
  return (
    <div style={{ padding: 20 }}>
      <div className="prem" style={{ borderRadius: 12 }}>
        <b>💎 Go Premium. Go Further.</b>
        {me?.premium_tier ? `You are on Premium Tier ${me.premium_tier}${sub ? ` until ${new Date(sub.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.` : 'Unlock exclusive mentors, advanced tools and priority support for your growth journey.'}
      </div>
      <PlanCards tier={me?.premium_tier ?? 0} expires={sub?.expires_at ?? null} />
    </div>
  )
}
