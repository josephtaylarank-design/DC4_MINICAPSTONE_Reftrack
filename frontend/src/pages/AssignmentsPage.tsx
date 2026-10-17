import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Timer, X } from 'lucide-react'
import { EmptyState, ErrorBanner, formatTime, PageHeader, Spinner, StatusBadge } from '../components/common'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ApiError, get, patch } from '../lib/api'
import { formDraftKey, useFormDraft } from '../hooks/useFormDraft'
import type { Assignment, Pagination } from '../types'

const blankAssignmentFilter = { status: '' }
const assignmentFilterFields = ['status'] as const

export function AssignmentsPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const [list, setList] = useState<Pagination<Assignment> | null>(null)
  const [filter, setFilter] = useFormDraft(formDraftKey('assignment-filters', user?.id), blankAssignmentFilter, assignmentFilterFields)
  const { status } = filter
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [error, setError] = useState('')

  async function load(currentPage = page, currentStatus = status) {
    setLoading(true)
    setError('')
    const query = new URLSearchParams({ page: String(currentPage) })
    if (currentStatus) query.set('status', currentStatus)
    try {
      const response = await get<Pagination<Assignment>>(`/my-assignments?${query}`)
      setList(response)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load your assignments.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load(1, status) }, [status])

  async function respond(assignment: Assignment, nextStatus: 'accepted' | 'declined') {
    setBusyId(assignment.id)
    try {
      await patch(`/assignments/${assignment.id}/status`, { status: nextStatus })
      notify('success', nextStatus === 'accepted' ? 'Assignment accepted. See you at the game.' : 'Assignment declined.')
      await load(page, status)
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'Could not update this assignment.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      <PageHeader title="My assignments" description="Your officiating schedule, invitations, and completed games." />
      <section className="panel assignment-toolbar"><div className="assignment-filter-label"><CalendarDays size={17} /><span>Filter by status</span></div><select value={status} onChange={(event) => { setFilter({ ...filter, status: event.target.value }); setPage(1) }}><option value="">All assignments</option><option value="pending">Pending response</option><option value="accepted">Accepted</option><option value="declined">Declined</option><option value="completed">Completed</option></select></section>
      {error ? <ErrorBanner message={error} /> : loading ? <Spinner label="Loading assignments" /> : !list?.data.length ? <section className="panel"><EmptyState title="No assignments here" detail="New invitations and your game history will appear in this list." /></section> : <>
        <div className="assignment-list">{list.data.map((assignment) => <article className="assignment-card panel" key={assignment.id}>
          <div className="assignment-date-block"><strong>{new Date(assignment.game?.starts_at ?? '').toLocaleDateString(undefined, { day: '2-digit' })}</strong><span>{new Date(assignment.game?.starts_at ?? '').toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}</span></div>
          <div className="assignment-main"><div className="assignment-topline"><StatusBadge status={assignment.status} /><span className="assignment-category">{assignment.game?.category}</span></div><h2>{assignment.game?.home_team} <span className="muted">vs</span> {assignment.game?.away_team}</h2><div className="assignment-meta"><span><MapPin size={14} />{assignment.game?.venue ?? 'Venue TBA'}</span><span><Timer size={14} />{assignment.game && formatTime(assignment.game.starts_at)} – {assignment.game && formatTime(assignment.game.ends_at)}</span><span>{assignment.position}</span></div></div>
          {assignment.status === 'pending' ? <div className="assignment-actions"><button className="button button-secondary" disabled={busyId === assignment.id} onClick={() => void respond(assignment, 'declined')}><X size={15} /> Decline</button><button className="button button-primary" disabled={busyId === assignment.id} onClick={() => void respond(assignment, 'accepted')}>{busyId === assignment.id ? 'Saving…' : 'Accept assignment'} <ArrowRight size={15} /></button></div> : assignment.status === 'completed' ? <span className="completed-label">Game complete</span> : <span className="assignment-confirmed">Confirmed</span>}
        </article>)}</div>
        {list.meta.last_page > 1 && <div className="pagination-bar panel-pagination"><span>Page {list.meta.current_page} of {list.meta.last_page}</span><div><button className="button button-secondary button-small" disabled={list.meta.current_page <= 1} onClick={() => { setPage(list.meta.current_page - 1); void load(list.meta.current_page - 1) }}><ArrowLeft size={14} /> Previous</button><button className="button button-secondary button-small" disabled={list.meta.current_page >= list.meta.last_page} onClick={() => { setPage(list.meta.current_page + 1); void load(list.meta.current_page + 1) }}>Next <ArrowRight size={14} /></button></div></div>}
      </>}
    </>
  )
}
