'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Modal, toast, toastErr } from './Modal'
import { ReflectModal } from './ReflectModal'

export type Post = {
  id: string; author_id: string; body: string; image_url: string | null; is_global: boolean; created_at: string
  author_name: string; author_headline: string; author_avatar: string | null; author_grade: string
  like_count: number; reflection_count: number; comment_count: number
  liked_by_me: boolean; reflected_by_me: boolean; noted_by_me: boolean
}

export function PostCard({ post, meId, pin }: { post: Post; meId: string; pin?: boolean }) {
  const router = useRouter()
  const sb = createClient()
  const [s, setS] = useState({ l: post.liked_by_me, r: post.reflected_by_me, n: post.noted_by_me })
  const [counts, setCounts] = useState({ l: post.like_count, r: post.reflection_count, c: post.comment_count })
  const [sheet, setSheet] = useState<null | 'comments' | 'options' | 'global' | 'more' | 'reflect'>(null)
  const mine = post.author_id === meId

  async function toggle(table: 'post_likes' | 'reflections' | 'noted', key: 'l' | 'r' | 'n', ck?: 'l' | 'r') {
    const on = s[key]
    setS({ ...s, [key]: !on })
    if (ck) setCounts({ ...counts, [ck]: counts[ck] + (on ? -1 : 1) })
    const q = on
      ? sb.from(table).delete().eq('post_id', post.id).eq('user_id', meId)
      : sb.from(table).insert({ post_id: post.id, user_id: meId })
    const { error } = await q
    if (error) { setS({ ...s }); if (ck) setCounts({ ...counts }); toastErr(errMsg(error)) }
    else if (!on && key === 'r') toast('Reflected. Find it under Reflections on your profile.')
    else if (!on && key === 'n') toast('Saved privately to Noted')
  }

  async function run(fn: 'make_global' | 'delete_post', ok: string) {
    const { error } = await sb.rpc(fn, { p_post: post.id })
    setSheet(null)
    if (error) return toastErr(errMsg(error))
    toast(ok); router.refresh()
  }

  return (
    <article className="post">
      <div className="ph">
        <Link href={`/profile/${post.author_id}`}><Avatar name={post.author_name} url={post.author_avatar} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div><Link href={`/profile/${post.author_id}`}><b>{post.author_name}</b></Link> <span className="sub">· {ago(post.created_at)}{post.is_global ? ' · Global' : ''}</span></div>
          <div className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.author_headline}</div>
        </div>
        {pin && <span className="pinic" title="Global Post"><Icon n="pin" /></span>}
        <button aria-label="Post options" className="dots" onClick={() => setSheet(mine ? 'options' : 'more')}><span className="dh">⋯</span><span className="dv">⋮</span></button>
      </div>
      <p className="pt">{post.body}</p>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pimg" src={post.image_url} alt="Post attachment" />
      )}
      <div className="act">
        <button className={'lkb' + (s.l ? ' on' : '')} onClick={() => toggle('post_likes', 'l', 'l')} aria-pressed={s.l}><Icon n="heart" />{counts.l}</button>
        <button className={s.r ? 'on' : ''} onClick={() => setSheet('reflect')} title="Reflect: add your thoughts" aria-label="Reflect on this post"><Icon n="ref" />{counts.r}</button>
        <button onClick={() => setSheet('comments')}><Icon n="chat" />{counts.c}</button>
        <span className="sp" />
        <button className={s.n ? 'on' : ''} onClick={() => toggle('noted', 'n')} title="Noted" aria-pressed={s.n}><Icon n="bm" /></button>
        <button aria-label="Share" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/profile/${post.author_id}`); toast('Link copied') }}><Icon n="share" /></button>
      </div>

      {sheet === 'reflect' && (
        <ReflectModal
          post={{ id: post.id, body: post.body, image_url: post.image_url, created_at: post.created_at, author_id: post.author_id, author_name: post.author_name, author_avatar: post.author_avatar }}
          meId={meId} onClose={() => setSheet(null)}
          onChange={(k) => {
            if (k === 'added') { setS((x) => ({ ...x, r: true })); setCounts((c) => ({ ...c, r: c.r + 1 })) }
            if (k === 'removed') { setS((x) => ({ ...x, r: false })); setCounts((c) => ({ ...c, r: Math.max(0, c.r - 1) })) }
          }} />
      )}
      {sheet === 'comments' && <Comments postId={post.id} meId={meId} onClose={() => setSheet(null)} onAdd={() => { setCounts((c) => ({ ...c, c: c.c + 1 })) }} />}
      {sheet === 'more' && (
        <Modal title="Post options" onClose={() => setSheet(null)}>
          <div className="mb">
            <button className="row" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/profile/${post.author_id}`); setSheet(null); toast('Link copied') }}>Copy link to profile</button>
            <Link className="row" href={`/profile/${post.author_id}`} onClick={() => setSheet(null)}>View profile</Link>
          </div>
        </Modal>
      )}
      {sheet === 'options' && (
        <Modal title="Post options" onClose={() => setSheet(null)}>
          <div className="mb">
            {!post.is_global && <button className="row optrow" onClick={() => setSheet('global')}><Icon n="globe" />Make global post</button>}
            <button className="row optrow danger" onClick={() => run('delete_post', post.is_global ? 'Saved to drafts. You can restore it from your profile.' : 'Post deleted')}><Icon n="trash" />Delete post</button>
          </div>
        </Modal>
      )}
      {sheet === 'global' && (
        <Modal title="Make this post global" onClose={() => setSheet(null)}>
          <div className="mb">
            <p style={{ margin: 0 }}>This post will appear at the top of your profile and replace your current global post. It will also appear on Exclusive’s global feed.</p>
            <div className="fr">
              <button className="btn sec" onClick={() => setSheet(null)}>Cancel</button>
              <button className="btn" onClick={() => run('make_global', 'Now your Global Post')}>Go global</button>
            </div>
          </div>
        </Modal>
      )}
    </article>
  )
}

