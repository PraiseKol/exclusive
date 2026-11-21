'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { money } from '@/lib/plans'
import { Modal, toast, toastErr } from './Modal'

export function RequestModal({ person, onClose, onSent }: { person: { id: string; display_name: string; slotPriceKobo?: number | null }; onClose: () => void; onSent: (requestId: string) => void }) {
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    const { data, error } = await createClient().rpc('send_mentor_request', { p_mentor: person.id, p_goal: goal })
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    toast(`Request sent to ${person.display_name}`)
    onSent(data as string); onClose()
  }

  return (
    <Modal title="Send a request" onClose={onClose}>
      <div className="mb">
        {person.slotPriceKobo ? (
          <div className="howpaid">
            <b>{person.display_name} has a paid mentee slot: {money(person.slotPriceKobo)}</b>
            <ol>
              <li>Send your request now. It costs nothing.</li>
              <li>If {person.display_name} accepts, you get a notification to pay.</li>
              <li>Pay under Circles, then Requests. The mentorship starts as soon as the payment goes through.</li>
            </ol>
            <span>The mentor receives the money after 7 days, so you can contact support if something goes wrong in that time.</span>
          </div>
        ) : null}
        <div className="tip">A short note helps mentors understand your goals and increases your chances of being accepted.</div>
        <div>
          <textarea autoFocus maxLength={200} placeholder="Add a short note talking about yourself and your goals (optional)" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <div className="cnt" style={{ textAlign: 'right' }}>{200 - goal.length}/200</div>
        </div>
        <div className="fr"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn" disabled={busy} onClick={send}>{busy ? 'Sending…' : person.slotPriceKobo ? 'Send request (pay later)' : 'Send request'}</button></div>
      </div>
    </Modal>
  )
}
