'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [tc, setTc] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = /\S+@\S+/.test(email) && pw.length >= 8 && tc

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await createClient().auth.signUp({ email, password: pw })
    setBusy(false)
    if (error) return setErr(error.message)
    router.push('/verify?email=' + encodeURIComponent(email))
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <Link href="/welcome" aria-label="Back" className="lk">✕</Link>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Create your account</h1>
        <p className="sub" style={{ margin: 0 }}>Sign up with your email</p>
        <label className="lab">Email address<input className="t" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="lab">Password (8+ characters)
          <span style={{ position: 'relative', display: 'block' }}>
            <input className="t" type={show ? 'text' : 'password'} autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: 18, fontSize: 12 }}>{show ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        <label style={{ display: 'flex', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={tc} onChange={(e) => setTc(e.target.checked)} /> I have read and agree to the Terms of Use and Privacy Policy.
        </label>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="spacer" />
        <button className="btn" disabled={!ok || busy}>{busy ? 'Please wait…' : 'Continue'}</button>
        <p className="sub" style={{ textAlign: 'center', margin: 0 }}>Have an account? <Link className="lk" href="/login">Log in</Link></p>
      </form>
    </div>
  )
}
