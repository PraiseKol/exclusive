import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminReports } from './AdminReports'

export const metadata = { title: 'Admin · Exclusive' }

export default async function AdminPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/login')
  const { data: flags } = await sb.from('account_flags').select('is_admin').eq('id', user.id).maybeSingle()
  if (!flags?.is_admin) notFound()
  return (
    <div className="legal" style={{ maxWidth: 900 }}>
      <p><Link className="lk" href="/home">← Back to Exclusive</Link></p>
      <h1>Reports</h1>
      <p className="sub">Review what people have reported. Removing content deletes it for good; suspending stops an account from posting, commenting and messaging.</p>
      <AdminReports />
    </div>
  )
}
