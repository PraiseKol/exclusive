'use client'
import { Avatar } from './Avatar'

export function ComposerBar({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="comp">
      <Avatar name={name} url={url} />
      <button className="fake" onClick={() => window.dispatchEvent(new Event('open-composer'))}>What are you sharing today?</button>
    </div>
  )
}
