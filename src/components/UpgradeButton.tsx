'use client'
import { toast } from './Modal'

export function UpgradeButton() {
  return <button className="btn" onClick={() => toast('Premium checkout is coming soon', 'info')}>Upgrade now ›</button>
}
