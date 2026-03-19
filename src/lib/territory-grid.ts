/**
 * Grid-based territory computation.
 *
 * Samples a grid across the map area, computes the net-price winner at each
 * point (user elevator vs best competitor), then traces a contour polygon
 * around the cells the user wins.  This produces the "steppy / reaching"
 * territory boundary that follows real competitive pressure rather than
 * smooth geometric bisectors.
 */

// ─── Fast distance approximation ──────────────────────────────────────
// At Iowa latitudes (~42°N), 1° lat ≈ 69.0 mi, 1° lng ≈ 51.3 mi.
// Pre-compute the lng scale factor once. This avoids 6 trig calls per
// distance and is accurate to ~0.1% at the scale we operate.
const LAT_TO_MI = 69.0
const COS_42 = Math.cos(42 * Math.PI / 180) // ≈ 0.7431
const LNG_TO_MI = 69.0 * COS_42             // ≈ 51.3

function fastDistMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * LAT_TO_MI
  const dLng = (lng2 - lng1) * LNG_TO_MI
  return Math.sqrt(dLat * dLat + dLng * dLng)
}

// ─── Types ────────────────────────────────────────────────────────────
export interface GridBounds {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

export interface ElevatorPoint {
  id: string
  lat: number
  lng: number
  bid: number // posted bid in cents (user or competitor)
}

export interface TerritoryResult {
  /** Contour polygon(s) as [lng, lat][] rings around cells the user wins */
  contours: [number, number][][]
  /** Grid resolution used */
  gridSize: number
  /** Raw win grid (true = user wins at this cell) */
  winGrid: boolean[][]
}

// ─── Grid computation ─────────────────────────────────────────────────

/**
 * Compute the win/loss grid and extract contour boundaries.
 *
 * @param userElevator - The user's selected elevator with posted bid
 * @param competitors  - Competitor elevators with their posted bids
 * @param freightCentsPerMile - Freight cost in ¢/mile
 * @param bounds - Geographic bounds to sample
 * @param gridSize - Grid resolution (e.g. 80 = 80×80 cells)
 */
export function computeTerritoryGrid(
  userElevator: ElevatorPoint,
  competitors: ElevatorPoint[],
  freightCentsPerMile: number,
  bounds: GridBounds,
  gridSize = 80,
): TerritoryResult {
  const { minLat, maxLat, minLng, maxLng } = bounds
  const latStep = (maxLat - minLat) / gridSize
  const lngStep = (maxLng - minLng) / gridSize

  // Build win grid: true where user's net price >= best competitor's net price
  const winGrid: boolean[][] = []
  for (let row = 0; row <= gridSize; row++) {
    const gridRow: boolean[] = []
    const lat = minLat + row * latStep
    for (let col = 0; col <= gridSize; col++) {
      const lng = minLng + col * lngStep

      // User's net price at this point
      const distToUser = fastDistMiles(lat, lng, userElevator.lat, userElevator.lng)
      const userNet = userElevator.bid - distToUser * freightCentsPerMile

      // Best competitor's net price at this point
      let bestCompNet = -Infinity
      for (const comp of competitors) {
        const distToComp = fastDistMiles(lat, lng, comp.lat, comp.lng)
        const compNet = comp.bid - distToComp * freightCentsPerMile
        if (compNet > bestCompNet) bestCompNet = compNet
      }

      gridRow.push(userNet >= bestCompNet)
    }
    winGrid.push(gridRow)
  }

  // Extract contour via marching squares
  const contours = marchingSquares(winGrid, minLat, minLng, latStep, lngStep)

  return { contours, gridSize, winGrid }
}

// ─── Marching squares contour extraction ──────────────────────────────

/**
 * Simple marching squares implementation that traces the boundary between
 * true/false cells and returns polygon ring(s) as [lng, lat][] arrays.
 */
function marchingSquares(
  grid: boolean[][],
  minLat: number,
  minLng: number,
  latStep: number,
  lngStep: number,
): [number, number][][] {
  const rows = grid.length - 1
  const cols = grid[0].length - 1

  // Collect boundary segments: each is a pair of [lng, lat] points
  const segments: [[number, number], [number, number]][] = []

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Four corners: TL, TR, BR, BL
      const tl = grid[r][c] ? 1 : 0
      const tr = grid[r][c + 1] ? 1 : 0
      const br = grid[r + 1][c + 1] ? 1 : 0
      const bl = grid[r + 1][c] ? 1 : 0
      const code = (tl << 3) | (tr << 2) | (br << 1) | bl

      if (code === 0 || code === 15) continue // fully outside or fully inside

      const top = midpoint(r, c, r, c + 1, minLat, minLng, latStep, lngStep)
      const right = midpoint(r, c + 1, r + 1, c + 1, minLat, minLng, latStep, lngStep)
      const bottom = midpoint(r + 1, c, r + 1, c + 1, minLat, minLng, latStep, lngStep)
      const left = midpoint(r, c, r + 1, c, minLat, minLng, latStep, lngStep)

      // Standard marching squares lookup
      switch (code) {
        case 1:  segments.push([left, bottom]); break
        case 2:  segments.push([bottom, right]); break
        case 3:  segments.push([left, right]); break
        case 4:  segments.push([right, top]); break
        case 5:  segments.push([left, top], [right, bottom]); break // saddle
        case 6:  segments.push([bottom, top]); break
        case 7:  segments.push([left, top]); break
        case 8:  segments.push([top, left]); break
        case 9:  segments.push([top, bottom]); break
        case 10: segments.push([top, right], [bottom, left]); break // saddle
        case 11: segments.push([top, right]); break
        case 12: segments.push([right, left]); break
        case 13: segments.push([right, bottom]); break
        case 14: segments.push([bottom, left]); break
      }
    }
  }

  // Stitch segments into ordered polygon rings
  return stitchSegments(segments)
}

