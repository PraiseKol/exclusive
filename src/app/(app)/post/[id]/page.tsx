import { notFound, redirect } from 'next/navigation'
import { feedHref } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'

// Links to a post open it inside its feed: Global Posts for global posts, Home otherwise.
export default async function PostRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data } = await sb.from('post_feed').select('id,is_global').eq('id', id).maybeSingle()
  if (!data) notFound()
  redirect(feedHref('p', data.id, data.is_global))
}
