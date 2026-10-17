import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, Check, ChevronDown, Clock3, MapPin, Pencil, Plus, Trash2, UserPlus, X } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ConfirmDialog, EmptyState, ErrorBanner, FieldError, formatDate, formatTime, PageHeader, Spinner, StatusBadge } from '../components/common'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ApiError, get, patch, post, put, remove } from '../lib/api'
import type { Assignment, Game, Pagination, Referee, Venue } from '../types'

interface GameForm {
  venue_id: string
  home_team: string
  away_team: string
  category: string
  starts_at: string
  ends_at: string
  referee_slots: string
  notes: string
}

const blankGame: GameForm = { venue_id: '', home_team: '', away_team: '', category: '', starts_at: '', ends_at: '', referee_slots: '3', notes: '' }
const emptyFilters = { search: '', status: '', category: '', venue_id: '', date: '' }

export function GamesPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const [games, setGames] = useState<Pagination<Game> | null>(null)
  const [venues, setVenues] = useState<Venue[]>([])
  const [filters, setFilters] = useState(emptyFilters)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState<Game | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (currentPage: number, activeFilters: typeof emptyFilters) => {
    setLoading(true)
    setError('')
    const query = new URLSearchParams()
    Object.entries(activeFilters).forEach(([key, value]) => { if (value) query.set(key, value) })
    query.set('page', String(currentPage))
    try {
      const response = await get<Pagination<Game>>(`/games?${query.toString()}`)
      setGames(response)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load games.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(1, emptyFilters)
    get<{ data: Venue[] }>('/venues').then((response) => setVenues(response.data)).catch(() => setVenues([]))
  }, [load])

  async function deleteGame() {
    if (!deleting) return
    setBusy(true)
    try {
      await remove(`/games/${deleting.id}`)
      notify('success', 'Game deleted.')
      setDeleting(null)
      await load(page, filters)
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'Could not delete this game.')
    } finally {
      setBusy(false)
    }
  }

  function applyFilters(event: FormEvent) {
    event.preventDefault()
    setPage(1)
    void load(1, filters)
  }

  return (
    <>
      <PageHeader title="Games" description="Browse scheduled matchups, venues, and officiating crews."
        action={user?.role === 'admin' ? <Link to="/admin/games/new" className="button button-primary"><Plus size={17} /> New game</Link> : undefined} />
      <section className="panel filter-panel">
        <form className="filter-form" onSubmit={applyFilters}>
          <label className="search-box"><span className="sr-only">Search teams</span><input value={filters.search} placeholder="Search teams or category..." onChange={(event) => setFilters({ ...filters, search: event.target.value })} /><span className="search-glyph">⌕</span></label>
          <label className="select-wrap"><span className="sr-only">Status</span><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option><option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><ChevronDown size={14} /></label>
          <label className="select-wrap"><span className="sr-only">Category</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option><option>U18</option><option>U16</option><option>Open</option></select><ChevronDown size={14} /></label>
          <label className="select-wrap"><span className="sr-only">Venue</span><select value={filters.venue_id} onChange={(event) => setFilters({ ...filters, venue_id: event.target.value })}><option value="">All venues</option>{venues.map((venue) => <option value={venue.id} key={venue.id}>{venue.name}</option>)}</select><ChevronDown size={14} /></label>
          <label className="date-filter"><CalendarDays size={15} /><input aria-label="Filter by date" type="date" value={filters.date} onChange={(event) => setFilters({ ...filters, date: event.target.value })} /></label>
          <button className="button button-secondary" type="submit">Apply filters</button>
        </form>
      </section>

      <section className="panel table-panel">
        <div className="table-panel-heading"><div><strong>All games</strong><span>{games?.meta.total ?? 0} matchups</span></div><span className="results-count">Showing 10 per page</span></div>
        {error ? <ErrorBanner message={error} /> : loading ? <Spinner label="Loading games" /> : !games?.data.length ? <EmptyState title="No games found" detail="Try a different search or clear the filters." /> : <>
          <div className="table-scroll"><table><thead><tr><th>Matchup</th><th>Date & time</th><th>Venue</th><th>Status</th><th>Officials</th><th className="align-right">Actions</th></tr></thead><tbody>
            {games.data.map((game) => <tr key={game.id}>
              <td><strong>{game.home_team} <span className="muted">vs</span> {game.away_team}</strong><small>{game.category}</small></td>
              <td>{formatDate(game.starts_at)}<small>{formatTime(game.starts_at)}–{formatTime(game.ends_at)}</small></td>
              <td><span className="inline-icon"><MapPin size={14} />{game.venue?.name ?? '—'}</span></td>
              <td><StatusBadge status={game.status} /></td>
              <td><span className={`coverage-pill ${(game.assignments_count ?? 0) < game.referee_slots ? 'coverage-needed' : ''}`}>{game.assignments_count ?? 0} / {game.referee_slots}</span></td>
              <td><div className="table-actions"><Link to={`/games/${game.id}`} className="small-action">View</Link>{user?.role === 'admin' && <><Link to={`/admin/games/${game.id}/edit`} aria-label="Edit game" className="icon-button"><Pencil size={15} /></Link><button aria-label="Delete game" className="icon-button icon-danger" onClick={() => setDeleting(game)}><Trash2 size={15} /></button></>}</div></td>
            </tr>)}
          </tbody></table></div>
          <PaginationBar current={games.meta.current_page} last={games.meta.last_page} onChange={(nextPage) => { setPage(nextPage); void load(nextPage, filters) }} />
        </>}
      </section>
      {deleting && <ConfirmDialog title="Delete this game?" detail={`${deleting.home_team} vs ${deleting.away_team} and its assignments will be permanently removed.`} onCancel={() => setDeleting(null)} onConfirm={deleteGame} busy={busy} />}
    </>
  )
}

