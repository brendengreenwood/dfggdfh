import { useMemo, useCallback } from 'react'
import { mockStore } from '@/data/mock'
import { useCurrentUser } from './useCurrentUser'
import type { Lead, LeadOutcome } from '@/types/kernel'

export function useLeads(filters?: { outcome?: LeadOutcome; showAll?: boolean }) {
  const { currentUser } = useCurrentUser()

  const leads = useMemo(() => {
    let result = mockStore.leads.filter(l => l.assigned_to === currentUser.id)
    if (filters?.outcome && !filters?.showAll) {
      result = result.filter(l => l.outcome === filters.outcome)
    }
    // Sort by ml_rank (ascending) — rank 1 is highest priority
    return result.sort((a, b) => (a.ml_rank ?? 999) - (b.ml_rank ?? 999))
  }, [currentUser.id, filters?.outcome, filters?.showAll])

  const captureOutcome = useCallback(
    (leadId: string, outcome: Lead['outcome'], data?: { basis?: number; bu?: number; note?: string }) => {
      mockStore.updateLeadOutcome(leadId, outcome, data)
    },
    []
  )

  const getLeadByFarmerId = useCallback(
    (farmerId: string): Lead | undefined => {
      return mockStore.leads.find(l => l.farmer_id === farmerId && l.assigned_to === currentUser.id)
    },
    [currentUser.id]
  )

  return { leads, captureOutcome, getLeadByFarmerId }
}
