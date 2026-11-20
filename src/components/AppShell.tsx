'use client'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { NOTIF_EVENT } from '@/lib/notifications'
import { Avatar } from './Avatar'
import { Drawer } from './Drawer'
import { Icon } from './Icon'
import { toast, toastErr } from './Modal'
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

export type Me = { id: string; display_name: string; avatar_url: string | null; premium_tier: number; username: string | null; grade: string; is_admin?: boolean }

export function AppShell({ me, email, unread, pendingReq, counts, rail, children, suspended }: {
  me: Me; suspended?: boolean; email: string; unread: number; pendingReq: number; counts: { up: number; down: number }; rail: ReactNode; children: ReactNode
}) {
  const path = usePathname()
  const search = useSearchParams()
  const from = search.get('from')
  const paid = search.get('paid')
  // a post or reflection opens inside the feed it came from: Global Posts for global content, Home otherwise
  const ctx = path.startsWith('/post/') || path.startsWith('/reflection/') ? (from === 'global' ? '/global' : '/home') : null
  const router = useRouter()
  const [composer, setComposer] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [panel, setPanel] = useState<null | 'notif' | 'search'>(null)
  const [dot, setDot] = useState(unread > 0)
  const [reqDot, setReqDot] = useState(pendingReq > 0)
  const root = ROOTS.includes(path)

  useEffect(() => {
    if (paid === null) return
    if (paid === '1') toast('Payment received. Thank you!'); else toastErr('The payment was not completed.')
    router.replace(path)
  }, [paid]) // eslint-disable-line react-hooks/exhaustive-deps
  // Sync from the server only when the server value itself changes. Re-syncing on every path change
  // used to bring the dot back for notifications that had already been read.
  useEffect(() => setDot(unread > 0), [unread])
  useEffect(() => setReqDot(pendingReq > 0), [pendingReq])
  useEffect(() => { setDrawer(false); setPanel(null) }, [path])
  useEffect(() => {
    const open = () => setComposer(true)
    window.addEventListener('open-composer', open)
    const sb = createClient()
    // The badge always reflects the real number of unread notifications.
    const syncDot = async () => {
      const { count } = await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', me.id).eq('read', false)
      setDot((count ?? 0) > 0)
    }
    const ch = sb.channel('notif-' + me.id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` },
        (p: any) => { setDot(true); if (p.new?.type === 'request') setReqDot(true) })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${me.id}` }, syncDot)
      .subscribe()
    window.addEventListener(NOTIF_EVENT, syncDot)
    return () => { window.removeEventListener('open-composer', open); window.removeEventListener(NOTIF_EVENT, syncDot); sb.removeChannel(ch) }
  }, [me.id])

  const logout = useCallback(async () => {
    await createClient().auth.signOut()
    router.replace('/welcome'); router.refresh()
  }, [router])

  // On desktop, Search and Notifications open as overlays (per the design); on phones they are normal pages.
  const intercept = (kind: 'notif' | 'search') => (e: React.MouseEvent) => {
    if (isDesktop()) { e.preventDefault(); setPanel(panel === kind ? null : kind) }
  }

  return (
    <div className="shell">
      <nav className="side" aria-label="Main">
        <div>
          <i className="logo" />
          {NAV.map(([href, label, icon, flag]) => {
            const on = panel ? (panel === 'notif' ? href === '/notifications' : href === '/search') : ctx ? href === ctx : path.startsWith(href)
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
          {root ? <i className="logo" /> : <span className="ttl">{path.startsWith('/post/') ? 'Post' : path.startsWith('/reflection/') ? 'Reflection' : TITLES[path] ?? ''}</span>}
          {path.startsWith('/profile/') || path.startsWith('/post/') || path.startsWith('/reflection/') ? (
            <button className="bell" aria-label="Copy link" onClick={() => { navigator.clipboard?.writeText(location.href); toast('Link copied') }}>⋮</button>
          ) : (
            <Link href="/notifications" aria-label="Notifications" className="bell">
              <Icon n="bell" />{dot && <i className="dot" style={{ left: 16, top: 0 }} />}
            </Link>
          )}
        </div>
        {suspended && <div className="susp" role="alert">Your account is suspended. You can read content, but you can’t post, comment or message. If you think this is a mistake, please contact support.</div>}
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
