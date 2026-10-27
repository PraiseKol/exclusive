'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { INTERESTS, errMsg } from '@/lib/util'

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState<'video' | 'interests' | 'curating'>('video')
  const [picked, setPicked] = useState<string[]>([])
  const [err, setErr] = useState('')

  const toggle = (i: string) =>
    setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : p.length < 20 ? [...p, i] : p))

  async function save() {
    setErr('')
    const sb = createClient()
    const { data } = await sb.auth.getUser()
    if (!data.user) return setErr('Please log in again')
    const { error } = await sb.from('profiles').update({ interests: picked }).eq('id', data.user.id)
    if (error) return setErr(errMsg(error))
    setStep('curating')
  }

  useEffect(() => {
    if (step !== 'curating') return
    const t = setTimeout(() => { router.replace('/global'); router.refresh() }, 1800)
    return () => clearTimeout(t)
  }, [step, router])

  return (
    <div className="auth">
      <div className="ac">
        {step === 'video' && (
          <>
            <button className="lk" style={{ alignSelf: 'flex-end' }} onClick={() => setStep('interests')}>Skip video</button>
            <h1>Discover the power of Exclusive</h1>
            <button aria-label="Play explainer video" onClick={() => setStep('interests')}
              style={{ height: 260, borderRadius: 20, background: 'linear-gradient(160deg,#1a1038,#6d19b0)', color: '#fff', fontSize: 44, display: 'grid', placeItems: 'center' }}>▶</button>
            <p className="sub" style={{ margin: 0 }}>See how mentors, mentees and the 2-layer network work in under a minute.</p>
            <div className="spacer" />
            <button className="btn" onClick={() => setStep('interests')}>Continue</button>
          </>
        )}
        {step === 'interests' && (
          <>
            <h1>Tell us your interests</h1>
            <p className="sub" style={{ margin: 0 }}>Choose at least 5 so we can match you with the right people. {picked.length} selected.</p>
            <div className="int">
              {INTERESTS.map((i) => (
                <button key={i} className={'pill' + (picked.includes(i) ? ' on' : '')} onClick={() => toggle(i)}>{i}</button>
              ))}
            </div>
            {err && <div className="err" role="alert">{err}</div>}
            <div className="spacer" />
            <button className="btn" disabled={picked.length < 5} onClick={save}>Continue</button>
          </>
        )}
        {step === 'curating' && (
          <div style={{ margin: 'auto', textAlign: 'center' }}>
            <h1>Curating your world of mentors…</h1>
            <p className="sub">Matching you with people who align with your interests.</p>
          </div>
        )}
      </div>
    </div>
  )
}
