-- Signed-in users could read their notifications but had no UPDATE privilege,
-- so marking as read silently failed. Allow updating ONLY the read flag
-- (the notif_seen RLS policy already restricts rows to the owner).
grant update (read) on public.notifications to authenticated;

-- Fast unread-count lookups for the bell badge.
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where read = false;
