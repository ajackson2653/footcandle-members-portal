// ════════════════════════════════════════════════════════════════════
// Send a queued email via Brevo (transactional API). Server-side only.
// Requires SUPABASE_SERVICE_ROLE_KEY (read recipients + mark sent) and
// BREVO_API_KEY. Optional: BREVO_SENDER_EMAIL, BREVO_SENDER_NAME.
// Recipients are sent as individual messageVersions so they never see
// each other. Triggered by an admin clicking "Send" on a draft.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const BREVO_API_KEY = process.env.BREVO_API_KEY
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'info@footcandle.org'
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Footcandle Film Society'
const BATCH = 500

function admin() {
  return createClient(SUPABASE_URL, SERVICE!, { auth: { persistSession: false } })
}
async function requireUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await createClient(SUPABASE_URL, ANON).auth.getUser(token)
  return data.user
}
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function chunk<T>(arr: T[], n: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

async function resolveRecipients(row: any): Promise<string[]> {
  const explicit = (row.recipient_email || '').split(/[,;]/).map((s: string) => s.trim().toLowerCase()).filter((s: string) => s.includes('@'))
  let list = explicit
  if (!list.length) {
    const f = row.recipient_filter || 'all_members'
    let q = admin().from('members').select('email')
    if (f === 'all_active') q = q.eq('status', 'active')
    else if (f === 'all_expired') q = q.eq('status', 'expired')
    const { data } = await q
    list = (data || []).map((m: any) => (m.email || '').trim().toLowerCase()).filter((e: string) => e.includes('@'))
  }
  return Array.from(new Set(list))
}

export async function POST(req: NextRequest) {
  if (!SERVICE) return NextResponse.json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 })
  if (!BREVO_API_KEY) return NextResponse.json({ error: 'Server is missing BREVO_API_KEY. Add it in Vercel → Settings → Environment Variables, then redeploy.' }, { status: 500 })
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { id } = await req.json().catch(() => ({}))
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const { data: row, error } = await admin().from('email_queue').select('*').eq('id', id).single()
  if (error || !row) return NextResponse.json({ error: 'Email not found' }, { status: 404 })
  if (row.status === 'sent') return NextResponse.json({ error: 'Already sent' }, { status: 400 })

  const recipients = await resolveRecipients(row)
  if (!recipients.length) return NextResponse.json({ error: 'No valid recipients for this email' }, { status: 400 })

  const htmlContent = row.html_body || `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222">${esc(row.body || '').replace(/\n/g, '<br>')}</div>`
  const textContent = row.body || ''

  let sent = 0
  for (const group of chunk(recipients, BATCH)) {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': BREVO_API_KEY, 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({
        sender: { name: SENDER_NAME, email: SENDER_EMAIL },
        subject: row.subject,
        htmlContent,
        textContent,
        messageVersions: group.map((email) => ({ to: [{ email }] })),
      }),
    })
    if (!res.ok) {
      const detail = await res.text()
      await admin().from('email_queue').update({ status: 'failed' }).eq('id', id)
      return NextResponse.json({ error: `Brevo error (${res.status}) after ${sent} sent: ${detail}` }, { status: 502 })
    }
    sent += group.length
  }

  await admin().from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true, sent })
}
