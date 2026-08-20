'use client'

// Newsletter / promotional email builder. Add a month-header banner, then
// arrange TEXT blocks and EVENT blocks (film screenings + community events,
// with posters) — drag to reorder — and send with the branded template.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { ArrowLeft, Send, FileText, Type, Film, MapPin, Trash2, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'

const BRAND = '#2a5680'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://members.footcandle.org'

type Audience = 'all_active' | 'all_members' | 'all_expired'
type EventItem = { kind: 'film' | 'community'; id: string; title: string; poster_url: string | null; lines: string[]; host_org?: string | null; sort: string }
type Block = { key: string; type: 'text'; text: string } | { key: string; type: 'event'; ev: EventItem }

function fmt(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  return `${day} · ${((+h + 11) % 12) + 1}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}
function esc(s: string) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
let keySeq = 0
const nextKey = () => `b${++keySeq}`

// Email-safe HTML for one event card.
function cardHtml(ev: EventItem) {
  const url = `${SITE_URL}/${ev.kind === 'film' ? 'film' : 'community'}/${ev.id}`
  const poster = ev.poster_url
    ? `<td width="130" valign="top" style="padding:14px;"><a href="${url}"><img src="${ev.poster_url}" width="120" alt="" style="width:120px;max-width:120px;border-radius:6px;display:block;" /></a></td>`
    : ''
  const presented = ev.host_org ? `<div style="margin-top:6px;color:#8a8a98;font-size:13px;">Presented by ${esc(ev.host_org)}</div>` : ''
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border:1px solid #e6eaef;border-radius:10px;">` +
    `<tr>${poster}<td valign="top" style="padding:14px${ev.poster_url ? ' 14px 14px 0' : ''};font-family:Arial,Helvetica,sans-serif;">` +
    `<div style="font-size:18px;font-weight:bold;color:#1f2937;">${esc(ev.title)}</div>` +
    `<div style="margin-top:6px;color:#374151;font-size:14px;line-height:1.5;">${ev.lines.map(esc).join('<br/>')}</div>` +
    presented +
    `<a href="${url}" style="display:inline-block;margin-top:10px;color:${BRAND};font-weight:bold;text-decoration:none;font-size:14px;">See details &rarr;</a>` +
    `</td></tr></table>`
}
function textHtml(text: string) {
  return `<div style="margin:16px 0;font-size:16px;line-height:1.6;color:#1f2937;">${esc(text).replace(/\n/g, '<br/>')}</div>`
}
function bannerHtml(title: string) {
  if (!title.trim()) return ''
  return `<div style="background:${BRAND};color:#ffffff;padding:16px 18px;border-radius:8px;margin-bottom:22px;text-align:center;font-size:21px;font-weight:bold;font-family:Arial,Helvetica,sans-serif;">${esc(title)}</div>`
}

