import { ComposerBar } from '@/components/ComposerBar'
import { PostCard, type Post } from '@/components/PostCard'
import { ReflectionCard, type ReflectionRow } from '@/components/ReflectionCard'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ data: ids }, { data: me }] = await Promise.all([
    sb.rpc('my_network'),
    sb.from('profiles').select('display_name,avatar_url').eq('id', user!.id).single(),
  ])
  const net = (ids as string[]) ?? [user!.id]
  const now = new Date().toISOString()
  const [{ data: posts }, { data: refl }] = await Promise.all([
    sb.from('post_feed').select('*').in('author_id', net).eq('is_disabled', false)
      .or(`scheduled_for.is.null,scheduled_for.lte.${now}`).order('created_at', { ascending: false }).limit(50),
    sb.from('reflection_feed').select('*').in('reflector_id', net).order('created_at', { ascending: false }).limit(30),
  ])
  const items = [
    ...((posts ?? []) as Post[]).map((p) => ({ k: 'p' as const, t: p.created_at, p })),
    ...((refl ?? []) as ReflectionRow[]).map((r) => ({ k: 'r' as const, t: r.created_at, r })),
  ].sort((a, b) => +new Date(b.t) - +new Date(a.t))

  return (
    <>
      <ComposerBar name={me?.display_name ?? ''} url={me?.avatar_url ?? null} />
      {items.map((i) => i.k === 'p'
        ? <PostCard key={'p' + i.p.id} post={i.p} meId={user!.id} />
        : <ReflectionCard key={'r' + i.r.id} row={i.r} meId={user!.id} />)}
      {items.length === 0 && <div className="empty">No posts yet. Send a mentor request from Search to build your network, or explore Global Posts.</div>}
    </>
  )
}
