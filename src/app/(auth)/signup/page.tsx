'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Captcha, captchaEnabled } from '@/components/Captcha'
import { createClient } from '@/lib/supabase/client'
import { LEGAL } from '@/lib/legal'
import { passwordIssue } from '@/lib/password'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [tc, setTc] = useState(false)
  const [age, setAge] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [ck, setCk] = useState(0)
  const [err, setErr] = useState('')
  const [exists, setExists] = useState(false)
  const [busy, setBusy] = useState(false)
  const weak = pw ? passwordIssue(pw) : null
  const ok = /\S+@\S+/.test(email) && !passwordIssue(pw) && tc && age && (!captchaEnabled || !!token)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr(''); setExists(false)
    const { data, error } = await createClient().auth.signUp({
      email: email.trim(), password: pw,
      options: { captchaToken: token ?? undefined, data: { terms_accepted: true, terms_version: LEGAL.termsVersion, age_confirmed: true } },
    })
    setBusy(false)
    if (captchaEnabled) { setToken(null); setCk((c) => c + 1) } // each captcha token works only once
    if (error) {
      if (/already (registered|exists)/i.test(error.message)) return setExists(true)
      return setErr(error.message)
    }
    // Supabase hides existing accounts by returning a user with no identities
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) return setExists(true)
    router.push('/verify?email=' + encodeURIComponent(email.trim()))
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <Link href="/welcome" aria-label="Back" className="lk">✕</Link>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Create your account</h1>
        <p className="sub" style={{ margin: 0 }}>Sign up with your email</p>
        <label className="lab">Email address<input className="t" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="lab">Password (8+ characters, letters and numbers)
          <span style={{ position: 'relative', display: 'block' }}>
            <input className="t" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: 18, fontSize: 12 }}>{show ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        {weak && <div className="err" role="alert">{weak}</div>}
        <label style={{ display: 'flex', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={tc} onChange={(e) => setTc(e.target.checked)} />
          <span>I have read and agree to the <Link className="lk" href="/terms" target="_blank">Terms of Use</Link>, <Link className="lk" href="/privacy" target="_blank">Privacy Policy</Link> and <Link className="lk" href="/data-protection" target="_blank">Data Protection Notice</Link>.</span>
        </label>
        <label style={{ display: 'flex', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={age} onChange={(e) => setAge(e.target.checked)} /> <span>I confirm that I am {LEGAL.minAge} years old or older.</span>
        </label>
        <Captcha onToken={setToken} resetKey={ck} />
        {exists && (
          <div className="err" role="alert">
            An account with this email already exists. <Link className="lk" href="/login">Log in</Link> or <Link className="lk" href="/forgot-password">reset your password</Link>.
          </div>
        )}
        {err && <div className="err" role="alert">{err}</div>}
        <div className="spacer" />
        <button className="btn" disabled={!ok || busy}>{busy ? 'Please wait…' : 'Continue'}</button>
        <p className="sub" style={{ textAlign: 'center', margin: 0 }}>Have an account? <Link className="lk" href="/login">Log in</Link></p>
      </form>
    </div>
  )
}