function midpoint(
  r1: number, c1: number,
  r2: number, c2: number,
  minLat: number, minLng: number,
  latStep: number, lngStep: number,
): [number, number] {
  const lat = minLat + (r1 + r2) / 2 * latStep
  const lng = minLng + (c1 + c2) / 2 * lngStep
  return [lng, lat] // [lng, lat] for deck.gl
}

/**
 * Stitch unordered line segments into closed polygon rings.
 * Uses a simple greedy endpoint-matching approach.
 */
function stitchSegments(segments: [[number, number], [number, number]][]): [number, number][][] {
  if (segments.length === 0) return []

  const EPS = 1e-8
  const remaining = new Set(segments.map((_, i) => i))
  const rings: [number, number][][] = []

  function ptKey(p: [number, number]): string {
    // Round to grid precision to handle floating point
    return `${p[0].toFixed(6)},${p[1].toFixed(6)}`
  }

  // Build adjacency: endpoint → segment indices
  const adj = new Map<string, number[]>()
  for (let i = 0; i < segments.length; i++) {
    const k0 = ptKey(segments[i][0])
    const k1 = ptKey(segments[i][1])
    if (!adj.has(k0)) adj.set(k0, [])
    if (!adj.has(k1)) adj.set(k1, [])
    adj.get(k0)!.push(i)
    adj.get(k1)!.push(i)
  }

  while (remaining.size > 0) {
    const startIdx = remaining.values().next().value!
    remaining.delete(startIdx)

    const ring: [number, number][] = [segments[startIdx][0], segments[startIdx][1]]
    let current = ptKey(ring[ring.length - 1])
    const startKey = ptKey(ring[0])

    let safety = segments.length + 1
    while (--safety > 0) {
      const neighbors = adj.get(current)
      if (!neighbors) break

      let found = false
      for (const ni of neighbors) {
        if (!remaining.has(ni)) continue

        const seg = segments[ni]
        const k0 = ptKey(seg[0])
        const k1 = ptKey(seg[1])

        let nextPt: [number, number]
        if (k0 === current) {
          nextPt = seg[1]
        } else if (k1 === current) {
          nextPt = seg[0]
        } else {
          continue
        }

        remaining.delete(ni)
        ring.push(nextPt)
        current = ptKey(nextPt)
        found = true
        break
      }

      if (!found) break
      // Check if ring closed
      if (current === startKey) break
    }

    // Only include rings with enough points to form a polygon
    if (ring.length >= 4) {
      // Close the ring if not already closed
      const first = ring[0]
      const last = ring[ring.length - 1]
      if (Math.abs(first[0] - last[0]) > EPS || Math.abs(first[1] - last[1]) > EPS) {
        ring.push([first[0], first[1]])
      }
      rings.push(ring)
    }
  }

  return rings
}
