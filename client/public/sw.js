/* PaperPhonePlus Service Worker — push notifications + offline shell */
const CACHE_NAME = 'paperphoneplus-shell-v2'
const MEDIA_CACHE_NAME = 'paperphone-media-v2'

// Install: cache app shell
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![CACHE_NAME, MEDIA_CACHE_NAME].includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

// Push notification handler
self.addEventListener('push', (event) => {
  let data = { title: 'PaperPhonePlus', body: 'New message' }
  try {
    if (event.data) data = event.data.json()
  } catch {}

  const options = {
    body: data.body || 'New message',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [],
    tag: data.tag || 'paperphoneplus-msg',
    renotify: true,
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // If app is in foreground, suppress push notification (WebSocket handles it)
      const anyVisible = clients.some(c => c.visibilityState === 'visible')
      if (anyVisible) return
      return self.registration.showNotification(data.title || 'PaperPhonePlus', options)
    })
  )
})

// Click on notification → focus or open app
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const focused = clients.find(c => c.focused || c.visibilityState === 'visible')
      if (focused) return focused.focus()
      if (clients.length > 0) return clients[0].focus()
      return self.clients.openWindow('/')
    })
  )
})

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API JSON is persisted by the app with account isolation. Media responses
  // remain in Cache Storage so they are available while offline.
  if (url.pathname.startsWith('/ws')) return
  if (url.pathname.startsWith('/api') && !url.pathname.startsWith('/api/uploads') && !url.pathname.startsWith('/api/media')) return

  // For navigation and assets, try network first then cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/index.html'))
    )
    return
  }

  // Static assets: cache-first
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request, { ignoreVary: true }).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone()
            const isMedia = response.headers.get('content-type')?.match(/^(image|video|audio)\//)
            caches.open(isMedia ? MEDIA_CACHE_NAME : CACHE_NAME).then(cache => cache.put(event.request, clone))
          }
          return response
        }).catch(() => cached)
        return cached || fetchPromise
      })
    )
  }
})
