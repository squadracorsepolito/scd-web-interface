"use client"

import type React from "react"

import { useEffect, useRef } from "react"
import type { VehicleData } from "@/types/vehicle-types"

type GlobalMapProps = {
  data: VehicleData
  zoom: number
  pan: { x: number; y: number }
  onMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void
  onMouseUp: () => void
  onWheel: (e: React.WheelEvent<HTMLCanvasElement>) => void
}

export default function GlobalMap({ data, zoom, pan, onMouseDown, onMouseMove, onMouseUp, onWheel }: GlobalMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    drawMap()
  }, [data, zoom, pan])

  const drawMap = () => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Clear canvas
    ctx.fillStyle = "#19191f"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Apply zoom and pan
    ctx.save()
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y)
    ctx.scale(zoom, zoom)

    // Draw infinite grid
    ctx.strokeStyle = "#374151"
    ctx.lineWidth = 0.5 / zoom
    const gridSize = 20
    const scale = 20

    // Calculate grid boundaries based on viewport
    const viewportHalfWidth = canvas.width / 2 / zoom
    const viewportHalfHeight = canvas.height / 2 / zoom
    const panOffsetX = -pan.x / zoom
    const panOffsetY = -pan.y / zoom

    // Calculate grid lines visible in the viewport
    const startX = Math.floor((panOffsetX - viewportHalfWidth) / gridSize) * gridSize
    const endX = Math.ceil((panOffsetX + viewportHalfWidth) / gridSize) * gridSize
    const startY = Math.floor((panOffsetY - viewportHalfHeight) / gridSize) * gridSize
    const endY = Math.ceil((panOffsetY + viewportHalfHeight) / gridSize) * gridSize

    // Draw vertical grid lines
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, startY)
      ctx.lineTo(x, endY)
      ctx.stroke()
    }

    // Draw horizontal grid lines
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(startX, y)
      ctx.lineTo(endX, y)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = "#6B7280"
    ctx.lineWidth = 1 / zoom

    // X-axis
    ctx.beginPath()
    ctx.moveTo(startX * scale, 0)
    ctx.lineTo(endX * scale, 0)
    ctx.stroke()

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(0, startY * scale)
    ctx.lineTo(0, endY * scale)
    ctx.stroke()

    // Draw map cones only (no active cones in global view)
    data.map_cones.forEach((cone) => {
      drawCone(ctx, cone.x * scale, -cone.y * scale, cone.color, zoom)
    })

    // Draw waypoints and connect them
    if (data.waypoint_array.length > 0) {
      ctx.beginPath()
      const firstPoint = data.waypoint_array[0]
      ctx.moveTo(firstPoint.x * scale, -firstPoint.y * scale)

      data.waypoint_array.forEach((waypoint, index) => {
        if (index > 0) {
          ctx.lineTo(waypoint.x * scale, -waypoint.y * scale)
        }
      })

      ctx.strokeStyle = "rgba(139, 92, 246, 0.7)"
      ctx.lineWidth = 3 / zoom
      ctx.setLineDash([5 / zoom, 5 / zoom])
      ctx.stroke()
      ctx.setLineDash([])

      data.waypoint_array.forEach((waypoint, index) => {
        const x = waypoint.x * scale
        const y = -waypoint.y * scale

        ctx.beginPath()
        ctx.arc(x, y, 6 / zoom, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(139, 92, 246, 0.8)"
        ctx.fill()

        ctx.fillStyle = "#ffffff"
        ctx.font = `${10 / zoom}px Arial`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(index.toString(), x, y)
      })
    }

    // Draw vehicle position
    const vehicleX = data.x * scale
    const vehicleY = -data.y * scale

    drawVehicle(ctx, vehicleX, vehicleY, data.yaw, zoom)

    ctx.restore()
  }

  const drawCone = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: number,
    zoom: number,
    isActive = false,
  ) => {
    ctx.beginPath()
    ctx.moveTo(x, y - 10 / zoom)
    ctx.lineTo(x - 7 / zoom, y + 5 / zoom)
    ctx.lineTo(x + 7 / zoom, y + 5 / zoom)
    ctx.closePath()

    ctx.fillStyle = color === 1 ? "#3B82F6" : "#FBBF24"
    ctx.fill()

    if (isActive) {
      ctx.shadowColor = color === 1 ? "rgba(96, 165, 250, 0.8)" : "rgba(252, 211, 77, 0.8)"
      ctx.shadowBlur = 15 / zoom
      ctx.fill()
      ctx.shadowBlur = 0

      ctx.beginPath()
      ctx.arc(x, y, 15 / zoom, 0, Math.PI * 2)
      ctx.strokeStyle = color === 1 ? "rgba(96, 165, 250, 0.6)" : "rgba(252, 211, 77, 0.6)"
      ctx.lineWidth = 2 / zoom
      ctx.stroke()
    } else {
      ctx.shadowColor = color === 1 ? "rgba(59, 130, 246, 0.5)" : "rgba(251, 191, 36, 0.5)"
      ctx.shadowBlur = 10 / zoom
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  const drawVehicle = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number, zoom: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-angle)

    ctx.beginPath()
    ctx.rect(-15 / zoom, -10 / zoom, 30 / zoom, 20 / zoom)
    ctx.fillStyle = "#EF4444"
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(15 / zoom, 0)
    ctx.lineTo(-15 / zoom, -10 / zoom)
    ctx.lineTo(-15 / zoom, 10 / zoom)
    ctx.closePath()
    ctx.fillStyle = "#B91C1C"
    ctx.fill()

    ctx.restore()
  }

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    />
  )
}

