'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { DEFAULT_DURATION, DurationPicker, durationArgs, durationLabel, durationValid, type Duration } from './DurationPicker'
import { Modal, toast, toastErr } from './Modal'

export function RequestReview({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const sb = createClient()
  const [r, setR] = useState<any>(null)
  const [dur, setDur] = useState<Duration>(DEFAULT_DURATION)
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
    const { error } = await sb.rpc('respond_request', { p_request: id, p_accept: accept, ...(accept ? durationArgs(dur) : { p_months: null, p_ends_at: null }) })
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    toast(accept ? `Accepted. ${r.requester.display_name} is now your mentee ${durationLabel(dur)}.` : 'Request declined')
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
        <div className="lab">Mentorship duration (optional)<DurationPicker value={dur} onChange={setDur} /></div>
        <div className="tip">If you pick a duration, you’ll be notified a week before it ends so you can renew or end it. If you don’t, the mentorship has no end date until either of you ends it.</div>
        <div className="fr">
          <button className="btn sec" disabled={busy} onClick={() => respond(false)}>Decline</button>
          <button className="btn" disabled={busy || !durationValid(dur)} onClick={() => respond(true)}>Accept</button>
        </div>
      </div>
    </Modal>
  )
}
