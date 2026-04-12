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
          resolve(data)
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
    xhr.open('POST', `${BASE}/api/upload`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.send(form)
  })
}
