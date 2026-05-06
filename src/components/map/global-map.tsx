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
  showCones?: boolean
  showWaypoints?: boolean
  showWaypointIndicators?: boolean
  showActiveCones?: boolean
  showGreenPoints?: boolean
}

export default function GlobalMap({
  data,
  zoom,
  pan,
  onMouseDown,
  onMouseMove,
  onMouseUp,
  onWheel,
  showCones = true,
  showWaypoints = true,
  showWaypointIndicators = true,
  showActiveCones = true,
  showGreenPoints = true,
}: GlobalMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    drawMap()
  })

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

    // Calculate vehicle position
    const vehicleX = data.x * scale
    const vehicleY = -data.y * scale

    // Draw map cones
    if (showCones && data.map_cones){
      data.map_cones.forEach((cone) => {
        drawCone(ctx, cone.x * scale, -cone.y * scale, cone.color, zoom)
      })
    }

    // Draw green points
    if (showGreenPoints && data.green_points && data.green_points.length > 0) {
      data.green_points.forEach((cone) => {
        drawCone(ctx, cone.x * scale, -cone.y * scale, 5, zoom, true)
      })
    }

    // Calculate active cone position relative to car
    const calculateRelativeToCar = (coneX: number, coneY: number) => {
      const cosYaw = Math.cos(data.yaw)
      const sinYaw = Math.sin(data.yaw)

      const relativeX = coneX * cosYaw + coneY * sinYaw + vehicleX
      const relativeY = -coneX * sinYaw + coneY * cosYaw + vehicleY

      return { x: relativeX, y: relativeY }
    }

    // Draw active cones
    if (showActiveCones && data.active_cones && data.active_cones.length > 0) {
      data.active_cones.forEach((cone) => {
        const globalConeX = cone.x * scale
        const globalConeY = -cone.y * scale

        // Get position relative to car
        const relativePos = calculateRelativeToCar(globalConeX, globalConeY)

        drawCone(ctx, relativePos.x, relativePos.y, cone.color, zoom, true)
      })
    }

    // Draw waypoints
    if (showWaypoints && data.waypoint_array.length > 0) {
      // Function to get color based on velocity reference
      const getVelocityColor = (vel: number) => {
        const clampedVel = Math.max(0, Math.min(20, vel))
        const red = 255 - clampedVel * 12.75 // 255 -> 0
        const green = clampedVel * 12.75 // 0 -> 255
        return `rgba(${Math.round(red)}, ${Math.round(green)}, 0, 0.8)`
      }

      // Draw lines between waypoints
      for (let i = 0; i < data.waypoint_array.length - 1; i++) {
        const current = data.waypoint_array[i]
        const next = data.waypoint_array[i + 1]

        const startX = current.x * scale
        const startY = -current.y * scale
        const endX = next.x * scale
        const endY = -next.y * scale

        // Create gradient for line
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY)
        const startColor = getVelocityColor(current.vel_ref || 0)
        const endColor = getVelocityColor(next.vel_ref || 0)

        gradient.addColorStop(0, startColor)
        gradient.addColorStop(1, endColor)

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 3 / zoom
        ctx.setLineDash([5 / zoom, 5 / zoom])
        ctx.stroke()
      }

      // Connect the last waypoint back to the first one to create a loop after lap 1 (to prevent flickering while exploring)
      if (data.lap > 1 && data.waypoint_array.length >= 2) {
        const first = data.waypoint_array[0]
        const last = data.waypoint_array[data.waypoint_array.length - 1]

        const startX = last.x * scale
        const startY = -last.y * scale
        const endX = first.x * scale
        const endY = -first.y * scale

        // Create gradient for connecting line
        const gradient = ctx.createLinearGradient(startX, startY, endX, endY)
        const startColor = getVelocityColor(last.vel_ref || 0)
        const endColor = getVelocityColor(first.vel_ref || 0)

        gradient.addColorStop(0, startColor)
        gradient.addColorStop(1, endColor)

        ctx.beginPath()
        ctx.moveTo(startX, startY)
        ctx.lineTo(endX, endY)
        ctx.strokeStyle = gradient
        ctx.lineWidth = 3 / zoom
        ctx.setLineDash([5 / zoom, 5 / zoom])
        ctx.stroke()
      }

      ctx.setLineDash([])

      // Draw waypoint circles
      if (showWaypointIndicators) {
        data.waypoint_array.forEach((waypoint, index) => {
          const x = waypoint.x * scale
          const y = -waypoint.y * scale

          const waypointSizeBase = 6
          const waypointSize = waypointSizeBase * (0.5 + 0.5/Math.max(0.5, zoom))
          
          ctx.beginPath()
          ctx.arc(x, y, waypointSize, 0, Math.PI * 2)

          // Use velocity-based color (default is red)
          const wayPointColor = getVelocityColor(waypoint.vel_ref)

          ctx.fillStyle = wayPointColor
          ctx.fill()

          // Adjust text size based on zoom
          const textSizeBase = 10
          const textSize = textSizeBase * (0.5 + 0.5/Math.max(0.5, zoom))
          
          ctx.fillStyle = "#ffffff"
          ctx.font = `${textSize}px Arial`
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(index.toString(), x, y)
        })
      }
    }

    // Draw vehicle position

    drawVehicle(ctx, vehicleX, vehicleY, data.yaw)

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
    // Define cone sizes - regular and big
    let coneHeight = 10
    let coneWidth = 7

    // Make big orange cones larger
    if (color === 4) {
      coneHeight = 15
      coneWidth = 10
    }

    ctx.beginPath()
    ctx.moveTo(x, y - coneHeight)
    ctx.lineTo(x - coneWidth, y + coneHeight / 2)
    ctx.lineTo(x + coneWidth, y + coneHeight / 2)
    ctx.closePath()

    // Add support for all cone colors
    let fillColor
    let shadowColor
    let strokeColor

    if (color === 1) {
      fillColor = "#3B82F6" // Blue
      shadowColor = isActive ? "rgba(96, 165, 250, 0.8)" : "rgba(59, 130, 246, 0.5)"
      strokeColor = "rgba(96, 165, 250, 0.6)"
    } else if (color === 2) {
      fillColor = "#FBBF24" // Yellow
      shadowColor = isActive ? "rgba(252, 211, 77, 0.8)" : "rgba(251, 191, 36, 0.5)"
      strokeColor = "rgba(252, 211, 77, 0.6)"
    } else if (color === 3) {
      fillColor = "#F97316" // Orange
      shadowColor = isActive ? "rgba(249, 115, 22, 0.8)" : "rgba(249, 115, 22, 0.5)"
      strokeColor = "rgba(249, 115, 22, 0.6)"
    } else if (color === 4) {
      fillColor = "#EA580C" // Big Orange
      shadowColor = isActive ? "rgba(234, 88, 12, 0.8)" : "rgba(234, 88, 12, 0.5)"
      strokeColor = "rgba(234, 88, 12, 0.6)"
    } else if (color === 5) {
      fillColor = "#10B981" // Green
      shadowColor = isActive ? "rgba(16, 185, 129, 0.8)" : "rgba(16, 185, 129, 0.5)"
      strokeColor = "rgba(16, 185, 129, 0.6)"
    } else {
      fillColor = "#A3A3A3" // Gray
      shadowColor = "rgba(163, 163, 163, 0.5)"
      strokeColor = "rgba(163, 163, 163, 0.6)"
    }

    ctx.fillStyle = fillColor
    ctx.fill()

    if (isActive) {
      // Glow effect for active cones
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = 20
      ctx.fill()

      // Draw outer glow ring
      ctx.beginPath()
      const ringRadius = color === 4 ? 24 : 18 // Larger ring for big orange cones
      ctx.arc(x, y, ringRadius, 0, Math.PI * 2)
      ctx.strokeStyle = strokeColor
      ctx.lineWidth = 2
      ctx.stroke()

      // Draw inner ring
      ctx.beginPath()
      const innerRingRadius = color === 4 ? 16 : 12 // Larger inner ring for big orange cones
      ctx.arc(x, y, innerRingRadius, 0, Math.PI * 2)
      ctx.lineWidth = 1.5
      ctx.stroke()

      ctx.shadowBlur = 0
    } else {
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
    }
  }

  const drawVehicle = (ctx: CanvasRenderingContext2D, x: number, y: number, angle: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(-angle)

    // Fixed size vehicle relative to map
    const vehicleLength = 41.4
    const vehicleWidth = 20

    ctx.beginPath()
    ctx.rect(-vehicleLength / 2, -vehicleWidth / 2, vehicleLength, vehicleWidth)
    ctx.fillStyle = "#8B5CF6"
    ctx.fill()

    ctx.beginPath()
    ctx.moveTo(vehicleLength / 2, 0)
    ctx.lineTo(-vehicleLength / 2, -vehicleWidth / 2)
    ctx.lineTo(-vehicleLength / 2, vehicleWidth / 2)
    ctx.closePath()
    ctx.fillStyle = "#6D28D9"
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