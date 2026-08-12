// Member-facing renewal / join page. Verifies the signed ?t= token from a
// renewal email (server-side) to greet the member and prefill their email;
// otherwise anyone can renew by entering their email.
import { verifyToken } from '@/lib/renewToken'
import RenewForm from './RenewForm'

export const dynamic = 'force-dynamic'

type Member = { full_name: string; email: string | null; membership_type: string | null; renewal_date: string | null; status: string | null }

async function lookup(token?: string): Promise<Member | null> {
  const id = verifyToken(token)
  if (!id || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  try {
    const { admin } = await import('@/lib/email')
    const { data } = await admin().from('members').select('full_name,email,membership_type,renewal_date,status').eq('id', id).maybeSingle()
    return (data as Member) || null
  } catch {
    return null
  }
}

export default async function RenewPage({ searchParams }: { searchParams: { t?: string; canceled?: string } }) {
  const token = typeof searchParams.t === 'string' ? searchParams.t : ''
  const member = await lookup(token)
  return <RenewForm token={token} canceled={searchParams.canceled === '1'} member={member} />
}
