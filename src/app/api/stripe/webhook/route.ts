// ════════════════════════════════════════════════════════════════════
// Stripe webhook — the source of truth that a payment actually happened.
// On checkout completion (and yearly subscription renewals) it: updates the
// member's renewal_date/status/autorenew, stores Stripe ids, and sends the
// renewal confirmation email. Requires STRIPE_WEBHOOK_SECRET.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { admin, queueEmail, sendQueued } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function plusYear(current: string | null) {
  const today = new Date().toISOString().slice(0, 10)
  const base = current && current.slice(0, 10) > today ? current.slice(0, 10) : today
  const d = new Date(base + 'T00:00:00Z')
  d.setUTCFullYear(d.getUTCFullYear() + 1)
  return d.toISOString().slice(0, 10)
}
function pretty(dateStr: string) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

async function activate(meta: any, customer: string | null, subscription: string | null, email: string | null) {
  const db = admin()
  const isSub = !!subscription
  const mail = (email || meta?.email || '').trim().toLowerCase()

  let member: any = null
  if (meta?.member_id) {
    const { data } = await db.from('members').select('*').eq('id', meta.member_id).maybeSingle()
    member = data
  }
  if (!member && mail) {
    const { data } = await db.from('members').select('*').eq('email', mail).maybeSingle()
    member = data
  }

  const renewal = plusYear(member?.renewal_date || null)
  const tierType = meta?.tier === 'student' ? 'Student' : 'Regular'

  if (member) {
    await db.from('members').update({
      status: 'active', renewal_date: renewal, expired_date: null, autorenew: isSub,
      stripe_customer_id: customer || member.stripe_customer_id, stripe_subscription_id: subscription || member.stripe_subscription_id,
      updated_at: new Date().toISOString(),
    }).eq('id', member.id)
  } else if (mail) {
    await db.from('members').insert({
      full_name: (meta?.name && String(meta.name).trim()) || mail.split('@')[0],
      email: mail, status: 'active', renewal_date: renewal,
      autorenew: isSub, membership_type: tierType, stripe_customer_id: customer, stripe_subscription_id: subscription,
    })
  }

  if (mail) {
    const body =
      `Thank you — your Footcandle Film Society membership is confirmed and active through ${pretty(renewal)}.\n\n` +
      `${isSub ? 'Your membership will renew automatically each year; you can cancel anytime.' : 'This is a one-year membership.'}\n\n` +
      `We'll see you at the movies.\n— Footcandle Film Society`
    try {
      const id = await queueEmail({ email_type: 'renewal_confirmation', recipient_email: mail, subject: 'Your Footcandle membership is confirmed', body, metadata: { auto: true } })
      await sendQueued(id)
    } catch { /* confirmation email is best-effort; payment already recorded */ }
  }
}

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return NextResponse.json({ error: 'Missing STRIPE_WEBHOOK_SECRET' }, { status: 500 })
  const sig = req.headers.get('stripe-signature') || ''
  const raw = await req.text()

  let event: any
  try {
    event = getStripe().webhooks.constructEvent(raw, sig, secret)
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : 'bad'}` }, { status: 400 })
  }

  // Idempotency: apply each Stripe event only once. Stripe retries and can
  // deliver duplicates — without this, a renewal could stack extra years.
  // Claiming the event id first is atomic; a duplicate insert (23505) means
  // we've already handled it. (If the stripe_events table doesn't exist yet,
  // we don't block — we just skip the guard.)
  const { error: claimErr } = await admin().from('stripe_events').insert({ event_id: event.id })
  if (claimErr && (claimErr as any).code === '23505') {
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const s = event.data.object
      await activate(s.metadata, s.customer, s.subscription, s.customer_details?.email || s.customer_email || s.metadata?.email)
    } else if (event.type === 'invoice.paid') {
      const inv = event.data.object
      if (inv.billing_reason === 'subscription_cycle' && inv.subscription) {
        const sub = await getStripe().subscriptions.retrieve(inv.subscription)
        await activate(sub.metadata, inv.customer, inv.subscription, inv.customer_email)
      }
    }
    return NextResponse.json({ received: true })
  } catch (e) {
    // Genuine handler failure: release the claim so Stripe's retry can reprocess.
    try { await admin().from('stripe_events').delete().eq('event_id', event.id) } catch { /* ignore */ }
    return NextResponse.json({ error: e instanceof Error ? e.message : 'handler error' }, { status: 500 })
  }
}
