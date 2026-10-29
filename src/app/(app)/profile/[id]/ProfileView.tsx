'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Modal, toast } from '@/components/Modal'
import { RequestModal } from '@/components/RequestModal'
import { PostCard, type Post } from '@/components/PostCard'
import { createClient } from '@/lib/supabase/client'
import { GRADES, errMsg } from '@/lib/util'

type Tab = 'posts' | 'reflections' | 'circle' | 'events'

export function ProfileView({ profile, meId, mine, connected, pendingId, initialTab, initialEdit, myRating, connId, posts, reflections, extra }: {
  profile: any; meId: string; mine: boolean; connected: boolean; pendingId: string | null; initialTab?: string; initialEdit?: boolean; myRating?: number; connId?: string | null
  posts: Post[]; reflections: Post[]; extra: any
}) {
  const sb = createClient()
  const router = useRouter()
  const tabs: Tab[] = mine ? ['posts', 'reflections', 'circle', 'events'] : ['posts', 'reflections', 'events']
  const startTab = (tabs as string[]).includes(initialTab ?? '') ? (initialTab as Tab) : 'posts'
  const [tab, setTab] = useState<Tab>(startTab)
  useEffect(() => setTab(startTab), [startTab]) // eslint-disable-line react-hooks/exhaustive-deps
  const [sheet, setSheet] = useState<null | 'request' | 'limits' | 'edit' | 'grade' | 'end'>(mine && initialEdit ? 'edit' : null)
  const [pid, setPid] = useState<string | null>(pendingId)
  const tier = profile.premium_tier as number

  async function cancelRequest() {
    if (!pid) return
    const { error } = await sb.rpc('cancel_request', { p_request: pid })
    if (error) return toast(errMsg(error))
    setPid(null); toast('Request cancelled')
  }
  const [vote, setVote] = useState<number>(myRating ?? 0)
  async function rate(v: 1 | -1) {
    const next = vote === v ? 0 : v
    const { error } = await sb.rpc('rate_user', { p_ratee: profile.id, p_value: next })
    if (error) return toast(errMsg(error))
    setVote(next); toast(next === 0 ? 'Rating removed' : 'Rating saved')
  }
  async function endConnection() {
    if (!connId) return
    const { error } = await sb.rpc('end_connection', { p_conn: connId })
    setSheet(null)
    if (error) return toast(errMsg(error))
    toast(`Your connection with ${profile.display_name} has ended`); router.refresh()
  }
  async function restore(id: string) {
    const { error } = await sb.rpc('make_global', { p_post: id })
    if (error) return toast(errMsg(error))
    toast('Global Post restored with its interactions'); router.refresh()
  }

  return (
    <>
      <div className="prof">
        <Avatar name={profile.display_name} url={profile.avatar_url} size={150} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="pname" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 500, overflowWrap: 'anywhere' }}>{profile.display_name}</span>
            {profile.username && <span className="sub" style={{ width: '100%' }}>@{profile.username}</span>}
            {profile.available && <span className="chip">● Available</span>}
            {tier > 0 && <span className="chip">Premium</span>}
            <button className="chip" onClick={() => setSheet('grade')}>Grade {profile.grade}{mine ? ` · ${(extra.rating ?? 0).toLocaleString()}` : ''}</button>
            <span className="spc" style={{ flex: 1 }} />
            {mine ? (
              <>
                <button className="btn sec" onClick={() => setSheet('edit')}>Edit profile</button>
                <button className="lk" onClick={() => setSheet('limits')}>Connection limits</button>
                <button className="lk" onClick={async () => { await sb.auth.signOut(); router.replace('/welcome'); router.refresh() }}>Log out</button>
              </>
            ) : (
              <>
                <button className={'pill' + (vote === 1 ? ' on' : '')} aria-label="Thumbs up" aria-pressed={vote === 1} onClick={() => rate(1)}>👍</button>
                <button className={'pill' + (vote === -1 ? ' on' : '')} aria-label="Thumbs down" aria-pressed={vote === -1} onClick={() => rate(-1)}>👎</button>
                {connected && <Link className="btn sec" href={`/messages?to=${profile.id}`}>Message</Link>}
                {connected && connId && <button className="bo" style={{ padding: '10px 14px', borderRadius: 8, color: '#d92d20', borderColor: '#d92d20' }} onClick={() => setSheet('end')}>End connection</button>}
                {pid && !connected
                  ? <button className="bo" style={{ padding: '10px 14px', borderRadius: 8 }} onClick={cancelRequest}>Cancel request</button>
                  : <button className="btn" disabled={connected} onClick={() => setSheet('request')}>{connected ? 'In your circle' : 'Mentor me'}</button>}
              </>
            )}
          </div>
          <p style={{ margin: '14px 0', whiteSpace: 'pre-wrap' }}>{profile.headline}{profile.bio ? '\n' + profile.bio : ''}</p>
          <div className="ptags" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(profile.interests ?? []).map((t: string) => <span key={t} className="tag">{t}</span>)}</div>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t) => <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>)}
      </div>

      {tab === 'posts' && (
        <>
          {mine && (extra.drafts ?? []).length > 0 && (
            <div style={{ padding: '12px 20px' }}>
              <div className="tip">Your disabled Global Posts are saved. Restoring one replaces your current Global Post, and it must have been global for a week first.</div>
              {extra.drafts.map((d: any) => (
                <div key={d.id} className="row"><div className="grow sub">{d.body.slice(0, 80)}…</div><button className="btn sec" onClick={() => restore(d.id)}>Restore</button></div>
              ))}
            </div>
          )}
          <div className="pgrid">{posts.map((p) => <PostCard key={p.id} post={p} meId={meId} pin={p.is_global} />)}</div>
          {posts.length === 0 && <div className="empty">No posts you can view. Regular posts are visible within the 2-layer network.</div>}
        </>
      )}
      {tab === 'reflections' && (
        <>
          <div className="pgrid">{reflections.map((p) => <PostCard key={p.id} post={p} meId={meId} />)}</div>
          {reflections.length === 0 && <div className="empty">Reflections appear here when a post deeply resonates.</div>}
        </>
      )}
      {tab === 'circle' && mine && <CircleTab profile={profile} extra={extra} meId={meId} />}
      {tab === 'events' && mine && <EventsTab extra={extra} meId={meId} />}
      {tab === 'events' && !mine && (
        <div style={{ padding: '12px 20px' }}>
          {(extra.events ?? []).map((e: any) => (
            <div key={e.id} className="row"><div className="grow" style={{ whiteSpace: 'normal' }}>{e.purpose}<div className="sub" style={{ whiteSpace: 'normal' }}>{e.event_date} {String(e.event_time).slice(0, 5)} · {e.venue}</div></div></div>
          ))}
          {(extra.events ?? []).length === 0 && <div className="empty">No events shared with you by {profile.display_name}. Mentors share events privately with their mentees.</div>}
        </div>
      )}

      {sheet === 'request' && <RequestModal person={{ id: profile.id, display_name: profile.display_name }} onClose={() => setSheet(null)} onSent={(id) => setPid(id)} />}
      {sheet === 'end' && (
        <Modal title="End connection" onClose={() => setSheet(null)}>
          <div className="mb">
            <p style={{ margin: 0 }}>End your mentorship with {profile.display_name}? You will no longer be connected, so you won’t be able to message each other, and regular posts visible only through this connection will be hidden from you both. You can send a new request later.</p>
            <div className="fr"><button className="btn sec" onClick={() => setSheet(null)}>Cancel</button><button className="btn" style={{ background: '#d92d20' }} onClick={endConnection}>End connection</button></div>
          </div>
        </Modal>
      )}
      {sheet === 'limits' && (
        <Modal title="Connection limits" onClose={() => setSheet(null)}>
          <div className="mb">
            <b>{tier > 0 ? 'Premium' : 'Standard'} plan</b>
            <div>Mentors: {extra.limits?.mentors_used}/{extra.limits?.mentors_cap}</div>
            <div>Mentees: {extra.limits?.mentees_used}/{extra.limits?.mentees_cap}</div>
            <div>Emergency DMs left this month: {extra.limits?.emergency_left}</div>
            <div>Important DMs left this month: {extra.limits?.important_left}</div>
            {tier === 0 && <button className="btn" onClick={() => toast('Premium checkout is coming soon')}>Upgrade to Premium</button>}
          </div>
        </Modal>
      )}
      {sheet === 'grade' && (
        <Modal title="Grades" onClose={() => setSheet(null)}>
          <div className="mb">
            {Object.entries(GRADES).map(([g, r]) => <div key={g} className="row" style={{ padding: 0 }}><span className="chip">{g}</span><span>{r}</span></div>)}
            <p className="sub" style={{ margin: 0 }}>Rating = thumbs up minus thumbs down. Only you see your exact number; everyone else sees your grade.</p>
          </div>
        </Modal>
      )}
      {sheet === 'edit' && <EditModal profile={profile} onClose={() => setSheet(null)} />}
    </>
  )
}

function EditModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const sb = createClient()
  const router = useRouter()
  const [f, setF] = useState({ first_name: profile.first_name ?? '', last_name: profile.last_name ?? '', headline: profile.headline ?? '', bio: profile.bio ?? '', available: !!profile.available })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    if (!f.first_name.trim() || !f.last_name.trim()) return toast('Please enter your first and last name')
    if (file && file.size > 10 * 1024 * 1024) return toast('Profile photo must be 10 MB or smaller')
    setBusy(true)
    try {
      let avatar_url = profile.avatar_url
      if (file) {
        const path = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`
        const up = await sb.storage.from('avatars').upload(path, file, { contentType: file.type })
        if (up.error) throw up.error
        avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }
      const { error } = await sb.from('profiles').update({ ...f, first_name: f.first_name.trim(), last_name: f.last_name.trim(), avatar_url }).eq('id', profile.id)
      if (error) throw error
      toast('Profile updated'); onClose(); router.refresh()
    } catch (e) { toast(errMsg(e)); setBusy(false) }
  }
  return (
    <Modal title="Edit profile" onClose={onClose}>
      <div className="mb">
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="lab" style={{ flex: 1 }}>First name<input className="t" value={f.first_name} maxLength={60} autoComplete="given-name" onChange={(e) => setF({ ...f, first_name: e.target.value })} /></label>
          <label className="lab" style={{ flex: 1 }}>Last name<input className="t" value={f.last_name} maxLength={60} autoComplete="family-name" onChange={(e) => setF({ ...f, last_name: e.target.value })} /></label>
        </div>
        <label className="lab">Headline<input className="t" value={f.headline} maxLength={160} onChange={(e) => setF({ ...f, headline: e.target.value })} /></label>
        <label className="lab">Bio<textarea value={f.bio} maxLength={500} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
        <label className="lab">Profile photo (up to 10 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center' }}><input type="checkbox" checked={f.available} onChange={(e) => setF({ ...f, available: e.target.checked })} /> Available for mentoring</label>
        <div className="fr"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save'}</button></div>
      </div>
    </Modal>
  )
}

function CircleTab({ profile, extra, meId }: { profile: any; extra: any; meId: string }) {
  const sb = createClient()
  const router = useRouter()
  const [months, setMonths] = useState(1)
  const days = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)

  async function flag(col: 'tip_jar_enabled' | 'paid_slots_enabled') {
    const { error } = await sb.from('profiles').update({ [col]: !profile[col] }).eq('id', meId)
    if (error) return toast(errMsg(error))
    router.refresh()
  }
  async function call(fn: string, args: any, ok: string) {
    const { error } = await sb.rpc(fn, args)
    if (error) return toast(errMsg(error))
    toast(ok); router.refresh()
  }

  return (
    <div style={{ padding: '12px 20px' }}>
      <div className="row"><div className="grow">Tip jar<div className="sub">Receive micro-tips (Premium Tier 2)</div></div>
        <button className={'pill' + (profile.tip_jar_enabled ? ' on' : '')} onClick={() => flag('tip_jar_enabled')}>{profile.tip_jar_enabled ? 'On' : 'Off'}</button></div>
      <div className="row"><div className="grow">Paid mentee slots<div className="sub">Platform keeps a 10% commission (Premium)</div></div>
        <button className={'pill' + (profile.paid_slots_enabled ? ' on' : '')} onClick={() => flag('paid_slots_enabled')}>{profile.paid_slots_enabled ? 'On' : 'Off'}</button></div>
      <p className="sub">Mentors {extra.limits?.mentors_used}/{extra.limits?.mentors_cap} · Mentees {extra.limits?.mentees_used}/{extra.limits?.mentees_cap}</p>
      {(extra.circle ?? []).map((c: any) => {
        const iMentor = c.mentor_id === meId
        const other = iMentor ? c.mentee : c.mentor
        const forever = String(c.expires_at).startsWith('infinity')
        const left = forever ? 0 : days(c.expires_at)
        return (
          <div key={c.id} className="row">
            <Avatar name={other.display_name} url={other.avatar_url} size={40} />
            <div className="grow">{other.display_name}<div className="sub">{iMentor ? 'Your mentee' : 'Your mentor'} · {forever ? 'no end date' : `${left} day${left === 1 ? '' : 's'} left`}</div></div>
            {iMentor && (
              <>
                {!forever && (
                  <>
                    <select aria-label="Renew for" value={months} onChange={(e) => setMonths(+e.target.value)} style={{ width: 90, padding: 8 }}>
                  {[1, 2, 3].map((m) => <option key={m} value={m}>+{m} mo</option>)}
                </select>
                <button className="btn sec" onClick={() => call('renew_connection', { p_conn: c.id, p_months: months }, 'Mentorship renewed')}>Renew</button>
                  </>
                )}
                <button className="lk" onClick={() => call('highlight_mentee', { p_mentee: other.id }, 'Highlighted as this month’s most engaging mentee')}>Highlight</button>
              </>
            )}
            <button className="lk" onClick={() => call('end_connection', { p_conn: c.id }, 'Mentorship ended')}>End</button>
          </div>
        )
      })}
      {(extra.circle ?? []).length === 0 && <div className="empty">Your circle is empty. Send a mentor request to get started.</div>}
    </div>
  )
}

function EventsTab({ extra, meId }: { extra: any; meId: string }) {
  const sb = createClient()
  const router = useRouter()
  const mentees = (extra.circle ?? []).filter((c: any) => c.mentor_id === meId).map((c: any) => c.mentee)
  const [pick, setPick] = useState<string[]>([])
  const [f, setF] = useState({ d: '', t: '', v: '', p: '' })

  async function send() {
    if (!(f.d && f.t && f.v.trim() && f.p.trim() && pick.length)) return toast('Add date, time, venue, purpose and at least one mentee')
    const { error } = await sb.rpc('create_event', { p_date: f.d, p_time: f.t, p_venue: f.v.trim(), p_purpose: f.p.trim(), p_mentees: pick })
    if (error) return toast(errMsg(error))
    toast(`Event sent privately to ${pick.length} mentee(s)`); setF({ d: '', t: '', v: '', p: '' }); setPick([]); router.refresh()
  }

  return (
    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {mentees.length > 0 ? (
        <>
          <p className="sub" style={{ margin: 0 }}>Silently notify chosen mentees about a physical event. It is sent as a notification, not a post.</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {mentees.map((m: any) => (
              <button key={m.id} className={'pill' + (pick.includes(m.id) ? ' on' : '')} onClick={() => setPick(pick.includes(m.id) ? pick.filter((x) => x !== m.id) : [...pick, m.id])}>{m.display_name}</button>
            ))}
          </div>
          <input className="t" type="date" aria-label="Date" value={f.d} onChange={(e) => setF({ ...f, d: e.target.value })} />
          <input className="t" type="time" aria-label="Time" value={f.t} onChange={(e) => setF({ ...f, t: e.target.value })} />
          <input className="t" placeholder="Venue" value={f.v} onChange={(e) => setF({ ...f, v: e.target.value })} />
          <input className="t" placeholder="Purpose" value={f.p} onChange={(e) => setF({ ...f, p: e.target.value })} />
          <button className="btn" onClick={send}>Send to mentees</button>
        </>
      ) : <p className="sub">You need at least one mentee to share events.</p>}
      {(extra.events ?? []).map((e: any) => (
        <div key={e.id} className="row"><div className="grow" style={{ whiteSpace: 'normal' }}>{e.purpose}<div className="sub" style={{ whiteSpace: 'normal' }}>{e.event_date} {String(e.event_time).slice(0, 5)} · {e.venue}{e.mentor_id === meId ? ' · sent by you' : ''}</div></div></div>
      ))}
    </div>
  )
}
