'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { CommentsSheet } from './CommentThread'
import { ImageGrid } from './ImageGrid'
import { Modal, toast, toastErr } from './Modal'
import { removeFiles } from '@/lib/storageCleanup'
import { ReflectModal } from './ReflectModal'
import { BlockModal, ReportModal } from './ReportModal'

export type Post = {
  id: string; author_id: string; body: string; image_url: string | null; is_global: boolean; created_at: string
  author_name: string; author_headline: string; author_avatar: string | null; author_grade: string; images?: string[]
  like_count: number; reflection_count: number; comment_count: number
  liked_by_me: boolean; reflected_by_me: boolean; noted_by_me: boolean
}

export function PostCard({ post, meId, pin, detail, onRemoved }: { post: Post; meId: string; pin?: boolean; detail?: boolean; onRemoved?: (id: string) => void }) {
  const from = post.is_global ? 'global' : 'home' // opens in Global Posts for global posts, Home otherwise
  const router = useRouter()
  const sb = createClient()
  const [s, setS] = useState({ l: post.liked_by_me, r: post.reflected_by_me, n: post.noted_by_me })
  const [counts, setCounts] = useState({ l: post.like_count, r: post.reflection_count, c: post.comment_count })
  const [sheet, setSheet] = useState<null | 'comments' | 'options' | 'global' | 'more' | 'reflect' | 'report' | 'block'>(null)
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
    if (fn === 'delete_post' && !post.is_global) {
      // a normal post is deleted for good, so free its photos too (Global Posts are kept as restorable drafts)
      const paths = (post.images?.length ? post.images : post.image_url ? [post.image_url] : []).filter((p) => !/^https?:/.test(p))
      if (paths.length) await removeFiles(sb, 'post-images', paths)
    }
    if (fn === 'delete_post' && !post.is_global) onRemoved?.(post.id)
    toast(ok); router.refresh()
  }

  return (
    <article className="post">
      <div className="ph">
        <Link href={`/profile/${post.author_id}`}><Avatar name={post.author_name} url={post.author_avatar} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div><Link href={`/profile/${post.author_id}`}><b>{post.author_name}</b></Link> <span className="sub">· {ago(post.created_at)}</span>{post.is_global && <span className="gico" title="Global Post"><Icon n="globe" /></span>}</div>
          <div className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{post.author_headline}</div>
        </div>
        {pin && <span className="pinic" title="Global Post"><Icon n="pin" /></span>}
        <button aria-label="Post options" className="dots" onClick={() => setSheet(mine ? 'options' : 'more')}><span className="dh">⋯</span><span className="dv">⋮</span></button>
      </div>
      {(() => {
        const urls = post.images?.length ? post.images : post.image_url ? [post.image_url] : []
        const body = <><p className="pt">{post.body}</p><ImageGrid urls={urls} /></>
        return detail ? body : <Link href={`/post/${post.id}?from=${from}`} className="plink" aria-label="Open post">{body}</Link>
      })()}
      <div className="act">
        <button className={'lkb' + (s.l ? ' on' : '')} onClick={() => toggle('post_likes', 'l', 'l')} aria-pressed={s.l}><Icon n="heart" />{counts.l}</button>
        <button className={s.r ? 'on' : ''} onClick={() => setSheet('reflect')} title="Reflect: add your thoughts" aria-label="Reflect on this post"><Icon n="ref" />{counts.r}</button>
        <button onClick={() => setSheet('comments')} aria-label="Comments"><Icon n="chat" />{counts.c}</button>
        <span className="sp" />
        <button className={s.n ? 'on' : ''} onClick={() => toggle('noted', 'n')} title="Noted" aria-pressed={s.n}><Icon n="bm" /></button>
        <button aria-label="Share" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/post/${post.id}?from=${from}`); toast('Link copied') }}><Icon n="share" /></button>
      </div>

      {sheet === 'reflect' && (
        <ReflectModal
          post={{ id: post.id, body: post.body, image_url: post.image_url, images: post.images, created_at: post.created_at, author_id: post.author_id, author_name: post.author_name, author_avatar: post.author_avatar }}
          meId={meId} onClose={() => setSheet(null)}
          onChange={(k) => {
            if (k === 'added') { setS((x) => ({ ...x, r: true })); setCounts((c) => ({ ...c, r: c.r + 1 })) }
            if (k === 'removed') { setS((x) => ({ ...x, r: false })); setCounts((c) => ({ ...c, r: Math.max(0, c.r - 1) })) }
          }} />
      )}
      {sheet === 'comments' && <CommentsSheet target={{ kind: 'post', id: post.id }} meId={meId} onClose={() => setSheet(null)} onAdd={() => setCounts((c) => ({ ...c, c: c.c + 1 }))} />}
      {sheet === 'more' && (
        <Modal title="Post options" bare onClose={() => setSheet(null)}>
          <div className="mb">
            <button className="row" onClick={() => { navigator.clipboard?.writeText(`${location.origin}/post/${post.id}?from=${from}`); setSheet(null); toast('Link copied') }}>Copy link to post</button>
            <Link className="row optrow" href={`/profile/${post.author_id}`} onClick={() => setSheet(null)}><Icon n="user" />View profile</Link>
            <button className="row optrow" onClick={() => setSheet('report')}><Icon n="flag" />Report post</button>
            <button className="row optrow" onClick={() => setSheet('block')}><Icon n="ban" />Block {post.author_name}</button>
          </div>
        </Modal>
      )}
      {sheet === 'report' && <ReportModal target={{ type: 'post', id: post.id }} onClose={() => setSheet(null)} />}
      {sheet === 'block' && <BlockModal user={{ id: post.author_id, name: post.author_name }} onClose={() => setSheet(null)} />}
      {sheet === 'options' && (
        <Modal title="Post options" bare onClose={() => setSheet(null)}>
          <div className="mb">
            {!post.is_global && <button className="row optrow" onClick={() => setSheet('global')}><Icon n="globe" />Make global post</button>}
            <button className="row optrow" onClick={() => run('delete_post', post.is_global ? 'Saved to drafts. You can restore it from your profile.' : 'Post deleted')}><Icon n="trash" />Delete post</button>
          </div>
        </Modal>
      )}
      {sheet === 'global' && (
        <Modal title="Make this post global" bare onClose={() => setSheet(null)}>
          <div className="mb cf">
            <h3 className="cf-title">Make this post global</h3>
            <p className="cf-text">This post will appear at the top of your profile and replace any previous global posts. It will also appear on Exclusive’s global feed.</p>
            <div className="cf-btns">
              <button className="bo" onClick={() => setSheet(null)}>Cancel</button>
              <button className="btn" onClick={() => run('make_global', 'Now your Global Post')}>Go global</button>
            </div>
          </div>
        </Modal>
      )}
    </article>
  )
}
