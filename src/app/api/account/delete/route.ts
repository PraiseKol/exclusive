import { createClient as createAdmin } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Permanently deletes the signed-in account: stored photos first, then the account itself
// (the database removes the profile and everything linked to it automatically).
// Needs SUPABASE_SERVICE_ROLE_KEY on the SERVER only. Never expose that key to the browser.
export async function POST(req: Request) {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return Response.json({ error: 'Please sign in again.' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (body?.confirm !== 'DELETE') return Response.json({ error: 'Type DELETE to confirm.' }, { status: 400 })

  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) return Response.json({ error: 'Account deletion is not set up yet. Please contact support.' }, { status: 501 })

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } })

  for (const bucket of ['avatars', 'post-images']) {
    for (let i = 0; i < 20; i++) {
      const { data } = await admin.storage.from(bucket).list(user.id, { limit: 1000 })
      if (!data?.length) break
      await admin.storage.from(bucket).remove(data.map((f) => `${user.id}/${f.name}`))
    }
  }

  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return Response.json({ error: 'We could not delete your account. Please try again or contact support.' }, { status: 500 })

  await sb.auth.signOut()
  return Response.json({ ok: true })
}
