import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from './useCurrentUser'
import type { Lead, LeadOutcome } from '@/types/kernel'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  return res.json()
}

export function useLeads(filters?: { outcome?: LeadOutcome; showAll?: boolean }) {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: allLeads = [], isLoading, isError, error } = useQuery<Lead[]>({
    queryKey: ['leads', currentUser.id],
    queryFn: () => fetchJson(`/api/leads?userId=${currentUser.id}`),
  })

  const outcomeMutation = useMutation({
    mutationFn: async ({ leadId, outcome, data }: {
      leadId: string
      outcome: LeadOutcome
      data?: { basis?: number; bu?: number; note?: string }
    }) => {
      const res = await fetch(`/api/leads/${leadId}/outcome`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outcome, ...data }),
      })
      if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads', currentUser.id] })
    },
  })

  const leads = useMemo(() => {
    let result = allLeads
    if (filters?.outcome && !filters?.showAll) {
      result = result.filter(l => l.outcome === filters.outcome)
    }
    return result.sort((a, b) => (a.ml_rank ?? 999) - (b.ml_rank ?? 999))
  }, [allLeads, filters?.outcome, filters?.showAll])

  const captureOutcome = useCallback(
    (leadId: string, outcome: Lead['outcome'], data?: { basis?: number; bu?: number; note?: string }) => {
      outcomeMutation.mutate({ leadId, outcome, data })
    },
    [outcomeMutation]
  )

  const getLeadByFarmerId = useCallback(
    (farmerId: string): Lead | undefined => {
      return allLeads.find(l => l.farmer_id === farmerId)
    },
    [allLeads]
  )

  return {
    leads,
    captureOutcome,
    getLeadByFarmerId,
    isLoading,
    isError,
    error,
    isSaving: outcomeMutation.isPending,
    saveError: outcomeMutation.error,
  }
}
