// Public Filmmaker Grant Program page — rebuilt on the new site at the same
// URL path the old WordPress page used, so existing links keep working.
import Link from 'next/link'

export const metadata = { title: 'Filmmaker Grant Program — Footcandle Film Society' }

const BRAND = '#2a5680'
const INK = '#1f2937'
const MUTED = '#5b6472'
const TINT = '#eef3f8'
// TODO: swap this for the current Google Form application link when available.
const APPLY_URL = 'mailto:info@footcandle.org?subject=Footcandle%20Filmmaker%20Grant'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 34 }}>
      <h2 style={{ fontSize: 22, fontWeight: 800, color: INK }}>{title}</h2>
      <div style={{ marginTop: 12, color: '#374151', lineHeight: 1.7 }}>{children}</div>
    </div>
  )
}
function List({ items }: { items: string[] }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}><span style={{ color: BRAND, fontWeight: 800, flex: 'none' }}>•</span><span>{t}</span></li>
      ))}
    </ul>
  )
}

export default function GrantPage() {
  return (
    <div style={{ background: '#fff', color: INK, minHeight: '100vh' }}>
      <nav style={{ borderBottom: '1px solid #e6eaef' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 24px' }}>
          <Link href="/"><img src="/footcandle-logo.png" alt="Footcandle Film Society" style={{ height: 66, width: 'auto', display: 'block' }} /></Link>
        </div>
      </nav>

      <section style={{ background: `linear-gradient(180deg, ${TINT}, #fff)` }}>
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '48px 24px 36px' }}>
          <Link href="/" style={{ color: BRAND, fontWeight: 600, textDecoration: 'none', fontSize: 14 }}>← Back to home</Link>
          <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', marginTop: 16 }}>Footcandle Filmmaker Grant Program</h1>
          <p style={{ marginTop: 14, fontSize: 18, color: '#374151', lineHeight: 1.6 }}>
            The Footcandle Film Society provides development funding to film projects that advance filmmaking as a
            storytelling medium — with the majority of their production taking place in North Carolina.
          </p>
          <div style={{ marginTop: 20, display: 'inline-block', background: '#fff', border: `1.5px solid ${BRAND}`, borderRadius: 12, padding: '14px 20px' }}>
            <div style={{ fontSize: 13, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 700 }}>Award</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: BRAND }}>Up to $10,000 per cycle</div>
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '10px 24px 72px' }}>
        <Section title="Key dates (2026 cycle)">
          <List items={[ 'Applications open: April 15', 'Application deadline: June 30', 'Notification: no later than August 30' ]} />
        </Section>

        <Section title="Eligibility">
          <List items={[
            'At least 51% of production work (writing, filming, editing, post-production) must take place in North Carolina',
            'Single film projects only (not series) — any length or format: live-action, documentary, or animated',
            'Applicants 18+ with prior film/TV experience in principal roles, or working alongside an experienced filmmaker',
            'Non-student films only',
            'Applicant must own the copyright and keep artistic, budgetary, and editorial control (no work-for-hire)',
          ]} />
        </Section>

        <Section title="Guidelines">
          <List items={[
            'Projects are expected to be completed within two years of funding',
            'Funds are issued as reimbursement or for upcoming expenses (proof required)',
            'A Tax ID or Social Security Number is required to receive funds',
            'Films may not further hate speech or negative stereotypes',
            'Please credit the Footcandle Film Society in your closing credits',
          ]} />
        </Section>

        <Section title="How to apply">
          <p>Complete the application form, or reach out with any questions at <a href="mailto:info@footcandle.org" style={{ color: BRAND, fontWeight: 600 }}>info@footcandle.org</a>.</p>
          <a href={APPLY_URL} style={{ display: 'inline-block', marginTop: 18, background: BRAND, color: '#fff', fontWeight: 700, padding: '13px 26px', borderRadius: 9, textDecoration: 'none' }}>Apply for the grant</a>
        </Section>
      </div>
    </div>
  )
}
