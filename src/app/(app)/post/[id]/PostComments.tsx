'use client'
import { CommentThread } from '@/components/CommentThread'

export function PostComments({ postId, meId }: { postId: string; meId: string }) {
  return <CommentThread target={{ kind: 'post', id: postId }} meId={meId} inline />
}
