/* eslint-disable no-restricted-globals */
const CACHE_NAME = "medirush-v1"
const CRITICAL_ASSETS = ["/", "/index.html"]

const CACHE_STRATEGIES = {
  static: [".js", ".css", ".png", ".svg", ".woff2"],
  api: ["/api/hospitals", "/api/patient"],
  realtime: ["/api/analyze", "/api/notify", "/ws/"],
}

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CRITICAL_ASSETS)))
})

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url)
  if (url.protocol === "ws:" || url.protocol === "wss:") return

  if (CACHE_STRATEGIES.realtime.some((p) => url.pathname.includes(p))) return

  if (url.pathname.startsWith("/api/")) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const clone = res.clone()
          caches.open(CACHE_NAME).then((c) => c.put(e.request, clone))
          return res
        })
        .catch(() => caches.match(e.request))
    )
    return
  }

  e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request)))
})
