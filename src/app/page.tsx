// Public homepage for footcandle.org — a more-polished version of the current
// WordPress site. Server component: reads published screenings + community
// events from Supabase (graceful empty states when none / table absent).
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export const revalidate = 300 // refresh screening data every 5 min

// ── Links & constants (from the current footcandle.org) ────────────────
const PODCAST_APPLE = 'https://podcasts.apple.com/us/podcast/footcandle-films/id1452574037'
const PODCAST_EMBED = 'https://embed.podcasts.apple.com/us/podcast/footcandle-films/id1452574037'
const FESTIVAL_URL = 'https://www.footcandlefilmfestival.com'
const GRANT_URL = 'https://www.footcandle.org/filmmaker-grant-program/'
const FACEBOOK = 'https://www.facebook.com/footcandle'
const YOUTUBE = 'https://www.youtube.com/channel/UCX4K0xedXNND7wJue-Xwu-g'
const EMAIL = 'info@footcandle.org'

type DateRow = { screening_date: string; screening_time: string | null; venue: string | null; location_city: string | null; address: string | null }
type Film = { id: string; title: string; description: string | null; poster_url: string | null; rating: string | null; running_time: string | null; screening_dates: DateRow[] | null }
type Community = { id: string; title: string; description: string | null; poster_url: string | null; event_date: string; event_time: string | null; venue: string | null; location_city: string | null; host_org: string | null; link_url: string | null }

function today() { return new Date().toISOString().slice(0, 10) }
function fmtLong(dateStr: string, timeStr?: string | null) {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', timeZone: 'UTC' })
  if (!timeStr) return day
  const [h, m] = timeStr.split(':')
  const hr = ((+h + 11) % 12) + 1
  const ap = +h >= 12 ? 'PM' : 'AM'
  return `${day} · ${hr}:${m} ${ap}`
}

async function getNextScreening(): Promise<{ film: Film; date: DateRow } | null> {
  const { data, error } = await supabase
    .from('film_screenings')
    .select('id,title,description,poster_url,rating,running_time,screening_dates(screening_date,screening_time,venue,location_city,address)')
    .eq('published', true)
  if (error || !data) return null
  let best: { film: Film; date: DateRow } | null = null
  for (const f of data as Film[]) {
    for (const d of f.screening_dates || []) {
      if (d.screening_date >= today() && (!best || d.screening_date < best.date.screening_date)) best = { film: f, date: d }
    }
  }
  return best
}

async function getCommunityEvents(): Promise<Community[]> {
  const { data, error } = await supabase
    .from('community_events')
    .select('*')
    .eq('published', true)
    .gte('event_date', today())
    .order('event_date', { ascending: true })
    .limit(6)
  if (error || !data) return [] // table may not exist yet
  return data as Community[]
}

