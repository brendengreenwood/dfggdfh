import { useQueryClient } from '@tanstack/react-query'
import { useAlerts } from '@/hooks/useAlerts'
import { AlertFeed } from '@/components/kernel/merchandising/AlertFeed'
import { ErrorBanner } from '@/components/kernel/shared/ErrorBanner'
import { Skeleton } from '@/components/ui/skeleton'

export function AlertsView() {
  const queryClient = useQueryClient()
  const { alerts, dismiss, markRead, isLoading, isError } = useAlerts()

  return (
    <div className="space-y-6" data-testid="alerts-view">
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground">
          Alerts
        </h2>
      </div>

      {isError && (
        <ErrorBanner
          message="Failed to load alerts — retrying..."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['alerts'] })}
        />
      )}

      <div className="max-w-2xl">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <AlertFeed
              alerts={alerts}
              onDismiss={dismiss}
              onRead={markRead}
            />
            {alerts.length === 0 && (
              <p className="text-sm text-muted-foreground py-12 text-center">
                No alerts
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
