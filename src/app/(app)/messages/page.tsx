'use client'
import { useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { toast } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'

type Cat = 'general' | 'important' | 'emergency'

function Chat() {
  const sb = createClient()
  const to = useSearchParams().get('to')
  const [me, setMe] = useState('')
  const [partners, setPartners] = useState<any[]>([])
  const [cur, setCur] = useState<string | null>(to)
  const [cat, setCat] = useState<Cat>('general')
  const [msgs, setMsgs] = useState<any[]>([])
  const [text, setText] = useState('')
  const [lim, setLim] = useState<any>(null)

  const loadLimits = async () => { const { data } = await sb.rpc('my_limits'); setLim(data) }
  useEffect(() => {
    (async () => {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) return
      setMe(user.id)
      const { data } = await sb.from('connections')
        .select('mentor_id,mentee_id,mentor:profiles!connections_mentor_id_fkey(id,display_name,avatar_url,headline),mentee:profiles!connections_mentee_id_fkey(id,display_name,avatar_url,headline)')
        .eq('status', 'active').gt('expires_at', new Date().toISOString())
      const ps = (data ?? []).map((c: any) => (c.mentor_id === user.id ? c.mentee : c.mentor))
      setPartners(ps)
      setCur((c) => c ?? ps[0]?.id ?? null)
      loadLimits()
    })()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMsgs = useCallback(async () => {
    if (!cur || !me) return
    const { data } = await sb.from('messages').select('id,sender_id,body,category,created_at')
      .or(`and(sender_id.eq.${me},recipient_id.eq.${cur}),and(sender_id.eq.${cur},recipient_id.eq.${me})`)
      .eq('category', cat).order('created_at')
    setMsgs(data ?? [])
    await sb.from('messages').update({ read_at: new Date().toISOString() }).eq('recipient_id', me).eq('sender_id', cur).is('read_at', null)
  }, [cur, me, cat]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { loadMsgs() }, [loadMsgs])

  useEffect(() => {
    if (!me) return
    const ch = sb.channel('dm-' + me)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${me}` }, () => loadMsgs())
      .subscribe()
    return () => { sb.removeChannel(ch) }
  }, [me, loadMsgs]) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!text.trim() || !cur) return
    const { error } = await sb.from('messages').insert({ sender_id: me, recipient_id: cur, category: cat, body: text.trim() })
    if (error) return toast(errMsg(error))
    setText(''); loadMsgs(); loadLimits()
  }

  const left = (c: Cat) => (c === 'general' ? '∞' : lim ? lim[c + '_left'] : '…')
  const partner = partners.find((p) => p.id === cur)

  if (partners.length === 0)
    return <div className="empty">Only mentors and mentees can message each other. Once a mentorship is active, your conversations will appear here.</div>

  return (
    <>
      <div className="tabs">
        {(['general', 'important', 'emergency'] as Cat[]).map((c) => (
          <button key={c} className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>
            {c[0].toUpperCase() + c.slice(1)} <span className="sub">{left(c)}{c !== 'general' && ' left'}</span>
          </button>
        ))}
      </div>
      <div className="pb" style={{ flexWrap: 'wrap' }}>
        {partners.map((p) => (
          <button key={p.id} className={'pill' + (cur === p.id ? ' on' : '')} onClick={() => setCur(p.id)}>{p.display_name}</button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px', minHeight: 200 }}>
        {msgs.map((m) => <div key={m.id} className={'bub' + (m.sender_id === me ? ' mine' : '')}>{m.body}</div>)}
        {msgs.length === 0 && <div className="empty">No {cat} messages with {partner?.display_name} yet.</div>}
      </div>
      <div className="fr" style={{ padding: 20 }}>
        <input className="t" style={{ flex: 1 }} placeholder={`Send a ${cat} message to ${partner?.display_name ?? ''}`} value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn" onClick={send}>Send</button>
      </div>
      <p className="sub" style={{ padding: '0 20px' }}>Choose a category before sending. Emergency and important messages are limited each month.</p>
    </>
  )
}

export default function Messages() {
  return <Suspense><Chat /></Suspense>
}
