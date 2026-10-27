'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="ov" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <header>
          <span>{title}</span>
          <button onClick={onClose} aria-label="Close"><Icon n="x" /></button>
        </header>
        {children}
      </div>
    </div>
  )
}

export const toast = (m: string) => window.dispatchEvent(new CustomEvent('toast', { detail: m }))

export function Toaster() {
  const [m, setM] = useState('')
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const h = (e: Event) => {
      setM((e as CustomEvent<string>).detail)
      clearTimeout(t)
      t = setTimeout(() => setM(''), 2800)
    }
    window.addEventListener('toast', h)
    return () => window.removeEventListener('toast', h)
  }, [])
  return m ? <div id="toast" role="status">{m}</div> : null
}
