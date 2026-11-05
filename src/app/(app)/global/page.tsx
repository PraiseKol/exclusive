import { InfiniteFeed } from '@/components/InfiniteFeed'
import { loadGlobal } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'

export default async function Global() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { items, next } = await loadGlobal(sb)
  return (
    <>
      <div className="tabs"><button className="on">Global Posts</button></div>
      <InfiniteFeed source="global" initial={items} next={next} meId={user!.id}
        empty={<div className="empty">No Global Posts yet. Be the first: mark one of your posts as global.</div>} />
    </>
  )
}
