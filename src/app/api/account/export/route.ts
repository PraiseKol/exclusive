import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// "Download my data": everything we hold that is linked to the signed-in account, as one JSON file.
// Runs with the person's own session, so database rules guarantee it can only ever return their data.
export async function GET() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response('Please sign in to download your data.', { status: 401 })
  const uid = user.id

  const by = async (table: string, col: string) => (await sb.from(table).select('*').eq(col, uid)).data ?? []
  const either = async (table: string, a: string, b: string) => (await sb.from(table).select('*').or(`${a}.eq.${uid},${b}.eq.${uid}`)).data ?? []

  const out = {
    exported_at: new Date().toISOString(),
    note: 'This file contains the personal data linked to your Exclusive account.',
    account: { id: uid, email: user.email, created_at: user.created_at, last_sign_in_at: user.last_sign_in_at },
    profile: (await by('profiles', 'id'))[0] ?? null,
    private_details: (await by('profile_private', 'id'))[0] ?? null,
    posts: await by('posts', 'author_id'),
    reflections: await by('reflections', 'user_id'),
    comments: await by('comments', 'author_id'),
    likes: { posts: await by('post_likes', 'user_id'), reflections: await by('reflection_likes', 'user_id'), comments: await by('comment_likes', 'user_id') },
    noted_posts: await by('noted', 'user_id'),
    messages: await either('messages', 'sender_id', 'recipient_id'),
    mentorships: await either('connections', 'mentor_id', 'mentee_id'),
    mentor_requests: await either('mentor_requests', 'requester_id', 'mentor_id'),
    ratings_given: await by('ratings', 'rater_id'),
    events_you_created: await by('events', 'mentor_id'),
    notifications: await by('notifications', 'user_id'),
    blocked_users: await by('blocks', 'blocker_id'),
    reports_you_made: await by('reports', 'reporter_id'),
    organization_memberships: await by('org_members', 'user_id'),
    reflection_log_entries: await by('reflection_log', 'author_id'),
  }

  return new Response(JSON.stringify(out, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="exclusive-data-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  })
}
