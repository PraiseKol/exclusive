export function ImageGrid({ urls, alt = 'Post photo' }: { urls: string[]; alt?: string }) {
  const list = urls.filter(Boolean).slice(0, 4)
  if (list.length === 0) return null
  if (list.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="pimg" src={list[0]} alt={alt} />
  }
  return (
    <div className={'igrid n' + list.length}>
      {list.map((u, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={u + i} src={u} alt={`${alt} ${i + 1} of ${list.length}`} />
      ))}
    </div>
  )
}
