// Stripe client + membership tier pricing. Lazy-init so a missing key doesn't
// throw at import time (the page/route returns a clean error instead).
import Stripe from 'stripe'

// Paid tiers (amounts in cents). Founders are complimentary — not payable here.
export const TIERS: Record<string, { label: string; amount: number }> = {
  regular: { label: 'Regular Membership', amount: 5000 }, // $50 / person / year
  student: { label: 'Student Membership', amount: 2500 }, // $25 / year
}

let _stripe: Stripe | null = null
export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('Server is missing STRIPE_SECRET_KEY.')
  if (!_stripe) _stripe = new Stripe(key)
  return _stripe
}
