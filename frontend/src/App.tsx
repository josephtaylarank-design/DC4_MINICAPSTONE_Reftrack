import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import { AppShell } from './components/AppShell'
import { Spinner } from './components/common'
import { useAuth } from './contexts/AuthContext'
import { LoginPage, RegisterPage } from './pages/AuthPages'
import { DashboardPage } from './pages/DashboardPage'
import { GamesPage, GameFormPage, GameDetailPage } from './pages/GamesPages'
import { VenuesPage } from './pages/VenuesPage'
import { RefereesPage } from './pages/RefereesPage'
import { AssignmentsPage } from './pages/AssignmentsPage'
import { AvailabilityPage } from './pages/AvailabilityPage'
import { ProfilePage } from './pages/ProfilePage'

function ProtectedLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="screen-loading"><Spinner label="Loading RefTrack" /></div>
  if (!user) return <Navigate to="/login" replace />
  return <AppShell />
}

function RoleGate({ role }: { role: 'admin' | 'referee' }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/:gameId" element={<GameDetailPage />} />
          <Route element={<RoleGate role="admin" />}>
            <Route path="/admin/games/new" element={<GameFormPage />} />
            <Route path="/admin/games/:gameId/edit" element={<GameFormPage />} />
            <Route path="/admin/venues" element={<VenuesPage />} />
            <Route path="/admin/referees" element={<RefereesPage />} />
          </Route>
          <Route element={<RoleGate role="referee" />}>
            <Route path="/my-assignments" element={<AssignmentsPage />} />
            <Route path="/availability" element={<AvailabilityPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
