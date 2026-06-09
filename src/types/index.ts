export interface Member {
  id: string
  eventive_id: string
  full_name: string
  email: string
  status: 'active' | 'expired' | 'canceled'
  renewal_date: string | null
  autorenew: boolean
  membership_type: string
  updated_at: string
}

export interface Event {
  id: string
  title: string
  date: string
  venue: string | null
  location_city: string | null
  created_at: string
}

export interface CheckIn {
  id: string
  event_id: string
  member_id: string
  checked_in_at: string
}

export interface Announcement {
  id: string
  body: string
  audience: string
  starts_at: string
  expires_at: string | null
  created_by: string
  created_at: string
}
