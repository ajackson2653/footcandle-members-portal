// Create a Stripe Customer Billing Portal session so a logged-in member can
// update their card or cancel auto-renewal. Stripe hosts it — we never see
// card data. Requires the member to have a Stripe customer (i.e. they renewed
// through us on an auto-renewing plan). Requires STRIPE_SECRET_KEY.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getStripe } from '@/lib/stripe'
import { SUPABASE_URL, SUPABASE_ANON } from '@/lib/supabaseConfig'
import { admin } from '@/lib/email'

export const runtime = 'nodejs'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

async function requireUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON).auth.getUser(token)
  return data.user
}

export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Payments are not configured yet.' }, { status: 500 })
  const user = await requireUser(req)
  if (!user?.email) return NextResponse.json({ error: 'Please sign in.' }, { status: 401 })

  const { data: member } = await admin()
    .from('members')
    .select('stripe_customer_id')
    .eq('email', user.email.trim().toLowerCase())
    .not('stripe_customer_id', 'is', null)
    .limit(1)
    .maybeSingle()

  if (!member?.stripe_customer_id) {
    return NextResponse.json({ error: 'We don’t have an auto-renewing payment on file for this membership. If you renewed on a one-time plan there’s nothing to manage — you’ll simply renew again next year.' }, { status: 400 })
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: member.stripe_customer_id,
      return_url: `${SITE_URL}/dashboard`,
    })
    return NextResponse.json({ url: session.url })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Could not open the billing portal' }, { status: 502 })
  }
}