export function GameFormPage() {
  const { gameId } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()
  const [venues, setVenues] = useState<Venue[]>([])
  const [form, setForm] = useState<GameForm>(blankGame)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(Boolean(gameId))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    get<{ data: Venue[] }>('/venues').then((response) => setVenues(response.data)).catch(() => setVenues([]))
    if (gameId) get<{ data: Game }>(`/games/${gameId}`).then(({ data }) => setForm({
      venue_id: String(data.venue?.id ?? ''),
      home_team: data.home_team,
      away_team: data.away_team,
      category: data.category,
      starts_at: toDateTimeInput(data.starts_at),
      ends_at: toDateTimeInput(data.ends_at),
      referee_slots: String(data.referee_slots),
      notes: data.notes ?? '',
    })).catch(() => notify('error', 'Unable to load this game.')).finally(() => setLoading(false))
  }, [gameId, notify])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const nextErrors: Record<string, string[]> = {}
    if (!form.venue_id) nextErrors.venue_id = ['Choose a venue.']
    if (!form.home_team.trim()) nextErrors.home_team = ['Home team is required.']
    if (!form.away_team.trim()) nextErrors.away_team = ['Away team is required.']
    if (!form.category.trim()) nextErrors.category = ['Category is required.']
    if (!form.starts_at || new Date(form.starts_at).getTime() <= Date.now()) nextErrors.starts_at = ['Choose a future date and time.']
    if (!form.ends_at || (form.starts_at && new Date(form.ends_at) <= new Date(form.starts_at))) nextErrors.ends_at = ['End time must be after the start.']
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const payload = {
      ...form,
      starts_at: new Date(form.starts_at).toISOString(),
      ends_at: new Date(form.ends_at).toISOString(),
      referee_slots: Number(form.referee_slots),
    }
    setBusy(true)
    try {
      const response = gameId ? await put<{ data: Game }>(`/games/${gameId}`, payload) : await post<{ data: Game }>('/games', payload)
      notify('success', gameId ? 'Game details updated.' : 'Game scheduled.')
      navigate(`/games/${response.data.id}`)
    } catch (reason) {
      if (reason instanceof ApiError) setErrors(reason.fields)
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to save this game.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading game" />

  return (
    <>
      <Link to={gameId ? `/games/${gameId}` : '/games'} className="back-link"><ArrowLeft size={16} /> Back to games</Link>
      <PageHeader title={gameId ? 'Edit game' : 'Schedule a game'} description="Add matchup details and set the officiating crew size." />
      <form className="panel form-panel" onSubmit={submit} noValidate>
        <div className="form-section-title"><span className="section-number">01</span><div><strong>Matchup details</strong><p>Tell us who is playing and where.</p></div></div>
        <div className="form-grid form-grid-two">
          <label className="field"><span>Home team <b>*</b></span><input value={form.home_team} placeholder="e.g. Northside Falcons" onChange={(event) => setForm({ ...form, home_team: event.target.value })} /><FieldError errors={errors} name="home_team" /></label>
          <label className="field"><span>Away team <b>*</b></span><input value={form.away_team} placeholder="e.g. Eastview Tigers" onChange={(event) => setForm({ ...form, away_team: event.target.value })} /><FieldError errors={errors} name="away_team" /></label>
          <label className="field"><span>Category <b>*</b></span><input value={form.category} placeholder="e.g. U18, Open" onChange={(event) => setForm({ ...form, category: event.target.value })} /><FieldError errors={errors} name="category" /></label>
          <label className="field"><span>Venue <b>*</b></span><select value={form.venue_id} onChange={(event) => setForm({ ...form, venue_id: event.target.value })}><option value="">Choose a venue</option>{venues.map((venue) => <option key={venue.id} value={venue.id}>{venue.name}</option>)}</select><FieldError errors={errors} name="venue_id" /></label>
        </div>
        <div className="form-section-title form-section-second"><span className="section-number">02</span><div><strong>Schedule & crew</strong><p>Set the game window and required referee positions.</p></div></div>
        <div className="form-grid form-grid-two">
          <label className="field"><span>Start date & time <b>*</b></span><input type="datetime-local" value={form.starts_at} onChange={(event) => setForm({ ...form, starts_at: event.target.value })} /><FieldError errors={errors} name="starts_at" /></label>
          <label className="field"><span>End date & time <b>*</b></span><input type="datetime-local" value={form.ends_at} onChange={(event) => setForm({ ...form, ends_at: event.target.value })} /><FieldError errors={errors} name="ends_at" /></label>
          <label className="field"><span>Referee positions</span><select value={form.referee_slots} onChange={(event) => setForm({ ...form, referee_slots: event.target.value })}>{[1, 2, 3, 4, 5].map((count) => <option key={count} value={count}>{count} official{count > 1 ? 's' : ''}</option>)}</select><FieldError errors={errors} name="referee_slots" /></label>
          <label className="field"><span>Notes <small>optional</small></span><textarea rows={3} value={form.notes} placeholder="Game-day details for the assignor..." onChange={(event) => setForm({ ...form, notes: event.target.value })} /><FieldError errors={errors} name="notes" /></label>
        </div>
        <div className="form-actions"><Link className="button button-quiet" to={gameId ? `/games/${gameId}` : '/games'}>Cancel</Link><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : gameId ? 'Save changes' : <><CalendarDays size={16} /> Schedule game</>}</button></div>
      </form>
    </>
  )
}

