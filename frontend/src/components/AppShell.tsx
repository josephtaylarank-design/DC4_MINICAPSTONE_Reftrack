import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronDown, ClipboardList, Dumbbell, LayoutDashboard, LogOut, MapPin, Menu, ShieldCheck, Users, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { useToast } from '../contexts/ToastContext'

export function AppShell() {
  const { user, logout } = useAuth()
  const { notify } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)
  if (!user) return null

  async function handleLogout() {
    try {
      await logout()
    } catch {
      notify('error', 'Your session ended locally, but the API token could not be revoked.')
    } finally {
      navigate('/login', { replace: true })
    }
  }

  const links = user.role === 'admin'
    ? [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/games', label: 'Games', icon: CalendarDays },
        { to: '/admin/venues', label: 'Venues', icon: MapPin },
        { to: '/admin/referees', label: 'Referees', icon: Users },
      ]
    : [
        { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { to: '/games', label: 'Games', icon: CalendarDays },
        { to: '/my-assignments', label: 'My assignments', icon: ClipboardList },
        { to: '/availability', label: 'Availability', icon: CalendarDays },
        { to: '/profile', label: 'My profile', icon: Users },
      ]

  return (
    <div className="app-shell">
      {mobileOpen && <button className="mobile-scrim" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
      <aside className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-lockup"><div className="brand-mark"><Dumbbell size={19} /></div><div><strong>reftrack</strong><span>OFFICIALS PORTAL</span></div><button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={18} /></button></div>
        <div className="sidebar-label">WORKSPACE</div>
        <nav className="side-nav">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === '/dashboard'} onClick={() => setMobileOpen(false)}>
              <Icon size={18} strokeWidth={1.8} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
        {user.role === 'admin' && <div className="sidebar-note"><ShieldCheck size={16} /><div><strong>Admin access</strong><span>Manage the full season</span></div></div>}
        <div className="sidebar-bottom"><span className="sidebar-version">REFTRACK · SEASON 2026</span></div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={20} /></button>
          <div className="crumb"><span>Workspace</span><span className="crumb-divider">/</span><strong>{links.find((link) => link.to === location.pathname)?.label ?? 'RefTrack'}</strong></div>
          <div className="topbar-user">
            <span className="topbar-role">{user.role === 'admin' ? 'ADMINISTRATOR' : 'REFEREE'}</span>
            <div className="avatar">{user.name.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</div>
            <div className="user-name"><strong>{user.name}</strong><span>{user.email}</span></div>
            <button className="logout-button" onClick={handleLogout} title="Sign out"><LogOut size={17} /><span>Sign out</span></button>
            <ChevronDown className="user-caret" size={15} />
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
        <footer className="page-footer"><span>© 2026 RefTrack</span><span>Officials. Organized.</span></footer>
      </main>
    </div>
  )
}
