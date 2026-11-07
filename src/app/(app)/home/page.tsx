import { ComposerBar } from '@/components/ComposerBar'
import { FocusedItem } from '@/components/FocusedItem'
import { InfiniteFeed } from '@/components/InfiniteFeed'
import { loadFocus, loadHome } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'

export default async function Home({ searchParams }: { searchParams: Promise<{ focus?: string }> }) {
  const { focus } = await searchParams
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ items, next }, { data: me }, focused] = await Promise.all([
    loadHome(sb),
    sb.from('profiles').select('display_name,avatar_url').eq('id', user!.id).single(),
    loadFocus(sb, focus),
  ])
  return (
    <>
      <ComposerBar name={me?.display_name ?? ''} url={me?.avatar_url ?? null} />
      {focus && !focused && <div className="tip" style={{ margin: '12px 20px' }}>That post is no longer available.</div>}
      {focused && <FocusedItem item={focused} meId={user!.id} feed="home" />}
      <InfiniteFeed source="home" initial={items} next={next} meId={user!.id} exclude={focused ? focused.k + focused.id : undefined}
        empty={<div className="empty">No posts yet. Send a mentor request from Search to build your network, or explore Global Posts.</div>} />
    </>
  )
}
