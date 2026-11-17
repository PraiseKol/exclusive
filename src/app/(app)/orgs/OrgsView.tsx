'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { toast, toastErr } from '@/components/Modal'
import { createClient } from '@/lib/supabase/client'
import { errMsg } from '@/lib/util'

const ROLE: Record<string, string> = { management: 'Management', middle: 'Middle level', ambassador: 'Ambassador' }

export function OrgsView({ owned, member, invites }: { owned: any[]; member: any[]; invites: any[] }) {
  const sb = createClient()
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function create() {
    setBusy(true)
    const { data: { user } } = await sb.auth.getUser()
    const { data, error } = await sb.from('organizations').insert({ owner_id: user!.id, name: name.trim() }).select('id').single()
    setBusy(false)
    if (error) return toastErr(errMsg(error))
    toast('Organization created'); router.push(`/org/${data.id}`)
  }
  async function respond(orgId: string, status: 'active' | 'declined') {
    const { data: { user } } = await sb.auth.getUser()
    const { error } = await sb.from('org_members').update({ status }).eq('org_id', orgId).eq('user_id', user!.id)
    if (error) return toastErr(errMsg(error))
    toast(status === 'active' ? 'You joined the organization' : 'Invitation declined'); router.refresh()
  }

  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 500 }}>Organizations</h2>

      {invites.length > 0 && (
        <section>
          <b style={{ fontWeight: 500 }}>Invitations</b>
          {invites.map((i) => (
            <div key={i.org_id} className="row" style={{ padding: '10px 0' }}>
              <div className="grow">{i.org?.name}<div className="sub">Invited as {ROLE[i.role]}</div></div>
              <button className="btn sec" onClick={() => respond(i.org_id, 'declined')}>Decline</button>
              <button className="btn" onClick={() => respond(i.org_id, 'active')}>Join</button>
            </div>
          ))}
        </section>
      )}

      <section>
        <b style={{ fontWeight: 500 }}>Your organizations</b>
        {owned.length === 0 && <p className="sub">You don’t own an organization yet.</p>}
        {owned.map((o) => (
          <Link key={o.id} href={`/org/${o.id}`} className="row" style={{ padding: '10px 0' }}>
            <div className="grow">{o.name}<div className="sub">Owner · {o.tier > 0 ? `Tier ${o.tier}` : 'Free plan'}</div></div><span className="lk">Open ›</span>
          </Link>
        ))}
      </section>

      {member.length > 0 && (
        <section>
          <b style={{ fontWeight: 500 }}>Organizations you belong to</b>
          {member.map((m) => (
            <Link key={m.org_id} href={`/org/${m.org_id}`} className="row" style={{ padding: '10px 0' }}>
              <div className="grow">{m.org?.name}<div className="sub">{ROLE[m.role]}</div></div><span className="lk">Open ›</span>
            </Link>
          ))}
        </section>
      )}

      <section>
        <b style={{ fontWeight: 500 }}>Create an organization</b>
        <p className="sub" style={{ margin: '4px 0 10px' }}>Organizations can post to their members and the members’ mentees (two layers). Free plans include 1 management and 3 middle-level members.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="t" placeholder="Organization name" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn" disabled={busy || name.trim().length < 2} onClick={create}>Create</button>
        </div>
      </section>
    </div>
  )
}
