import { useEffect, useMemo, useState } from 'react'
import Map from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import { useControl } from 'react-map-gl/maplibre'
import { ScatterplotLayer, PathLayer, TextLayer } from '@deck.gl/layers'
import 'maplibre-gl/dist/maplibre-gl.css'
import { haversineMiles } from '@/lib/geo'
import { fetchRoute, type RouteResult } from '@/lib/routing'
import type { Elevator, Farmer } from '@/types/kernel'
import type { CompetitorElevator } from '@/data/competitors'

const STYLE_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const STYLE_LIGHT = 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json'

export interface ProximityRouteData {
  ownDistanceMiles: number
  ownDurationMinutes: number
  compDistanceMiles: number
  compDurationMinutes: number
  advantage: number
}

interface ProximityMapProps {
  farmer: Farmer
  nearestOwn: Elevator
  nearestCompetitor: CompetitorElevator
  distanceOwn: number
  distanceCompetitor: number
  theme?: 'light' | 'dark'
  onRoutesLoaded?: (data: ProximityRouteData) => void
}

function DeckGLOverlay(props: { layers: any[] }) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ interleaved: true }),
  )
  overlay.setProps({ layers: props.layers })
  return null
}

export function ProximityMap({
  farmer,
  nearestOwn,
  nearestCompetitor,
  distanceOwn,
  distanceCompetitor,
  theme = 'dark',
  onRoutesLoaded,
}: ProximityMapProps) {
  if (!farmer.lat || !farmer.lng) return null

  const fLng = farmer.lng
  const fLat = farmer.lat
  const oLng = nearestOwn.lng!
  const oLat = nearestOwn.lat!
  const cLng = nearestCompetitor.lng
  const cLat = nearestCompetitor.lat
  const isDark = theme === 'dark'

  // Fetch road routes
  const [routeOwn, setRouteOwn] = useState<RouteResult | null>(null)
  const [routeComp, setRouteComp] = useState<RouteResult | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setRouteOwn(null)
    setRouteComp(null)

    Promise.all([
      fetchRoute(fLng, fLat, oLng, oLat),
      fetchRoute(fLng, fLat, cLng, cLat),
    ]).then(([own, comp]) => {
      if (cancelled) return
      setRouteOwn(own)
      setRouteComp(comp)
      setLoading(false)
      onRoutesLoaded?.({
        ownDistanceMiles: own.distanceMiles,
        ownDurationMinutes: own.durationMinutes,
        compDistanceMiles: comp.distanceMiles,
        compDurationMinutes: comp.durationMinutes,
        advantage: comp.distanceMiles - own.distanceMiles,
      })
    })

    return () => { cancelled = true }
  }, [fLng, fLat, oLng, oLat, cLng, cLat])

  const viewState = useMemo(() => {
    const lats = [fLat, oLat, cLat]
    const lngs = [fLng, oLng, cLng]
    const minLat = Math.min(...lats)
    const maxLat = Math.max(...lats)
    const minLng = Math.min(...lngs)
    const maxLng = Math.max(...lngs)

    const latSpan = (maxLat - minLat) || 0.01
    const lngSpan = (maxLng - minLng) || 0.01
    const padded = 1.6
    const zoomLat = Math.log2(180 / (latSpan * padded))
    const zoomLng = Math.log2(360 / (lngSpan * padded))
    const zoom = Math.min(zoomLat, zoomLng, 13)

    return {
      longitude: (minLng + maxLng) / 2,
      latitude: (minLat + maxLat) / 2,
      zoom,
    }
  }, [fLat, fLng, oLat, oLng, cLat, cLng])

  // Wait for real road routes — don't show straight-line fallbacks
  const routesReady = routeOwn && routeComp
  const ownPath = routeOwn?.geometry ?? []
  const compPath = routeComp?.geometry ?? []
  const ownDist = routeOwn?.distanceMiles ?? 0
  const compDist = routeComp?.distanceMiles ?? 0
  const ownDuration = routeOwn?.durationMinutes
  const compDuration = routeComp?.durationMinutes

  // Labels at road midpoints (only when routes ready)
  const ownMid = ownPath.length > 0 ? ownPath[Math.floor(ownPath.length / 2)] : [fLng, fLat]
  const compMid = compPath.length > 0 ? compPath[Math.floor(compPath.length / 2)] : [fLng, fLat]
  const ownLabel = routesReady ? `${ownDist.toFixed(1)} mi${ownDuration ? ` · ${Math.round(ownDuration)} min` : ''}` : ''
  const compLabel = routesReady ? `${compDist.toFixed(1)} mi${compDuration ? ` · ${Math.round(compDuration)} min` : ''}` : ''

  const layers = useMemo(() => [
    // Line to own elevator (green solid) — only when road route is ready
    new PathLayer({
      id: 'line-own',
      data: routesReady ? [{ path: ownPath }] : [],
      getPath: (d: any) => d.path,
      getColor: [34, 197, 94, 204],
      getWidth: 2,
      widthUnits: 'pixels' as const,
    }),
    // Line to competitor (blue dashed) — only when road route is ready
    new PathLayer({
      id: 'line-comp',
      data: routesReady ? [{ path: compPath }] : [],
      getPath: (d: any) => d.path,
      getColor: [59, 130, 246, 153],
      getWidth: 2,
      widthUnits: 'pixels' as const,
      getDashArray: (d: any) => [6, 4],
      dashJustified: true,
    }),
    // Farmer dot (amber)
    new ScatterplotLayer({
      id: 'farmer-dot',
      data: [{ position: [fLng, fLat] }],
      getPosition: (d: any) => d.position,
      getFillColor: [245, 158, 11, 255],
      getRadius: 5,
      radiusUnits: 'pixels' as const,
      stroked: true,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 1.5,
      lineWidthUnits: 'pixels' as const,
    }),
    // Own elevator (green)
    new ScatterplotLayer({
      id: 'elevator-own',
      data: [{ position: [oLng, oLat] }],
      getPosition: (d: any) => d.position,
      getFillColor: [34, 197, 94, 255],
      getRadius: 6,
      radiusUnits: 'pixels' as const,
      stroked: true,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 1.5,
      lineWidthUnits: 'pixels' as const,
    }),
    // Competitor (blue)
    new ScatterplotLayer({
      id: 'elevator-comp',
      data: [{ position: [cLng, cLat] }],
      getPosition: (d: any) => d.position,
      getFillColor: [59, 130, 246, 255],
      getRadius: 6,
      radiusUnits: 'pixels' as const,
      stroked: true,
      getLineColor: [255, 255, 255, 255],
      getLineWidth: 1.5,
      lineWidthUnits: 'pixels' as const,
    }),
    // Distance label — own (hidden until routes ready)
    new TextLayer({
      id: 'label-own',
      data: routesReady ? [{ position: ownMid, text: ownLabel }] : [],
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: 10,
      getColor: isDark ? [220, 252, 231, 255] : [20, 83, 45, 255],
      getBackgroundColor: isDark ? [22, 101, 52, 220] : [220, 252, 231, 220],
      backgroundPadding: [4, 2],
      background: true,
      getBorderColor: [34, 197, 94, 200],
      getBorderWidth: 1,
      fontFamily: 'ui-monospace, monospace',
      fontWeight: 600,
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
    }),
    // Distance label — competitor (hidden until routes ready)
    new TextLayer({
      id: 'label-comp',
      data: routesReady ? [{ position: compMid, text: compLabel }] : [],
      getPosition: (d: any) => d.position,
      getText: (d: any) => d.text,
      getSize: 10,
      getColor: isDark ? [254, 202, 202, 255] : [127, 29, 29, 255],
      getBackgroundColor: isDark ? [69, 10, 10, 220] : [254, 226, 226, 220],
      backgroundPadding: [4, 2],
      background: true,
      getBorderColor: [59, 130, 246, 200],
      getBorderWidth: 1,
      fontFamily: 'ui-monospace, monospace',
      fontWeight: 600,
      getTextAnchor: 'middle' as const,
      getAlignmentBaseline: 'center' as const,
    }),
  ], [ownPath, compPath, fLng, fLat, oLng, oLat, cLng, cLat, ownLabel, compLabel, isDark, routesReady])

  return (
    <div className="relative w-full h-full">
      <Map
        initialViewState={viewState}
        mapStyle={isDark ? STYLE_DARK : STYLE_LIGHT}
        style={{ width: '100%', height: '100%' }}
        interactive={false}
        attributionControl={false}
      >
        <DeckGLOverlay layers={layers} />
      </Map>

      {/* Loading spinner overlay */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-card/60 backdrop-blur-[1px] z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="h-5 w-5 border-2 border-muted-foreground/30 border-t-foreground rounded-full animate-spin" />
            <span className="text-[10px] text-muted-foreground">Mapping routes…</span>
          </div>
        </div>
      )}
    </div>
  )
}

/** Compute nearest own elevator and nearest competitor for a given farmer */
export function computeProximity(
  farmer: Farmer,
  ownElevators: Elevator[],
  competitors: CompetitorElevator[],
) {
  if (!farmer.lat || !farmer.lng) return null
  let nearestOwn: Elevator | null = null
  let distanceOwn = Infinity
  for (const e of ownElevators) {
    if (!e.lat || !e.lng) continue
    const d = haversineMiles(farmer.lat, farmer.lng, e.lat, e.lng)
    if (d < distanceOwn) { distanceOwn = d; nearestOwn = e }
  }
  let nearestCompetitor: CompetitorElevator | null = null
  let distanceCompetitor = Infinity
  for (const c of competitors) {
    const d = haversineMiles(farmer.lat, farmer.lng, c.lat, c.lng)
    if (d < distanceCompetitor) { distanceCompetitor = d; nearestCompetitor = c }
  }
  if (!nearestOwn || !nearestCompetitor) return null
  return {
    nearestOwn,
    nearestCompetitor,
    distanceOwn,
    distanceCompetitor,
    advantage: distanceCompetitor - distanceOwn,
  }
}
