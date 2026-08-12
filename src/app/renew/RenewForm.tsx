'use client'

import { useState } from 'react'
import Link from 'next/link'

type Member = { full_name: string; email: string | null; membership_type: string | null; renewal_date: string | null; status: string | null }
type Tier = 'regular' | 'student'
type Mode = 'subscription' | 'payment'

const TIERS: { id: Tier; label: string; price: string; note: string }[] = [
  { id: 'regular', label: 'Regular', price: '$50', note: 'per person / year' },
  { id: 'student', label: 'Student', price: '$25', note: 'per year' },
]

function fmt(s: string | null) {
  if (!s) return null
  const d = new Date(s.slice(0, 10) + 'T00:00:00Z')
  return isNaN(d.getTime()) ? null : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
}

export default function RenewForm({ token, canceled, member }: { token: string; canceled: boolean; member: Member | null }) {
  const [tier, setTier] = useState<Tier>('regular')
  const [mode, setMode] = useState<Mode>('subscription')
  const [email, setEmail] = useState(member?.email || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function checkout() {
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email.'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, tier, mode }),
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
    <div style={{ background: '#0a0a0f', color: '#f4f4f6', minHeight: '100vh' }}>
      <div style={{ maxWidth: 620, margin: '0 auto', padding: '28px 24px 64px' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontWeight: 800, letterSpacing: '0.14em', fontSize: 14, color: '#f4f4f6' }}>FOOTCANDLE</span>
          <span style={{ color: '#f0b429', fontWeight: 800, letterSpacing: '0.14em', fontSize: 14 }}> FILM SOCIETY</span>
        </Link>

        <h1 style={{ fontSize: 34, fontWeight: 800, marginTop: 36, letterSpacing: '-0.02em' }}>
          {member ? `Welcome back, ${member.full_name.split(' ')[0]}.` : 'Join or renew your membership'}
        </h1>
        {member && renewalStr && (
          <p style={{ marginTop: 10, color: '#b8b8c6' }}>
            Your membership {member.status === 'expired' ? 'expired' : 'is set to renew'} on <b style={{ color: '#f0b429' }}>{renewalStr}</b>. Renewing adds another year.
          </p>
        )}
        {!member && <p style={{ marginTop: 10, color: '#b8b8c6' }}>Support independent film in Western North Carolina. Enter your email and choose a membership below.</p>}

        {canceled && <div style={{ marginTop: 20, padding: '12px 14px', borderRadius: 8, background: 'rgba(224,133,53,0.12)', color: '#f0b429', fontSize: 14 }}>Checkout canceled — no charge was made. You can try again below.</div>}

        {/* Tier */}
        <h2 style={label}>Membership</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {TIERS.map((t) => (
            <button key={t.id} onClick={() => setTier(t.id)} style={{ ...tierCard, ...(tier === t.id ? tierActive : {}) }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>{t.label}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#f0b429', marginTop: 4 }}>{t.price}</div>
              <div style={{ fontSize: 12, color: '#9a9aa8' }}>{t.note}</div>
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: '#7a7a88', marginTop: 10 }}>Founders memberships are complimentary — no payment needed. Contact info@footcandle.org.</p>

        {/* Mode */}
        <h2 style={label}>Billing</h2>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button onClick={() => setMode('subscription')} style={{ ...modeCard, ...(mode === 'subscription' ? tierActive : {}) }}>
            <div style={{ fontWeight: 700 }}>Auto-renew yearly</div>
            <div style={{ fontSize: 12.5, color: '#9a9aa8', marginTop: 3 }}>Renews automatically each year. Cancel anytime.</div>
          </button>
          <button onClick={() => setMode('payment')} style={{ ...modeCard, ...(mode === 'payment' ? tierActive : {}) }}>
            <div style={{ fontWeight: 700 }}>One-time (one year)</div>
            <div style={{ fontSize: 12.5, color: '#9a9aa8', marginTop: 3 }}>Pay for a single year, no auto-charge.</div>
          </button>
        </div>

        {/* Email */}
        <h2 style={label}>Email</h2>
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={input} />

        {error && <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 8, background: 'rgba(224,80,80,0.14)', color: '#ff9b9b', fontSize: 14 }}>{error}</div>}

        <button onClick={checkout} disabled={loading} style={{ ...cta, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Redirecting to secure checkout…' : 'Continue to secure checkout'}
        </button>
        <p style={{ fontSize: 12, color: '#6f6f7c', marginTop: 14, textAlign: 'center' }}>Payments are processed securely by Stripe. Footcandle never sees your card details.</p>
      </div>
    </div>
  )
}

const label: React.CSSProperties = { fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#9a9aa8', margin: '32px 0 12px' }
const tierCard: React.CSSProperties = { flex: '1 1 160px', textAlign: 'left', background: '#15151d', border: '1px solid #262633', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', color: '#f4f4f6' }
const modeCard: React.CSSProperties = { flex: '1 1 200px', textAlign: 'left', background: '#15151d', border: '1px solid #262633', borderRadius: 12, padding: '14px 16px', cursor: 'pointer', color: '#f4f4f6' }
const tierActive: React.CSSProperties = { borderColor: '#f0b429', background: 'rgba(240,180,41,0.10)' }
const input: React.CSSProperties = { width: '100%', padding: '12px 14px', borderRadius: 8, border: '1px solid #333341', background: '#101017', color: '#f4f4f6', fontSize: 15, fontFamily: 'inherit' }
const cta: React.CSSProperties = { width: '100%', marginTop: 24, padding: '14px', background: '#f0b429', color: '#1a1200', fontWeight: 800, fontSize: 16, border: 'none', borderRadius: 10, cursor: 'pointer' }
