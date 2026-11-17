import 'server-only'
import { createClient } from '@supabase/supabase-js'

/** Service-role client: bypasses all security rules. Server code only. Needs SUPABASE_SERVICE_ROLE_KEY. */
export function adminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } })
}
