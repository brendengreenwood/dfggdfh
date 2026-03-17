// OSRM routing via free demo server — returns road geometry + driving distance/duration

export interface RouteResult {
  /** Road distance in miles */
  distanceMiles: number
  /** Estimated driving duration in minutes */
  durationMinutes: number
  /** GeoJSON LineString coordinates [lng, lat][] for rendering on map */
  geometry: [number, number][]
}

const OSRM_BASE = 'https://router.project-osrm.org/route/v1/driving'

/**
 * Fetch driving route between two points via OSRM.
 * Returns road geometry + real distance/duration.
 * Falls back to straight line if OSRM is unavailable.
 */
export async function fetchRoute(
  fromLng: number,
  fromLat: number,
  toLng: number,
  toLat: number,
): Promise<RouteResult> {
  try {
    const url = `${OSRM_BASE}/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson`
    const res = await fetch(url)
    if (!res.ok) throw new Error(`OSRM ${res.status}`)
    const data = await res.json()

    if (data.code !== 'Ok' || !data.routes?.length) {
      throw new Error('No route found')
    }

    const route = data.routes[0]
    return {
      distanceMiles: route.distance * 0.000621371, // meters → miles
      durationMinutes: route.duration / 60, // seconds → minutes
      geometry: route.geometry.coordinates as [number, number][],
    }
  } catch {
    // Fallback: straight line with haversine estimate
    const R = 3958.8
    const dLat = (toLat - fromLat) * Math.PI / 180
    const dLng = (toLng - fromLng) * Math.PI / 180
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
      Math.sin(dLng / 2) ** 2
    const straightMiles = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return {
      distanceMiles: straightMiles * 1.3, // rough road factor
      durationMinutes: (straightMiles * 1.3) / 45 * 60, // assume 45 mph avg
      geometry: [[fromLng, fromLat], [toLng, toLat]],
    }
  }
}

/**
 * Fetch routes from a single origin to multiple destinations in parallel.
 * Useful for farmer → own elevator + farmer → competitor.
 */
export async function fetchRoutes(
  fromLng: number,
  fromLat: number,
  destinations: { lng: number; lat: number; label: string }[],
): Promise<Map<string, RouteResult>> {
  const results = new Map<string, RouteResult>()
  const promises = destinations.map(async dest => {
    const route = await fetchRoute(fromLng, fromLat, dest.lng, dest.lat)
    results.set(dest.label, route)
  })
  await Promise.all(promises)
  return results
}
