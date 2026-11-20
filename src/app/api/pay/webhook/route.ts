import { createHmac, timingSafeEqual } from 'node:crypto'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Paystack tells us when a payment succeeds or a payout transfer fails. We check the signature before trusting anything in the message.
// Any database failure answers 500 so Paystack retries later; a payment must never be lost because of a one-off error.
export async function POST(req: Request) {
  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) return new Response('Not configured', { status: 501 })
  const raw = await req.text()
  const given = req.headers.get('x-paystack-signature') ?? ''
  const expected = createHmac('sha512', secret).update(raw).digest('hex')
  const a = Buffer.from(given), b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return new Response('Bad signature', { status: 401 })

  let event: any
  try { event = JSON.parse(raw) } catch { return new Response('Bad request', { status: 400 }) }
  const admin = adminClient()

  if (event?.event === 'charge.success' && event.data?.status === 'success' && event.data?.currency === 'NGN') {
    const { error } = await admin.rpc('apply_payment', { p_reference: String(event.data.reference), p_amount_kobo: Number(event.data.amount) })
    if (error) return new Response('Try again', { status: 500 })
  }

  // A payout that Paystack later fails or reverses must give the money back to the person's balance.
  if ((event?.event === 'transfer.failed' || event?.event === 'transfer.reversed') && event.data?.reference) {
    const { data: p, error } = await admin.from('payouts')
      .update({ status: 'failed', resolved_at: new Date().toISOString() })
      .eq('paystack_reference', String(event.data.reference)).eq('status', 'paid')
      .select('user_id').maybeSingle()
    if (error) return new Response('Try again', { status: 500 })
    if (p) await admin.from('notifications').insert({ user_id: p.user_id, type: 'payment_received', body: 'Your payout could not be completed and the money is back in your balance. You can request it again.' })
  }
  return new Response('ok')
}
