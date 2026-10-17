import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { ApiError, apiRequest, TOKEN_KEY } from '../lib/api'
import type { AuthResponse, User } from '../types'

interface AuthContextValue {
  user: User | null
  loading: boolean
  updateUser: (user: User) => void
  login: (email: string, password: string) => Promise<void>
  register: (input: Record<string, string>) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setUser(null)
  }, [])

  useEffect(() => {
    const onUnauthorized = () => clearSession()
    window.addEventListener('reftrack:unauthorized', onUnauthorized)
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setLoading(false)
    } else {
      apiRequest<{ data: User }>('/user')
        .then((response) => setUser(response.data))
        .catch((error: unknown) => {
          if (!(error instanceof ApiError) || error.status !== 401) clearSession()
        })
        .finally(() => setLoading(false))
    }

    return () => window.removeEventListener('reftrack:unauthorized', onUnauthorized)
  }, [clearSession])

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiRequest<AuthResponse>('/login', { method: 'POST', body: { email, password } })
    localStorage.setItem(TOKEN_KEY, response.token)
    setUser(response.user)
  }, [])

  const register = useCallback(async (input: Record<string, string>) => {
    const response = await apiRequest<AuthResponse>('/register', { method: 'POST', body: input })
    localStorage.setItem(TOKEN_KEY, response.token)
    setUser(response.user)
  }, [])

  const logout = useCallback(async () => {
    try {
      if (localStorage.getItem(TOKEN_KEY)) await apiRequest('/logout', { method: 'POST' })
    } finally {
      clearSession()
    }
  }, [clearSession])

  const updateUser = useCallback((updatedUser: User) => setUser(updatedUser), [])
  const value = useMemo(() => ({ user, loading, login, register, logout, updateUser }), [user, loading, login, register, logout, updateUser])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider.')
  return context
}
