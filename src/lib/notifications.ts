'use client'
import { createClient } from '@/lib/supabase/client'

export const NOTIF_EVENT = 'notif-changed'

/** Mark notifications as read (all unread ones when no ids are given) and tell the app shell to refresh its badge. */
export async function markNotificationsRead(ids?: string[]) {
  if (ids && ids.length === 0) return
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return
  let q = sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  if (ids) q = q.in('id', ids)
  const { error } = await q
  if (!error) window.dispatchEvent(new Event(NOTIF_EVENT))
  return !error
}
