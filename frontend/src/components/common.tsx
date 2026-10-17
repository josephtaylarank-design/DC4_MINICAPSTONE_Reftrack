import { LoaderCircle, SearchX } from 'lucide-react'
import type { ReactNode } from 'react'

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return <div className="spinner-wrap" role="status"><LoaderCircle className="spin" size={22} /><span>{label}</span></div>
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="empty-state"><span className="empty-icon"><SearchX size={22} /></span><strong>{title}</strong><p>{detail}</p></div>
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="page-header"><div><h1>{title}</h1>{description && <p>{description}</p>}</div>{action}</div>
}

export function FieldError({ errors, name }: { errors: Record<string, string[]>; name: string }) {
  return errors[name]?.[0] ? <span className="field-error">{errors[name][0]}</span> : null
}

export function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge status-${status.toLowerCase().replaceAll(' ', '-')}`}>{status}</span>
}

export function ConfirmDialog({ title, detail, confirmLabel = 'Delete', onCancel, onConfirm, busy = false }: {
  title: string; detail: string; confirmLabel?: string; onCancel: () => void; onConfirm: () => void; busy?: boolean
}) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="dialog-mark">!</span>
        <h2 id="confirm-title">{title}</h2>
        <p>{detail}</p>
        <div className="dialog-actions"><button className="button button-quiet" onClick={onCancel} disabled={busy}>Cancel</button><button className="button button-danger" onClick={onConfirm} disabled={busy}>{busy ? 'Working…' : confirmLabel}</button></div>
      </section>
    </div>
  )
}

export function formatDate(value: string, options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }) {
  return new Intl.DateTimeFormat(undefined, options).format(new Date(value))
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(value))
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="error-banner" role="alert">{message}</div>
}
