import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { useControl, type MapRef } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { ScatterplotLayer, PolygonLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import { TripsLayer } from '@deck.gl/geo-layers'
import { HeatmapLayer, HexagonLayer } from '@deck.gl/aggregation-layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import { computeVoronoi, computeGradientTiers, type VoronoiSite } from '@/lib/voronoi'
import { competitorElevators, competitorBids, type CompetitorElevator } from '@/data/competitors'
import type { Elevator, Farmer } from '@/types/kernel'
import { fetchRoute, type RouteResult } from '@/lib/routing'

const STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

// Theme-aware color palettes
const mapThemes = {
  dark: {
    tooltipBg: '#1e293b',
    tooltipText: '#e2e8f0',
    tooltipBorder: '#334155',
    elevatorTooltipBg: '#166534',
    elevatorTooltipText: '#dcfce7',
    competitorTooltipBg: '#172554',
    competitorTooltipText: '#bfdbfe',
    basisLabelBg: 'rgba(0,0,0,0.75)',
    basisLabelText: '#4ade80',
    distanceLabelOwnBg: '#166534',
    distanceLabelOwnText: '#dcfce7',
    distanceLabelCompBg: '#172554',
    distanceLabelCompText: '#bfdbfe',
  },
  light: {
    tooltipBg: '#ffffff',
    tooltipText: '#1e293b',
    tooltipBorder: '#cbd5e1',
    elevatorTooltipBg: '#dcfce7',
    elevatorTooltipText: '#14532d',
    competitorTooltipBg: '#dbeafe',
    competitorTooltipText: '#1e3a5f',
    basisLabelBg: 'rgba(255,255,255,0.85)',
    basisLabelText: '#16a34a',
    distanceLabelOwnBg: '#dcfce7',
    distanceLabelOwnText: '#14532d',
    distanceLabelCompBg: '#dbeafe',
    distanceLabelCompText: '#1e3a5f',
  },
} as const

export interface FocusedProximity {
  farmer: Farmer
  nearestOwn: Elevator
  nearestCompetitor: { id: string; name: string; operator: string; lat: number; lng: number }
  distanceOwn: number
  distanceCompetitor: number
  advantage: number
}

export interface FarmerWinData {
  id: string
  lat: number
  lng: number
  acres: number
  winner: 'own' | 'competitor'
  margin: number           // positive = user wins, negative = competitor wins
  targetLat: number        // winning elevator lat
  targetLng: number        // winning elevator lng
}

interface LandscapeMapProps {
  elevators: Elevator[]
  farmers: Farmer[]
  selectedElevatorId?: string | null
  onFarmerClick?: (farmer: Farmer) => void
  onCompetitorClick?: (competitor: CompetitorElevator) => void
  minBid?: number
  maxBid?: number
  tierCount?: number
  selectedCellPolygon?: [number, number][] | null
  expandedCellPolygon?: [number, number][] | null
  farmerColors?: Map<string, string>
  farmerBids?: Map<string, number>
  focusedProximity?: FocusedProximity | null
  reachableFarmerIds?: Set<string>
  showVoronoi?: boolean
  showCompetitors?: boolean
  showHeatmap?: boolean
  showArcs?: boolean
  showHexagons?: boolean
  farmerWinData?: FarmerWinData[]
  cropKey?: string
  competitorBidsForDate?: Record<string, { CORN: number; SOYBEANS: number; WHEAT: number }>
  theme?: 'light' | 'dark'
}

// Parse CSS color string to [r, g, b, a] for deck.gl
function parseColor(css: string): [number, number, number, number] {
  if (css.startsWith('#')) {
    const hex = css.slice(1)
    if (hex.length === 3) {
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16),
        255,
      ]
    }
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
    ]
  }
  // rgba(r,g,b,a) or rgb(r,g,b)
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/)
  if (m) {
    return [+m[1], +m[2], +m[3], m[4] != null ? Math.round(+m[4] * 255) : 255]
  }
  return [148, 163, 184, 180] // fallback gray
}

// Hook to wire deck.gl layers into MapLibre via MapboxOverlay
function DeckGLOverlay(props: { layers: any[] }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true }),
  )
  overlay.setProps({ layers: props.layers })
  return null
}

