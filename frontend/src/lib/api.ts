const API_BASE_URL = (import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000/api').replace(/\/$/, '')
export const TOKEN_KEY = 'reftrack_token'

export class ApiError extends Error {
  status: number
  fields: Record<string, string[]>

  constructor(message: string, status: number, fields: Record<string, string[]> = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.fields = fields
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers = new Headers(options.headers)
  headers.set('Accept', 'application/json')

  if (options.body !== undefined) headers.set('Content-Type', 'application/json')
  if (token) headers.set('Authorization', `Bearer ${token}`)

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  const text = await response.text()
  const payload: unknown = text ? JSON.parse(text) : null
  if (!response.ok) {
    const body = payload as { message?: string; errors?: Record<string, string[]> } | null
    if (response.status === 401 && token) window.dispatchEvent(new Event('reftrack:unauthorized'))
    throw new ApiError(body?.message ?? 'The request could not be completed.', response.status, body?.errors ?? {})
  }

  return payload as T
}

export const get = <T>(path: string) => apiRequest<T>(path)
export const post = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'POST', body })
export const put = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PUT', body })
export const patch = <T>(path: string, body: unknown) => apiRequest<T>(path, { method: 'PATCH', body })
export const remove = <T = null>(path: string) => apiRequest<T>(path, { method: 'DELETE' })
