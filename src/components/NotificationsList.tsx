'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSentinel } from '@/lib/useSentinel'
import { ago } from '@/lib/util'
import { Avatar } from './Avatar'
import { RequestReview } from './RequestReview'

const MENTION_TYPES = ['comment', 'mention', 'reflection']
const isMention = (t: string) => MENTION_TYPES.includes(t)
const SIZE = 25
const COLS = 'id,type,body,read,created_at,post_id,ref_id,actor:profiles!notifications_actor_id_fkey(id,display_name,avatar_url)'

export function NotificationsList({ onNavigate }: { onNavigate?: () => void }) {
  const sb = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'all' | 'mentions' | 'requests'>('all')
  const [list, setList] = useState<any[]>([])
  const [counts, setCounts] = useState({ all: 0, mentions: 0, requests: 0 })
  const [more, setMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [review, setReview] = useState<string | null>(null)
  const busy = useRef(false)

  const page = useCallback(async (reset: boolean, current: any[], t: typeof tab) => {
    if (busy.current) return
    busy.current = true; setLoading(true)
    let q = sb.from('notifications').select(COLS).order('created_at', { ascending: false }).limit(SIZE)
    if (t === 'requests') q = q.eq('type', 'request')
    if (t === 'mentions') q = q.in('type', MENTION_TYPES)
    if (!reset && current.length) q = q.lt('created_at', current[current.length - 1].created_at)
    const { data } = await q
    const rows = data ?? []
    setList((prev) => (reset ? rows : [...prev, ...rows.filter((r: any) => !prev.some((p) => p.id === r.id))]))
    setMore(rows.length === SIZE)
    busy.current = false; setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadCounts = useCallback(async () => {
    const c = (f: (q: any) => any) => f(sb.from('notifications').select('id', { count: 'exact', head: true })).then((r: any) => r.count ?? 0)
    const [all, mentions, requests] = await Promise.all([c((q) => q), c((q) => q.in('type', MENTION_TYPES)), c((q) => q.eq('type', 'request'))])
    setCounts({ all, mentions, requests })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setList([]); setMore(true); page(true, [], tab) }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadCounts() }, [loadCounts])

  const sentinel = useSentinel(() => page(false, list, tab), more && list.length > 0, list.length)

  async function markAll() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    setList((l) => l.map((n) => ({ ...n, read: true }))); router.refresh()
  }

  const Row = ({ n }: { n: any }) => (
    <>
      <Avatar name={n.actor?.display_name ?? 'Exclusive'} url={n.actor?.avatar_url} size={40} />
      <div className="grow" style={{ whiteSpace: 'normal', overflowWrap: 'anywhere' }}>
        <div style={{ fontSize: 14 }}>{n.actor?.display_name && <b style={{ fontWeight: 500 }}>{n.actor.display_name} </b>}{n.type === 'comment' ? 'commented on your post: ' : n.type === 'reflection' ? 'reflected on your post: ' : ''}{n.body}</div>
        <div className="sub" style={{ fontSize: 12 }}>{ago(n.created_at)} ago</div>
      </div>
      {!n.read && <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--b600)', flex: 'none' }} aria-label="Unread" />}
    </>
  )

  return (
    <>
      <div className="tabs" style={{ gap: 18, padding: '0 20px' }}>
        {(['all', 'mentions', 'requests'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)} style={{ fontSize: 15, display: 'flex', gap: 6, alignItems: 'center' }}>
            {t[0].toUpperCase() + t.slice(1)} {counts[t] > 0 && <span className="chip">{counts[t]}</span>}
          </button>
        ))}
        <span className="sp" />
        <button className="lk" style={{ fontSize: 13, fontWeight: 400 }} onClick={markAll}>Mark all as read</button>
      </div>
      {list.map((n) =>
        n.type === 'request' && n.ref_id ? (
          <button key={n.id} className="row" style={{ padding: '12px 20px', opacity: n.read ? 0.75 : 1 }} onClick={() => setReview(n.ref_id)}><Row n={n} /></button>
        ) : (
          <Link key={n.id} href={n.type === 'accepted' ? '/circles' : n.post_id && n.type !== 'comment' ? `/post/${n.post_id}` : n.actor ? `/profile/${n.actor.id}` : '/home'} onClick={onNavigate}
            className="row" style={{ padding: '12px 20px', opacity: n.read ? 0.75 : 1 }}><Row n={n} /></Link>
        )
      )}
      {!loading && list.length === 0 && <div className="empty">You are all caught up.</div>}
      {more && list.length > 0 && <div ref={sentinel} className="more">{loading && <span className="spin" aria-label="Loading more" />}</div>}
      {!more && list.length > SIZE && <div className="more sub">You’ve reached the beginning</div>}
      {review && <RequestReview id={review} onClose={() => setReview(null)} onDone={() => { page(true, [], tab); loadCounts(); router.refresh() }} />}
    </>
  )
}
