import { notFound } from 'next/navigation'
import { loadPinned, loadProfilePosts, loadProfileReflections } from '@/lib/feed'
import { createClient } from '@/lib/supabase/server'
import { ProfileView } from './ProfileView'

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string; edit?: string }> }) {
  const { id } = await params
  const { tab, edit } = await searchParams
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  const uid = user!.id
  const pid = id === 'me' ? uid : id
  const mine = pid === uid

  const { data: profile } = await sb.from('profiles').select('*').eq('id', pid).single()
  if (!profile) notFound()

  const nowIso = new Date().toISOString()
  const [pinned, postsPage, reflPage] = await Promise.all([loadPinned(sb, pid), loadProfilePosts(sb, pid), loadProfileReflections(sb, pid)])

  const [{ data: conns }, { data: pending }] = await Promise.all([
    sb.from('connections')
      .select('id,mentor_id,mentee_id,duration_months,expires_at,mentor:profiles!connections_mentor_id_fkey(id,display_name,avatar_url),mentee:profiles!connections_mentee_id_fkey(id,display_name,avatar_url)')
      .eq('status', 'active').gt('expires_at', nowIso),
    sb.from('mentor_requests').select('id').eq('requester_id', uid).eq('mentor_id', pid).eq('status', 'pending'),
  ])
  const { data: mr } = mine ? { data: null } : await sb.from('ratings').select('value').eq('rater_id', uid).eq('ratee_id', pid).maybeSingle()
  const connected = !mine && (conns ?? []).some((c: any) => c.mentor_id === pid || c.mentee_id === pid)

  let extra: any = {}
  if (!mine) {
    const { data: ev } = await sb.from('events').select('id,mentor_id,event_date,event_time,venue,purpose').eq('mentor_id', pid).order('event_date', { ascending: false }).limit(20)
    extra = { events: ev ?? [] }
  }
  if (mine) {
    const [{ data: priv }, { data: drafts }, { data: limits }, { data: events }, { data: rc }] = await Promise.all([
      sb.from('profile_private').select('rating').eq('id', uid).single(),
      sb.from('posts').select('id,body,disabled_at').eq('author_id', uid).eq('is_global', true).eq('is_disabled', true).order('disabled_at', { ascending: false }),
      sb.rpc('my_limits'),
      sb.from('events').select('id,mentor_id,event_date,event_time,venue,purpose').order('event_date', { ascending: false }).limit(30),
      sb.rpc('my_rating_counts'),
    ])
    extra = { ratingCounts: { up: Number((rc as any)?.up ?? 0), down: Number((rc as any)?.down ?? 0) }, rating: priv?.rating ?? 0, drafts: drafts ?? [], limits, events: events ?? [], circle: conns ?? [] }
  }

  return (
    <ProfileView
      profile={profile} meId={uid} mine={mine} connected={connected} pendingId={(pending ?? [])[0]?.id ?? null} initialTab={tab} initialEdit={edit === '1'} myRating={mr?.value ?? 0} connId={(conns ?? []).find((c: any) => c.mentor_id === pid || c.mentee_id === pid)?.id ?? null}
      pinned={pinned} postsInit={postsPage} reflInit={reflPage} extra={extra}
    />
  )
}
