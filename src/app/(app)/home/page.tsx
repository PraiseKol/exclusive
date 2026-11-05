import { ComposerBar } from '@/components/ComposerBar'
import { InfiniteFeed } from '@/components/InfiniteFeed'
import { loadHome } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ items, next }, { data: me }] = await Promise.all([
    loadHome(sb),
    sb.from('profiles').select('display_name,avatar_url').eq('id', user!.id).single(),
  ])
  return (
    <>
      <ComposerBar name={me?.display_name ?? ''} url={me?.avatar_url ?? null} />
      <InfiniteFeed source="home" initial={items} next={next} meId={user!.id}
        empty={<div className="empty">No posts yet. Send a mentor request from Search to build your network, or explore Global Posts.</div>} />
    </>
  )
}
