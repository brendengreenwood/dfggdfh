import { useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCurrentUser } from './useCurrentUser'
import type { Alert } from '@/types/kernel'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  return res.json()
}

async function patchJson(url: string): Promise<void> {
  const res = await fetch(url, { method: 'PATCH' })
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
}

export function useAlerts() {
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()

  const { data: alerts = [], isLoading, isError, error } = useQuery<Alert[]>({
    queryKey: ['alerts', currentUser.id],
    queryFn: () => fetchJson(`/api/alerts?userId=${currentUser.id}`),
  })

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }, [alerts])

  const unreadCount = useMemo(() => {
    return sortedAlerts.filter(a => !a.is_read).length
  }, [sortedAlerts])

  const readMutation = useMutation({
    mutationFn: (alertId: string) => patchJson(`/api/alerts/${alertId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', currentUser.id] })
    },
  })

  const dismissMutation = useMutation({
    mutationFn: (alertId: string) => patchJson(`/api/alerts/${alertId}/dismiss`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', currentUser.id] })
    },
  })

  const markRead = useCallback((alertId: string) => {
    readMutation.mutate(alertId)
  }, [readMutation])

  const dismiss = useCallback((alertId: string) => {
    dismissMutation.mutate(alertId)
  }, [dismissMutation])

  return {
    alerts: sortedAlerts,
    unreadCount,
    markRead,
    dismiss,
    isLoading,
    isError,
    error,
  }
}
