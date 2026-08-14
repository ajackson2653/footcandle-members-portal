// ════════════════════════════════════════════════════════════════════
// Scheduled: renewal reminders at 30 and 7 days before renewal_date.
// Run daily by Vercel Cron. Protected by CRON_SECRET.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { admin, queueEmail, sendQueued } from '@/lib/email'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}
function addDaysUTC(n: number) {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function pretty(dateStr: string) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized (set CRON_SECRET)' }, { status: 401 })
  if (!process.env.BREVO_API_KEY) return NextResponse.json({ error: 'Missing BREVO_API_KEY' }, { status: 500 })

  const results: any[] = []
  try {
    for (const days of [30, 7]) {
      const dateStr = addDaysUTC(days)
      const { data } = await admin()
        .from('members')
        .select('email,renewal_date')
        .eq('status', 'active')
        .eq('renewal_date', dateStr)
        .not('email', 'is', null)
      const emails = Array.from(new Set((data || []).map((m: any) => (m.email || '').trim().toLowerCase()).filter((e: string) => e.includes('@'))))
      if (!emails.length) { results.push({ days, count: 0 }); continue }

      const body =
        `Your Footcandle Film Society membership renews on ${pretty(dateStr)} — that's ${days} days away.\n\n` +
        `Sign in to your member portal to renew in a minute:\n${SITE_URL}/login\n\n` +
        `Thank you for supporting independent film in Western North Carolina.\n— Footcandle Film Society`
      const id = await queueEmail({
        email_type: 'renewal_reminder',
        recipient_email: emails.join(','),
        subject: `Your Footcandle membership renews in ${days} days`,
        body,
        metadata: { days, count: emails.length, auto: true },
      })
      const sent = await sendQueued(id)
      results.push({ days, sent })
    }
    return NextResponse.json({ ok: true, results })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed', results }, { status: 500 })
  }
}