export default async function Home() {
  const [next, community] = await Promise.all([getNextScreening(), getCommunityEvents()])

  return (
    <div style={{ background: '#0a0a0f', color: '#f4f4f6', minHeight: '100vh' }}>
      <Nav />

      {/* ── HERO: next Film Society screening ── */}
      <section style={{ borderBottom: '1px solid #1e1e2b', background: 'radial-gradient(1200px 500px at 70% -10%, rgba(240,180,41,0.10), transparent), #0a0a0f' }}>
        <div style={wrap}>
          <p style={kicker}>Next Film Society Screening</p>
          {next ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 28, alignItems: 'center' }} className="hero-grid">
              <div>
                <h1 style={{ fontSize: 'clamp(34px,6vw,60px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }}>{next.film.title}</h1>
                <p style={{ marginTop: 14, fontSize: 20, color: '#f0b429', fontWeight: 600 }}>{fmtLong(next.date.screening_date, next.date.screening_time)}</p>
                <p style={{ marginTop: 4, color: '#b8b8c6', fontSize: 16 }}>
                  {[next.date.venue, next.date.location_city].filter(Boolean).join(' · ')}
                  {next.date.address ? ` — ${next.date.address}` : ''}
                </p>
                {next.film.description && <p style={{ marginTop: 18, color: '#c9c9d4', maxWidth: 560, lineHeight: 1.6 }}>{next.film.description}</p>}
                <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <a href="#community" style={btnPrimary}>See all screenings</a>
                  <Link href="/login" style={btnGhost}>Member Login</Link>
                </div>
              </div>
              {next.film.poster_url ? (
                <img src={next.film.poster_url} alt={next.film.title} style={{ width: '100%', maxWidth: 340, borderRadius: 14, justifySelf: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
              ) : null}
            </div>
          ) : (
            <div style={{ paddingBottom: 8 }}>
              <h1 style={{ fontSize: 'clamp(32px,6vw,56px)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em', maxWidth: 780 }}>
                Our next screening will be announced soon.
              </h1>
              <p style={{ marginTop: 18, fontSize: 20, color: '#f0b429', fontWeight: 600 }}>You like movies. So do we.</p>
              <p style={{ marginTop: 8, color: '#b8b8c6', maxWidth: 620, lineHeight: 1.6 }}>
                Footcandle Film Society brings documentaries, foreign narratives, and award-nominated films — with moderated
                discussion — to Catawba County and Western North Carolina.
              </p>
              <div style={{ marginTop: 26, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <a href={PODCAST_APPLE} target="_blank" rel="noopener noreferrer" style={btnPrimary}>Listen to the podcast</a>
                <Link href="/login" style={btnGhost}>Member Login</Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Community film events (secondary tier) ── */}
      <section id="community" style={{ background: '#0c0c13' }}>
        <div style={wrap}>
          <SectionHead title="Upcoming Community Film Events" sub="Screenings around the area we're proud to help promote — not hosted by the Film Society." />
          {community.length ? (
            <div style={grid3}>
              {community.map((e) => (
                <div key={e.id} style={card}>
                  {e.poster_url && <img src={e.poster_url} alt={e.title} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }} />}
                  <h3 style={{ fontSize: 19, fontWeight: 700 }}>{e.title}</h3>
                  <p style={{ marginTop: 6, color: '#f0b429', fontWeight: 600, fontSize: 14 }}>{fmtLong(e.event_date, e.event_time)}</p>
                  <p style={{ marginTop: 2, color: '#a7a7b4', fontSize: 14 }}>{[e.venue, e.location_city].filter(Boolean).join(' · ')}</p>
                  {e.host_org && <p style={{ marginTop: 8, color: '#8a8a98', fontSize: 13 }}>Presented by {e.host_org}</p>}
                  {e.description && <p style={{ marginTop: 10, color: '#c2c2ce', fontSize: 14, lineHeight: 1.5 }}>{e.description}</p>}
                  {e.link_url && <a href={e.link_url} target="_blank" rel="noopener noreferrer" style={{ ...linkText, display: 'inline-block', marginTop: 12 }}>More info →</a>}
                </div>
              ))}
            </div>
          ) : (
            <div style={emptyBox}>No community events listed right now — check back soon.</div>
          )}
        </div>
      </section>

      {/* ── Filmmaker Grant ── */}
      <section style={{ background: 'linear-gradient(180deg,#141019,#0a0a0f)' }}>
        <div style={wrap}>
          <div style={{ ...card, borderColor: 'rgba(240,180,41,0.35)', background: 'linear-gradient(135deg, rgba(240,180,41,0.10), rgba(26,26,36,0.6))', display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ maxWidth: 620 }}>
              <p style={{ ...kicker, marginTop: 0 }}>2026 Filmmaker Grant Fund</p>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>Making a film in North Carolina? We want to help fund it.</h2>
              <p style={{ marginTop: 12, color: '#c9c9d4', lineHeight: 1.6 }}>
                Our Filmmaker Grant Program provides financial support to projects with a majority of their production taking
                place in North Carolina. Applications for 2026 are open.
              </p>
            </div>
            <a href={GRANT_URL} target="_blank" rel="noopener noreferrer" style={btnPrimary}>Apply for the grant</a>
          </div>
        </div>
      </section>

      {/* ── Podcast ── */}
      <section style={{ background: '#0c0c13' }}>
        <div style={wrap}>
          <SectionHead title="Listen to the Footcandle Films Podcast" sub="Our conversations about the films we love — new episodes and the full back catalog." />
          <div style={{ display: 'grid', gap: 24, gridTemplateColumns: 'minmax(0,1fr)' }} className="podcast-grid">
            <iframe
              title="Footcandle Films Podcast"
              allow="autoplay *; encrypted-media *;"
              height={450}
              style={{ width: '100%', maxWidth: 660, overflow: 'hidden', borderRadius: 12, border: 'none', background: 'transparent' }}
              sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
              src={PODCAST_EMBED}
            />
            <div style={{ alignSelf: 'center' }}>
              <h3 style={{ fontSize: 22, fontWeight: 700 }}>Go deeper</h3>
              <p style={{ marginTop: 10, color: '#c2c2ce', lineHeight: 1.6, maxWidth: 420 }}>
                Press play on the latest episode, then browse the full archive of past conversations on Apple Podcasts.
              </p>
              <a href={PODCAST_APPLE} target="_blank" rel="noopener noreferrer" style={{ ...btnGhost, marginTop: 16, display: 'inline-block' }}>Browse all past episodes</a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Festival ── */}
      <section style={{ background: 'linear-gradient(180deg,#0a0a0f,#12121a)' }}>
        <div style={wrap}>
          <div style={{ ...card, display: 'flex', flexWrap: 'wrap', gap: 20, alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ maxWidth: 620 }}>
              <p style={{ ...kicker, marginTop: 0 }}>Footcandle Film Festival · Sept 18–27, 2026</p>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginTop: 6 }}>A festival of unique, challenging, and entertaining films.</h2>
              <p style={{ marginTop: 12, color: '#c9c9d4', lineHeight: 1.6 }}>
                Every September in Western North Carolina — competitive screenings, a 60-hour filmmaking competition, and
                industry symposiums.
              </p>
            </div>
            <a href={FESTIVAL_URL} target="_blank" rel="noopener noreferrer" style={btnPrimary}>Visit the festival</a>
          </div>
        </div>
      </section>

      {/* ── About ── */}
      <section style={{ background: '#0c0c13' }}>
        <div style={{ ...wrap, maxWidth: 820 }}>
          <SectionHead title="What is Footcandle?" />
          <p style={{ color: '#c9c9d4', lineHeight: 1.7, fontSize: 17 }}>
            Footcandle Film Society is a member-supported nonprofit in Catawba County, Western North Carolina. We host monthly
            screenings of documentaries, foreign narratives, and award-nominated movies — each followed by a moderated
            discussion — along with the annual Footcandle Film Festival and a Children's International Film Festival.
            You like movies. So do we.
          </p>
          <Link href="/login" style={{ ...btnGhost, marginTop: 20, display: 'inline-block' }}>Member Login</Link>
        </div>
      </section>

      <Footer />
    </div>
  )
}

