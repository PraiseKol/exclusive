'use client'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { SearchView } from './SearchView'

const KEY = 'exclusive:recent-searches'

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  const [recents, setRecents] = useState<string[]>([])
  useEffect(() => {
    try { setRecents(JSON.parse(localStorage.getItem(KEY) || '[]')) } catch {}
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  const store = (list: string[]) => { setRecents(list); try { localStorage.setItem(KEY, JSON.stringify(list)) } catch {} }
  const save = (t: string) => { const v = t.trim(); if (v.length >= 2) store([v, ...recents.filter((x) => x !== v)].slice(0, 5)) }
  const stop = (e: React.MouseEvent) => e.stopPropagation()
  return (
    <div className="sov" onClick={onClose}>
      <div className="sbar" onClick={stop}>
        <label className="sinp">
          <Icon n="search" />
          <input autoFocus type="search" aria-label="Search" placeholder="Search mentors, topics..." value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && save(q)} />
        </label>
      </div>
      {q.trim() ? (
        <div className="spanel" onClick={stop}>
          <SearchView q={q} variant="list" onNavigate={() => { save(q); onClose() }} />
        </div>
      ) : recents.length > 0 && (
        <div className="spanel rec" onClick={stop}>
          <div className="sub" style={{ padding: '4px 4px 8px', fontSize: 13 }}>Recent searches</div>
          {recents.map((r) => (
            <div key={r} className="rrow">
              <button className="rtext" onClick={() => setQ(r)}>{r}</button>
              <button aria-label={`Remove ${r}`} onClick={() => store(recents.filter((x) => x !== r))}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
