import { NextResponse } from 'next/server'
import { confirmAndApply } from '@/lib/payments'
import { adminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Where the person lands after paying. We confirm with Paystack right away (in case the webhook is slow), then send them back.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const reference = url.searchParams.get('reference') ?? url.searchParams.get('trxref') ?? ''
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin))
  if (!reference) return to('/home')

  const result = await confirmAndApply(reference).catch(() => 'failed' as const)
  const ok = result === 'ok' || result === 'already'
  const { data: p } = await adminClient().from('payments').select('kind,target_user,target_org').eq('reference', reference).maybeSingle()
  const q = `?paid=${ok ? 1 : 0}`
  if (p?.kind === 'premium') return to('/premium' + q)
  if (p?.kind === 'org_premium' && p.target_org) return to(`/org/${p.target_org}${q}`)
  if (p?.kind === 'tip' && p.target_user) return to(`/profile/${p.target_user}${q}`)
  if (p?.kind === 'slot') return to('/circles' + q)
  return to('/home')
}
