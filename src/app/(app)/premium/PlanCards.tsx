'use client'
import { useState } from 'react'
import { startCheckout } from '@/lib/checkout'
import { PERIOD_DAYS, PREMIUM_PLANS, money } from '@/lib/plans'

const STANDARD = ['5 mentor slots and 30 mentee slots', '1 emergency and 2 important DMs a month', 'Global Post: one at a time, kept as a draft when replaced']

export function PlanCards({ tier, expires }: { tier: number; expires: string | null }) {
  const [busy, setBusy] = useState<number | null>(null)
  async function buy(t: 1 | 2) {
    setBusy(t)
    const ok = await startCheckout({ kind: 'premium', tier: t })
    if (!ok) setBusy(null)
  }
  const Card = ({ t }: { t: 1 | 2 }) => {
    const plan = PREMIUM_PLANS[t]
    const current = tier === t
    return (
      <div className={'plan' + (current ? ' cur' : '')} style={{ padding: 16 }}>
        <div className="planh"><b style={{ fontWeight: 500, fontSize: 17 }}>{plan.name}</b>{current && <span className="chip">Your plan</span>}</div>
        <div style={{ fontSize: 24, fontWeight: 600 }}>{money(plan.priceKobo)} <span className="sub" style={{ fontSize: 14, fontWeight: 400 }}>/ {PERIOD_DAYS} days</span></div>
        <ul style={{ paddingLeft: 18, margin: '10px 0' }}>{plan.perks.map((p) => <li key={p} style={{ margin: '4px 0', fontSize: 14 }}>{p}</li>)}</ul>
        <button className="btn" style={{ width: '100%', padding: 12 }} disabled={busy !== null || (tier > t)} onClick={() => buy(t)}>
          {busy === t ? 'Opening payment…' : tier > t ? 'Included in your plan' : current ? 'Renew for 30 more days' : tier > 0 ? 'Upgrade' : 'Choose ' + plan.name}
        </button>
      </div>
    )
  }
  return (
    <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
      <div className={'plan' + (tier === 0 ? ' cur' : '')} style={{ padding: 16 }}>
        <div className="planh"><b style={{ fontWeight: 500, fontSize: 17 }}>Standard</b>{tier === 0 && <span className="chip">Your plan</span>}</div>
        <div style={{ fontSize: 24, fontWeight: 600 }}>Free</div>
        <ul style={{ paddingLeft: 18, margin: '10px 0 0' }}>{STANDARD.map((p) => <li key={p} style={{ margin: '4px 0', fontSize: 14 }}>{p}</li>)}</ul>
      </div>
      <Card t={1} />
      <Card t={2} />
      <p className="sub" style={{ margin: 0, fontSize: 13 }}>
        Each payment adds {PERIOD_DAYS} days{expires && tier > 0 ? ` (your plan currently runs to ${new Date(expires).toLocaleDateString('en-GB')})` : ''}. Plans are not renewed automatically; we remind you 3 days before yours ends. Payments are handled securely by Paystack.
      </p>
    </div>
  )
}
