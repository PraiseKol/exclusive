'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Modal, toast } from '@/components/Modal'
import { PostCard, type Post } from '@/components/PostCard'
import { createClient } from '@/lib/supabase/client'
import { GRADES, errMsg } from '@/lib/util'

type Tab = 'posts' | 'reflections' | 'circle' | 'events'

export function ProfileView({ profile, meId, mine, connected, pending, posts, reflections, extra }: {
  profile: any; meId: string; mine: boolean; connected: boolean; pending: boolean
  posts: Post[]; reflections: Post[]; extra: any
}) {
  const sb = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('posts')
  const [sheet, setSheet] = useState<null | 'request' | 'limits' | 'edit' | 'grade'>(null)
  const [goal, setGoal] = useState('')
  const [sent, setSent] = useState(pending)
  const tabs: Tab[] = mine ? ['posts', 'reflections', 'circle', 'events'] : ['posts', 'reflections']
  const tier = profile.premium_tier as number

  async function sendRequest() {
    const { error } = await sb.rpc('send_mentor_request', { p_mentor: profile.id, p_goal: goal })
    setSheet(null)
    if (error) return toast(errMsg(error))
    setSent(true); toast('Request sent')
  }
  async function rate(v: 1 | -1) {
    const { error } = await sb.from('ratings').upsert({ rater_id: meId, ratee_id: profile.id, value: v }, { onConflict: 'rater_id,ratee_id' })
    toast(error ? 'You can rate people within your 2-layer network.' : 'Rating saved')
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
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 24, fontWeight: 500 }}>{profile.display_name}</span>
            {profile.available && <span className="chip">● Available</span>}
            {tier > 0 && <span className="chip">Premium</span>}
            <button className="chip" onClick={() => setSheet('grade')}>Grade {profile.grade}{mine ? ` · ${(extra.rating ?? 0).toLocaleString()}` : ''}</button>
            <span style={{ flex: 1 }} />
            {mine ? (
              <>
                <button className="btn sec" onClick={() => setSheet('edit')}>Edit profile</button>
                <button className="lk" onClick={() => setSheet('limits')}>Connection limits</button>
              </>
            ) : (
              <>
                <button className="pill" aria-label="Thumbs up" onClick={() => rate(1)}>👍</button>
                <button className="pill" aria-label="Thumbs down" onClick={() => rate(-1)}>👎</button>
                {connected && <Link className="btn sec" href={`/messages?to=${profile.id}`}>Message</Link>}
                <button className="btn" disabled={connected || sent} onClick={() => setSheet('request')}>
                  {connected ? 'In your circle' : sent ? 'Request sent' : 'Mentor me'}
                </button>
              </>
            )}
          </div>
          <p style={{ margin: '14px 0', whiteSpace: 'pre-wrap' }}>{profile.headline}{profile.bio ? '\n' + profile.bio : ''}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(profile.interests ?? []).map((t: string) => <span key={t} className="tag">{t}</span>)}</div>
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
          {posts.map((p) => <PostCard key={p.id} post={p} meId={meId} />)}
          {posts.length === 0 && <div className="empty">No posts you can view. Regular posts are visible within the 2-layer network.</div>}
        </>
      )}
      {tab === 'reflections' && (
        <>
          {reflections.map((p) => <PostCard key={p.id} post={p} meId={meId} />)}
          {reflections.length === 0 && <div className="empty">Reflections appear here when a post deeply resonates.</div>}
        </>
      )}
      {tab === 'circle' && mine && <CircleTab profile={profile} extra={extra} meId={meId} />}
      {tab === 'events' && mine && <EventsTab extra={extra} meId={meId} />}

      {sheet === 'request' && (
        <Modal title="Send a request" onClose={() => setSheet(null)}>
          <div className="mb">
            <div className="tip">A short note about yourself and your goals helps mentors decide, and improves your chances.</div>
            <div>
              <textarea maxLength={200} placeholder="Add a short note about yourself and your goals (optional)" value={goal} onChange={(e) => setGoal(e.target.value)} />
              <div className="cnt" style={{ textAlign: 'right' }}>{200 - goal.length}/200</div>
            </div>
            <div className="fr"><button className="btn sec" onClick={() => setSheet(null)}>Cancel</button><button className="btn" onClick={sendRequest}>Send request</button></div>
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
  const [f, setF] = useState({ headline: profile.headline ?? '', bio: profile.bio ?? '', available: !!profile.available })
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    try {
      let avatar_url = profile.avatar_url
      if (file) {
        const path = `${profile.id}/avatar-${Date.now()}.${file.name.split('.').pop() || 'jpg'}`
        const up = await sb.storage.from('avatars').upload(path, file, { contentType: file.type })
        if (up.error) throw up.error
        avatar_url = sb.storage.from('avatars').getPublicUrl(path).data.publicUrl
      }
      const { error } = await sb.from('profiles').update({ ...f, avatar_url }).eq('id', profile.id)
      if (error) throw error
      toast('Profile updated'); onClose(); router.refresh()
    } catch (e) { toast(errMsg(e)); setBusy(false) }
  }
  return (
    <Modal title="Edit profile" onClose={onClose}>
      <div className="mb">
        <label className="lab">Headline<input className="t" value={f.headline} maxLength={160} onChange={(e) => setF({ ...f, headline: e.target.value })} /></label>
        <label className="lab">Bio<textarea value={f.bio} maxLength={500} onChange={(e) => setF({ ...f, bio: e.target.value })} /></label>
        <label className="lab">Profile photo<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></label>
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
        const left = days(c.expires_at)
        return (
          <div key={c.id} className="row">
            <Avatar name={other.display_name} url={other.avatar_url} size={40} />
            <div className="grow">{other.display_name}<div className="sub">{iMentor ? 'Your mentee' : 'Your mentor'} · {left} day{left === 1 ? '' : 's'} left</div></div>
            {iMentor && (
              <>
                <select aria-label="Renew for" value={months} onChange={(e) => setMonths(+e.target.value)} style={{ width: 90, padding: 8 }}>
                  {[1, 2, 3].map((m) => <option key={m} value={m}>+{m} mo</option>)}
                </select>
                <button className="btn sec" onClick={() => call('renew_connection', { p_conn: c.id, p_months: months }, 'Mentorship renewed')}>Renew</button>
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
