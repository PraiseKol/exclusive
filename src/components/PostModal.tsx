'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Icon } from './Icon'
import { toast, toastErr } from './Modal'

const MAX_IMG = 5 * 1024 * 1024
const MAX_FILES = 4

export function PostModal({ me, tier, onClose }: { me: string; tier: number; onClose: () => void }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
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
    const urls = files.map((f) => URL.createObjectURL(f))
    setPreviews(urls)
    return () => urls.forEach((u) => URL.revokeObjectURL(u))
  }, [files])

  function pick(list: FileList | null) {
    if (!list) return
    const add: File[] = []
    for (const f of Array.from(list)) {
      if (f.size > MAX_IMG) { toastErr(`“${f.name}” is over 5 MB`); continue }
      add.push(f)
    }
    const next = [...files, ...add].slice(0, MAX_FILES)
    if (files.length + add.length > MAX_FILES) toastErr(`You can add up to ${MAX_FILES} photos`)
    setFiles(next)
  }

  async function publish() {
    if (!body.trim()) return toastErr('Write something first')
    setBusy(true)
    toast('Post uploading', 'loading')
    try {
      const sb = createClient()
      const images: string[] = []
      for (const file of files) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${me}/${crypto.randomUUID()}.${ext}`
        const up = await sb.storage.from('post-images').upload(path, file, { contentType: file.type })
        if (up.error) throw up.error
        images.push(sb.storage.from('post-images').getPublicUrl(path).data.publicUrl)
      }
      const ins = await sb.from('posts')
        .insert({ author_id: me, body: body.trim(), image_url: images[0] ?? null, images, scheduled_for: sched ? new Date(sched).toISOString() : null })
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
          {previews.length > 0 && (
            <div className="pvs">
              {previews.map((u, i) => (
                <div className="pv" key={u}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={u} alt={`Selected photo ${i + 1}`} />
                  <button aria-label={`Remove photo ${i + 1}`} onClick={() => setFiles(files.filter((_, j) => j !== i))}>✕</button>
                </div>
              ))}
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
          <label className="ibtn" aria-label="Add photos" title="Add photos (up to 4)">
            <Icon n="img" />
            <input className="vh" type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => { pick(e.target.files); e.target.value = '' }} />
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
