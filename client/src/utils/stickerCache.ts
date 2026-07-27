import { normalizeFileUrl } from '../api/http'

export const STICKER_CACHE_NAME = 'paperphone-stickers-v1'

export function stickerProxyUrl(fileId: string): string {
  return normalizeFileUrl(`/api/stickers/proxy/${encodeURIComponent(fileId)}`)
}

function cacheKey(fileId: string): Request {
  return new Request(stickerProxyUrl(fileId), { method: 'GET' })
}

/** Persist a Telegram sticker in Cache Storage using its stable file_id. */
export async function cacheSticker(fileId: string): Promise<Response> {
  if (!fileId) throw new Error('Missing sticker file_id')

  const key = cacheKey(fileId)
  if ('caches' in window) {
    const cache = await caches.open(STICKER_CACHE_NAME)
    const cached = await cache.match(key)
    if (cached) return cached
  }

  const token = localStorage.getItem('token')
  const response = await fetch(key.url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  })
  if (!response.ok) throw new Error(`Sticker download failed: HTTP ${response.status}`)

  if ('caches' in window) {
    const cache = await caches.open(STICKER_CACHE_NAME)
    await cache.put(key, response.clone())
  }
  return response
}

export async function cachedStickerObjectUrl(fileId: string): Promise<string> {
  const response = await cacheSticker(fileId)
  return URL.createObjectURL(await response.blob())
}

export async function cacheStickerPack(stickers: Array<{ file_id?: string }>): Promise<void> {
  await Promise.allSettled(stickers.map(sticker =>
    sticker.file_id ? cacheSticker(sticker.file_id).then(() => undefined) : Promise.resolve()
  ))
}
