import { useEffect, useState, type FormEvent } from 'react'
import { Search, ShieldCheck, UserRound, UserRoundX } from 'lucide-react'
import { ConfirmDialog, EmptyState, ErrorBanner, PageHeader, Spinner, StatusBadge } from '../components/common'
import { useToast } from '../contexts/ToastContext'
import { ApiError, get, patch } from '../lib/api'
import type { Pagination, Referee } from '../types'

export function RefereesPage() {
  const { notify } = useToast()
  const [list, setList] = useState<Pagination<Referee> | null>(null)
  const [search, setSearch] = useState('')
  const [license, setLicense] = useState('')
  const [status, setStatus] = useState('')
  const [applied, setApplied] = useState({ search: '', license_level: '', status: '' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [changing, setChanging] = useState<Referee | null>(null)
  const [busy, setBusy] = useState(false)

  async function load(filters = applied) {
    setLoading(true)
    setError('')
    const query = new URLSearchParams()
    if (filters.search) query.set('search', filters.search)
    if (filters.license_level) query.set('license_level', filters.license_level)
    if (filters.status) query.set('status', filters.status)
    try {
      const response = await get<Pagination<Referee>>(`/referees?${query}`)
      setList(response)
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'Unable to load referees.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function apply(event: FormEvent) {
    event.preventDefault()
    const next = { search, license_level: license, status }
    setApplied(next)
    void load(next)
  }

  async function toggleStatus() {
    if (!changing) return
    setBusy(true)
    const nextStatus = changing.profile?.status === 'active' ? 'inactive' : 'active'
    try {
      await patch(`/referees/${changing.id}/status`, { status: nextStatus })
      notify('success', `${changing.name} marked ${nextStatus}.`)
      setChanging(null)
      await load()
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to update this referee.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Referees" description="Your officiating roster, license levels, and game experience." />
      <section className="panel filter-panel">
        <form className="filter-form referee-filter-form" onSubmit={apply}>
          <label className="search-box"><span className="sr-only">Search referees</span><input value={search} placeholder="Search by referee name..." onChange={(event) => setSearch(event.target.value)} /><Search size={16} /></label>
          <label className="select-wrap"><span className="sr-only">License level</span><select value={license} onChange={(event) => setLicense(event.target.value)}><option value="">All license levels</option>{['Level 1', 'Level 2', 'Level 3', 'Unlicensed'].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label className="select-wrap"><span className="sr-only">Status</span><select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All statuses</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <button className="button button-secondary">Apply filters</button>
        </form>
      </section>
      <section className="panel table-panel">
        <div className="table-panel-heading"><div><strong>Referee directory</strong><span>{list?.meta.total ?? 0} referees</span></div><span className="roster-tag"><ShieldCheck size={15} /> LEAGUE ROSTER</span></div>
        {error ? <ErrorBanner message={error} /> : loading ? <Spinner label="Loading referees" /> : !list?.data.length ? <EmptyState title="No referees found" detail="Try another search or invite a referee by sharing the registration page." /> : <>
          <div className="table-scroll"><table><thead><tr><th>Referee</th><th>License</th><th>Experience</th><th>Games</th><th>Status</th><th className="align-right">Action</th></tr></thead><tbody>
            {list.data.map((referee) => {
              const refereeStatus = referee.profile?.status ?? 'inactive'
              return <tr key={referee.id}><td><div className="person-cell"><div className="avatar avatar-small">{referee.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div><div><strong>{referee.name}</strong><small>{referee.email}</small></div></div></td><td><span className="license-tag">{referee.profile?.license_level ?? 'Unlicensed'}</span></td><td>{referee.profile?.years_experience ?? 0} yrs</td><td>{referee.assignments_count}</td><td><StatusBadge status={refereeStatus} /></td><td className="align-right"><button className={`small-action ${refereeStatus === 'active' ? 'danger-text' : ''}`} onClick={() => setChanging(referee)}>{refereeStatus === 'active' ? <><UserRoundX size={14} /> Deactivate</> : <><UserRound size={14} /> Reactivate</>}</button></td></tr>
            })}
          </tbody></table></div>
          {list.meta.last_page > 1 && <div className="pagination-bar"><span>Page {list.meta.current_page} of {list.meta.last_page}</span><div><button className="button button-secondary button-small" disabled={list.meta.current_page <= 1} onClick={() => void loadPage(list.meta.current_page - 1, applied, setList, setLoading, setError)}>Previous</button><button className="button button-secondary button-small" disabled={list.meta.current_page >= list.meta.last_page} onClick={() => void loadPage(list.meta.current_page + 1, applied, setList, setLoading, setError)}>Next</button></div></div>}
        </>}
      </section>
      {changing && <ConfirmDialog title={`${changing.profile?.status === 'active' ? 'Deactivate' : 'Reactivate'} ${changing.name}?`} detail={changing.profile?.status === 'active' ? 'This referee will not be able to sign in or receive new assignments.' : 'This referee will be able to sign in and receive new assignments again.'} confirmLabel={changing.profile?.status === 'active' ? 'Deactivate referee' : 'Reactivate referee'} onCancel={() => setChanging(null)} onConfirm={toggleStatus} busy={busy} />}
    </>
  )
}

async function loadPage(
  page: number,
  filters: { search: string; license_level: string; status: string },
  setList: (value: Pagination<Referee>) => void,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
) {
  setLoading(true)
  const query = new URLSearchParams({ page: String(page) })
  Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value) })
  try {
    const response = await get<Pagination<Referee>>(`/referees?${query}`)
    setList(response)
  } catch (reason) {
    setError(reason instanceof ApiError ? reason.message : 'Unable to load referees.')
  } finally {
    setLoading(false)
  }
}
