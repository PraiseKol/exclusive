import { InfiniteFeed } from '@/components/InfiniteFeed'
import { loadNoted } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'

export default async function Noted() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { items, next } = await loadNoted(sb)
  return (
    <>
      <div className="tabs"><button className="on">Noted</button></div>
      <p className="sub" style={{ padding: '12px 20px 0', margin: 0 }}>Posts and reflections you save here are private. Only you can see them.</p>
      <InfiniteFeed source="noted" initial={items} next={next} meId={user!.id}
        empty={<div className="empty">Nothing noted yet. Tap the bookmark on any post or reflection to save it here.</div>} />
    </>
  )
}
