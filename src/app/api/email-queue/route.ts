// Admin-only: edit or delete a queued email (service role). Only drafts can
// be edited — a sent email is locked.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON } from '@/lib/supabaseConfig'
import { admin } from '@/lib/email'
import { isAdmin } from '@/lib/admin'

const EDITABLE = ['subject', 'body', 'recipient_filter', 'recipient_email'] as const

async function requireAdmin(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await createClient(SUPABASE_URL, SUPABASE_ANON).auth.getUser(token)
  return data.user && isAdmin(data.user.email) ? data.user : null
}
function guard() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ? null : NextResponse.json({ error: 'Missing SUPABASE_SERVICE_ROLE_KEY' }, { status: 500 })
}

export async function PATCH(req: NextRequest) {
  const g = guard(); if (g) return g
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const { id, updates } = await req.json().catch(() => ({}))
  if (!id || !updates) return NextResponse.json({ error: 'id and updates required' }, { status: 400 })

  const { data: row } = await admin().from('email_queue').select('status').eq('id', id).maybeSingle()
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (row.status === 'sent') return NextResponse.json({ error: 'This email has already been sent and can’t be edited.' }, { status: 400 })

  const clean: Record<string, any> = { updated_at: new Date().toISOString() }
  for (const k of EDITABLE) if (k in updates) clean[k] = updates[k]
  const { data, error } = await admin().from('email_queue').update(clean).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ email: data })
}

export async function DELETE(req: NextRequest) {
  const g = guard(); if (g) return g
  if (!(await requireAdmin(req))) return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const { error } = await admin().from('email_queue').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
