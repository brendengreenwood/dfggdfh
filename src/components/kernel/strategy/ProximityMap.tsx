import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { haversineMiles } from '@/lib/geo'
import type { Elevator, Farmer } from '@/types/kernel'
import type { CompetitorElevator } from '@/data/competitors'

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'

interface ProximityMapProps {
  farmer: Farmer
  nearestOwn: Elevator
  nearestCompetitor: CompetitorElevator
  distanceOwn: number
  distanceCompetitor: number
}

export function ProximityMap({ farmer, nearestOwn, nearestCompetitor, distanceOwn, distanceCompetitor }: ProximityMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)

  useEffect(() => {
    if (!containerRef.current || !farmer.lat || !farmer.lng) return

    // Clean up previous
    if (mapRef.current) {
      mapRef.current.remove()
      mapRef.current = null
    }

    const fLat = farmer.lat
    const fLng = farmer.lng
    const oLat = nearestOwn.lat!
    const oLng = nearestOwn.lng!
    const cLat = nearestCompetitor.lat
    const cLng = nearestCompetitor.lng

    // Fit bounds to all 3 points
    const bounds = L.latLngBounds([
      [fLat, fLng],
      [oLat, oLng],
      [cLat, cLng],
    ])

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    })

    L.tileLayer(TILE_URL, { maxZoom: 18 }).addTo(map)
    map.fitBounds(bounds.pad(0.3))

    // Line to own elevator (green, solid)
    L.polyline([[fLat, fLng], [oLat, oLng]], {
      color: '#22c55e',
      weight: 2,
      opacity: 0.8,
    }).addTo(map)

    // Line to competitor (red, dashed)
    L.polyline([[fLat, fLng], [cLat, cLng]], {
      color: '#ef4444',
      weight: 2,
      opacity: 0.6,
      dashArray: '6 4',
    }).addTo(map)

    // Farmer dot (amber)
    L.circleMarker([fLat, fLng], {
      radius: 5,
      fillColor: '#f59e0b',
      fillOpacity: 1,
      color: '#fff',
      weight: 1.5,
    }).addTo(map)

    // Own elevator (green square)
    L.marker([oLat, oLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:10px;height:10px;background:#22c55e;border:1.5px solid #fff;border-radius:2px;"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    }).addTo(map)

    // Competitor (red square)
    L.marker([cLat, cLng], {
      icon: L.divIcon({
        className: '',
        html: `<div style="width:10px;height:10px;background:#ef4444;border:1.5px solid #fff;border-radius:2px;"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      }),
    }).addTo(map)

    // Distance labels on the lines
    const ownMid: [number, number] = [(fLat + oLat) / 2, (fLng + oLng) / 2]
    L.marker(ownMid, {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#166534;color:#dcfce7;font-size:10px;font-weight:600;padding:1px 5px;border-radius:3px;border:1px solid #22c55e;white-space:nowrap;">${distanceOwn.toFixed(1)} mi</div>`,
        iconAnchor: [20, 8],
      }),
    }).addTo(map)

    const compMid: [number, number] = [(fLat + cLat) / 2, (fLng + cLng) / 2]
    L.marker(compMid, {
      icon: L.divIcon({
        className: '',
        html: `<div style="background:#450a0a;color:#fecaca;font-size:10px;font-weight:600;padding:1px 5px;border-radius:3px;border:1px solid #ef4444;white-space:nowrap;">${distanceCompetitor.toFixed(1)} mi</div>`,
        iconAnchor: [20, 8],
      }),
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [farmer, nearestOwn, nearestCompetitor, distanceOwn, distanceCompetitor])

  return <div ref={containerRef} className="h-36 w-full rounded-md overflow-hidden" />
}

/**
 * Compute nearest own elevator and competitor for a farmer
 */
export function computeProximity(
  farmer: Farmer,
  elevators: Elevator[],
  competitors: CompetitorElevator[]
) {
  if (!farmer.lat || !farmer.lng) return null

  let nearestOwn: Elevator | null = null
  let distanceOwn = Infinity
  for (const e of elevators) {
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
    advantage: distanceCompetitor - distanceOwn, // positive = we're closer
  }
}
