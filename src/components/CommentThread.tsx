'use client'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { toast, toastErr } from './Modal'
import { ReportModal } from './ReportModal'

export type CommentTarget = { kind: 'post' | 'reflection'; id: string }
const EMOJIS = ['😀', '😂', '😍', '🙏', '👏', '🔥', '💯', '🎉', '❤️', '😢', '🤔', '👍']

type C = { id: string; body: string; parent_id: string | null; created_at: string; author: { id: string; display_name: string; avatar_url: string | null; headline: string } }

/** Comments list + composer. Used inline on the post page and inside the bottom sheet. */
export function CommentThread({ target, meId, onAdd, inline }: { target: CommentTarget; meId: string; onAdd?: () => void; inline?: boolean }) {
  const sb = createClient()
  const col = target.kind === 'post' ? 'post_id' : 'reflection_id'
  const [list, setList] = useState<C[]>([])
  const [likes, setLikes] = useState<Record<string, { n: number; me: boolean }>>({})
  const [me, setMe] = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  const [text, setText] = useState('')
  const [reply, setReply] = useState<C | null>(null)
  const [sort, setSort] = useState<'relevant' | 'newest'>('relevant')
  const [menu, setMenu] = useState(false)
  const [emoji, setEmoji] = useState(false)
  const [reporting, setReporting] = useState<string | null>(null)
  const box = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
    const { data } = await sb.from('comments')
      .select('id,body,parent_id,created_at,author:profiles!comments_author_id_fkey(id,display_name,avatar_url,headline)')
      .eq(col, target.id).order('created_at')
    const rows = ((data as unknown as C[]) ?? [])
    setList(rows)
    if (rows.length) {
      const { data: lk } = await sb.from('comment_likes').select('comment_id,user_id').in('comment_id', rows.map((r) => r.id))
      const m: Record<string, { n: number; me: boolean }> = {}
      ;(lk ?? []).forEach((l: any) => { const x = (m[l.comment_id] ??= { n: 0, me: false }); x.n++; if (l.user_id === meId) x.me = true })
      setLikes(m)
    }
  }
  useEffect(() => {
    load()
    sb.from('profiles').select('display_name,avatar_url').eq('id', meId).single().then(({ data }) => setMe(data))
  }, [target.id]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = box.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
  }, [text])

  async function send() {
    if (!text.trim()) return
    const { error } = await sb.from('comments').insert({ [col]: target.id, author_id: meId, parent_id: reply?.id ?? null, body: text.trim() })
    if (error) return toastErr(errMsg(error))
    toast(reply ? 'Comment replied' : 'Comment posted')
    setText(''); setReply(null); setEmoji(false); onAdd?.(); load()
  }
  async function like(c: C) {
    const cur = likes[c.id] ?? { n: 0, me: false }
    setLikes({ ...likes, [c.id]: { n: cur.n + (cur.me ? -1 : 1), me: !cur.me } })
    const { error } = cur.me
      ? await sb.from('comment_likes').delete().eq('comment_id', c.id).eq('user_id', meId)
      : await sb.from('comment_likes').insert({ comment_id: c.id, user_id: meId })
    if (error) { setLikes({ ...likes }); toastErr(errMsg(error)) }
  }

  const replies = (id: string) => list.filter((r) => r.parent_id === id)
  const top = list.filter((c) => !c.parent_id).sort((a, b) => {
    if (sort === 'newest') return +new Date(b.created_at) - +new Date(a.created_at)
    const score = (c: C) => (likes[c.id]?.n ?? 0) + replies(c.id).length
    return score(b) - score(a) || +new Date(b.created_at) - +new Date(a.created_at)
  })

  const item = (c: C, small?: boolean) => (
    <div key={c.id} className="cm" style={{ marginLeft: small ? 44 : 0 }}>
      <Avatar name={c.author.display_name} url={c.author.avatar_url} size={small ? 28 : 36} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div><b style={{ fontWeight: 500 }}>{c.author.display_name}</b> <span className="sub">· {ago(c.created_at)}</span></div>
        <div className="sub cmh">{c.author.headline}</div>
        <div style={{ overflowWrap: 'anywhere', margin: '4px 0' }}>{c.body}</div>
        <div className="sub" style={{ display: 'flex', gap: 16 }}>
          <button onClick={() => like(c)} aria-pressed={likes[c.id]?.me} style={{ color: likes[c.id]?.me ? '#d92d20' : undefined }}>Like{likes[c.id]?.n ? ` · ${likes[c.id].n}` : ''}</button>
          {!small && <button onClick={() => { setReply(c); box.current?.focus() }}>Reply</button>}
          {c.author.id !== meId && <button onClick={() => setReporting(c.id)}>Report</button>}
        </div>
      </div>
    </div>
  )

  return (
    <div className={'cthread' + (inline ? ' inline' : '')}>
      <div className="sheet-head">
        <div style={{ position: 'relative' }}>
          <button className="sortbtn" aria-expanded={menu} onClick={() => setMenu(!menu)}>{sort === 'relevant' ? 'Most relevant' : 'Newest'} <Icon n="chev" /></button>
          {menu && (
            <div className="sortmenu" role="menu">
              <button role="menuitem" onClick={() => { setSort('relevant'); setMenu(false) }}>Most relevant</button>
              <button role="menuitem" onClick={() => { setSort('newest'); setMenu(false) }}>Newest</button>
            </div>
          )}
        </div>
      </div>
      <div className="sheet-list">
        {top.length === 0 && <div className="empty" style={{ padding: 30 }}>No comments yet. Start the conversation.</div>}
        {top.map((c) => (
          <div key={c.id} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {item(c)}
            {replies(c.id).map((r) => item(r, true))}
          </div>
        ))}
      </div>
      {reply && <div className="replying">Replying to <b style={{ fontWeight: 500 }}>{reply.author.display_name}</b><button aria-label="Cancel reply" onClick={() => setReply(null)}>✕</button></div>}
      {emoji && <div className="emojis">{EMOJIS.map((e) => <button key={e} aria-label={`Insert ${e}`} onClick={() => { setText((t) => t + e); box.current?.focus() }}>{e}</button>)}</div>}
      <div className="cin cdock">
        <Avatar name={me?.display_name} url={me?.avatar_url} size={36} />
        <div className="cbox">
          <textarea ref={box} rows={1} aria-label="Add a comment" placeholder="Add a comment" maxLength={2000} value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }} />
          {text.trim()
            ? <button className="sendc" aria-label="Send comment" onClick={send}><Icon n="send" /></button>
            : <button className="emo" aria-label="Add emoji" aria-pressed={emoji} onClick={() => setEmoji(!emoji)}><Icon n="smile" /></button>}
        </div>
      </div>
      {reporting && <ReportModal target={{ type: 'comment', id: reporting }} onClose={() => setReporting(null)} />}
    </div>
  )
}

export function CommentsSheet({ target, meId, onClose, onAdd }: { target: CommentTarget; meId: string; onClose: () => void; onAdd?: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="ov sheetov" onClick={onClose}>
      <div className="modal sheet" role="dialog" aria-modal="true" aria-label="Comments" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
        <button className="sheet-x" aria-label="Close comments" onClick={onClose}><Icon n="x" /></button>
        <CommentThread target={target} meId={meId} onAdd={onAdd} />
      </div>
    </div>
  )
}
