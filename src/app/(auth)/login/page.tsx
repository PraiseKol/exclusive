'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [show, setShow] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const ok = /\S+@\S+/.test(email) && pw.length >= 6

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    const { error } = await createClient().auth.signInWithPassword({ email, password: pw })
    setBusy(false)
    if (error) return setErr(error.message)
    router.replace('/home'); router.refresh()
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <Link href="/welcome" aria-label="Back" className="lk">✕</Link>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Welcome back!</h1>
        <p className="sub" style={{ margin: 0 }}>Please enter your email and password</p>
        <label className="lab">Email address<input className="t" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        <label className="lab">Password
          <span style={{ position: 'relative', display: 'block' }}>
            <input className="t" type={show ? 'text' : 'password'} autoComplete="current-password" value={pw} onChange={(e) => setPw(e.target.value)} />
            <button type="button" onClick={() => setShow(!show)} style={{ position: 'absolute', right: 12, top: 18, fontSize: 12 }}>{show ? 'Hide' : 'Show'}</button>
          </span>
        </label>
        <Link className="lk" href="/forgot-password" style={{ alignSelf: 'flex-end' }}>Forgot password?</Link>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="spacer" />
        <button className="btn" disabled={!ok || busy}>{busy ? 'Logging in…' : 'Log In'}</button>
        <p className="sub" style={{ textAlign: 'center', margin: 0 }}>Don’t have an account? <Link className="lk" href="/signup">Create account</Link></p>
      </form>
    </div>
  )
}
