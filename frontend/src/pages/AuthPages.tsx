import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { ArrowRight, LockKeyhole, Mail, UserRound } from 'lucide-react'
import { ApiError } from '../lib/api'
import { useAuth } from '../contexts/AuthContext'
import { FieldError, Spinner } from '../components/common'

export function LoginPage() {
  const { login, user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (user) return <Navigate to="/dashboard" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setErrors({})
    setMessage('')
    if (!form.email || !form.password) {
      setErrors({ email: !form.email ? ['Email is required.'] : [], password: !form.password ? ['Password is required.'] : [] })
      return
    }
    setBusy(true)
    try {
      await login(form.email, form.password)
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        setMessage(error.status === 401 || error.status === 403 ? error.message : 'Please check the highlighted fields.')
      } else setMessage('Unable to connect to RefTrack. Check that the API server is running.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Welcome back." subtitle="Sign in to manage your season.">
      <form className="auth-form" onSubmit={submit} noValidate>
        {message && <div className="error-banner" role="alert">{message}</div>}
        <label className="field"><span>Email address</span><div className="input-with-icon"><Mail size={17} /><input autoComplete="email" type="email" value={form.email} placeholder="you@example.com" onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><FieldError errors={errors} name="email" /></label>
        <label className="field"><span>Password</span><div className="input-with-icon"><LockKeyhole size={17} /><input autoComplete="current-password" type="password" value={form.password} placeholder="Enter your password" onChange={(event) => setForm({ ...form, password: event.target.value })} /></div><FieldError errors={errors} name="password" /></label>
        <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Signing in…' : <>Sign in <ArrowRight size={17} /></>}</button>
      </form>
      <p className="auth-switch">New to RefTrack? <Link to="/register">Create a referee account</Link></p>
    </AuthFrame>
  )
}

export function RegisterPage() {
  const { register, user, loading } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', email: '', phone: '', license_level: '', years_experience: '', password: '', password_confirmation: '' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner />
  if (user) return <Navigate to="/dashboard" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    const clientErrors: Record<string, string[]> = {}
    if (!form.name.trim()) clientErrors.name = ['Name is required.']
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) clientErrors.email = ['Enter a valid email address.']
    if (form.password.length < 8) clientErrors.password = ['Use at least 8 characters.']
    if (form.password !== form.password_confirmation) clientErrors.password_confirmation = ['Passwords do not match.']
    setErrors(clientErrors)
    setMessage('')
    if (Object.keys(clientErrors).length) return
    setBusy(true)
    try {
      await register({
        ...form,
        years_experience: form.years_experience || '0',
        license_level: form.license_level || 'Unlicensed',
      })
      navigate('/dashboard', { replace: true })
    } catch (error) {
      if (error instanceof ApiError) {
        setErrors(error.fields)
        setMessage(error.message)
      } else setMessage('Unable to connect to RefTrack. Check that the API server is running.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame title="Join the crew." subtitle="Create your referee account to get started.">
      <form className="auth-form register-form" onSubmit={submit} noValidate>
        {message && <div className="error-banner" role="alert">{message}</div>}
        <div className="form-grid form-grid-two">
          <label className="field"><span>Full name</span><div className="input-with-icon"><UserRound size={17} /><input autoComplete="name" value={form.name} placeholder="Your name" onChange={(event) => setForm({ ...form, name: event.target.value })} /></div><FieldError errors={errors} name="name" /></label>
          <label className="field"><span>Email address</span><div className="input-with-icon"><Mail size={17} /><input autoComplete="email" type="email" value={form.email} placeholder="you@example.com" onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><FieldError errors={errors} name="email" /></label>
          <label className="field"><span>Phone <small>optional</small></span><input type="tel" value={form.phone} placeholder="+1 (555) 000-0000" onChange={(event) => setForm({ ...form, phone: event.target.value })} /><FieldError errors={errors} name="phone" /></label>
          <label className="field"><span>License level <small>optional</small></span><input value={form.license_level} placeholder="e.g. Level 1" onChange={(event) => setForm({ ...form, license_level: event.target.value })} /><FieldError errors={errors} name="license_level" /></label>
          <label className="field"><span>Years of experience</span><input type="number" min="0" max="99" value={form.years_experience} placeholder="0" onChange={(event) => setForm({ ...form, years_experience: event.target.value })} /><FieldError errors={errors} name="years_experience" /></label>
          <span />
          <label className="field"><span>Password</span><input autoComplete="new-password" type="password" value={form.password} placeholder="At least 8 characters" onChange={(event) => setForm({ ...form, password: event.target.value })} /><FieldError errors={errors} name="password" /></label>
          <label className="field"><span>Confirm password</span><input autoComplete="new-password" type="password" value={form.password_confirmation} placeholder="Type it again" onChange={(event) => setForm({ ...form, password_confirmation: event.target.value })} /><FieldError errors={errors} name="password_confirmation" /></label>
        </div>
        <button className="button button-primary button-wide" disabled={busy}>{busy ? 'Creating account…' : <>Create referee account <ArrowRight size={17} /></>}</button>
      </form>
      <p className="auth-switch">Already registered? <Link to="/login">Sign in</Link></p>
    </AuthFrame>
  )
}

function AuthFrame({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="auth-screen">
      <div className="auth-brand"><div className="brand-mark brand-letter">R</div><strong>reftrack</strong><span>OFFICIALS PORTAL</span></div>
      <div className="auth-card"><div className="auth-heading"><div className="eyebrow">REFEREE MANAGEMENT SYSTEM</div><h1>{title}</h1><p>{subtitle}</p></div>{children}</div>
      <div className="auth-footnote">A better way to run the game.</div>
    </div>
  )
}
