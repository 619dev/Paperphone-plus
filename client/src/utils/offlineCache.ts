const DATA_PREFIX = 'pp_offline_data:'
export const MEDIA_CACHE_NAME = 'paperphone-media-v2'

function accountId(): string {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')?.id || 'anonymous'
  } catch {
    return 'anonymous'
  }
}

function storageKey(key: string): string {
  return `${DATA_PREFIX}${accountId()}:${key}`
}

export function readOfflineData<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(storageKey(key))
    return raw ? JSON.parse(raw) as T : fallback
  } catch {
    return fallback
  }
}

export function writeOfflineData<T>(key: string, value: T): void {
  try {
    localStorage.setItem(storageKey(key), JSON.stringify(value))
  } catch (error) {
    console.warn('[OfflineCache] Could not persist data:', key, error)
  }
  void cacheMediaIn(value)
}

function collectMediaUrls(value: unknown, urls: Set<string>, depth = 0): void {
  if (depth > 8 || value == null) return
  if (typeof value === 'string') {
    if (/^(https?:|blob:)/i.test(value) || value.startsWith('/uploads/') || value.startsWith('/media/')) {
      urls.add(value)
    }
    return
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectMediaUrls(item, urls, depth + 1))
    return
  }
  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => collectMediaUrls(item, urls, depth + 1))
  }
}

export async function cacheMediaIn(value: unknown): Promise<void> {
  if (!('caches' in window)) return
  const urls = new Set<string>()
  collectMediaUrls(value, urls)
  if (urls.size === 0) return

  const base = localStorage.getItem('serverUrl') || import.meta.env.VITE_API_URL || location.origin
  const cache = await caches.open(MEDIA_CACHE_NAME)
  await Promise.allSettled(Array.from(urls).map(async rawUrl => {
    if (rawUrl.startsWith('blob:')) return
    const url = rawUrl.startsWith('/') ? `${base}${rawUrl}` : rawUrl
    const request = new Request(url, { credentials: 'omit' })
    if (await cache.match(request)) return
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response)
  }))
}

export async function clearOfflineCache(): Promise<void> {
  const prefix = `${DATA_PREFIX}${accountId()}:`
  Object.keys(localStorage)
    .filter(key => key.startsWith(prefix) || key === 'pp_msg_cache')
    .forEach(key => localStorage.removeItem(key))

  if ('caches' in window) {
    const names = await caches.keys()
    await Promise.all(names.filter(name => name === MEDIA_CACHE_NAME).map(name => caches.delete(name)))
  }
}
