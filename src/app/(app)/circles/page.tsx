'use client'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { DEFAULT_DURATION, DurationPicker, durationArgs, durationLabel, durationValid, type Duration } from '@/components/DurationPicker'
import { Modal, toast, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'

export default function Circles() {
  const sb = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'requests' | 'updates'>('requests')
  const [sub, setSub] = useState<'received' | 'sent'>('received')
  const [rec, setRec] = useState<any[]>([])
  const [sent, setSent] = useState<any[]>([])
  const [upd, setUpd] = useState<any[]>([])
  const [sheet, setSheet] = useState<null | { kind: 'goal' | 'accept'; r: any }>(null)
  const [dur, setDur] = useState<Duration>(DEFAULT_DURATION)
  const [banner, setBanner] = useState('')

  const load = useCallback(async () => {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    const [a, b, c] = await Promise.all([
      sb.from('mentor_requests').select('id,goal,created_at,requester:profiles!mentor_requests_requester_id_fkey(id,display_name,headline,avatar_url)').eq('mentor_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      sb.from('mentor_requests').select('id,created_at,mentor:profiles!mentor_requests_mentor_id_fkey(id,display_name,headline,avatar_url)').eq('requester_id', user.id).eq('status', 'pending').order('created_at', { ascending: false }),
      sb.from('notifications').select('id,type,body,created_at,actor:profiles!notifications_actor_id_fkey(display_name)').in('type', ['accepted', 'declined', 'renewed', 'expiring']).order('created_at', { ascending: false }).limit(30),
    ])
    setRec(a.data ?? []); setSent(b.data ?? []); setUpd(c.data ?? [])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  async function respond(r: any, accept: boolean) {
    const { error } = await sb.rpc('respond_request', { p_request: r.id, p_accept: accept, ...(accept ? durationArgs(dur) : { p_months: null, p_ends_at: null }) })
    setSheet(null)
    if (error) return toastErr(errMsg(error))
    toast(accept ? `Accepted. ${r.requester.display_name} is now your mentee ${durationLabel(dur)}.` : 'Request rejected')
    if (accept) setBanner(`${r.requester.display_name} is now your mentee`)
    load(); router.refresh()
  }
  async function cancel(r: any) {
    const { error } = await sb.rpc('cancel_request', { p_request: r.id })
    if (error) return toastErr(errMsg(error))
    toast('Request cancelled'); load()
  }

  return (
    <>
      <div className="tabs">
        {(['requests', 'updates'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
        ))}
      </div>
      {tab === 'requests' && (
        <>
          <div className="pb">
            <button className={'pill' + (sub === 'received' ? ' on' : '')} onClick={() => setSub('received')}>Received {rec.length > 0 && `(${rec.length})`}</button>
            <button className={'pill' + (sub === 'sent' ? ' on' : '')} onClick={() => setSub('sent')}>Sent</button>
          </div>
          {banner && <div className="banner" role="status"><span>{banner}</span><button aria-label="Dismiss" onClick={() => setBanner('')}>✕</button></div>}
          {sub === 'received' && rec.map((r) => (
            <div key={r.id} className="row" style={{ padding: '10px 20px' }}>
              <Avatar name={r.requester.display_name} url={r.requester.avatar_url} size={44} />
              <div className="grow"><div>{r.requester.display_name}</div><div className="sub">{r.requester.headline}</div></div>
              {r.goal && <button className="rb" aria-label="Read note" onClick={() => setSheet({ kind: 'goal', r })}><Icon n="mail" /></button>}
              <button className="rb" aria-label="Accept" onClick={() => { setDur(DEFAULT_DURATION); setSheet({ kind: 'accept', r }) }}><Icon n="ok" /></button>
              <button className="rb" aria-label="Reject" onClick={() => respond(r, false)}><Icon n="x" /></button>
            </div>
          ))}
          {sub === 'received' && rec.length === 0 && <div className="empty">No requests received.</div>}
          {sub === 'sent' && sent.map((r) => (
            <div key={r.id} className="row" style={{ padding: '10px 20px' }}>
              <Avatar name={r.mentor.display_name} url={r.mentor.avatar_url} size={44} />
              <div className="grow"><div>{r.mentor.display_name}</div><div className="sub">{r.mentor.headline}</div></div>
              <button className="lk" onClick={() => cancel(r)}>Cancel</button>
            </div>
          ))}
          {sub === 'sent' && sent.length === 0 && <div className="empty">No requests sent. Find a mentor from Search.</div>}
        </>
      )}
      {tab === 'updates' && (
        <>
          {upd.map((u) => (
            <div key={u.id} className="row" style={{ padding: '12px 20px' }}>
              <div className="grow" style={{ whiteSpace: 'normal' }}>{u.actor?.display_name ? <b style={{ fontWeight: 500 }}>{u.actor.display_name} </b> : null}{u.body}<div className="sub">{ago(u.created_at)} ago</div></div>
            </div>
          ))}
          {upd.length === 0 && <div className="empty">No updates yet.</div>}
        </>
      )}

      {sheet?.kind === 'goal' && (
        <Modal title={`${sheet.r.requester.display_name}’s goal`} onClose={() => setSheet(null)}>
          <div className="mb">
            <div className="row" style={{ padding: 0 }}><Avatar name={sheet.r.requester.display_name} url={sheet.r.requester.avatar_url} size={40} /><div className="grow"><div>{sheet.r.requester.display_name}</div><div className="sub">{sheet.r.requester.headline}</div></div></div>
            <p style={{ margin: 0, overflowWrap: 'anywhere' }}>{sheet.r.goal}</p>
            <div className="fr" style={{ justifyContent: 'stretch' }}>
              <button className="bo" style={{ flex: 1, padding: 12, borderRadius: 999 }} onClick={() => respond(sheet.r, false)}>Reject</button>
              <button className="btn" style={{ flex: 1, padding: 12, borderRadius: 999 }} onClick={() => { setDur(DEFAULT_DURATION); setSheet({ kind: 'accept', r: sheet.r }) }}>Accept</button>
            </div>
          </div>
        </Modal>
      )}
      {sheet?.kind === 'accept' && (
        <Modal title="Mentorship duration" onClose={() => setSheet(null)}>
          <div className="mb">
            <DurationPicker value={dur} onChange={setDur} />
            <div className="tip">Choosing a duration is optional. If you pick one, you’ll be notified a week before it ends. Otherwise the mentorship has no end date.</div>
            <div className="fr"><button className="btn" style={{ width: '100%' }} disabled={!durationValid(dur)} onClick={() => respond(sheet.r, true)}>Start mentoring</button></div>
          </div>
        </Modal>
      )}
    </>
  )
}
