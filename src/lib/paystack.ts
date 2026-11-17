import 'server-only'

const BASE = 'https://api.paystack.co'

function key() {
  const k = process.env.PAYSTACK_SECRET_KEY
  if (!k) throw new Error('PAYSTACK_SECRET_KEY is not set')
  return k
}
export const paystackConfigured = () => !!process.env.PAYSTACK_SECRET_KEY

async function call<T = any>(path: string, init?: RequestInit): Promise<{ ok: boolean; data: T; message: string }> {
  const res = await fetch(BASE + path, {
    ...init,
    headers: { Authorization: `Bearer ${key()}`, 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  })
  const j = await res.json().catch(() => ({}))
  return { ok: res.ok && j.status !== false, data: j.data as T, message: j.message ?? '' }
}

export const initializeTransaction = (b: { email: string; amountKobo: number; reference: string; callbackUrl: string; metadata?: Record<string, unknown> }) =>
  call<{ authorization_url: string }>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({ email: b.email, amount: b.amountKobo, currency: 'NGN', reference: b.reference, callback_url: b.callbackUrl, metadata: b.metadata ?? {} }),
  })

export const verifyTransaction = (reference: string) =>
  call<{ status: string; amount: number; currency: string; reference: string }>(`/transaction/verify/${encodeURIComponent(reference)}`)

export const listBanks = () => call<{ name: string; code: string }[]>('/bank?country=nigeria&perPage=100&use_cursor=false')
export const resolveAccount = (accountNumber: string, bankCode: string) =>
  call<{ account_name: string }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`)
export const createRecipient = (name: string, accountNumber: string, bankCode: string) =>
  call<{ recipient_code: string; details: { bank_name: string } }>('/transferrecipient', {
    method: 'POST', body: JSON.stringify({ type: 'nuban', name, account_number: accountNumber, bank_code: bankCode, currency: 'NGN' }),
  })
export const transfer = (amountKobo: number, recipient: string, reason: string, reference: string) =>
  call<{ status: string; reference: string }>('/transfer', {
    method: 'POST', body: JSON.stringify({ source: 'balance', amount: amountKobo, recipient, reason, reference }),
  })
