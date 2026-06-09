'use client'

import { useState } from 'react'
import { signInWithMagicLink } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await signInWithMagicLink(email)
    
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Footcandle Film Society</h1>
        <p style={styles.subtitle}>Members Portal</p>

        {sent ? (
          <div style={styles.success}>
            <p style={styles.checkmark}>✓</p>
            <h2>Check your email!</h2>
            <p>We've sent a magic link to <strong>{email}</strong></p>
            <p style={styles.small}>Click the link to log in to your membership account.</p>
          </div>
        ) : (
          <>
            <p style={styles.description}>
              Sign in with your email to view your membership status, attendance history, and upcoming screenings.
            </p>

            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  style={styles.input}
                  disabled={loading}
                />
              </div>

              {error && <p style={styles.error}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.6 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>

            <p style={styles.help}>
              We'll send you a secure link to log in. No password needed!
            </p>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    textAlign: 'center' as const,
    marginBottom: '4px',
    color: '#1f2937'
  },
  subtitle: {
    fontSize: '14px',
    color: '#6b7280',
    textAlign: 'center' as const,
    marginBottom: '24px'
  },
  description: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '24px',
    lineHeight: '1.6'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '8px',
    color: '#1f2937'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  button: {
    width: '100%',
    padding: '12px',
    background: '#2563eb',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer'
  },
  error: {
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '16px',
    padding: '8px',
    background: '#fee2e2',
    borderRadius: '4px'
  },
  success: {
    textAlign: 'center' as const
  },
  checkmark: {
    fontSize: '48px',
    marginBottom: '16px'
  },
  small: {
    fontSize: '13px',
    color: '#6b7280',
    marginTop: '12px'
  },
  help: {
    fontSize: '12px',
    color: '#9ca3af',
    textAlign: 'center' as const,
    marginTop: '16px'
  }
}
