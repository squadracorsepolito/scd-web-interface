"use client"

import type { SensorHealth } from "@/types/vehicle-types"

type SensorHealthPanelProps = {
  health?: SensorHealth | null
}

function SensorFlag({ label, live }: { label: string; live: boolean | undefined }) {
  const known = typeof live === "boolean"
  const tone = !known
    ? "border-zinc-700 text-zinc-400"
    : live
      ? "border-emerald-700/80 text-emerald-300"
      : "border-red-800/80 text-red-300"

  return (
    <div className={`rounded-md border px-2 py-1.5 ${tone}`}>
      <p className="text-[10px] uppercase tracking-wide text-zinc-400">{label}</p>
      <p className="text-sm font-semibold">{!known ? "—" : live ? "Live" : "Down"}</p>
    </div>
  )
}

export default function SensorHealthPanel({ health }: SensorHealthPanelProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <h2 className="text-lg font-medium text-zinc-300 mb-2">Sensor health</h2>
      <div className="grid grid-cols-3 gap-2">
        <SensorFlag label="LiDAR" live={health?.lidar} />
        <SensorFlag label="Left cam" live={health?.left_camera} />
        <SensorFlag label="Right cam" live={health?.right_camera} />
      </div>
    </div>
  )
}
