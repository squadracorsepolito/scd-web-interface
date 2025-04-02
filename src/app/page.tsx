"use client"
import type React from "react"

import { useEffect, useState, useRef } from "react"
import type { VehicleData as VehicleDataType, DataPoint as DataPointType } from "@/types/vehicle-types"
import VehicleDashboard from "../components/dashboard/vehicle-dashboard"
import { MapContainer } from "../components/map/map-container"
import { WebSocketService } from "../utils/websocket-service"

export default function VehicleVisualization() {
  const [data, setData] = useState<VehicleDataType | null>(null)
  const [connected, setConnected] = useState<boolean>(false)
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false)
  const [speedData, setSpeedData] = useState<DataPointType[]>([])
  const [throttleData, setThrottleData] = useState<DataPointType[]>([])
  const reconnectAttemptsRef = useRef(0)
  const wsRef = useRef<WebSocketService | null>(
    new WebSocketService({
      onConnect: () => setConnected(true),
      onDisconnect: () => {
        setConnected(false)
        setIsReconnecting(false)
      },
      onReconnecting: (attempt) => {
        reconnectAttemptsRef.current = attempt
        setIsReconnecting(true)
      },
      onData: (receivedData) => setData(receivedData),
      onSpeedData: (data) => setSpeedData(data),
      onThrottleData: (data) => setThrottleData(data)
    })
  )

  useEffect(() => {
    // Connect to WebSocket on mount
    wsRef.current?.connect()

    // Cleanup on unmount
    return () => {
      wsRef.current?.disconnect()
    }
  }, [])

  return (
    <div className="flex h-screen w-screen bg-black text-white overflow-hidden dark">
      <VehicleDashboard
        data={data}
        connected={connected}
        isReconnecting={isReconnecting}
        reconnectAttempt={reconnectAttemptsRef.current}
        speedData={speedData}
        throttleData={throttleData}
        webSocketService={wsRef.current}
      />
      <MapContainer 
        data={data} 
        connectionMode={wsRef.current?.getConnectionMode()} 
      />
    </div>
  )
}
