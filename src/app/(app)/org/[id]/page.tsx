import { notFound } from 'next/navigation'
import { loadOrgPosts } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'
import { OrgView } from './OrgView'

export default async function OrgPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: org } = await sb.from('organizations').select('id,owner_id,name,description,tier,tier_expires_at').eq('id', id).maybeSingle()
  if (!org) notFound()
  const [{ data: members }, posts] = await Promise.all([
    sb.from('org_members').select('user_id,role,status,user:profiles!org_members_user_id_fkey(id,display_name,avatar_url,headline)').eq('org_id', id),
    loadOrgPosts(sb, id),
  ])
  return <OrgView org={org as any} members={(members ?? []) as any[]} meId={user!.id} first={posts} />
}
