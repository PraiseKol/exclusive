'use client'
import { useState } from 'react'
import { startCheckout } from '@/lib/checkout'
import { TIP, TIP_COMMISSION, money } from '@/lib/plans'
import { Modal, toastErr } from './Modal'

export function TipModal({ person, onClose }: { person: { id: string; display_name: string }; onClose: () => void }) {
  const [kobo, setKobo] = useState<number>(TIP.presets[1])
  const [custom, setCustom] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const amount = custom ? Math.round(Number(custom) * 100) : kobo
  const valid = amount >= TIP.minKobo && amount <= TIP.maxKobo

  async function pay() {
    if (!valid) return toastErr(`Tips are between ${money(TIP.minKobo)} and ${money(TIP.maxKobo)}.`)
    setBusy(true)
    const ok = await startCheckout({ kind: 'tip', targetUser: person.id, amountKobo: amount, message: message.trim() })
    if (!ok) setBusy(false)
  }

  return (
    <Modal title={`Tip ${person.display_name}`} onClose={onClose}>
      <div className="mb">
        <p className="sub" style={{ margin: 0 }}>A small thank-you for their help. The platform keeps {TIP_COMMISSION * 100}% to cover payment fees{valid ? `, so ${person.display_name} receives ${money(Math.round(amount * (1 - TIP_COMMISSION)))}` : ''}.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TIP.presets.map((p) => (
            <button key={p} className={'pill' + (!custom && kobo === p ? ' on' : '')} onClick={() => { setKobo(p); setCustom('') }}>{money(p)}</button>
          ))}
        </div>
        <label className="lab">Or enter an amount (₦)
          <input className="t" type="number" inputMode="numeric" min={TIP.minKobo / 100} max={TIP.maxKobo / 100} value={custom} onChange={(e) => setCustom(e.target.value)} />
        </label>
        <input className="t" placeholder="Add a short message (optional)" maxLength={140} value={message} onChange={(e) => setMessage(e.target.value)} />
        <div className="fr"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn" disabled={busy || !valid} onClick={pay}>{busy ? 'Opening payment…' : `Tip ${valid ? money(amount) : ''}`}</button></div>
      </div>
    </Modal>
  )
}
