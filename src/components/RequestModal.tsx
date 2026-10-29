'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Modal, toast, toastErr } from './Modal'

export function RequestModal({ person, onClose, onSent }: { person: { id: string; display_name: string }; onClose: () => void; onSent: (requestId: string) => void }) {
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
        <div className="tip">💡 Tip: A short note helps mentors understand your goals and increases your chances of being accepted.</div>
        <div>
          <textarea autoFocus maxLength={200} placeholder="Add a short note talking about yourself and your goals (optional)" value={goal} onChange={(e) => setGoal(e.target.value)} />
          <div className="cnt" style={{ textAlign: 'right' }}>{200 - goal.length}/200</div>
        </div>
        <div className="fr"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send request'}</button></div>
      </div>
    </Modal>
  )
}
