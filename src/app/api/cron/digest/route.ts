// ════════════════════════════════════════════════════════════════════
// Scheduled: monthly digest of upcoming events + announcements.
// Vercel Cron runs this every Tuesday; the handler only sends on the FIRST
// Tuesday of the month (date <= 7). Protected by CRON_SECRET.
// Pass ?force=1 (with the CRON_SECRET header) to send on demand for testing.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { admin, queueEmail, sendQueued } from '@/lib/email'

function authorized(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  return (req.headers.get('authorization') || '') === `Bearer ${secret}`
}
function today() { return new Date().toISOString().slice(0, 10) }
function inDaysUTC(n: number) { const d = new Date(); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
function pretty(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  return `${day} at ${((+h + 11) % 12) + 1}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) return NextResponse.json({ error: 'Unauthorized (set CRON_SECRET)' }, { status: 401 })
  if (!process.env.BREVO_API_KEY) return NextResponse.json({ error: 'Missing BREVO_API_KEY' }, { status: 500 })

  const force = new URL(req.url).searchParams.get('force') === '1'
  const now = new Date()
  const isFirstTuesday = now.getUTCDay() === 2 && now.getUTCDate() <= 7
  if (!isFirstTuesday && !force) return NextResponse.json({ ok: true, skipped: 'not the first Tuesday' })

  try {
    const windowEnd = inDaysUTC(60)

    // Film Society screenings in the next 60 days
    const { data: fs } = await admin()
      .from('film_screenings')
      .select('title,screening_dates(screening_date,screening_time,venue,location_city)')
      .eq('published', true)
    const ffs: string[] = []
    for (const f of (fs as any[]) || []) {
      for (const d of f.screening_dates || []) {
        if (d.screening_date >= today() && d.screening_date <= windowEnd) {
          ffs.push(`• ${f.title} — ${pretty(d.screening_date, d.screening_time)}${d.venue ? `, ${d.venue}` : ''}${d.location_city ? ` (${d.location_city})` : ''}`)
        }
      }
    }
    ffs.sort()

    // Community events in the next 60 days
    const { data: ce } = await admin()
      .from('community_events')
      .select('title,event_date,event_time,venue,location_city,host_org')
      .eq('published', true).gte('event_date', today()).lte('event_date', windowEnd).order('event_date')
    const community = ((ce as any[]) || []).map((e) => `• ${e.title} — ${pretty(e.event_date, e.event_time)}${e.venue ? `, ${e.venue}` : ''}${e.host_org ? ` (${e.host_org})` : ''}`)

    // Recent announcements
    const { data: notes } = await admin()
      .from('admin_notes')
      .select('body,created_at').eq('published', true).order('created_at', { ascending: false }).limit(3)
    const announcements = ((notes as any[]) || []).map((n) => `• ${String(n.body).replace(/\s+/g, ' ').slice(0, 200)}`)

    const parts: string[] = [`Here's what's coming up at Footcandle Film Society.`, '']
    parts.push('OUR SCREENINGS', ffs.length ? ffs.join('\n') : '• No Film Society screenings scheduled yet — stay tuned.', '')
    parts.push('AROUND THE AREA', community.length ? community.join('\n') : '• No community events listed right now.', '')
    if (announcements.length) parts.push('ANNOUNCEMENTS', announcements.join('\n'), '')
    parts.push('You like movies. So do we.', '— Footcandle Film Society')
    const body = parts.join('\n')

    const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    const id = await queueEmail({
      email_type: 'monthly_digest',
      recipient_filter: 'all_active',
      subject: `Footcandle Film Society — ${monthName}`,
      body,
      metadata: { auto: true, ffs: ffs.length, community: community.length },
    })
    const sent = await sendQueued(id)
    return NextResponse.json({ ok: true, sent, screenings: ffs.length, community: community.length })
  } catch (e) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : 'failed' }, { status: 500 })
  }
}