export function GameDetailPage() {
  const { gameId } = useParams()
  const { user } = useAuth()
  const { notify } = useToast()
  const [game, setGame] = useState<Game | null>(null)
  const [referees, setReferees] = useState<Referee[]>([])
  const [refereeId, setRefereeId] = useState('')
  const [position, setPosition] = useState('Crew Chief')
  const [fee, setFee] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [confirm, setConfirm] = useState<{ title: string; detail: string; action: () => Promise<void>; label: string } | null>(null)

  const load = useCallback(async () => {
    if (!gameId) return
    try {
      const response = await get<{ data: Game }>(`/games/${gameId}`)
      setGame(response.data)
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to load this game.')
    } finally {
      setLoading(false)
    }
  }, [gameId, notify])

  useEffect(() => {
    void load()
    if (user?.role === 'admin') void loadAllReferees().then(setReferees).catch(() => setReferees([]))
  }, [load, user?.role])

  async function assign(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setBusy(true)
    try {
      await post(`/games/${gameId}/assignments`, { referee_id: Number(refereeId), position, fee: fee || null })
      notify('success', 'Referee assigned. They can now confirm the invitation.')
      setRefereeId('')
      setFee('')
      await load()
    } catch (reason) {
      if (reason instanceof ApiError) setErrors(reason.fields)
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to assign this referee.')
    } finally {
      setBusy(false)
    }
  }

  async function removeAssignment(assignment: Assignment) {
    await remove(`/assignments/${assignment.id}`)
    notify('success', 'Assignment removed.')
    await load()
  }

  async function updateGameStatus(status: 'completed' | 'cancelled') {
    await patch(`/games/${gameId}/status`, { status })
    notify('success', status === 'completed' ? 'Game marked completed.' : 'Game cancelled.')
    await load()
  }

  async function runConfirm() {
    if (!confirm) return
    setBusy(true)
    try {
      await confirm.action()
      setConfirm(null)
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'The action could not be completed.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading game" />
  if (!game) return <ErrorBanner message="This game could not be found." />
  const assignments = game.assignments ?? []

  return (
    <>
      <Link to="/games" className="back-link"><ArrowLeft size={16} /> Back to games</Link>
      <PageHeader title={`${game.home_team} vs ${game.away_team}`} description={`${game.category} · Game #${game.id}`} action={user?.role === 'admin' ? <Link className="button button-secondary" to={`/admin/games/${game.id}/edit`}><Pencil size={15} /> Edit game</Link> : undefined} />
      <section className="game-summary panel">
        <div className="game-summary-main"><div className="game-ball-mark">{game.home_team.slice(0, 1)}<span>·</span>{game.away_team.slice(0, 1)}</div><div><span className="eyebrow">MATCHUP</span><h2>{game.home_team} <span className="muted">vs</span> {game.away_team}</h2><p>{game.category} competition</p></div></div>
        <StatusBadge status={game.status} />
        <div className="game-meta"><span><CalendarDays size={17} />{formatDate(game.starts_at)}</span><span><Clock3 size={17} />{formatTime(game.starts_at)} – {formatTime(game.ends_at)}</span><span><MapPin size={17} />{game.venue?.name} · {game.venue?.address}</span></div>
      </section>
      <section className="panel assignments-panel">
        <div className="panel-heading"><div><h2>Officiating crew</h2><p>Each role is assigned to one referee.</p></div><span className={`coverage-pill ${assignments.length < game.referee_slots ? 'coverage-needed' : ''}`}>{assignments.length} / {game.referee_slots} assigned</span></div>
        <div className="crew-list">
          {['Crew Chief', 'Referee 1', 'Referee 2', ...assignments.map((assignment) => assignment.position).filter((item) => !['Crew Chief', 'Referee 1', 'Referee 2'].includes(item))].slice(0, game.referee_slots).map((role) => {
            const assignment = assignments.find((item) => item.position === role)
            return <div className="crew-row" key={role}><div className={`crew-avatar ${assignment ? '' : 'crew-empty'}`}>{assignment?.referee?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase() ?? <UserPlus size={16} />}</div><div className="crew-role"><span>{role}</span><strong>{assignment?.referee?.name ?? 'Position open'}</strong></div>{assignment ? <><StatusBadge status={assignment.status} />{user?.role === 'admin' && <button className="small-action danger-text" onClick={() => setConfirm({ title: 'Remove this assignment?', detail: `${assignment.referee?.name} will be removed from ${role}.`, label: 'Remove assignment', action: () => removeAssignment(assignment) })}>Remove</button>}</> : <span className="open-position">Awaiting assignor</span>}</div>
          })}
        </div>
        {user?.role === 'admin' && game.status === 'scheduled' && <>
          <div className="crew-divider" />
          <form className="assign-form" onSubmit={assign}>
            <div className="form-section-title"><span className="section-number"><UserPlus size={16} /></span><div><strong>Assign a referee</strong><p>RefTrack will check availability and schedule conflicts.</p></div></div>
            <div className="form-grid assign-grid">
              <label className="field"><span>Referee</span><select required value={refereeId} onChange={(event) => setRefereeId(event.target.value)}><option value="">Select a referee</option>{referees.filter((referee) => referee.profile?.status === 'active').map((referee) => <option key={referee.id} value={referee.id}>{referee.name} · {referee.profile?.license_level}</option>)}</select><FieldError errors={errors} name="referee_id" /></label>
              <label className="field"><span>Position</span><select value={position} onChange={(event) => setPosition(event.target.value)}>{['Crew Chief', 'Referee 1', 'Referee 2'].map((item) => <option value={item} key={item} disabled={assignments.some((assignment) => assignment.position === item)}>{item}{assignments.some((assignment) => assignment.position === item) ? ' · assigned' : ''}</option>)}</select><FieldError errors={errors} name="position" /></label>
              <label className="field"><span>Fee <small>optional</small></span><input type="number" min="0" step="0.01" value={fee} placeholder="0.00" onChange={(event) => setFee(event.target.value)} /><FieldError errors={errors} name="fee" /></label>
              <button className="button button-primary assign-submit" disabled={busy || !refereeId}>{busy ? 'Checking…' : <><UserPlus size={16} /> Assign referee</>}</button>
            </div>
          </form>
          <div className="game-status-actions"><button className="button button-quiet" onClick={() => setConfirm({ title: 'Cancel this game?', detail: 'The game will be marked cancelled and removed from upcoming schedules.', label: 'Cancel game', action: () => updateGameStatus('cancelled') })}><X size={15} /> Cancel game</button><button className="button button-secondary" onClick={() => setConfirm({ title: 'Complete this game?', detail: 'Confirm that this matchup has finished.', label: 'Mark completed', action: () => updateGameStatus('completed') })}><Check size={15} /> Mark game completed</button></div>
        </>}
        {game.notes && <p className="game-notes"><strong>Game notes</strong>{game.notes}</p>}
      </section>
      {confirm && <ConfirmDialog title={confirm.title} detail={confirm.detail} confirmLabel={confirm.label} onCancel={() => setConfirm(null)} onConfirm={runConfirm} busy={busy} />}
    </>
  )
}

function PaginationBar({ current, last, onChange }: { current: number; last: number; onChange: (page: number) => void }) {
  if (last <= 1) return null
  return <div className="pagination-bar"><span>Page <strong>{current}</strong> of {last}</span><div><button className="button button-secondary button-small" disabled={current <= 1} onClick={() => onChange(current - 1)}><ArrowLeft size={14} /> Previous</button><button className="button button-secondary button-small" disabled={current >= last} onClick={() => onChange(current + 1)}>Next <ArrowRight size={14} /></button></div></div>
}

function toDateTimeInput(value: string) {
  const date = new Date(value)
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

async function loadAllReferees() {
  const allReferees: Referee[] = []
  let page = 1
  let lastPage = 1
  do {
    const response = await get<Pagination<Referee>>(`/referees?page=${page}`)
    allReferees.push(...response.data)
    lastPage = response.meta.last_page
    page += 1
  } while (page <= lastPage)
  return allReferees
}
