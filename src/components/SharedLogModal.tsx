'use client'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ago, errMsg } from '@/lib/util'
import { Avatar } from './Avatar'
import { Modal, toast, toastErr } from './Modal'

/** Private notebook shared by one mentor and one mentee: goals, takeaways, next steps. */
export function SharedLogModal({ connectionId, otherName, meId, onClose }: { connectionId: string; otherName: string; meId: string; onClose: () => void }) {
  const sb = createClient()
  const [rows, setRows] = useState<any[] | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const end = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    const { data } = await sb.from('reflection_log').select('id,body,created_at,author_id,author:profiles!reflection_log_author_id_fkey(display_name,avatar_url)')
      .eq('connection_id', connectionId).order('created_at', { ascending: true }).limit(200)
    setRows(data ?? [])
    requestAnimationFrame(() => end.current?.scrollIntoView({ block: 'end' }))
  }, [connectionId]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [load])

  async function add() {
    if (!text.trim()) return
    setBusy(true)
    const { error } = await sb.from('reflection_log').insert({ connection_id: connectionId, author_id: meId, body: text.trim() })
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    setText(''); load()
  }
  async function del(id: string) {
    const { error } = await sb.from('reflection_log').delete().eq('id', id)
    if (error) return toastErr(errMsg(error))
    toast('Entry removed'); load()
  }

  return (
    <Modal title={`Shared log with ${otherName}`} onClose={onClose}>
      <div className="mb">
        <p className="sub" style={{ margin: 0 }}>Only you and {otherName} can see this. Use it to track goals, takeaways and next steps.</p>
        <div style={{ maxHeight: '38dvh', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rows === null && <div className="sub">Loading…</div>}
          {rows?.length === 0 && <div className="sub">No entries yet. Add the first one below.</div>}
          {rows?.map((r) => (
            <div key={r.id} className="cm">
              <Avatar name={r.author?.display_name} url={r.author?.avatar_url} size={30} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div><b style={{ fontWeight: 500 }}>{r.author_id === meId ? 'You' : r.author?.display_name}</b> <span className="sub">· {ago(r.created_at)}</span></div>
                <div style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{r.body}</div>
                {r.author_id === meId && <button className="sub" style={{ fontSize: 13 }} onClick={() => del(r.id)}>Delete</button>}
              </div>
            </div>
          ))}
          <div ref={end} />
        </div>
        <textarea placeholder="Add a note, goal or takeaway…" maxLength={2000} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="fr"><button className="btn" disabled={busy || !text.trim()} onClick={add}>Add to log</button></div>
      </div>
    </Modal>
  )
}
