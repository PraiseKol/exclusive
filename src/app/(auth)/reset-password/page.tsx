'use client'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Captcha, captchaEnabled } from '@/components/Captcha'
import { createClient } from '@/lib/supabase/client'
import { passwordIssue } from '@/lib/password'

function ResetForm() {
  const router = useRouter()
  const email = useSearchParams().get('email') ?? ''
  const [code, setCode] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [info, setInfo] = useState('')
  const [busy, setBusy] = useState(false)
  const [needCap, setNeedCap] = useState(false)
  const weak = pw ? passwordIssue(pw) : null
  const ok = code.length >= 6 && !passwordIssue(pw) && pw === pw2

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(''); setInfo('')
    const sb = createClient()
    const v = await sb.auth.verifyOtp({ email, token: code.trim(), type: 'recovery' })
    if (v.error) { setBusy(false); return setErr('That code is incorrect or has expired. Check it and try again, or request a new one.') }
    const u = await sb.auth.updateUser({ password: pw })
    if (u.error) { setBusy(false); return setErr(u.error.message) }
    router.replace('/home'); router.refresh()
  }
  async function resend(token?: string) {
    setErr(''); setInfo('')
    if (captchaEnabled && !token) { setNeedCap(true); return }
    const { error } = await createClient().auth.resetPasswordForEmail(email, { captchaToken: token })
    if (error) setErr(error.message); else setInfo('A new code has been sent.')
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <Link href="/login" aria-label="Back" className="lk">✕</Link>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Reset your password</h1>
        <p className="sub" style={{ margin: 0 }}>If an account exists for {email || 'that email'}, we’ve sent a code. Enter it below with your new password.</p>
        <label className="lab">Code
          <input className="t" inputMode="numeric" autoComplete="one-time-code" maxLength={8} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} style={{ letterSpacing: '.3em', fontSize: 18 }} />
        </label>
        <label className="lab">New password (8+ characters, letters and numbers)
          <span style={{ position: 'relative', display: 'block' }}>
            <input className="t" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: 18, fontSize: 12 }}>{show ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        <label className="lab">Confirm new password
          <input className="t" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
        </label>
        {weak && <div className="err" role="alert">{weak}</div>}
        {pw2 && pw !== pw2 && <div className="err" role="alert">Passwords don’t match.</div>}
        {err && <div className="err" role="alert">{err}</div>}
        {info && <div className="sub" role="status">{info}</div>}
        <button type="button" className="lk" style={{ alignSelf: 'flex-start' }} onClick={() => resend()}>Resend code</button>
        {needCap && <Captcha onToken={(t) => { if (t) { setNeedCap(false); resend(t) } }} />}
        <div className="spacer" />
        <button className="btn" disabled={!ok || busy}>{busy ? 'Saving…' : 'Reset password'}</button>
      </form>
    </div>
  )
}

export default function ResetPassword() {
  return <Suspense><ResetForm /></Suspense>
}
