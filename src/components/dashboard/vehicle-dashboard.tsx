"use client"

import { type VehicleData, getStateClass, getStateLabel } from "@/types/vehicle-types"
import ConnectionStatus from "./connection-status"
import VehicleMetrics from "./vehicle-metrics"
import SteeringWheel from "./steering-wheel"
import ConeStats from "./cone-stats"
import SpeedChart from "../charts/speed-chart"
import ThrottleChart from "../charts/throttle-chart"
import type { DataPoint } from "@/types/vehicle-types"
import Image from "next/image"

type VehicleDashboardProps = {
  data: VehicleData | null
  connected: boolean
  isReconnecting: boolean
  reconnectAttempt: number
  speedData: DataPoint[]
  throttleData: DataPoint[]
}

export default function VehicleDashboard({
  data,
  connected,
  isReconnecting,
  reconnectAttempt,
  speedData,
  throttleData,
}: VehicleDashboardProps) {
  return (
    <div
      className="w-1/4 p-6 bg-zinc-900/80 backdrop-blur-md border-r border-zinc-800/40 overflow-y-auto"
      style={{
        scrollbarWidth: "thin",
        scrollbarColor: "#4B5563 #1F2937",
      }}
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="relative w-32 h-6 shrink-0">
              <Image 
                src="/SCD.svg" 
                alt="Squadra Corse Driverless" 
                fill 
                className="object-contain"
                priority
              />
            </div>
            <h1 className="text-2xl font-bold text-white">Web Interface</h1>
          </div>
          <div className="h-0.5 w-full bg-gradient-to-r from-red-600 to-red-900"></div>
        </div>

        <div className="space-y-4">
          <ConnectionStatus connected={connected} isReconnecting={isReconnecting} reconnectAttempt={reconnectAttempt} />

          <div className="flex justify-between items-center">
            <span className="text-zinc-400">Current State:</span>
            <div className={`px-3 py-1 rounded-full ${getStateClass(data?.state)}`}>{getStateLabel(data?.state)}</div>
          </div>

          <VehicleMetrics data={data} />
          <SteeringWheel delta={data?.delta} />
          <ConeStats data={data} />

          <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
            <h2 className="text-lg font-medium text-zinc-300 mb-2">Speed Graph</h2>
            <div className="w-full h-64 bg-zinc-800/50 rounded-md overflow-hidden">
              <SpeedChart data={speedData} />
            </div>
          </div>

          <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
            <h2 className="text-lg font-medium text-zinc-300 mb-2">Throttle Graph</h2>
            <div className="w-full h-64 bg-zinc-800/50 rounded-md overflow-hidden">
              <ThrottleChart data={throttleData} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

