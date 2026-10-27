'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Avatar } from '@/components/Avatar'

export default function Welcome() {
  const [splash, setSplash] = useState(true)
  useEffect(() => {
    const t = setTimeout(() => setSplash(false), 1200)
    return () => clearTimeout(t)
  }, [])

  if (splash)
    return (
      <div className="auth">
        <div className="ac" style={{ background: 'var(--b950)', color: '#fff', justifyContent: 'center', alignItems: 'center', flexDirection: 'row', fontSize: 32, fontWeight: 500 }}>
          <i style={{ width: 32, height: 32, borderRadius: '50%', background: '#fff', marginRight: 12 }} />
          Exclusive
        </div>
      </div>
    )

  return (
    <div className="auth">
      <div className="ac">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', background: 'var(--b50)', borderRadius: 24, padding: 24 }}>
          {['Sarah Austin', 'David Kinsey', 'Anita Anselm', 'Audrey Franklin', 'Ngozi Eze', 'Amara Dike'].map((n, i) => (
            <Avatar key={n} name={n} size={56 + (i % 3) * 14} />
          ))}
          <span className="chip">Design & Creativity</span>
          <span className="chip">Career & Development</span>
          <span className="chip">Social Impact</span>
        </div>
        <i className="logo" style={{ margin: 0 }} />
        <h1>Meaningful &amp; intentional relationships are built here</h1>
        <p className="sub" style={{ margin: 0 }}>Join the future of effective mentorship systems.</p>
        <div className="spacer" />
        <Link className="btn" href="/signup">Get Started</Link>
        <Link className="bo" href="/login">Log In</Link>
        <p className="sub" style={{ textAlign: 'center', margin: 0, fontSize: 12 }}>By continuing, you agree with Exclusive’s Terms of Use</p>
      </div>
    </div>
  )
}
