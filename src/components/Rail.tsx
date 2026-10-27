import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from './Avatar'
import { UpgradeButton } from './UpgradeButton'

export async function Rail({ meId, tier }: { meId: string; tier: number }) {
  const sb = await createClient()
  const [{ data: conns }, { data: people }] = await Promise.all([
    sb.from('connections').select('mentor_id,mentee_id').eq('status', 'active'),
    sb.from('profiles').select('id,display_name,headline,avatar_url').neq('id', meId).neq('display_name', '').limit(30),
  ])
  const linked = new Set((conns ?? []).flatMap((c: any) => [c.mentor_id, c.mentee_id]))
  const sug = (people ?? []).filter((p: any) => !linked.has(p.id)).slice(0, 5)
  return (
    <>
      <div className="prem">
        <b>Go Premium. Go Further.</b>
        {tier > 0
          ? 'You are on Premium. Extra slots, DMs and scheduling are on.'
          : 'Unlock extra mentor and mentee slots, more DMs, the tip jar and post scheduling.'}
        {tier === 0 && <div><UpgradeButton /></div>}
      </div>
      <div className="card">
        <h4>Suggested for you</h4>
        {sug.length === 0 && <p className="sub">No suggestions yet.</p>}
        {sug.map((p: any) => (
          <div className="row" key={p.id}>
            <Avatar name={p.display_name} url={p.avatar_url} size={36} />
            <div className="grow"><div style={{ fontSize: 15 }}>{p.display_name}</div><div className="sub">{p.headline}</div></div>
            <Link className="lk" href={`/profile/${p.id}`}>View profile</Link>
          </div>
        ))}
      </div>
      <div className="ft">About | Help | Privacy Policy | Terms of Service<br />© 2026 Exclusive</div>
    </>
  )
}
