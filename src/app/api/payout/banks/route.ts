import { listBanks, paystackConfigured } from '@/lib/paystack'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
  if (!paystackConfigured()) return Response.json({ error: 'Payouts are not set up yet.' }, { status: 501 })
  const r = await listBanks()
  if (!r.ok) return Response.json({ error: 'Could not load banks. Please try again.' }, { status: 502 })
  return Response.json({ banks: r.data.map((b) => ({ name: b.name, code: b.code })) })
}
