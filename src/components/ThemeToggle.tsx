'use client'
import { useEffect, useState } from 'react'

type Mode = 'system' | 'light' | 'dark'

export function applyTheme(m: Mode) {
  const el = document.documentElement
  if (m === 'system') el.removeAttribute('data-theme')
  else el.setAttribute('data-theme', m)
  try {
    if (m === 'system') localStorage.removeItem('theme')
    else localStorage.setItem('theme', m)
  } catch {}
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<Mode>('system')
  useEffect(() => {
    try {
      const t = localStorage.getItem('theme')
      if (t === 'light' || t === 'dark') setMode(t)
    } catch {}
  }, [])
  const pick = (m: Mode) => { setMode(m); applyTheme(m) }
  return (
    <div className={'theme ' + className} role="group" aria-label="Colour theme">
      {(['system', 'light', 'dark'] as Mode[]).map((m) => (
        <button key={m} className={mode === m ? 'on' : ''} aria-pressed={mode === m} onClick={() => pick(m)}>
          {m === 'system' ? 'Auto' : m[0].toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  )
}
