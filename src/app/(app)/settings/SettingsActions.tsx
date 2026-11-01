'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { Modal, toast, toastErr } from '@/components/Modal'
import { ThemeToggle } from '@/components/ThemeToggle'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'

export function SettingsActions() {
  const router = useRouter()
  const sb = createClient()
  const [blocked, setBlocked] = useState<any[] | null>(null)
  const [del, setDel] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const loadBlocked = async () => { const { data } = await sb.rpc('my_blocks'); setBlocked((data as any[]) ?? []) }
  useEffect(() => { loadBlocked() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function unblock(id: string, name: string) {
    const { error } = await sb.rpc('unblock_user', { p_user: id })
    if (error) return toastErr(errMsg(error))
    toast(`${name} is unblocked`); loadBlocked()
  }

  async function deleteAccount() {
    setBusy(true)
    const res = await fetch('/api/account/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm }) })
    const j = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toastErr(j.error || 'Something went wrong. Please try again.')
    toast('Your account has been deleted. Goodbye, and thank you for being part of Exclusive.')
    router.replace('/welcome'); router.refresh()
  }

  return (
    <>
      <div><div className="sub" style={{ marginBottom: 6 }}>Appearance</div><ThemeToggle /></div>

      <section>
        <div className="sub" style={{ marginBottom: 6 }}>Blocked people</div>
        {blocked === null && <div className="sub">Loading…</div>}
        {blocked?.length === 0 && <div className="sub">You haven’t blocked anyone.</div>}
        {blocked?.map((b) => (
          <div key={b.id} className="row" style={{ padding: '8px 0' }}>
            <Avatar name={b.display_name} url={b.avatar_url} size={36} />
            <div className="grow"><div>{b.display_name}</div><div className="sub">{b.headline}</div></div>
            <button className="bo" style={{ padding: '6px 14px', borderRadius: 999 }} onClick={() => unblock(b.id, b.display_name)}>Unblock</button>
          </div>
        ))}
      </section>

      <section>
        <div className="sub" style={{ marginBottom: 6 }}>Your data</div>
        <p className="sub" style={{ margin: '0 0 8px' }}>Download a copy of the personal data we hold about you, or delete your account. <Link className="lk" href="/privacy">Privacy Policy</Link> · <Link className="lk" href="/data-protection">Your rights</Link></p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn sec" href="/api/account/export" download>Download my data</a>
          <button className="bo" style={{ padding: '10px 16px', borderRadius: 8, color: '#d92d20', borderColor: '#d92d20' }} onClick={() => { setConfirm(''); setDel(true) }}>Delete my account</button>
        </div>
      </section>

      <button className="bo" style={{ alignSelf: 'flex-start', padding: '10px 16px', borderRadius: 999 }}
        onClick={async () => { await sb.auth.signOut(); router.replace('/welcome'); router.refresh() }}>Log out</button>

      {del && (
        <Modal title="Delete your account?" onClose={() => setDel(false)}>
          <div className="mb">
            <p style={{ margin: 0 }}>This permanently deletes your profile, posts, photos, comments, reflections and messages you sent, and ends your mentorships. <b>It can’t be undone.</b> Consider downloading your data first.</p>
            <label className="lab">Type <b>DELETE</b> to confirm<input className="t" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" /></label>
            <div className="fr">
              <button className="btn sec" onClick={() => setDel(false)}>Cancel</button>
              <button className="btn" style={{ background: '#d92d20' }} disabled={confirm !== 'DELETE' || busy} onClick={deleteAccount}>{busy ? 'Deleting…' : 'Delete everything'}</button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}
