'use client'

import { useState } from 'react'
import { signInWithPassword, signUpWithPassword, signInWithMagicLink } from '@/lib/supabase'

// Login offers both: a password (sign in or create one) AND a passwordless
// "email me a sign-in link" option — which also serves as the forgot-password
// fallback. Kept large and plain for less tech-savvy members.
export default function LoginPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [linkSent, setLinkSent] = useState(false)

  // After sign-in, return to ?next= if it's a safe in-app path.
  function destination() {
    const n = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('next') : null
    return n && n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard'
  }

  const handlePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setNotice(''); setLoading(true)
    if (mode === 'signup') {
      const { data, error } = await signUpWithPassword(email.trim(), password)
      setLoading(false)
      if (error) { setError(error.message); return }
      if (data.session) { window.location.href = destination(); return }
      setNotice('Almost done — check your email to confirm your account, then come back and sign in.')
    } else {
      const { error } = await signInWithPassword(email.trim(), password)
      setLoading(false)
      if (error) { setError('That email and password didn’t match. Try again, choose “Create a password” if you’re new, or use the email sign-in link below.'); return }
      window.location.href = destination()
    }
  }

  const handleMagicLink = async () => {
    setError(''); setNotice('')
    if (!email.includes('@')) { setError('Enter your email above first, then tap the link button.'); return }
    setLoading(true)
    const { error } = await signInWithMagicLink(email.trim())
    setLoading(false)
    if (error) setError(error.message)
    else setLinkSent(true)
  }

  if (linkSent) {
    return (
      <div style={s.container}><div style={s.card}>
        <div style={{ fontSize: 52 }}>✉️</div>
        <h2 style={s.sentTitle}>Check your email</h2>
        <p style={s.sentText}>We sent a sign-in link to<br /><strong>{email}</strong>.</p>
        <p style={s.sentText}>Open that email and tap the link to sign in — no password needed.</p>
        <button onClick={() => setLinkSent(false)} style={s.linkText}>Back to sign in</button>
      </div></div>
    )
  }

  return (
    <div style={s.container}>
      <div style={s.card}>
        <img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ width: '85%', maxWidth: 280, height: 'auto', display: 'block', margin: '0 auto 6px' }} />
        <p style={s.subtitle}>Members</p>

        <form onSubmit={handlePassword}>
          <label style={s.label}>Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required autoFocus style={s.input} disabled={loading} />

          <label style={s.label}>{mode === 'signup' ? 'Choose a password' : 'Password'}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'} required minLength={6} style={s.input} disabled={loading} />

          {error && <p style={s.error}>{error}</p>}
          {notice && <p style={s.notice}>{notice}</p>}

          <button type="submit" disabled={loading} style={{ ...s.button, opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Please wait…' : mode === 'signup' ? 'Create my account' : 'Sign In'}
          </button>
        </form>

        <p style={s.toggle}>
          {mode === 'signin' ? (
            <>First time here? <button onClick={() => { setMode('signup'); setError(''); setNotice('') }} style={s.toggleBtn}>Create a password</button></>
          ) : (
            <>Already have a password? <button onClick={() => { setMode('signin'); setError(''); setNotice('') }} style={s.toggleBtn}>Sign in</button></>
          )}
        </p>

        <div style={s.divider}><span style={s.dividerLine} /><span style={s.dividerText}>or</span><span style={s.dividerLine} /></div>

        <button onClick={handleMagicLink} disabled={loading} style={s.linkButton}>
          Email me a sign-in link (no password)
        </button>

        <p style={s.help}>Forgot your password? Use the email link above. Need help? <a href="mailto:info@footcandle.org" style={s.helpLink}>info@footcandle.org</a></p>
      </div>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #2a5680 0%, #1e3f5f 100%)', padding: 20 },
  card: { background: 'white', borderRadius: 16, padding: 40, maxWidth: 460, width: '100%', boxShadow: '0 10px 40px rgba(0,0,0,0.2)', textAlign: 'center' },
  title: { fontSize: 28, fontWeight: 800, marginBottom: 2, color: '#1f2937' },
  subtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  label: { display: 'block', fontSize: 15, fontWeight: 600, margin: '0 0 8px', color: '#1f2937', textAlign: 'left' },
  input: { width: '100%', padding: '15px', border: '2px solid #d1d5db', borderRadius: 10, fontSize: 17, fontFamily: 'inherit', marginBottom: 18 },
  button: { width: '100%', padding: '15px', background: '#2a5680', color: 'white', border: 'none', borderRadius: 10, fontSize: 17, fontWeight: 700, cursor: 'pointer' },
  toggle: { fontSize: 15, color: '#4b5563', marginTop: 18 },
  toggleBtn: { background: 'none', border: 'none', color: '#2a5680', fontWeight: 700, cursor: 'pointer', fontSize: 15, textDecoration: 'underline' },
  divider: { display: 'flex', alignItems: 'center', margin: '22px 0 18px', color: '#9ca3af' },
  dividerLine: { flex: 1, height: 1, background: '#e5e7eb' },
  dividerText: { flex: 'none', padding: '0 12px', fontSize: 14 },
  linkButton: { width: '100%', padding: '14px', background: 'white', color: '#2a5680', border: '2px solid #2a5680', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer' },
  linkText: { background: 'none', border: 'none', color: '#2a5680', fontSize: 16, fontWeight: 600, cursor: 'pointer', marginTop: 12, textDecoration: 'underline' },
  error: { color: '#dc2626', fontSize: 15, marginBottom: 14, padding: 12, background: '#fee2e2', borderRadius: 8, textAlign: 'left', lineHeight: 1.5 },
  notice: { color: '#065f46', fontSize: 15, marginBottom: 14, padding: 12, background: '#d1fae5', borderRadius: 8, textAlign: 'left', lineHeight: 1.5 },
  help: { fontSize: 14, color: '#6b7280', marginTop: 22, lineHeight: 1.5 },
  helpLink: { color: '#2a5680', fontWeight: 600 },
  sentTitle: { fontSize: 24, fontWeight: 800, color: '#1f2937', margin: '8px 0 14px' },
  sentText: { fontSize: 17, color: '#374151', lineHeight: 1.6, marginBottom: 14 },
}

// horizontal rule lines around "or"
