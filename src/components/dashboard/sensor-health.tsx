"use client"

import type { ReactNode } from "react"
import { Camera, Radar } from "lucide-react"
import type { SensorHealth } from "@/types/vehicle-types"

type SensorHealthPanelProps = {
  health?: SensorHealth | null
  onShowCameras: () => void
  onShowSplit: () => void
}

function tone(live: boolean | undefined) {
  if (typeof live !== "boolean") {
    return "border-zinc-700 bg-zinc-900/40 text-zinc-500"
  }
  return live
    ? "border-emerald-600/80 bg-emerald-500/15 text-emerald-300"
    : "border-red-800/80 bg-red-500/10 text-red-300"
}

function SensorIcon({
  label,
  live,
  icon,
  onClick,
}: {
  label: string
  live: boolean | undefined
  icon: ReactNode
  onClick?: () => void
}) {
  const known = typeof live === "boolean"
  const body = (
    <>
      <span className="flex h-9 w-9 items-center justify-center">{icon}</span>
      <span className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</span>
      <span className="text-xs font-semibold">{!known ? "—" : live ? "Live" : "Down"}</span>
    </>
  )
  const className = `flex flex-col items-center gap-1 rounded-md border px-2 py-2 ${tone(live)} ${
    onClick ? "cursor-pointer hover:brightness-125" : ""
  }`

  if (!onClick) {
    return <div className={className}>{body}</div>
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  )
}

export default function SensorHealthPanel({ health, onShowCameras, onShowSplit }: SensorHealthPanelProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h2 className="text-lg font-medium text-zinc-300">Sensor health</h2>
        <p className="font-mono text-2xl font-semibold text-white" title="Health bitmask">
          {typeof health?.status === "number" ? health.status : "—"}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <SensorIcon
          label="Left cam"
          live={health?.left_camera}
          icon={<Camera className="h-6 w-6" />}
          onClick={onShowCameras}
        />
        <SensorIcon
          label="Right cam"
          live={health?.right_camera}
          icon={<Camera className="h-6 w-6" />}
          onClick={onShowCameras}
        />
        <SensorIcon
          label="LiDAR"
          live={health?.lidar}
          icon={<Radar className="h-6 w-6" />}
        />
      </div>
      <button
        type="button"
        onClick={onShowSplit}
        className="mt-2 w-full rounded-md border border-zinc-600 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-700/60"
      >
        Map + cameras
      </button>
    </div>
  )
}
