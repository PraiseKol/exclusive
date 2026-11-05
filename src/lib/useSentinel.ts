'use client'
import { useEffect, useRef } from 'react'

/** Calls `cb` whenever the returned element scrolls (nearly) into view. Re-arms when `dep` changes. */
export function useSentinel<T extends HTMLElement = HTMLDivElement>(cb: () => void, enabled: boolean, dep: unknown = 0, rootMargin = '700px') {
  const ref = useRef<T>(null)
  const cbRef = useRef(cb)
  cbRef.current = cb
  useEffect(() => {
    const el = ref.current
    if (!enabled || !el) return
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) cbRef.current() }, { rootMargin })
    io.observe(el)
    return () => io.disconnect()
  }, [enabled, dep, rootMargin])
  return ref
}
