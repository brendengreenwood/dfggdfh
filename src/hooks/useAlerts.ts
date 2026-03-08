import { useMemo, useCallback } from 'react'
import { mockStore } from '@/data/mock'
import { useCurrentUser } from './useCurrentUser'

export function useAlerts() {
  const { currentUser } = useCurrentUser()

  const alerts = useMemo(() => {
    return mockStore.alerts
      .filter(a => a.user_id === currentUser.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }, [currentUser.id])

  const unreadCount = useMemo(() => {
    return alerts.filter(a => !a.is_read).length
  }, [alerts])

  const markRead = useCallback((alertId: string) => {
    mockStore.markAlertRead(alertId)
  }, [])

  const dismiss = useCallback((alertId: string) => {
    mockStore.dismissAlert(alertId)
  }, [])

  return { alerts, unreadCount, markRead, dismiss }
}
