export interface Member {
  id: string
  eventive_id: string | null
  full_name: string
  first_name: string | null
  last_name: string | null
  email: string | null
  status: 'active' | 'expired' | 'canceled' | null
  renewal_date: string | null
  expired_date: string | null
  autorenew: boolean
  membership_type: string | null
  updated_at: string
}

export interface CommunityEvent {
  id: string
  title: string
  description: string | null
  poster_url: string | null
  event_date: string
  event_time: string | null
  venue: string | null
  location_city: string | null
  address: string | null
  host_org: string | null
  link_url: string | null
  published: boolean
  created_at: string
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
