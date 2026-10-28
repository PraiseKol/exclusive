'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { RequestModal } from '@/components/RequestModal'
import { createClient } from '@/lib/supabase/client'
import { INTERESTS } from '@/lib/util'

const COLS = 'id,display_name,headline,avatar_url,username'
type P = { id: string; display_name: string; headline: string; avatar_url: string | null; username: string | null }

export function SearchView({ q }: { q: string }) {
  const [me, setMe] = useState('')
  const [linked, setLinked] = useState<Set<string>>(new Set())
  const [sentTo, setSentTo] = useState<Set<string>>(new Set())
  const [groups, setGroups] = useState<{ interest: string; people: P[] }[]>([])
  const [open, setOpen] = useState<string | null>(null)
  const [res, setRes] = useState<P[] | null>(null)
  const [req, setReq] = useState<P | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setMe(user.id)
      const [{ data: prof }, { data: conns }, { data: pend }] = await Promise.all([
        sb.from('profiles').select('interests').eq('id', user.id).single(),
        sb.from('connections').select('mentor_id,mentee_id').eq('status', 'active'),
        sb.from('mentor_requests').select('mentor_id').eq('requester_id', user.id).eq('status', 'pending'),
      ])
      setLinked(new Set((conns ?? []).flatMap((c: any) => [c.mentor_id, c.mentee_id])))
      setSentTo(new Set((pend ?? []).map((r: any) => r.mentor_id)))
      const mine: string[] = prof?.interests?.length ? prof.interests : INTERESTS.slice(0, 4)
      const out = await Promise.all(mine.slice(0, 5).map(async (interest) => {
        const { data } = await sb.from('profiles').select(COLS).contains('interests', [interest]).neq('id', user.id).neq('display_name', '').limit(30)
        return { interest, people: (data ?? []) as P[] }
      }))
      let g = out.filter((x) => x.people.length)
      if (!g.length) {
        const { data } = await sb.from('profiles').select(COLS).neq('id', user.id).neq('display_name', '').order('created_at', { ascending: false }).limit(30)
        if (data?.length) g = [{ interest: '', people: data as P[] }]
      }
      setGroups(g); setReady(true)
    })()
  }, [])

  useEffect(() => {
    const term = q.trim().replace(/[%,()"]/g, '')
    if (!term) return setRes(null)
    const t = setTimeout(async () => {
      const topics = INTERESTS.filter((i) => i.toLowerCase().includes(term.toLowerCase())).map((i) => `interests.cs.{"${i}"}`)
      const filters = [`display_name.ilike.%${term}%`, `headline.ilike.%${term}%`, `username.ilike.%${term}%`, ...topics].join(',')
      const { data } = await createClient().from('profiles').select(COLS).neq('display_name', '').or(filters).limit(40)
      setRes(((data ?? []) as P[]).filter((p) => p.id !== me))
    }, 250)
    return () => clearTimeout(t)
  }, [q, me])

  const Card = ({ p }: { p: P }) => {
    const connected = linked.has(p.id), sent = sentTo.has(p.id)
    return (
      <div className="pc">
        <Link href={`/profile/${p.id}`} className="pc-top">
          <Avatar name={p.display_name} url={p.avatar_url} size={64} />
          <b style={{ fontWeight: 500 }}>{p.display_name}</b>
          <span className="hl">{p.headline || (p.username ? '@' + p.username : '')}</span>
        </Link>
        <button className="mm" disabled={connected || sent} onClick={() => setReq(p)}>{connected ? 'In your circle' : sent ? 'Request sent' : 'Mentor me'}</button>
      </div>
    )
  }

  return (
    <>
      <div style={{ padding: '0 16px' }}>
        {res !== null ? (
          <>
            <div className="grid" style={{ marginTop: 16 }}>{res.map((p) => <Card key={p.id} p={p} />)}</div>
            {res.length === 0 && <div className="empty">No matches. Try another name, role or topic.</div>}
          </>
        ) : (
          <>
            {groups.map((g) => {
              const all = open === g.interest
              return (
                <section key={g.interest || 'new'} style={{ marginTop: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500 }}>{g.interest ? `People in the ${g.interest}` : 'New on Exclusive'}</h3>
                    {g.people.length > 4 && <button className="sub" onClick={() => setOpen(all ? null : g.interest)}>{all ? 'Show less' : 'Show all'}</button>}
                  </div>
                  <div className="grid" style={{ marginTop: 10 }}>{(all ? g.people : g.people.slice(0, 4)).map((p) => <Card key={p.id} p={p} />)}</div>
                </section>
              )
            })}
            {ready && groups.length === 0 && <div className="empty">No one to suggest yet. As more people join, they’ll appear here by topic.</div>}
          </>
        )}
      </div>
      {req && <RequestModal person={req} onClose={() => setReq(null)} onSent={() => setSentTo((s) => new Set(s).add(req.id))} />}
    </>
  )
}
