'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { Heart, LogOut, Bell, Clock, Film } from 'lucide-react'

interface Member {
  id: string
  full_name: string
  email: string
  status: string
  renewal_date: string
  autorenew: boolean
  membership_type: string
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
      const supabase = createClient()

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/')
        return
      }

      // Load member data
      const { data: memberData, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('email', user.email)
        .single()

      if (memberError) {
        throw new Error('Failed to load member data')
      }

      setMember(memberData)

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
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  async function handleRenewal() {
    window.open('https://footcandlemembers.eventive.org/subscriptions', '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (error || !member) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-6">{error || 'Failed to load member data'}</p>
          <button
            onClick={handleLogout}
            className="w-full bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition"
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white py-8">
        <div className="max-w-6xl mx-auto px-4 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome, {member.full_name}!</h1>
            <p className="text-purple-100">Footcandle Film Society</p>
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
        {/* Status Cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Membership Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="text-pink-600" size={24} />
              <h2 className="text-lg font-semibold">Membership Status</h2>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  isExpired
                    ? 'bg-red-100 text-red-800'
                    : 'bg-green-100 text-green-800'
                }`}
              >
                {isExpired ? 'Expired' : 'Active'}
              </span>
              <span className="text-gray-600 text-sm">{member.membership_type}</span>
            </div>
            {member.autorenew && (
              <p className="text-sm text-gray-600 mt-3">Auto-renew: Enabled</p>
            )}
          </div>

          {/* Renewal Date */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Clock className="text-blue-600" size={24} />
              <h2 className="text-lg font-semibold">Renewal Date</h2>
            </div>
            <p className="text-2xl font-bold text-blue-600 mb-2">
              {renewalDate.toLocaleDateString()}
            </p>
            {!isExpired && daysUntilRenewal <= 30 && (
              <p className="text-sm text-orange-600 font-medium">
                Renews in {daysUntilRenewal} days
              </p>
            )}
            {isExpired && (
              <button
                onClick={handleRenewal}
                className="mt-3 w-full bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition text-sm font-medium"
              >
                Renew Now
              </button>
            )}
          </div>

          {/* Attendance Count */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center gap-3 mb-4">
              <Film className="text-purple-600" size={24} />
              <h2 className="text-lg font-semibold">Screenings Attended</h2>
            </div>
            <p className="text-4xl font-bold text-purple-600">{checkIns.length}</p>
            <p className="text-sm text-gray-600 mt-2">lifetime check-ins</p>
          </div>
        </div>

        {/* Film Screenings Section */}
        {filmScreenings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Film size={28} />
              Upcoming Film Screenings
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {filmScreenings.map((film) => (
                <div
                  key={film.id}
                  className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition"
                >
                  {film.poster_url && (
                    <div className="h-64 bg-gray-200 overflow-hidden">
                      <img
                        src={film.poster_url}
                        alt={film.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{film.title}</h3>
                    {film.rating && (
                      <p className="text-sm text-gray-600 mb-2">Rating: {film.rating}</p>
                    )}
                    {film.running_time && (
                      <p className="text-sm text-gray-600 mb-3">Runtime: {film.running_time}</p>
                    )}
                    <p className="text-gray-700 text-sm mb-4">{film.description}</p>

                    {/* Screening Dates */}
                    <div className="border-t pt-4">
                      <h4 className="font-semibold text-gray-900 mb-3">Screening Dates & Times</h4>
                      <div className="space-y-2">
                        {film.screening_dates?.map((date) => (
                          <div key={date.id} className="bg-gray-50 p-3 rounded text-sm">
                            <p className="font-medium text-gray-900">
                              {new Date(date.screening_date).toLocaleDateString('en-US', {
                                weekday: 'short',
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              at {date.screening_time}
                            </p>
                            <p className="text-gray-600">
                              {date.venue} • {date.location_city}
                            </p>
                            {date.address && (
                              <p className="text-gray-500 text-xs">{date.address}</p>
                            )}
                          </div>
                        ))}
                      </div>
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
                  className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600"
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
