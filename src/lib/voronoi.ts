import { Delaunay } from 'd3-delaunay'

export interface VoronoiSite {
  id: string
  lat: number
  lng: number
  isOwn: boolean
}

export interface VoronoiCell {
  site: VoronoiSite
  polygon: [number, number][] // [lng, lat] pairs for Leaflet
}

/**
 * Compute voronoi cells from a mix of own + competitor elevator locations.
 * Clips to the provided bounding box.
 */
export function computeVoronoi(
  sites: VoronoiSite[],
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
): VoronoiCell[] {
  if (sites.length < 2) return []

  // d3-delaunay uses [x, y] = [lng, lat]
  const delaunay = Delaunay.from(
    sites,
    s => s.lng,
    s => s.lat
  )

  const voronoi = delaunay.voronoi([
    bounds.minLng,
    bounds.minLat,
    bounds.maxLng,
    bounds.maxLat,
  ])

  const cells: VoronoiCell[] = []
  for (let i = 0; i < sites.length; i++) {
    const cellPolygon = voronoi.cellPolygon(i)
    if (!cellPolygon) continue

    cells.push({
      site: sites[i],
      // cellPolygon returns [x, y] = [lng, lat] — already correct for Leaflet
      polygon: cellPolygon as [number, number][],
    })
  }

  return cells
}

/**
 * Given a point (lat, lng), find which voronoi site it belongs to.
 * Returns the site index (into the original sites array).
 */
export function findCellForPoint(
  sites: VoronoiSite[],
  lat: number,
  lng: number
): number {
  if (sites.length === 0) return -1
  const delaunay = Delaunay.from(sites, s => s.lng, s => s.lat)
  return delaunay.find(lng, lat)
}

/**
 * Assign each point to the voronoi site it belongs to.
 * Uses Delaunay.find() which is O(1) amortized per lookup.
 */
export function assignToSites(
  sites: VoronoiSite[],
  points: { id: string; lat: number; lng: number }[]
): Map<string, string[]> {
  if (sites.length === 0) return new Map()

  const delaunay = Delaunay.from(
    sites,
    s => s.lng,
    s => s.lat
  )

  // Map: site.id → [point.id, ...]
  const result = new Map<string, string[]>()
  for (const site of sites) {
    result.set(site.id, [])
  }

  for (const pt of points) {
    const idx = delaunay.find(pt.lng, pt.lat)
    const site = sites[idx]
    if (site) {
      result.get(site.id)!.push(pt.id)
    }
  }

  return result
}

/**
 * Get the natural voronoi cell polygon for a specific elevator.
 * This is the cell boundary where freight cost to own elevator equals
 * freight cost to nearest competitor — the indifference line.
 */
export function getCellPolygon(
  sites: VoronoiSite[],
  elevatorId: string,
  bounds: { minLng: number; maxLng: number; minLat: number; maxLat: number }
): [number, number][] | null {
  const cells = computeVoronoi(sites, bounds)
  const own = cells.find(c => c.site.id === elevatorId)
  return own?.polygon ?? null
}

/**
 * Generate inward gradient polygons for a voronoi cell.
 * Tier shape is pressured by competitor proximity — where competitors are close,
 * tiers compress (you must bid aggressively). Where competitors are far, tiers stretch.
 *
 * competitors: [lng, lat] positions of competitor elevators
 */
export function computeGradientTiers(
  polygon: [number, number][], // [lng, lat] pairs (cell boundary)
  centerLng: number,
  centerLat: number,
  tierCount: number,
  competitors?: [number, number][] // [lng, lat] of competitor sites
): { ratio: number; polygon: [number, number][] }[] {
  // For each boundary vertex, compute how much competitive pressure exists
  // in that direction. Pressure = inverse of distance to nearest competitor.
  // High pressure → tiers compress toward center (less room to bid wide).
  // Low pressure → tiers stretch out (more room).
  const pressures = polygon.map(([lng, lat]) => {
    if (!competitors || competitors.length === 0) return 1 // uniform if no competitors

    // Distance from center to this boundary vertex (the "reach" in this direction)
    const reachLng = lng - centerLng
    const reachLat = lat - centerLat
    const reachDist = Math.sqrt(reachLng * reachLng + reachLat * reachLat)
    if (reachDist < 0.0001) return 1

    // Find nearest competitor along this direction
    let minCompDist = Infinity
    for (const [cLng, cLat] of competitors) {
      const dx = cLng - centerLng
      const dy = cLat - centerLat
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 0.0001) continue
      // How much does this competitor's direction align with this vertex?
      const dot = (reachLng * dx + reachLat * dy) / (reachDist * dist)
      if (dot > 0.3) { // competitor is roughly in same direction
        minCompDist = Math.min(minCompDist, dist)
      }
    }

    if (minCompDist === Infinity) return 1
    // Pressure: closer competitor → higher pressure → faster compression
    // Normalize by reach distance so it's relative
    return Math.min(2, reachDist / Math.max(0.001, minCompDist - reachDist))
  })

  // Normalize pressures so average = 1 (preserves overall tier density)
  const avgPressure = pressures.reduce((s, p) => s + p, 0) / pressures.length || 1
  const normalizedPressures = pressures.map(p => p / avgPressure)

  const tiers: { ratio: number; polygon: [number, number][] }[] = []

  for (let i = 1; i <= tierCount; i++) {
    const baseT = i / (tierCount + 1)
    const shrunk = polygon.map(([lng, lat], vi): [number, number] => {
      // Higher pressure → pull further inward (tier compresses)
      const pressure = normalizedPressures[vi]
      const t = Math.min(0.95, baseT * (0.5 + 0.5 * pressure))
      return [
        lng + (centerLng - lng) * t,
        lat + (centerLat - lat) * t,
      ]
    })
    tiers.push({ ratio: baseT, polygon: shrunk })
  }

  return tiers
}
