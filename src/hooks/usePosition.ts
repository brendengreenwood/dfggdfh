import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useCurrentUser } from './useCurrentUser'
import type { CropType, DeliveryMonth, Elevator, PositionSummary, MLRecommendation } from '@/types/kernel'

interface PositionFilters {
  crop?: CropType
  elevatorId?: string
  deliveryMonth?: DeliveryMonth
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  return res.json()
}

export function usePosition(filters?: PositionFilters) {
  const { currentUser } = useCurrentUser()

  const {
    data: allPositions = [],
    isLoading: positionsLoading,
    isError: positionsError,
    error: positionsErrorObj,
  } = useQuery<PositionSummary[]>({
    queryKey: ['positions', currentUser.id],
    queryFn: () => fetchJson(`/api/positions?userId=${currentUser.id}`),
  })

  const {
    data: allRecommendations = [],
    isLoading: recsLoading,
    isError: recsError,
  } = useQuery<MLRecommendation[]>({
    queryKey: ['recommendations', currentUser.id],
    queryFn: () => fetchJson(`/api/recommendations?userId=${currentUser.id}`),
  })

  const { data: allElevators = [] } = useQuery<Elevator[]>({
    queryKey: ['elevators'],
    queryFn: () => fetchJson('/api/elevators'),
  })

  const positions = useMemo(() => {
    let result = allPositions
    if (filters?.crop) {
      result = result.filter(ps => ps.crop === filters.crop)
    }
    if (filters?.elevatorId) {
      result = result.filter(ps => ps.elevator_id === filters.elevatorId)
    }
    if (filters?.deliveryMonth) {
      result = result.filter(ps => ps.delivery_month === filters.deliveryMonth)
    }
    return result
  }, [allPositions, filters?.crop, filters?.elevatorId, filters?.deliveryMonth])

  const recommendations = useMemo(() => {
    return allRecommendations.filter(r => r.rec_type === 'BASIS')
  }, [allRecommendations])

  const getRecommendation = (position: PositionSummary): MLRecommendation | undefined => {
    return recommendations.find(
      r =>
        r.elevator_id === position.elevator_id &&
        r.crop === position.crop &&
        r.delivery_month === position.delivery_month
    )
  }

  const userElevators = useMemo(() => {
    const elevatorIds = new Set(allPositions.map(ps => ps.elevator_id))
    return allElevators.filter(e => elevatorIds.has(e.id))
  }, [allPositions, allElevators])

  const summary = useMemo(() => {
    const timestamps = positions
      .map(p => p.updated_at)
      .filter(Boolean)
      .map(t => new Date(t).getTime())
    const lastUpdated = timestamps.length > 0
      ? new Date(Math.max(...timestamps)).toISOString()
      : null

    return {
      totalPhysical: positions.reduce((sum, p) => sum + p.bushels_physical, 0),
      totalFutures: positions.reduce((sum, p) => sum + p.bushels_futures, 0),
      totalNet: positions.reduce((sum, p) => sum + p.net_position, 0),
      totalCoverageGap: positions.reduce((sum, p) => sum + (p.coverage_gap ?? 0), 0),
      totalCoverageTarget: positions.reduce((sum, p) => sum + (p.coverage_target ?? 0), 0),
      elevatorCount: new Set(positions.map(p => p.elevator_id)).size,
      lastUpdated,
    }
  }, [positions])

  return {
    positions,
    recommendations,
    getRecommendation,
    summary,
    userElevators,
    isLoading: positionsLoading || recsLoading,
    isError: positionsError || recsError,
    error: positionsErrorObj,
  }
}
