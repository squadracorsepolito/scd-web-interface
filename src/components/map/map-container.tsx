"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import GlobalMap from "./global-map"
import type { VehicleData, MapSettings } from "@/types/vehicle-types"

type MapContainerProps = {
  data: VehicleData | null
}

export default function MapContainer({ data }: MapContainerProps) {
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })
  const [globalMapSettings, setGlobalMapSettings] = useState<MapSettings>({
    zoom: 1,
    pan: { x: 0, y: 0 },
  })

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
          <GlobalMap
            data={data}
            zoom={zoom}
            pan={pan}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
      </div>

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

