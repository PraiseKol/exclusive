'use client'

export type Duration = { kind: 'none' | '2w' | '1m' | '2m' | '3m' | 'custom'; date: string }
export const DEFAULT_DURATION: Duration = { kind: 'none', date: '' }

const OPTIONS: [Duration['kind'], string][] = [
  ['none', 'No set duration (indefinite)'], ['2w', '2 weeks'], ['1m', '1 month'], ['2m', '2 months'], ['3m', '3 months'], ['custom', 'Custom date'],
]

export const durationValid = (d: Duration) => d.kind !== 'custom' || !!d.date

/** Arguments for the respond_request database function. */
export function durationArgs(d: Duration) {
  switch (d.kind) {
    case '2w': return { p_months: null, p_ends_at: new Date(Date.now() + 14 * 86400000).toISOString() }
    case '1m': return { p_months: 1, p_ends_at: null }
    case '2m': return { p_months: 2, p_ends_at: null }
    case '3m': return { p_months: 3, p_ends_at: null }
    case 'custom': return { p_months: null, p_ends_at: new Date(d.date + 'T23:59:59').toISOString() }
    default: return { p_months: null, p_ends_at: null }
  }
}

export const durationLabel = (d: Duration) =>
  d.kind === 'none' ? 'with no end date' : d.kind === 'custom' ? `until ${d.date}` : `for ${OPTIONS.find((o) => o[0] === d.kind)![1]}`

const iso = (offsetDays: number) => new Date(Date.now() + offsetDays * 86400000).toISOString().slice(0, 10)

/** Dropdown on desktop, radio cards on phones (as in the design), plus a calendar for a custom end date. */
export function DurationPicker({ value, onChange }: { value: Duration; onChange: (d: Duration) => void }) {
  return (
    <div className="dur">
      <select className="dur-select" aria-label="Mentorship duration" value={value.kind} onChange={(e) => onChange({ ...value, kind: e.target.value as Duration['kind'] })}>
        {OPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
      <div className="dur-radios" role="radiogroup" aria-label="Mentorship duration">
        {OPTIONS.map(([k, l]) => (
          <label key={k} className="opt"><input type="radio" name="dur" checked={value.kind === k} onChange={() => onChange({ ...value, kind: k })} /> {l}</label>
        ))}
      </div>
      {value.kind === 'custom' && (
        <label className="lab">End date
          <input className="t" type="date" min={iso(1)} max={iso(730)} value={value.date} onChange={(e) => onChange({ ...value, date: e.target.value })} />
        </label>
      )}
    </div>
  )
}
