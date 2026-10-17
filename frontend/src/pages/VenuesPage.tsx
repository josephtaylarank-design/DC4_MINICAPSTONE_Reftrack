import { useEffect, useState, type FormEvent } from 'react'
import { Building2, MapPin, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import { ConfirmDialog, EmptyState, FieldError, PageHeader, Spinner } from '../components/common'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ApiError, get, post, put, remove } from '../lib/api'
import { formDraftKey, useFormDraft } from '../hooks/useFormDraft'
import type { Venue } from '../types'

const blankForm = { name: '', address: '', court_count: '1' }
const blankVenueDraft = { form: blankForm, editingId: null as number | null }
const venueDraftFields = ['form', 'editingId'] as const

export function VenuesPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const [venues, setVenues] = useState<Venue[] | null>(null)
  const [draft, setDraft, clearDraft] = useFormDraft(formDraftKey('venue-form', user?.id), blankVenueDraft, venueDraftFields)
  const { form, editingId: editing } = draft
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<Venue | null>(null)

  async function load() {
    setLoading(true)
    try {
      const response = await get<{ data: Venue[] }>('/venues')
      setVenues(response.data)
    } catch (error) {
      notify('error', error instanceof ApiError ? error.message : 'Unable to load venues.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  function startEdit(venue: Venue) {
    setDraft({ form: { name: venue.name, address: venue.address, court_count: String(venue.court_count) }, editingId: venue.id })
    setErrors({})
  }

  function resetForm() {
    clearDraft()
    setDraft(blankVenueDraft)
    setErrors({})
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const clientErrors: Record<string, string[]> = {}
    if (!form.name.trim()) clientErrors.name = ['Venue name is required.']
    if (!form.address.trim()) clientErrors.address = ['Address is required.']
    if (Number(form.court_count) < 1) clientErrors.court_count = ['At least one court is required.']
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return
    setBusy(true)
    try {
      const body = { ...form, court_count: Number(form.court_count) }
      if (editing) await put(`/venues/${editing}`, body)
      else await post('/venues', body)
      notify('success', editing ? 'Venue updated.' : 'Venue added.')
      resetForm()
      await load()
    } catch (error) {
      if (error instanceof ApiError) setErrors(error.fields)
      notify('error', error instanceof ApiError ? error.message : 'Unable to save this venue.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteVenue() {
    if (!deleting) return
    setBusy(true)
    try {
      await remove(`/venues/${deleting.id}`)
      notify('success', 'Venue deleted.')
      setDeleting(null)
      await load()
    } catch (error) {
      notify('error', error instanceof ApiError ? error.message : 'Unable to delete this venue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="Venues" description="Manage the courts and gyms where games take place." />
      <div className="venue-layout">
        <section className="panel form-panel venue-form-panel">
          <div className="panel-heading"><div><h2>{editing ? 'Edit venue' : 'Add a venue'}</h2><p>{editing ? 'Update the venue details.' : 'Add a court or gym to RefTrack.'}</p></div><span className="panel-heading-icon"><Building2 size={19} /></span></div>
          <form className="stacked-form" onSubmit={submit} noValidate>
            <label className="field"><span>Venue name <b>*</b></span><input value={form.name} placeholder="e.g. Central Sports Hall" onChange={(event) => setDraft({ ...draft, form: { ...form, name: event.target.value } })} /><FieldError errors={errors} name="name" /></label>
            <label className="field"><span>Street address <b>*</b></span><input value={form.address} placeholder="e.g. 100 Main Street" onChange={(event) => setDraft({ ...draft, form: { ...form, address: event.target.value } })} /><FieldError errors={errors} name="address" /></label>
            <label className="field"><span>Number of courts</span><input type="number" min="1" max="100" value={form.court_count} onChange={(event) => setDraft({ ...draft, form: { ...form, court_count: event.target.value } })} /><FieldError errors={errors} name="court_count" /></label>
            <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : editing ? <><Save size={15} /> Save venue</> : <><Plus size={16} /> Add venue</>}</button>{editing && <button type="button" className="button button-quiet" onClick={resetForm}><X size={15} /> Cancel</button>}</div>
          </form>
        </section>
        <section className="panel table-panel venue-list-panel">
          <div className="panel-heading"><div><h2>All venues</h2><p>{venues?.length ?? 0} locations in your league</p></div><span className="venue-count">{venues?.length ?? '—'}</span></div>
          {loading ? <Spinner label="Loading venues" /> : venues?.length ? <div className="venue-list">{venues.map((venue) => <article className="venue-card" key={venue.id}>
            <div className="venue-icon"><MapPin size={19} /></div><div className="venue-info"><strong>{venue.name}</strong><span>{venue.address}</span><small>{venue.court_count} court{venue.court_count === 1 ? '' : 's'} · {venue.games_count ?? 0} games</small></div>
            <div className="venue-actions"><button className="icon-button" aria-label={`Edit ${venue.name}`} onClick={() => startEdit(venue)}><Pencil size={15} /></button><button className="icon-button icon-danger" aria-label={`Delete ${venue.name}`} onClick={() => setDeleting(venue)}><Trash2 size={15} /></button></div>
          </article>)}</div> : <EmptyState title="No venues yet" detail="Add your first gym or court to start scheduling games." />}
        </section>
      </div>
      {deleting && <ConfirmDialog title="Delete this venue?" detail={`${deleting.name} cannot be deleted while it has games.`} onCancel={() => setDeleting(null)} onConfirm={deleteVenue} busy={busy} />}
    </>
  )
}
