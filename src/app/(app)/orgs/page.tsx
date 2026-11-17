import { OrgsView } from './OrgsView'
import { createClient } from '@/lib/supabase/server'

export default async function Orgs() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const [{ data: owned }, { data: mem }] = await Promise.all([
    sb.from('organizations').select('id,name,tier').eq('owner_id', user!.id).order('created_at'),
    sb.from('org_members').select('org_id,role,status,org:organizations(id,name,tier,owner_id)').eq('user_id', user!.id),
  ])
  const rows = (mem ?? []) as any[]
  return <OrgsView owned={(owned ?? []) as any[]} member={rows.filter((m) => m.status === 'active')} invites={rows.filter((m) => m.status === 'pending')} />
}
