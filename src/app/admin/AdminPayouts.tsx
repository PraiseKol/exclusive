'use client'
import { useCallback, useEffect, useState } from 'react'
import { toast, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { money } from '@/lib/plans'
import { ago, errMsg } from '@/lib/util'

export function AdminPayouts() {
  const sb = createClient()
  const [rows, setRows] = useState<any[] | null>(null)
  const [busy, setBusy] = useState('')
  const [refunds, setRefunds] = useState<any[]>([])

  const load = useCallback(async () => {
    const { data, error } = await sb.rpc('admin_list_payouts', { p_status: 'requested' })
    if (error) return toastErr(errMsg(error))
    setRows((data as any[]) ?? [])
    const { data: rf } = await sb.from('payments').select('id,reference,amount_kobo,created_at,user:profiles!payments_user_id_fkey(display_name)').eq('needs_refund', true).order('created_at', { ascending: false }).limit(50)
    setRefunds(rf ?? [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  async function viaPaystack(id: string) {
    if (!window.confirm('Send this payout through Paystack now?')) return
    setBusy(id)
    const res = await fetch('/api/admin/payout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payoutId: id }) })
    const j = await res.json().catch(() => ({}))
    setBusy('')
    if (!res.ok) return toastErr(j.error || 'The transfer failed.')
    toast('Payout sent'); load()
  }
  async function mark(id: string, status: 'paid' | 'failed') {
    if (!window.confirm(status === 'paid' ? 'Mark as paid (you paid it yourself)?' : 'Reject this payout request?')) return
    const { error } = await sb.rpc('admin_mark_payout', { p_id: id, p_status: status })
    if (error) return toastErr(errMsg(error))
    toast('Updated'); load()
  }

  async function clearRefund(id: string) {
    const { error } = await sb.rpc('admin_clear_refund', { p_id: id })
    if (error) return toastErr(errMsg(error))
    toast('Marked as handled'); load()
  }

  return (
    <>
      {refunds.length > 0 && (
        <section className="tip" style={{ margin: '12px 0' }}>
          <b style={{ fontWeight: 500 }}>Refunds needed</b>
          <div style={{ fontSize: 13, margin: '4px 0 8px' }}>These people paid for a mentorship that was cancelled before payment arrived. Refund them in your Paystack dashboard using the reference, then mark it handled.</div>
          {refunds.map((r) => (
            <div key={r.id} className="row" style={{ padding: '4px 0' }}>
              <div className="grow" style={{ whiteSpace: 'normal' }}>{r.user?.display_name} · {money(r.amount_kobo)}<div className="sub" style={{ whiteSpace: 'normal' }}>{r.reference}</div></div>
              <button className="btn sec" onClick={() => clearRefund(r.id)}>Handled</button>
            </div>
          ))}
        </section>
      )}
      {rows === null && <div className="empty">Loading…</div>}
      {rows?.length === 0 && <div className="empty">No payouts waiting.</div>}
      {rows?.map((p) => (
        <article key={p.id} className="post" style={{ border: '1px solid var(--n200)', borderRadius: 12, margin: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
            <b style={{ fontWeight: 500 }}>{p.user_name} · {money(p.amount_kobo)}</b>
            <span className="sub">{ago(p.requested_at)} ago</span>
          </div>
          <div className="sub">{p.account_name ? `${p.account_name} · ${p.bank_name} · ••••${p.account_last4}` : 'No payout account'}</div>
          <div className="fr" style={{ justifyContent: 'flex-start', marginTop: 10, flexWrap: 'wrap' }}>
            <button className="btn" disabled={busy === p.id || !p.account_name} onClick={() => viaPaystack(p.id)}>Pay via Paystack</button>
            <button className="btn sec" onClick={() => mark(p.id, 'paid')}>Mark paid (manual)</button>
            <button className="btn sec" onClick={() => mark(p.id, 'failed')}>Reject</button>
          </div>
        </article>
      ))}
    </>
  )
}
