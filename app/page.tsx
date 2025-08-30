"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  MapPin,
  Search,
  FileText,
  Info,
  Edit3,
  BarChart3,
  Users,
  Home,
  Car,
  Bike,
  Bus,
  ZoomIn,
  Eye,
} from "lucide-react"
import MapComponent from "@/components/map-component"
import RadarChart from "@/components/radar-chart"

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
  const [selectedIndex, setSelectedIndex] = useState<string>("EWB_n")
  const [editMode, setEditMode] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedZone, setSelectedZone] = useState<ZFEData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [componentsReady, setComponentsReady] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(12)
  const [showEquipmentDetails, setShowEquipmentDetails] = useState(false)
  const [selectedBasemap, setSelectedBasemap] = useState("osm")

  useEffect(() => {
    console.log("[v0] Starting data load...")
    const loadData = async () => {
      try {
        console.log("[v0] Fetching CSV data...")
        const response = await fetch(
          "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Couche-CWc5bx81JIbbVgVLZhbsgDH7RMDtmX.csv",
        )

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const csvText = await response.text()
        console.log("[v0] CSV data fetched, length:", csvText.length)

        const lines = csvText.split("\n")
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""))
        console.log("[v0] CSV headers:", headers.slice(0, 10))

        const parsedData: ZFEData[] = lines
          .slice(1)
          .filter((line) => line.trim())
          .map((line) => {
            const values = line.split(",").map((v) => v.trim().replace(/"/g, ""))
            const row: any = {}

            headers.forEach((header, index) => {
              const value = values[index]
              if (!isNaN(Number(value)) && value !== "") {
                row[header] = Number(value)
              } else {
                row[header] = value
              }
            })

            if (row.idcar_200m) {
              const match = row.idcar_200m.match(/N(\d+)E(\d+)/)
              if (match) {
                const northing = Number.parseInt(match[1])
                const easting = Number.parseInt(match[2])
                row.lat = 45.1885 + (northing - 2469000) / 111000
                row.lng = 5.7245 + (easting - 3982000) / 85000
              }
            }

            return row as ZFEData
          })

        console.log("[v0] Loaded data points:", parsedData.length)
        console.log("[v0] Sample data point:", parsedData[0])
        console.log("[v0] Sample coordinates:", { lat: parsedData[0]?.lat, lng: parsedData[0]?.lng })

        setData(parsedData)
        setFilteredData(parsedData)
        setLoading(false)
        setTimeout(() => setComponentsReady(true), 100)
        console.log("[v0] Data loading complete!")
      } catch (error) {
        console.error("[v0] Error loading data:", error)
        setError(error instanceof Error ? error.message : "Unknown error")
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    console.log("[v0] Component render state:", {
      loading,
      error,
      dataLength: data.length,
      filteredDataLength: filteredData.length,
      selectedIndex,
    })
  }, [loading, error, data.length, filteredData.length, selectedIndex])

  const calculateStats = (dataSet: ZFEData[]) => {
    if (dataSet.length === 0) return { count: 0, mean: 0, p90: 0 }

    const values = dataSet
      .map((d) => d[selectedIndex as keyof ZFEData] as number)
      .filter((v) => !isNaN(v) && v !== undefined)
    if (values.length === 0) return { count: dataSet.length, mean: 0, p90: 0 }

    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const sorted = values.sort((a, b) => a - b)
    const p90 = sorted[Math.floor(sorted.length * 0.9)] || 0

    return { count: dataSet.length, mean: mean || 0, p90: p90 || 0 }
  }

  const stats = calculateStats(selectedZone.length > 0 ? selectedZone : filteredData)

  const radarData = () => {
    const dataSet = selectedZone.length > 0 ? selectedZone : filteredData
    if (dataSet.length === 0) return []

    const indices = ["EWB_n", "SSI_n", "SAI_n", "SAVI_n", "SCV_n", "TPI_n", "EVUL_n", "GAI_n"]
    return indices.map((index) => {
      const values = dataSet.map((d) => d[index as keyof ZFEData] as number).filter((v) => !isNaN(v) && v !== undefined)
      const mean = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0
      return {
        index: index.replace("_n", ""),
        value: mean || 0,
      }
    })
  }

  const handleVariableEdit = (variableKey: string, newValue: number) => {
    if (!editMode) return

    const updatedData = data.map((item) => ({
      ...item,
      [variableKey]: newValue,
    }))

    setData(updatedData)
    setFilteredData(updatedData)
  }

  const variables = [
    { key: "men", label: "Ménages", icon: Home, normalized: "men_n", editable: true },
    { key: "men_pauv", label: "Ménages précaires", icon: Home, normalized: "men_pauv_n", editable: true },
    { key: "ind", label: "Individus", icon: Users, normalized: "ind_n", editable: true },
    { key: "5_NBR_BORN", label: "Bornes de recharge", icon: Car, normalized: "5_NBR_BO_1", editable: true },
    { key: "6_NBR_ARRE", label: "Arrêts de transport", icon: Bus, normalized: "6_NBR_AR_1", editable: true },
    { key: "4_NBR_ARCE", label: "Arceaux vélos", icon: Bike, normalized: "4_NBR_AR_1", editable: true },
    { key: "7_LONG_PIS", label: "Pistes cyclables", icon: Bike, normalized: "7_LONG_P_1", editable: true },
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

  const safeToFixed = (value: any, decimals = 2): string => {
    if (value === null || value === undefined || isNaN(Number(value))) {
      return "0." + "0".repeat(decimals)
    }
    return Number(value).toFixed(decimals)
  }

  if (loading) {
    console.log("[v0] Rendering loading state...")
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement des données ZFE...</p>
        </div>
      </div>
    )
  }

  if (error) {
    console.log("[v0] Rendering error state:", error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">Erreur de chargement</div>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Recharger
          </Button>
        </div>
      </div>
    )
  }

  console.log("[v0] Rendering main interface...")

  return (
    <div className="min-h-screen bg-background">
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
                            {editMode && variable.editable ? (
                              <Input
                                type="number"
                                value={safeToFixed(rawValue, 1)}
                                onChange={(e) => handleVariableEdit(variable.key, Number(e.target.value))}
                                className="h-6 text-xs w-16"
                                step="0.1"
                              />
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                {safeToFixed(rawValue, 1)}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {safeToFixed(normalizedValue, 3)}
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
                        {safeToFixed(
                          filteredData.reduce((sum, d) => sum + (d.men_pauv || 0), 0),
                          0,
                        )}
                      </span>
                    </div>
                  </div>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex-1 relative">
          {editMode && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-20 flex items-center justify-center">
              <Card className="p-6 bg-card/95 backdrop-blur">
                <div className="text-center">
                  <Edit3 className="w-12 h-12 mx-auto mb-4 text-primary" />
                  <h3 className="text-lg font-semibold mb-2">Mode Édition Actif</h3>
                  <p className="text-muted-foreground mb-4">
                    Modifiez les valeurs dans la barre latérale gauche.
                    <br />
                    La carte est en pause pendant l'édition.
                  </p>
                  <Button onClick={() => setEditMode(false)}>Terminer l'édition</Button>
                </div>
              </Card>
            </div>
          )}

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

            <Select value={selectedBasemap} onValueChange={setSelectedBasemap}>
              <SelectTrigger className="w-40 bg-card">
                <SelectValue placeholder="Fond de carte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="osm">OpenStreetMap</SelectItem>
                <SelectItem value="esri">ESRI Streets</SelectItem>
                <SelectItem value="satellite">Vue satellite</SelectItem>
                <SelectItem value="topo">Vue topographique</SelectItem>
              </SelectContent>
            </Select>
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

          <div className="w-full h-full">
            {console.log("[v0] Rendering MapComponent with data length:", filteredData.length)}
            {!componentsReady ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Initialisation de la carte...</p>
                </div>
              </div>
            ) : (
              <MapComponent
                data={filteredData}
                selectedIndex={selectedIndex}
                onZoneSelect={setSelectedZone}
                editMode={editMode}
                basemap={selectedBasemap}
                onZoomChange={setZoomLevel}
              />
            )}
          </div>
        </div>

        <div className="w-96 bg-card border-l border-border overflow-y-auto">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="w-5 h-5 text-card-foreground" />
              <h2 className="font-semibold text-card-foreground">Tableau de bord</h2>
              <Badge variant="outline" className="ml-auto text-xs flex items-center gap-1">
                <ZoomIn className="w-3 h-3" />
                Niveau de zoom : {zoomLevel}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 mb-6">
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Nombre de carreaux</div>
                <div className="text-2xl font-bold text-card-foreground">{stats.count}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Moyenne {selectedIndex}</div>
                <div className="text-2xl font-bold text-card-foreground">{safeToFixed(stats.mean, 3)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-sm text-muted-foreground">Percentile 90</div>
                <div className="text-2xl font-bold text-card-foreground">{safeToFixed(stats.p90, 3)}</div>
              </Card>
            </div>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Distribution des équipements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Densité par zone</span>
                  <Button variant="outline" size="sm" onClick={() => setShowEquipmentDetails(!showEquipmentDetails)}>
                    <Eye className="w-3 h-3 mr-1" />
                    Voir détails
                  </Button>
                </div>
                {showEquipmentDetails && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-xs text-muted-foreground">Équipements par zone :</div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        Bornes recharge:{" "}
                        {safeToFixed(
                          filteredData.reduce((sum, d) => sum + (d["5_NBR_BORN"] || 0), 0),
                          0,
                        )}
                      </div>
                      <div>
                        Arrêts transport:{" "}
                        {safeToFixed(
                          filteredData.reduce((sum, d) => sum + (d["6_NBR_ARRE"] || 0), 0),
                          0,
                        )}
                      </div>
                      <div>
                        Arceaux vélos:{" "}
                        {safeToFixed(
                          filteredData.reduce((sum, d) => sum + (d["4_NBR_ARCE"] || 0), 0),
                          0,
                        )}
                      </div>
                      <div>
                        Pistes cyclables:{" "}
                        {safeToFixed(
                          filteredData.reduce((sum, d) => sum + (d["7_LONG_PIS"] || 0), 0),
                          1,
                        )}
                        m
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Indices de mobilité</CardTitle>
              </CardHeader>
              <CardContent>
                {console.log("[v0] Rendering RadarChart with data:", radarData())}
                {componentsReady ? (
                  <RadarChart data={radarData()} key={selectedZone.length} />
                ) : (
                  <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Indices synthétiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {indices.map((index) => {
                  const dataSet = selectedZone.length > 0 ? selectedZone : filteredData
                  const rawValues = dataSet
                    .map((d) => d[index.key as keyof ZFEData] as number)
                    .filter((v) => !isNaN(v) && v !== undefined)
                  const normalizedValues = dataSet
                    .map((d) => d[index.normalized as keyof ZFEData] as number)
                    .filter((v) => !isNaN(v) && v !== undefined)

                  const rawMean = rawValues.length > 0 ? rawValues.reduce((a, b) => a + b, 0) / rawValues.length : 0
                  const normalizedMean =
                    normalizedValues.length > 0
                      ? normalizedValues.reduce((a, b) => a + b, 0) / normalizedValues.length
                      : 0

                  return (
                    <div
                      key={index.key}
                      className={`flex justify-between items-center p-2 rounded border transition-colors ${
                        selectedIndex === index.normalized ? "bg-primary/10 border-primary" : ""
                      }`}
                    >
                      <div>
                        <div className="font-medium text-sm">{index.key}</div>
                        <div className="text-xs text-muted-foreground">{index.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{safeToFixed(rawMean, 2)}</div>
                        <div className="text-xs text-muted-foreground">{safeToFixed(normalizedMean, 3)}</div>
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
