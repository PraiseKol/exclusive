// Client-side image preparation: resize, (for avatars) square-crop, re-encode as WebP.
// Re-encoding also drops EXIF metadata such as GPS location and camera details.

export type ImageKind = 'avatar' | 'post'
export const MAX_INPUT_BYTES = 25 * 1024 * 1024
export const AVATAR_SIZE = 320
export const POST_MAX_EDGE = 1280
export const ONE_YEAR = '31536000'

const toBlob = (c: HTMLCanvasElement, type: string, q: number) =>
  new Promise<Blob | null>((resolve) => c.toBlob(resolve, type, q))

export async function prepareImage(file: File, kind: ImageKind): Promise<{ blob: Blob; ext: 'webp' | 'jpg' }> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > MAX_INPUT_BYTES) throw new Error('That photo is too large. Please choose one under 25 MB.')

  let bmp: ImageBitmap
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    try { bmp = await createImageBitmap(file) } catch {
      throw new Error('This image format isn’t supported. Please use a JPG, PNG or WebP photo.')
    }
  }

  const w = bmp.width, h = bmp.height
  let sx = 0, sy = 0, sw = w, sh = h, tw: number, th: number
  if (kind === 'avatar') {
    const s = Math.min(w, h)
    sx = (w - s) / 2; sy = (h - s) / 2; sw = sh = s
    tw = th = Math.min(AVATAR_SIZE, s)
  } else {
    const scale = Math.min(1, POST_MAX_EDGE / Math.max(w, h))
    tw = Math.max(1, Math.round(w * scale)); th = Math.max(1, Math.round(h * scale))
  }

  const canvas = document.createElement('canvas')
  canvas.width = tw; canvas.height = th
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process that image.')
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#fff' // transparent PNGs would turn black in a lossy format
  ctx.fillRect(0, 0, tw, th)
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, tw, th)
  bmp.close?.()

  const q = kind === 'avatar' ? 0.82 : 0.8
  let blob = await toBlob(canvas, 'image/webp', q)
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', q) // older Safari
  if (!blob) throw new Error('Could not process that image. Please try another one.')
  return { blob, ext: blob.type === 'image/webp' ? 'webp' : 'jpg' }
}

/** Upload options: one-year browser caching (every file name is unique, so this is safe). */
export const uploadOptions = (blob: Blob) => ({ contentType: blob.type, cacheControl: ONE_YEAR, upsert: false })

/** Storage path from a public URL (avatars bucket), or null. */
export function pathFromPublicUrl(url: string | null | undefined, bucket: string): string | null {
  if (!url) return null
  const part = url.split(`/object/public/${bucket}/`)[1]
  return part ? decodeURIComponent(part.split('?')[0]) : null
}
