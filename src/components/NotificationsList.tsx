'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago } from '@/lib/util'
import { Avatar } from './Avatar'
import { RequestReview } from './RequestReview'

const isMention = (t: string) => t === 'comment' || t === 'mention' || t === 'reflection'

export function NotificationsList({ onNavigate }: { onNavigate?: () => void }) {
  const sb = createClient()
  const router = useRouter()
  const [tab, setTab] = useState<'all' | 'mentions' | 'requests'>('all')
  const [list, setList] = useState<any[]>([])
  const [review, setReview] = useState<string | null>(null)

  const load = async () => {
    const { data } = await sb.from('notifications')
      .select('id,type,body,read,created_at,post_id,ref_id,actor:profiles!notifications_actor_id_fkey(id,display_name,avatar_url)')
      .order('created_at', { ascending: false }).limit(100)
    setList(data ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function markAll() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    load(); router.refresh()
  }

  const count = (t: string) => t === 'all' ? list.length : list.filter((n) => (t === 'requests' ? n.type === 'request' : isMention(n.type))).length
  const shown = list.filter((n) => tab === 'all' || (tab === 'requests' ? n.type === 'request' : isMention(n.type)))

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
            {t[0].toUpperCase() + t.slice(1)} {count(t) > 0 && <span className="chip">{count(t)}</span>}
          </button>
        ))}
        <span className="sp" />
        <button className="lk" style={{ fontSize: 13, fontWeight: 400 }} onClick={markAll}>Mark all as read</button>
      </div>
      {shown.map((n) =>
        n.type === 'request' && n.ref_id ? (
          <button key={n.id} className="row" style={{ padding: '12px 20px', opacity: n.read ? 0.75 : 1 }} onClick={() => setReview(n.ref_id)}><Row n={n} /></button>
        ) : (
          <Link key={n.id} href={n.type === 'accepted' ? '/circles' : n.actor ? `/profile/${n.actor.id}` : '/home'} onClick={onNavigate}
            className="row" style={{ padding: '12px 20px', opacity: n.read ? 0.75 : 1 }}><Row n={n} /></Link>
        )
      )}
      {shown.length === 0 && <div className="empty">You are all caught up.</div>}
      {review && <RequestReview id={review} onClose={() => setReview(null)} onDone={() => { load(); router.refresh() }} />}
    </>
  )
}
