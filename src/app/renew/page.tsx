'use client'

// Renewal / payment. Two ways in:
//  1. A signed renewal link (?t=…) from an email — identifies the member with
//     no login required.
//  2. A logged-in session (from inside the portal).
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import RenewForm from './RenewForm'

type Member = { full_name: string; email: string | null; membership_type: string | null; renewal_date: string | null; status: string | null }

export default function RenewPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [canceled, setCanceled] = useState(false)

  useEffect(() => {
    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      setCanceled(params.get('canceled') === '1')
      const t = params.get('t')

      // 1) Signed renewal link — no login needed.
      if (t) {
        try {
          const res = await fetch(`/api/renew-context?t=${encodeURIComponent(t)}`)
          if (res.ok) {
            const json = await res.json()
            setToken(t)
            setEmail(json.email)
            setMember(json.member)
            setLoading(false)
            return
          }
        } catch { /* fall through to session */ }
      }

      // 2) Logged-in session.
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
  return <RenewForm email={email} token={token} canceled={canceled} member={member} />
}
