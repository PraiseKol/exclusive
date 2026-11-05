'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Modal, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { useSentinel } from '@/lib/useSentinel'
import { ago, errMsg } from '@/lib/util'

type Cat = 'general' | 'important' | 'emergency'
type Partner = { id: string; display_name: string; avatar_url: string | null; headline: string }
type Msg = { id: string; sender_id: string; recipient_id: string; category: Cat; body: string; created_at: string; read_at: string | null }
type Row = { partner_id: string; last_body: string; last_at: string; last_sender: string; unread: number }
const CATS: Cat[] = ['general', 'important', 'emergency']
const COLS = 'id,sender_id,recipient_id,category,body,created_at,read_at'
const PAGE = 30
const label = (c: Cat) => c[0].toUpperCase() + c.slice(1)

function Messenger() {
  const sb = createClient()
  const router = useRouter()
  const to = useSearchParams().get('to')
  const [me, setMe] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [people, setPeople] = useState<Record<string, Partner>>({})
  const [rows, setRows] = useState<Row[]>([])
  const [unreadBy, setUnreadBy] = useState<Record<Cat, number>>({ general: 0, important: 0, emergency: 0 })
  const [cat, setCat] = useState<Cat>('general')
  const [cur, setCur] = useState<string | null>(to)
  const [thread, setThread] = useState<Msg[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [armed, setArmed] = useState(false)
  const [q, setQ] = useState('')
  const [text, setText] = useState('')
  const [lim, setLim] = useState<any>(null)
  const [pick, setPick] = useState(false)
  const [catMenu, setCatMenu] = useState(false)
  const [ready, setReady] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const peopleRef = useRef(people)
  peopleRef.current = people

  const remember = useCallback((list: Partner[]) => {
    setPeople((p) => { const n = { ...p }; list.forEach((x) => { n[x.id] = x }); return n })
  }, [])

  const loadInbox = useCallback(async (c: Cat) => {
    const { data } = await sb.rpc('inbox', { p_category: c })
    const list = (data ?? []) as Row[]
    setRows(list)
    const need = list.map((r) => r.partner_id).filter((id) => !peopleRef.current[id])
    if (need.length) {
      const { data: ps } = await sb.from('profiles').select('id,display_name,avatar_url,headline').in('id', need)
      remember((ps ?? []) as Partner[])
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const loadUnread = useCallback(async () => { const { data } = await sb.rpc('unread_counts'); if (data) setUnreadBy(data as any) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const loadLimits = useCallback(async () => { const { data } = await sb.rpc('my_limits'); setLim(data) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const pair = (a: string, b: string) => `and(sender_id.eq.${a},recipient_id.eq.${b}),and(sender_id.eq.${b},recipient_id.eq.${a})`

  const loadThread = useCallback(async (partnerId: string, c: Cat, myId: string) => {
    setArmed(false)
    const { data } = await sb.from('messages').select(COLS).or(pair(myId, partnerId)).eq('category', c)
      .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE)
    const list = ((data ?? []) as Msg[]).slice().reverse()
    setThread(list); setHasMore((data ?? []).length === PAGE)
    requestAnimationFrame(() => { end.current?.scrollIntoView({ block: 'end' }); setArmed(true) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setMe(user.id)
      const { data } = await sb.from('connections')
        .select('mentor_id,mentee_id,mentor:profiles!connections_mentor_id_fkey(id,display_name,avatar_url,headline),mentee:profiles!connections_mentee_id_fkey(id,display_name,avatar_url,headline)')
        .eq('status', 'active').gt('expires_at', new Date().toISOString())
      const ps = (data ?? []).map((c: any) => (c.mentor_id === user.id ? c.mentee : c.mentor)) as Partner[]
      setPartners(ps); remember(ps)
      await Promise.all([loadInbox('general'), loadUnread(), loadLimits()])
      setReady(true)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (me) loadInbox(cat) }, [cat, me]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (me && cur) loadThread(cur, cat, me); else { setThread([]); setHasMore(false) } }, [cur, cat, me]) // eslint-disable-line react-hooks/exhaustive-deps

  // live: new messages from other people
  useEffect(() => {
    if (!me) return
    const ch = sb.channel('dm-' + me)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, (p: any) => {
        const m = p.new as Msg
        if (cur && m.sender_id === cur && m.category === cat) {
          setThread((t) => (t.some((x) => x.id === m.id) ? t : [...t, m]))
          requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }))
        }
        loadInbox(cat); loadUnread()
      })
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [me, cur, cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // mark what you are looking at as read
  useEffect(() => {
    if (!cur || !me || !thread.some((x) => x.recipient_id === me && !x.read_at)) return
    const now = new Date().toISOString()
    setThread((t) => t.map((x) => (x.recipient_id === me && !x.read_at ? { ...x, read_at: now } : x)))
    sb.from('messages').update({ read_at: now }).eq('recipient_id', me).eq('sender_id', cur).eq('category', cat).is('read_at', null)
      .then(() => { loadInbox(cat); loadUnread() })
  }, [thread, cur, me, cat]) // eslint-disable-line react-hooks/exhaustive-deps

  // endless history: older messages load as you scroll to the top of the chat
  const loadOlder = async () => {
    if (!hasMore || loadingOlder || !thread.length || !cur) return
    setLoadingOlder(true)
    const { data } = await sb.from('messages').select(COLS).or(pair(me, cur)).eq('category', cat)
      .lt('created_at', thread[0].created_at).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(PAGE)
    const older = ((data ?? []) as Msg[]).slice().reverse()
    const el = box.current
    const before = el?.scrollHeight ?? 0
    setThread((t) => [...older.filter((o) => !t.some((x) => x.id === o.id)), ...t])
    setHasMore((data ?? []).length === PAGE)
    requestAnimationFrame(() => { if (el) el.scrollTop = el.scrollHeight - before + el.scrollTop; setLoadingOlder(false) })
  }
  const top = useSentinel(loadOlder, hasMore && armed && !!cur, thread.length, '150px')

  async function send() {
    const body = text.trim()
    if (!body || !cur) return
    const { data, error } = await sb.from('messages').insert({ sender_id: me, recipient_id: cur, category: cat, body }).select(COLS).single()
    if (error) return toastErr(errMsg(error))
    setText('')
    setThread((t) => [...t, data as Msg])
    requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }))
    loadInbox(cat); loadLimits()
  }

  const partner = cur ? people[cur] : undefined
  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    const byId = new Map(rows.map((r) => [r.partner_id, r]))
    if (term) {
      const ids = new Set<string>([...rows.map((r) => r.partner_id), ...partners.map((p) => p.id)])
      return [...ids].map((id) => ({ p: people[id], r: byId.get(id) })).filter((x) => x.p && x.p.display_name.toLowerCase().includes(term))
    }
    return rows.filter((r) => people[r.partner_id]).sort((a, b) => (a.last_at < b.last_at ? 1 : -1)).map((r) => ({ p: people[r.partner_id], r }))
  }, [q, rows, partners, people])

  const left = (c: Cat) => (c === 'general' ? null : lim ? lim[c + '_left'] : null)
  const back = () => { setCur(null); if (to) router.replace('/messages') }

  const empty = (
    <div className="empty big" style={{ paddingTop: 70 }}>
      <Icon n="mail" />
      <div style={{ fontWeight: 500, color: 'var(--n800)', marginTop: 10 }}>Start a conversation</div>
      <div style={{ fontSize: 14, marginTop: 4 }}>Once you start conversations with mentors or mentees, they’ll show up here.</div>
    </div>
  )

  return (
    <div className={'msg-wrap' + (cur ? ' has-chat' : '')}>
      <section className="msg-list" aria-label="Conversations">
        <label className="msg-search">
          <Icon n="search" />
          <input type="search" aria-label="Search conversations" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <div className="chips" role="tablist" aria-label="Message category">
          {CATS.map((c) => (
            <button key={c} role="tab" aria-selected={cat === c} className={'pill' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>
              {label(c)}{unreadBy[c] > 0 && <span className="ub">{unreadBy[c]}</span>}
            </button>
          ))}
        </div>
        {ready && list.length === 0 && (q ? <div className="empty">No one matches “{q}”.</div> : empty)}
        {list.map(({ p, r }) => (
          <button key={p.id} className={'dmc' + (cur === p.id ? ' sel' : '')} onClick={() => setCur(p.id)}>
            <Avatar name={p.display_name} url={p.avatar_url} size={44} />
            <div className="grow">
              <div style={{ fontWeight: 500 }}>{p.display_name}</div>
              <div className="sub pv1">{r ? `${r.last_sender === me ? 'You: ' : ''}${r.last_body}` : 'Start a conversation'}</div>
            </div>
            {r && r.unread > 0 && <span className="dmb" aria-label={`${r.unread} unread`}>{r.unread}</span>}
          </button>
        ))}
        {ready && partners.length > 0 && <button className="btn" style={{ margin: '12px 16px' }} onClick={() => setPick(true)}>New message</button>}
        {ready && partners.length === 0 && rows.length === 0 && <p className="sub" style={{ padding: '0 24px', textAlign: 'center' }}>Only mentors and mentees can message each other.</p>}
      </section>

      <section className={'msg-chat' + (cur ? ' open' : '')} aria-label="Chat">
        {cur && partner ? (
          <>
            <div className="chd">
              <button className="bk2" aria-label="Back to conversations" onClick={back}><Icon n="back" /></button>
              <Avatar name={partner.display_name} url={partner.avatar_url} size={32} />
              <div className="grow" style={{ minWidth: 0, fontWeight: 500, fontSize: 15 }}>{partner.display_name}</div>
              <Link className="chmore" href={`/profile/${partner.id}`} aria-label={`View ${partner.display_name}’s profile`}>⋮</Link>
            </div>
            <div className="thread" ref={box}>
              {hasMore && <div ref={top} className="more">{loadingOlder && <span className="spin" aria-label="Loading earlier messages" />}</div>}
              {!hasMore && thread.length > 0 && <div className="more sub">Start of conversation</div>}
              {thread.length === 0 && <div className="empty" style={{ padding: 40 }}>No {cat} messages with {partner.display_name} yet. Say hello.</div>}
              {thread.map((m) => (
                <div key={m.id} className={'bub' + (m.sender_id === me ? ' mine' : '')} title={ago(m.created_at) + ' ago'}>{m.body}</div>
              ))}
              <div ref={end} />
            </div>
            <div className="composer">
              {cat !== 'general' && <div className="sendinfo">Sending as <b style={{ fontWeight: 500 }}>{label(cat)}</b>{left(cat) !== null && ` · ${left(cat)} left this month`}</div>}
              <div className="cin2">
                <div className="cbox2">
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <button className="plusb" aria-label="Choose message category" aria-expanded={catMenu} onClick={() => setCatMenu(!catMenu)}><Icon n="plus" /></button>
                    {catMenu && (
                      <div className="catmenu" role="menu">
                        <div className="sub" style={{ padding: '4px 10px', fontSize: 12 }}>Send as</div>
                        {CATS.map((c) => (
                          <button key={c} role="menuitemradio" aria-checked={cat === c} className={cat === c ? 'on' : ''} onClick={() => { setCat(c); setCatMenu(false) }}>
                            {label(c)}{left(c) !== null && <span className="sub"> · {left(c)} left</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input aria-label="Message" placeholder="Send a message" value={text} maxLength={4000}
                    onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                </div>
                <button className="sendbig" aria-label="Send message" disabled={!text.trim()} onClick={send}><Icon n="share" /></button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty" style={{ margin: 'auto' }}>Select a conversation to start messaging.</div>
        )}
      </section>

      {pick && (
        <Modal title="New message" onClose={() => setPick(false)}>
          <div className="mb">
            {partners.map((p) => (
              <button key={p.id} className="row" onClick={() => { setPick(false); setCur(p.id) }}>
                <Avatar name={p.display_name} url={p.avatar_url} size={40} />
                <div className="grow"><div>{p.display_name}</div><div className="sub">{p.headline}</div></div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  )
}

export default function Messages() {
  return <Suspense><Messenger /></Suspense>
}
