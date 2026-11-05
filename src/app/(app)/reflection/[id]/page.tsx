import { notFound } from 'next/navigation'
import { ReflectionCard, type ReflectionRow } from '@/components/ReflectionCard'
import { createClient } from '@/lib/supabase/server'
import { ReflectionComments } from './ReflectionComments'

export default async function ReflectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: row } = await sb.from('reflection_feed').select('*').eq('id', id).maybeSingle()
  if (!row) notFound()
  return (
    <div className="postpage">
      <ReflectionCard row={row as ReflectionRow} meId={user!.id} detail />
      <ReflectionComments id={id} meId={user!.id} />
    </div>
  )
}
