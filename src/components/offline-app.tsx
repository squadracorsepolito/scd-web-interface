"use client"

import { useEffect, useState } from "react"

const CACHE_NAME = "scd-pit-v1"

const APP_SHELL = [
  "/",
  "/favicon.ico",
  "/SCD.svg",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
]

type InstallPrompt = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

function pageAssetUrls() {
  const urls = new Set(APP_SHELL)
  document.querySelectorAll("script[src], link[href]").forEach((element) => {
    const value = element.getAttribute("src") || element.getAttribute("href")
    if (!value) return
    const url = new URL(value, window.location.origin)
    if (url.origin === window.location.origin) urls.add(`${url.pathname}${url.search}`)
  })
  return [...urls]
}

async function storePageForOffline() {
  const cache = await caches.open(CACHE_NAME)
  await Promise.all(pageAssetUrls().map(async (url) => {
    try {
      const response = await fetch(url)
      if (response.ok) await cache.put(url, response)
    } catch {
      // A missing icon should not stop the rest of the page from being saved.
    }
  }))
}

export function OfflineApp() {
  const [saved, setSaved] = useState(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return

    let cancelled = false

    const onInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPrompt)
    }
    window.addEventListener("beforeinstallprompt", onInstallPrompt)

    navigator.serviceWorker.register("/sw.js").then(async () => {
      await navigator.serviceWorker.ready
      await storePageForOffline()
      if (!cancelled) setSaved(true)
    }).catch(() => undefined)

    return () => {
      cancelled = true
      window.removeEventListener("beforeinstallprompt", onInstallPrompt)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    setInstallPrompt(null)
  }

  if (!saved && !installPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 z-50">
      {installPrompt ? (
        <button
          type="button"
          onClick={install}
          className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Download for offline
        </button>
      ) : (
        <p className="rounded-md bg-zinc-900/90 px-3 py-2 text-xs text-zinc-300">
          Saved for offline
        </p>
      )}
    </div>
  )
}
