'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'
import { Modal, toast, toastErr } from './Modal'

const REASONS: [string, string][] = [
  ['spam', 'Spam or scam'],
  ['harassment', 'Harassment or bullying'],
  ['hate', 'Hate speech'],
  ['sexual', 'Nudity or sexual content'],
  ['violence', 'Violence or threats'],
  ['misinformation', 'False or misleading information'],
  ['impersonation', 'Pretending to be someone else'],
  ['other', 'Something else'],
]

export type ReportTarget = { type: 'post' | 'comment' | 'reflection' | 'user'; id: string }
const NAMES = { post: 'post', comment: 'comment', reflection: 'reflection', user: 'person' }

export function ReportModal({ target, onClose }: { target: ReportTarget; onClose: () => void }) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    setBusy(true)
    const { error } = await createClient().rpc('report_content', { p_type: target.type, p_target: target.id, p_reason: reason, p_details: details.trim() })
    setBusy(false)
    if (error) {
      if (/duplicate key|unique/i.test(error.message)) { toast('You’ve already reported this. We’re reviewing it.', 'info'); return onClose() }
      return toastErr(errMsg(error))
    }
    toast('Report sent. Thank you for helping keep Exclusive safe.'); onClose()
  }

  return (
    <Modal title={`Report this ${NAMES[target.type]}`} onClose={onClose}>
      <div className="mb">
        <p className="sub" style={{ margin: 0 }}>Why are you reporting this? Your report is private and reviewed by our team.</p>
        {REASONS.map(([v, label]) => (
          <label key={v} className="opt"><input type="radio" name="reason" value={v} checked={reason === v} onChange={() => setReason(v)} /> {label}</label>
        ))}
        <textarea placeholder="Add details (optional)" maxLength={500} value={details} onChange={(e) => setDetails(e.target.value)} style={{ height: 80 }} />
        <div className="fr"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn" disabled={!reason || busy} onClick={send}>{busy ? 'Sending…' : 'Send report'}</button></div>
      </div>
    </Modal>
  )
}

export function BlockModal({ user, onClose }: { user: { id: string; name: string }; onClose: () => void }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  async function block() {
    setBusy(true)
    const { error } = await createClient().rpc('block_user', { p_user: user.id })
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    toast(`${user.name} is blocked`); onClose(); router.replace('/home'); router.refresh()
  }
  return (
    <Modal title={`Block ${user.name}?`} onClose={onClose}>
      <div className="mb">
        <p style={{ margin: 0 }}>They won’t be able to see your profile or posts, message you or send you requests, and you won’t see theirs. Any mentorship or pending request between you ends. You can unblock them any time in Settings.</p>
        <div className="fr"><button className="btn sec" onClick={onClose}>Cancel</button><button className="btn" style={{ background: '#d92d20' }} disabled={busy} onClick={block}>{busy ? 'Blocking…' : 'Block'}</button></div>
      </div>
    </Modal>
  )
}
