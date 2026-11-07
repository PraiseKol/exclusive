import { FocusedItem } from '@/components/FocusedItem'
import { InfiniteFeed } from '@/components/InfiniteFeed'
import { loadFocus, loadGlobal } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'

export default async function Global({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ items, next }, focused] = await Promise.all([loadGlobal(sb), loadFocus(sb, focus)])
  return (
    <>
      <div className="tabs"><button className="on">Global Posts</button></div>
      {focus && !focused && <div className="tip" style={{ margin: '12px 20px' }}>That post is no longer available.</div>}
      {focused && <FocusedItem item={focused} meId={user!.id} feed="global" />}
      <InfiniteFeed source="global" initial={items} next={next} meId={user!.id} exclude={focused ? focused.k + focused.id : undefined}
        empty={<div className="empty">No Global Posts yet. Be the first: mark one of your posts as global.</div>} />
    </>
  )
}
