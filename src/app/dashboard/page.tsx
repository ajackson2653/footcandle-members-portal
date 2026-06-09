'use client'

import { useEffect, useState } from 'react'
import { supabase, getCurrentUser, signOut } from '@/lib/supabase'
import type { Member, Event, CheckIn, Announcement } from '@/types'
import { LogOut, Calendar, Heart, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  const [member, setMember] = useState<Member | null>(null)
  const [attendance, setAttendance] = useState<CheckIn[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [nextScreening, setNextScreening] = useState<Event | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const user = await getCurrentUser()
        if (!user?.email) {
          window.location.href = '/'
          return
        }

        // Load member data
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('*')
          .eq('email', user.email)
          .single()

        if (memberError) throw memberError
        setMember(memberData)

        // Load attendance history
        if (memberData?.id) {
          const { data: attendanceData } = await supabase
            .from('checkins')
            .select('*')
            .eq('member_id', memberData.id)
            .order('checked_in_at', { ascending: false })
          
          setAttendance(attendanceData || [])

          // Load events to match against attendance
          const { data: eventsData } = await supabase
            .from('events')
            .select('*')
            .order('date', { ascending: false })
          
          setEvents(eventsData || [])

          // Find next screening
          const today = new Date().toISOString().split('T')[0]
          const future = eventsData?.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0]
          setNextScreening(future || null)
        }

        // Load announcements
        const { data: announcementsData } = await supabase
          .from('admin_notes')
          .select('*')
          .eq('audience', 'all')
          .order('created_at', { ascending: false })
          .limit(5)
        
        setAnnouncements(announcementsData || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard')
      } finally {
        setLoading(false)
      }
    }

    loadDashboard()
  }, [])

  const attendedEventIds = new Set(attendance.map(a => a.event_id))
  const attendanceCount = attendance.length

  if (loading) {
    return <div style={styles.loadingContainer}>Loading your membership...</div>
  }

  if (!member) {
    return <div style={styles.error}>Failed to load member data</div>
  }

  const renewalDate = member.renewal_date ? new Date(member.renewal_date).toLocaleDateString() : 'N/A'
  const daysUntilRenewal = member.renewal_date 
    ? Math.ceil((new Date(member.renewal_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1>Footcandle Film Society</h1>
          <p>Members Portal</p>
        </div>
        <button
          onClick={() => {
            signOut()
            window.location.href = '/'
          }}
          style={styles.logoutBtn}
        >
          <LogOut size={16} />
          Log Out
        </button>
      </header>

      <main style={styles.main}>
        {/* Welcome Section */}
        <div style={styles.card}>
          <h2>Welcome, {member.full_name}!</h2>
          <p style={styles.memberInfo}>
            {member.email} • Member since registration
          </p>
        </div>

        {/* Status Cards Grid */}
        <div style={styles.cardGrid}>
          {/* Status Card */}
          <div style={styles.statusCard}>
            <div style={styles.statusBadge}>
              <span style={member.status === 'active' ? styles.badgeActive : styles.badgeExpired}>
                {member.status.toUpperCase()}
              </span>
            </div>
            <p style={styles.cardLabel}>Membership Status</p>
            <p style={styles.cardValue}>{member.status === 'active' ? '✓ Active' : 'Needs Renewal'}</p>
          </div>

          {/* Renewal Card */}
          <div style={styles.statusCard}>
            <div style={styles.iconContainer}>
              <Calendar size={24} />
            </div>
            <p style={styles.cardLabel}>Renewal Date</p>
            <p style={styles.cardValue}>{renewalDate}</p>
            {daysUntilRenewal !== null && daysUntilRenewal > 0 && (
              <p style={styles.cardSmall}>{daysUntilRenewal} days away</p>
            )}
          </div>

          {/* AutoRenew Card */}
          <div style={styles.statusCard}>
            <div style={styles.iconContainer}>
              <Heart size={24} style={{ color: member.autorenew ? '#10b981' : '#d1d5db' }} />
            </div>
            <p style={styles.cardLabel}>Auto-Renew</p>
            <p style={styles.cardValue}>{member.autorenew ? 'Enabled ✓' : 'Disabled'}</p>
          </div>

          {/* Attendance Card */}
          <div style={styles.statusCard}>
            <div style={styles.iconContainer}>
              <TrendingUp size={24} />
            </div>
            <p style={styles.cardLabel}>Screenings Attended</p>
            <p style={styles.cardValue}>{attendanceCount}</p>
          </div>
        </div>

        {/* Next Screening */}
        {nextScreening && (
          <div style={styles.card}>
            <h3>Next Upcoming Screening</h3>
            <div style={styles.screeningInfo}>
              <p style={styles.screeningTitle}>{nextScreening.title}</p>
              <p style={styles.screeningDetails}>
                📅 {new Date(nextScreening.date).toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              {nextScreening.venue && (
                <p style={styles.screeningDetails}>
                  📍 {nextScreening.venue}
                  {nextScreening.location_city && ` • ${nextScreening.location_city}`}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Admin Announcements */}
        {announcements.length > 0 && (
          <div style={styles.card}>
            <h3>📢 Announcements</h3>
            {announcements.map(ann => (
              <div key={ann.id} style={styles.announcement}>
                <p>{ann.body}</p>
                <p style={styles.announcementDate}>
                  {new Date(ann.created_at).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Renewal Link */}
        {member.status !== 'active' && (
          <div style={{...styles.card, ...styles.renewalCard}}>
            <h3>Renew Your Membership</h3>
            <p>Your membership has expired. Renew now to maintain your access to screenings.</p>
            <a
              href="https://footcandlemembers.eventive.org/subscriptions"
              target="_blank"
              rel="noopener noreferrer"
              style={styles.renewButton}
            >
              Renew on Eventive →
            </a>
          </div>
        )}

        {/* Attendance History */}
        <div style={styles.card}>
          <h3>Your Attendance History</h3>
          {attendance.length === 0 ? (
            <p style={styles.noData}>No check-ins yet. See you at the next screening!</p>
          ) : (
            <div style={styles.attendanceList}>
              {attendance.slice(0, 10).map(checkin => {
                const event = events.find(e => e.id === checkin.event_id)
                return (
                  <div key={checkin.id} style={styles.attendanceItem}>
                    <div>
                      <p style={styles.itemTitle}>{event?.title || 'Unknown Film'}</p>
                      <p style={styles.itemDetails}>
                        {event?.date && new Date(event.date).toLocaleDateString()} 
                        {event?.venue && ` • ${event.venue}`}
                      </p>
                    </div>
                    <p style={styles.itemCheck}>✓</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f9fafb'
  },
  header: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '40px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerContent: {
    flex: 1
  },
  main: {
    maxWidth: '900px',
    margin: '-20px auto 40px',
    padding: '0 20px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  statusCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    textAlign: 'center' as const,
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  },
  statusBadge: {
    marginBottom: '12px'
  },
  badgeActive: {
    background: '#d1fae5',
    color: '#065f46',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  badgeExpired: {
    background: '#fee2e2',
    color: '#7f1d1d',
    padding: '6px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '600' as const
  },
  iconContainer: {
    fontSize: '28px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'center'
  },
  cardLabel: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px'
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: '700' as const,
    color: '#1f2937'
  },
  cardSmall: {
    fontSize: '11px',
    color: '#9ca3af',
    marginTop: '4px'
  },
  screeningInfo: {
    marginTop: '16px',
    paddingTop: '16px',
    borderTop: '1px solid #e5e7eb'
  },
  screeningTitle: {
    fontSize: '18px',
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '8px'
  },
  screeningDetails: {
    fontSize: '14px',
    color: '#4b5563',
    marginBottom: '4px'
  },
  renewalCard: {
    background: 'linear-gradient(135deg, #fef08a 0%, #fed7aa 100%)',
    borderLeft: '4px solid #ca8a04'
  },
  renewButton: {
    display: 'inline-block',
    marginTop: '12px',
    padding: '10px 20px',
    background: '#ca8a04',
    color: 'white',
    borderRadius: '6px',
    textDecoration: 'none',
    fontWeight: '600' as const
  },
  announcement: {
    padding: '12px',
    background: '#f3f4f6',
    borderRadius: '6px',
    marginBottom: '12px',
    borderLeft: '4px solid #2563eb'
  },
  announcementDate: {
    fontSize: '12px',
    color: '#9ca3af',
    marginTop: '8px'
  },
  attendanceList: {
    marginTop: '16px'
  },
  attendanceItem: {
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottom: '1px solid #e5e7eb'
  },
  itemTitle: {
    fontWeight: '600' as const,
    color: '#1f2937',
    marginBottom: '4px'
  },
  itemDetails: {
    fontSize: '13px',
    color: '#6b7280'
  },
  itemCheck: {
    color: '#10b981',
    fontWeight: '700' as const
  },
  memberInfo: {
    color: '#6b7280',
    marginTop: '4px'
  },
  noData: {
    color: '#9ca3af',
    fontStyle: 'italic' as const
  },
  loadingContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#6b7280'
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '18px',
    color: '#dc2626'
  },
  logoutBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  }
}
