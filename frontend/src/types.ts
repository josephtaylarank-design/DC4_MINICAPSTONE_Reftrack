export type Role = 'admin' | 'referee'
export type AssignmentStatus = 'pending' | 'accepted' | 'declined' | 'completed'

export interface RefereeProfile {
  license_level: string
  phone: string | null
  years_experience: number
  status: 'active' | 'inactive'
}

export interface User {
  id: number
  name: string
  email: string
  role: Role
  referee_profile?: RefereeProfile
}

export interface Venue {
  id: number
  name: string
  address: string
  court_count: number
  is_active: boolean
  games_count?: number
}

export interface Assignment {
  id: number
  game_id: number
  referee_id: number
  position: string
  status: AssignmentStatus
  fee: string | null
  responded_at: string | null
  completed_at: string | null
  game?: Pick<Game, 'id' | 'home_team' | 'away_team' | 'category' | 'starts_at' | 'ends_at' | 'status'> & { venue: string | null }
  referee?: { id: number; name: string; license_level: string | null }
}

export interface Game {
  id: number
  home_team: string
  away_team: string
  category: string
  starts_at: string
  ends_at: string
  status: 'scheduled' | 'completed' | 'cancelled'
  referee_slots: number
  notes: string | null
  venue: Venue
  assignments_count?: number
  assignments?: Assignment[]
}

export interface Referee {
  id: number
  name: string
  email: string
  role: Role
  profile: RefereeProfile | null
  assignments_count: number
}

export interface Availability {
  id: number
  starts_at: string
  ends_at: string
  is_available: boolean
  notes: string | null
}

export interface Pagination<T> {
  data: T[]
  links: { first: string | null; last: string | null; prev: string | null; next: string | null }
  meta: { current_page: number; last_page: number; per_page: number; total: number }
}

export interface AuthResponse {
  message: string
  token: string
  user: User
}

export interface DashboardResponse {
  role: Role
  summary: Record<string, number>
  games_needing_referees?: Game[]
  upcoming_assignments?: Assignment[]
}
