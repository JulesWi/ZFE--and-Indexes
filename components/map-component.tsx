"use client"

import { useEffect, useRef } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

// Fix for default markers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
})

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
}

export default function MapComponent({ data, selectedIndex, onZoneSelect, editMode }: MapComponentProps) {
  const mapRef = useRef<L.Map | null>(null)
  const markersRef = useRef<L.LayerGroup | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Initialize map
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        center: [45.1885, 5.7245], // Grenoble coordinates
        zoom: 12,
        zoomControl: true,
      })

      // Add base layers
      const osmLayer = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      })

      const esriLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
        },
      )

      const cartoLayer = L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: "© CARTO",
      })

      // Add default layer
      osmLayer.addTo(mapRef.current)

      // Add layer control
      const baseLayers = {
        OpenStreetMap: osmLayer,
        "Esri World Imagery": esriLayer,
        "Carto Light": cartoLayer,
      }

      L.control.layers(baseLayers).addTo(mapRef.current)

      // Initialize markers layer
      markersRef.current = L.layerGroup().addTo(mapRef.current)
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  // Update markers when data or selectedIndex changes
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || !data.length) return

    // Clear existing markers
    markersRef.current.clearLayers()

    console.log("[v0] Updating map with data points:", data.length)
    console.log("[v0] Selected index:", selectedIndex)

    // Add new markers
    data.forEach((point, index) => {
      if (!point.lat || !point.lng) return

      const value = point[selectedIndex] as number
      if (isNaN(value)) return

      // Determine color based on value (assuming normalized 0-1 range)
      let color = "#003DA5" // Default blue
      if (value > 0.75)
        color = "#FF3D00" // High - red
      else if (value > 0.5)
        color = "#FFA726" // Medium-high - orange
      else if (value > 0.25) color = "#66BB6A" // Medium - green
      // else stays blue for low values

      // Create circle marker
      const marker = L.circleMarker([point.lat, point.lng], {
        radius: 6,
        fillColor: color,
        color: color,
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.6,
      })

      // Create popup content
      const popupContent = `
        <div class="p-2">
          <h3 class="font-semibold mb-2">Carreau ${point.idcar_200m || index}</h3>
          <div class="space-y-1 text-sm">
            <div><strong>${selectedIndex}:</strong> ${value.toFixed(3)}</div>
            <div><strong>Ménages:</strong> ${(point.men || 0).toFixed(1)}</div>
            <div><strong>Individus:</strong> ${(point.ind || 0).toFixed(0)}</div>
            <div><strong>Ménages précaires:</strong> ${(point.men_pauv || 0).toFixed(1)}</div>
            <div><strong>Coordonnées:</strong> ${point.lat?.toFixed(4)}, ${point.lng?.toFixed(4)}</div>
          </div>
        </div>
      `

      marker.bindPopup(popupContent)

      // Add click handler for zone selection
      marker.on("click", () => {
        // For now, select nearby points (simplified zone selection)
        const nearbyPoints = data.filter((p) => {
          if (!p.lat || !p.lng || !point.lat || !point.lng) return false
          const distance = Math.sqrt(Math.pow(p.lat - point.lat, 2) + Math.pow(p.lng - point.lng, 2))
          return distance < 0.01 // Approximately 1km radius
        })
        onZoneSelect(nearbyPoints)
      })

      markersRef.current?.addLayer(marker)
    })

    console.log("[v0] Added markers to map")
  }, [data, selectedIndex, onZoneSelect])

  return <div ref={containerRef} className="w-full h-full" style={{ minHeight: "400px" }} />
}
