import { ComposerBar } from '@/components/ComposerBar'
import { PostCard, type Post } from '@/components/PostCard'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ data: ids }, { data: me }] = await Promise.all([
    sb.rpc('my_network'),
    sb.from('profiles').select('display_name,avatar_url').eq('id', user!.id).single(),
  ])
  const now = new Date().toISOString()
  const { data: posts } = await sb.from('post_feed').select('*')
    .in('author_id', (ids as string[]) ?? [user!.id])
    .eq('is_disabled', false)
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .order('created_at', { ascending: false }).limit(50)

  return (
    <>
      <ComposerBar name={me?.display_name ?? ''} url={me?.avatar_url ?? null} />
      {(posts as Post[] | null)?.map((p) => <PostCard key={p.id} post={p} meId={user!.id} />)}
      {!posts?.length && <div className="empty">No posts yet. Send a mentor request from Search to build your network, or explore Global Posts.</div>}
    </>
  )
}
