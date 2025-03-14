"use client"

import type { VehicleData } from "@/types/vehicle-types"

type VehicleMetricsProps = {
  data: VehicleData | null
}

export default function VehicleMetrics({ data }: VehicleMetricsProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <h2 className="text-lg font-medium text-zinc-300 mb-2">Vehicle Metrics</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs text-zinc-400">Speed</p>
          <p className="text-2xl font-bold text-cyan-400">
            {typeof data?.speed === "number" ? data.speed.toFixed(2) : "N/A"}
          </p>
          <p className="text-xs text-zinc-400">m/s</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Steering Angle</p>
          <p className="text-2xl font-bold text-violet-400">
            {typeof data?.delta === "number" ? data.delta.toFixed(2) : "N/A"}
          </p>
          <p className="text-xs text-zinc-400">rad</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Throttle</p>
          <p className="text-2xl font-bold text-amber-400">
            {typeof data?.throttle === "number" ? data.throttle.toFixed(2) : "N/A"}
          </p>
          <p className="text-xs text-zinc-400">%</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Lap</p>
          <p className="text-2xl font-bold text-emerald-400">{typeof data?.lap === "number" ? data.lap : "N/A"}</p>
        </div>
      </div>
    </div>
  )
}

