'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Modal, toast } from './Modal'

export function PostModal({ me, tier, onClose }: { me: string; tier: number; onClose: () => void }) {
  const router = useRouter()
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [global, setGlobal] = useState(false)
  const [sched, setSched] = useState('')
  const [busy, setBusy] = useState(false)

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
    <Modal title="New post" onClose={onClose}>
      <div className="mb">
        <textarea autoFocus placeholder="What’s on your mind?" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} style={{ height: 140 }} />
        <label className="lab">Photo (optional)
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={global} onChange={(e) => setGlobal(e.target.checked)} /> Make this my Global Post
        </label>
        <label className="lab">Schedule post {tier >= 1 ? '' : '(Premium)'}
          <input className="t" type="datetime-local" value={sched} disabled={tier < 1} onChange={(e) => setSched(e.target.value)} />
        </label>
        <div className="tip">A Global Post is visible to everyone and must stay global for at least one week before you can change it.</div>
        <div className="fr">
          <button className="btn sec" onClick={onClose}>Cancel</button>
          <button className="btn" disabled={busy} onClick={publish}>{busy ? 'Posting…' : sched ? 'Schedule' : 'Post'}</button>
        </div>
      </div>
    </Modal>
  )
}
