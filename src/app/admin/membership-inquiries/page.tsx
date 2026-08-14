'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Check, Mail, RefreshCw } from 'lucide-react'

type Inquiry = { id: string; name: string; email: string; message: string | null; handled: boolean; created_at: string }

export default function MembershipInquiriesAdmin() {
  const [items, setItems] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    ;(async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { window.location.href = '/login'; return }
      await load()
    })()
  }, [])

  async function token() {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token || ''
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/membership-inquiries', { headers: { Authorization: `Bearer ${await token()}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Could not load')
      setItems(json.inquiries || [])
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Could not load — has supabase/membership-interest.sql been run?')
    } finally {
      setLoading(false)
    }
  }

  async function toggleHandled(it: Inquiry) {
    try {
      const res = await fetch('/api/membership-inquiries', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({ id: it.id, handled: !it.handled }),
      })
      if (!res.ok) throw new Error()
      setItems((p) => p.map((x) => (x.id === it.id ? { ...x, handled: !x.handled } : x)))
    } catch {
      setMsg('Could not update.')
    }
  }

  const open = items.filter((i) => !i.handled)
  const done = items.filter((i) => i.handled)

  if (loading) return <div style={s.loading}>Loading inquiries…</div>

  return (
    <div style={s.container}>
      <header style={s.header}>
        <Link href="/admin" style={s.backLink}><ArrowLeft size={20} /> Back to Admin</Link>
        <h1 style={{ fontSize: 22 }}>Membership Inquiries</h1>
        <button onClick={load} style={s.refresh} title="Reload"><RefreshCw size={16} /></button>
      </header>
      <main style={s.main}>
        <p style={s.intro}>People who submitted interest on the public “Become a Member” page. Reach out to onboard them, then mark handled.</p>
        {msg && <div style={s.error}>{msg}</div>}

        <h2 style={s.sectionTitle}>New ({open.length})</h2>
        {open.length === 0 ? <div style={s.empty}>No new inquiries.</div> : open.map((it) => <Row key={it.id} it={it} onToggle={toggleHandled} />)}

        {done.length > 0 && <>
          <h2 style={{ ...s.sectionTitle, marginTop: 28, opacity: 0.7 }}>Handled ({done.length})</h2>
          {done.map((it) => <Row key={it.id} it={it} onToggle={toggleHandled} muted />)}
        </>}
      </main>
    </div>
  )
}

function Row({ it, onToggle, muted }: { it: Inquiry; onToggle: (i: Inquiry) => void; muted?: boolean }) {
  return (
    <div style={{ ...s.row, opacity: muted ? 0.65 : 1 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: '#1f2937' }}>{it.name}</div>
        <a href={`mailto:${it.email}`} style={{ color: '#2a5680', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}><Mail size={13} /> {it.email}</a>
        {it.message && <p style={{ marginTop: 6, color: '#4b5563', fontSize: 14 }}>{it.message}</p>}
        <p style={{ marginTop: 4, color: '#9ca3af', fontSize: 12 }}>{new Date(it.created_at).toLocaleString()}</p>
      </div>
      <button onClick={() => onToggle(it)} style={{ ...s.handleBtn, ...(it.handled ? s.handledBtn : {}) }}>
        <Check size={15} /> {it.handled ? 'Handled' : 'Mark handled'}
      </button>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f9fafb' },
  header: { background: 'linear-gradient(135deg, #2a5680 0%, #1e3f5f 100%)', color: 'white', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  backLink: { display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none' },
  refresh: { background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 6, padding: 8, cursor: 'pointer' },
  main: { maxWidth: 800, margin: '32px auto', padding: '0 20px' },
  intro: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 16, color: '#374151', marginBottom: 12, fontWeight: 700 },
  row: { background: 'white', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 },
  handleBtn: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#eef3f8', color: '#2a5680', border: '1px solid #cfd8e3', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', flexShrink: 0 },
  handledBtn: { background: '#d1fae5', color: '#065f46', borderColor: '#a7f3d0' },
  empty: { border: '1px dashed #d1d5db', borderRadius: 10, padding: 24, color: '#9ca3af', textAlign: 'center', fontSize: 14 },
  error: { padding: '12px 14px', borderRadius: 8, background: '#fee2e2', color: '#7f1d1d', fontSize: 14, marginBottom: 16 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18, color: '#6b7280' },
}
