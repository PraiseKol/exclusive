'use client'
import Link from 'next/link'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { CommentsSheet } from './CommentThread'
import { Icon } from './Icon'
import { toastErr } from './Modal'
import { QuotedPost, ReflectModal } from './ReflectModal'

export type ReflectionRow = {
  id: string; reflector_id: string; reflector_name: string; reflector_avatar: string | null; reflector_headline: string
  body: string; created_at: string
  post_id: string; post_body: string; post_image: string | null; post_images?: string[]; post_is_global: boolean; post_created_at: string
  post_author_id: string; post_author_name: string; post_author_avatar: string | null; post_author_headline: string
  like_count?: number; comment_count?: number; liked_by_me?: boolean
}

export function ReflectionCard({ row, meId }: { row: ReflectionRow; meId: string }) {
  const sb = createClient()
  const [edit, setEdit] = useState(false)
  const [sheet, setSheet] = useState(false)
  const [liked, setLiked] = useState(!!row.liked_by_me)
  const [likes, setLikes] = useState(row.like_count ?? 0)
  const [comments, setComments] = useState(row.comment_count ?? 0)
  const mine = row.reflector_id === meId
  const quote = {
    id: row.post_id, body: row.post_body, image_url: row.post_image, images: row.post_images, created_at: row.post_created_at,
    author_id: row.post_author_id, author_name: row.post_author_name, author_avatar: row.post_author_avatar,
  }

  async function like() {
    const was = liked
    setLiked(!was); setLikes((n) => n + (was ? -1 : 1))
    const { error } = was
      ? await sb.from('reflection_likes').delete().eq('reflection_id', row.id).eq('user_id', meId)
      : await sb.from('reflection_likes').insert({ reflection_id: row.id, user_id: meId })
    if (error) { setLiked(was); setLikes((n) => n + (was ? 1 : -1)); toastErr(errMsg(error)) }
  }

  return (
    <article className="post">
      <div className="ph">
        <Link href={`/profile/${row.reflector_id}`}><Avatar name={row.reflector_name} url={row.reflector_avatar} /></Link>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div><Link href={`/profile/${row.reflector_id}`}><b>{row.reflector_name}</b></Link> <span className="sub">· {ago(row.created_at)} · Reflection</span></div>
          <div className="sub" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.reflector_headline}</div>
        </div>
        {mine && <button className="lk" onClick={() => setEdit(true)}>Edit</button>}
      </div>
      <p className="pt">{row.body}</p>
      <QuotedPost q={quote} />
      <div className="act">
        <button className={'lkb' + (liked ? ' on' : '')} onClick={like} aria-pressed={liked} aria-label="Like reflection"><Icon n="heart" />{likes}</button>
        <button onClick={() => setSheet(true)} aria-label="Comments on reflection"><Icon n="chat" />{comments}</button>
      </div>
      {edit && <ReflectModal post={quote} meId={meId} onClose={() => setEdit(false)} />}
      {sheet && <CommentsSheet target={{ kind: 'reflection', id: row.id }} meId={meId} onClose={() => setSheet(false)} onAdd={() => setComments((n) => n + 1)} />}
    </article>
  )
}
