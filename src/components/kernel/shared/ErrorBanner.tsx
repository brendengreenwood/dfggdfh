import { AlertTriangle, RefreshCw } from 'lucide-react'

interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="flex items-center gap-1.5 rounded border border-red-500/30 px-2.5 py-1 text-xs font-medium hover:bg-red-500/20 transition-colors"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      )}
    </div>
  )
}
