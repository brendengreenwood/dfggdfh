import { formatDistanceToNow } from 'date-fns'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AlertBadge } from '@/components/kernel/shared/AlertBadge'
import type { Alert } from '@/types/kernel'

interface AlertFeedProps {
  alerts: Alert[]
  onDismiss?: (alertId: string) => void
  onRead?: (alertId: string) => void
}

export function AlertFeed({ alerts, onDismiss, onRead }: AlertFeedProps) {
  if (alerts.length === 0) return null

  return (
    <div className="space-y-2" data-testid="alert-feed">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Alerts
      </h3>
      <div className="space-y-1.5">
        {alerts.map(alert => (
          <div
            key={alert.id}
            className={cn(
              'group flex items-start gap-3 rounded-md border border-border bg-card p-3 transition-colors',
              !alert.is_read && 'border-l-2 border-l-amber-500'
            )}
            onClick={() => !alert.is_read && onRead?.(alert.id)}
            data-testid="alert-item"
          >
            <AlertBadge type={alert.alert_type} />
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-sm',
                alert.is_read ? 'text-muted-foreground' : 'text-zinc-200'
              )}>
                {alert.title}
              </p>
              {alert.body && !alert.is_read && (
                <p className="text-xs text-zinc-500 mt-0.5 line-clamp-2">
                  {alert.body}
                </p>
              )}
              <span className="font-mono text-[9px] font-medium text-zinc-600 mt-1 block">
                {formatDistanceToNow(new Date(alert.created_at), { addSuffix: true })}
              </span>
            </div>
            <button
              onClick={e => {
                e.stopPropagation()
                onDismiss?.(alert.id)
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3.5 w-3.5 text-zinc-600 hover:text-zinc-300" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
