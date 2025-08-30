"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MapPin, Search, FileText, Info, Edit3, Filter, BarChart3, Users, Home, Car, Bike, Bus } from "lucide-react"
import dynamic from "next/dynamic"

// Dynamically import map component to avoid SSR issues
const MapComponent = dynamic(() => import("@/components/map-component"), { ssr: false })
const RadarChart = dynamic(() => import("@/components/radar-chart"), { ssr: false })
const HistogramChart = dynamic(() => import("@/components/histogram-chart"), { ssr: false })

interface ZFEData {
  idcar_200m: string
  ind: number
  men: number
  men_pauv: number
  men_1ind: number
  men_5ind: number
  men_prop: number
  men_fmp: number
  ind_snv: number
  men_surf: number
  men_coll: number
  men_mais: number
  log_av45: number
  log_45_70: number
  log_70_90: number
  log_ap90: number
  log_inc: number
  log_soc: number
  // Normalized values
  ind_n: number
  men_n: number
  men_pauv_n: number
  men_1ind_n: number
  men_5ind_n: number
  men_prop_n: number
  men_fmp_n: number
  ind_snv_n: number
  men_surf_n: number
  men_coll_n: number
  men_mais_n: number
  log_av45_n: number
  log_45_70_n: number
  log_70_90_n: number
  log_ap90_n: number
  log_inc_n: number
  log_soc_n: number
  // Indices
  EWB: number
  SSI: number
  SAI: number
  SAVI: number
  SCV: number
  TPI: number
  EVUL: number
  GAI: number
  // Normalized indices
  EWB_n: number
  SSI_n: number
  SAI_n: number
  SAVI_n: number
  SCV_n: number
  TPI_n: number
  EVUL_n: number
  GAI_n: number
  // Infrastructure data
  "1_NBR_SERV": number
  "2_NBR_ALL": number
  "3_NBR_PARK": number
  "4_NBR_ARCE": number
  "5_NBR_BORN": number
  "6_NBR_ARRE": number
  "7_LONG_PIS": number
  "8_BAT_Nomb": number
  // Distances
  "1_DIS_SERV": number
  "2_DIS_ALLP": number
  "3_DIS_VPAR": number
  "4_DIS_ARCE": number
  "5_DIS_BORN": number
  "6_DIS_ARRE": number
  "7_DIS_PIST": number
  // Coordinates (derived from idcar_200m)
  lat?: number
  lng?: number
}

