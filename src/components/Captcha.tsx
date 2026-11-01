'use client'
import { useEffect, useRef } from 'react'

// Cloudflare Turnstile (free). Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to turn it on, and add the same
// provider + secret key in Supabase: Authentication → Attack Protection → "Enable CAPTCHA protection".
// While the key is not set, no widget is shown and the app works exactly as before.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
export const captchaEnabled = !!SITE_KEY

declare global { interface Window { turnstile?: { render: (el: HTMLElement, o: Record<string, unknown>) => string; remove: (id: string) => void } } }

export function Captcha({ onToken, resetKey = 0 }: { onToken: (token: string | null) => void; resetKey?: number }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!SITE_KEY) return
    let id: string | undefined
    let cancelled = false
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile) return
      id = window.turnstile.render(ref.current, {
        sitekey: SITE_KEY, theme: 'auto',
        callback: (t: string) => onToken(t),
        'expired-callback': () => onToken(null),
        'error-callback': () => onToken(null),
      })
    }
    if (window.turnstile) render()
    else {
      let s = document.getElementById('turnstile-script') as HTMLScriptElement | null
      if (!s) {
        s = document.createElement('script')
        s.id = 'turnstile-script'
        s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
        s.async = true
        document.head.appendChild(s)
      }
      s.addEventListener('load', render)
    }
    return () => { cancelled = true; try { if (id) window.turnstile?.remove(id) } catch {} }
  }, [resetKey]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!SITE_KEY) return null
  return <div ref={ref} style={{ minHeight: 65 }} />
}