export function LandscapeMap({
  elevators,
  farmers,
  selectedElevatorId,
  onFarmerClick,
  onCompetitorClick,
  minBid = 10,
  maxBid = 25,
  tierCount = 5,
  selectedCellPolygon,
  expandedCellPolygon,
  farmerColors,
  farmerBids,
  focusedProximity,
  reachableFarmerIds,
  showVoronoi = true,
  showCompetitors = true,
  showHeatmap = false,
  showArcs = false,
  showHexagons = false,
  farmerWinData,
  cropKey = 'CORN',
  competitorBidsForDate,
  theme = 'dark',
}: LandscapeMapProps) {
  const mapRef = useRef<MapRef>(null)
  const didMountZoom = useRef(false)
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null)
  const [hoverInfo, setHoverInfo] = useState<{
    x: number
    y: number
    text: string
    type: 'farmer' | 'elevator' | 'competitor'
  } | null>(null)

  const colors = mapThemes[theme]
  const isProximityMode = !!focusedProximity

  // ── Animation loop for TripsLayer ──────────────────────────────────
  const [animTime, setAnimTime] = useState(0)
  const animRef = useRef<number>(0)
  useEffect(() => {
    if (!showArcs) return
    let lastTs = performance.now()
    const tick = (now: number) => {
      const dt = now - lastTs
      lastTs = now
      setAnimTime(t => (t + dt * 0.03) % 100) // loop 0-100, speed factor 0.03
      animRef.current = requestAnimationFrame(tick)
    }
    animRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(animRef.current)
  }, [showArcs])

  // ── View state ──────────────────────────────────────────────────────
  const viewState = useMemo(() => {
    if (focusedProximity) {
      const { farmer, nearestOwn, nearestCompetitor } = focusedProximity
      const lats = [farmer.lat!, nearestOwn.lat!, nearestCompetitor.lat]
      const lngs = [farmer.lng!, nearestOwn.lng!, nearestCompetitor.lng]
      const minLat = Math.min(...lats)
      const maxLat = Math.max(...lats)
      const minLng = Math.min(...lngs)
      const maxLng = Math.max(...lngs)
      const latSpan = (maxLat - minLat) || 0.01
      const lngSpan = (maxLng - minLng) || 0.01
      const padded = 1.5
      const zoomLat = Math.log2(180 / (latSpan * padded))
      const zoomLng = Math.log2(360 / (lngSpan * padded))
      const zoom = Math.min(zoomLat, zoomLng, 13)
      return {
        longitude: (minLng + maxLng) / 2,
        latitude: (minLat + maxLat) / 2,
        zoom,
        transitionDuration: 800,
      }
    }
    if (selectedCellPolygon && selectedCellPolygon.length >= 3) {
      const lngs = selectedCellPolygon.map(p => p[0])
      const lats = selectedCellPolygon.map(p => p[1])
      return {
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        zoom: 11.5,
        transitionDuration: 800,
      }
    }
    if (selectedElevatorId) {
      const sel = elevators.find(e => e.id === selectedElevatorId)
      if (sel?.lat != null && sel?.lng != null) {
        return { longitude: sel.lng, latitude: sel.lat, zoom: 11, transitionDuration: 800 }
      }
    }
    const valid = elevators.filter(e => e.lat != null && e.lng != null)
    if (valid.length > 0) {
      const lats = valid.map(e => e.lat!)
      const lngs = valid.map(e => e.lng!)
      return {
        longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
        latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
        zoom: 9,
        transitionDuration: 800,
      }
    }
    return { longitude: -93.5, latitude: 42.0, zoom: 9, transitionDuration: 0 }
  }, [elevators, selectedElevatorId, selectedCellPolygon, focusedProximity])

  // Start zoomed out and gently zoom in on mount
  const mountViewState = useMemo(() => ({
    ...viewState,
    zoom: Math.max((viewState.zoom ?? 9) - 1.5, 3),
    transitionDuration: 0,
  }), []) // eslint-disable-line react-hooks/exhaustive-deps -- intentionally capture only initial viewState

  const handleMapLoad = useCallback(() => {
    if (!didMountZoom.current) {
      didMountZoom.current = true
      setTimeout(() => {
        mapRef.current?.flyTo({
          center: [viewState.longitude ?? -93.5, viewState.latitude ?? 42.0],
          zoom: viewState.zoom ?? 9,
          duration: 1400,
          essential: true,
        })
      }, 200)
    }
  }, [viewState])

  // Fly to new viewState when elevator/cell selection changes (after mount)
  useEffect(() => {
    if (!didMountZoom.current) return // still in mount animation
    if (!mapRef.current) return
    mapRef.current.flyTo({
      center: [viewState.longitude ?? -93.5, viewState.latitude ?? 42.0],
      zoom: viewState.zoom ?? 9,
      pitch: viewState.pitch ?? 0,
      bearing: viewState.bearing ?? 0,
      duration: viewState.transitionDuration ?? 800,
    })
  }, [viewState])

  // ── Voronoi cells ───────────────────────────────────────────────────
  const voronoiCells = useMemo(() => {
    const sites: VoronoiSite[] = [
      ...elevators
        .filter(e => e.lat != null && e.lng != null)
        .map(e => ({ id: e.id, lat: e.lat!, lng: e.lng!, isOwn: true })),
      ...competitorElevators.map(c => ({ id: c.id, lat: c.lat, lng: c.lng, isOwn: false })),
    ]
    const allLats = [...sites.map(s => s.lat), ...farmers.filter(f => f.lat).map(f => f.lat!)]
    const allLngs = [...sites.map(s => s.lng), ...farmers.filter(f => f.lng).map(f => f.lng!)]
    const pad = 0.3
    const bounds = {
      minLat: Math.min(...allLats) - pad,
      maxLat: Math.max(...allLats) + pad,
      minLng: Math.min(...allLngs) - pad,
      maxLng: Math.max(...allLngs) + pad,
    }
    return computeVoronoi(sites, bounds)
  }, [elevators, farmers])

  // Competitor positions for gradient tier pressure
  const competitorPositions = useMemo<[number, number][]>(
    () => competitorElevators.map(c => [c.lng, c.lat]),
    [],
  )

  // ── Gradient tier data ──────────────────────────────────────────────
  const tierData = useMemo(() => {
    if (!selectedElevatorId || !selectedCellPolygon || selectedCellPolygon.length < 3) return []
    const sel = elevators.find(e => e.id === selectedElevatorId)
    if (!sel?.lat || !sel?.lng) return []
    return computeGradientTiers(selectedCellPolygon, sel.lng!, sel.lat!, tierCount, competitorPositions)
  }, [selectedElevatorId, selectedCellPolygon, elevators, tierCount, competitorPositions])

  // Tier basis labels
  const tierLabels = useMemo(() => {
    if (tierData.length === 0) return []
    const minDollars = minBid / 100
    const maxDollars = maxBid / 100
    return tierData.map(tier => {
      const basisAtTier = -(maxDollars + (minDollars - maxDollars) * tier.ratio)
      const rightmost = tier.polygon.reduce((best, pt) => pt[0] > best[0] ? pt : best, tier.polygon[0])
      return {
        position: [rightmost[0], rightmost[1]] as [number, number],
        text: basisAtTier.toFixed(2),
        opacity: 0.15 + 0.35 * tier.ratio,
      }
    })
  }, [tierData, minBid, maxBid])

  // ── Proximity mode data (async road routes) ─────────────────────────
  const [routeOwn, setRouteOwn] = useState<RouteResult | null>(null)
  const [routeComp, setRouteComp] = useState<RouteResult | null>(null)

  useEffect(() => {
    if (!focusedProximity) {
      setRouteOwn(null)
      setRouteComp(null)
      return
    }
    const { farmer, nearestOwn, nearestCompetitor } = focusedProximity
    if (!farmer.lat || !farmer.lng) return
    let cancelled = false

    // Fetch both routes in parallel
    fetchRoute(farmer.lng, farmer.lat, nearestOwn.lng!, nearestOwn.lat!).then(r => {
      if (!cancelled) setRouteOwn(r)
    })
    fetchRoute(farmer.lng, farmer.lat, nearestCompetitor.lng, nearestCompetitor.lat).then(r => {
      if (!cancelled) setRouteComp(r)
    })

    return () => { cancelled = true }
  }, [focusedProximity])

  const proximityLines = useMemo(() => {
    if (!focusedProximity) return []
    const { farmer, nearestOwn, nearestCompetitor, distanceOwn, distanceCompetitor } = focusedProximity
    if (!farmer.lat || !farmer.lng) return []

    // Wait for real road routes — don't show straight-line fallbacks
    if (!routeOwn || !routeComp) return []

    const ownPath = routeOwn.geometry
    const compPath = routeComp.geometry
    const ownMid = ownPath[Math.floor(ownPath.length / 2)]
    const compMid = compPath[Math.floor(compPath.length / 2)]

    return [
      {
        path: ownPath,
        color: [34, 197, 94, 220] as [number, number, number, number],
        width: 3,
        dashArray: null as number[] | null,
        label: `${routeOwn.distanceMiles.toFixed(1)} mi · ${Math.round(routeOwn.durationMinutes)} min`,
        midpoint: [ownMid[0], ownMid[1]] as [number, number],
        type: 'own' as const,
      },
      {
        path: compPath,
        color: [59, 130, 246, 180] as [number, number, number, number],
        width: 3,
        dashArray: [8, 5] as number[] | null,
        label: `${routeComp.distanceMiles.toFixed(1)} mi · ${Math.round(routeComp.durationMinutes)} min`,
        midpoint: [compMid[0], compMid[1]] as [number, number],
        type: 'competitor' as const,
      },
    ]
  }, [focusedProximity, routeOwn, routeComp])

  const proximityPoints = useMemo(() => {
    if (!focusedProximity) return []
    const { farmer, nearestOwn, nearestCompetitor } = focusedProximity
    if (!farmer.lat || !farmer.lng) return []
    return [
      { position: [farmer.lng, farmer.lat] as [number, number], color: [245, 158, 11, 255] as [number, number, number, number], radius: 8, type: 'farmer' },
      { position: [nearestOwn.lng!, nearestOwn.lat!] as [number, number], color: [34, 197, 94, 255] as [number, number, number, number], radius: 7, type: 'elevator' },
      { position: [nearestCompetitor.lng, nearestCompetitor.lat] as [number, number], color: [59, 130, 246, 255] as [number, number, number, number], radius: 7, type: 'competitor' },
    ]
  }, [focusedProximity])

  // ── Callbacks ───────────────────────────────────────────────────────
  const handleFarmerClick = useCallback(
    (info: any) => {
      if (!info.object) return
      const farmer = info.object as Farmer
      setSelectedFarmerId(prev => (prev === farmer.id ? null : farmer.id))
      onFarmerClick?.(farmer)
    },
    [onFarmerClick],
  )

  const handleCompetitorClick = useCallback(
    (info: any) => {
      if (!info.object) return
      onCompetitorClick?.(info.object as CompetitorElevator)
    },
    [onCompetitorClick],
  )

  // ── Build layers ────────────────────────────────────────────────────
  const layers = useMemo(() => {
    const result: any[] = []

    if (isProximityMode) {
      // ── Proximity mode: just lines, dots, labels ──
      result.push(
        new PathLayer({
          id: 'proximity-lines',
          data: proximityLines,
          getPath: d => d.path,
          getColor: d => d.color,
          getWidth: d => d.width,
          getDashArray: (d: (typeof proximityLines)[number]) => d.dashArray,
          dashJustified: true,
          dashGapPickable: true,
          widthUnits: 'pixels',
          extensions: [],
        }),
        new ScatterplotLayer({
          id: 'proximity-points',
          data: proximityPoints,
          getPosition: d => d.position,
          getFillColor: d => d.color,
          getRadius: d => d.radius,
          radiusUnits: 'pixels',
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
        }),
        new TextLayer({
          id: 'proximity-labels',
          data: proximityLines,
          getPosition: d => d.midpoint,
          getText: d => d.label,
          getColor: d => d.type === 'own'
            ? parseColor(colors.distanceLabelOwnText)
            : parseColor(colors.distanceLabelCompText),
          getBackgroundColor: d => d.type === 'own'
            ? parseColor(colors.distanceLabelOwnBg)
            : parseColor(colors.distanceLabelCompBg),
          background: true,
          backgroundPadding: [4, 2],
          getSize: 12,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          getBorderColor: d => d.type === 'own'
            ? [34, 197, 94, 255] as [number, number, number, number]
            : [59, 130, 246, 255] as [number, number, number, number],
          getBorderWidth: 1,
        }),
      )
      return result
    }

    // ── Territory mode ──

    // Voronoi cell polygons
    if (showVoronoi) {
      const ownCells = voronoiCells.filter(c => c.site.isOwn)
      const compCells = voronoiCells.filter(c => !c.site.isOwn)

      result.push(
        new PolygonLayer({
          id: 'voronoi-own',
          data: ownCells,
          getPolygon: d => d.polygon,
          getFillColor: [0, 0, 0, 0],
          getLineColor: (d: any) => {
            const isSelected = d.site.id === selectedElevatorId
            return isSelected ? [34, 197, 94, 204] : [34, 197, 94, 100]
          },
          getLineWidth: (d: any) => d.site.id === selectedElevatorId ? 2 : 1,
          lineWidthUnits: 'pixels',
          stroked: true,
          filled: false,
          pickable: false,
          updateTriggers: {
            getLineColor: [selectedElevatorId],
            getLineWidth: [selectedElevatorId],
          },
        }),
      )

      if (showCompetitors) {
        result.push(
          new PolygonLayer({
            id: 'voronoi-comp',
            data: compCells,
            getPolygon: d => d.polygon,
            getFillColor: [0, 0, 0, 0],
            getLineColor: [59, 130, 246, 76],
            getLineWidth: 1,
            lineWidthUnits: 'pixels',
            stroked: true,
            filled: false,
            pickable: false,
            lineDashPattern: [4, 4],
          }),
        )
      }
    }

    // Natural cell boundary (green)
    if (selectedCellPolygon && selectedCellPolygon.length >= 3) {
      result.push(
        new PolygonLayer({
          id: 'cell-boundary',
          data: [{ polygon: selectedCellPolygon }],
          getPolygon: d => d.polygon,
          getFillColor: [0, 0, 0, 0],
          getLineColor: [74, 222, 128, 153],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          stroked: true,
          filled: false,
        }),
      )
    }

    // Expanded cell boundary (amber dashed)
    if (expandedCellPolygon && expandedCellPolygon.length >= 3) {
      result.push(
        new PolygonLayer({
          id: 'cell-expanded',
          data: [{ polygon: expandedCellPolygon }],
          getPolygon: d => d.polygon,
          getFillColor: [0, 0, 0, 0],
          getLineColor: [251, 191, 36, 204],
          getLineWidth: 2.5,
          lineWidthUnits: 'pixels',
          stroked: true,
          filled: false,
          lineDashPattern: [8, 5],
        }),
      )
    }

    // Gradient tiers
    if (tierData.length > 0) {
      result.push(
        new PolygonLayer({
          id: 'gradient-tiers',
          data: tierData,
          getPolygon: d => d.polygon,
          getFillColor: [0, 0, 0, 0],
          getLineColor: (d: any) => {
            const opacity = Math.round((0.4 + 0.5 * d.ratio) * 255)
            return [74, 222, 128, opacity]
          },
          getLineWidth: 1,
          lineWidthUnits: 'pixels',
          stroked: true,
          filled: false,
          pickable: false,
        }),
      )
    }

    // Tier basis labels
    if (tierLabels.length > 0) {
      result.push(
        new TextLayer({
          id: 'tier-labels',
          data: tierLabels,
          getPosition: d => d.position,
          getText: d => d.text,
          getColor: parseColor(colors.basisLabelText),
          getBackgroundColor: parseColor(colors.basisLabelBg),
          background: true,
          backgroundPadding: [4, 1],
          getSize: 11,
          fontWeight: 600,
          fontFamily: 'monospace',
          getTextAnchor: 'start',
          getAlignmentBaseline: 'center',
          getPixelOffset: [8, 0],
        }),
      )
    }

    // Farmer dots
    if (farmers.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'farmer-dots',
          data: farmers.filter(f => f.lat != null && f.lng != null),
          getPosition: (d: Farmer) => [d.lng!, d.lat!],
          getFillColor: (d: Farmer) => {
            if (d.id === selectedFarmerId) return [245, 158, 11, 255]
            const bidColor = farmerColors?.get(d.id)
            if (bidColor) return parseColor(bidColor)
            return [148, 163, 184, 180]
          },
          getRadius: (d: Farmer) => d.id === selectedFarmerId ? 6 : 4,
          radiusUnits: 'pixels',
          stroked: false,
          pickable: true,
          onClick: handleFarmerClick,
          onHover: (info: any) => {
            if (info.object) {
              const f = info.object as Farmer
              const bid = farmerBids?.get(f.id)
              const bidLabel = bid != null ? ` · Bid: -${(bid / 100).toFixed(2)}` : ''
              const reachable = reachableFarmerIds?.has(f.id) ? ' (reachable)' : ''
              setHoverInfo({ x: info.x, y: info.y, text: f.name + bidLabel + reachable, type: 'farmer' })
            } else {
              setHoverInfo(null)
            }
          },
          updateTriggers: {
            getFillColor: [selectedFarmerId, farmerColors],
            getRadius: [selectedFarmerId],
          },
        }),
      )
    }

    // ── Heatmap layer: competitive pressure heat surface ──
    if (showHeatmap && farmerWinData && farmerWinData.length > 0) {
      result.push(
        new HeatmapLayer({
          id: 'competitive-heatmap',
          data: farmerWinData,
          getPosition: (d: FarmerWinData) => [d.lng, d.lat],
          // Weight: losing farmers are "hot" (high weight), winning farmers are cool (low weight)
          // margin is positive when user wins, negative when competitor wins
          // Invert: competitor-winning farmers should glow hot
          getWeight: (d: FarmerWinData) => Math.max(0, -d.margin + 5),
          radiusPixels: 60,
          intensity: 1.2,
          threshold: 0.05,
          // Red-amber heatmap for competitive pressure
          colorRange: [
            [255, 255, 178, 25],   // pale yellow (low pressure)
            [254, 204, 92, 120],   // amber
            [253, 141, 60, 160],   // orange
            [240, 59, 32, 180],    // red-orange
            [189, 0, 38, 200],     // deep red (high pressure)
          ],
          aggregation: 'SUM',
          pickable: false,
        }),
      )
    }

    // (Grain flow trips handled separately for animation performance)

    // ── Hexagon layer: bushel density + win rate aggregation ──
    if (showHexagons && farmerWinData && farmerWinData.length > 0) {
      result.push(
        new HexagonLayer({
          id: 'bushel-hexagons',
          data: farmerWinData,
          getPosition: (d: FarmerWinData) => [d.lng, d.lat],
          getElevationWeight: (d: FarmerWinData) => d.acres * 180, // bushels
          elevationScale: 20,
          elevationRange: [0, 3000],
          extruded: true,
          radius: 1500, // 1.5km hex cells
          coverage: 0.4,
          // Color by win rate: green (winning) → red (losing)
          getColorWeight: (d: FarmerWinData) => d.winner === 'own' ? 1 : 0,
          colorAggregation: 'MEAN',
          colorRange: [
            [239, 68, 68, 200],    // red — losing most
            [245, 158, 11, 200],   // amber — contested
            [250, 204, 21, 200],   // yellow — slight edge
            [74, 222, 128, 200],   // light green — winning
            [34, 197, 94, 200],    // green — dominating
          ],
          pickable: false,
          material: {
            ambient: 0.6,
            diffuse: 0.6,
            shininess: 32,
          },
        }),
      )
    }

    // Own elevator markers
    const validElevators = elevators.filter(e => e.lat != null && e.lng != null)
    if (validElevators.length > 0) {
      result.push(
        new ScatterplotLayer({
          id: 'own-elevators',
          data: validElevators,
          getPosition: (d: Elevator) => [d.lng!, d.lat!],
          getFillColor: [34, 197, 94, 255],
          getRadius: 7,
          radiusUnits: 'pixels',
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          pickable: true,
          onHover: (info: any) => {
            if (info.object) {
              setHoverInfo({ x: info.x, y: info.y, text: (info.object as Elevator).name, type: 'elevator' })
            } else {
              setHoverInfo(null)
            }
          },
        }),
        // Elevator permanent labels
        new TextLayer({
          id: 'own-elevator-labels',
          data: validElevators,
          getPosition: (d: Elevator) => [d.lng!, d.lat!],
          getText: (d: Elevator) => d.name,
          getColor: parseColor(colors.elevatorTooltipText),
          getBackgroundColor: parseColor(colors.elevatorTooltipBg),
          background: true,
          backgroundPadding: [6, 3],
          getSize: 11,
          fontWeight: 600,
          fontFamily: 'system-ui, sans-serif',
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'bottom',
          getPixelOffset: [0, -14],
        }),
      )
    }

    // Competitor markers
    if (showCompetitors) {
      result.push(
        new ScatterplotLayer({
          id: 'competitor-elevators',
          data: competitorElevators,
          getPosition: (d: CompetitorElevator) => [d.lng, d.lat],
          getFillColor: [59, 130, 246, 255],
          getRadius: 6,
          radiusUnits: 'pixels',
          stroked: true,
          getLineColor: [255, 255, 255, 255],
          getLineWidth: 2,
          lineWidthUnits: 'pixels',
          pickable: true,
          onClick: handleCompetitorClick,
          onHover: (info: any) => {
            if (info.object) {
              const c = info.object as CompetitorElevator
              const bidSource = competitorBidsForDate ?? competitorBids
              const bid = bidSource[c.id]?.[cropKey as keyof typeof bidSource[string]]
              const bidLabel = bid != null ? ` · Bid: -$${(bid / 100).toFixed(2)}` : ''
              setHoverInfo({
                x: info.x,
                y: info.y,
                text: `${c.name} (${c.operator})${bidLabel}`,
                type: 'competitor',
              })
            } else {
              setHoverInfo(null)
            }
          },
        }),
      )
    }

    return result
  }, [
    isProximityMode,
    proximityLines,
    proximityPoints,
    colors,
    showVoronoi,
    showCompetitors,
    voronoiCells,
    selectedElevatorId,
    selectedCellPolygon,
    expandedCellPolygon,
    tierData,
    tierLabels,
    farmers,
    selectedFarmerId,
    farmerColors,
    farmerBids,
    reachableFarmerIds,
    handleFarmerClick,
    handleCompetitorClick,
    elevators,
    cropKey,
    showHeatmap,
    showHexagons,
    farmerWinData,
  ])

  // ── Trip data for grain flow animation (stable until farmerWinData changes) ──
  const tripData = useMemo(() => {
    if (!farmerWinData || farmerWinData.length === 0) return []
    return farmerWinData.map(d => {
      const absMargin = Math.abs(d.margin)
      // Contested (margin < 3) → short trip (fast pulse), safe (margin > 10) → long trip (slow flow)
      const tripDuration = Math.max(8, Math.min(50, absMargin * 4))
      return {
        winner: d.winner,
        acres: d.acres,
        path: [[d.lng, d.lat], [d.targetLng, d.targetLat]] as [number, number][],
        timestamps: [0, tripDuration] as [number, number],
      }
    })
  }, [farmerWinData])

  // ── Animated layers (recalculate every frame when active) ──
  const animatedLayers = useMemo(() => {
    const result: any[] = []

    // Grain flow: animated trips from farmer → winning elevator
    if (showArcs && tripData.length > 0) {
      result.push(
        new TripsLayer({
          id: 'grain-flow-trips',
          data: tripData,
          getPath: (d: any) => d.path,
          getTimestamps: (d: any) => d.timestamps,
          getColor: (d: any) =>
            d.winner === 'own'
              ? [34, 197, 94, 200]    // green — flowing to your elevator
              : [59, 130, 246, 160],  // blue — flowing to competitor
          getWidth: (d: any) => Math.max(1.5, Math.min(5, d.acres / 400)),
          currentTime: animTime,
          trailLength: 15,
          fadeTrail: true,
          capRounded: true,
          jointRounded: true,
          widthMinPixels: 1,
          pickable: false,
        }),
      )
    }

    // Competitive pressure pulse: ring around contested farmers
    if (showArcs && farmerWinData && farmerWinData.length > 0) {
      // Only pulse farmers that are contested (|margin| < 5)
      const contested = farmerWinData.filter(d => Math.abs(d.margin) < 5)
      if (contested.length > 0) {
        // Pulse cycle: sin wave from animTime gives smooth 0→1→0 oscillation
        const pulse = (Math.sin(animTime * 0.6) + 1) / 2  // 0 to 1
        result.push(
          new ScatterplotLayer({
            id: 'pressure-pulse',
            data: contested,
            getPosition: (d: FarmerWinData) => [d.lng, d.lat],
            getFillColor: (d: FarmerWinData) => {
              const intensity = Math.max(0, 1 - Math.abs(d.margin) / 5)
              const alpha = Math.round(pulse * intensity * 80)  // max 80 alpha — subtle
              return d.winner === 'competitor'
                ? [239, 68, 68, alpha]    // red pulse for losing
                : [245, 158, 11, alpha]   // amber pulse for barely winning
            },
            getRadius: () => 4 + pulse * 10,  // 4px → 14px radius pulse
            radiusUnits: 'pixels',
            stroked: false,
            pickable: false,
            updateTriggers: {
              getFillColor: [animTime],
              getRadius: [animTime],
            },
          }),
        )
      }
    }

    return result
  }, [showArcs, tripData, farmerWinData, animTime])

  // ── Combined layers ──
  const allLayers = useMemo(() => {
    if (animatedLayers.length > 0) return [...layers, ...animatedLayers]
    return layers
  }, [layers, animatedLayers])

  // ── Tooltip style ───────────────────────────────────────────────────
  const tooltipStyle = useMemo(() => {
    if (!hoverInfo) return undefined
    const bg = hoverInfo.type === 'elevator'
      ? colors.elevatorTooltipBg
      : hoverInfo.type === 'competitor'
        ? colors.competitorTooltipBg
        : colors.tooltipBg
    const text = hoverInfo.type === 'elevator'
      ? colors.elevatorTooltipText
      : hoverInfo.type === 'competitor'
        ? colors.competitorTooltipText
        : colors.tooltipText
    const border = hoverInfo.type === 'elevator'
      ? '#22c55e'
      : hoverInfo.type === 'competitor'
        ? '#3b82f6'
        : colors.tooltipBorder
    return {
      position: 'absolute' as const,
      left: hoverInfo.x + 12,
      top: hoverInfo.y - 12,
      background: bg,
      color: text,
      border: `1px solid ${border}`,
      borderRadius: 4,
      padding: '3px 8px',
      fontSize: 11,
      fontWeight: 500,
      pointerEvents: 'none' as const,
      zIndex: 10,
      whiteSpace: 'nowrap' as const,
      boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
    }
  }, [hoverInfo, colors])

  return (
    <div className="h-full w-full relative" data-testid="landscape-map">
      <Map
        ref={mapRef}
        initialViewState={mountViewState}
        mapStyle={theme === 'dark' ? STYLE_DARK : STYLE_LIGHT}
        style={{ width: '100%', height: '100%' }}
        attributionControl={false}
        onLoad={handleMapLoad}
      >
        <DeckGLOverlay layers={allLayers} />
      </Map>
      {/* Unified nav controls */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col rounded-lg bg-card/95 backdrop-blur border border-border shadow-md overflow-hidden divide-y divide-border animate-enter-left" style={{ animationDelay: '0.3s' }}>
        <button
          onClick={() => mapRef.current?.flyTo({ pitch: 0, bearing: 0, duration: 600 })}
          title="Reset to 2D top-down view"
          className="flex items-center justify-center size-[29px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>
        <button
          onClick={() => {
            const sel = elevators.find(e => e.id === selectedElevatorId)
            if (sel?.lat != null && sel?.lng != null) {
              mapRef.current?.flyTo({ center: [sel.lng, sel.lat], zoom: 11, pitch: 0, bearing: 0, duration: 800 })
            }
          }}
          title="Recenter on selected elevator"
          className="flex items-center justify-center size-[29px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.zoomIn({ duration: 300 })}
          title="Zoom in"
          className="flex items-center justify-center size-[29px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut({ duration: 300 })}
          title="Zoom out"
          className="flex items-center justify-center size-[29px] text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
          </svg>
        </button>
      </div>
      {hoverInfo && (
        <div style={tooltipStyle}>
          {hoverInfo.text}
        </div>
      )}
    </div>
  )
}
