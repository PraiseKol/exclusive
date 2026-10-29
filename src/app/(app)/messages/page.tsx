'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Icon } from '@/components/Icon'
import { Modal, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'

type Cat = 'general' | 'important' | 'emergency'
type Partner = { id: string; display_name: string; avatar_url: string | null; headline: string }
type Msg = { id: string; sender_id: string; recipient_id: string; category: Cat; body: string; created_at: string; read_at: string | null }
const CATS: Cat[] = ['general', 'important', 'emergency']
const label = (c: Cat) => c[0].toUpperCase() + c.slice(1)

function Messenger() {
  const sb = createClient()
  const router = useRouter()
  const to = useSearchParams().get('to')
  const [me, setMe] = useState('')
  const [partners, setPartners] = useState<Partner[]>([])
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [cat, setCat] = useState<Cat>('general')
  const [cur, setCur] = useState<string | null>(to)
  const [q, setQ] = useState('')
  const [text, setText] = useState('')
  const [lim, setLim] = useState<any>(null)
  const [pick, setPick] = useState(false)
  const [ready, setReady] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const loadMsgs = useCallback(async () => {
    const { data } = await sb.from('messages').select('id,sender_id,recipient_id,category,body,created_at,read_at')
      .order('created_at', { ascending: false }).limit(1000)
    setMsgs((data ?? []) as Msg[])
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const loadLimits = useCallback(async () => { const { data } = await sb.rpc('my_limits'); setLim(data) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setMe(user.id)
      const { data } = await sb.from('connections')
        .select('mentor_id,mentee_id,mentor:profiles!connections_mentor_id_fkey(id,display_name,avatar_url,headline),mentee:profiles!connections_mentee_id_fkey(id,display_name,avatar_url,headline)')
        .eq('status', 'active').gt('expires_at', new Date().toISOString())
      setPartners((data ?? []).map((c: any) => (c.mentor_id === user.id ? c.mentee : c.mentor)))
      await Promise.all([loadMsgs(), loadLimits()])
      setReady(true)
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!me) return
    const ch = sb.channel('dm-' + me)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, () => loadMsgs())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [me, loadMsgs]) // eslint-disable-line react-hooks/exhaustive-deps

  const byId = useMemo(() => new Map(partners.map((p) => [p.id, p])), [partners])
  const partner = cur ? byId.get(cur) : undefined

  // conversations for the selected category: latest message + unread count per person
  const convs = useMemo(() => {
    const m = new Map<string, { last: Msg; unread: number }>()
    for (const x of msgs) {
      if (x.category !== cat) continue
      const pid = x.sender_id === me ? x.recipient_id : x.sender_id
      if (!m.has(pid)) m.set(pid, { last: x, unread: 0 })
      if (x.recipient_id === me && !x.read_at) m.get(pid)!.unread++
    }
    return m
  }, [msgs, cat, me])
  const unreadBy = (c: Cat) => msgs.filter((x) => x.category === c && x.recipient_id === me && !x.read_at).length

  const list = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (term) return partners.filter((p) => p.display_name.toLowerCase().includes(term)).map((p) => ({ p, c: convs.get(p.id) }))
    return [...convs.entries()].filter(([id]) => byId.has(id)).sort((a, b) => +new Date(b[1].last.created_at) - +new Date(a[1].last.created_at)).map(([id, c]) => ({ p: byId.get(id)!, c }))
  }, [q, partners, convs, byId])

  const thread = useMemo(() => cur
    ? msgs.filter((x) => x.category === cat && ((x.sender_id === me && x.recipient_id === cur) || (x.sender_id === cur && x.recipient_id === me))).slice().reverse()
    : [], [msgs, cat, cur, me])

  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [thread.length, cur, cat])
  useEffect(() => {
    if (!cur || !me) return
    if (!thread.some((x) => x.recipient_id === me && !x.read_at)) return
    const now = new Date().toISOString()
    setMsgs((all) => all.map((x) => (x.category === cat && x.sender_id === cur && x.recipient_id === me && !x.read_at ? { ...x, read_at: now } : x)))
    sb.from('messages').update({ read_at: now }).eq('recipient_id', me).eq('sender_id', cur).eq('category', cat).is('read_at', null).then(() => {})
  }, [thread, cur, me, cat]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    const body = text.trim()
    if (!body || !cur) return
    const { error } = await sb.from('messages').insert({ sender_id: me, recipient_id: cur, category: cat, body })
    if (error) return toastErr(errMsg(error))
    setText(''); loadMsgs(); loadLimits()
  }
  const open = (id: string) => setCur(id)
  const back = () => { setCur(null); if (to) router.replace('/messages') }
  const left = (c: Cat) => (c === 'general' ? null : lim ? lim[c + '_left'] : null)

  const empty = (
    <div className="empty" style={{ paddingTop: 70 }}>
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
              {label(c)}{unreadBy(c) > 0 && <span className="ub">{unreadBy(c)}</span>}
            </button>
          ))}
        </div>
        {ready && list.length === 0 && (q ? <div className="empty">No one matches “{q}”.</div> : empty)}
        {list.map(({ p, c }) => (
          <button key={p.id} className={'dmc' + (cur === p.id ? ' sel' : '')} onClick={() => open(p.id)}>
            <Avatar name={p.display_name} url={p.avatar_url} size={44} />
            <div className="grow">
              <div style={{ fontWeight: 500 }}>{p.display_name}</div>
              <div className="sub pv1">{c ? `${c.last.sender_id === me ? 'You: ' : ''}${c.last.body}` : 'Start a conversation'}</div>
            </div>
            {c && c.unread > 0 ? <span className="dmb">{c.unread}</span> : <span className="dmb ghost"><Icon n="chevr" /></span>}
          </button>
        ))}
        {ready && partners.length > 0 && <button className="btn" style={{ margin: '12px 16px' }} onClick={() => setPick(true)}>New message</button>}
        {ready && partners.length === 0 && <p className="sub" style={{ padding: '0 24px', textAlign: 'center' }}>Only mentors and mentees can message each other.</p>}
      </section>

      <section className={'msg-chat' + (cur ? ' open' : '')} aria-label="Chat">
        {cur && partner ? (
          <>
            <div className="chd">
              <button className="bk2" aria-label="Back to conversations" onClick={back}><Icon n="back" /></button>
              <Avatar name={partner.display_name} url={partner.avatar_url} size={40} />
              <div className="grow" style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 500 }}>{partner.display_name}</div>
                <div className="sub pv1" style={{ fontSize: 13 }}>{partner.headline}</div>
              </div>
            </div>
            <div className="thread">
              {thread.length === 0 && <div className="empty" style={{ padding: 40 }}>No {cat} messages with {partner.display_name} yet. Say hello.</div>}
              {thread.map((m) => (
                <div key={m.id} className={'bub' + (m.sender_id === me ? ' mine' : '')} title={ago(m.created_at) + ' ago'}>{m.body}</div>
              ))}
              <div ref={end} />
            </div>
            <div className="composer">
              <div className="sendas" role="group" aria-label="Send as">
                <span className="sub">Send as</span>
                {CATS.map((c) => (
                  <button key={c} className={'pill sm' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => setCat(c)}>
                    {label(c)}{left(c) !== null && <span className="sub" style={{ color: 'inherit', opacity: 0.8 }}> ({left(c)} left)</span>}
                  </button>
                ))}
              </div>
              <div className="cin2">
                <div className="cbox">
                  <input aria-label="Message" placeholder={`Message ${partner.display_name}`} value={text} maxLength={4000}
                    onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
                  <button className="sendc" aria-label="Send message" disabled={!text.trim()} onClick={send}><Icon n="send" /></button>
                </div>
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
              <button key={p.id} className="row" onClick={() => { setPick(false); open(p.id) }}>
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
