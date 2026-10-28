'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Avatar } from './Avatar'
import { Icon } from './Icon'
import { applyTheme } from './ThemeToggle'
import type { Me } from './AppShell'

const ITEMS = [
  ['/profile/me', 'Profile', 'user'],
  ['/noted', 'Noted', 'bm'],
  ['/profile/me?tab=events', 'Events', 'cal'],
  ['/premium', 'Premium', 'spark'],
  ['/profile/me?tab=circle', 'Monetization', 'cash'],
  ['/help', 'Help Center', 'help'],
  ['/settings', 'Settings', 'gear'],
] as const

function isDark() {
  const t = document.documentElement.getAttribute('data-theme')
  return t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function Drawer({ me, counts, onClose, onLogout }: { me: Me; counts: { up: number; down: number }; onClose: () => void; onLogout: () => void }) {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(isDark())
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <>
      <div className="drw-ov" onClick={onClose} />
      <div className="drw" role="dialog" aria-modal="true" aria-label="Menu">
        <div className="drw-head">
          <span className="ring"><Avatar name={me.display_name} url={me.avatar_url} size={56} /></span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{me.display_name}</div>
            {me.username && <div className="sub">@{me.username}</div>}
            <div className="sub" style={{ display: 'flex', gap: 12, marginTop: 2 }}>
              <span>★ {me.grade}</span><span>👍 {counts.up.toLocaleString()}</span><span>👎 {counts.down.toLocaleString()}</span>
            </div>
          </div>
        </div>
        <nav className="drw-list" aria-label="Menu">
          {ITEMS.map(([href, label, icon]) => (
            <Link key={label} href={href} onClick={onClose} className="drw-item"><Icon n={icon} />{label}</Link>
          ))}
        </nav>
        <div className="spacer" />
        <div className="drw-item" style={{ justifyContent: 'space-between', borderTop: '.5px solid var(--n200)', paddingTop: 16 }}>
          <span style={{ display: 'flex', gap: 14, alignItems: 'center' }}><Icon n="moon" />Dark Mode</span>
          <button className={'sw' + (dark ? ' on' : '')} role="switch" aria-checked={dark} aria-label="Dark mode"
            onClick={() => { applyTheme(dark ? 'light' : 'dark'); setDark(!dark) }} />
        </div>
        <button className="lk" style={{ textAlign: 'left', padding: '8px 0 0' }} onClick={onLogout}>Log out</button>
      </div>
    </>
  )
}
