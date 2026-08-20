// Public detail page for a community film event (not hosted by Footcandle).
// Poster + all the details we entered; linked from the homepage cards.
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 60

const BRAND = '#2a5680'
const INK = '#1f2937'
const MUTED = '#5b6472'

type Community = {
  id: string; title: string; description: string | null; poster_url: string | null
  event_date: string; event_time: string | null; venue: string | null; location_city: string | null
  address: string | null; host_org: string | null; link_url: string | null; published: boolean
}

function fmtLong(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  return `${day} · ${((+h + 11) % 12) + 1}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}

async function getEvent(id: string): Promise<Community | null> {
  const { data, error } = await supabase.from('community_events').select('*').eq('id', id).maybeSingle()
  if (error || !data) return null
  return data as Community
}

export default async function CommunityEventPage({ params }: { params: { id: string } }) {
  const e = await getEvent(params.id)

  return (
    <div style={{ background: '#fff', color: INK, minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e6eaef' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 24px' }}>
          <Link href="/"><img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ height: 66, width: 'auto', display: 'block' }} /></Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '36px 24px 72px' }}>
        <Link href="/#screenings" style={{ color: BRAND, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>← Back to community events</Link>

        {!e || !e.published ? (
          <div style={{ marginTop: 40, textAlign: 'center', color: MUTED }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: INK }}>Event not found</h1>
            <p style={{ marginTop: 10 }}>This event may have been removed or isn't published yet.</p>
          </div>
        ) : (
          <>
            <p style={{ marginTop: 20, textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: 12, fontWeight: 700, color: MUTED }}>Community Film Event</p>
            <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1, marginTop: 6 }}>{e.title}</h1>

            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', alignItems: 'flex-start', marginTop: 24 }}>
              {e.poster_url && (
                <img src={e.poster_url} alt={e.title} style={{ width: '100%', maxWidth: 300, borderRadius: 14, boxShadow: '0 16px 44px rgba(30,63,95,0.22)' }} />
              )}
              <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 12 }}>When &amp; where</h2>
                <div style={{ background: '#f7f9fc', border: '1px solid #dbe3ec', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontWeight: 700, color: BRAND }}>{fmtLong(e.event_date, e.event_time)}</div>
                  <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>{[e.venue, e.location_city].filter(Boolean).join(' · ')}{e.address ? ` — ${e.address}` : ''}</div>
                </div>
                {e.host_org && <p style={{ marginTop: 14, color: '#374151' }}>Presented by <b>{e.host_org}</b></p>}
                <p style={{ marginTop: 8, color: MUTED, fontSize: 13 }}>This event is not hosted by the Footcandle Film Society — we're glad to help promote it.</p>
                {e.link_url && <a href={e.link_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 18, background: BRAND, color: '#fff', fontWeight: 700, padding: '12px 24px', borderRadius: 9, textDecoration: 'none' }}>More information / tickets</a>}
              </div>
            </div>

            {e.description && (
              <div style={{ marginTop: 40 }}>
                <p style={{ color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap', fontSize: 17 }}>{e.description}</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
