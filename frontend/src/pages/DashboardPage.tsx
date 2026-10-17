import { useEffect, useState } from 'react'
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Clock3, MapPin, Plus, Users, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { EmptyState, ErrorBanner, formatDate, formatTime, PageHeader, Spinner, StatusBadge } from '../components/common'
import { useAuth } from '../contexts/AuthContext'
import { apiRequest, ApiError } from '../lib/api'
import type { Assignment, DashboardResponse } from '../types'

export function DashboardPage() {
  const { user } = useAuth()
  const [data, setData] = useState<DashboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    apiRequest<DashboardResponse>('/dashboard')
      .then(setData)
      .catch((reason: unknown) => setError(reason instanceof ApiError ? reason.message : 'Unable to load your dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Spinner label="Loading dashboard" />
  if (error) return <ErrorBanner message={error} />
  if (!data) return null

  const isAdmin = user?.role === 'admin'
  const greeting = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  return (
    <>
      <PageHeader title={`Good ${getDayPart()}, ${user?.name.split(' ')[0]}.`} description={`${greeting} · Here’s your season at a glance.`}
        action={isAdmin ? <Link className="button button-primary" to="/admin/games/new"><Plus size={17} /> Schedule a game</Link> : undefined} />
      {isAdmin ? <AdminDashboard data={data} /> : <RefereeDashboard data={data} />}
    </>
  )
}

function AdminDashboard({ data }: { data: DashboardResponse }) {
  const summary = data.summary
  const games = data.games_needing_referees ?? []
  const stats = [
    { label: 'Games this month', value: summary.games_this_month ?? 0, icon: CalendarDays, color: 'lavender', note: 'Scheduled this month' },
    { label: 'Need officials', value: summary.short_staffed_games ?? 0, icon: Users, color: 'peach', note: 'Upcoming games' },
    { label: 'Awaiting response', value: summary.pending_assignments ?? 0, icon: Clock3, color: 'blue', note: 'Pending assignments' },
    { label: 'Active referees', value: summary.active_referees ?? 0, icon: UserRoundCheck, color: 'mint', note: 'Ready for assignment' },
  ]

  return (
    <>
      <section className="stat-grid">
        {stats.map(({ label, value, icon: Icon, color, note }) => <article className="stat-card" key={label}>
          <div className="stat-top"><span>{label}</span><span className={`stat-icon stat-${color}`}><Icon size={19} /></span></div>
          <strong className="stat-value">{value}</strong><span className="stat-note">{note}</span>
        </article>)}
      </section>
      <section className="panel dashboard-panel">
        <div className="panel-heading"><div><h2>Games needing officials</h2><p>Upcoming matchups that still need coverage.</p></div><Link className="text-link" to="/games">All games <ArrowRight size={15} /></Link></div>
        {games.length ? <div className="table-scroll"><table><thead><tr><th>Matchup</th><th>Date & time</th><th>Venue</th><th>Officials</th><th>Status</th><th /></tr></thead><tbody>
          {games.map((game) => <tr key={game.id}><td><strong>{game.home_team} <span className="muted">vs</span> {game.away_team}</strong><small>{game.category}</small></td><td>{formatDate(game.starts_at)}<small>{formatTime(game.starts_at)}</small></td><td><span className="inline-icon"><MapPin size={14} />{game.venue?.name ?? '—'}</span></td><td><span className="coverage-number">{game.assignments_count ?? 0}<span> / {game.referee_slots}</span></span></td><td><StatusBadge status={game.status} /></td><td><Link className="table-link" to={`/games/${game.id}`}>Review <ArrowRight size={14} /></Link></td></tr>)}
        </tbody></table></div> : <EmptyState title="All games are covered" detail="Newly scheduled games will appear here if they need referees." />}
      </section>
      <div className="dashboard-footnote"><span><CheckCircle2 size={16} /> {summary.completed_assignments ?? 0} assignments completed</span><Link to="/admin/referees">Manage referees <ArrowRight size={14} /></Link></div>
    </>
  )
}

function RefereeDashboard({ data }: { data: DashboardResponse }) {
  const upcoming = data.upcoming_assignments ?? []
  return (
    <>
      <section className="stat-grid referee-stats">
        <article className="stat-card"><div className="stat-top"><span>Upcoming games</span><span className="stat-icon stat-lavender"><CalendarDays size={19} /></span></div><strong className="stat-value">{data.summary.upcoming_assignments ?? 0}</strong><span className="stat-note">On your schedule</span></article>
        <article className="stat-card"><div className="stat-top"><span>Need your response</span><span className="stat-icon stat-peach"><ClipboardList size={19} /></span></div><strong className="stat-value">{data.summary.pending_responses ?? 0}</strong><span className="stat-note">Pending invitations</span></article>
        <article className="stat-card welcome-stat"><span className="welcome-kicker">OFFICIALS MAKE THE GAME</span><strong>Ready for<br />the next tip-off?</strong><Link to="/availability">Update your availability <ArrowRight size={15} /></Link></article>
      </section>
      <section className="panel dashboard-panel">
        <div className="panel-heading"><div><h2>Your upcoming assignments</h2><p>Know where to be and when.</p></div><Link className="text-link" to="/my-assignments">View all <ArrowRight size={15} /></Link></div>
        {upcoming.length ? <div className="table-scroll"><table><thead><tr><th>Matchup</th><th>Date & time</th><th>Venue</th><th>Position</th><th>Status</th></tr></thead><tbody>
          {upcoming.map((assignment: Assignment) => <tr key={assignment.id}><td><strong>{assignment.game?.home_team} <span className="muted">vs</span> {assignment.game?.away_team}</strong><small>{assignment.game?.category}</small></td><td>{assignment.game && formatDate(assignment.game.starts_at)}<small>{assignment.game && formatTime(assignment.game.starts_at)}</small></td><td><span className="inline-icon"><MapPin size={14} />{assignment.game?.venue ?? '—'}</span></td><td>{assignment.position}</td><td><StatusBadge status={assignment.status} /></td></tr>)}
        </tbody></table></div> : <div className="assignment-empty">No assignments yet. Set your availability so assigners can invite you.</div>}
      </section>
    </>
  )
}

function getDayPart() {
  const hour = new Date().getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  return 'evening'
}
