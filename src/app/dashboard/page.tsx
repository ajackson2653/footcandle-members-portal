'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Heart, LogOut, Bell, Film } from 'lucide-react'

function fmtTime(t?: string | null) {
  if (!t) return ''
  const [h, m] = t.split(':')
  return `${((+h + 11) % 12) + 1}:${m} ${+h >= 12 ? 'PM' : 'AM'}`
}

interface Member {
  id: string
  full_name: string
  email: string
  status: string
  renewal_date: string
  autorenew: boolean
  membership_type: string
  stripe_customer_id?: string | null
}

interface ScreeningDate {
  id: string
  screening_date: string
  screening_time: string
  venue: string
  location_city: string
  address: string
}

interface FilmScreening {
  id: string
  title: string
  description: string
  poster_url: string
  rating: string
  running_time: string
  about_film: string
  screening_dates: ScreeningDate[]
}

interface Announcement {
  id: string
  body: string
  created_at: string
}

interface CheckIn {
  id: string
  event_id: string
  checked_in_at: string
  event?: {
    title: string
    date: string
    venue: string
    location_city: string
  }
}

export default function Dashboard() {
  const router = useRouter()
  const [member, setMember] = useState<Member | null>(null)
  const [household, setHousehold] = useState<Member[]>([])
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [filmScreenings, setFilmScreenings] = useState<FilmScreening[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Load member data. Households can share one email (up to 4 people),
      // so fetch all matching rows and use the one with the furthest renewal
      // date (preferring an active membership) as the primary.
      const { data: memberRows, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('email', user.email)
        .order('renewal_date', { ascending: false })

      if (memberError || !memberRows || memberRows.length === 0) {
        throw new Error('We could not find a membership for this email address.')
      }

      const memberData = memberRows.find((m: any) => m.status === 'active') || memberRows[0]
      setMember(memberData)
      setHousehold(memberRows)

      // Load check-ins with event details
      const { data: checkInData } = await supabase
        .from('checkins')
        .select(`
          id,
          event_id,
          checked_in_at,
          events:event_id(id, title, date, venue, location_city)
        `)
        .eq('member_id', memberData.id)
        .order('checked_in_at', { ascending: false })
        .limit(10)

      if (checkInData) {
        setCheckIns(checkInData as any)
      }

      // Load published film screenings
      const { data: screeningData } = await supabase
        .from('film_screenings')
        .select(`
          id,
          title,
          description,
          poster_url,
          rating,
          running_time,
          about_film,
          screening_dates(
            id,
            screening_date,
            screening_time,
            venue,
            location_city,
            address
          )
        `)
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (screeningData) {
        setFilmScreenings(screeningData as any)
      }

      // Load active announcements
      const { data: announcementData } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('published', true)
        .order('created_at', { ascending: false })

      if (announcementData) {
        setAnnouncements(announcementData as any)
      }

      setLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setLoading(false)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  function handleRenewal() {
    router.push('/renew')
  }

  const [billingBusy, setBillingBusy] = useState(false)
  async function manageBilling() {
    setBillingBusy(true)
    try {
      const { data } = await supabase.auth.getSession()
      const res = await fetch('/api/billing-portal', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.url) throw new Error(json.error || 'Could not open billing management')
      window.location.href = json.url
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Something went wrong')
      setBillingBusy(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-tint to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-brand-tint to-white flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Failed to load member data'}</p>
          <button
            onClick={handleLogout}
            className="w-full bg-brand text-white px-4 py-2 rounded-lg hover:bg-brand-dark transition"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  const renewalDate = new Date(member.renewal_date)
  const today = new Date()
  const daysUntilRenewal = Math.ceil(
    (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  )
  const isExpired = daysUntilRenewal < 0

  // Show films that still have an upcoming date; each rolls off once its last
  // screening passes. Sort films by their soonest upcoming date.
  const todayStr = new Date().toISOString().slice(0, 10)
  const upcomingFilms = filmScreenings
    .map((f) => ({
      film: f,
      dates: (f.screening_dates || [])
        .filter((d) => d.screening_date >= todayStr)
        .sort((a, b) => (a.screening_date + (a.screening_time || '')).localeCompare(b.screening_date + (b.screening_time || ''))),
    }))
    .filter((x) => x.dates.length > 0)
    .sort((a, b) => a.dates[0].screening_date.localeCompare(b.dates[0].screening_date))

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-tint to-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-brand to-brand-dark text-white py-8">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {member.full_name}!</h1>
            <p className="text-blue-100">Footcandle Film Society</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 text-white px-6 py-2 rounded-lg transition flex items-center gap-2"
          >
            <LogOut size={20} />
            Log Out
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Big, obvious renewal call-to-action when expired */}
        {isExpired && (
          <div className="bg-white border-2 border-red-200 rounded-2xl p-6 md:p-8 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Your membership has expired</h2>
              <p className="text-lg text-gray-600 mt-1">Renew now to keep enjoying Footcandle screenings.</p>
            </div>
            <button
              onClick={handleRenewal}
              className="bg-brand text-white text-lg font-bold px-8 py-4 rounded-xl hover:bg-brand-dark transition whitespace-nowrap"
            >
              Renew Your Membership →
            </button>
          </div>
        )}

        {/* Status Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-8">
          {/* Membership Status */}
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Heart className="text-pink-600" size={24} />
              <h2 className="text-lg font-semibold">Membership Status</h2>
            </div>
            <span
              className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
                isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
              }`}
            >
              {isExpired ? 'Expired' : 'Active'}
            </span>
            <p className="text-gray-700 mt-3">
              {isExpired ? 'Expired ' : 'Renews '}
              {renewalDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            {!isExpired && daysUntilRenewal <= 30 && (
              <p className="text-sm text-orange-600 font-medium mt-1">Renews in {daysUntilRenewal} days</p>
            )}
            {member.autorenew && (
              <p className="text-sm text-gray-600 mt-2">Renews automatically each year</p>
            )}
            {household.length > 1 && (
              <p className="text-sm text-gray-600 mt-2">Covers: {household.map((m) => m.full_name).join(', ')}</p>
            )}
            {member.stripe_customer_id && (
              <button
                onClick={manageBilling}
                disabled={billingBusy}
                className="mt-4 text-sm text-brand font-semibold underline hover:text-brand-dark disabled:opacity-60"
              >
                {billingBusy ? 'Opening…' : 'Manage payment & auto-renewal'}
              </button>
            )}
          </div>

          {/* Renew Membership */}
          <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center text-center">
            <h2 className="text-lg font-semibold mb-4">Renew Membership</h2>
            <button
              onClick={handleRenewal}
              className="bg-brand text-white text-lg font-bold px-8 py-4 rounded-xl hover:bg-brand-dark transition"
            >
              Renew Now →
            </button>
          </div>
        </div>

        {/* Film Screenings Section — poster left, dates right; chronological */}
        {upcomingFilms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Film size={28} />
              Upcoming Film Screenings
            </h2>
            <div className="space-y-6">
              {upcomingFilms.map(({ film, dates }) => (
                <div key={film.id} className="bg-white rounded-lg shadow p-5 flex gap-5">
                  {film.poster_url && (
                    <img
                      src={film.poster_url}
                      alt={film.title}
                      className="w-28 md:w-40 h-auto rounded object-contain flex-none self-start"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="text-xl font-bold text-gray-900">{film.title}</h3>
                    {(film.rating || film.running_time) && (
                      <p className="text-sm text-gray-600 mt-1 mb-3">
                        {[film.rating, film.running_time].filter(Boolean).join(' · ')}
                      </p>
                    )}
                    <h4 className="font-semibold text-gray-900 mb-2">Screening Dates &amp; Times</h4>
                    <div className="space-y-2">
                      {dates.map((date) => (
                        <div key={date.id} className="bg-gray-50 p-3 rounded text-sm">
                          <p className="font-medium text-gray-900">
                            {new Date(date.screening_date + 'T00:00:00Z').toLocaleDateString('en-US', {
                              weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC',
                            })}
                            {date.screening_time ? ` at ${fmtTime(date.screening_time)}` : ''}
                          </p>
                          <p className="text-gray-600">{[date.venue, date.location_city].filter(Boolean).join(' • ')}</p>
                          {date.address && <p className="text-gray-500 text-xs">{date.address}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Announcements Section */}
        {announcements.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Bell size={28} />
              Announcements
            </h2>
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-brand"
                >
                  <p className="text-gray-800 whitespace-pre-wrap">{ann.body}</p>
                  <p className="text-sm text-gray-500 mt-3">
                    {new Date(ann.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Check-ins */}
        {checkIns.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Recent Check-ins</h2>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="text-left px-6 py-3 font-semibold text-gray-900">
                        Screening
                      </th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-900">Date</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-900">Venue</th>
                      <th className="text-left px-6 py-3 font-semibold text-gray-900">
                        Checked In
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {checkIns.map((checkIn) => (
                      <tr key={checkIn.id} className="border-b hover:bg-gray-50">
                        <td className="px-6 py-3 text-gray-900">
                          {checkIn.event?.title || 'Unknown'}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {checkIn.event?.date
                            ? new Date(checkIn.event.date).toLocaleDateString()
                            : 'N/A'}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {checkIn.event?.venue} • {checkIn.event?.location_city}
                        </td>
                        <td className="px-6 py-3 text-gray-600">
                          {new Date(checkIn.checked_in_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
