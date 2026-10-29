'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPassword() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const clean = email.trim()
    const { error } = await createClient().auth.resetPasswordForEmail(clean)
    setBusy(false)
    if (error) return setErr(error.message)
    router.push('/reset-password?email=' + encodeURIComponent(clean))
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <Link href="/login" aria-label="Back" className="lk">✕</Link>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Forgot password?</h1>
        <p className="sub" style={{ margin: 0 }}>Enter your email and we’ll send you a code to reset your password.</p>
        <label className="lab">Email address<input className="t" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="spacer" />
        <button className="btn" disabled={!/\S+@\S+/.test(email) || busy}>{busy ? 'Sending…' : 'Send code'}</button>
        <p className="sub" style={{ textAlign: 'center', margin: 0 }}>Remembered it? <Link className="lk" href="/login">Log in</Link></p>
      </form>
    </div>
  )
}
