'use client'
import { useSignedUrls } from '@/lib/signedUrls'

/** `urls` are storage paths in the private post-images bucket (legacy full URLs still work). */
export function ImageGrid({ urls, alt = 'Post photo' }: { urls: string[]; alt?: string }) {
  const list = urls.filter(Boolean).slice(0, 4)
  const map = useSignedUrls(list)
  if (list.length === 0) return null
  const src = (p: string) => map[p]
  if (list.length === 1) {
    return src(list[0])
      // eslint-disable-next-line @next/next/no-img-element
      ? <img className="pimg" src={src(list[0])} alt={alt} loading="lazy" decoding="async" />
      : <div className="pimg skl" style={{ height: 240 }} aria-hidden="true" />
  }
  return (
    <div className={'igrid n' + list.length}>
      {list.map((p, i) =>
        src(p)
          // eslint-disable-next-line @next/next/no-img-element
          ? <img key={p} src={src(p)} alt={`${alt} ${i + 1} of ${list.length}`} loading="lazy" decoding="async" />
          : <div key={p} className="skl" aria-hidden="true" />
      )}
    </div>
  )
}
