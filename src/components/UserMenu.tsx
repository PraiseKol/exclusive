'use client'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { Avatar } from './Avatar'
import { ThemeToggle } from './ThemeToggle'
import type { Me } from './AppShell'

const LINKS = [['/profile/me', 'My profile'], ['/noted', 'Noted'], ['/circles', 'Circles'], ['/premium', 'Premium'], ['/help', 'Help Center'], ['/settings', 'Settings']]

export function UserMenu({ me, email, onLogout }: { me: Me; email: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const click = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', click); window.addEventListener('keydown', key)
    return () => { document.removeEventListener('mousedown', click); window.removeEventListener('keydown', key) }
  }, [open])
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {open && (
        <div className="umenu" role="menu">
          {(me.is_admin ? [...LINKS, ['/admin', 'Admin: reports']] : LINKS).map(([href, label]) => <Link key={href} href={href} role="menuitem" onClick={() => setOpen(false)}>{label}</Link>)}
          <div style={{ padding: '6px 10px' }}><ThemeToggle /></div>
          <button role="menuitem" onClick={onLogout} className="lk" style={{ textAlign: 'left', padding: '8px 10px' }}>Log out</button>
        </div>
      )}
      <button className="me" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen(!open)} style={{ width: '100%' }}>
        <Avatar name={me.display_name} url={me.avatar_url} size={28} />
        <span>{me.display_name}<small>{email}</small></span>
      </button>
    </div>
  )
}
