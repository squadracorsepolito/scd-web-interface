"use client"

import { type VehicleData } from "@/types/vehicle-types"
import VehicleMetrics from "./vehicle-metrics"
import SteeringWheel from "./steering-wheel"
import ConeStats from "./cone-stats"
import SpeedChart from "../charts/speed-chart"
import ThrottleChart from "../charts/throttle-chart"
import type { DataPoint } from "@/types/vehicle-types"
import Image from "next/image"
import { WebSocketService } from "@/utils/websocket-service"
import { ConnectionControls } from '@/components/ui/ConnectionControls'

type VehicleDashboardProps = {
  data: VehicleData | null
  connected: boolean
  isReconnecting: boolean
  reconnectAttempt: number
  speedData: DataPoint[]
  throttleData: DataPoint[]
  webSocketService: WebSocketService | null
}

export default function VehicleDashboard({
  data,
  connected,
  isReconnecting,
  reconnectAttempt,
  speedData,
  throttleData,
  webSocketService,
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
          {webSocketService && (
            <div className="p-4 rounded-lg bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/40">
              <ConnectionControls 
                webSocketService={webSocketService}
                connected={connected}
                isReconnecting={isReconnecting}
                reconnectAttempt={reconnectAttempt}
              />
            </div>
          )}

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