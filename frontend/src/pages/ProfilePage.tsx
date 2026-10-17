import { useEffect, useState, type FormEvent } from 'react'
import { BadgeCheck, Mail, Phone, Save, UserRound } from 'lucide-react'
import { FieldError, PageHeader, Spinner, StatusBadge } from '../components/common'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'
import { ApiError, get, patch } from '../lib/api'
import type { User } from '../types'

export function ProfilePage() {
  const { user, updateUser } = useAuth()
  const { notify } = useToast()
  const [profile, setProfile] = useState<User | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', license_level: '', years_experience: '0' })
  const [errors, setErrors] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    get<{ data: User }>('/profile').then(({ data }) => {
      setProfile(data)
      setForm({
        name: data.name,
        email: data.email,
        phone: data.referee_profile?.phone ?? '',
        license_level: data.referee_profile?.license_level ?? 'Unlicensed',
        years_experience: String(data.referee_profile?.years_experience ?? 0),
      })
    }).catch((reason: unknown) => notify('error', reason instanceof ApiError ? reason.message : 'Unable to load your profile.'))
      .finally(() => setLoading(false))
  }, [notify])

  async function submit(event: FormEvent) {
    event.preventDefault()
    const clientErrors: Record<string, string[]> = {}
    if (!form.name.trim()) clientErrors.name = ['Name is required.']
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) clientErrors.email = ['Enter a valid email address.']
    if (Number(form.years_experience) < 0) clientErrors.years_experience = ['Experience cannot be negative.']
    setErrors(clientErrors)
    if (Object.keys(clientErrors).length) return
    setBusy(true)
    try {
      const response = await patch<{ data: User }>('/profile', { ...form, years_experience: Number(form.years_experience) })
      setProfile(response.data)
      updateUser(response.data)
      notify('success', 'Your profile has been updated.')
    } catch (reason) {
      if (reason instanceof ApiError) setErrors(reason.fields)
      notify('error', reason instanceof ApiError ? reason.message : 'Unable to save your profile.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner label="Loading profile" />

  return (
    <>
      <PageHeader title="My profile" description="Keep your contact and officiating details up to date." />
      <div className="profile-layout">
        <section className="panel profile-card">
          <div className="profile-avatar">{user?.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <h2>{profile?.name ?? user?.name}</h2><p>{profile?.email ?? user?.email}</p>
          <span className="profile-status"><StatusBadge status={profile?.referee_profile?.status ?? 'active'} /></span>
          <div className="profile-card-rule" />
          <div className="profile-mini-info"><span><BadgeCheck size={16} />{profile?.referee_profile?.license_level ?? 'Unlicensed'}</span><span><UserRound size={16} />{profile?.referee_profile?.years_experience ?? 0} years experience</span><span><Phone size={16} />{profile?.referee_profile?.phone || 'No phone added'}</span></div>
        </section>
        <form className="panel form-panel profile-form" onSubmit={submit} noValidate>
          <div className="panel-heading"><div><h2>Personal details</h2><p>Your information is visible to your league assignor.</p></div></div>
          <div className="form-grid form-grid-two">
            <label className="field"><span>Full name <b>*</b></span><input autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /><FieldError errors={errors} name="name" /></label>
            <label className="field"><span>Email address <b>*</b></span><div className="input-with-icon"><Mail size={16} /><input autoComplete="email" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></div><FieldError errors={errors} name="email" /></label>
            <label className="field"><span>Phone number</span><input autoComplete="tel" type="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} /><FieldError errors={errors} name="phone" /></label>
            <label className="field"><span>License level</span><input value={form.license_level} onChange={(event) => setForm({ ...form, license_level: event.target.value })} /><FieldError errors={errors} name="license_level" /></label>
            <label className="field"><span>Years officiating</span><input type="number" min="0" max="99" value={form.years_experience} onChange={(event) => setForm({ ...form, years_experience: event.target.value })} /><FieldError errors={errors} name="years_experience" /></label>
          </div>
          <div className="form-actions"><button className="button button-primary" disabled={busy}>{busy ? 'Saving…' : <><Save size={16} /> Save changes</>}</button></div>
        </form>
      </div>
    </>
  )
}
