import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="legal">
      <p style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link className="lk" href="/welcome">← Back to Exclusive</Link>
        <span className="sub" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/terms">Terms of Use</Link><Link href="/privacy">Privacy Policy</Link><Link href="/data-protection">Data Protection</Link>
        </span>
      </p>
      {children}
    </div>
  )
}
