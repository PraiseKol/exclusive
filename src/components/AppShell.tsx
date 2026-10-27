'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { PostModal } from './PostModal'
import { ThemeToggle } from './ThemeToggle'

const NAV = [
  ['/home', 'Home', 'home'], ['/search', 'Search', 'search'], ['/global', 'Global Posts', 'globe'],
  ['/circles', 'Circles', 'users'], ['/notifications', 'Notifications', 'bell'], ['/messages', 'Messages', 'mail'],
] as const

export type Me = { id: string; display_name: string; avatar_url: string | null; premium_tier: number }

export function AppShell({ me, email, unread, rail, children }: { me: Me; email: string; unread: number; rail: ReactNode; children: ReactNode }) {
  const path = usePathname()
  const router = useRouter()
  const [composer, setComposer] = useState(false)
  const [dot, setDot] = useState(unread > 0)

  useEffect(() => setDot(unread > 0), [unread, path])
  useEffect(() => {
    const open = () => setComposer(true)
    window.addEventListener('open-composer', open)
    const sb = createClient()
    const ch = sb.channel('notif-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, () => setDot(true))
      .subscribe()
    return () => { window.removeEventListener('open-composer', open); sb.removeChannel(ch) }
  }, [me.id])

  async function logout() {
    await createClient().auth.signOut()
    router.replace('/welcome'); router.refresh()
  }

  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div>
          <i className="logo" />
          {NAV.map(([href, label, icon]) => (
            <Link key={href} href={href} className={'mi' + (path.startsWith(href) ? ' on' : '') + (href === '/notifications' ? ' dsk' : '')}>
              <Icon n={icon} /><span>{label}</span>
              {href === '/notifications' && dot && <i className="dot" />}
            </Link>
          ))}
          <button className="mi dsk" onClick={() => setComposer(true)}><Icon n="plus" /><span>Post</span></button>
        </div>
        <div className="sidefoot">
          <Link href="/profile/me" className="me">
            <Avatar name={me.display_name} url={me.avatar_url} size={28} />
            <span>{me.display_name}<small>{email}</small></span>
          </Link>
          <div style={{ padding: '0 12px' }}><ThemeToggle /></div>
          <button className="lk" onClick={logout}>Log out</button>
        </div>
      </nav>
      <main>
        <div className="tb">
          <Link href="/profile/me" aria-label="My profile"><Avatar name={me.display_name} url={me.avatar_url} size={32} /></Link>
          <ThemeToggle />
          <Link href="/notifications" aria-label="Notifications" style={{ position: 'relative', width: 28, height: 28 }}>
            <Icon n="bell" />{dot && <i className="dot" style={{ left: 16, top: 0 }} />}
          </Link>
        </div>
        {children}
      </main>
      <aside>{rail}</aside>
      <button className="fab" onClick={() => setComposer(true)} aria-label="New post">+</button>
      {composer && <PostModal me={me.id} tier={me.premium_tier} onClose={() => setComposer(false)} />}
    </div>
  )
}
