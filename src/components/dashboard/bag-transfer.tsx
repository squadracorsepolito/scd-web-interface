"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"

const BAG_PORT = Number(process.env.NEXT_PUBLIC_BAG_PORT) || 8088

type BagEntry = {
  name: string
  bytes: number
  modified_ms: number
  recording: boolean
  kind: "directory" | "file"
}

type BagTransferProps = {
  getHost: () => string
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatTime(modifiedMs: number) {
  if (!modifiedMs) return ""
  return new Date(modifiedMs).toLocaleString()
}

export default function BagTransfer({ getHost }: BagTransferProps) {
  const [open, setOpen] = useState(false)
  const [bags, setBags] = useState<BagEntry[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [downloaded, setDownloaded] = useState<Record<string, boolean>>({})
  const [deleting, setDeleting] = useState("")
  const [baseUrl, setBaseUrl] = useState("")

  const serverUrl = () => `http://${getHost()}:${BAG_PORT}`

  const loadBags = async () => {
    setLoading(true)
    setError("")
    try {
      const response = await fetch(`${serverUrl()}/bags`)
      if (!response.ok) throw new Error(`Bag server returned ${response.status}`)
      const payload = await response.json() as { bags?: BagEntry[] }
      setBags(Array.isArray(payload.bags) ? payload.bags : [])
    } catch {
      setBags([])
      setError(`Can't reach the bag server at ${serverUrl()}. It has to be running on the car.`)
    } finally {
      setLoading(false)
    }
  }

  const openPanel = () => {
    setBaseUrl(serverUrl())
    setOpen(true)
    void loadBags()
  }

  const downloadBag = (bag: BagEntry) => {
    const link = document.createElement("a")
    link.href = `${serverUrl()}/bags/${encodeURIComponent(bag.name)}`
    link.download = bag.kind === "directory" ? `${bag.name}.tar` : bag.name
    document.body.appendChild(link)
    link.click()
    link.remove()
    setDownloaded((current) => ({ ...current, [bag.name]: true }))
  }

  const deleteBag = async (bag: BagEntry) => {
    const confirmed = window.confirm(
      `Delete ${bag.name} from the car? Only do this after the download has finished saving.`
    )
    if (!confirmed) return
    setDeleting(bag.name)
    setError("")
    try {
      const response = await fetch(`${serverUrl()}/bags/${encodeURIComponent(bag.name)}`, {
        method: "DELETE",
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { error?: string }
        throw new Error(payload.error || `Delete failed (${response.status})`)
      }
      setDownloaded((current) => {
        const next = { ...current }
        delete next[bag.name]
        return next
      })
      await loadBags()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeleting("")
    }
  }

  return (
    <>
      <Button
        onClick={openPanel}
        size="sm"
        className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 text-sm"
      >
        Bags
      </Button>
      {open && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6">
          <div className="w-full max-w-xl max-h-[80vh] overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 shadow-xl flex flex-col">
            <div className="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
              <div>
                <h2 className="text-lg font-semibold text-white">Bags on the car</h2>
                <p className="text-xs text-zinc-400">{baseUrl}</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => void loadBags()} size="sm" className="bg-zinc-700 hover:bg-zinc-600">
                  Refresh
                </Button>
                <Button onClick={() => setOpen(false)} size="sm" className="bg-zinc-800 hover:bg-zinc-700">
                  Close
                </Button>
              </div>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {loading && <p className="text-sm text-zinc-400">Loading bags…</p>}
              {error && <p className="text-sm text-red-300">{error}</p>}
              {!loading && !error && bags.length === 0 && (
                <p className="text-sm text-zinc-400">No bags in the folder.</p>
              )}
              {bags.map((bag) => (
                <div key={bag.name} className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{bag.name}</p>
                      <p className="text-xs text-zinc-400">
                        {formatBytes(bag.bytes)} · {formatTime(bag.modified_ms)}
                        {bag.recording ? " · recording" : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        onClick={() => downloadBag(bag)}
                        size="sm"
                        disabled={bag.recording}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-40"
                      >
                        Download
                      </Button>
                      {downloaded[bag.name] && !bag.recording && (
                        <Button
                          onClick={() => void deleteBag(bag)}
                          size="sm"
                          disabled={deleting === bag.name}
                          className="bg-zinc-700 hover:bg-red-900"
                        >
                          {deleting === bag.name ? "Deleting…" : "Delete"}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
