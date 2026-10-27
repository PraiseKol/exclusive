'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'
import { ago } from '@/lib/util'

export default function Notifications() {
  const sb = createClient()
  const [tab, setTab] = useState<'all' | 'mentions' | 'requests'>('all')
  const [list, setList] = useState<any[]>([])

  const load = async () => {
    const { data } = await sb.from('notifications')
      .select('id,type,body,read,created_at,post_id,actor:profiles!notifications_actor_id_fkey(id,display_name,avatar_url)')
      .order('created_at', { ascending: false }).limit(100)
    setList(data ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function markAll() {
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return
    await sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
    load()
  }

  const shown = list.filter((n) => tab === 'all' || (tab === 'requests' ? n.type === 'request' : ['comment', 'mention'].includes(n.type)))
  const count = (t: string) => list.filter((n) => (t === 'requests' ? n.type === 'request' : ['comment', 'mention'].includes(n.type))).length

  return (
    <>
      <div className="comp" style={{ paddingBottom: 0, border: 0 }}><h2 style={{ margin: 0, fontSize: 24, fontWeight: 500 }}>Notifications</h2></div>
      <div className="tabs">
        {(['all', 'mentions', 'requests'] as const).map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)} {t !== 'all' && count(t) > 0 && <span className="chip">{count(t)}</span>}
          </button>
        ))}
        <span className="sp" />
        <button className="lk" style={{ fontSize: 14 }} onClick={markAll}>Mark all as read</button>
      </div>
      {shown.map((n) => (
        <Link key={n.id} href={n.type === 'request' || n.type === 'accepted' ? '/circles' : n.actor ? `/profile/${n.actor.id}` : '/home'}
          className="row" style={{ padding: '14px 20px', opacity: n.read ? 0.7 : 1 }}>
          <Avatar name={n.actor?.display_name ?? 'Exclusive'} url={n.actor?.avatar_url} size={44} />
          <div className="grow" style={{ whiteSpace: 'normal' }}>
            <div>{n.actor?.display_name && <b style={{ fontWeight: 500 }}>{n.actor.display_name} </b>}{n.type === 'comment' ? 'commented on your post: ' : ''}{n.body}</div>
            <div className="sub">{ago(n.created_at)} ago</div>
          </div>
        </Link>
      ))}
      {shown.length === 0 && <div className="empty">You are all caught up.</div>}
    </>
  )
}
