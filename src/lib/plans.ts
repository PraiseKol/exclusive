// =====================================================================================
// PRICES AND LIMITS: SET YOUR OWN. Amounts are in kobo (100 kobo = NGN 1).
// The numbers below are placeholders so the app works; change them to your real pricing.
// =====================================================================================
export const CURRENCY = 'NGN'

export const PREMIUM_PLANS: Record<1 | 2, { name: string; priceKobo: number; perks: string[] }> = {
  1: {
    name: 'Premium',
    priceKobo: 200_000, // NGN 2,000 / 30 days
    perks: ['7 mentor slots and 40 mentee slots', '2 emergency and 4 important DMs a month', 'Schedule posts in advance', 'Edit a post within 2 hours', 'Paid mentee slots', 'Premium badge and a boost in search and suggestions'],
  },
  2: {
    name: 'Premium Tier 2',
    priceKobo: 500_000, // NGN 5,000 / 30 days
    perks: ['Everything in Premium', 'Tip Jar: receive micro-tips', 'A second Global Post', 'Restore up to 3 deleted Global Posts'],
  },
}

export const ORG_PLANS: Record<1 | 2 | 3, { priceKobo: number; seats: string }> = {
  1: { priceKobo: 1_000_000, seats: '1 management, 3 middle, 1 ambassador' },
  2: { priceKobo: 2_500_000, seats: '3 management, 5 middle, 3 ambassadors' },
  3: { priceKobo: 5_000_000, seats: '5 management, 10 middle, 5 ambassadors' },
}
export const ORG_FREE_SEATS = '1 management, 3 middle, 0 ambassadors'

export const TIP = { minKobo: 10_000, maxKobo: 10_000_000, presets: [20_000, 50_000, 100_000, 200_000] }
export const SLOT_PRICE = { minKobo: 50_000, maxKobo: 10_000_000 }
export const PAYOUT_MIN_KOBO = 500_000
export const SLOT_COMMISSION = 0.1 // the platform keeps 10% of a paid mentee slot (also set in the database function apply_payment)
export const PERIOD_DAYS = 30

export const money = (kobo: number) => '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })
