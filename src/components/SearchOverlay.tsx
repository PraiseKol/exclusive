'use client'
import { useEffect, useState } from 'react'
import { Icon } from './Icon'
import { SearchView } from './SearchView'

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const [q, setQ] = useState('')
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="sov" onClick={onClose}>
      <div className="sbar" onClick={(e) => e.stopPropagation()}>
        <label className="sinp">
          <Icon n="search" />
          <input autoFocus type="search" aria-label="Search" placeholder="Search mentors, topics..." value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
      </div>
      {q.trim() && (
        <div className="spanel" onClick={(e) => e.stopPropagation()}>
          <SearchView q={q} variant="list" onNavigate={onClose} />
        </div>
      )}
    </div>
  )
}
