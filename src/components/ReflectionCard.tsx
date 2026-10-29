'use client'
import Link from 'next/link'
import { useState } from 'react'
import { ago } from '@/lib/util'
import { Avatar } from './Avatar'
import { QuotedPost, ReflectModal } from './ReflectModal'

export type ReflectionRow = {
  id: string; reflector_id: string; reflector_name: string; reflector_avatar: string | null; reflector_headline: string
  body: string; created_at: string
  post_id: string; post_body: string; post_image: string | null; post_is_global: boolean; post_created_at: string
  post_author_id: string; post_author_name: string; post_author_avatar: string | null; post_author_headline: string
}

export function ReflectionCard({ row, meId }: { row: ReflectionRow; meId: string }) {
  const [edit, setEdit] = useState(false)
  const mine = row.reflector_id === meId
  const quote = {
    id: row.post_id, body: row.post_body, image_url: row.post_image, created_at: row.post_created_at,
    author_id: row.post_author_id, author_name: row.post_author_name, author_avatar: row.post_author_avatar,
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
      {edit && <ReflectModal post={quote} meId={meId} onClose={() => setEdit(false)} />}
    </article>
  )
}
