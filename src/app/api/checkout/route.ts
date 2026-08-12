// ════════════════════════════════════════════════════════════════════
// Create a Stripe Checkout Session for a membership renewal/join.
// Public (no login): the payer is identified by a signed token (from a
// renewal email) or by the email they enter. Inline price_data — no
// pre-created Stripe Price IDs needed. Requires STRIPE_SECRET_KEY.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, TIERS } from '@/lib/stripe'
import { verifyToken } from '@/lib/renewToken'
import { admin } from '@/lib/email'

export const runtime = 'nodejs'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Server is missing STRIPE_SECRET_KEY. Add the Stripe keys in Vercel, then redeploy.' }, { status: 500 })

  const { token, email, tier, mode } = await req.json().catch(() => ({}))
  const t = TIERS[tier as string]
  if (!t) return NextResponse.json({ error: 'Choose a membership type.' }, { status: 400 })
  if (mode !== 'subscription' && mode !== 'payment') return NextResponse.json({ error: 'Choose a payment option.' }, { status: 400 })

  // Resolve who is paying.
  let memberId = ''
  let memberEmail = (email || '').trim().toLowerCase()
  const idFromToken = verifyToken(token)
  if (idFromToken && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    memberId = idFromToken
    if (!memberEmail) {
      const { data } = await admin().from('members').select('email').eq('id', idFromToken).maybeSingle()
      if (data?.email) memberEmail = data.email
    }
  }
  if (!memberEmail || !memberEmail.includes('@')) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 })

  try {
    const price_data: any = {
      currency: 'usd',
      product_data: { name: `Footcandle Film Society — ${t.label}` },
      unit_amount: t.amount,
    }
    if (mode === 'subscription') price_data.recurring = { interval: 'year' }

    const metadata = { member_id: memberId, tier, mode, email: memberEmail }
    const session = await getStripe().checkout.sessions.create({
      mode,
      line_items: [{ price_data, quantity: 1 }],
      customer_email: memberEmail,
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
