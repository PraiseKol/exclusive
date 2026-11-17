import 'server-only'
import { adminClient } from './supabase/admin'
import { verifyTransaction } from './paystack'

/** Confirms a payment with Paystack, then applies it in the database. Safe to call many times (it is idempotent). */
export async function confirmAndApply(reference: string): Promise<'ok' | 'already' | 'failed' | 'unknown'> {
  const v = await verifyTransaction(reference)
  if (!v.ok || v.data?.status !== 'success' || v.data.currency !== 'NGN') return 'failed'
  const { data } = await adminClient().rpc('apply_payment', { p_reference: reference, p_amount_kobo: v.data.amount })
  return (data as string) === 'amount_mismatch' ? 'failed' : (data as 'ok' | 'already' | 'unknown')
}
