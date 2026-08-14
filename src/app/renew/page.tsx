'use client'

// Renewal / payment — only from inside the portal. Requires a logged-in
// session; the member is identified by their session email (no email entry).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RenewForm from './RenewForm'

type Member = { full_name: string; email: string | null; membership_type: string | null; renewal_date: string | null; status: string | null }

export default function RenewPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    ;(async () => {
      setCanceled(new URLSearchParams(window.location.search).get('canceled') === '1')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { window.location.href = '/login?next=/renew'; return }
      setEmail(user.email || '')
      const { data } = await supabase
        .from('members')
        .select('full_name,email,membership_type,renewal_date,status')
        .eq('email', user.email)
        .order('renewal_date', { ascending: false })
      setMember((data && (data[0] as Member)) || null)
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5b6472', fontSize: 18, background: '#f7f9fc' }}>Loading…</div>
  }
  return <RenewForm email={email} canceled={canceled} member={member} />
}
