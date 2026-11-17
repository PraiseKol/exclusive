import { randomUUID } from 'node:crypto'
import { paystackConfigured, transfer } from '@/lib/paystack'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Admin only: pays a requested payout through Paystack Transfers (needs Transfers enabled on your Paystack account).
export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
  const { data: flags } = await sb.from('account_flags').select('is_admin').eq('id', user.id).maybeSingle()
  if (!flags?.is_admin) return Response.json({ error: 'Not allowed.' }, { status: 403 })
  if (!paystackConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ error: 'Payments are not set up.' }, { status: 501 })

  const { payoutId } = await req.json().catch(() => ({}))
  const admin = adminClient()
  const { data: p } = await admin.from('payouts').select('id,user_id,amount_kobo,status').eq('id', payoutId).maybeSingle()
  if (!p || p.status !== 'requested') return Response.json({ error: 'That payout is no longer waiting.' }, { status: 400 })
  const { data: acct } = await admin.from('payout_accounts').select('recipient_code').eq('user_id', p.user_id).maybeSingle()
  if (!acct) return Response.json({ error: 'This person has no payout account.' }, { status: 400 })

  const ref = `exl_po_${randomUUID().replace(/-/g, '')}`
  const t = await transfer(p.amount_kobo, acct.recipient_code, 'Exclusive payout', ref)
  if (!t.ok) return Response.json({ error: t.message || 'The transfer failed.' }, { status: 502 })
  if (!['success', 'pending', 'processing'].includes(t.data?.status)) return Response.json({ error: 'Paystack needs approval for this transfer in your dashboard.' }, { status: 409 })

  await admin.from('payouts').update({ status: 'paid', paystack_reference: ref, resolved_at: new Date().toISOString() }).eq('id', p.id)
  await admin.from('notifications').insert({ user_id: p.user_id, type: 'payment_received', body: 'Your payout has been sent.' })
  return Response.json({ ok: true })
}
