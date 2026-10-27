'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { Modal, toast } from './Modal'

export type Post = {
  id: string; author_id: string; body: string; image_url: string | null; is_global: boolean; created_at: string
  author_name: string; author_headline: string; author_avatar: string | null; author_grade: string
  like_count: number; reflection_count: number; comment_count: number
  liked_by_me: boolean; reflected_by_me: boolean; noted_by_me: boolean
}

export function PostCard({ post, meId }: { post: Post; meId: string }) {
  const router = useRouter()
  const sb = createClient()
  const [s, setS] = useState({ l: post.liked_by_me, r: post.reflected_by_me, n: post.noted_by_me })
  const [counts, setCounts] = useState({ l: post.like_count, r: post.reflection_count, c: post.comment_count })
  const [sheet, setSheet] = useState<null | 'comments' | 'options' | 'global'>(null)
  const mine = post.author_id === meId

  async function toggle(table: 'post_likes' | 'reflections' | 'noted', key: 'l' | 'r' | 'n', ck?: 'l' | 'r') {
    const on = s[key]
    setS({ ...s, [key]: !on })
    if (ck) setCounts({ ...counts, [ck]: counts[ck] + (on ? -1 : 1) })
    const q = on
      ? sb.from(table).delete().eq('post_id', post.id).eq('user_id', meId)
      : sb.from(table).insert({ post_id: post.id, user_id: meId })
    const { error } = await q
    if (error) { setS({ ...s }); if (ck) setCounts({ ...counts }); toast(errMsg(error)) }
    else if (!on && key === 'r') toast('Reflected. Find it under Reflections on your profile.')
    else if (!on && key === 'n') toast('Saved privately to Noted')
  }

  async function run(fn: 'make_global' | 'delete_post', ok: string) {
    const { error } = await sb.rpc(fn, { p_post: post.id })
    setSheet(null)
    if (error) return toast(errMsg(error))
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
        {mine && <button aria-label="Post options" style={{ fontSize: 20 }} onClick={() => setSheet('options')}>⋯</button>}
      </div>
      <p className="pt">{post.body}</p>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="pimg" src={post.image_url} alt="Post attachment" />
      )}
      <div className="act">
        <button className={'lkb' + (s.l ? ' on' : '')} onClick={() => toggle('post_likes', 'l', 'l')} aria-pressed={s.l}><Icon n="heart" />{counts.l}</button>
        <button className={s.r ? 'on' : ''} onClick={() => toggle('reflections', 'r', 'r')} title="Reflect" aria-pressed={s.r}><Icon n="ref" />{counts.r}</button>
        <button onClick={() => setSheet('comments')}><Icon n="chat" />{counts.c}</button>
        <span className="sp" />
        <button className={s.n ? 'on' : ''} onClick={() => toggle('noted', 'n')} title="Noted" aria-pressed={s.n}><Icon n="bm" /></button>
        <button aria-label="Share" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/profile/${post.author_id}`); toast('Link copied') }}><Icon n="share" /></button>
      </div>

      {sheet === 'comments' && <Comments postId={post.id} meId={meId} onClose={() => setSheet(null)} onAdd={() => { setCounts((c) => ({ ...c, c: c.c + 1 })) }} />}
      {sheet === 'options' && (
        <Modal title="Post options" onClose={() => setSheet(null)}>
          <div className="mb">
            {!post.is_global && <button className="row" onClick={() => setSheet('global')}>Make global post</button>}
            <button className="row" onClick={() => run('delete_post', post.is_global ? 'Saved to drafts. You can restore it from your profile.' : 'Post deleted')}>Delete post</button>
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

type C = { id: string; body: string; parent_id: string | null; created_at: string; author: { id: string; display_name: string; avatar_url: string | null } }

function Comments({ postId, meId, onClose, onAdd }: { postId: string; meId: string; onClose: () => void; onAdd: () => void }) {
  const sb = createClient()
  const [list, setList] = useState<C[]>([])
  const [text, setText] = useState('')
  const [reply, setReply] = useState<C | null>(null)

  const load = async () => {
    const { data } = await sb.from('comments')
      .select('id,body,parent_id,created_at,author:profiles!comments_author_id_fkey(id,display_name,avatar_url)')
      .eq('post_id', postId).order('created_at')
    setList((data as unknown as C[]) ?? [])
  }
  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function send() {
    if (!text.trim()) return
    const { error } = await sb.from('comments').insert({ post_id: postId, author_id: meId, parent_id: reply?.id ?? null, body: text.trim() })
    if (error) return toast(errMsg(error))
    setText(''); setReply(null); onAdd(); load()
  }

  const top = list.filter((c) => !c.parent_id)
  const Item = ({ c, small }: { c: C; small?: boolean }) => (
    <div className="ph" style={{ alignItems: 'flex-start', marginLeft: small ? 44 : 0, marginTop: small ? 8 : 0 }}>
      <Avatar name={c.author.display_name} url={c.author.avatar_url} size={small ? 28 : 38} />
      <div>
        <b>{c.author.display_name}</b> <span className="sub">{ago(c.created_at)}</span>
        <div>{c.body}</div>
        {!small && <button className="sub" onClick={() => setReply(c)}>Reply</button>}
      </div>
    </div>
  )

  return (
    <Modal title="Comments" onClose={onClose}>
      <div className="mb" style={{ maxHeight: '50vh', overflow: 'auto' }}>
        {top.length === 0 && <div className="empty" style={{ padding: 20 }}>No comments yet. Start the conversation.</div>}
        {top.map((c) => (
          <div key={c.id}>
            <Item c={c} />
            {list.filter((r) => r.parent_id === c.id).map((r) => <Item key={r.id} c={r} small />)}
          </div>
        ))}
      </div>
      <div className="fr" style={{ padding: '0 18px 18px' }}>
        <input className="t" style={{ flex: 1 }} placeholder={reply ? `Reply to ${reply.author.display_name}` : 'Add a comment'} value={text}
          onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} />
        <button className="btn" onClick={send}>Post</button>
      </div>
    </Modal>
  )
}
