import { PostCard, type Post } from '@/components/PostCard'
import { createClient } from '@/lib/supabase/server'

export default async function Noted() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: rows } = await sb.from('noted').select('post_id,created_at').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(100)
  const ids = (rows ?? []).map((r: any) => r.post_id)
  const { data: posts } = ids.length ? await sb.from('post_feed').select('*').in('id', ids).eq('is_disabled', false) : { data: [] as Post[] }
  const order = new Map<string, number>(ids.map((id: string, i: number) => [id, i]))
  const sorted = ((posts ?? []) as Post[]).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0))
  return (
    <>
      <div className="tabs"><button className="on">Noted</button></div>
      <p className="sub" style={{ padding: '12px 20px 0', margin: 0 }}>Posts you save here are private. Only you can see them.</p>
      {sorted.map((p) => <PostCard key={p.id} post={p} meId={user!.id} />)}
      {sorted.length === 0 && <div className="empty">Nothing noted yet. Tap the bookmark on any post to save it here.</div>}
    </>
  )
}
