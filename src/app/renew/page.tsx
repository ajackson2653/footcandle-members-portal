'use client'

// Renewal / payment. Two ways in:
//  1. A signed renewal link (?t=…) from an email — identifies the member with
//     no login required.
//  2. A logged-in session (from inside the portal).
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import RenewForm from './RenewForm'

type Member = { full_name: string; email: string | null; membership_type: string | null; renewal_date: string | null; status: string | null }

export default function RenewPage() {
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [canceled, setCanceled] = useState(false)
  const [linkError, setLinkError] = useState('')

  useEffect(() => {
    ;(async () => {
      const params = new URLSearchParams(window.location.search)
      setCanceled(params.get('canceled') === '1')
      const t = params.get('t')

      // 1) Signed renewal link — no login needed.
      if (t) {
        try {
          const res = await fetch(`/api/renew-context?t=${encodeURIComponent(t)}`)
          const json = await res.json().catch(() => ({}))
          if (res.ok && json.email) {
            setToken(t); setEmail(json.email); setMember(json.member); setLoading(false); return
          }
          // Token present but didn't verify — DON'T dump them at a login wall.
          setLinkError(json.error || 'This renewal link didn’t work.'); setLoading(false); return
        } catch {
          setLinkError('This renewal link didn’t work. Please try again.'); setLoading(false); return
        }
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

  if (linkError) {
    return (
      <div style={{ background: '#f7f9fc', color: '#1f2937', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ maxWidth: 520, textAlign: 'center' }}>
          <img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ width: 260, maxWidth: '80%', height: 'auto', display: 'block', margin: '0 auto 24px' }} />
          <h1 style={{ fontSize: 26, fontWeight: 800 }}>We couldn’t open your renewal link</h1>
          <p style={{ marginTop: 14, color: '#4b5563', lineHeight: 1.6 }}>
            Sorry about that — the link may have expired. We’d be glad to help you renew right away. Just email us at{' '}
            <a href="mailto:info@footcandle.org" style={{ color: '#2a5680', fontWeight: 600 }}>info@footcandle.org</a> or call and we’ll take care of it.
          </p>
          <p style={{ marginTop: 12, color: '#4b5563' }}>
            If you have an account, you can also <Link href="/login" style={{ color: '#2a5680', fontWeight: 600 }}>sign in here</Link>.
          </p>
          <Link href="/" style={{ display: 'inline-block', marginTop: 26, background: '#2a5680', color: '#fff', fontWeight: 700, padding: '12px 24px', borderRadius: 8, textDecoration: 'none' }}>Back to Footcandle</Link>
        </div>
      </div>
    )
  }

  return <RenewForm email={email} token={token} canceled={canceled} member={member} />
}
