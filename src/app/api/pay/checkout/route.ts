import { randomUUID } from 'node:crypto'
import { ORG_PLANS, PREMIUM_PLANS, SLOT_PRICE, TIP } from '@/lib/plans'
import { initializeTransaction, paystackConfigured } from '@/lib/paystack'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Starts a payment. The amount is always worked out on the server from the plan or the mentor's price, never trusted from the browser.
export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user || !user.email) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
  if (!paystackConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY)
    return Response.json({ error: 'Payments are not set up yet. Please try again later.' }, { status: 501 })

  const b = await req.json().catch(() => ({}))
  const row: Record<string, unknown> = { user_id: user.id, kind: b.kind }
  let amount = 0

  if (b.kind === 'premium') {
    const tier = Number(b.tier)
    if (tier !== 1 && tier !== 2) return Response.json({ error: 'Choose a plan.' }, { status: 400 })
    // A lower plan can't be bought while a higher one is still running (renewing and upgrading are fine).
    const { data: sub } = await sb.from('subscriptions').select('tier,expires_at').eq('user_id', user.id).maybeSingle()
    if (sub && sub.tier > tier && new Date(sub.expires_at) > new Date()) {
      const until = new Date(sub.expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      return Response.json({ error: `You’re on Premium Tier ${sub.tier} until ${until}. You can choose a lower plan after that.` }, { status: 400 })
    }
    amount = PREMIUM_PLANS[tier].priceKobo; row.tier = tier
  } else if (b.kind === 'org_premium') {
    const tier = Number(b.tier)
    if (![1, 2, 3].includes(tier)) return Response.json({ error: 'Choose a plan.' }, { status: 400 })
    const { data: org } = await sb.from('organizations').select('id,owner_id,tier,tier_expires_at').eq('id', b.orgId).maybeSingle()
    if (!org || org.owner_id !== user.id) return Response.json({ error: 'Only the organization owner can change its plan.' }, { status: 403 })
    // Same rule as Premium: a lower plan can't replace a higher one that is still running.
    if (org.tier > tier && org.tier_expires_at && new Date(org.tier_expires_at) > new Date()) {
      const until = new Date(org.tier_expires_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
      return Response.json({ error: `This organization is on Tier ${org.tier} until ${until}. You can choose a lower plan after that.` }, { status: 400 })
    }
    amount = ORG_PLANS[tier as 1 | 2 | 3].priceKobo; row.tier = tier; row.target_org = org.id
  } else if (b.kind === 'tip') {
    const target = String(b.targetUser ?? '')
    const kobo = Math.round(Number(b.amountKobo))
    if (target === user.id) return Response.json({ error: 'You can’t tip yourself.' }, { status: 400 })
    if (!(kobo >= TIP.minKobo && kobo <= TIP.maxKobo)) return Response.json({ error: 'That tip amount isn’t allowed.' }, { status: 400 })
    const { data: p } = await sb.from('profiles').select('id,tip_jar_enabled,premium_tier').eq('id', target).maybeSingle()
    if (!p || !p.tip_jar_enabled) return Response.json({ error: 'This person isn’t accepting tips right now.' }, { status: 400 })
    amount = kobo; row.target_user = p.id; row.message = String(b.message ?? '').slice(0, 140) || null
  } else if (b.kind === 'slot') {
    const { data: c } = await sb.from('connections').select('id,mentor_id,mentee_id,status').eq('id', b.connId).maybeSingle()
    if (!c || c.mentee_id !== user.id || c.status !== 'awaiting_payment') return Response.json({ error: 'There is nothing to pay for here.' }, { status: 400 })
    const { data: m } = await sb.from('profiles').select('slot_price_kobo').eq('id', c.mentor_id).maybeSingle()
    const kobo = Number(m?.slot_price_kobo)
    if (!(kobo >= SLOT_PRICE.minKobo)) return Response.json({ error: 'The mentor has not set a price.' }, { status: 400 })
    amount = kobo; row.target_user = c.mentor_id; row.target_conn = c.id
  } else {
    return Response.json({ error: 'Unknown payment type.' }, { status: 400 })
  }

  const reference = `exl_${randomUUID().replace(/-/g, '')}`
  const admin = adminClient()
  const { error } = await admin.from('payments').insert({ ...row, amount_kobo: amount, reference })
  if (error) return Response.json({ error: 'Could not start the payment. Please try again.' }, { status: 500 })

  const origin = new URL(req.url).origin
  const init = await initializeTransaction({ email: user.email, amountKobo: amount, reference, callbackUrl: `${origin}/api/pay/return`, metadata: { kind: b.kind, user_id: user.id } })
  if (!init.ok || !init.data?.authorization_url) {
    await admin.from('payments').update({ status: 'failed' }).eq('reference', reference)
    return Response.json({ error: 'The payment provider could not start the payment. Please try again.' }, { status: 502 })
  }
  return Response.json({ url: init.data.authorization_url })
}
