'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Send, FileText, Film } from 'lucide-react'

type Audience = 'all_members' | 'all_active' | 'all_expired' | 'expired_12mo'

const MERGE_FIELDS: { token: string; label: string }[] = [
  { token: '{{first_name}}', label: 'First name' },
  { token: '{{name}}', label: 'Full name' },
  { token: '{{email}}', label: 'Email' },
  { token: '{{expired_date}}', label: 'Expired date' },
  { token: '{{renewal_date}}', label: 'Renewal date' },
  { token: '{{autorenew}}', label: 'Auto-renew (Yes/No)' },
  { token: '{{renew_button}}', label: 'Renew button' },
]
type UpcomingFilm = { id: string; title: string; description: string | null; date: string; time: string | null; venue: string | null; city: string | null }

function fmtLong(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  const hr = ((+h + 11) % 12) + 1
  return `${day} at ${hr}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}
function fmtShort(dateStr: string) {
  return new Date(dateStr + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

export default function ComposeEmail() {
  const [audience, setAudience] = useState<Audience>('all_active')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [films, setFilms] = useState<UpcomingFilm[]>([])
  const [testEmail, setTestEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)

  useEffect(() => {
    ;(async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { window.location.href = '/login'; return }
      setTestEmail(u.data.user.email || '')

      const cutoff = new Date(); cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 1)
      const cutoffStr = cutoff.toISOString().slice(0, 10)
      const total = await supabase.from('members').select('email', { count: 'exact', head: true }).not('email', 'is', null)
      const active = await supabase.from('members').select('email', { count: 'exact', head: true }).eq('status', 'active').not('email', 'is', null)
      const expired = await supabase.from('members').select('email', { count: 'exact', head: true }).eq('status', 'expired').not('email', 'is', null)
      const expired12 = await supabase.from('members').select('email', { count: 'exact', head: true }).eq('status', 'expired').gte('renewal_date', cutoffStr).not('email', 'is', null)
      setCounts({ all_members: total.count || 0, all_active: active.count || 0, all_expired: expired.count || 0, expired_12mo: expired12.count || 0 })

      const today = new Date().toISOString().slice(0, 10)
      const { data: fs } = await supabase
        .from('film_screenings')
        .select('id,title,description,screening_dates(screening_date,screening_time,venue,location_city)')
        .eq('published', true)
      const list: UpcomingFilm[] = []
      for (const f of (fs as any[]) || []) {
        let best: any = null
        for (const d of f.screening_dates || []) if (d.screening_date >= today && (!best || d.screening_date < best.screening_date)) best = d
        if (best) list.push({ id: f.id, title: f.title, description: f.description, date: best.screening_date, time: best.screening_time, venue: best.venue, city: best.location_city })
      }
      list.sort((a, b) => a.date.localeCompare(b.date))
      setFilms(list)
    })()
  }, [])

  function insertFilm(id: string) {
    const f = films.find((x) => x.id === id)
    if (!f) return
    const lines = [
      `🎬 ${f.title}`,
      fmtLong(f.date, f.time),
      [f.venue, f.city].filter(Boolean).join(' · '),
      f.description || '',
    ].filter(Boolean)
    const block = `\n\n${lines.join('\n')}\n`
    setBody((b) => (b + block).replace(/^\n+/, ''))
  }

  const bodyRef = useRef<HTMLTextAreaElement>(null)
  function insertToken(tok: string) {
    const el = bodyRef.current
    if (!el) { setBody((b) => b + tok); return }
    const start = el.selectionStart ?? body.length
    const end = el.selectionEnd ?? body.length
    const next = body.slice(0, start) + tok + body.slice(end)
    setBody(next)
    setTimeout(() => { el.focus(); const p = start + tok.length; el.selectionStart = el.selectionEnd = p }, 0)
  }

  async function sendTest() {
    if (!subject.trim() || !body.trim()) { setMsg({ text: 'Add a subject and message first, then send a test.', ok: false }); return }
    if (!testEmail.includes('@')) { setMsg({ text: 'Enter a valid email to send the test to.', ok: false }); return }
    setBusy(true); setMsg(null)
    try {
      const { data: row, error } = await supabase
        .from('email_queue')
        .insert({ email_type: 'test', recipient_email: testEmail, subject: `[TEST] ${subject}`, body, status: 'draft', metadata: { test: true } })
        .select().single()
      if (error) throw error
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token || ''}` },
        body: JSON.stringify({ id: row.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Send failed')
      setMsg({ text: `✓ Test sent to ${testEmail}. Check your inbox (it won't go to any members).`, ok: true })
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Failed', ok: false })
    } finally { setBusy(false) }
  }

  async function draft(sendNow: boolean) {
    if (!subject.trim() || !body.trim()) { setMsg({ text: 'Subject and message are required.', ok: false }); return }
    setBusy(true); setMsg(null)
    try {
      const { data: row, error } = await supabase
        .from('email_queue')
        .insert({ email_type: 'announcement', recipient_filter: audience, subject, body, status: 'draft', metadata: { audience } })
        .select()
        .single()
      if (error) throw error
      if (!sendNow) {
        setMsg({ text: '✓ Saved as draft. Review and send it from the Email Queue.', ok: true })
        setSubject(''); setBody('')
        return
      }
      const { data: sess } = await supabase.auth.getSession()
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token || ''}` },
        body: JSON.stringify({ id: row.id }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Send failed')
      setMsg({ text: `✓ Sent to ${json.sent} member${json.sent === 1 ? '' : 's'}.`, ok: true })
      setSubject(''); setBody('')
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Failed', ok: false })
    } finally { setBusy(false) }
  }

  const recipientCount = counts[audience] ?? 0

  return (
    <div style={s.container}>
      <header style={s.header}>
        <Link href="/admin" style={s.backLink}><ArrowLeft size={20} /> Back to Admin</Link>
        <h1 style={{ fontSize: 22 }}>Email Members</h1>
        <div style={{ width: 110 }} />
      </header>

      <main style={s.main}>
        <p style={s.intro}>Send an announcement — a new screening, news, anything — to your members by email. Spotlight a specific film with one click, then send now or save a draft.</p>

        {msg && <div style={{ ...s.message, background: msg.ok ? '#d1fae5' : '#fee2e2', color: msg.ok ? '#065f46' : '#7f1d1d' }}>{msg.text}</div>}

        <div style={s.card}>
          <label style={s.label}>Audience</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 18 }}>
            {([['all_active', 'Active members'], ['all_members', 'All members'], ['all_expired', 'Expired members'], ['expired_12mo', 'Expired in last 12 months']] as [Audience, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => setAudience(val)} style={{ ...s.pill, ...(audience === val ? s.pillActive : {}) }}>
                {lbl} <span style={{ opacity: 0.7 }}>({counts[val] ?? '…'})</span>
              </button>
            ))}
          </div>

          <label style={s.label}>Subject</label>
          <input style={s.input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="This month at Footcandle Film Society" />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 16, gap: 12, flexWrap: 'wrap' }}>
            <label style={{ ...s.label, marginBottom: 0 }}>Message</label>
            {films.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Film size={15} style={{ color: '#8b5cf6' }} />
                <select value="" onChange={(e) => { if (e.target.value) insertFilm(e.target.value) }} style={s.filmSelect}>
                  <option value="">Insert a film screening…</option>
                  {films.map((f) => <option key={f.id} value={f.id}>{f.title} — {fmtShort(f.date)}</option>)}
                </select>
              </div>
            )}
          </div>
          <textarea ref={bodyRef} style={{ ...s.input, minHeight: 220, marginTop: 8, resize: 'vertical', fontFamily: 'inherit' }} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message… click a field below to personalize it per member." />

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12.5, color: '#6b7280', marginBottom: 6 }}>Insert a personalized field (fills in per member when sent):</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {MERGE_FIELDS.map((f) => (
                <button key={f.token} onClick={() => insertToken(f.token)} style={s.mergeChip} title={`Inserts ${f.token}`}>{f.label}</button>
              ))}
            </div>
          </div>

          <div style={s.testBox}>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1f2937', marginBottom: 8 }}>Send a test to yourself first</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="your@email.com" style={{ ...s.input, flex: 1, minWidth: 200 }} />
              <button onClick={sendTest} disabled={busy} style={s.testBtn}>Send test to me</button>
            </div>
            <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>Goes only to this address — no members are emailed. Personalized fields fill in using that address's member record, so you can preview exactly what a member sees.</p>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => draft(true)} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? 0.6 : 1 }}>
              <Send size={16} /> {busy ? 'Working…' : `Send now to ${recipientCount} member${recipientCount === 1 ? '' : 's'}`}
            </button>
            <button onClick={() => draft(false)} disabled={busy} style={s.secondaryBtn}><FileText size={16} /> Save draft</button>
          </div>
          <p style={s.note}>Sends via Brevo. Requires BREVO_API_KEY configured; otherwise you'll get a clear error and the draft is still saved.</p>
        </div>
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f9fafb' },
  header: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backLink: { display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none' },
  main: { maxWidth: 760, margin: '32px auto', padding: '0 20px' },
  intro: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  card: { background: 'white', borderRadius: 12, padding: 26, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#374151' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' },
  filmSelect: { padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: 'white', color: '#5b21b6', maxWidth: 260 },
  pill: { padding: '8px 14px', borderRadius: 999, border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontSize: 14 },
  pillActive: { background: '#ede9fe', borderColor: '#8b5cf6', color: '#5b21b6', fontWeight: 600 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '11px 20px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  message: { padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
  note: { fontSize: 12, color: '#9ca3af', marginTop: 12 },
  mergeChip: { padding: '6px 11px', borderRadius: 999, border: '1px solid #cfd8e3', background: '#eef3f8', color: '#2a5680', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 },
  testBox: { marginTop: 20, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 },
  testBtn: { padding: '10px 16px', background: '#1f2937', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
}
