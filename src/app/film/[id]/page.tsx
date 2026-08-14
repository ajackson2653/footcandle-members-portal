// Public film detail page — generated for each published film screening.
// Poster, all the film info we entered, and every screening date/location.
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 300

const BRAND = '#2a5680'
const INK = '#1f2937'
const MUTED = '#5b6472'

type DateRow = { screening_date: string; screening_time: string | null; venue: string | null; location_city: string | null; address: string | null }
type Film = {
  id: string; title: string; description: string | null; about_film: string | null; poster_url: string | null
  rating: string | null; running_time: string | null; trailer_url: string | null; published: boolean
  screening_dates: DateRow[] | null
}

function fmtLong(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  return `${day} · ${((+h + 11) % 12) + 1}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}
function dateKey(d: DateRow) { return d.screening_date + (d.screening_time || '') }

async function getFilm(id: string): Promise<Film | null> {
  const { data, error } = await supabase
    .from('film_screenings')
    .select('id,title,description,about_film,poster_url,rating,running_time,trailer_url,published,screening_dates(screening_date,screening_time,venue,location_city,address)')
    .eq('id', id)
    .maybeSingle()
  if (error || !data) return null
  return data as Film
}

export default async function FilmPage({ params }: { params: { id: string } }) {
  const film = await getFilm(params.id)

  return (
    <div style={{ background: '#fff', color: INK, minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e6eaef' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '16px 24px' }}>
          <Link href="/"><img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ height: 56, width: 'auto', display: 'block' }} /></Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 24px 72px' }}>
        <Link href="/" style={{ color: BRAND, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>← Back to home</Link>

        {!film || !film.published ? (
          <div style={{ marginTop: 40, textAlign: 'center', color: MUTED }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: INK }}>Screening not found</h1>
            <p style={{ marginTop: 10 }}>This screening may have been removed or isn't published yet.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 36, marginTop: 24, alignItems: 'start' }} className="hero-grid">
            {film.poster_url && (
              <img src={film.poster_url} alt={film.title} style={{ width: '100%', maxWidth: 360, borderRadius: 14, justifySelf: 'center', boxShadow: '0 16px 44px rgba(30,63,95,0.22)' }} />
            )}
            <div>
              <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.1 }}>{film.title}</h1>
              {(film.rating || film.running_time) && (
                <p style={{ marginTop: 10, color: MUTED, fontSize: 15 }}>{[film.rating, film.running_time].filter(Boolean).join(' · ')}</p>
              )}
              {film.description && <p style={{ marginTop: 16, fontSize: 18, color: '#374151', lineHeight: 1.6 }}>{film.description}</p>}
              {film.about_film && <p style={{ marginTop: 16, color: '#374151', lineHeight: 1.75, whiteSpace: 'pre-wrap' }}>{film.about_film}</p>}
              {film.trailer_url && (
                <a href={film.trailer_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 18, color: BRAND, fontWeight: 700, textDecoration: 'none' }}>▶ Watch the trailer</a>
              )}

              <h2 style={{ fontSize: 20, fontWeight: 800, marginTop: 32, marginBottom: 12 }}>Screening dates &amp; locations</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(film.screening_dates || []).slice().sort((a, b) => dateKey(a).localeCompare(dateKey(b))).map((d, i) => (
                  <div key={i} style={{ background: '#f7f9fc', border: '1px solid #dbe3ec', borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, color: BRAND }}>{fmtLong(d.screening_date, d.screening_time)}</div>
                    <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>{[d.venue, d.location_city].filter(Boolean).join(' · ')}{d.address ? ` — ${d.address}` : ''}</div>
                  </div>
                ))}
                {(!film.screening_dates || film.screening_dates.length === 0) && (
                  <p style={{ color: MUTED }}>Dates will be announced soon.</p>
                )}
              </div>

              <div style={{ marginTop: 30 }}>
                <Link href="/membership" style={{ background: BRAND, color: '#fff', fontWeight: 700, padding: '13px 24px', borderRadius: 9, textDecoration: 'none' }}>Become a member</Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