export default function ZFEGrenoble() {
  const [data, setData] = useState<ZFEData[]>([])
  const [filteredData, setFilteredData] = useState<ZFEData[]>([])
  const [selectedIndex, setSelectedIndex] = useState<string>("GAI_n")
  const [editMode, setEditMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<ZFEData[]>([])
  const [loading, setLoading] = useState(true)

  // Load CSV data
  useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch(
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Couche-CWc5bx81JIbbVgVLZhbsgDH7RMDtmX.csv",
        )
        const csvText = await response.text()

        // Parse CSV
        const lines = csvText.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))

        const parsedData: ZFEData[] = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
            const row: any = {}

            headers.forEach((header, index) => {
              const value = values[index]
              // Convert numeric values
              if (!isNaN(Number(value)) && value !== "") {
                row[header] = Number(value)
              } else {
                row[header] = value
              }
            })

            // Extract coordinates from idcar_200m if available
            // Format: CRS3035RES200mN2469000E3982600
            if (row.idcar_200m) {
              const match = row.idcar_200m.match(/N(\d+)E(\d+)/)
              if (match) {
                // Convert from CRS3035 to approximate lat/lng (simplified conversion)
                const northing = Number.parseInt(match[1])
                const easting = Number.parseInt(match[2])
                // Approximate conversion for Grenoble area
                row.lat = 45.1885 + (northing - 2469000) / 111000
                row.lng = 5.7245 + (easting - 3982000) / 85000
              }
            }

            return row as ZFEData
          })

        console.log("[v0] Loaded data points:", parsedData.length)
        console.log("[v0] Sample data point:", parsedData[0])

        setData(parsedData)
        setFilteredData(parsedData)
        setLoading(false)
      } catch (error) {
        console.error("[v0] Error loading data:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  // Calculate statistics for current selection
  const calculateStats = (dataSet: ZFEData[]) => {
    if (dataSet.length === 0) return { count: 0, mean: 0, p90: 0 }

    const values = dataSet.map((d) => d[selectedIndex as keyof ZFEData] as number).filter((v) => !isNaN(v))
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sorted = values.sort((a, b) => a - b)
    const p90 = sorted[Math.floor(sorted.length * 0.9)]

    return { count: dataSet.length, mean, p90 }
  }

  const stats = calculateStats(selectedZone.length > 0 ? selectedZone : filteredData)

  // Calculate radar chart data (8 indices normalized)
  const radarData = () => {
    const dataSet = selectedZone.length > 0 ? selectedZone : filteredData
    if (dataSet.length === 0) return []

    const indices = ["EWB_n", "SSI_n", "SAI_n", "SAVI_n", "SCV_n", "TPI_n", "EVUL_n", "GAI_n"]
    return indices.map((index) => {
      const values = dataSet.map((d) => d[index as keyof ZFEData] as number).filter((v) => !isNaN(v))
      const mean = values.reduce((a, b) => a + b, 0) / values.length
      return {
        index: index.replace("_n", ""),
        value: mean || 0,
      }
    })
  }

  const variables = [
    { key: "men", label: "Ménages", icon: Home, normalized: "men_n" },
    { key: "men_pauv", label: "Ménages précaires", icon: Home, normalized: "men_pauv_n" },
    { key: "ind", label: "Individus", icon: Users, normalized: "ind_n" },
    { key: "5_NBR_BORN", label: "Bornes de recharge", icon: Car, normalized: "5_NBR_BO_1" },
    { key: "6_NBR_ARRE", label: "Arrêts de transport", icon: Bus, normalized: "6_NBR_AR_1" },
    { key: "4_NBR_ARCE", label: "Arceaux vélos", icon: Bike, normalized: "4_NBR_AR_1" },
    { key: "7_LONG_PIS", label: "Pistes cyclables", icon: Bike, normalized: "7_LONG_P_1" },
  ]

  const indices = [
    { key: "EWB", label: "Bien-être économique", normalized: "EWB_n" },
    { key: "SSI", label: "Stock d'offre", normalized: "SSI_n" },
    { key: "SAI", label: "Accessibilité", normalized: "SAI_n" },
    { key: "SAVI", label: "Services", normalized: "SAVI_n" },
    { key: "SCV", label: "Capacité composite", normalized: "SCV_n" },
    { key: "TPI", label: "Pression/implantation", normalized: "TPI_n" },
    { key: "EVUL", label: "Vulnérabilité", normalized: "EVUL_n" },
    { key: "GAI", label: "Adaptabilité inverse", normalized: "GAI_n" },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des données ZFE...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-semibold text-balance">Zone à Faibles Émissions - Grenoble Métropole</h1>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm">
              <Info className="w-4 h-4 mr-2" />À propos
            </Button>
            <Button variant="outline" size="sm">
              <FileText className="w-4 h-4 mr-2" />
              Rapport PDF
            </Button>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher une adresse..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar */}
        <div className="w-80 bg-sidebar border-r border-sidebar-border overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5 text-sidebar-foreground" />
              <h2 className="font-semibold text-sidebar-foreground">Points d'intérêt visibles</h2>
            </div>

            <Tabs defaultValue="variables" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="variables">Variables</TabsTrigger>
                <TabsTrigger value="stats">Statistiques</TabsTrigger>
              </TabsList>

              <TabsContent value="variables" className="space-y-3 mt-4">
                {variables.map((variable) => {
                  const Icon = variable.icon
                  const rawValue =
                    filteredData.length > 0
                      ? filteredData.reduce((sum, d) => sum + ((d[variable.key as keyof ZFEData] as number) || 0), 0) /
                        filteredData.length
                      : 0
                  const normalizedValue =
                    filteredData.length > 0
                      ? filteredData.reduce(
                          (sum, d) => sum + ((d[variable.normalized as keyof ZFEData] as number) || 0),
                          0,
                        ) / filteredData.length
                      : 0

                  return (
                    <Card key={variable.key} className="p-3">
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 text-sidebar-primary" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-sidebar-foreground">{variable.label}</p>
                          <div className="flex gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {rawValue.toFixed(1)}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {normalizedValue.toFixed(3)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </TabsContent>

              <TabsContent value="stats" className="space-y-3 mt-4">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-4 h-4 text-sidebar-primary" />
                    <h3 className="font-medium text-sidebar-foreground">Statistiques démographiques</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ménages</span>
                      <span className="font-medium">{stats.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ménages précaires</span>
                      <span className="font-medium">
                        {filteredData.reduce((sum, d) => sum + (d.men_pauv || 0), 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Main Map Area */}
        <div className="flex-1 relative">
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <Select value={selectedIndex} onValueChange={setSelectedIndex}>
              <SelectTrigger className="w-48 bg-card">
                <SelectValue placeholder="Sélectionner un indice" />
              </SelectTrigger>
              <SelectContent>
                {indices.map((index) => (
                  <SelectItem key={index.normalized} value={index.normalized}>
                    {index.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode(!editMode)}>
              <Edit3 className="w-4 h-4 mr-2" />
              {editMode ? "Quitter édition" : "Mode édition"}
            </Button>

            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtres
            </Button>
          </div>

          <div className="absolute bottom-4 left-4 z-10">
            <Card className="p-3 bg-card/95 backdrop-blur">
              <div className="text-sm">
                <div className="font-medium mb-1">Légende</div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-chart-2 rounded"></div>
                    <span className="text-xs">Faible (0-0.25)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                    <span className="text-xs">Moyen (0.25-0.75)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-chart-1 rounded"></div>
                    <span className="text-xs">Élevé (0.75-1)</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <MapComponent
            data={filteredData}
            selectedIndex={selectedIndex}
            onZoneSelect={setSelectedZone}
            editMode={editMode}
          />
        </div>

        {/* Right Dashboard */}
        <div className="w-96 bg-card border-l border-border overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-card-foreground" />
              <h2 className="font-semibold text-card-foreground">Tableau de bord</h2>
              <Badge variant="outline" className="ml-auto text-xs">
                Niveau de zoom : 12
              </Badge>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-3 mb-6">
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Nombre de carreaux</div>
                <div className="text-2xl font-bold text-card-foreground">{stats.count}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Moyenne {selectedIndex}</div>
                <div className="text-2xl font-bold text-card-foreground">{stats.mean.toFixed(3)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Percentile 90</div>
                <div className="text-2xl font-bold text-card-foreground">{stats.p90.toFixed(3)}</div>
              </Card>
            </div>

            {/* Distribution des équipements */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribution des équipements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Densité par zone</span>
                  <Badge variant="outline">Voir détails</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Radar Chart */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Indices de mobilité</CardTitle>
              </CardHeader>
              <CardContent>
                <RadarChart data={radarData()} />
              </CardContent>
            </Card>

            {/* Histogram */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribution {selectedIndex}</CardTitle>
              </CardHeader>
              <CardContent>
                <HistogramChart
                  data={selectedZone.length > 0 ? selectedZone : filteredData}
                  selectedIndex={selectedIndex}
                />
              </CardContent>
            </Card>

            {/* Indices List */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Indices synthétiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {indices.map((index) => {
                  const dataSet = selectedZone.length > 0 ? selectedZone : filteredData
                  const rawValues = dataSet.map((d) => d[index.key as keyof ZFEData] as number).filter((v) => !isNaN(v))
                  const normalizedValues = dataSet
                    .map((d) => d[index.normalized as keyof ZFEData] as number)
                    .filter((v) => !isNaN(v))

                  const rawMean = rawValues.length > 0 ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : 0
                  const normalizedMean =
                    normalizedValues.length > 0
                      ? normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length
                      : 0

                  return (
                    <div key={index.key} className="flex justify-between items-center p-2 rounded border">
                      <div>
                        <div className="font-medium text-sm">{index.key}</div>
                        <div className="text-xs text-muted-foreground">{index.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{rawMean.toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{normalizedMean.toFixed(3)}</div>
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
