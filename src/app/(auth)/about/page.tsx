'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'

export default function About() {
  const router = useRouter()
  const [f, setF] = useState({ first: '', last: '', phone: '', gender: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value })
  const ok = f.first && f.last && f.phone && f.gender

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true); setErr('')
    try {
      const sb = createClient()
      const { data } = await sb.auth.getUser()
      const uid = data.user?.id
      if (!uid) throw new Error('Please log in again')
      const a = await sb.from('profiles').update({ first_name: f.first.trim(), last_name: f.last.trim() }).eq('id', uid)
      if (a.error) throw a.error
      const b = await sb.from('profile_private').update({ phone: f.phone.trim(), gender: f.gender }).eq('id', uid)
      if (b.error) throw b.error
      router.push('/onboarding')
    } catch (e2) {
      setErr(errMsg(e2)); setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="ac" onSubmit={submit}>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Tell us about yourself</h1>
        <label className="lab">First name<input className="t" value={f.first} onChange={set('first')} autoComplete="given-name" /></label>
        <label className="lab">Last name<input className="t" value={f.last} onChange={set('last')} autoComplete="family-name" /></label>
        <label className="lab">Phone number<input className="t" type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
        <div style={{ display: 'flex', gap: 10 }}>
          {['Male', 'Female'].map((g) => (
            <label key={g} className="opt" style={{ flex: 1 }}>
              <input type="radio" name="gender" value={g} checked={f.gender === g} onChange={set('gender')} /> {g}
            </label>
          ))}
        </div>
        {err && <div className="err" role="alert">{err}</div>}
        <div className="spacer" />
        <button className="btn" disabled={!ok || busy}>{busy ? 'Saving…' : 'Create account'}</button>
      </form>
    </div>
  )
}
