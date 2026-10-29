'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Modal, toast } from './Modal'

export function RequestReview({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const sb = createClient()
  const [r, setR] = useState<any>(null)
  const [months, setMonths] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    sb.from('mentor_requests')
      .select('id,goal,status,requester:profiles!mentor_requests_requester_id_fkey(id,display_name,headline,avatar_url)')
      .eq('id', id).single()
      .then(({ data }) => {
        if (!data || data.status !== 'pending') { toast('This request has already been handled'); onClose(); return }
        setR(data)
      })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function respond(accept: boolean) {
    setBusy(true)
    const { error } = await sb.rpc('respond_request', { p_request: id, p_accept: accept, p_months: accept && months ? months : null })
    setBusy(false)
    if (error) return toast(errMsg(error))
    toast(accept ? `Accepted. ${r.requester.display_name} is now your mentee${months ? ` for ${months} month${months > 1 ? 's' : ''}` : ' with no end date'}.` : 'Request declined')
    onDone(); onClose()
  }

  if (!r) return null
  return (
    <Modal title="Mentorship request" onClose={onClose}>
      <div className="mb">
        <div className="row" style={{ padding: 0 }}>
          <Avatar name={r.requester.display_name} url={r.requester.avatar_url} size={44} />
          <div className="grow"><div>{r.requester.display_name}</div><div className="sub">{r.requester.headline}</div></div>
          <Link className="lk" href={`/profile/${r.requester.id}`} onClick={onClose}>View profile</Link>
        </div>
        {r.goal && <div><div className="sub">My goal</div><p style={{ margin: '4px 0 0', overflowWrap: 'anywhere' }}>{r.goal}</p></div>}
        <label className="lab">Mentorship duration (optional)
          <select value={months} onChange={(e) => setMonths(+e.target.value)} style={{ marginTop: 6 }}>
            <option value={0}>No set duration (indefinite)</option>
            {[1, 2, 3].map((m) => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
          </select>
        </label>
        <div className="tip">If you pick a duration, you’ll be notified a week before it ends so you can renew or end it. If you don’t, the mentorship has no end date until either of you ends it.</div>
        <div className="fr">
          <button className="btn sec" disabled={busy} onClick={() => respond(false)}>Decline</button>
          <button className="btn" disabled={busy} onClick={() => respond(true)}>Accept</button>
        </div>
      </div>
    </Modal>
  )
}
