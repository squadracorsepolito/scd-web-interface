"use client"

import type { VehicleData } from "@/types/vehicle-types"

type ConeStatsProps = {
  data: VehicleData | null
}

export default function ConeStats({ data }: ConeStatsProps) {
  return (
    <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
      <h2 className="text-lg font-medium text-zinc-300 mb-2">Cone Detection</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-yellow-400"></div>
            <p className="text-xs text-zinc-400">Yellow Cones</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400">
            {(data?.map_cones ? data.map_cones.filter((cone) => cone.color === 0).length : 0) || 0}
          </p>
        </div>
        <div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-2 bg-blue-400"></div>
            <p className="text-xs text-zinc-400">Blue Cones</p>
          </div>
          <p className="text-2xl font-bold text-blue-400">
            {(data?.map_cones ? data.map_cones.filter((cone) => cone.color === 1).length : 0) || 0}
          </p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Active Cones</p>
          <p className="text-2xl font-bold text-red-400">{data?.active_cones?.length || 0}</p>
        </div>
        <div>
          <p className="text-xs text-zinc-400">Waypoints</p>
          <p className="text-2xl font-bold text-red-500">{data?.waypoint_array?.length || 0}</p>
        </div>
      </div>
    </div>
  )
}

