import { useEffect, useRef, useMemo, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { computeVoronoi, computeGradientTiers, type VoronoiSite } from '@/lib/voronoi'
import { competitorElevators } from '@/data/competitors'
import type { Elevator, Farmer } from '@/types/kernel'

// Dark tile layer — free, no API key
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'




export interface FocusedProximity {
  farmer: Farmer
  nearestOwn: Elevator
  nearestCompetitor: { id: string; name: string; operator: string; lat: number; lng: number }
  distanceOwn: number
  distanceCompetitor: number
  advantage: number
}

interface LandscapeMapProps {
  elevators: Elevator[]
  farmers: Farmer[]
  selectedElevatorId?: string | null
  onFarmerClick?: (farmer: Farmer) => void
  minBid?: number    // cents — tightest bid at elevator (derived: basisPrice - innerLeeway)
  maxBid?: number    // cents — widest bid at cell edge (derived: basisPrice + outerLeeway)
  tierCount?: number // number of gradient tiers
  selectedCellPolygon?: [number, number][] | null // [lng, lat] — natural voronoi cell boundary
  expandedCellPolygon?: [number, number][] | null // [lng, lat] — expanded cell from outerLeeway (amber dashed)
  farmerColors?: Map<string, string> // farmerId → CSS color for bid gradient
  focusedProximity?: FocusedProximity | null // when set, map transitions to farmer proximity view
  reachableFarmerIds?: Set<string> // farmer IDs outside natural cell but reachable via outerLeeway
}

// Elevator marker icon (our elevators)
function ownElevatorIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:14px;height:14px;background:#22c55e;border:2px solid #fff;border-radius:3px;box-shadow:0 0 6px rgba(34,197,94,0.6);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  })
}

// Competitor elevator icon
function competitorIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="width:12px;height:12px;background:#ef4444;border:2px solid #fff;border-radius:3px;box-shadow:0 0 6px rgba(239,68,68,0.5);"></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  })
}

