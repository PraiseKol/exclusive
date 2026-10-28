'use client'
import { Avatar } from './Avatar'
import { Icon } from './Icon'

export function ComposerBar({ name, url }: { name: string; url: string | null }) {
  return (
    <div className="comp">
      <Avatar name={name} url={url} />
      <button className="fake" onClick={() => window.dispatchEvent(new Event('open-composer'))}>
        <span>What are you sharing today?</span>
        <span className="ficons" aria-hidden="true"><Icon n="smile" /><Icon n="img" /></span>
      </button>
    </div>
  )
}
