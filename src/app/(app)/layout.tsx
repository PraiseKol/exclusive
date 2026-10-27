import { redirect } from 'next/navigation'
import { AppShell } from '@/components/AppShell'
import { Rail } from '@/components/Rail'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/welcome')
  const { data: me } = await sb.from('profiles').select('id,display_name,avatar_url,premium_tier').eq('id', user.id).single()
  if (!me || !me.display_name) redirect('/about')
  const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false)
  return (
    <AppShell me={me} email={user.email ?? ''} unread={count ?? 0} rail={<Rail meId={user.id} tier={me.premium_tier} />}>
      {children}
    </AppShell>
  )
}
