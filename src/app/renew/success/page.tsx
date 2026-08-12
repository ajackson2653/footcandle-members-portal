// Post-checkout thank-you. The Stripe webhook does the real work (updating
// the member + sending the confirmation email); this page just reassures.
import Link from 'next/link'

export default function RenewSuccess() {
  return (
    <div style={{ background: '#0a0a0f', color: '#f4f4f6', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>🎬</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 12, letterSpacing: '-0.02em' }}>You're all set — thank you!</h1>
        <p style={{ marginTop: 14, color: '#b8b8c6', lineHeight: 1.6 }}>
          Your Footcandle Film Society membership is confirmed. A confirmation email is on its way with your new renewal date.
          We can't wait to see you at the movies.
        </p>
        <p style={{ marginTop: 10, color: '#7a7a88', fontSize: 14 }}>You like movies. So do we.</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 26, background: '#f0b429', color: '#1a1200', fontWeight: 700, padding: '12px 22px', borderRadius: 8, textDecoration: 'none' }}>Back to Footcandle</Link>
      </div>
    </div>
  )
}
