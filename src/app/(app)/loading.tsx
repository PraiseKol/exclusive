export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} style={{ display: 'flex', gap: 12 }}>
          <div className="skl" style={{ width: 38, height: 38, borderRadius: '50%', flex: 'none' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="skl" style={{ height: 14, width: '40%' }} />
            <div className="skl" style={{ height: 12, width: '90%' }} />
            <div className="skl" style={{ height: 120, width: '100%', borderRadius: 14 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
