'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { createClient } from '@/lib/supabase/client'

export default function Search() {
  const [q, setQ] = useState('')
  const [res, setRes] = useState<any[]>([])
  const [me, setMe] = useState('')

  useEffect(() => { createClient().auth.getUser().then(({ data }) => setMe(data.user?.id ?? '')) }, [])
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = q.trim().replace(/[%,()]/g, '')
      let query = createClient().from('profiles').select('id,display_name,headline,avatar_url,grade').neq('display_name', '').limit(30)
      if (term) query = query.or(`display_name.ilike.%${term}%,headline.ilike.%${term}%`)
      const { data } = await query
      setRes(data ?? [])
    }, 250)
    return () => clearTimeout(t)
  }, [q])

  return (
    <>
      <div className="comp">
        <input className="t" aria-label="Search" placeholder="Search people, roles or interests" value={q} onChange={(e) => setQ(e.target.value)} style={{ borderRadius: 999 }} />
      </div>
      <div style={{ padding: '0 20px' }}>
        {res.filter((u) => u.id !== me).map((u) => (
          <Link key={u.id} href={`/profile/${u.id}`} className="row">
            <Avatar name={u.display_name} url={u.avatar_url} size={44} />
            <div className="grow"><div>{u.display_name}</div><div className="sub">{u.headline}</div></div>
            <span className="chip">Grade {u.grade}</span>
          </Link>
        ))}
        {res.filter((u) => u.id !== me).length === 0 && <div className="empty">No matches. Try another name or role.</div>}
      </div>
    </>
  )
}
