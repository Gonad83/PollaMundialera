// public/sw.js — Service Worker para PWA
// Se registra automáticamente via vite-plugin-pwa

const CACHE_NAME = 'mundial2026-v1'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
]

// ─── Install: cachear assets estáticos ───────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// ─── Activate: limpiar caches viejos ─────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ─── Fetch: estrategia Network-first para API, Cache-first para assets ────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // API calls → siempre red, sin cache
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/socket.io/')) {
    event.respondWith(fetch(event.request))
    return
  }

  // Assets estáticos → Cache-first (Vite genera nombres con hash)
  if (
    url.pathname.match(/\.(js|css|png|jpg|svg|woff2?|ico)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(
      caches.match(event.request).then((cached) =>
        cached || fetch(event.request).then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
          return res
        })
      )
    )
    return
  }

  // Rutas de la SPA → Network-first, fallback al index.html
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        // Cachear la respuesta de navegación
        const clone = res.clone()
        caches.open(CACHE_NAME).then(c => c.put(event.request, clone))
        return res
      })
      .catch(() =>
        // Offline → devolver index.html desde cache
        caches.match('/') || caches.match('/index.html')
      )
  )
})

// ─── Push Notifications ───────────────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const options = {
    body: data.body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: { url: data.url || '/' },
    actions: [
      { action: 'open', title: '⚽ Apostar ahora' },
      { action: 'close', title: 'Cerrar' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'close') return

  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const existing = clientList.find(c => c.url.includes(url) && 'focus' in c)
      if (existing) return existing.focus()
      return clients.openWindow(url)
    })
  )
})
