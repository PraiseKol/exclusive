'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { FeedItem } from '@/lib/feed'
import { CommentThread } from './CommentThread'
import { PostCard } from './PostCard'
import { ReflectionCard } from './ReflectionCard'

/** The post or reflection that was clicked, shown first in its feed (Home or Global Posts) with its comments. */
export function FocusedItem({ item, meId, feed }: { item: FeedItem; meId: string; feed: 'home' | 'global' }) {
  const router = useRouter()
  return (
    <section className="focus" aria-label="Opened post">
      <div className="focus-bar">
        <button className="lk" onClick={() => router.back()}>← Back</button>
        <Link className="lk" href={`/${feed}`} replace>Show full feed</Link>
      </div>
      {item.k === 'p'
        ? <PostCard post={item.post} meId={meId} detail />
        : <ReflectionCard row={item.row} meId={meId} detail />}
      <CommentThread target={{ kind: item.k === 'p' ? 'post' : 'reflection', id: item.id }} meId={meId} inline />
      <div className="focus-sep">More in {feed === 'global' ? 'Global Posts' : 'your feed'}</div>
    </section>
  )
}
