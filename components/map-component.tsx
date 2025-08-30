"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"

interface ZFEData {
  [key: string]: any
  lat?: number
  lng?: number
}

interface MapComponentProps {
  data: ZFEData[]
  selectedIndex: string
  onZoneSelect: (zone: ZFEData[]) => void
  editMode: boolean
  basemap?: string
  onZoomChange?: (zoom: number) => void
}

export default function MapComponent({
  data,
  selectedIndex,
  onZoneSelect,
  editMode,
  basemap = "osm",
  onZoomChange,
}: MapComponentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedPoint, setSelectedPoint] = useState<ZFEData | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<ZFEData | null>(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (onZoomChange) {
      const zoomLevel = Math.round(8 + zoom * 4) // Convert internal zoom to map-like zoom level
      onZoomChange(zoomLevel)
    }
  }, [zoom, onZoomChange])

  const getBasemapStyle = () => {
    switch (basemap) {
      case "esri":
        return { background: "#f8f9fa", gridColor: "#dee2e6" }
      case "satellite":
        return { background: "#2d3748", gridColor: "#4a5568" }
      case "topo":
        return { background: "#f7fafc", gridColor: "#e2e8f0" }
      default: // osm
        return { background: "#ffffff", gridColor: "#e5e7eb" }
    }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !data.length) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    const basemapStyle = getBasemapStyle()

    ctx.fillStyle = basemapStyle.background
    ctx.fillRect(0, 0, rect.width, rect.height)

    const validPoints = data.filter((d) => d.lat && d.lng)
    if (validPoints.length === 0) return

    const bounds = {
      minLat: Math.min(...validPoints.map((d) => d.lat!)),
      maxLat: Math.max(...validPoints.map((d) => d.lat!)),
      minLng: Math.min(...validPoints.map((d) => d.lng!)),
      maxLng: Math.max(...validPoints.map((d) => d.lng!)),
    }

    const latPadding = (bounds.maxLat - bounds.minLat) * 0.1
    const lngPadding = (bounds.maxLng - bounds.minLng) * 0.1
    bounds.minLat -= latPadding
    bounds.maxLat += latPadding
    bounds.minLng -= lngPadding
    bounds.maxLng += lngPadding

    ctx.strokeStyle = basemapStyle.gridColor
    ctx.lineWidth = 0.5
    for (let i = 0; i <= 10; i++) {
      const x = (rect.width / 10) * i
      const y = (rect.height / 10) * i
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, rect.height)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(rect.width, y)
      ctx.stroke()
    }

    ctx.fillStyle = basemap === "satellite" ? "#ffffff" : "#374151"
    ctx.font = "14px Inter, sans-serif"
    ctx.fillText("Zone à Faibles Émissions - Grenoble Métropole", 20, 30)

    validPoints.forEach((point, index) => {
      const value = point[selectedIndex] as number
      if (isNaN(value)) return

      const x = ((point.lng! - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * rect.width
      const y = rect.height - ((point.lat! - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * rect.height

      const zoomedX = x * zoom + pan.x
      const zoomedY = y * zoom + pan.y

      if (zoomedX < -20 || zoomedX > rect.width + 20 || zoomedY < -20 || zoomedY > rect.height + 20) return

      let color = "#003DA5"
      if (value > 0.75) color = "#FF3D00"
      else if (value > 0.5) color = "#FFA726"
      else if (value > 0.25) color = "#66BB6A"

      ctx.fillStyle = color
      ctx.beginPath()
      const radius = hoveredPoint === point ? 8 : 6
      ctx.arc(zoomedX, zoomedY, radius, 0, 2 * Math.PI)
      ctx.fill()

      if (selectedPoint === point) {
        ctx.strokeStyle = "#000000"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })

    const legendY = rect.height - 80
    ctx.fillStyle = basemap === "satellite" ? "rgba(45, 55, 72, 0.9)" : "rgba(255, 255, 255, 0.9)"
    ctx.fillRect(20, legendY - 10, 200, 70)
    ctx.strokeStyle = basemap === "satellite" ? "#718096" : "#d1d5db"
    ctx.lineWidth = 1
    ctx.strokeRect(20, legendY - 10, 200, 70)

    ctx.fillStyle = basemap === "satellite" ? "#ffffff" : "#374151"
    ctx.font = "12px Inter, sans-serif"
    ctx.fillText("Légende", 30, legendY + 5)

    const legendItems = [
      { color: "#003DA5", label: "Faible (0-0.25)" },
      { color: "#66BB6A", label: "Moyen (0.25-0.5)" },
      { color: "#FFA726", label: "Élevé (0.5-0.75)" },
      { color: "#FF3D00", label: "Très élevé (0.75-1)" },
    ]

    legendItems.forEach((item, i) => {
      const y = legendY + 15 + i * 12
      ctx.fillStyle = item.color
      ctx.beginPath()
      ctx.arc(35, y, 4, 0, 2 * Math.PI)
      ctx.fill()
      ctx.fillStyle = basemap === "satellite" ? "#ffffff" : "#374151"
      ctx.font = "10px Inter, sans-serif"
      ctx.fillText(item.label, 45, y + 3)
    })

    console.log("[v0] Canvas map rendered with", validPoints.length, "points")
  }, [data, selectedIndex, zoom, pan, selectedPoint, hoveredPoint, basemap])

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setMousePosition({ x: e.clientX, y: e.clientY })

    if (isDragging) {
      setPan((prev) => ({
        x: prev.x + (mouseX - lastMousePos.x),
        y: prev.y + (mouseY - lastMousePos.y),
      }))
      setLastMousePos({ x: mouseX, y: mouseY })
      return
    }

    const validPoints = data.filter((d) => d.lat && d.lng)
    const bounds = {
      minLat: Math.min(...validPoints.map((d) => d.lat!)),
      maxLat: Math.max(...validPoints.map((d) => d.lat!)),
      minLng: Math.min(...validPoints.map((d) => d.lng!)),
      maxLng: Math.max(...validPoints.map((d) => d.lng!)),
    }

    const latPadding = (bounds.maxLat - bounds.minLat) * 0.1
    const lngPadding = (bounds.maxLng - bounds.minLng) * 0.1
    bounds.minLat -= latPadding
    bounds.maxLat += latPadding
    bounds.minLng -= lngPadding
    bounds.maxLng += lngPadding

    let foundPoint = null
    for (const point of validPoints) {
      const x = ((point.lng! - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * rect.width
      const y = rect.height - ((point.lat! - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * rect.height

      const zoomedX = x * zoom + pan.x
      const zoomedY = y * zoom + pan.y

      const distance = Math.sqrt(Math.pow(mouseX - zoomedX, 2) + Math.pow(mouseY - zoomedY, 2))
      if (distance < 10) {
        foundPoint = point
        break
      }
    }

    setHoveredPoint(foundPoint)
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true)
    const rect = canvasRef.current!.getBoundingClientRect()
    setLastMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (hoveredPoint) {
      setSelectedPoint(hoveredPoint)
      const nearbyPoints = data.filter((p) => {
        if (!p.lat || !p.lng || !hoveredPoint.lat || !hoveredPoint.lng) return false
        const distance = Math.sqrt(Math.pow(p.lat - hoveredPoint.lat, 2) + Math.pow(p.lng - hoveredPoint.lng, 2))
        return distance < 0.01
      })
      onZoneSelect(nearbyPoints)
    }
  }

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    setZoom((prev) => Math.max(0.5, Math.min(3, prev * zoomFactor)))
  }

  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full cursor-move"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleClick}
        onWheel={handleWheel}
        style={{ minHeight: "400px" }}
      />

      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={() => setZoom((prev) => Math.min(3, prev * 1.2))}
          className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
        >
          +
        </button>
        <button
          onClick={() => setZoom((prev) => Math.max(0.5, prev * 0.8))}
          className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50"
        >
          −
        </button>
        <button
          onClick={() => {
            setZoom(1)
            setPan({ x: 0, y: 0 })
          }}
          className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center hover:bg-gray-50 text-xs"
        >
          ⌂
        </button>
      </div>

      {hoveredPoint && (
        <Card
          className="fixed p-3 bg-white/95 backdrop-blur max-w-xs z-50 pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 10,
            transform: "translateY(-100%)",
          }}
        >
          <h3 className="font-semibold mb-2">Carreau {hoveredPoint.idcar_200m}</h3>
          <div className="space-y-1 text-sm">
            <div>
              <strong>{selectedIndex}:</strong> {((hoveredPoint[selectedIndex] as number) || 0).toFixed(3)}
            </div>
            <div>
              <strong>Ménages:</strong> {((hoveredPoint.men as number) || 0).toFixed(1)}
            </div>
            <div>
              <strong>Individus:</strong> {((hoveredPoint.ind as number) || 0).toFixed(0)}
            </div>
            <div>
              <strong>Ménages précaires:</strong> {((hoveredPoint.men_pauv as number) || 0).toFixed(1)}
            </div>
            <div>
              <strong>Coordonnées:</strong> {hoveredPoint.lat?.toFixed(4)}, {hoveredPoint.lng?.toFixed(4)}
            </div>
          </div>
        </Card>
      )}

      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur p-2 rounded text-xs text-gray-600">
        Cliquez et glissez pour déplacer • Molette pour zoomer
      </div>
    </div>
  )
}
