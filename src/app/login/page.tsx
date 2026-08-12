'use client'

import { useState } from 'react'
import { signInWithMagicLink } from '@/lib/supabase'

// Passwordless login: members type their email and get a one-click sign-in
// link. No password to remember — the single biggest ease-of-use win for our
// older, less tech-savvy members.
export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signInWithMagicLink(email.trim())
    setLoading(false)
    if (error) setError(error.message)
    else setSent(true)
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Footcandle Film Society</h1>
        <p style={styles.subtitle}>Members</p>

        {sent ? (
          <div>
            <div style={styles.checkIcon}>✉️</div>
            <h2 style={styles.sentTitle}>Check your email</h2>
            <p style={styles.sentText}>
              We just sent a sign-in link to<br /><strong>{email}</strong>.
            </p>
            <p style={styles.sentText}>Open that email and tap the link to sign in. That's it — no password needed.</p>
            <button onClick={() => { setSent(false); setEmail('') }} style={styles.linkButton}>
              Use a different email
            </button>
          </div>
        ) : (
          <>
            <p style={styles.description}>
              Enter your email and we'll send you a link to sign in.
              <br /><strong>No password needed.</strong>
            </p>
            <form onSubmit={handleSubmit}>
              <label style={styles.label}>Your email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoFocus
                style={styles.input}
                disabled={loading}
              />
              {error && <p style={styles.error}>{error}</p>}
              <button type="submit" disabled={loading} style={{ ...styles.button, opacity: loading ? 0.6 : 1 }}>
                {loading ? 'Sending…' : 'Email me a sign-in link'}
              </button>
            </form>
            <p style={styles.help}>
              Need help? Email us at <a href="mailto:info@footcandle.org" style={styles.helpLink}>info@footcandle.org</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20 },
  card: { background: 'white', borderRadius: 16, padding: 40, maxWidth: 460, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  title: { fontSize: 30, fontWeight: 800, marginBottom: 2, color: '#1f2937' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 28 },
  description: { fontSize: 18, color: '#374151', marginBottom: 28, lineHeight: 1.6 },
  label: { display: 'block', fontSize: 16, fontWeight: 600, marginBottom: 10, color: '#1f2937', textAlign: 'left' },
  input: { width: '100%', padding: '16px', border: '2px solid #d1d5db', borderRadius: 10, fontSize: 18, fontFamily: 'inherit', marginBottom: 20 },
  button: { width: '100%', padding: '16px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: 18, fontWeight: 700, cursor: 'pointer' },
  error: { color: '#dc2626', fontSize: 15, marginBottom: 16, padding: 12, background: '#fee2e2', borderRadius: 8, textAlign: 'left' },
  help: { fontSize: 15, color: '#6b7280', marginTop: 24, lineHeight: 1.5 },
  helpLink: { color: '#2563eb', fontWeight: 600 },
  checkIcon: { fontSize: 52, marginBottom: 8 },
  sentTitle: { fontSize: 24, fontWeight: 800, color: '#1f2937', marginBottom: 14 },
  sentText: { fontSize: 18, color: '#374151', lineHeight: 1.6, marginBottom: 16 },
  linkButton: { background: 'none', border: 'none', color: '#2563eb', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 8, textDecoration: 'underline' },
}
