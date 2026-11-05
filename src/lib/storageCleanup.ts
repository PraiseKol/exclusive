// Keeps file storage tidy: removes files that nothing uses any more.
type Sb = any

export async function removeFiles(sb: Sb, bucket: string, paths: string[]): Promise<number> {
  const clean = paths.filter((p) => p && !/^https?:/.test(p))
  if (!clean.length) return 0
  const { data } = await sb.storage.from(bucket).remove(clean)
  return data?.length ?? 0
}

const pathOf = (url: string | null | undefined) => {
  const part = url?.split('/object/public/avatars/')[1]
  return part ? decodeURIComponent(part.split('?')[0]) : null
}

/** Safety net: deletes the signed-in person's leftover files (old profile photos, photos of posts that no longer exist).
 *  Files younger than an hour are never touched, so an upload in progress is safe. Runs at most once every 6 hours. */
export async function sweepOrphans(sb: Sb, uid: string, avatarUrl: string | null) {
  const key = 'swept:' + uid
  try {
    const last = Number(localStorage.getItem(key) || 0)
    if (Date.now() - last < 6 * 3600 * 1000) return
    localStorage.setItem(key, String(Date.now()))
  } catch { /* storage unavailable: carry on */ }

  const old = (f: any) => Date.now() - new Date(f.created_at ?? f.updated_at ?? Date.now()).getTime() > 3600 * 1000

  // profile photos: keep only the current one
  const current = pathOf(avatarUrl)
  const { data: av } = await sb.storage.from('avatars').list(uid, { limit: 1000 })
  const staleAv = (av ?? []).filter((f: any) => f.name && old(f) && `${uid}/${f.name}` !== current).map((f: any) => `${uid}/${f.name}`)
  await removeFiles(sb, 'avatars', staleAv)

  // post photos: keep only those some post of yours still uses (drafts included)
  const { data: files } = await sb.storage.from('post-images').list(uid, { limit: 1000 })
  if (files?.length) {
    const { data: posts } = await sb.from('posts').select('images').eq('author_id', uid)
    const used = new Set<string>((posts ?? []).flatMap((p: any) => p.images ?? []))
    const stale = files.filter((f: any) => f.name && old(f) && !used.has(`${uid}/${f.name}`)).map((f: any) => `${uid}/${f.name}`)
    await removeFiles(sb, 'post-images', stale)
  }
}
