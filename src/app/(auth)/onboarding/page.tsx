'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Icon } from '@/components/Icon'
import { createClient } from '@/lib/supabase/client'
import { INTERESTS, errMsg } from '@/lib/util'

const LOADING = [
  ['Curating your world of mentors…', 'Matching you with people who align with your interests.'],
  ['Calibrating your mentorship network…', 'Every meaningful connection starts with the right alignment.'],
  ['Your circle is forming…', 'Your next great connection is closer than you think.'],
]

const YT_ID = process.env.NEXT_PUBLIC_ONBOARDING_YOUTUBE_ID || 'I5H_1jPhJrs'
const VIDEO = process.env.NEXT_PUBLIC_ONBOARDING_VIDEO_URL

export default function Onboarding() {
  const router = useRouter()
  const [step, setStep] = useState<'video' | 'interests' | 'curating'>('video')
  const [picked, setPicked] = useState<string[]>([])
  const [err, setErr] = useState('')
  const [playing, setPlaying] = useState(false)
  const [tick, setTick] = useState(0)

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
    const t = setInterval(() => setTick((x) => x + 1), 1400)
    return () => clearInterval(t)
  }, [step])
  useEffect(() => {
    if (tick >= LOADING.length) { router.replace('/global'); router.refresh() }
  }, [tick, router])

  return (
    <div className="auth">
      <div className="ac" style={step === 'video' ? { background: 'linear-gradient(180deg,var(--b50),var(--n0))' } : undefined}>
        {step === 'video' && (
          <div style={{ display: 'contents' }}>
            <button className="lk" style={{ alignSelf: 'flex-end' }} onClick={() => setStep('interests')}>Skip video</button>
            <h1 style={{ fontSize: 28, lineHeight: 1.2 }}>Discover the power of <span style={{ color: 'var(--lk)' }}>Exclusive ✨</span></h1>
            <div style={{ borderRadius: 24, padding: 6, background: 'color-mix(in srgb, var(--b600) 18%, transparent)' }}>
              {playing ? (
                VIDEO ? (
                  <video src={VIDEO} controls autoPlay playsInline style={{ width: '100%', borderRadius: 18, display: 'block', background: '#000' }} />
                ) : (
                  <div className="ytbox">
                    <iframe src={`https://www.youtube-nocookie.com/embed/${YT_ID}?autoplay=1&rel=0&playsinline=1`} title="Welcome to Exclusive"
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen />
                  </div>
                )
              ) : (
                <button aria-label="Play explainer video" className="ytposter" onClick={() => setPlaying(true)}
                  style={{ backgroundImage: VIDEO ? undefined : `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.25)), url(https://i.ytimg.com/vi/${YT_ID}/hqdefault.jpg)` }}>
                  <span className="playbtn">▶</span>
                </button>
              )}
            </div>
            <p style={{ margin: 0 }}>In 2 minutes, Kayode explains how Exclusive helps you connect with mentors, build intentional relationships, and engage with a community that values depth over noise.</p>
            <div className="spacer" />
            <button className="btn" onClick={() => setStep('interests')}>Continue</button>
          </div>
        )}
        {step === 'interests' && (
          <>
            <h1>Tell us your interests</h1>
            <p className="sub" style={{ margin: 0 }}>Choose between 5 and 20 interests so we can give you more personalized content on your feed. {picked.length} selected.</p>
            <div className="int">
              {INTERESTS.map((i) => (
                <button key={i} className={'pill' + (picked.includes(i) ? ' on' : '')} onClick={() => toggle(i)}>{i}</button>
              ))}
            </div>
            {picked.length > 0 && (
              <div>
                <div className="sub" style={{ marginBottom: 6 }}>Selected interests</div>
                {picked.map((i) => (
                  <div key={i} className="selrow"><span>{i}</span><button aria-label={`Remove ${i}`} onClick={() => toggle(i)}><Icon n="trash" /></button></div>
                ))}
              </div>
            )}
            {err && <div className="err" role="alert">{err}</div>}
            <div className="spacer" />
            <button className="btn" disabled={picked.length < 5} onClick={save}>Continue</button>
          </>
        )}
        {step === 'curating' && (
          <div style={{ margin: 'auto', textAlign: 'center' }} role="status" aria-live="polite">
            <div className="rocket" aria-hidden="true">🚀</div>
            <h1>{LOADING[Math.min(tick, LOADING.length - 1)][0]}</h1>
            <p className="sub">{LOADING[Math.min(tick, LOADING.length - 1)][1]}</p>
            <div className="dotsrow" aria-hidden="true">{LOADING.map((_, i) => <i key={i} className={i <= tick ? 'on' : ''} />)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
