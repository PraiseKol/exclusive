import { createHmac, timingSafeEqual } from 'node:crypto'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Paystack tells us when a payment succeeds. We check the signature before trusting anything in the message.
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
  if (event?.event === 'charge.success' && event.data?.status === 'success' && event.data?.currency === 'NGN') {
    await adminClient().rpc('apply_payment', { p_reference: String(event.data.reference), p_amount_kobo: Number(event.data.amount) })
  }
  return new Response('ok')
}
