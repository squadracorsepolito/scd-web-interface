"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import GlobalMap from "./global-map"
import type { VehicleData } from "@/types/vehicle-types"
import Image from "next/image"

interface MapContainerProps {
  data: VehicleData | null;
  connectionMode?: 'live' | 'replay';
}

export function MapContainer({ data, connectionMode = 'live' }: MapContainerProps) {
  const [bandwidth, setBandwidth] = useState<number | null>(null);
  const [ping, setPing] = useState<number>(0);
  const lastTimestampRef = useRef(0);
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  // Toggle state variables
  const [showWaypoints, setShowWaypoints] = useState(true)
  const [showWaypointIndicators, setShowWaypointIndicators] = useState(true)
  const [showActiveCones, setShowActiveCones] = useState(true)
  const [showGreenPoints, setShowGreenPoints] = useState(true)
  const [showCones, setShowCones] = useState(true)

  useEffect(() => {
    if (data?.timestamp !== undefined) {
      const latency = data.timestamp - lastTimestampRef.current;
      lastTimestampRef.current = data.timestamp;
      setPing(latency);
      if (data?.Ndata !== undefined) {
        const dataDiff = data.Ndata;
        if (latency > 0) {
          const bw = (dataDiff / latency) * 1000 / 1024;
          setBandwidth(bw);
        }
      }
    }
  }, [data]);

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {

    e.preventDefault()
    const canvas = e.currentTarget
    const rect = canvas.getBoundingClientRect()

    // Get mouse position relative to canvas
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Calculate zoom factor based on wheel delta
    // Use a smaller coefficient for smoother zoom
    const zoomFactor = Math.pow(1.1, -Math.sign(e.deltaY) * 0.5)
    const newZoom = Math.max(0.1, Math.min(10, zoom * zoomFactor))

    // Calculate canvas center coordinates
    const canvasCenterX = canvas.width / 2
    const canvasCenterY = canvas.height / 2

    // Calculate mouse position relative to the transformed origin
    const mouseXFromCenter = (mouseX - canvasCenterX - pan.x) / zoom
    const mouseYFromCenter = (mouseY - canvasCenterY - pan.y) / zoom

    // Calculate new pan to keep the point under the mouse fixed during zoom
    const newPanX = pan.x + mouseXFromCenter * zoom - mouseXFromCenter * newZoom
    const newPanY = pan.y + mouseYFromCenter * zoom - mouseYFromCenter * newZoom

    setZoom(newZoom)
    setPan({ x: newPanX, y: newPanY })
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    setLastMousePos({ x: e.clientX, y: e.clientY })
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) {
      const dx = e.clientX - lastMousePos.x
      const dy = e.clientY - lastMousePos.y
      setPan((prevPan) => ({ x: prevPan.x + dx, y: prevPan.y + dy }))
      setLastMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }


  if (!data) {
    return (
      <div className="flex-1 relative">
        <div className="absolute inset-0 p-6">
          <div className="w-full h-full rounded-xl overflow-hidden border border-zinc-800/40 shadow-lg bg-zinc-900/30 backdrop-blur-sm flex items-center justify-center">
            <p className="text-zinc-400">Waiting for vehicle data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 relative">
      <div className="absolute inset-0 p-6">
        <div className="w-full h-full rounded-xl overflow-hidden border border-zinc-800/40 shadow-lg bg-zinc-900/30 backdrop-blur-sm">
          <div className="absolute top-4 left-4 z-10 bg-zinc-800/80 backdrop-blur-sm p-2 rounded-lg border border-zinc-700/40">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowCones(!showCones)}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  showCones 
                    ? "bg-yellow-600 text-white"
                    : "bg-zinc-700/70 text-zinc-400"
                }`}
              >
                Cones
              </button>

              <button
                onClick={() => setShowWaypoints(!showWaypoints)}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  showWaypoints 
                    ? "bg-violet-600 text-white" 
                    : "bg-zinc-700/70 text-zinc-400"
                }`}
              >
                Waypoints
              </button>
              
              <button
                onClick={() => setShowWaypointIndicators(!showWaypointIndicators)}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  showWaypointIndicators 
                    ? "bg-blue-600 text-white" 
                    : "bg-zinc-700/70 text-zinc-400"
                }`}
              >
                Indicators
              </button>
              
              <button
                onClick={() => setShowActiveCones(!showActiveCones)}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  showActiveCones 
                    ? "bg-orange-600 text-white" 
                    : "bg-zinc-700/70 text-zinc-400"
                }`}
              >
                Active Cones
              </button>

              <button
                onClick={() => setShowGreenPoints(!showGreenPoints)}
                className={`px-3 py-1 text-xs rounded-full transition-all duration-200 ${
                  showGreenPoints 
                    ? "bg-green-600 text-white" 
                    : "bg-zinc-700/70 text-zinc-400"
                }`}
              >
                MPC Predicted Trajectory
              </button>
            </div>
          </div>
          <GlobalMap
            data={data}
            zoom={zoom}
            pan={pan}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            showCones={showCones}
            showWaypoints={showWaypoints}
            showWaypointIndicators={showWaypointIndicators}
            showActiveCones={showActiveCones}
            showGreenPoints={showGreenPoints}
          />
        </div>
      </div>

      {/* Ping */}
      {connectionMode === 'live' && (
        <div className="absolute top-8 right-8 px-3 py-1.5 bg-black/70 border border-zinc-700 rounded-md">
          <div className="flex flex-col">
            <span className="text-sm font-mono">
              {ping !== null ? `Ping: ${ping.toFixed(2)} ms` : 'Calculating ping...'}
            </span>
            <span className="text-sm font-mono">
              {bandwidth !== null ? `Bandwidth: ${bandwidth.toFixed(2)} KB/s` : 'Calculating bandwidth...'}
            </span>
          </div>
        </div>
      )}

      {/* SCD Logo */}
      <div className="absolute bottom-8 left-8">
        <div className="relative w-20 h-6 opacity-50">
          <Image 
            src="/SCD.svg" 
            alt="Squadra Corse Driverless" 
            fill 
            className="object-contain"
            priority
          />
        </div>
      </div>

      {/* Zoom */}
      <div className="absolute bottom-8 right-8 flex flex-col space-y-2">
        <Button
          onClick={() => {
            const newZoom = Math.min(10, zoom * 1.2)
            setZoom(newZoom)
          }}
          variant="outline"
          className="w-10 h-10 flex items-center justify-center bg-black/70 border-zinc-700 text-white hover:bg-zinc-800"
        >
          <span className="text-xl font-bold">+</span>
        </Button>
        <Button
          onClick={() => {
            const newZoom = Math.max(0.1, zoom * 0.8)
            setZoom(newZoom)
          }}
          variant="outline"
          className="w-10 h-10 flex items-center justify-center bg-black/70 border-zinc-700 text-white hover:bg-zinc-800"
        >
          <span className="text-xl font-bold">-</span>
        </Button>
      </div>
    </div>
  )
}

