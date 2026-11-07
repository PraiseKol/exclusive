'use client'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { LOADERS, type Cursor, type FeedItem, type Source } from '@/lib/feed'
import { createClient } from '@/lib/supabase/client'
import { useSentinel } from '@/lib/useSentinel'
import { PostCard } from './PostCard'
import { ReflectionCard } from './ReflectionCard'

const keyOf = (i: FeedItem) => i.k + i.id

/** Endless list: shows the first page rendered by the server, then loads older items as you scroll. */
export function InfiniteFeed({ source, arg, initial, next, meId, empty, className, pinGlobal, endNote = true, exclude }: {
  source: Source; arg?: string; initial: FeedItem[]; next: Cursor | null; meId: string
  empty: ReactNode; className?: string; pinGlobal?: boolean; endNote?: boolean; exclude?: string
}) {
  const [items, setItems] = useState<FeedItem[]>(initial)
  const [cursor, setCursor] = useState<Cursor | null>(next)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const busy = useRef(false)

  // After something changes on the server (a new post, a deletion...) fold the fresh first page into what is already loaded.
  const first = useRef(true)
  useEffect(() => {
    if (first.current) { first.current = false; return }
    setItems((prev) => {
      const fresh = new Map(initial.map((i) => [keyOf(i), i]))
      const known = new Set(prev.map(keyOf))
      const oldestFresh = initial.length && next ? initial[initial.length - 1].t : null
      const kept = prev
        .filter((i) => fresh.has(keyOf(i)) || (oldestFresh ? i.t < oldestFresh : true)) // inside the fresh window but missing = deleted
        .map((i) => fresh.get(keyOf(i)) ?? i)
      const added = initial.filter((i) => !known.has(keyOf(i)))
      return [...added, ...kept].sort((a, b) => (a.t < b.t ? 1 : a.t > b.t ? -1 : 0))
    })
  }, [initial, next])

  const loadMore = useCallback(async () => {
    if (busy.current || !cursor) return
    busy.current = true; setLoading(true); setFailed(false)
    try {
      const page = await LOADERS[source](createClient(), cursor, arg)
      setItems((prev) => {
        const known = new Set(prev.map(keyOf))
        return [...prev, ...page.items.filter((i) => !known.has(keyOf(i)))]
      })
      setCursor(page.next)
    } catch { setFailed(true) } finally { busy.current = false; setLoading(false) }
  }, [cursor, source, arg])

  const sentinel = useSentinel(loadMore, !!cursor && !failed, items.length)
  const remove = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id))

  const shown = exclude ? items.filter((i) => keyOf(i) !== exclude) : items
  if (shown.length === 0 && !cursor) return <>{empty}</>
  return (
    <>
      <div className={className}>
        {shown.map((i) => i.k === 'p'
          ? <PostCard key={keyOf(i)} post={i.post} meId={meId} pin={pinGlobal && i.post.is_global} onRemoved={remove} />
          : <ReflectionCard key={keyOf(i)} row={i.row} meId={meId} onRemoved={remove} />)}
      </div>
      {cursor && !failed && <div ref={sentinel} className="more" aria-live="polite">{loading ? <span className="spin" aria-label="Loading more" /> : null}</div>}
      {failed && <div className="more"><button className="btn sec" onClick={() => { setFailed(false); loadMore() }}>Couldn’t load more. Tap to retry</button></div>}
      {!cursor && endNote && shown.length > 0 && <div className="more sub">You’re all caught up</div>}
    </>
  )
}
