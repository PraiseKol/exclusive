'use client'
import { useState } from 'react'
import { SearchView } from '@/components/SearchView'

export default function Search() {
  const [q, setQ] = useState('')
  return (
    <>
      <div className="comp">
        <input className="t" type="search" aria-label="Search" placeholder="Search mentors, topics..." value={q} onChange={(e) => setQ(e.target.value)} style={{ borderRadius: 999 }} />
      </div>
      <SearchView q={q} />
    </>
  )
}
