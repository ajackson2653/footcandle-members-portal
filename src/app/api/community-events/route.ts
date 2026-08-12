// ════════════════════════════════════════════════════════════════════
// Admin community-events writes — server-side, service-role, same pattern
// as /api/members. Public reads use the anon read policy; create/update/
// delete route through here and require a logged-in session.
// Requires env var SUPABASE_SERVICE_ROLE_KEY.
// ════════════════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

const EDITABLE = [
  'title', 'description', 'poster_url', 'event_date', 'event_time',
  'venue', 'location_city', 'address', 'host_org', 'link_url', 'published',
] as const

function admin() {
  return createClient(SUPABASE_URL, SERVICE!, { auth: { persistSession: false } })
}

async function requireUser(req: NextRequest) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!token) return null
  const { data } = await createClient(SUPABASE_URL, ANON).auth.getUser(token)
  return data.user
}

function clean(input: Record<string, any>) {
  const out: Record<string, any> = {}
  for (const k of EDITABLE) if (k in input) out[k] = input[k] === '' ? null : input[k]
  return out
}

function guard() {
  if (!SERVICE) {
    return NextResponse.json(
      { error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel → Settings → Environment Variables, then redeploy.' },
      { status: 500 },
    )
  }
  return null
}

export async function POST(req: NextRequest) {
  const g = guard(); if (g) return g
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { event } = await req.json().catch(() => ({}))
  if (!event?.title || !event?.event_date) return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 })
  const { data, error } = await admin().from('community_events').insert(clean(event)).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ event: data })
}

export async function PATCH(req: NextRequest) {
  const g = guard(); if (g) return g
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const { id, updates } = await req.json().catch(() => ({}))
  if (!id || !updates) return NextResponse.json({ error: 'id and updates are required' }, { status: 400 })
  const { data, error } = await admin().from('community_events').update(clean(updates)).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ event: data })
}

export async function DELETE(req: NextRequest) {
  const g = guard(); if (g) return g
  if (!(await requireUser(req))) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
  const { error } = await admin().from('community_events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ ok: true })
}
