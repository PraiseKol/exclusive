import { UpgradeButton } from '@/components/UpgradeButton'
import { createClient } from '@/lib/supabase/server'

const ROWS: [string, string, string][] = [
  ['Mentor slots', '5', '7'],
  ['Mentee slots', '30', '40'],
  ['Emergency DMs / month', '1', '2'],
  ['Important DMs / month', '2', '4'],
  ['Timed post scheduling', '—', 'Yes'],
  ['Post editing (within 2 hours)', '—', 'Yes'],
  ['Paid mentee slots', '—', 'Yes'],
  ['Premium badge + profile boost', '—', 'Yes'],
  ['Tip Jar', '—', 'Tier 2'],
  ['Restore up to 3 deleted Global Posts', '1 draft', 'Tier 2'],
  ['Second Global Post', '—', 'Tier 2'],
]

export default async function Premium() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: me } = await sb.from('profiles').select('premium_tier').eq('id', user!.id).single()
  const tier = me?.premium_tier ?? 0
  return (
    <div style={{ padding: 20 }}>
      <div className="prem" style={{ borderRadius: 12 }}>
        <b>Go Premium. Go Further.</b>
        {tier > 0 ? `You are on Premium Tier ${tier}.` : 'Unlock exclusive mentors, advanced tools and priority support for your growth journey.'}
        {tier === 0 && <div><UpgradeButton /></div>}
      </div>
      <div style={{ marginTop: 16 }}>
        <div className="row sub" style={{ padding: '6px 0' }}><span className="grow">Feature</span><span style={{ width: 70, textAlign: 'center' }}>Standard</span><span style={{ width: 70, textAlign: 'center' }}>Premium</span></div>
        {ROWS.map(([f, a, b]) => (
          <div key={f} className="row" style={{ borderTop: '.5px solid var(--n200)', fontSize: 14 }}>
            <span className="grow" style={{ whiteSpace: 'normal' }}>{f}</span>
            <span style={{ width: 70, textAlign: 'center' }} className="sub">{a}</span>
            <span style={{ width: 70, textAlign: 'center', fontWeight: 500 }}>{b}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
