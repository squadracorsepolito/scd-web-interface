"use client"

import { useEffect, useRef, useState } from "react"

const CAMERA_PORT = Number(process.env.NEXT_PUBLIC_CAMERA_PORT) || 8090
const FRAME_INTERVAL_MS = 500

type CameraFusionProps = {
  getHost: () => string
  layout: "row" | "column"
}

type Side = "left" | "right"

async function pullFrame(url: string, previous: string | null) {
  const response = await fetch(url, { cache: "no-store" })
  if (!response.ok) {
    return previous
  }
  const blob = await response.blob()
  if (previous) URL.revokeObjectURL(previous)
  return URL.createObjectURL(blob)
}

function Frame({ label, src }: { label: string; src: string | null }) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-zinc-800/40 bg-zinc-900/40">
      <p className="px-3 py-2 text-xs uppercase tracking-wide text-zinc-400">{label}</p>
      <div className="flex min-h-0 flex-1 items-center justify-center bg-black">
        {src ? (
          <img src={src} alt={label} className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="px-4 text-center text-sm text-zinc-500">
            Waiting for the sensor fusion image
          </p>
        )}
      </div>
    </div>
  )
}

export default function CameraFusion({ getHost, layout }: CameraFusionProps) {
  const [frames, setFrames] = useState<{ left: string | null; right: string | null }>({
    left: null,
    right: null,
  })
  const [error, setError] = useState("")
  const framesRef = useRef(frames)
  const getHostRef = useRef(getHost)
  framesRef.current = frames
  getHostRef.current = getHost

  useEffect(() => {
    let cancelled = false
    let timer = 0

    const tick = async () => {
      const started = Date.now()
      const host = getHostRef.current()
      const base = `http://${host}:${CAMERA_PORT}`
      let failed = false
      const next = { ...framesRef.current }
      for (const side of ["left", "right"] as Side[]) {
        if (cancelled) return
        try {
          next[side] = await pullFrame(`${base}/cameras/${side}`, next[side])
        } catch {
          failed = true
        }
      }
      if (cancelled) return
      framesRef.current = next
      setFrames(next)
      setError(failed ? `Can't reach the camera images at ${base}` : "")
      const wait = Math.max(0, FRAME_INTERVAL_MS - (Date.now() - started))
      timer = window.setTimeout(tick, wait)
    }

    void tick()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      const current = framesRef.current
      if (current.left) URL.revokeObjectURL(current.left)
      if (current.right) URL.revokeObjectURL(current.right)
    }
  }, [])

  return (
    <div className={`flex min-h-0 min-w-0 flex-1 gap-3 p-6 ${layout === "column" ? "flex-col" : "flex-row"}`}>
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
        {error && <p className="px-1 text-xs text-red-300">{error}</p>}
        <div className={`flex min-h-0 flex-1 gap-3 ${layout === "column" ? "flex-col" : "flex-row"}`}>
          <Frame label="Left camera" src={frames.left} />
          <Frame label="Right camera" src={frames.right} />
        </div>
      </div>
    </div>
  )
}
