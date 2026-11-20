const COL = ['#0b5d55', '#b4531a', '#6b4ea0', '#b03a63', '#1f5fa8', '#5c7f1e', '#8a6d00', '#a63d2f']

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
