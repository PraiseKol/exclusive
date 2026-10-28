import { notFound } from 'next/navigation'
import { type Post } from '@/components/PostCard'
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
  const { data: posts } = await sb.from('post_feed').select('*').eq('author_id', pid).eq('is_disabled', false)
    .or(`scheduled_for.is.null,scheduled_for.lte.${nowIso}`)
    .order('is_global', { ascending: false }).order('created_at', { ascending: false }).limit(50)

  const { data: rrows } = await sb.from('reflections').select('post_id').eq('user_id', pid).limit(50)
  const rids = (rrows ?? []).map((r: any) => r.post_id)
  const { data: reflections } = rids.length
    ? await sb.from('post_feed').select('*').in('id', rids).eq('is_disabled', false)
    : { data: [] as Post[] }

  const [{ data: conns }, { data: pending }] = await Promise.all([
    sb.from('connections')
      .select('id,mentor_id,mentee_id,duration_months,expires_at,mentor:profiles!connections_mentor_id_fkey(id,display_name,avatar_url),mentee:profiles!connections_mentee_id_fkey(id,display_name,avatar_url)')
      .eq('status', 'active').gt('expires_at', nowIso),
    sb.from('mentor_requests').select('id').eq('requester_id', uid).eq('mentor_id', pid).eq('status', 'pending'),
  ])
  const connected = !mine && (conns ?? []).some((c: any) => c.mentor_id === pid || c.mentee_id === pid)

  let extra: any = {}
  if (!mine) {
    const { data: ev } = await sb.from('events').select('id,mentor_id,event_date,event_time,venue,purpose').eq('mentor_id', pid).order('event_date', { ascending: false }).limit(20)
    extra = { events: ev ?? [] }
  }
  if (mine) {
    const [{ data: priv }, { data: drafts }, { data: limits }, { data: events }] = await Promise.all([
      sb.from('profile_private').select('rating').eq('id', uid).single(),
      sb.from('posts').select('id,body,disabled_at').eq('author_id', uid).eq('is_global', true).eq('is_disabled', true).order('disabled_at', { ascending: false }),
      sb.rpc('my_limits'),
      sb.from('events').select('id,mentor_id,event_date,event_time,venue,purpose').order('event_date', { ascending: false }).limit(30),
    ])
    extra = { rating: priv?.rating ?? 0, drafts: drafts ?? [], limits, events: events ?? [], circle: conns ?? [] }
  }

  return (
    <ProfileView
      profile={profile} meId={uid} mine={mine} connected={connected} pendingId={(pending ?? [])[0]?.id ?? null} initialTab={tab} initialEdit={edit === '1'}
      posts={(posts ?? []) as Post[]} reflections={(reflections ?? []) as Post[]} extra={extra}
    />
  )
}