export default function NewsletterBuilder() {
  const [header, setHeader] = useState('')
  const [subject, setSubject] = useState('')
  const [audience, setAudience] = useState<Audience>('all_active')
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [blocks, setBlocks] = useState<Block[]>([])
  const [catalog, setCatalog] = useState<EventItem[]>([])
  const [testEmail, setTestEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    ;(async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { window.location.href = '/login'; return }
      setTestEmail(u.data.user.email || '')
      const total = await supabase.from('members').select('email', { count: 'exact', head: true }).not('email', 'is', null)
      const active = await supabase.from('members').select('email', { count: 'exact', head: true }).eq('status', 'active').not('email', 'is', null)
      const expired = await supabase.from('members').select('email', { count: 'exact', head: true }).eq('status', 'expired').not('email', 'is', null)
      setCounts({ all_active: active.count || 0, all_members: total.count || 0, all_expired: expired.count || 0 })

      const today = new Date().toISOString().slice(0, 10)
      const items: EventItem[] = []
      const { data: fs } = await supabase.from('film_screenings').select('id,title,poster_url,screening_dates(screening_date,screening_time,venue,location_city)').eq('published', true)
      for (const f of (fs as any[]) || []) {
        const up = (f.screening_dates || []).filter((d: any) => d.screening_date >= today).sort((a: any, b: any) => (a.screening_date + (a.screening_time || '')).localeCompare(b.screening_date + (b.screening_time || '')))
        if (!up.length) continue
        items.push({ kind: 'film', id: f.id, title: f.title, poster_url: f.poster_url, sort: up[0].screening_date, lines: up.map((d: any) => `${fmt(d.screening_date, d.screening_time)} — ${[d.venue, d.location_city].filter(Boolean).join(', ')}`) })
      }
      const { data: ce } = await supabase.from('community_events').select('id,title,poster_url,event_date,event_time,venue,location_city,host_org').eq('published', true).gte('event_date', today).order('event_date')
      for (const e of (ce as any[]) || []) {
        items.push({ kind: 'community', id: e.id, title: e.title, poster_url: e.poster_url, host_org: e.host_org, sort: e.event_date, lines: [`${fmt(e.event_date, e.event_time)} — ${[e.venue, e.location_city].filter(Boolean).join(', ')}`] })
      }
      items.sort((a, b) => a.sort.localeCompare(b.sort))
      setCatalog(items)
    })()
  }, [])

  function addText() { setBlocks((b) => [...b, { key: nextKey(), type: 'text', text: '' }]) }
  function addEvent(idx: number) { const ev = catalog[idx]; if (ev) setBlocks((b) => [...b, { key: nextKey(), type: 'event', ev }]) }
  function removeBlock(i: number) { setBlocks((b) => b.filter((_, j) => j !== i)) }
  function move(i: number, dir: -1 | 1) { setBlocks((b) => { const j = i + dir; if (j < 0 || j >= b.length) return b; const c = [...b]; [c[i], c[j]] = [c[j], c[i]]; return c }) }
  function reorder(from: number, to: number) { setBlocks((b) => { if (from === to || from < 0 || to < 0) return b; const c = [...b]; const [x] = c.splice(from, 1); c.splice(to, 0, x); return c }) }
  function setText(i: number, text: string) { setBlocks((b) => b.map((bl, j) => (j === i && bl.type === 'text' ? { ...bl, text } : bl))) }

  const html = useMemo(() => bannerHtml(header) + blocks.map((b) => (b.type === 'text' ? textHtml(b.text) : cardHtml(b.ev))).join(''), [header, blocks])

  async function persist(): Promise<string> {
    const { data, error } = await supabase.from('email_queue').insert({
      email_type: 'newsletter', recipient_filter: audience, subject,
      body: header || 'This month at Footcandle Film Society', html_body: html, status: 'draft', metadata: { newsletter: true },
    }).select('id').single()
    if (error) throw new Error(error.message)
    return data.id
  }
  async function send(id: string) {
    const { data: sess } = await supabase.auth.getSession()
    const res = await fetch('/api/send-email', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sess.session?.access_token || ''}` }, body: JSON.stringify({ id }) })
    const json = await res.json().catch(() => ({})); if (!res.ok) throw new Error(json.error || 'Send failed'); return json.sent
  }
  function validate() {
    if (!subject.trim()) { setMsg({ text: 'Add a subject line.', ok: false }); return false }
    if (!blocks.length) { setMsg({ text: 'Add at least one event or text block.', ok: false }); return false }
    return true
  }
  async function doDraft() { if (!validate()) return; setBusy(true); setMsg(null); try { await persist(); setMsg({ text: '✓ Saved to the Email Queue — you can review and send it there.', ok: true }) } catch (e) { setMsg({ text: e instanceof Error ? e.message : 'Failed', ok: false }) } finally { setBusy(false) } }
  async function doSendNow() { if (!validate()) return; if (!confirm(`Send this newsletter to ${counts[audience] ?? 0} members?`)) return; setBusy(true); setMsg(null); try { const id = await persist(); const n = await send(id); setMsg({ text: `✓ Sent to ${n} member${n === 1 ? '' : 's'}.`, ok: true }) } catch (e) { setMsg({ text: e instanceof Error ? e.message : 'Failed', ok: false }) } finally { setBusy(false) } }
  async function doTest() { if (!subject.trim() || !blocks.length) { setMsg({ text: 'Add a subject and at least one block first.', ok: false }); return } if (!testEmail.includes('@')) { setMsg({ text: 'Enter a valid test email.', ok: false }); return } setBusy(true); setMsg(null); try { const { data, error } = await supabase.from('email_queue').insert({ email_type: 'newsletter', recipient_email: testEmail, subject: `[TEST] ${subject}`, body: header || 'Newsletter', html_body: html, status: 'draft', metadata: { test: true } }).select('id').single(); if (error) throw error; const n = await send(data.id); setMsg({ text: `✓ Test sent to ${testEmail}.`, ok: true }) } catch (e) { setMsg({ text: e instanceof Error ? e.message : 'Failed', ok: false }) } finally { setBusy(false) } }

  return (
    <div style={s.container}>
      <header style={s.header}>
        <Link href="/admin" style={s.backLink}><ArrowLeft size={20} /> Back to Admin</Link>
        <h1 style={{ fontSize: 22 }}>Newsletter Builder</h1>
        <div style={{ width: 100 }} />
      </header>

      <main style={s.main}>
        {msg && <div style={{ ...s.message, background: msg.ok ? '#d1fae5' : '#fee2e2', color: msg.ok ? '#065f46' : '#7f1d1d' }}>{msg.text}</div>}

        <div style={s.grid}>
          {/* Left: builder */}
          <div>
            <div style={s.card}>
              <label style={s.label}>Header banner (e.g. “August 2026 Screenings”)</label>
              <input style={s.input} value={header} onChange={(e) => setHeader(e.target.value)} placeholder="This Month at Footcandle Film Society" />
              <label style={{ ...s.label, marginTop: 14 }}>Email subject</label>
              <input style={s.input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Footcandle Film Society — August screenings" />

              <label style={{ ...s.label, marginTop: 16 }}>Audience</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {([['all_active', 'Active members'], ['all_members', 'All members'], ['all_expired', 'Expired members']] as [Audience, string][]).map(([v, l]) => (
                  <button key={v} onClick={() => setAudience(v)} style={{ ...s.pill, ...(audience === v ? s.pillOn : {}) }}>{l} <span style={{ opacity: 0.7 }}>({counts[v] ?? '…'})</span></button>
                ))}
              </div>
            </div>

            <div style={s.card}>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                <button onClick={addText} style={s.addBtn}><Type size={14} /> Add text</button>
                <select value="" onChange={(e) => { if (e.target.value !== '') addEvent(Number(e.target.value)) }} style={s.select}>
                  <option value="">＋ Add an event…</option>
                  {catalog.map((ev, i) => <option key={ev.kind + ev.id} value={i}>{ev.kind === 'film' ? '🎬' : '📍'} {ev.title} — {fmt(ev.sort)}</option>)}
                </select>
                <span style={{ fontSize: 12.5, color: '#6b7280' }}>Drag blocks to reorder</span>
              </div>

              {blocks.length === 0 ? (
                <div style={s.empty}>Add text and event blocks to build your email.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {blocks.map((b, i) => (
                    <div key={b.key} draggable onDragStart={() => setDragIndex(i)} onDragOver={(e) => e.preventDefault()} onDrop={() => { if (dragIndex !== null) reorder(dragIndex, i); setDragIndex(null) }} style={s.block}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, color: '#9ca3af', cursor: 'grab' }}>
                        <GripVertical size={16} />
                        <button onClick={() => move(i, -1)} style={s.arrow}><ChevronUp size={14} /></button>
                        <button onClick={() => move(i, 1)} style={s.arrow}><ChevronDown size={14} /></button>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {b.type === 'text' ? (
                          <textarea value={b.text} onChange={(e) => setText(i, e.target.value)} placeholder="Write some text…" style={{ ...s.input, minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
                        ) : (
                          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                            {b.ev.poster_url ? <img src={b.ev.poster_url} alt="" style={{ width: 44, height: 'auto', borderRadius: 4, flexShrink: 0 }} /> : <div style={{ width: 44, height: 64, background: '#e5e7eb', borderRadius: 4, flexShrink: 0 }} />}
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontWeight: 700, color: '#1f2937' }}>{b.ev.kind === 'film' ? '🎬' : '📍'} {b.ev.title}</div>
                              <div style={{ fontSize: 13, color: '#6b7280' }}>{b.ev.lines[0]}</div>
                            </div>
                          </div>
                        )}
                      </div>
                      <button onClick={() => removeBlock(i)} style={s.trash} title="Remove"><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={s.card}>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Send a test to yourself first</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} style={{ ...s.input, flex: 1, minWidth: 200 }} />
                <button onClick={doTest} disabled={busy} style={s.testBtn}>Send test to me</button>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
                <button onClick={doSendNow} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? 0.6 : 1 }}><Send size={16} /> {busy ? 'Working…' : `Send now to ${counts[audience] ?? 0}`}</button>
                <button onClick={doDraft} disabled={busy} style={s.secondaryBtn}><FileText size={16} /> Save draft</button>
              </div>
            </div>
          </div>

          {/* Right: live preview */}
          <div>
            <div style={{ ...s.card, position: 'sticky', top: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Live preview</div>
              <div style={{ background: '#f4f6f9', borderRadius: 10, padding: 14, maxHeight: '72vh', overflowY: 'auto' }}>
                <div style={{ background: '#fff', border: '1px solid #e6eaef', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '18px', borderBottom: '1px solid #eef1f5', textAlign: 'center' }}>
                    <img src="/footcandle-logo.png" alt="Footcandle" style={{ width: 200, maxWidth: '70%', height: 'auto' }} />
                  </div>
                  <div style={{ padding: 20 }} dangerouslySetInnerHTML={{ __html: html || '<p style="color:#9ca3af">Your email preview will appear here…</p>' }} />
                  <div style={{ background: '#1e3f5f', color: '#aebfd0', padding: '16px', fontSize: 12, textAlign: 'center' }}>Footcandle Film Society · info@footcandle.org</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f9fafb' },
  header: { background: 'linear-gradient(135deg, #2a5680 0%, #1e3f5f 100%)', color: 'white', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  backLink: { display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none' },
  main: { maxWidth: 1180, margin: '28px auto', padding: '0 20px' },
  grid: { display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 20 },
  card: { background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' },
  select: { padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, background: 'white', maxWidth: 260 },
  pill: { padding: '7px 12px', borderRadius: 999, border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontSize: 13 },
  pillOn: { background: '#eef3f8', borderColor: BRAND, color: BRAND, fontWeight: 600 },
  addBtn: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', background: '#eef3f8', color: BRAND, border: '1px solid #cfd8e3', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  block: { display: 'flex', gap: 10, alignItems: 'flex-start', background: '#fafbfc', border: '1px solid #e6eaef', borderRadius: 8, padding: 10 },
  arrow: { background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 },
  trash: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', flexShrink: 0 },
  empty: { border: '1px dashed #d1d5db', borderRadius: 8, padding: 24, color: '#9ca3af', textAlign: 'center', fontSize: 14 },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '11px 16px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  testBtn: { padding: '10px 16px', background: '#1f2937', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' },
  message: { padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
}
