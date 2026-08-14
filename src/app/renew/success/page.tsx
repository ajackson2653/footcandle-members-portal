// Post-checkout thank-you. The Stripe webhook does the real work (updating
// the member + sending the confirmation email); this page just reassures.
import Link from 'next/link'

export default function RenewSuccess() {
  return (
    <div style={{ background: '#f7f9fc', color: '#1f2937', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ width: 260, maxWidth: '80%', height: 'auto', display: 'block', margin: '0 auto 24px' }} />
        <div style={{ fontSize: 44 }}>🎬</div>
        <h1 style={{ fontSize: 30, fontWeight: 800, marginTop: 8, letterSpacing: '-0.02em' }}>You're all set — thank you!</h1>
        <p style={{ marginTop: 14, color: '#4b5563', lineHeight: 1.6 }}>
          Your Footcandle Film Society membership is confirmed. A confirmation email is on its way with your new renewal date.
          We can't wait to see you at the movies.
        </p>
        <p style={{ marginTop: 10, color: '#5b6472', fontSize: 14 }}>You like movies. So do we.</p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 26, background: '#2a5680', color: '#fff', fontWeight: 700, padding: '12px 24px', borderRadius: 8, textDecoration: 'none' }}>Back to Footcandle</Link>
      </div>
    </div>
  )
}
