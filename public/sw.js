const CACHE_NAME = "scd-pit-v1"

const APP_SHELL = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/SCD.svg",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
]

function isAppAsset(url, request) {
  if (request.mode === "navigate") return true
  if (url.pathname.startsWith("/_next/")) return true
  return APP_SHELL.includes(url.pathname)
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL).catch(() => undefined))
  )
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  if (request.method !== "GET") return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !isAppAsset(url, request)) return

  event.respondWith(fromCacheThenNetwork(request))
})

async function fromCacheThenNetwork(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request, { ignoreSearch: request.mode === "navigate" })
  const update = fetch(request)
    .then((response) => {
      if (response && response.ok && response.type === "basic") {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => undefined)

  if (cached) return cached

  const response = await update
  if (response) return response

  if (request.mode === "navigate") {
    const home = await cache.match("/") || await cache.match("/index.html")
    if (home) return home
  }

  return new Response("Offline", { status: 503, statusText: "Offline" })
}
