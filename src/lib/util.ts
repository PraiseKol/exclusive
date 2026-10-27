export const ago = (iso: string) => {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 3600) return Math.max(1, Math.floor(s / 60)) + 'm'
  if (s < 86400) return Math.floor(s / 3600) + 'h'
  return Math.floor(s / 86400) + 'd'
}
export const GRADES: Record<string, string> = {
  A: '1,000,000+', B: '100,000 – 999,999', C: '10,000 – 99,999', D: '1,000 – 9,999', E: 'under 1,000',
}
export const INTERESTS = [
  'Design & Creativity', 'Entrepreneurship', 'Career & Development', 'Personal Branding', 'Social Impact',
  'Technology', 'Health & Fitness', 'Creative Writing', 'Media & Podcasting', 'Music & Performing Arts',
  'Education & Coaching', 'Finance', 'Leadership', 'Product Management', 'Faith & Purpose', 'Sports',
  'Travel', 'Science',
]
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : (e as { message?: string })?.message ?? 'Something went wrong')
