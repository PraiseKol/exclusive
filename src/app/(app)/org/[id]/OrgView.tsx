'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { InfiniteFeed } from '@/components/InfiniteFeed'
import { toast, toastErr } from '@/components/Modal'
import { startCheckout } from '@/lib/checkout'
import type { Page } from '@/lib/feed'
import { ORG_FREE_SEATS, ORG_PLANS, PERIOD_DAYS, money } from '@/lib/plans'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'

const ROLES = ['management', 'middle', 'ambassador'] as const
const ROLE: Record<string, string> = { management: 'Management', middle: 'Middle level', ambassador: 'Ambassadors' }
const CAPS: Record<string, number[]> = { management: [1, 1, 3, 5], middle: [3, 3, 5, 10], ambassador: [0, 1, 3, 5] } // free, tier 1, 2, 3

export function OrgView({ org, members, meId, first }: { org: any; members: any[]; meId: string; first: Page }) {
  const sb = createClient()
  const router = useRouter()
  const owner = org.owner_id === meId
  const me = members.find((m) => m.user_id === meId)
  const canPost = owner || (me?.status === 'active' && ['management', 'ambassador'].includes(me.role))
  const [q, setQ] = useState('')
  const [found, setFound] = useState<any[]>([])
  const [role, setRole] = useState<(typeof ROLES)[number]>('middle')
  const [desc, setDesc] = useState(org.description ?? '')
  const [paying, setPaying] = useState<number | null>(null)

  const active = members.filter((m) => m.status === 'active')
  const used = (r: string) => members.filter((m) => m.role === r && ['active', 'pending'].includes(m.status)).length

  async function search(v: string) {
    setQ(v)
    const term = v.trim().replace(/[%,()"]/g, '')
    if (term.length < 2) return setFound([])
    const { data } = await sb.from('profiles').select('id,display_name,headline,avatar_url').neq('display_name', '').ilike('display_name', `%${term}%`).limit(8)
    const taken = new Set(members.map((m) => m.user_id))
    setFound((data ?? []).filter((p: any) => !taken.has(p.id)))
  }
  async function invite(uid: string) {
    const { error } = await sb.from('org_members').insert({ org_id: org.id, user_id: uid, role, status: 'pending' })
    if (error) return toastErr(errMsg(error))
    toast('Invitation sent'); setQ(''); setFound([]); router.refresh()
  }
  async function remove(uid: string) {
    const { error } = await sb.from('org_members').delete().eq('org_id', org.id).eq('user_id', uid)
    if (error) return toastErr(errMsg(error))
    toast(uid === meId ? 'You left the organization' : 'Member removed'); router.refresh()
  }
  async function respond(status: 'active' | 'declined') {
    const { error } = await sb.from('org_members').update({ status }).eq('org_id', org.id).eq('user_id', meId)
    if (error) return toastErr(errMsg(error))
    toast(status === 'active' ? 'You joined the organization' : 'Invitation declined'); router.refresh()
  }
  async function saveDesc() {
    const { error } = await sb.from('organizations').update({ description: desc.trim() }).eq('id', org.id)
    if (error) return toastErr(errMsg(error))
    toast('Saved'); router.refresh()
  }
  async function upgrade(t: 1 | 2 | 3) {
    setPaying(t)
    const ok = await startCheckout({ kind: 'org_premium', tier: t, orgId: org.id })
    if (!ok) setPaying(null)
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div>
        <Link className="lk" href="/orgs">← All organizations</Link>
        <h2 style={{ margin: '8px 0 2px', fontSize: 24, fontWeight: 500 }}>{org.name} <span className="chip">{org.tier > 0 ? `Tier ${org.tier}` : 'Free plan'}</span></h2>
        {owner
          ? <div style={{ display: 'flex', gap: 8 }}><input className="t" placeholder="Describe your organization" maxLength={300} value={desc} onChange={(e) => setDesc(e.target.value)} /><button className="btn sec" onClick={saveDesc}>Save</button></div>
          : org.description && <p className="sub" style={{ margin: 0 }}>{org.description}</p>}
      </div>

      {me?.status === 'pending' && (
        <div className="tip" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ flex: 1 }}>You’re invited to join as {ROLE[me.role]}.</span>
          <button className="btn sec" onClick={() => respond('declined')}>Decline</button><button className="btn" onClick={() => respond('active')}>Join</button>
        </div>
      )}

      <section>
        <b style={{ fontWeight: 500 }}>Members</b>
        {ROLES.map((r) => (
          <div key={r} style={{ marginTop: 10 }}>
            <div className="sub" style={{ fontSize: 13 }}>{ROLE[r]} · {used(r)}/{CAPS[r][org.tier]} seats</div>
            {members.filter((m) => m.role === r && (m.status === 'active' || owner || m.user_id === meId)).map((m) => (
              <div key={m.user_id} className="row" style={{ padding: '6px 0' }}>
                <Avatar name={m.user.display_name} url={m.user.avatar_url} size={36} />
                <Link href={`/profile/${m.user_id}`} className="grow"><div>{m.user.display_name}</div><div className="sub">{m.status === 'pending' ? 'Invitation pending' : m.user.headline}</div></Link>
                {(owner && m.user_id !== meId) && <button className="lk" onClick={() => remove(m.user_id)}>Remove</button>}
                {(!owner && m.user_id === meId) && <button className="lk" onClick={() => remove(m.user_id)}>Leave</button>}
              </div>
            ))}
          </div>
        ))}
        <p className="sub" style={{ fontSize: 13, margin: '10px 0 0' }}>Members’ mentees (up to two layers) can see and join in on organization posts. {org.tier > 0 ? 'Premium benefits apply to management and ambassadors.' : ''}</p>
      </section>

      {owner && (
        <section>
          <b style={{ fontWeight: 500 }}>Invite someone</b>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <input className="t" placeholder="Search people by name" value={q} onChange={(e) => search(e.target.value)} style={{ flex: '1 1 180px' }} />
            <select value={role} onChange={(e) => setRole(e.target.value as (typeof ROLES)[number])} style={{ flex: '0 1 150px', width: 'auto' }} aria-label="Role">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE[r]}</option>)}
            </select>
          </div>
          {found.map((p) => (
            <div key={p.id} className="row" style={{ padding: '6px 0' }}>
              <Avatar name={p.display_name} url={p.avatar_url} size={32} />
              <div className="grow"><div>{p.display_name}</div><div className="sub">{p.headline}</div></div>
              <button className="btn" onClick={() => invite(p.id)}>Invite</button>
            </div>
          ))}
        </section>
      )}

      {owner && (
        <section>
          <b style={{ fontWeight: 500 }}>Plan</b>
          <p className="sub" style={{ margin: '4px 0 10px' }}>Free: {ORG_FREE_SEATS}.{org.tier_expires_at && org.tier > 0 ? ` Your plan runs to ${new Date(org.tier_expires_at).toLocaleDateString('en-GB')}.` : ''}</p>
          <div style={{ display: 'grid', gap: 10 }}>
            {([1, 2, 3] as const).map((t) => (
              <div key={t} className={'plan' + (org.tier === t ? ' cur' : '')}>
                <div className="planh"><b style={{ fontWeight: 500 }}>Tier {t} · {money(ORG_PLANS[t].priceKobo)} / {PERIOD_DAYS} days</b>{org.tier === t && <span className="chip">Current</span>}</div>
                <div className="sub" style={{ fontSize: 13, marginBottom: 8 }}>{ORG_PLANS[t].seats}</div>
                <button className="btn" disabled={paying !== null || org.tier > t} onClick={() => upgrade(t)}>{org.tier === t ? 'Renew' : org.tier > t ? 'Included' : 'Choose Tier ' + t}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <b style={{ fontWeight: 500 }}>Organization posts</b>
          {canPost && <button className="btn" onClick={() => window.dispatchEvent(new Event('open-composer'))}>Write a post</button>}
        </div>
        {canPost && <p className="sub" style={{ fontSize: 13, margin: '4px 0 0' }}>In the composer, choose “Post as {org.name}”.</p>}
      </section>
      <div style={{ margin: '0 -20px' }}>
        <InfiniteFeed source="org-posts" arg={org.id} initial={first.items} next={first.next} meId={meId} endNote={false}
          empty={<div className="empty">No organization posts yet.</div>} />
      </div>
      <span hidden>{active.length}</span>
    </div>
  )
}
