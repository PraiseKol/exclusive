'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { PAYOUT_MIN_KOBO, SLOT_COMMISSION, SLOT_HOLD_DAYS, SLOT_PRICE, money } from '@/lib/plans'
import { ago, errMsg } from '@/lib/util'

type Props = {
  me: { premium_tier: number; tip_jar_enabled: boolean; paid_slots_enabled: boolean; slot_price_kobo: number | null }
  balance: { earned: number; released: number; pending: number; nextRelease: string | null; withdrawn: number }
  earnings: any[]; account: { bank_name: string; account_name: string; account_last4: string } | null; payouts: any[]
}

export function MonetizationView({ me, balance, earnings, account, payouts }: Props) {
  const sb = createClient()
  const router = useRouter()
  const available = Math.max(0, balance.released - balance.withdrawn)
  const day = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const [price, setPrice] = useState(me.slot_price_kobo ? String(me.slot_price_kobo / 100) : '')
  const [banks, setBanks] = useState<{ name: string; code: string }[] | null>(null)
  const [bank, setBank] = useState('')
  const [num, setNum] = useState('')
  const [busy, setBusy] = useState(false)
  const [amount, setAmount] = useState(String(Math.max(PAYOUT_MIN_KOBO, 0) / 100))
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    if (account && !editing) return
    fetch('/api/payout/banks').then((r) => r.json()).then((j) => setBanks(j.banks ?? [])).catch(() => setBanks([]))
  }, [account, editing])

  async function flag(col: 'tip_jar_enabled' | 'paid_slots_enabled', value: boolean) {
    const update: Record<string, unknown> = { [col]: value }
    if (col === 'paid_slots_enabled' && value) {
      const kobo = Math.round(Number(price) * 100)
      if (!(kobo >= SLOT_PRICE.minKobo && kobo <= SLOT_PRICE.maxKobo)) return toastErr(`Set a price between ${money(SLOT_PRICE.minKobo)} and ${money(SLOT_PRICE.maxKobo)} first.`)
      update.slot_price_kobo = kobo
    }
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await sb.from('profiles').update(update).eq('id', user!.id)
    if (error) return toastErr(errMsg(error))
    toast(value ? 'Turned on' : 'Turned off'); router.refresh()
  }
  async function savePrice() {
    const kobo = Math.round(Number(price) * 100)
    if (!(kobo >= SLOT_PRICE.minKobo && kobo <= SLOT_PRICE.maxKobo)) return toastErr(`Price must be between ${money(SLOT_PRICE.minKobo)} and ${money(SLOT_PRICE.maxKobo)}.`)
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await sb.from('profiles').update({ slot_price_kobo: kobo }).eq('id', user!.id)
    if (error) return toastErr(errMsg(error))
    toast('Price saved'); router.refresh()
  }
  async function saveAccount() {
    setBusy(true)
    const res = await fetch('/api/payout/account', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ bankCode: bank, bankName: banks?.find((b) => b.code === bank)?.name, accountNumber: num }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toastErr(j.error || 'Could not save the account.')
    setNum(''); setEditing(false); toast('Payout account saved'); router.refresh()
  }
  async function requestPayout() {
    const kobo = Math.round(Number(amount) * 100)
    const { error } = await sb.rpc('request_payout', { p_amount: kobo })
    if (error) return toastErr(errMsg(error))
    toast('Payout requested. We’ll process it soon.'); router.refresh()
  }

  const slotsOk = me.premium_tier >= 1, tipOk = me.premium_tier >= 2
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Monetization</h2>

      <section className="plan cur" style={{ padding: 16 }}>
        <div className="sub">Available to withdraw</div>
        <div style={{ fontSize: 28, fontWeight: 600 }}>{money(available)}</div>
        <div className="sub" style={{ fontSize: 13 }}>Total earned {money(balance.earned)} · Requested or paid out {money(balance.withdrawn)}</div>
        {balance.pending > 0 && (
          <div className="sub" style={{ fontSize: 13, marginTop: 8 }}>
            <b style={{ fontWeight: 500 }}>Pending {money(balance.pending)}</b>{balance.nextRelease ? ` · next release on ${day(balance.nextRelease)}` : ''}
          </div>
        )}
        <div className="sub" style={{ fontSize: 12, marginTop: 8 }}>Tips are available straight away. Mentee slot earnings are released {SLOT_HOLD_DAYS} days after the mentee pays, in case of a refund.</div>
      </section>

      <section>
        <b style={{ fontWeight: 500 }}>Tip Jar</b>
        <p className="sub" style={{ margin: '4px 0 8px' }}>Let people send you small tips. You keep the full amount.</p>
        {!tipOk && <p className="tip">Tip Jar needs <Link className="lk" href="/premium">Premium Tier 2</Link>.</p>}
        <button className={'pill' + (me.tip_jar_enabled ? ' on' : '')} disabled={!tipOk} onClick={() => flag('tip_jar_enabled', !me.tip_jar_enabled)}>{me.tip_jar_enabled ? 'On' : 'Off'}</button>
      </section>

      <section>
        <b style={{ fontWeight: 500 }}>Paid mentee slots</b>
        <p className="sub" style={{ margin: '4px 0 8px' }}>Charge people for a place among your mentees. They pay only after you accept their request. The platform keeps {SLOT_COMMISSION * 100}%.</p>
        {!slotsOk && <p className="tip">Paid slots need <Link className="lk" href="/premium">Premium</Link>.</p>}
        <label className="lab">Price per mentee slot (₦)
          <input className="t" type="number" inputMode="numeric" min={SLOT_PRICE.minKobo / 100} max={SLOT_PRICE.maxKobo / 100} value={price} onChange={(e) => setPrice(e.target.value)} disabled={!slotsOk} />
        </label>
        <div style={{ display: 'flex', gap: 10, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className={'pill' + (me.paid_slots_enabled ? ' on' : '')} disabled={!slotsOk} onClick={() => flag('paid_slots_enabled', !me.paid_slots_enabled)}>{me.paid_slots_enabled ? 'On' : 'Off'}</button>
          {me.paid_slots_enabled && <button className="btn sec" onClick={savePrice}>Update price</button>}
          {price && Number(price) > 0 && <span className="sub" style={{ fontSize: 13 }}>You’d receive {money(Math.round(Number(price) * 100 * (1 - SLOT_COMMISSION)))} per slot</span>}
        </div>
      </section>

      <section>
        <b style={{ fontWeight: 500 }}>Payout account</b>
        {account && !editing ? (
          <div className="row" style={{ padding: '8px 0' }}>
            <div className="grow">{account.account_name}<div className="sub">{account.bank_name} · ••••{account.account_last4}</div></div>
            <button className="lk" onClick={() => setEditing(true)}>Change</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
            <select aria-label="Bank" value={bank} onChange={(e) => setBank(e.target.value)}>
              <option value="">{banks === null ? 'Loading banks…' : 'Choose your bank'}</option>
              {(banks ?? []).map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
            </select>
            <input className="t" inputMode="numeric" maxLength={10} placeholder="10-digit account number" value={num} onChange={(e) => setNum(e.target.value.replace(/\D/g, ''))} />
            <p className="sub" style={{ margin: 0, fontSize: 13 }}>We verify the account name with your bank. Your full account number is not stored by us.</p>
            <div className="fr" style={{ justifyContent: 'flex-start' }}>
              <button className="btn" disabled={busy || !bank || num.length !== 10} onClick={saveAccount}>{busy ? 'Verifying…' : 'Save account'}</button>
              {account && <button className="btn sec" onClick={() => setEditing(false)}>Cancel</button>}
            </div>
          </div>
        )}
      </section>

      <section>
        <b style={{ fontWeight: 500 }}>Withdraw</b>
        <p className="sub" style={{ margin: '4px 0 8px' }}>Minimum {money(PAYOUT_MIN_KOBO)}. Payouts are reviewed and sent to your account.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="t" type="number" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount to withdraw (₦)" />
          <button className="btn" disabled={!account || available < PAYOUT_MIN_KOBO} onClick={requestPayout}>Request payout</button>
        </div>
        {payouts.map((p) => (
          <div key={p.id} className="row" style={{ padding: '8px 0' }}>
            <div className="grow">{money(p.amount_kobo)}<div className="sub">{ago(p.requested_at)} ago</div></div>
            <span className="chip">{p.status}</span>
          </div>
        ))}
      </section>

      <section>
        <b style={{ fontWeight: 500 }}>Earnings</b>
        {earnings.length === 0 && <p className="sub">Nothing yet. Tips and paid mentee slots will appear here.</p>}
        {earnings.map((e) => (
          <div key={e.id} className="row" style={{ padding: '8px 0' }}>
            <div className="grow">{e.kind === 'tip' ? 'Tip' : 'Mentee slot'}{e.from?.display_name ? ` from ${e.from.display_name}` : ''}<div className="sub">{ago(e.created_at)} ago{e.fee_kobo > 0 ? ` · fee ${money(e.fee_kobo)}` : ''}{new Date(e.available_at) > new Date() ? ` · releases ${day(e.available_at)}` : ''}</div></div>
            <b style={{ fontWeight: 500 }}>+{money(e.net_kobo)}</b>{new Date(e.available_at) > new Date() && <span className="chip" style={{ marginLeft: 8 }}>Pending</span>}
          </div>
        ))}
      </section>
    </div>
  )
}
