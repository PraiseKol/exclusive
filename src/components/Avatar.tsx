const COL = ['#4b0082', '#0f766e', '#b45309', '#be185d', '#1d4ed8', '#4d7c0f', '#7c3aed', '#b91c1c']

export function Avatar({ name, url, size = 38 }: { name?: string | null; url?: string | null; size?: number }) {
  const n = name || '?'
  const i = [...n].reduce((a, c) => a + c.charCodeAt(0), 0) % COL.length
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="av" src={url} alt="" width={size} height={size} style={{ width: size, height: size, objectFit: 'cover' }} />
  }
  return (
    <div className="av" style={{ background: COL[i], width: size, height: size, fontSize: size / 3 }}>
      {n.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
    </div>
  )
}
