'use client'
import { useRouter } from 'next/navigation'
import { ThemeToggle } from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'

export function SettingsActions() {
  const router = useRouter()
  return (
    <>
      <div><div className="sub" style={{ marginBottom: 6 }}>Appearance</div><ThemeToggle /></div>
      <button className="bo" style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 999 }}
        onClick={async () => { await createClient().auth.signOut(); router.replace('/welcome'); router.refresh() }}>Log out</button>
    </>
  )
}
