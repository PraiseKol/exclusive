import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Rail } from '@/components/Rail'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/welcome')
  const [{ data: me }, { count }, { count: pending }, { data: rc }] = await Promise.all([
    sb.from('profiles').select('id,display_name,avatar_url,premium_tier,username,grade').eq('id', user.id).single(),
    sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    sb.from('mentor_requests').select('id', { count: 'exact', head: true }).eq('mentor_id', user.id).eq('status', 'pending'),
    sb.rpc('my_rating_counts'),
  ])
  if (!me || !me.display_name) redirect('/about')
  const counts = { up: Number((rc as any)?.up ?? 0), down: Number((rc as any)?.down ?? 0) }
  return (
    <AppShell me={me} email={user.email ?? ''} unread={count ?? 0} pendingReq={pending ?? 0} counts={counts}
      rail={<Rail meId={user.id} tier={me.premium_tier} />}>
      {children}
    </AppShell>
  )
}
