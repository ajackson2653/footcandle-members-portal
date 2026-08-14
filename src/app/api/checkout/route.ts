// ════════════════════════════════════════════════════════════════════
// Create a Stripe Checkout Session for a membership renewal/join.
// Requires a logged-in session — renewal happens only from inside the portal.
// The payer is identified by their session email (not a typed email/token).
// Inline price_data — no pre-created Stripe Price IDs. Requires STRIPE_SECRET_KEY.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, TIERS } from '@/lib/stripe'
import { SUPABASE_URL, SUPABASE_ANON } from '@/lib/supabaseConfig'

export const runtime = 'nodejs'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

async function requireUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON).auth.getUser(token)
  return data.user
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Server is missing STRIPE_SECRET_KEY. Add the Stripe keys in Vercel, then redeploy.' }, { status: 500 })

  const user = await requireUser(req)
  if (!user?.email) return NextResponse.json({ error: 'Please sign in to renew.' }, { status: 401 })
  const email = user.email.trim().toLowerCase()

  const { tier, mode } = await req.json().catch(() => ({}))
  const t = TIERS[tier as string]
  if (!t) return NextResponse.json({ error: 'Choose a membership type.' }, { status: 400 })
  if (mode !== 'subscription' && mode !== 'payment') return NextResponse.json({ error: 'Choose a payment option.' }, { status: 400 })

  // Link the payment to the member record (by session email) so the webhook
  // updates the right person.
  let memberId = ''
  const { data: m } = await createClient(SUPABASE_URL, SUPABASE_ANON).from('members').select('id').eq('email', email).order('renewal_date', { ascending: false }).limit(1).maybeSingle()
  if (m?.id) memberId = m.id

  try {
    const price_data: any = { currency: 'usd', product_data: { name: `Footcandle Film Society — ${t.label}` }, unit_amount: t.amount }
    if (mode === 'subscription') price_data.recurring = { interval: 'year' }

    const metadata = { member_id: memberId, tier, mode, email }
    const session = await getStripe().checkout.sessions.create({
      mode,
      line_items: [{ price_data, quantity: 1 }],
      customer_email: email,
      success_url: `${SITE_URL}/renew/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/renew?canceled=1`,
      metadata,
      ...(mode === 'subscription' ? { subscription_data: { metadata } } : {}),
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start checkout' }, { status: 502 })
  }
}
