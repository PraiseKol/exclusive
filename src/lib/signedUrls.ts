'use client'
import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'

// Post photos live in a private bucket. Storage rules only hand out a link when the viewer is allowed
// to see the post (2-layer rule for normal posts, everyone for Global Posts). Links expire after 6 hours.
const BUCKET = 'post-images'
const TTL_SECONDS = 6 * 3600
const REUSE_MS = 5 * 3600 * 1000 // reuse the same link for 5h so the browser can cache the image

type Entry = { url: string; exp: number }
const mem = new Map<string, Entry>()
let cacheUser = ''

export async function signPaths(paths: string[]): Promise<Record<string, string>> {
  const sb = createClient()
  const { data: { session } } = await sb.auth.getSession()
  const uid = session?.user.id ?? ''
  if (uid !== cacheUser) { mem.clear(); cacheUser = uid } // never reuse links across accounts

  const out: Record<string, string> = {}
  const need: string[] = []
  const now = Date.now()
  for (const p of paths) {
    if (/^https?:/.test(p)) { out[p] = p; continue }
    const e = mem.get(p)
    if (e && e.exp > now) out[p] = e.url
    else need.push(p)
  }
  if (need.length) {
    const { data } = await sb.storage.from(BUCKET).createSignedUrls(need, TTL_SECONDS)
    for (const d of data ?? []) {
      if (d.signedUrl && d.path) { mem.set(d.path, { url: d.signedUrl, exp: now + REUSE_MS }); out[d.path] = d.signedUrl }
    }
  }
  return out
}

export function useSignedUrls(paths: string[]): Record<string, string> {
  const key = paths.join('|')
  const [map, setMap] = useState<Record<string, string>>({})
  useEffect(() => {
    let off = false
    if (!paths.length) { setMap({}); return }
    signPaths(paths).then((m) => { if (!off) setMap(m) }).catch(() => {})
    return () => { off = true }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  return map
}
