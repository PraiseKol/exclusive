'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Icon } from './Icon'
import { toast, toastErr } from './Modal'

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
    if (f && f.size > MAX_IMG) return toastErr('Photos must be 5 MB or smaller')
    setFile(f)
  }

  async function publish() {
    if (!body.trim()) return toastErr('Write something first')
    setBusy(true)
    toast('Post uploading', 'loading')
    try {
      const sb = createClient()
      let image_url: string | null = null
      if (file) {
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
        if (g.error) toastErr(errMsg(g.error) + ' Your post was published as a regular post.')
        else toast('Upload complete. Now your Global Post')
      } else toast(sched ? 'Post scheduled' : 'Upload complete')
      onClose(); router.refresh()
    } catch (e) {
      toastErr(errMsg(e)); setBusy(false)
    }
  }

  const minLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)

  return (
    <div className="ov full" onClick={onClose}>
      <div className="modal full" role="dialog" aria-modal="true" aria-label="New post" onClick={(e) => e.stopPropagation()}>
        <div className="phd">
          <button onClick={onClose} aria-label="Close" className="ibtn"><Icon n="x" /></button>
          <span className="phd-title">New post</span>
          <button className={'ibtn' + (showSched ? ' on' : '')} aria-label="Schedule post" aria-pressed={showSched}
            onClick={() => (tier >= 1 ? setShowSched(!showSched) : toastErr('Scheduling posts is a Premium feature'))}><Icon n="clock" /></button>
          <button className="btn postbtn" disabled={busy || !body.trim()} onClick={publish}>{busy ? 'Posting…' : sched ? 'Schedule' : 'Post'}</button>
        </div>

        <div className="pbody">
          <textarea autoFocus aria-label="Post text" placeholder="What’s on your mind?" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
          {preview && (
            <div className="pv">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Selected photo preview" />
              <button aria-label="Remove photo" onClick={() => setFile(null)}>✕</button>
            </div>
          )}
          {showSched && (
            <label className="lab">Publish at
              <input className="t" type="datetime-local" value={sched} min={minLocal} onChange={(e) => setSched(e.target.value)} />
            </label>
          )}
          {global && <div className="tip">A Global Post is visible to everyone and must stay global for at least one week before you can change it.</div>}
        </div>

        <div className="ptool">
          <label className="ibtn" aria-label="Add photo" title="Add photo">
            <Icon n="img" />
            <input className="vh" type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files?.[0] ?? null); e.target.value = '' }} />
          </label>
          <button className={'ibtn' + (global ? ' on' : '')} aria-label="Make this my Global Post" aria-pressed={global} title="Make this my Global Post" onClick={() => setGlobal(!global)}>
            <Icon n="globe" />
          </button>
          {global && <span className="chip">Global Post</span>}
          <span style={{ flex: 1 }} />
          <span className="cnt">{5000 - body.length}</span>
        </div>
      </div>
    </div>
  )
}
