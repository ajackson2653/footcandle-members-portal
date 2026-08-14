'use client'

import { useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Member = { full_name: string; email: string | null; membership_type: string | null; renewal_date: string | null; status: string | null }
type Tier = 'regular' | 'student'
type Mode = 'subscription' | 'payment'

const BRAND = '#2a5680'
const INK = '#1f2937'
const MUTED = '#5b6472'

const TIERS: { id: Tier; label: string; price: string; note: string }[] = [
  { id: 'regular', label: 'Regular', price: '$50', note: 'per person / year' },
  { id: 'student', label: 'Student', price: '$25', note: 'per year' },
]

function fmt(s: string | null) {
  if (!s) return null
  const d = new Date(s.slice(0, 10) + 'T00:00:00Z')
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function RenewForm({ email, canceled, member }: { email: string; canceled: boolean; member: Member | null }) {
  const [tier, setTier] = useState<Tier>('regular')
  const [mode, setMode] = useState<Mode>('subscription')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkout() {
    setError('')
    setLoading(true)
    try {
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token || ''}` },
        body: JSON.stringify({ tier, mode }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not start checkout')
      window.location.href = json.url
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  const renewalStr = fmt(member?.renewal_date || null)

  return (
    <div style={{ background: '#f7f9fc', color: INK, minHeight: '100vh' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 24px 64px' }}>
        <Link href="/dashboard"><img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ height: 40, width: 'auto', display: 'block' }} /></Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, marginTop: 32, letterSpacing: '-0.02em' }}>
          {member ? `Renew your membership, ${member.full_name.split(' ')[0]}.` : 'Renew your membership'}
        </h1>
        {member && renewalStr && (
          <p style={{ marginTop: 10, color: MUTED }}>
            Your membership {member.status === 'expired' ? 'expired' : 'is set to renew'} on <b style={{ color: BRAND }}>{renewalStr}</b>. Renewing adds another year.
          </p>
        )}

        {canceled && <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 8, background: '#fff4e5', color: '#8a5a00', fontSize: 14 }}>Checkout canceled — no charge was made. You can try again below.</div>}

        <h2 style={label}>Membership</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {TIERS.map((t) => (
            <button key={t.id} onClick={() => setTier(t.id)} style={{ ...tierCard, ...(tier === t.id ? active : {}) }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: BRAND, marginTop: 4 }}>{t.price}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{t.note}</div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: MUTED, marginTop: 10 }}>Founders memberships are complimentary — no payment needed. Contact info@footcandle.org.</p>

        <h2 style={label}>Billing</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setMode('subscription')} style={{ ...modeCard, ...(mode === 'subscription' ? active : {}) }}>
            <div style={{ fontWeight: 700 }}>Auto-renew yearly</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>Renews automatically each year. Cancel anytime.</div>
          </button>
          <button onClick={() => setMode('payment')} style={{ ...modeCard, ...(mode === 'payment' ? active : {}) }}>
            <div style={{ fontWeight: 700 }}>One-time (one year)</div>
            <div style={{ fontSize: 12.5, color: MUTED, marginTop: 3 }}>Pay for a single year, no auto-charge.</div>
          </button>
        </div>

        <p style={{ ...label, marginBottom: 6 }}>Paying as</p>
        <div style={{ padding: '12px 14px', borderRadius: 8, background: '#eef3f8', border: '1px solid #dbe3ec', fontSize: 15, color: INK }}>{email}</div>

        {error && <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: '#fee2e2', color: '#b1281f', fontSize: 14 }}>{error}</div>}

        <button onClick={checkout} disabled={loading} style={{ ...cta, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Redirecting to secure checkout…' : 'Continue to secure checkout'}
        </button>
        <p style={{ fontSize: 12, color: MUTED, marginTop: 14, textAlign: 'center' }}>Payments are processed securely by Stripe. Footcandle never sees your card details.</p>
        <p style={{ marginTop: 18, textAlign: 'center' }}><Link href="/dashboard" style={{ color: BRAND, fontWeight: 600, textDecoration: 'none' }}>← Back to my dashboard</Link></p>
      </div>
    </div>
  )
}

const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: MUTED, margin: '32px 0 12px' }
const tierCard: React.CSSProperties = { flex: '1 1 160px', textAlign: 'left', background: '#fff', border: '1.5px solid #dbe3ec', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', color: INK }
const modeCard: React.CSSProperties = { flex: '1 1 200px', textAlign: 'left', background: '#fff', border: '1.5px solid #dbe3ec', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', color: INK }
const active: React.CSSProperties = { borderColor: BRAND, background: '#eef3f8', boxShadow: `0 0 0 1px ${BRAND}` }
const cta: React.CSSProperties = { width: '100%', marginTop: 24, padding: '15px', background: BRAND, color: '#fff', fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 10, cursor: 'pointer' }
