'use client'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { toast, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { useSignedUrls } from '@/lib/signedUrls'
import { ago, errMsg } from '@/lib/util'

const REASON: Record<string, string> = {
  spam: 'Spam or scam', harassment: 'Harassment or bullying', hate: 'Hate speech', sexual: 'Nudity or sexual content',
  violence: 'Violence or threats', misinformation: 'False information', impersonation: 'Impersonation', other: 'Something else',
}

function Thumbs({ paths }: { paths: string[] }) {
  const map = useSignedUrls(paths.slice(0, 4))
  if (!paths.length) return null
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '8px 0' }}>
      {paths.slice(0, 4).map((p) => map[p]
        // eslint-disable-next-line @next/next/no-img-element
        ? <img key={p} src={map[p]} alt="Reported photo" style={{ height: 90, borderRadius: 8, objectFit: 'cover' }} />
        : <div key={p} className="skl" style={{ height: 90, width: 90 }} />)}
    </div>
  )
}

export function AdminReports() {
  const sb = createClient()
  const [tab, setTab] = useState<'open' | 'done'>('open')
  const [rows, setRows] = useState<any[] | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    const { data, error } = await sb.rpc('admin_list_reports', { p_status: tab === 'open' ? 'open' : 'all' })
    if (error) return toastErr(errMsg(error))
    setRows(((data as any[]) ?? []).filter((r) => (tab === 'open' ? r.status === 'open' : r.status !== 'open')))
  }, [tab]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows(null); load() }, [load])

  async function act(r: any, action: 'dismiss' | 'remove' | 'suspend') {
    const warn = action === 'remove' ? 'Delete this content permanently?' : action === 'suspend' ? `Suspend ${r.target?.user_name ?? 'this account'}?` : ''
    if (warn && !window.confirm(warn)) return
    setBusy(r.id)
    const { data, error } = await sb.rpc('admin_resolve_report', { p_report: r.id, p_action: action, p_note: notes[r.id] ?? '' })
    setBusy('')
    if (error) return toastErr(errMsg(error))
    const imgs: string[] = (data as any)?.images ?? []
    if (imgs.length) await sb.storage.from('post-images').remove(imgs.filter((p) => !/^https?:/.test(p)))
    toast(action === 'dismiss' ? 'Report dismissed' : action === 'remove' ? 'Content removed' : 'Account suspended')
    load()
  }
  async function unsuspend(userId: string) {
    const { error } = await sb.rpc('admin_set_suspended', { p_user: userId, p_on: false })
    if (error) return toastErr(errMsg(error))
    toast('Account reinstated'); load()
  }

  return (
    <>
      <div className="tabs" style={{ padding: 0 }}>
        <button className={tab === 'open' ? 'on' : ''} onClick={() => setTab('open')}>Open</button>
        <button className={tab === 'done' ? 'on' : ''} onClick={() => setTab('done')}>Resolved</button>
      </div>
      {rows === null && <div className="empty">Loading…</div>}
      {rows?.length === 0 && <div className="empty">{tab === 'open' ? 'No open reports. 🎉' : 'Nothing resolved yet.'}</div>}
      {rows?.map((r) => (
        <article key={r.id} className="post" style={{ border: '1px solid var(--n200)', borderRadius: 12, margin: '12px 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
            <b style={{ fontWeight: 500 }}>{REASON[r.reason] ?? r.reason} · {r.target_type}</b>
            <span className="sub">{ago(r.created_at)} ago · reported by {r.reporter.name}</span>
          </div>
          {r.details && <p style={{ margin: '8px 0', overflowWrap: 'anywhere' }}>“{r.details}”</p>}
          <div className="quote">
            {r.target ? (
              <>
                <div className="sub" style={{ fontSize: 13 }}>By <Link className="lk" href={`/profile/${r.target.user_id}`}>{r.target.user_name}</Link>{r.target_suspended && ' · suspended'}</div>
                <p className="qt" style={{ WebkitLineClamp: 'unset' as any }}>{r.target.text}</p>
                <Thumbs paths={r.target.images ?? []} />
              </>
            ) : <span className="sub">This content has already been removed.</span>}
          </div>
          {r.status === 'open' ? (
            <>
              <input className="t" placeholder="Note (optional)" value={notes[r.id] ?? ''} maxLength={500} onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })} />
              <div className="fr" style={{ justifyContent: 'flex-start', marginTop: 10, flexWrap: 'wrap' }}>
                <button className="btn sec" disabled={busy === r.id} onClick={() => act(r, 'dismiss')}>Dismiss</button>
                {r.target_type !== 'user' && r.target && <button className="btn" disabled={busy === r.id} onClick={() => act(r, 'remove')}>Remove content</button>}
                {r.target && <button className="btn" style={{ background: '#d92d20' }} disabled={busy === r.id || r.target_suspended} onClick={() => act(r, 'suspend')}>{r.target_suspended ? 'Already suspended' : 'Suspend account'}</button>}
              </div>
            </>
          ) : (
            <div className="sub" style={{ marginTop: 8 }}>
              {r.status === 'actioned' ? 'Action taken' : 'Dismissed'}{r.resolution ? `: ${r.resolution}` : ''}
              {r.target_suspended && r.target && <button className="lk" style={{ marginLeft: 10 }} onClick={() => unsuspend(r.target.user_id)}>Reinstate account</button>}
            </div>
          )}
        </article>
      ))}
    </>
  )
}
