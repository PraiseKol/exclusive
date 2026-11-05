'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { CommentsSheet } from './CommentThread'
import { Icon } from './Icon'
import { Modal, toast, toastErr } from './Modal'
import { QuotedPost, QuotedReflection, ReflectModal } from './ReflectModal'
import { BlockModal, ReportModal } from './ReportModal'

export type ReflectionRow = {
  id: string; reflector_id: string; reflector_name: string; reflector_avatar: string | null; reflector_headline: string
  body: string; created_at: string
  post_id: string; post_body: string; post_image: string | null; post_images?: string[]; post_is_global: boolean; post_created_at: string
  post_author_id: string; post_author_name: string; post_author_avatar: string | null; post_author_headline: string
  like_count: number; comment_count: number; liked_by_me: boolean
  parent_reflection_id: string | null; parent_body: string | null; parent_reflector_id: string | null
  parent_reflector_name: string | null; parent_reflector_avatar: string | null
  reflection_count: number; noted_by_me: boolean; reflected_by_me: boolean
}

/** A reflection is a full post: like, reflect on it, comment, save, share, report. */
export function ReflectionCard({ row, meId, detail, onRemoved }: { row: ReflectionRow; meId: string; detail?: boolean; onRemoved?: (id: string) => void }) {
  const router = useRouter()
  const sb = createClient()
  const mine = row.reflector_id === meId
  const from = row.post_is_global ? 'global' : 'home' // where this opens: Global Posts for global content, Home otherwise
  const [liked, setLiked] = useState(row.liked_by_me)
  const [likes, setLikes] = useState(row.like_count)
  const [noted, setNoted] = useState(row.noted_by_me)
  const [reflected, setReflected] = useState(row.reflected_by_me)
  const [reflects, setReflects] = useState(row.reflection_count)
  const [comments, setComments] = useState(row.comment_count)
  const [sheet, setSheet] = useState<null | 'reflect' | 'comments' | 'options' | 'more' | 'report' | 'block' | 'edit'>(null)

  const quote = {
    id: row.post_id, body: row.post_body, image_url: row.post_image, images: row.post_images, created_at: row.post_created_at,
    author_id: row.post_author_id, author_name: row.post_author_name, author_avatar: row.post_author_avatar,
  }
  const asParent = { id: row.id, body: row.body, reflector_id: row.reflector_id, reflector_name: row.reflector_name, reflector_avatar: row.reflector_avatar, created_at: row.created_at }
  const parentOfThis = row.parent_reflection_id && row.parent_body !== null
    ? { id: row.parent_reflection_id, body: row.parent_body, reflector_id: row.parent_reflector_id ?? '', reflector_name: row.parent_reflector_name ?? 'Unavailable', reflector_avatar: row.parent_reflector_avatar }
    : null
  const link = `/reflection/${row.id}?from=${from}`

  async function toggleLike() {
    const was = liked
    setLiked(!was); setLikes((n) => n + (was ? -1 : 1))
    const { error } = was
      ? await sb.from('reflection_likes').delete().eq('reflection_id', row.id).eq('user_id', meId)
      : await sb.from('reflection_likes').insert({ reflection_id: row.id, user_id: meId })
    if (error) { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); toastErr(errMsg(error)) }
  }
  async function toggleNoted() {
    const was = noted
    setNoted(!was)
    const { error } = was
      ? await sb.from('reflection_noted').delete().eq('reflection_id', row.id).eq('user_id', meId)
      : await sb.from('reflection_noted').insert({ reflection_id: row.id, user_id: meId })
    if (error) { setNoted(was); return toastErr(errMsg(error)) }
    toast(was ? 'Removed from Noted' : 'Saved privately to Noted')
  }
  async function del() {
    const { error } = await sb.from('reflections').delete().eq('id', row.id)
    setSheet(null)
    if (error) return toastErr(errMsg(error))
    toast('Reflection deleted'); onRemoved?.(row.id)
    if (detail) router.replace(from === 'global' ? '/global' : '/home'); else router.refresh()
  }
  const share = () => { navigator.clipboard?.writeText(`${location.origin}${link}`); toast('Link copied') }

  const header = (
    <div className="ph">
      <Link href={`/profile/${row.reflector_id}`}><Avatar name={row.reflector_name} url={row.reflector_avatar} /></Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div><Link href={`/profile/${row.reflector_id}`}><b>{row.reflector_name}</b></Link> <span className="sub">· {ago(row.created_at)} · Reflection</span></div>
        <div className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.reflector_headline}</div>
      </div>
      <button aria-label="Reflection options" className="dots" onClick={() => setSheet(mine ? 'options' : 'more')}><span className="dh">⋯</span><span className="dv">⋮</span></button>
    </div>
  )

  return (
    <article className="post">
      {header}
      {detail ? <p className="pt">{row.body}</p> : <Link href={link} className="plink" aria-label="Open reflection"><p className="pt">{row.body}</p></Link>}
      {parentOfThis && (
        <QuotedReflection r={parentOfThis} onOpen={() => router.push(`/reflection/${parentOfThis.id}?from=${from}`)} />
      )}
      <QuotedPost q={quote} onOpen={() => router.push(`/post/${row.post_id}?from=${from}`)} />

      <div className="act">
        <button className={'lkb' + (liked ? ' on' : '')} onClick={toggleLike} aria-pressed={liked} aria-label="Like"><Icon n="heart" />{likes}</button>
        <button className={reflected ? 'on' : ''} onClick={() => setSheet('reflect')} title="Reflect: add your thoughts" aria-label="Reflect on this reflection"><Icon n="ref" />{reflects}</button>
        <button onClick={() => (detail ? (document.querySelector('.cdock textarea') as HTMLElement | null)?.focus() : setSheet('comments'))} aria-label="Comments"><Icon n="chat" />{comments}</button>
        <span className="sp" />
        <button className={noted ? 'on' : ''} onClick={toggleNoted} title="Noted" aria-pressed={noted} aria-label="Save to Noted"><Icon n="bm" /></button>
        <button aria-label="Share" onClick={share}><Icon n="share" /></button>
      </div>

      {sheet === 'reflect' && (
        <ReflectModal post={quote} parent={asParent} meId={meId} onClose={() => setSheet(null)}
          onChange={(k) => {
            if (k === 'added') { setReflected(true); setReflects((n) => n + 1) }
            if (k === 'removed') { setReflected(false); setReflects((n) => Math.max(0, n - 1)) }
          }} />
      )}
      {sheet === 'edit' && <ReflectModal post={quote} parent={parentOfThis} meId={meId} onClose={() => setSheet(null)} onChange={(k) => { if (k === 'removed') onRemoved?.(row.id) }} />}
      {sheet === 'comments' && <CommentsSheet target={{ kind: 'reflection', id: row.id }} meId={meId} onClose={() => setSheet(null)} onAdd={() => setComments((n) => n + 1)} />}
      {sheet === 'options' && (
        <Modal title="Reflection options" bare onClose={() => setSheet(null)}>
          <div className="mb">
            <button className="row optrow" onClick={() => setSheet('edit')}><Icon n="chat" />Edit reflection</button>
            <button className="row optrow" onClick={del}><Icon n="trash" />Delete reflection</button>
          </div>
        </Modal>
      )}
      {sheet === 'more' && (
        <Modal title="Reflection options" bare onClose={() => setSheet(null)}>
          <div className="mb">
            <button className="row optrow" onClick={() => { share(); setSheet(null) }}><Icon n="share" />Copy link to reflection</button>
            <button className="row optrow" onClick={() => setSheet('report')}><Icon n="flag" />Report reflection</button>
            <button className="row optrow" onClick={() => setSheet('block')}><Icon n="ban" />Block {row.reflector_name}</button>
          </div>
        </Modal>
      )}
      {sheet === 'report' && <ReportModal target={{ type: 'reflection', id: row.id }} onClose={() => setSheet(null)} />}
      {sheet === 'block' && <BlockModal user={{ id: row.reflector_id, name: row.reflector_name }} onClose={() => setSheet(null)} />}
    </article>
  )
}
