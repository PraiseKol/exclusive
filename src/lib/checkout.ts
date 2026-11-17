'use client'
import { toastErr } from '@/components/Modal'

/** Starts a payment and sends the person to the payment page. The price is decided on the server. */
export async function startCheckout(body: Record<string, unknown>): Promise<boolean> {
  try {
    const res = await fetch('/api/pay/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const j = await res.json().catch(() => ({}))
    if (!res.ok || !j.url) { toastErr(j.error || 'Could not start the payment. Please try again.'); return false }
    window.location.href = j.url
    return true
  } catch {
    toastErr('Could not reach the payment service. Please check your connection.')
    return false
  }
}
