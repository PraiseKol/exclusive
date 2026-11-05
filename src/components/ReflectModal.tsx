'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useSignedUrls } from '@/lib/signedUrls'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Modal, toast, toastErr } from './Modal'

export type QuotePost = {
  id: string; body: string; image_url: string | null; images?: string[]; created_at?: string
  author_id: string; author_name: string; author_avatar: string | null; author_headline?: string
}
export type QuoteReflection = {
  id: string; body: string; reflector_id: string; reflector_name: string; reflector_avatar: string | null; created_at?: string
}

const openProps = (onOpen?: () => void) => onOpen
  ? { role: 'link' as const, tabIndex: 0, onClick: onOpen, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === 'Enter') onOpen() }, style: { cursor: 'pointer' } }
  : {}

/** The post being quoted. Pass `onOpen` to make the whole box open the post. */
export function QuotedPost({ q, onOpen }: { q: QuotePost; onOpen?: () => void }) {
  const first = (q.images?.[0] || q.image_url || '') as string
  const signed = useSignedUrls(first ? [first] : [])
  return (
    <div className="quote" {...openProps(onOpen)}>
      <div className="ph" style={{ gap: 8 }}>
        <Avatar name={q.author_name} url={q.author_avatar} size={24} />
        <Link href={`/profile/${q.author_id}`} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 500, fontSize: 14 }}>{q.author_name}</Link>
        {q.created_at && <span className="sub" style={{ fontSize: 12 }}>· {ago(q.created_at)}</span>}
      </div>
      <p className="qt">{q.body}</p>
      {first && signed[first] && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="qimg" src={signed[first]} alt="Quoted post attachment" loading="lazy" />
      )}
    </div>
  )
}

/** The reflection being quoted, when someone reflects on a reflection. */
export function QuotedReflection({ r, onOpen }: { r: QuoteReflection; onOpen?: () => void }) {
  return (
    <div className="quote" {...openProps(onOpen)}>
      <div className="ph" style={{ gap: 8 }}>
        <Avatar name={r.reflector_name} url={r.reflector_avatar} size={24} />
        <Link href={`/profile/${r.reflector_id}`} onClick={(e) => e.stopPropagation()} style={{ fontWeight: 500, fontSize: 14 }}>{r.reflector_name}</Link>
        <span className="sub" style={{ fontSize: 12 }}>· Reflection{r.created_at ? ` · ${ago(r.created_at)}` : ''}</span>
      </div>
      <p className="qt">{r.body}</p>
    </div>
  )
}

export function ReflectModal({ post, parent, meId, onClose, onChange }: {
  post: QuotePost; parent?: QuoteReflection | null; meId: string; onClose: () => void
  onChange?: (kind: 'added' | 'removed' | 'edited') => void
}) {
  const sb = createClient()
  const router = useRouter()
  const [mine, setMine] = useState<{ id: string; body: string } | null>(null)
  const [text, setText] = useState('')
  const [others, setOthers] = useState<any[]>([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    (async () => {
      let mq = sb.from('reflections').select('id,body').eq('post_id', post.id).eq('user_id', meId)
      mq = parent ? mq.eq('parent_reflection_id', parent.id) : mq.is('parent_reflection_id', null)
      let oq = sb.from('reflection_feed').select('id,reflector_id,reflector_name,reflector_avatar,body,created_at')
        .neq('reflector_id', meId).order('created_at', { ascending: false }).limit(20)
      oq = parent ? oq.eq('parent_reflection_id', parent.id) : oq.eq('post_id', post.id)
      const [{ data: m }, { data: o }] = await Promise.all([mq.maybeSingle(), oq])
      if (m) { setMine(m); setText(m.body) }
      setOthers(o ?? []); setReady(true)
    })()
  }, [post.id, parent?.id, meId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function save() {
    const body = text.trim()
    if (!body) return toastErr('Add your thoughts to reflect on this post')
    setBusy(true)
    const { error } = mine
      ? await sb.from('reflections').update({ body }).eq('id', mine.id)
      : await sb.from('reflections').insert({ post_id: post.id, user_id: meId, body, parent_reflection_id: parent?.id ?? null })
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    toast(mine ? 'Reflection updated' : 'Reflection posted')
    onChange?.(mine ? 'edited' : 'added'); onClose(); router.refresh()
  }
  async function remove() {
    if (!mine) return
    setBusy(true)
    const { error } = await sb.from('reflections').delete().eq('id', mine.id)
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    toast('Reflection removed'); onChange?.('removed'); onClose(); router.refresh()
  }

  return (
    <Modal title={mine ? 'Your reflection' : parent ? 'Reflect on this reflection' : 'Reflect on this post'} onClose={onClose}>
      <div className="mb">
        {parent && <QuotedReflection r={parent} />}
        <QuotedPost q={post} />
        <div>
          <textarea autoFocus maxLength={1000} placeholder="Add your reflection: what does this make you think?" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="cnt" style={{ textAlign: 'right' }}>{1000 - text.length} left</div>
        </div>
        <div className="fr" style={{ justifyContent: mine ? 'space-between' : 'flex-end' }}>
          {mine && <button className="lk" style={{ color: '#d92d20' }} disabled={busy} onClick={remove}>Remove reflection</button>}
          <button className="btn" disabled={busy || !text.trim()} onClick={save}>{busy ? 'Saving…' : mine ? 'Update' : 'Post reflection'}</button>
        </div>
        {ready && others.length > 0 && (
          <div>
            <div className="sub" style={{ marginBottom: 6 }}>Other reflections ({others.length})</div>
            {others.map((o) => (
              <div key={o.id} className="ph" style={{ alignItems: 'flex-start', padding: '8px 0' }}>
                <Avatar name={o.reflector_name} url={o.reflector_avatar} size={30} />
                <div style={{ minWidth: 0 }}>
                  <Link href={`/profile/${o.reflector_id}`} style={{ fontWeight: 500 }}>{o.reflector_name}</Link> <span className="sub">{ago(o.created_at)}</span>
                  <div style={{ overflowWrap: 'anywhere' }}>{o.body}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
