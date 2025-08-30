"use client"

import { useEffect, useRef } from "react"

interface ZFEData {
  [key: string]: any
}

interface HistogramChartProps {
  data: ZFEData[]
  selectedIndex: string
}

export default function HistogramChart({ data, selectedIndex }: HistogramChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const width = 300
    const height = 150
    canvas.width = width
    canvas.height = height

    // Clear canvas
    ctx.clearRect(0, 0, width, height)

    // Get values and create histogram
    const values = data.map((d) => d[selectedIndex] as number).filter((v) => !isNaN(v))
    if (values.length === 0) return

    const min = Math.min(...values)
    const max = Math.max(...values)
    const binCount = 10
    const binWidth = (max - min) / binCount

    // Create bins
    const bins = new Array(binCount).fill(0)
    values.forEach((value) => {
      const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1)
      bins[binIndex]++
    })

    const maxBinValue = Math.max(...bins)

    // Chart settings
    const margin = { top: 20, right: 20, bottom: 30, left: 40 }
    const chartWidth = width - margin.left - margin.right
    const chartHeight = height - margin.top - margin.bottom
    const barWidth = chartWidth / binCount

    // Draw axes
    ctx.strokeStyle = "#d1d5db"
    ctx.lineWidth = 1

    // Y-axis
    ctx.beginPath()
    ctx.moveTo(margin.left, margin.top)
    ctx.lineTo(margin.left, height - margin.bottom)
    ctx.stroke()

    // X-axis
    ctx.beginPath()
    ctx.moveTo(margin.left, height - margin.bottom)
    ctx.lineTo(width - margin.right, height - margin.bottom)
    ctx.stroke()

    // Draw bars
    ctx.fillStyle = "#003DA5"
    bins.forEach((count, index) => {
      const barHeight = (count / maxBinValue) * chartHeight
      const x = margin.left + index * barWidth
      const y = height - margin.bottom - barHeight

      ctx.fillRect(x + 1, y, barWidth - 2, barHeight)
    })

    // Draw labels
    ctx.fillStyle = "#374151"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"

    // X-axis labels
    for (let i = 0; i <= binCount; i += 2) {
      const value = min + i * binWidth
      const x = margin.left + i * barWidth
      ctx.fillText(value.toFixed(2), x, height - margin.bottom + 5)
    }
  }, [data, selectedIndex])

  return (
    <div className="flex justify-center">
      <canvas ref={canvasRef} className="max-w-full" />
    </div>
  )
}
