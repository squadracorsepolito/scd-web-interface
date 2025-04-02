"use client"

import { useEffect, useRef } from "react"
import type { DataPoint } from "@/types/vehicle-types"

type ThrottleChartProps = {
  data: DataPoint[]
}

export default function ThrottleChart({ data }: ThrottleChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    drawChart()
  }, [data])

  const drawChart = () => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight

    // Background
    ctx.fillStyle = "#19191f"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw title
    ctx.fillStyle = "#FFFFFF"
    ctx.font = "14px Arial"
    ctx.textAlign = "center"
    ctx.fillText("Throttle Data", canvas.width / 2, 20)

    // Draw axes with the same approach as the speed chart
    const padding = { top: 30, right: 10, bottom: 30, left: 50 }
    const chartWidth = canvas.width - padding.left - padding.right
    const chartHeight = canvas.height - padding.top - padding.bottom

    // Set range for throttle
    const minThrottle = -1
    const maxThrottle = Math.max(1, ...data.map((d) => d.value))

    let minTime = Math.min(...data.map((d) => d.timestamp))
    const maxTime = Math.max(...data.map((d) => d.timestamp))
    
    if (maxTime - minTime < 30) {
      minTime = maxTime - 5
    }

    // Draw Y-axis
    ctx.beginPath()
    ctx.strokeStyle = "#6B7280"
    ctx.lineWidth = 1
    ctx.moveTo(padding.left, padding.top)
    ctx.lineTo(padding.left, canvas.height - padding.bottom)
    ctx.stroke()

    // Draw Y-axis labels
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"
    ctx.fillStyle = "#9CA3AF"
    ctx.font = "12px Arial"

    // Draw Y-axis grid lines and labels
    const ySteps = 5
    for (let i = 0; i <= ySteps; i++) {
      const y = padding.top + chartHeight * (1 - i / ySteps)
      const value = minThrottle + (i / ySteps) * (maxThrottle - minThrottle)

      // Grid line
      ctx.beginPath()
      ctx.strokeStyle = "#374151"
      ctx.moveTo(padding.left, y)
      ctx.lineTo(padding.left + chartWidth, y)
      ctx.stroke()

      // Label
      ctx.fillStyle = "#9CA3AF"
      ctx.fillText(value.toFixed(1), padding.left - 5, y)
    }

    // Draw X-axis
    ctx.beginPath()
    ctx.strokeStyle = "#6B7280"
    ctx.moveTo(padding.left, canvas.height - padding.bottom)
    ctx.lineTo(padding.left + chartWidth, canvas.height - padding.bottom)
    ctx.stroke()

    // Draw X-axis labels
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    // Draw X-axis grid lines and labels
    const xSteps = 5
    for (let i = 0; i <= xSteps; i++) {
      const x = padding.left + (chartWidth * i) / xSteps
      const timeValue = minTime + (i / xSteps) * (maxTime - minTime)

      // Grid line
      ctx.beginPath()
      ctx.strokeStyle = "#374151"
      ctx.moveTo(x, padding.top)
      ctx.lineTo(x, canvas.height - padding.bottom)
      ctx.stroke()

      // Label
      ctx.fillStyle = "#9CA3AF"
      ctx.fillText(timeValue.toFixed(0), x, canvas.height - padding.bottom + 5)
    }

    // Draw "Throttle (r)" on Y-axis
    ctx.save()
    ctx.translate(15, canvas.height / 2)
    ctx.rotate(-Math.PI / 2)
    ctx.textAlign = "center"
    ctx.fillStyle = "#9CA3AF"
    ctx.fillText("Throttle (r)", 0, 0)
    ctx.restore()

    // Draw "Time (s)" on X-axis
    ctx.fillStyle = "#9CA3AF"
    ctx.textAlign = "center"
    ctx.fillText("Time (s)", canvas.width / 2, canvas.height - 5)

    // Apply clipping to keep the graph within chart area
    ctx.save()
    ctx.beginPath()
    ctx.rect(padding.left, padding.top, chartWidth, chartHeight)
    ctx.clip()

    // Draw data line
    ctx.beginPath()
    ctx.strokeStyle = "#EF4444"
    ctx.lineWidth = 2

    data.forEach((point, index) => {
      const x = padding.left + ((point.timestamp - minTime) / (maxTime - minTime)) * chartWidth
      const y = padding.top + chartHeight - ((point.value - minThrottle) / (maxThrottle - minThrottle)) * chartHeight

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.stroke()
    ctx.restore()

    // Add legend
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "right"
    ctx.textBaseline = "middle"

    // Legend box
    const legendWidth = 80
    const legendHeight = 20
    const legendX = canvas.width - padding.right - legendWidth
    const legendY = padding.top + 10

    // Draw legend box
    ctx.fillStyle = "#1F2937"
    ctx.fillRect(legendX - 5, legendY - 10, legendWidth, legendHeight)
    ctx.strokeStyle = "#4B5563"
    ctx.strokeRect(legendX - 5, legendY - 10, legendWidth, legendHeight)

    // Draw legend line
    ctx.beginPath()
    ctx.strokeStyle = "#EF4444"
    ctx.lineWidth = 2
    ctx.moveTo(legendX, legendY)
    ctx.lineTo(legendX + 20, legendY)
    ctx.stroke()

    // Draw legend text
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "left"
    ctx.fillText("Throttle", legendX + 25, legendY)
  }

  return <canvas ref={canvasRef} className="w-full h-full" />
}

