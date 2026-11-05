'use client'
import { CommentThread } from '@/components/CommentThread'

export function ReflectionComments({ id, meId }: { id: string; meId: string }) {
  return <CommentThread target={{ kind: 'reflection', id }} meId={meId} inline />
}
