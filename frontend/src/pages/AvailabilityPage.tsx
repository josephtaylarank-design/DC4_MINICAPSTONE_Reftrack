import { useEffect, useState, type FormEvent } from 'react'
import { CalendarDays, Check, Clock3, Plus, Trash2, X } from 'lucide-react'
import { ConfirmDialog, EmptyState, FieldError, formatDate, formatTime, PageHeader, Spinner } from '../components/common'
import { useToast } from '../contexts/ToastContext'
import { ApiError, get, post, remove } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { formDraftKey, useFormDraft } from '../hooks/useFormDraft'
import type { Availability, Pagination } from '../types'

const blankAvailabilityForm = { date: '', start: '08:00', end: '18:00', is_available: 'true', notes: '' }
const availabilityDraftFields = ['date', 'start', 'end', 'is_available', 'notes'] as const

export function AvailabilityPage() {
  const { user } = useAuth()
  const { notify } = useToast()
  const [items, setItems] = useState<Pagination<Availability> | null>(null)
  const [form, setForm, clearDraft] = useFormDraft(formDraftKey('availability-form', user?.id), blankAvailabilityForm, availabilityDraftFields)
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState<Availability | null>(null)

  async function load() {
    setLoading(true)
    try {
      const response = await get<Pagination<Availability>>('/availabilities')
      setItems(response)
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to load availability.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const start = new Date(`${form.date}T${form.start}:00`)
    const end = new Date(`${form.date}T${form.end}:00`)
    const nextErrors: Record<string, string[]> = {}
    if (!form.date || Number.isNaN(start.getTime()) || start.getTime() <= Date.now()) nextErrors.starts_at = ['Choose a future date and time.']
    if (!form.end || end <= start) nextErrors.ends_at = ['End time must be after the start.']
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return
    setBusy(true)
    try {
      await post('/availabilities', {
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        is_available: form.is_available === 'true',
        notes: form.notes || null,
      })
      notify('success', 'Availability saved.')
      clearDraft()
      setForm(blankAvailabilityForm)
      await load()
    } catch (reason) {
      if (reason instanceof ApiError) setErrors({ ...nextErrors, ...reason.fields })
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to save availability.')
    } finally {
      setBusy(false)
    }
  }

  async function deleteBlock() {
    if (!deleting) return
    setBusy(true)
    try {
      await remove(`/availabilities/${deleting.id}`)
      notify('success', 'Availability block removed.')
      setDeleting(null)
      await load()
    } catch (reason) {
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to remove availability.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <PageHeader title="My availability" description="Let your assignor know when you’re ready to work." />
      <div className="availability-layout">
        <section className="panel form-panel availability-form-panel">
          <div className="panel-heading"><div><h2>Add a time block</h2><p>Set a time you’re available or unavailable.</p></div><span className="panel-heading-icon"><CalendarDays size={19} /></span></div>
          <form className="stacked-form" onSubmit={submit} noValidate>
            <label className="field"><span>Date <b>*</b></span><input type="date" min={new Date().toISOString().slice(0, 10)} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /><FieldError errors={errors} name="starts_at" /></label>
            <div className="form-grid form-grid-two time-grid"><label className="field"><span>From</span><input type="time" value={form.start} onChange={(event) => setForm({ ...form, start: event.target.value })} /></label><label className="field"><span>Until</span><input type="time" value={form.end} onChange={(event) => setForm({ ...form, end: event.target.value })} /><FieldError errors={errors} name="ends_at" /></label></div>
            <label className="field"><span>Availability status</span><select value={form.is_available} onChange={(event) => setForm({ ...form, is_available: event.target.value })}><option value="true">Available</option><option value="false">Not available</option></select></label>
            <label className="field"><span>Note <small>optional</small></span><input value={form.notes} placeholder="Add a note for your assignor" onChange={(event) => setForm({ ...form, notes: event.target.value })} /><FieldError errors={errors} name="notes" /></label>
            <button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : <><Plus size={16} /> Save time block</>}</button>
          </form>
          <div className="availability-hint"><Clock3 size={16} /><span>Availability helps your assignor avoid scheduling conflicts.</span></div>
        </section>
        <section className="panel table-panel availability-list-panel">
          <div className="panel-heading"><div><h2>Upcoming time blocks</h2><p>{items?.meta.total ?? 0} saved blocks</p></div></div>
          {loading ? <Spinner label="Loading time blocks" /> : items?.data.length ? <div className="availability-list">{items.data.map((item) => <article className="availability-item" key={item.id}>
            <span className={`availability-mark ${item.is_available ? 'is-available' : 'is-unavailable'}`}>{item.is_available ? <Check size={17} /> : <X size={17} />}</span>
            <div><strong>{formatDate(item.starts_at, { weekday: 'short', month: 'long', day: 'numeric' })}</strong><span>{formatTime(item.starts_at)} – {formatTime(item.ends_at)}</span>{item.notes && <small>{item.notes}</small>}</div>
            <span className={`availability-label ${item.is_available ? 'text-available' : 'text-unavailable'}`}>{item.is_available ? 'Available' : 'Unavailable'}</span>
            <button className="icon-button icon-danger" aria-label="Delete time block" onClick={() => setDeleting(item)}><Trash2 size={15} /></button>
          </article>)}</div> : <EmptyState title="No time blocks yet" detail="Add availability to help your assignor plan the next game." />}
        </section>
      </div>
      {deleting && <ConfirmDialog title="Remove this time block?" detail={`${formatDate(deleting.starts_at)} availability will be deleted.`} onCancel={() => setDeleting(null)} onConfirm={deleteBlock} busy={busy} />}
    </>
  )
}
