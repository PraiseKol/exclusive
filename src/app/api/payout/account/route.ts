import { createRecipient, paystackConfigured, resolveAccount } from '@/lib/paystack'
import { adminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Saves where a person wants to be paid. The full account number goes straight to Paystack; we keep only a recipient code and the last 4 digits.
export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Please sign in again.' }, { status: 401 })
  if (!paystackConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ error: 'Payouts are not set up yet.' }, { status: 501 })

  const b = await req.json().catch(() => ({}))
  const number = String(b.accountNumber ?? '').replace(/\s/g, '')
  const code = String(b.bankCode ?? '')
  if (!/^\d{10}$/.test(number) || !code) return Response.json({ error: 'Enter your 10-digit account number and choose your bank.' }, { status: 400 })

  const resolved = await resolveAccount(number, code)
  if (!resolved.ok || !resolved.data?.account_name) return Response.json({ error: 'We couldn’t verify that account. Please check the details.' }, { status: 400 })
  const rec = await createRecipient(resolved.data.account_name, number, code)
  if (!rec.ok || !rec.data?.recipient_code) return Response.json({ error: 'We couldn’t save that account. Please try again.' }, { status: 502 })

  const row = { user_id: user.id, bank_name: rec.data.details?.bank_name ?? String(b.bankName ?? 'Bank'), account_name: resolved.data.account_name, account_last4: number.slice(-4), recipient_code: rec.data.recipient_code, updated_at: new Date().toISOString() }
  const { error } = await adminClient().from('payout_accounts').upsert(row)
  if (error) return Response.json({ error: 'We couldn’t save that account. Please try again.' }, { status: 500 })
  return Response.json({ bank_name: row.bank_name, account_name: row.account_name, account_last4: row.account_last4 })
}
