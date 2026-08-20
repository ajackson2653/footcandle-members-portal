'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { CommunityEvent } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Plus, Save, Trash2, X, Eye, EyeOff } from 'lucide-react'

type Draft = Partial<CommunityEvent>

function fmt(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  const hr = ((+h + 11) % 12) + 1
  return `${day} · ${hr}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}
function today() { return new Date().toISOString().slice(0, 10) }

export default function CommunityEventsAdmin() {
  const [events, setEvents] = useState<CommunityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [form, setForm] = useState<Draft>({})
  const [busy, setBusy] = useState(false)
  const [uploading, setUploading] = useState(false)

  async function uploadPoster(file: File) {
    setUploading(true); setMsg(null)
    try {
      const fileName = `community-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const { error } = await supabase.storage.from('film-posters').upload(fileName, file)
      if (error) throw error
      const { data } = supabase.storage.from('film-posters').getPublicUrl(fileName)
      setForm((f) => ({ ...f, poster_url: data.publicUrl }))
      setMsg({ text: 'Poster uploaded.', ok: true })
    } catch (e) {
      setMsg({ text: `Poster upload failed: ${e instanceof Error ? e.message : 'error'}`, ok: false })
    } finally { setUploading(false) }
  }

  useEffect(() => {
    ;(async () => {
      const u = await supabase.auth.getUser()
      if (!u.data.user) { window.location.href = '/login'; return }
      await load()
    })()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase.from('community_events').select('*').order('event_date', { ascending: true })
    if (error) setMsg({ text: `Could not load — has supabase/public-site-setup.sql been run? (${error.message})`, ok: false })
    setEvents((data as CommunityEvent[]) || [])
    setLoading(false)
  }

  async function apiWrite(method: 'PATCH' | 'POST' | 'DELETE', payload: any) {
    const { data } = await supabase.auth.getSession()
    const token = data.session?.access_token || ''
    const url = method === 'DELETE' ? `/api/community-events?id=${encodeURIComponent(payload.id)}` : '/api/community-events'
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: method === 'DELETE' ? undefined : JSON.stringify(payload),
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(json.error || `${method} failed`)
    return json
  }

  const upcoming = useMemo(() => events.filter((e) => e.event_date >= today()), [events])
  const past = useMemo(() => events.filter((e) => e.event_date < today()).reverse(), [events])

  function startAdd() {
    setEditId(null); setAdding(true)
    setForm({ title: '', event_date: '', event_time: '', venue: '', location_city: '', address: '', host_org: '', link_url: '', poster_url: '', description: '', published: true })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function startEdit(e: CommunityEvent) {
    setAdding(false); setEditId(e.id)
    setForm({ ...e, event_date: e.event_date?.slice(0, 10), event_time: e.event_time || '' })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function cancel() { setEditId(null); setAdding(false); setForm({}) }

  async function save() {
    setBusy(true); setMsg(null)
    try {
      if (adding) {
        const { event } = await apiWrite('POST', { event: form })
        setEvents((p) => [...p, event])
        setMsg({ text: `Added "${event.title}".`, ok: true })
      } else if (editId) {
        const { event } = await apiWrite('PATCH', { id: editId, updates: form })
        setEvents((p) => p.map((x) => (x.id === editId ? event : x)))
        setMsg({ text: `Saved "${event.title}".`, ok: true })
      }
      cancel()
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : 'Save failed', ok: false })
    } finally { setBusy(false) }
  }

  async function togglePublished(e: CommunityEvent) {
    setBusy(true); setMsg(null)
    try {
      const { event } = await apiWrite('PATCH', { id: e.id, updates: { published: !e.published } })
      setEvents((p) => p.map((x) => (x.id === e.id ? event : x)))
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Failed', ok: false })
    } finally { setBusy(false) }
  }

  async function remove(e: CommunityEvent) {
    if (!confirm(`Delete "${e.title}"?`)) return
    setBusy(true); setMsg(null)
    try {
      await apiWrite('DELETE', { id: e.id })
      setEvents((p) => p.filter((x) => x.id !== e.id))
    } catch (err) {
      setMsg({ text: err instanceof Error ? err.message : 'Delete failed', ok: false })
    } finally { setBusy(false) }
  }

  if (loading) return <div style={s.loading}>Loading community events…</div>

  return (
    <div style={s.container}>
      <header style={s.header}>
        <Link href="/admin" style={s.backLink}><ArrowLeft size={20} /> Back to Admin</Link>
        <h1 style={{ fontSize: 22 }}>Community Events</h1>
        <button onClick={startAdd} style={s.addBtn}><Plus size={16} /> Add Event</button>
      </header>

      <main style={s.main}>
        <p style={s.intro}>Screenings around the area — <b>not</b> hosted by the Film Society — that you want to promote in the secondary tier of the public homepage.</p>

        {msg && <div style={{ ...s.message, background: msg.ok ? '#d1fae5' : '#fee2e2', color: msg.ok ? '#065f46' : '#7f1d1d' }}>{msg.text}</div>}

        {(adding || editId) && (
          <div style={s.card}>
            <div style={s.editHead}>
              <h2 style={{ fontSize: 18 }}>{adding ? 'Add Community Event' : 'Edit Community Event'}</h2>
              <button onClick={cancel} style={s.iconBtn}><X size={18} /></button>
            </div>
            <div style={s.formGrid}>
              <F label="Title *" span2><input style={s.input} value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} /></F>
              <F label="Date *"><input type="date" style={s.input} value={(form.event_date as string) ?? ''} onChange={(e) => setForm({ ...form, event_date: e.target.value })} /></F>
              <F label="Time"><input type="time" style={s.input} value={(form.event_time as string) ?? ''} onChange={(e) => setForm({ ...form, event_time: e.target.value })} /></F>
              <F label="Venue"><input style={s.input} value={form.venue ?? ''} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></F>
              <F label="City"><input style={s.input} value={form.location_city ?? ''} onChange={(e) => setForm({ ...form, location_city: e.target.value })} /></F>
              <F label="Address"><input style={s.input} value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></F>
              <F label="Presented by (host org)"><input style={s.input} value={form.host_org ?? ''} onChange={(e) => setForm({ ...form, host_org: e.target.value })} /></F>
              <F label="Info / tickets link"><input style={s.input} placeholder="https://…" value={form.link_url ?? ''} onChange={(e) => setForm({ ...form, link_url: e.target.value })} /></F>
              <F label="Poster image" span2>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {form.poster_url ? <img src={form.poster_url} alt="poster" style={{ width: 70, height: 'auto', borderRadius: 6, border: '1px solid #e5e7eb', flexShrink: 0 }} /> : null}
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <input type="file" accept="image/*" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPoster(f) }} style={{ fontSize: 13 }} />
                    {uploading && <span style={{ fontSize: 13, color: '#6b7280', marginLeft: 8 }}>Uploading…</span>}
                    <input style={{ ...s.input, marginTop: 10 }} placeholder="…or paste an image URL" value={form.poster_url ?? ''} onChange={(e) => setForm({ ...form, poster_url: e.target.value })} />
                  </div>
                </div>
              </F>
              <F label="Description" span2><textarea rows={3} style={{ ...s.input, resize: 'vertical' }} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></F>
              <F label="Published"><label style={s.checkboxRow}><input type="checkbox" checked={!!form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /><span style={{ fontSize: 14 }}>Show on public site</span></label></F>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
              <button onClick={save} disabled={busy} style={{ ...s.primaryBtn, opacity: busy ? 0.6 : 1 }}><Save size={16} /> {busy ? 'Saving…' : 'Save'}</button>
              <button onClick={cancel} style={s.secondaryBtn}>Cancel</button>
            </div>
          </div>
        )}

        <Section title={`Upcoming (${upcoming.length})`} events={upcoming} onEdit={startEdit} onDelete={remove} onToggle={togglePublished} busy={busy} empty="No upcoming community events. Click “Add Event”." />
        {past.length > 0 && <Section title={`Past (${past.length})`} events={past} onEdit={startEdit} onDelete={remove} onToggle={togglePublished} busy={busy} muted />}
      </main>
    </div>
  )
}

