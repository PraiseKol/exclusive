import Link from 'next/link'
import { SettingsActions } from './SettingsActions'
import { createClient } from '@/lib/supabase/server'

export default async function Settings() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Settings</h2>
      <div><div className="sub">Account email</div><div style={{ overflowWrap: 'anywhere' }}>{user?.email}</div></div>
      <Link href="/profile/me?edit=1" className="btn sec" style={{ alignSelf: 'flex-start' }}>Edit profile</Link>
      <SettingsActions />
    </div>
  )
}
