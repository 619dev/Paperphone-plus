const BASE = import.meta.env.VITE_API_URL || ''

export async function api<T = any>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token')
  const headers: Record<string, string> = {
    ...(opts.headers as Record<string, string> || {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (!(opts.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${BASE}${path}`, { ...opts, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return data as T
}

// Convenience methods
export const get = <T = any>(path: string) => api<T>(path)

export const post = <T = any>(path: string, body?: any) =>
  api<T>(path, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })

export const put = <T = any>(path: string, body?: any) =>
  api<T>(path, {
    method: 'PUT',
    body: JSON.stringify(body),
  })

export const del = <T = any>(path: string, body?: any) =>
  api<T>(path, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  })

export async function uploadFile(file: File): Promise<{ url: string; key: string }> {
  const form = new FormData()
  form.append('file', file)
  return post('/api/upload', form)
}
