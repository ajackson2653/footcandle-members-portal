// ════════════════════════════════════════════════════════════════════
// Public checkout for NEW members (the /newmember page we direct interested
// people to). No login — collects name + email, then Stripe Checkout. The
// webhook creates the member record on payment. Requires STRIPE_SECRET_KEY.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { getStripe, TIERS } from '@/lib/stripe'

export const runtime = 'nodejs'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 500 })

  const { name, email, tier, mode } = await req.json().catch(() => ({}))
  const cleanName = String(name || '').trim()
  const cleanEmail = String(email || '').trim().toLowerCase()
  const t = TIERS[tier as string]
  if (!cleanName || !cleanEmail.includes('@')) return NextResponse.json({ error: 'Please enter your name and a valid email.' }, { status: 400 })
  if (!t) return NextResponse.json({ error: 'Choose a membership type.' }, { status: 400 })
  if (mode !== 'subscription' && mode !== 'payment') return NextResponse.json({ error: 'Choose a payment option.' }, { status: 400 })

  try {
    const price_data: any = { currency: 'usd', product_data: { name: `Footcandle Film Society — ${t.label}` }, unit_amount: t.amount }
    if (mode === 'subscription') price_data.recurring = { interval: 'year' }

    const metadata = { member_id: '', tier, mode, email: cleanEmail, name: cleanName, new_member: 'true' }
    const session = await getStripe().checkout.sessions.create({
      mode,
      line_items: [{ price_data, quantity: 1 }],
      customer_email: cleanEmail,
      success_url: `${SITE_URL}/renew/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/newmember?canceled=1`,
      metadata,
      ...(mode === 'subscription' ? { subscription_data: { metadata } } : {}),
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not start checkout' }, { status: 502 })
  }
}
