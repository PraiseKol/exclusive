import { PostCard, type Post } from '@/components/PostCard'
import { createClient } from '@/lib/supabase/server'

export default async function Global() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const now = new Date().toISOString()
  const { data: posts } = await sb.from('post_feed').select('*')
    .eq('is_global', true).eq('is_disabled', false)
    .or(`scheduled_for.is.null,scheduled_for.lte.${now}`)
    .order('global_since', { ascending: false, nullsFirst: false }).limit(50)
  return (
    <>
      <div className="tabs"><button className="on">Global Posts</button></div>
      {(posts as Post[] | null)?.map((p) => <PostCard key={p.id} post={p} meId={user!.id} />)}
      {!posts?.length && <div className="empty">No Global Posts yet. Be the first: mark one of your posts as global.</div>}
    </>
  )
}
