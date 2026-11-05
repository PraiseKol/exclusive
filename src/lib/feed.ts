// Page loaders for endless scrolling. They work with the server or the browser Supabase client.
import type { Post } from '@/components/PostCard'
import type { ReflectionRow } from '@/components/ReflectionCard'

export type FeedItem =
  | { k: 'p'; id: string; t: string; post: Post }
  | { k: 'r'; id: string; t: string; row: ReflectionRow }
export type Cursor = { t: string; id: string }
export type Page = { items: FeedItem[]; next: Cursor | null }
export type Source = 'home' | 'global' | 'noted' | 'profile-posts' | 'profile-reflections'
export const PAGE_SIZE = 15

type Sb = any
type Ref = { kind: 'p' | 'r'; id: string; t: string }
const cursorOf = (refs: { id: string; t: string }[], limit: number): Cursor | null =>
  refs.length >= limit ? { t: refs[refs.length - 1].t, id: refs[refs.length - 1].id } : null

async function hydrate(sb: Sb, refs: Ref[]): Promise<FeedItem[]> {
  const pIds = refs.filter((r) => r.kind === 'p').map((r) => r.id)
  const rIds = refs.filter((r) => r.kind === 'r').map((r) => r.id)
  const [{ data: posts }, { data: refl }] = await Promise.all([
    pIds.length ? sb.from('post_feed').select('*').in('id', pIds) : { data: [] },
    rIds.length ? sb.from('reflection_feed').select('*').in('id', rIds) : { data: [] },
  ])
  const pm = new Map<string, Post>((posts ?? []).map((p: Post) => [p.id, p]))
  const rm = new Map<string, ReflectionRow>((refl ?? []).map((r: ReflectionRow) => [r.id, r]))
  const out: FeedItem[] = []
  for (const ref of refs) {
    if (ref.kind === 'p') { const post = pm.get(ref.id); if (post) out.push({ k: 'p', id: ref.id, t: ref.t, post }) }
    else { const row = rm.get(ref.id); if (row) out.push({ k: 'r', id: ref.id, t: ref.t, row }) }
  }
  return out
}

async function viaRpc(sb: Sb, fn: 'home_feed' | 'noted_feed', before?: Cursor | null, limit = PAGE_SIZE): Promise<Page> {
  const { data } = await sb.rpc(fn, { p_before: before?.t ?? null, p_before_id: before?.id ?? null, p_limit: limit })
  const refs: Ref[] = (data ?? []).map((d: any) => ({ kind: d.kind, id: d.id, t: d.t }))
  return { items: await hydrate(sb, refs), next: cursorOf(refs, limit) }
}
export const loadHome = (sb: Sb, before?: Cursor | null, limit = PAGE_SIZE) => viaRpc(sb, 'home_feed', before, limit)
export const loadNoted = (sb: Sb, before?: Cursor | null, limit = PAGE_SIZE) => viaRpc(sb, 'noted_feed', before, limit)

export async function loadGlobal(sb: Sb, before?: Cursor | null, limit = PAGE_SIZE): Promise<Page> {
  let q = sb.from('post_feed').select('*').eq('is_global', true).eq('is_disabled', false)
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
    .order('global_since', { ascending: false, nullsFirst: false }).limit(limit)
  if (before) q = q.lt('global_since', before.t)
  const { data } = await q
  const rows: Post[] = data ?? []
  const items: FeedItem[] = rows.map((p: any) => ({ k: 'p', id: p.id, t: p.global_since ?? p.created_at, post: p }))
  return { items, next: rows.length >= limit ? { t: items[items.length - 1].t, id: items[items.length - 1].id } : null }
}

/** A person's pinned Global Posts (shown above their other posts). */
export async function loadPinned(sb: Sb, pid: string): Promise<Post[]> {
  const { data } = await sb.from('post_feed').select('*').eq('author_id', pid).eq('is_global', true).eq('is_disabled', false)
    .order('global_since', { ascending: false }).limit(3)
  return data ?? []
}

export async function loadProfilePosts(sb: Sb, pid: string, before?: Cursor | null, limit = PAGE_SIZE): Promise<Page> {
  let q = sb.from('post_feed').select('*').eq('author_id', pid).eq('is_disabled', false).eq('is_global', false)
    .or(`scheduled_for.is.null,scheduled_for.lte.${new Date().toISOString()}`)
    .order('created_at', { ascending: false }).limit(limit)
  if (before) q = q.lt('created_at', before.t)
  const { data } = await q
  const rows: Post[] = data ?? []
  const items: FeedItem[] = rows.map((p) => ({ k: 'p', id: p.id, t: p.created_at, post: p }))
  return { items, next: rows.length >= limit ? { t: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : null }
}

export async function loadProfileReflections(sb: Sb, pid: string, before?: Cursor | null, limit = PAGE_SIZE): Promise<Page> {
  let q = sb.from('reflection_feed').select('*').eq('reflector_id', pid).order('created_at', { ascending: false }).limit(limit)
  if (before) q = q.lt('created_at', before.t)
  const { data } = await q
  const rows: ReflectionRow[] = data ?? []
  const items: FeedItem[] = rows.map((r) => ({ k: 'r', id: r.id, t: r.created_at, row: r }))
  return { items, next: rows.length >= limit ? { t: rows[rows.length - 1].created_at, id: rows[rows.length - 1].id } : null }
}

export const LOADERS: Record<Source, (sb: Sb, before: Cursor | null, arg?: string) => Promise<Page>> = {
  home: (sb, b) => loadHome(sb, b),
  global: (sb, b) => loadGlobal(sb, b),
  noted: (sb, b) => loadNoted(sb, b),
  'profile-posts': (sb, b, arg) => loadProfilePosts(sb, arg!, b),
  'profile-reflections': (sb, b, arg) => loadProfileReflections(sb, arg!, b),
}
