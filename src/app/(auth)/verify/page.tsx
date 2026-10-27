'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

function VerifyForm() {
  const router = useRouter()
  const email = useSearchParams().get('email') ?? ''
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await createClient().auth.verifyOtp({ email, token: code.trim(), type: 'signup' })
    setBusy(false)
    if (error) return setErr(error.message)
    router.replace('/about'); router.refresh()
  }
  async function resend() {
    const { error } = await createClient().auth.resend({ type: 'signup', email })
    if (error) setErr(error.message); else setSent(true)
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Verify your account</h1>
        <p className="sub" style={{ margin: 0 }}>Enter the verification code sent to {email || 'your email'}.</p>
        <label className="lab">Verification code
          <input className="t" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ letterSpacing: '.4em', fontSize: 20 }} />
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <button type="button" className="lk" style={{ alignSelf: 'flex-start' }} onClick={resend}>{sent ? 'Code sent again' : 'Resend code'}</button>
        <div className="spacer" />
        <button className="btn" disabled={code.length < 6 || busy}>{busy ? 'Verifying…' : 'Verify'}</button>
      </form>
    </div>
  )
}

export default function Verify() {
  return <Suspense><VerifyForm /></Suspense>
}
