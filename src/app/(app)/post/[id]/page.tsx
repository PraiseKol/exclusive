import { notFound } from 'next/navigation'
import { PostCard, type Post } from '@/components/PostCard'
import { PostComments } from './PostComments'
import { createClient } from '@/lib/supabase/server'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: post } = await sb.from('post_feed').select('*').eq('id', id).maybeSingle()
  if (!post) notFound()
  return (
    <div className="postpage">
      <PostCard post={post as Post} meId={user!.id} detail />
      <PostComments postId={id} meId={user!.id} />
    </div>
  )
}
