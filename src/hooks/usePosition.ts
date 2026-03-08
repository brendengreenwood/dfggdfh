import { useMemo } from 'react'
import { positionSummaries, mlRecommendations } from '@/data/mock'
import { useCurrentUser } from './useCurrentUser'
import type { CropType, PositionSummary, MLRecommendation } from '@/types/kernel'

export function usePosition(filters?: { crop?: CropType }) {
  const { currentUser } = useCurrentUser()

  const positions = useMemo(() => {
    let result = positionSummaries.filter(ps => ps.user_id === currentUser.id)
    if (filters?.crop) {
      result = result.filter(ps => ps.crop === filters.crop)
    }
    return result
  }, [currentUser.id, filters?.crop])

  const recommendations = useMemo(() => {
    return mlRecommendations.filter(
      r => r.user_id === currentUser.id && r.rec_type === 'BASIS'
    )
  }, [currentUser.id])

  const getRecommendation = (position: PositionSummary): MLRecommendation | undefined => {
    return recommendations.find(
      r =>
        r.elevator_id === position.elevator_id &&
        r.crop === position.crop &&
        r.delivery_month === position.delivery_month
    )
  }

  const summary = useMemo(() => {
    return {
      totalPhysical: positions.reduce((sum, p) => sum + p.bushels_physical, 0),
      totalFutures: positions.reduce((sum, p) => sum + p.bushels_futures, 0),
      totalNet: positions.reduce((sum, p) => sum + p.net_position, 0),
      totalCoverageGap: positions.reduce((sum, p) => sum + (p.coverage_gap ?? 0), 0),
      totalCoverageTarget: positions.reduce((sum, p) => sum + (p.coverage_target ?? 0), 0),
      elevatorCount: new Set(positions.map(p => p.elevator_id)).size,
    }
  }, [positions])

  return { positions, recommendations, getRecommendation, summary }
}
