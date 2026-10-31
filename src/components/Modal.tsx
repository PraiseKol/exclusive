'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, onClose, children, bare }: { title: string; onClose: () => void; children: ReactNode; bare?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        {!bare && (
          <header>
            <span>{title}</span>
            <button onClick={onClose} aria-label="Close"><Icon n="x" /></button>
          </header>
        )}
        {children}
      </div>
    </div>
  )
}

export type ToastKind = 'success' | 'error' | 'loading' | 'info'
export const toast = (m: string, kind: ToastKind = 'success') =>
  window.dispatchEvent(new CustomEvent('toast', { detail: { m, kind } }))
export const toastErr = (m: string) => toast(m, 'error')

export function Toaster() {
  const [t, setT] = useState<{ m: string; kind: ToastKind } | null>(null)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ m: string; kind: ToastKind }>).detail
      setT(d)
      clearTimeout(timer)
      timer = setTimeout(() => setT(null), d.kind === 'loading' ? 30000 : 3500)
    }
    window.addEventListener('toast', h)
    return () => { window.removeEventListener('toast', h); clearTimeout(timer) }
  }, [])
  if (!t) return null
  return (
    <div className={'toast ' + t.kind} role={t.kind === 'error' ? 'alert' : 'status'}>
      <span className="ti" aria-hidden="true">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '!' : t.kind === 'info' ? 'i' : ''}</span>
      <span className="tm">{t.m}</span>
      <button aria-label="Dismiss" onClick={() => setT(null)}>✕</button>
      {t.kind === 'loading' && <i className="tbar" />}
    </div>
  )
}
