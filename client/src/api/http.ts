import { endSession, isExplicitLogoutSignal } from '../utils/session'
import { useStore } from '../store'

let refreshInFlight: Promise<string | null> | null = null

function getBase(): string {
  return localStorage.getItem('serverUrl') || import.meta.env.VITE_API_URL || ''
}

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

  let res = await fetch(`${getBase()}${path}`, { ...opts, headers })

  // A short-lived access token may expire while the durable device session is
  // still valid. Refresh once, share that refresh across concurrent requests,
  // then replay the original request transparently.
  if (res.status === 401 && path !== '/api/auth/refresh') {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${refreshed}`
      res = await fetch(`${getBase()}${path}`, { ...opts, headers })
    }
  }

  const text = await res.text()
  let data: any
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return {} as T
  }

  // Keep local login state through ordinary authorization or transport
  // failures. Only an explicit server instruction may end the session.
  if (isExplicitLogoutSignal(data, res.headers)) {
    endSession(String(data.code ?? data.type ?? data.action ?? 'session_revoked'))
  }

  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`)
  }

  return data as T
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) {
    // A legacy installation that missed the one-time upgrade can no longer
    // recover an expired signed token without proving credentials again.
    endSession('reauth_required')
    return null
  }
  if (refreshInFlight) return refreshInFlight
  refreshInFlight = (async () => {
    try {
      const res = await fetch(`${getBase()}/api/auth/refresh`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.token) {
        if (isExplicitLogoutSignal(data, res.headers)) endSession('session_revoked')
        return null
      }
      useStore.getState().setToken(data.token, data.refresh_token)
      return data.token as string
    } catch {
      // Offline is recoverable: preserve local account and cached messages.
      return null
    } finally {
      refreshInFlight = null
    }
  })()
  return refreshInFlight
}

let upgradeInFlight: Promise<void> | null = null
export function ensureRefreshToken(): Promise<void> {
  if (localStorage.getItem('refreshToken') || !localStorage.getItem('token')) return Promise.resolve()
  if (upgradeInFlight) return upgradeInFlight
  upgradeInFlight = (async () => {
    try {
      const res = await fetch(`${getBase()}/api/auth/upgrade-session`, {
        method:'POST', headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` },
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.refresh_token) localStorage.setItem('refreshToken', data.refresh_token)
      else if (res.status === 401) endSession('reauth_required')
    } catch { /* offline: preserve account and retry on the next reconnect */ }
    finally { upgradeInFlight = null }
  })()
  return upgradeInFlight
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
  const res = await post<{ url: string; key: string }>('/api/upload', form)
  return { ...res, url: normalizeFileUrl(res.url) }
}

/**
 * Upload a file with progress reporting via XMLHttpRequest.
 * onProgress receives a value from 0 to 100.
 */
export function uploadFileWithProgress(
  file: File,
  onProgress?: (pct: number) => void
): Promise<{ url: string; key: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append('file', file)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      try {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ ...data, url: normalizeFileUrl(data.url) })
        } else {
          reject(new Error(data.error || `HTTP ${xhr.status}`))
        }
      } catch {
        reject(new Error(`HTTP ${xhr.status}`))
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')))

    const token = localStorage.getItem('token')
    xhr.open('POST', `${getBase()}/api/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  })
}

/**
 * If the server returns a relative file URL (starts with /), prepend
 * the API base URL so it resolves to the correct server in cross-domain
 * deployments (e.g. client on Vercel, server on Zeabur).
 * Exported so rendering code can also normalize URLs from the DB.
 */
export function normalizeFileUrl(url: string | null | undefined): string {
  if (!url) return ''
  const base = getBase()
  if (base && url.startsWith('/')) {
    return `${base}${url}`
  }
  return url
}
