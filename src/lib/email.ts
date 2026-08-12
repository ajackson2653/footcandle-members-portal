// ════════════════════════════════════════════════════════════════════
// Shared email sending (Brevo) — used by /api/send-email (user-triggered)
// and the cron routes (system-triggered digest + reminders). Server-only.
// Requires SUPABASE_SERVICE_ROLE_KEY + BREVO_API_KEY.
// ════════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '@/lib/supabaseConfig'

const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY
const BREVO_API_KEY = process.env.BREVO_API_KEY
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL || 'info@footcandle.org'
const SENDER_NAME = process.env.BREVO_SENDER_NAME || 'Footcandle Film Society'
const BATCH = 500

export function admin() {
  if (!SERVICE) throw new Error('Server is missing SUPABASE_SERVICE_ROLE_KEY.')
  return createClient(SUPABASE_URL, SERVICE, { auth: { persistSession: false } })
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function chunk<T>(arr: T[], n: number) {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function resolveRecipients(row: any): Promise<string[]> {
  const explicit = (row.recipient_email || '')
    .split(/[,;]/).map((s: string) => s.trim().toLowerCase()).filter((s: string) => s.includes('@'))
  let list: string[] = explicit
  if (!list.length) {
    const f = row.recipient_filter || 'all_members'
    let q = admin().from('members').select('email').not('email', 'is', null)
    if (f === 'all_active') q = q.eq('status', 'active')
    else if (f === 'all_expired') q = q.eq('status', 'expired')
    const { data } = await q
    list = (data || []).map((m: any) => (m.email || '').trim().toLowerCase()).filter((e: string) => e.includes('@'))
  }
  return Array.from(new Set(list))
}

// Insert a queued email and return its id.
export async function queueEmail(fields: {
  email_type: string; subject: string; body: string; html_body?: string
  recipient_email?: string; recipient_filter?: string; metadata?: any
}): Promise<string> {
  const { data, error } = await admin().from('email_queue').insert({ status: 'draft', ...fields }).select('id').single()
  if (error) throw new Error(error.message)
  return data.id as string
}

// Send an already-queued email via Brevo; marks it sent/failed. Returns count.
export async function sendQueued(id: string): Promise<number> {
  if (!BREVO_API_KEY) throw new Error('Server is missing BREVO_API_KEY.')
  const { data: row, error } = await admin().from('email_queue').select('*').eq('id', id).single()
  if (error || !row) throw new Error('Email not found')
  if (row.status === 'sent') throw new Error('Already sent')

  const recipients = await resolveRecipients(row)
  if (!recipients.length) throw new Error('No valid recipients for this email')

  const htmlContent = row.html_body ||
    `<div style="font-family:sans-serif;font-size:15px;line-height:1.6;color:#222">${escapeHtml(row.body || '').replace(/\n/g, '<br>')}</div>`
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
      throw new Error(`Brevo error (${res.status}) after ${sent} sent: ${detail}`)
    }
    sent += group.length
  }
  await admin().from('email_queue').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('id', id)
  return sent
}