const EMOJIS = ['😀', '😂', '😍', '🙏', '👏', '🔥', '💯', '🎉', '❤️', '😢', '🤔', '👍']

type C = { id: string; body: string; parent_id: string | null; created_at: string; author: { id: string; display_name: string; avatar_url: string | null; headline: string } }

function Comments({ postId, meId, onClose, onAdd }: { postId: string; meId: string; onClose: () => void; onAdd: () => void }) {
  const sb = createClient()
  const [list, setList] = useState<C[]>([])
  const [likes, setLikes] = useState<Record<string, { n: number; me: boolean }>>({})
  const [me, setMe] = useState<{ display_name: string; avatar_url: string | null } | null>(null)
  const [text, setText] = useState('')
  const [reply, setReply] = useState<C | null>(null)
  const [sort, setSort] = useState<'relevant' | 'newest'>('relevant')
  const [menu, setMenu] = useState(false)
  const [emoji, setEmoji] = useState(false)
  const box = useRef<HTMLTextAreaElement>(null)

  const load = async () => {
    const { data } = await sb.from('comments')
      .select('id,body,parent_id,created_at,author:profiles!comments_author_id_fkey(id,display_name,avatar_url,headline)')
      .eq('post_id', postId).order('created_at')
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
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const el = box.current
    if (el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 120) + 'px' }
  }, [text])

  async function send() {
    if (!text.trim()) return
    const { error } = await sb.from('comments').insert({ post_id: postId, author_id: meId, parent_id: reply?.id ?? null, body: text.trim() })
    if (error) return toastErr(errMsg(error))
    toast(reply ? 'Comment replied' : 'Comment posted')
    setText(''); setReply(null); setEmoji(false); onAdd(); load()
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
        </div>
      </div>
    </div>
  )

  return (
    <div className="ov sheetov" onClick={onClose}>
      <div className="modal sheet" role="dialog" aria-modal="true" aria-label="Comments" onClick={(e) => e.stopPropagation()}>
        <div className="grab" />
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
          <button aria-label="Close comments" onClick={onClose} style={{ width: 28, height: 28 }}><Icon n="x" /></button>
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
        <div className="cin">
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
      </div>
    </div>
  )
}
