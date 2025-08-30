"use client"

import { useEffect, useRef } from "react"

interface RadarData {
  index: string
  value: number
}

interface RadarChartProps {
  data: RadarData[]
}

export default function RadarChart({ data }: RadarChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const size = 200
    canvas.width = size
    canvas.height = size

    // Clear canvas
    ctx.clearRect(0, 0, size, size)

    // Chart settings
    const centerX = size / 2
    const centerY = size / 2
    const radius = size / 2 - 40
    const angleStep = (2 * Math.PI) / data.length

    // Draw background circles
    ctx.strokeStyle = "#e5e7eb"
    ctx.lineWidth = 1
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath()
      ctx.arc(centerX, centerY, (radius * i) / 5, 0, 2 * Math.PI)
      ctx.stroke()
    }

    // Draw axes
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1
    data.forEach((_, index) => {
      const angle = index * angleStep - Math.PI / 2
      const x = centerX + Math.cos(angle) * radius
      const y = centerY + Math.sin(angle) * radius

      ctx.beginPath()
      ctx.moveTo(centerX, centerY)
      ctx.lineTo(x, y)
      ctx.stroke()
    })

    // Draw data polygon
    ctx.strokeStyle = "#003DA5"
    ctx.fillStyle = "rgba(0, 61, 165, 0.2)"
    ctx.lineWidth = 2
    ctx.beginPath()

    data.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2
      const value = Math.min(Math.max(item.value, 0), 1) // Clamp between 0 and 1
      const distance = radius * value
      const x = centerX + Math.cos(angle) * distance
      const y = centerY + Math.sin(angle) * distance

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    })

    ctx.closePath()
    ctx.fill()
    ctx.stroke()

    // Draw labels
    ctx.fillStyle = "#374151"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    data.forEach((item, index) => {
      const angle = index * angleStep - Math.PI / 2
      const labelDistance = radius + 20
      const x = centerX + Math.cos(angle) * labelDistance
      const y = centerY + Math.sin(angle) * labelDistance

      ctx.fillText(item.index, x, y)
    })
  }, [data])

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  )
}