// ── Small building blocks ──────────────────────────────────────────────
function Nav() {
  const links = [
    { href: '#community', label: 'Screenings' },
    { href: '#community', label: 'Community' },
    { href: '/login', label: 'Members' },
  ]
  return (
    <nav style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(10px)', background: 'rgba(10,10,15,0.8)', borderBottom: '1px solid #1e1e2b' }}>
      <div style={{ ...wrap, paddingTop: 16, paddingBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', color: '#f4f4f6' }}>
          <span style={{ fontWeight: 800, letterSpacing: '0.14em', fontSize: 15 }}>FOOTCANDLE</span>
          <span style={{ color: '#f0b429', fontWeight: 800, letterSpacing: '0.14em', fontSize: 15 }}> FILM SOCIETY</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
          <a href={FESTIVAL_URL} target="_blank" rel="noopener noreferrer" style={navLink} className="nav-hide">Festival</a>
          <a href={GRANT_URL} target="_blank" rel="noopener noreferrer" style={navLink} className="nav-hide">Grant</a>
          <a href={PODCAST_APPLE} target="_blank" rel="noopener noreferrer" style={navLink} className="nav-hide">Podcast</a>
          <Link href="/login" style={{ ...btnPrimary, padding: '8px 16px', fontSize: 14 }}>Member Login</Link>
        </div>
      </div>
    </nav>
  )
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 26 }}>
      <h2 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 800, letterSpacing: '-0.01em' }}>{title}</h2>
      {sub && <p style={{ marginTop: 8, color: '#9a9aa8', maxWidth: 640, lineHeight: 1.5 }}>{sub}</p>}
    </div>
  )
}

