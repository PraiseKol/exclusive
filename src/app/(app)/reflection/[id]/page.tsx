import { notFound, redirect } from 'next/navigation'
import { feedHref } from '@/lib/links'
import { createClient } from '@/lib/supabase/server'

// Links to a reflection open it inside its feed: Global Posts if it reflects a global post, Home otherwise.
export default async function ReflectionRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data } = await sb.from('reflection_feed').select('id,post_is_global').eq('id', id).maybeSingle()
  if (!data) notFound()
  redirect(feedHref('r', data.id, data.post_is_global))
}