function Section({ title, events, onEdit, onDelete, onToggle, busy, empty, muted }: {
  title: string; events: CommunityEvent[]; onEdit: (e: CommunityEvent) => void; onDelete: (e: CommunityEvent) => void; onToggle: (e: CommunityEvent) => void; busy: boolean; empty?: string; muted?: boolean
}) {
  return (
    <div style={{ marginTop: 24, opacity: muted ? 0.75 : 1 }}>
      <h2 style={{ fontSize: 16, color: '#374151', marginBottom: 12 }}>{title}</h2>
      {events.length === 0 ? (
        <div style={s.empty}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.map((e) => (
            <div key={e.id} style={s.row}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 700, color: '#1f2937' }}>{e.title}</span>
                  {!e.published && <span style={s.draftPill}>hidden</span>}
                </div>
                <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, marginTop: 2 }}>{fmt(e.event_date, e.event_time)}</div>
                <div style={{ fontSize: 13, color: '#6b7280' }}>{[e.venue, e.location_city].filter(Boolean).join(' · ')}{e.host_org ? ` — ${e.host_org}` : ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <button onClick={() => onToggle(e)} disabled={busy} style={s.iconBtn} title={e.published ? 'Hide from public site' : 'Show on public site'}>{e.published ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                <button onClick={() => onEdit(e)} style={s.linkBtn}>Edit</button>
                <button onClick={() => onDelete(e)} style={s.trashBtn} title="Delete"><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function F({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return <div style={span2 ? { gridColumn: '1 / -1' } : undefined}><label style={s.label}>{label}</label>{children}</div>
}

const s: Record<string, React.CSSProperties> = {
  container: { minHeight: '100vh', background: '#f9fafb' },
  header: { background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  backLink: { display: 'flex', alignItems: 'center', gap: 8, color: 'white', textDecoration: 'none' },
  addBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600 },
  main: { maxWidth: 900, margin: '32px auto', padding: '0 20px' },
  intro: { color: '#6b7280', fontSize: 14, marginBottom: 16 },
  card: { background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: 20 },
  editHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  formGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#374151' },
  input: { width: '100%', padding: '9px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' },
  checkboxRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 0' },
  primaryBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#059669', color: 'white', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' },
  secondaryBtn: { padding: '10px 14px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: 6, fontSize: 14, cursor: 'pointer' },
  iconBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 },
  linkBtn: { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 600 },
  trashBtn: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' },
  row: { background: 'white', borderRadius: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  draftPill: { fontSize: 11, fontWeight: 600, color: '#92400e', background: '#fef3c7', borderRadius: 999, padding: '2px 8px' },
  empty: { border: '1px dashed #d1d5db', borderRadius: 10, padding: '24px', color: '#9ca3af', textAlign: 'center', fontSize: 14 },
  message: { padding: '12px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 },
  loading: { display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontSize: 18, color: '#6b7280' },
}
