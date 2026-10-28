'use client'
import { useEffect } from 'react'
import { Icon } from './Icon'
import { NotificationsList } from './NotificationsList'

export function NotificationsPanel({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="ov np" onClick={onClose}>
      <div className="modal np" role="dialog" aria-modal="true" aria-label="Notifications" onClick={(e) => e.stopPropagation()}>
        <header><span>Notifications</span><button onClick={onClose} aria-label="Close"><Icon n="x" /></button></header>
        <NotificationsList onNavigate={onClose} />
      </div>
    </div>
  )
}
