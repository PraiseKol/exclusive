'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Icon } from './Icon'
import { toast } from './Modal'

const MAX_IMG = 5 * 1024 * 1024

export function PostModal({ me, tier, onClose }: { me: string; tier: number; onClose: () => void }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [global, setGlobal] = useState(false)
  const [sched, setSched] = useState('')
  const [showSched, setShowSched] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  useEffect(() => {
    if (!file) return setPreview(null)
    const u = URL.createObjectURL(file)
    setPreview(u)
    return () => URL.revokeObjectURL(u)
  }, [file])

  function pick(f: File | null) {
    if (f && f.size > MAX_IMG) return toast('Photos must be 5 MB or smaller')
    setFile(f)
  }

  async function publish() {
    if (!body.trim()) return toast('Write something first')
    setBusy(true)
    try {
      const sb = createClient()
      let image_url: string | null = null
      if (file) {
        toast('Post uploading…')
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${me}/${crypto.randomUUID()}.${ext}`
        const up = await sb.storage.from('post-images').upload(path, file, { contentType: file.type })
        if (up.error) throw up.error
        image_url = sb.storage.from('post-images').getPublicUrl(path).data.publicUrl
      }
      const ins = await sb.from('posts')
        .insert({ author_id: me, body: body.trim(), image_url, scheduled_for: sched ? new Date(sched).toISOString() : null })
        .select('id').single()
      if (ins.error) throw ins.error
      if (global) {
        const g = await sb.rpc('make_global', { p_post: ins.data.id })
        if (g.error) toast(errMsg(g.error) + ' Your post was published as a regular post.')
        else toast('Upload complete. Now your Global Post')
      } else toast(sched ? 'Post scheduled' : 'Upload complete')
      onClose(); router.refresh()
    } catch (e) {
      toast(errMsg(e)); setBusy(false)
    }
  }

  return (
    <div className="ov full" onClick={onClose}>
      <div className="modal full" role="dialog" aria-modal="true" aria-label="New post" onClick={(e) => e.stopPropagation()}>
        <header className="phd">
          <button onClick={onClose} aria-label="Close" className="ibtn"><Icon n="x" /></button>
          <span style={{ flex: 1, fontWeight: 500 }}>New post</span>
          <button className={'ibtn' + (showSched ? ' on' : '')} aria-label="Schedule post" aria-pressed={showSched}
            onClick={() => (tier >= 1 ? setShowSched(!showSched) : toast('Scheduling posts is a Premium feature'))}><Icon n="clock" /></button>
          <button className="btn" disabled={busy || !body.trim()} onClick={publish}>{busy ? 'Posting…' : sched ? 'Schedule' : 'Post'}</button>
        </header>
        <div className="pbody">
          <textarea autoFocus placeholder="What’s on your mind?" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
          {preview && (
            <div className="pv">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Selected photo preview" />
              <button aria-label="Remove photo" onClick={() => setFile(null)}>✕</button>
            </div>
          )}
          {showSched && (
            <label className="lab">Publish at
              <input className="t" type="datetime-local" value={sched} min={new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)} onChange={(e) => setSched(e.target.value)} />
            </label>
          )}
          {global && <div className="tip">A Global Post is visible to everyone and must stay global for at least one week before you can change it.</div>}
        </div>
        <footer className="ptool">
          <label className="ibtn" aria-label="Add photo" style={{ cursor: 'pointer' }}>
            <Icon n="img" />
            <input type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = '' }} />
          </label>
          <button className={'pill' + (global ? ' on' : '')} aria-pressed={global} onClick={() => setGlobal(!global)}>Global Post</button>
          <span style={{ flex: 1 }} />
          <span className="cnt">{5000 - body.length}</span>
        </footer>
      </div>
    </div>
  )
}
