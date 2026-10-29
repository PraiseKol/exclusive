'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from './Avatar'
import { Drawer } from './Drawer'
import { Icon } from './Icon'
import { toast } from './Modal'
import { NotificationsPanel } from './NotificationsPanel'
import { PostModal } from './PostModal'
import { SearchOverlay } from './SearchOverlay'
import { UserMenu } from './UserMenu'

// flag: 'dsk' = hidden on phones, 'mob' = phones only (the desktop design has no Circles tab)
const NAV: readonly [string, string, string, string][] = [
  ['/home', 'Home', 'home', ''], ['/search', 'Search', 'search', ''], ['/global', 'Global Posts', 'globe', ''],
  ['/circles', 'Circles', 'users', 'mob'], ['/notifications', 'Notifications', 'bell', 'dsk'], ['/messages', 'Messages', 'mail', ''],
]
const ROOTS = ['/home', '/search', '/global', '/circles', '/messages', '/notifications']
const TITLES: Record<string, string> = { '/noted': 'Noted', '/premium': 'Premium', '/help': 'Help Center', '/settings': 'Settings' }
const isDesktop = () => window.matchMedia('(min-width: 761px)').matches

export type Me = { id: string; display_name: string; avatar_url: string | null; premium_tier: number; username: string | null; grade: string }

export function AppShell({ me, email, unread, pendingReq, counts, rail, children }: {
  me: Me; email: string; unread: number; pendingReq: number; counts: { up: number; down: number }; rail: ReactNode; children: ReactNode
}) {
  const path = usePathname()
  const router = useRouter()
  const [composer, setComposer] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [panel, setPanel] = useState<null | 'notif' | 'search'>(null)
  const [dot, setDot] = useState(unread > 0)
  const [reqDot, setReqDot] = useState(pendingReq > 0)
  const root = ROOTS.includes(path)

  useEffect(() => setDot(unread > 0), [unread, path])
  useEffect(() => setReqDot(pendingReq > 0), [pendingReq, path])
  useEffect(() => { setDrawer(false); setPanel(null) }, [path])
  useEffect(() => {
    const open = () => setComposer(true)
    window.addEventListener('open-composer', open)
    const sb = createClient()
    const ch = sb.channel('notif-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` },
        (p: any) => { setDot(true); if (p.new?.type === 'request') setReqDot(true) })
      .subscribe()
    return () => { window.removeEventListener('open-composer', open); sb.removeChannel(ch) }
  }, [me.id])

  const logout = useCallback(async () => {
    await createClient().auth.signOut()
    router.replace('/welcome'); router.refresh()
  }, [router])

  // On desktop, Search and Notifications open as overlays (per the design); on phones they are normal pages.
  const intercept = (kind: 'notif' | 'search') => (e: React.MouseEvent) => {
    if (isDesktop()) { e.preventDefault(); setPanel(panel === kind ? null : kind); if (kind === 'notif') setDot(false) }
  }

  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div>
          <i className="logo" />
          {NAV.map(([href, label, icon, flag]) => {
            const on = panel ? (panel === 'notif' ? href === '/notifications' : href === '/search') : path.startsWith(href)
            const click = href === '/notifications' ? intercept('notif') : href === '/search' ? intercept('search') : () => setPanel(null)
            return (
              <Link key={href} href={href} aria-label={label} onClick={click} className={'mi' + (on ? ' on' : '') + (flag ? ' ' + flag : '')}>
                <Icon n={icon} /><span>{label}</span>
                {href === '/notifications' && dot && <i className="dot" />}
                {href === '/circles' && reqDot && <i className="dot" />}
              </Link>
            )
          })}
          <button className="mi dsk" onClick={() => { setPanel(null); setComposer(true) }}><Icon n="plus" /><span>Post</span></button>
        </div>
        <div className="sidefoot"><UserMenu me={me} email={email} onLogout={logout} /></div>
      </nav>
      <main>
        <div className="tb">
          {root ? (
            <button onClick={() => setDrawer(true)} aria-label="Open menu"><Avatar name={me.display_name} url={me.avatar_url} size={34} /></button>
          ) : (
            <button className="bk" onClick={() => router.back()} aria-label="Back"><Icon n="back" /></button>
          )}
          {root ? <i className="logo" /> : <span className="ttl">{TITLES[path] ?? ''}</span>}
          {path.startsWith('/profile/') ? (
            <button className="bell" aria-label="Copy profile link" onClick={() => { navigator.clipboard?.writeText(location.href); toast('Profile link copied') }}>⋮</button>
          ) : (
            <Link href="/notifications" aria-label="Notifications" className="bell">
              <Icon n="bell" />{dot && <i className="dot" style={{ left: 16, top: 0 }} />}
            </Link>
          )}
        </div>
        {children}
      </main>
      <aside>{rail}</aside>
      {root && path !== '/messages' && <button className="fab" onClick={() => setComposer(true)} aria-label="New post">+</button>}
      {composer && <PostModal me={me.id} tier={me.premium_tier} onClose={() => setComposer(false)} />}
      {drawer && <Drawer me={me} counts={counts} onClose={() => setDrawer(false)} onLogout={logout} />}
      {panel === 'notif' && <NotificationsPanel onClose={() => setPanel(null)} />}
      {panel === 'search' && <SearchOverlay onClose={() => setPanel(null)} />}
    </div>
  )
}
