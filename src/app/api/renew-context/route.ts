// Resolve a signed renewal token (?t=) to the member it belongs to, so the
// /renew page can identify someone from an email link WITHOUT a login.
import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from '@/lib/renewToken'
import { admin } from '@/lib/email'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: 'Server not configured.' }, { status: 500 })
  const t = new URL(req.url).searchParams.get('t')
  const id = verifyToken(t)
  if (!id) return NextResponse.json({ error: 'This renewal link is invalid or expired.' }, { status: 401 })
  const { data } = await admin().from('members').select('email,full_name,membership_type,renewal_date,status').eq('id', id).maybeSingle()
  if (!data?.email) return NextResponse.json({ error: 'We could not find that membership.' }, { status: 404 })
  return NextResponse.json({ email: data.email, member: data })
}
