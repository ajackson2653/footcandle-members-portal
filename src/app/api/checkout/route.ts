// ════════════════════════════════════════════════════════════════════
// Create a Stripe Checkout Session for a membership renewal/join. Supports a
// SECOND person (e.g. a spouse) paid together in one payment. Requires a
// logged-in session OR a signed renewal-link token to identify person 1.
// Inline price_data — no pre-created Stripe Price IDs. Requires STRIPE_SECRET_KEY.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe, TIERS } from '@/lib/stripe'
import { SUPABASE_URL, SUPABASE_ANON } from '@/lib/supabaseConfig'
import { verifyToken } from '@/lib/renewToken'
import { admin } from '@/lib/email'

export const runtime = 'nodejs'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

async function requireUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON).auth.getUser(token)
  return data.user
}
function lineItem(tierKey: string, mode: string) {
  const t = TIERS[tierKey]
  const price_data: any = { currency: 'usd', product_data: { name: `Footcandle Film Society — ${t.label}` }, unit_amount: t.amount }
  if (mode === 'subscription') price_data.recurring = { interval: 'year' }
  return { price_data, quantity: 1 }
}
async function memberIdForEmail(email: string) {
  const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON).from('members').select('id').eq('email', email).order('renewal_date', { ascending: false }).limit(1).maybeSingle()
  return data?.id || ''
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Server is missing STRIPE_SECRET_KEY. Add the Stripe keys in Vercel, then redeploy.' }, { status: 500 })

  const { tier, mode, token, second } = await req.json().catch(() => ({}))

  // Identify person 1 — signed renewal token (no login) OR the session.
  let email = ''
  let memberId = ''
  const idFromToken = verifyToken(token)
  if (idFromToken) {
    memberId = idFromToken
    const { data } = await admin().from('members').select('email').eq('id', idFromToken).maybeSingle()
    if (data?.email) email = data.email.trim().toLowerCase()
  }
  if (!email) {
    const user = await requireUser(req)
    if (user?.email) email = user.email.trim().toLowerCase()
  }
  if (!email) return NextResponse.json({ error: 'Please sign in to renew.' }, { status: 401 })

  if (!TIERS[tier as string]) return NextResponse.json({ error: 'Choose a membership type.' }, { status: 400 })
  if (mode !== 'subscription' && mode !== 'payment') return NextResponse.json({ error: 'Choose a payment option.' }, { status: 400 })
  if (!memberId) memberId = await memberIdForEmail(email)

  // Optional second person (couple paying together).
  const secondEmail = (second?.email || '').trim().toLowerCase()
  const secondName = (second?.name || '').trim()
  const secondTier = second?.tier === 'student' ? 'student' : 'regular'
  const hasSecond = !!secondEmail && secondEmail.includes('@') && !!secondName && !!TIERS[secondTier]

  const line_items = [lineItem(tier, mode)]
  const metadata: Record<string, string> = { member_id: memberId, tier, mode, email }
  if (hasSecond) {
    line_items.push(lineItem(secondTier, mode))
    metadata.household_id = (globalThis.crypto as any).randomUUID()
    metadata.member2_id = await memberIdForEmail(secondEmail)
    metadata.member2_tier = secondTier
    metadata.member2_email = secondEmail
    metadata.member2_name = secondName
  }

  try {
    const session = await getStripe().checkout.sessions.create({
      mode,
      line_items,
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