// Farmer dot — small circle, optionally colored by bid gradient
function farmerIcon(isSelected: boolean, bidColor?: string) {
  const size = isSelected ? 10 : 7
  const color = isSelected ? '#f59e0b' : (bidColor ?? '#94a3b8')
  const opacity = bidColor ? 0.9 : (isSelected ? 1 : 0.7)
  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;opacity:${opacity};box-shadow:0 0 4px ${color};"></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

export function LandscapeMap({ elevators, farmers, selectedElevatorId, onFarmerClick, minBid = 10, maxBid = 25, tierCount = 5, selectedCellPolygon, expandedCellPolygon, farmerColors, focusedProximity, reachableFarmerIds }: LandscapeMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const layersRef = useRef<L.LayerGroup | null>(null)   // base: voronoi cells, elevator/competitor markers
  const farmersRef = useRef<L.LayerGroup | null>(null)  // farmer dots (rebuild on color/selection change)
  const tiersRef = useRef<L.LayerGroup | null>(null)    // gradient tiers + basis labels (rebuild on bid change)
  const proximityRef = useRef<L.LayerGroup | null>(null) // proximity lines when drilled into farmer
  const [selectedFarmerId, setSelectedFarmerId] = useState<string | null>(null)

  // Compute voronoi cells from own elevators + competitors
  const voronoiCells = useMemo(() => {
    const sites: VoronoiSite[] = [
      ...elevators
        .filter(e => e.lat != null && e.lng != null)
        .map(e => ({ id: e.id, lat: e.lat!, lng: e.lng!, isOwn: true })),
      ...competitorElevators.map(c => ({ id: c.id, lat: c.lat, lng: c.lng, isOwn: false })),
    ]

    // Compute bounds from all points with padding
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

  // Map center — focus on selected elevator if provided, otherwise center of all
  const center = useMemo<[number, number]>(() => {
    if (selectedElevatorId) {
      const sel = elevators.find(e => e.id === selectedElevatorId)
      if (sel?.lat != null && sel?.lng != null) return [sel.lat, sel.lng]
    }
    const valid = elevators.filter(e => e.lat != null && e.lng != null)
    if (valid.length === 0) return [42.0, -93.5]
    const lat = valid.reduce((s, e) => s + e.lat!, 0) / valid.length
    const lng = valid.reduce((s, e) => s + e.lng!, 0) / valid.length
    return [lat, lng]
  }, [elevators, selectedElevatorId])

  const initialZoom = selectedElevatorId ? 11 : 9

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center,
      zoom: initialZoom,
      zoomControl: false,
      attributionControl: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      wheelPxPerZoomLevel: 120,
    })

    L.tileLayer(TILE_URL, { maxZoom: 18 }).addTo(map)
    L.control.zoom({ position: 'topright' }).addTo(map)

    mapRef.current = map
    layersRef.current = L.layerGroup().addTo(map)
    farmersRef.current = L.layerGroup().addTo(map)
    tiersRef.current = L.layerGroup().addTo(map)
    proximityRef.current = L.layerGroup().addTo(map)

    return () => {
      map.remove()
      mapRef.current = null
      layersRef.current = null
      farmersRef.current = null
      tiersRef.current = null
      proximityRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fit map to selected cell polygon so it fills the viewport
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (selectedCellPolygon && selectedCellPolygon.length >= 3) {
      const latlngs = selectedCellPolygon.map(([lng, lat]) => [lat, lng] as [number, number])
      const bounds = L.latLngBounds(latlngs)
      map.flyToBounds(bounds, { padding: [40, 40], duration: 0.8, maxZoom: 13 })
    } else if (!selectedElevatorId) {
      // No selection — show full region
      const valid = elevators.filter(e => e.lat != null && e.lng != null)
      if (valid.length > 0) {
        const bounds = L.latLngBounds(valid.map(e => [e.lat!, e.lng!]))
        map.flyToBounds(bounds, { padding: [60, 60], duration: 0.8, maxZoom: 11 })
      }
    }
  }, [selectedCellPolygon, selectedElevatorId, elevators])

  // Base layers: voronoi cells, elevator markers, competitor markers (rarely change)
  useEffect(() => {
    const layers = layersRef.current
    if (!layers) return
    layers.clearLayers()

    // Voronoi cells
    voronoiCells.forEach(cell => {
      const latlngs = cell.polygon.map(([lng, lat]) => [lat, lng] as [number, number])
      const isOwn = cell.site.isOwn
      const isSelected = cell.site.id === selectedElevatorId

      L.polygon(latlngs, {
        color: isOwn ? '#22c55e' : '#ef4444',
        weight: isOwn ? (isSelected ? 2 : 1) : 1,
        opacity: isOwn ? (isSelected ? 0.8 : 0.4) : 0.3,
        fill: !isOwn,
        fillColor: '#ef4444',
        fillOpacity: 0.03,
        dashArray: isOwn ? undefined : '4 4',
      }).addTo(layers)
    })

    // Own elevator markers (on top)
    elevators.forEach(e => {
      if (e.lat == null || e.lng == null) return
      const marker = L.marker([e.lat, e.lng], { icon: ownElevatorIcon(), zIndexOffset: 1000 })
      marker.bindTooltip(e.name, {
        direction: 'top',
        offset: [0, -8],
        className: 'elevator-tooltip',
        permanent: true,
      })
      marker.addTo(layers)
    })

    // Competitor markers
    competitorElevators.forEach(c => {
      const marker = L.marker([c.lat, c.lng], { icon: competitorIcon(), zIndexOffset: 500 })
      marker.bindTooltip(`${c.name} (${c.operator})`, {
        direction: 'top',
        offset: [0, -8],
        className: 'competitor-tooltip',
      })
      marker.addTo(layers)
    })
  }, [voronoiCells, elevators, selectedElevatorId])

  // Farmer dot layer: rebuilds on color or selection change
  useEffect(() => {
    const layer = farmersRef.current
    if (!layer) return
    layer.clearLayers()

    farmers.forEach(f => {
      if (f.lat == null || f.lng == null) return
      const isSelected = f.id === selectedFarmerId
      const isReachable = reachableFarmerIds?.has(f.id) // outside natural cell but reachable via outerLeeway
      const bidColor = farmerColors?.get(f.id)
      const marker = L.marker([f.lat, f.lng], { icon: farmerIcon(isSelected, bidColor) })
      marker.on('click', () => {
        setSelectedFarmerId(prev => prev === f.id ? null : f.id)
        onFarmerClick?.(f)
      })
      marker.bindTooltip(f.name + (isReachable ? ' (reachable)' : ''), {
        direction: 'top',
        offset: [0, -4],
        className: 'farmer-tooltip',
      })
      marker.addTo(layer)
    })
  }, [farmers, selectedFarmerId, onFarmerClick, farmerColors, reachableFarmerIds])

  // Competitor positions for gradient pressure (stable reference)
  const competitorPositions = useMemo<[number, number][]>(
    () => competitorElevators.map(c => [c.lng, c.lat]),
    []
  )

  // Dynamic layers: gradient tiers within the natural cell (re-render on bid changes)
  // Tiers show inward gradient from cell boundary toward elevator
  useEffect(() => {
    const tiers_layer = tiersRef.current
    if (!tiers_layer) return
    tiers_layer.clearLayers()

    if (!selectedElevatorId || !selectedCellPolygon || selectedCellPolygon.length < 3) return
    const sel = elevators.find(e => e.id === selectedElevatorId)
    if (!sel?.lat || !sel?.lng) return

    // Draw the natural cell boundary (green = freight-indifference line)
    const boundaryLatlngs = selectedCellPolygon.map(([lng, lat]) => [lat, lng] as [number, number])
    L.polygon(boundaryLatlngs, {
      color: '#4ade80',
      weight: 2,
      opacity: 0.6,
      fill: true,
      fillColor: '#4ade80',
      fillOpacity: 0.03,
    }).addTo(tiers_layer)

    // Amber dashed boundary — expanded voronoi cell from outerLeeway
    if (expandedCellPolygon && expandedCellPolygon.length >= 3) {
      const expandedLatlngs = expandedCellPolygon.map(([lng, lat]) => [lat, lng] as [number, number])
      L.polygon(expandedLatlngs, {
        color: '#fbbf24',
        weight: 2.5,
        opacity: 0.8,
        fill: true,
        fillColor: '#fbbf24',
        fillOpacity: 0.03,
        dashArray: '8 5',
      }).addTo(tiers_layer)
    }

    // Compute gradient tiers within the expanded boundary
    const tiers = computeGradientTiers(selectedCellPolygon, sel.lng!, sel.lat!, tierCount, competitorPositions)
    const minDollars = minBid / 100
    const maxDollars = maxBid / 100

    tiers.forEach(tier => {
      const basisAtTier = -(maxDollars + (minDollars - maxDollars) * tier.ratio)
      const opacity = 0.15 + 0.35 * tier.ratio

      const latlngs = tier.polygon.map(([lng, lat]) => [lat, lng] as [number, number])
      L.polygon(latlngs, {
        color: '#4ade80',
        weight: 1,
        opacity,
        fill: false,
      }).addTo(tiers_layer)

      const rightmost = tier.polygon.reduce((best, pt) =>
        pt[0] > best[0] ? pt : best, tier.polygon[0])
      L.marker([rightmost[1], rightmost[0]], {
        icon: L.divIcon({
          className: '',
          html: `<div style="background:rgba(0,0,0,0.75);color:#4ade80;font-size:10px;font-weight:600;font-family:monospace;padding:1px 4px;border-radius:3px;border:1px solid rgba(74,222,128,${opacity});white-space:nowrap;">${basisAtTier.toFixed(2)}</div>`,
          iconAnchor: [-6, 8],
        }),
        interactive: false,
      }).addTo(tiers_layer)
    })
  }, [selectedElevatorId, selectedCellPolygon, expandedCellPolygon, elevators, minBid, maxBid, tierCount, competitorPositions])

  // Proximity drill-down: when focusedProximity is set, zoom to farmer and draw distance lines
  useEffect(() => {
    const map = mapRef.current
    const proxLayer = proximityRef.current
    if (!map || !proxLayer) return
    proxLayer.clearLayers()

    if (!focusedProximity) {
      // Return to territory view — fly back to cell bounds
      if (selectedCellPolygon && selectedCellPolygon.length >= 3) {
        const latlngs = selectedCellPolygon.map(([lng, lat]) => [lat, lng] as [number, number])
        map.flyToBounds(L.latLngBounds(latlngs), { padding: [40, 40], duration: 0.8, maxZoom: 13 })
      }
      // Show other layers again
      if (layersRef.current) map.addLayer(layersRef.current)
      if (farmersRef.current) map.addLayer(farmersRef.current)
      if (tiersRef.current) map.addLayer(tiersRef.current)
      return
    }

    const { farmer, nearestOwn, nearestCompetitor, distanceOwn, distanceCompetitor } = focusedProximity
    if (!farmer.lat || !farmer.lng) return

    const fLat = farmer.lat
    const fLng = farmer.lng
    const oLat = nearestOwn.lat!
    const oLng = nearestOwn.lng!
    const cLat = nearestCompetitor.lat
    const cLng = nearestCompetitor.lng

    // Hide territory layers for a clean proximity view
    if (layersRef.current) map.removeLayer(layersRef.current)
    if (farmersRef.current) map.removeLayer(farmersRef.current)
    if (tiersRef.current) map.removeLayer(tiersRef.current)

    // Fit bounds to farmer + both elevators
    const bounds = L.latLngBounds([
      [fLat, fLng], [oLat, oLng], [cLat, cLng],
    ])
    map.flyToBounds(bounds.pad(0.3), { duration: 0.8 })

    // Line to own elevator (green, solid)
    L.polyline([[fLat, fLng], [oLat, oLng]], {
      color: '#22c55e', weight: 3, opacity: 0.85,
    }).addTo(proxLayer)

    // Line to competitor (red, dashed)
    L.polyline([[fLat, fLng], [cLat, cLng]], {
      color: '#ef4444', weight: 3, opacity: 0.7, dashArray: '8 5',
    }).addTo(proxLayer)

    // Farmer dot (amber, larger)
    L.circleMarker([fLat, fLng], {
      radius: 8, fillColor: '#f59e0b', fillOpacity: 1,
      color: '#fff', weight: 2,
    }).addTo(proxLayer)

    // Own elevator marker
    L.marker([oLat, oLng], { icon: ownElevatorIcon(), zIndexOffset: 1000 })
      .bindTooltip(nearestOwn.name, {
        direction: 'top', offset: [0, -8], className: 'elevator-tooltip', permanent: true,
      })
      .addTo(proxLayer)

    // Competitor marker
    L.marker([cLat, cLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;background:#ef4444;border:2px solid #fff;border-radius:3px;box-shadow:0 0 6px rgba(239,68,68,0.5);"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7],
      }),
      zIndexOffset: 1000,
    })
      .bindTooltip(`${nearestCompetitor.name} (${nearestCompetitor.operator})`, {
        direction: 'top', offset: [0, -8], className: 'competitor-tooltip', permanent: true,
      })
      .addTo(proxLayer)

    // Distance labels on lines
    const ownMid: [number, number] = [(fLat + oLat) / 2, (fLng + oLng) / 2]
    L.marker(ownMid, {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#166534;color:#dcfce7;font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;border:1px solid #22c55e;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${distanceOwn.toFixed(1)} mi</div>`,
        iconAnchor: [25, 10],
      }),
      interactive: false,
    }).addTo(proxLayer)

    const compMid: [number, number] = [(fLat + cLat) / 2, (fLng + cLng) / 2]
    L.marker(compMid, {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#450a0a;color:#fecaca;font-size:12px;font-weight:600;padding:2px 8px;border-radius:4px;border:1px solid #ef4444;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,0.5);">${distanceCompetitor.toFixed(1)} mi</div>`,
        iconAnchor: [25, 10],
      }),
      interactive: false,
    }).addTo(proxLayer)
  }, [focusedProximity, selectedCellPolygon])

  return (
    <>
      <style>{`
        .farmer-tooltip {
          background: #1e293b;
          color: #e2e8f0;
          border: 1px solid #334155;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .farmer-tooltip::before { border-top-color: #334155 !important; }
        .elevator-tooltip {
          background: #166534;
          color: #dcfce7;
          border: 1px solid #22c55e;
          border-radius: 4px;
          padding: 3px 8px;
          font-size: 11px;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .elevator-tooltip::before { border-top-color: #22c55e !important; }
        .competitor-tooltip {
          background: #450a0a;
          color: #fecaca;
          border: 1px solid #ef4444;
          border-radius: 4px;
          padding: 2px 6px;
          font-size: 11px;
          font-weight: 500;
          box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        }
        .competitor-tooltip::before { border-top-color: #ef4444 !important; }
        .leaflet-control-zoom a {
          background: #1e293b !important;
          color: #e2e8f0 !important;
          border-color: #334155 !important;
        }
        .leaflet-control-zoom a:hover {
          background: #334155 !important;
        }
      `}</style>
      <div ref={containerRef} className="h-full w-full" data-testid="landscape-map" />
    </>
  )
}