function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer style={{ background: '#08080c', borderTop: '1px solid #1e1e2b' }}>
      <div style={{ ...wrap, display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 800, letterSpacing: '0.14em', fontSize: 15 }}>FOOTCANDLE <span style={{ color: '#f0b429' }}>FILM SOCIETY</span></div>
          <p style={{ marginTop: 10, color: '#8a8a98', fontSize: 14, maxWidth: 320, lineHeight: 1.5 }}>Catawba County, Western North Carolina. You like movies. So do we.</p>
        </div>
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={footHead}>Explore</span>
            <a href={FESTIVAL_URL} target="_blank" rel="noopener noreferrer" style={footLink}>Film Festival</a>
            <a href={GRANT_URL} target="_blank" rel="noopener noreferrer" style={footLink}>Filmmaker Grant</a>
            <a href={PODCAST_APPLE} target="_blank" rel="noopener noreferrer" style={footLink}>Podcast</a>
            <Link href="/login" style={footLink}>Member Login</Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span style={footHead}>Connect</span>
            <a href={FACEBOOK} target="_blank" rel="noopener noreferrer" style={footLink}>Facebook</a>
            <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" style={footLink}>YouTube</a>
            <a href={`mailto:${EMAIL}`} style={footLink}>{EMAIL}</a>
          </div>
        </div>
      </div>
      <div style={{ ...wrap, paddingTop: 0, color: '#5f5f6b', fontSize: 13 }}>© {year} Footcandle Film Society</div>
    </footer>
  )
}

// ── Style tokens (inline for a self-contained server component) ─────────
const wrap: React.CSSProperties = { maxWidth: 1080, margin: '0 auto', padding: '64px 24px' }
const kicker: React.CSSProperties = { textTransform: 'uppercase', letterSpacing: '0.18em', fontSize: 13, fontWeight: 700, color: '#f0b429', marginBottom: 14 }
const grid3: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }
const card: React.CSSProperties = { background: '#15151d', border: '1px solid #262633', borderRadius: 14, padding: 22 }
const emptyBox: React.CSSProperties = { border: '1px dashed #2c2c3a', borderRadius: 12, padding: '32px 20px', color: '#8a8a98', textAlign: 'center' }
const btnPrimary: React.CSSProperties = { background: '#f0b429', color: '#1a1200', fontWeight: 700, padding: '12px 22px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }
const btnGhost: React.CSSProperties = { border: '1px solid #3a3a4a', color: '#f4f4f6', fontWeight: 600, padding: '11px 20px', borderRadius: 8, textDecoration: 'none' }
const navLink: React.CSSProperties = { color: '#c2c2ce', textDecoration: 'none', fontSize: 15 }
const linkText: React.CSSProperties = { color: '#f0b429', textDecoration: 'none', fontWeight: 600 }
const footHead: React.CSSProperties = { color: '#f4f4f6', fontWeight: 700, fontSize: 14, marginBottom: 4 }
const footLink: React.CSSProperties = { color: '#9a9aa8', textDecoration: 'none', fontSize: 14 }
