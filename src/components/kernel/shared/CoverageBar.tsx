import { cn } from '@/lib/utils'
import { coveragePct, formatBushels } from '@/lib/format'

interface CoverageBarProps {
  gap: number | null
  target: number | null
  showLabel?: boolean
  alertThreshold?: number
  className?: string
}

export function CoverageBar({
  gap,
  target,
  showLabel = true,
  alertThreshold = 80,
  className,
}: CoverageBarProps) {
  const pct = coveragePct(gap, target)
  const colorClass = pct >= alertThreshold
    ? 'text-green-400'
    : pct >= 40
      ? 'text-amber-400'
      : 'text-red-400'
  const barClass = pct >= alertThreshold
    ? 'bg-green-500'
    : pct >= 40
      ? 'bg-amber-500'
      : 'bg-red-500'

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {showLabel && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Coverage
          </span>
          <span
            className={cn('font-mono text-xs font-semibold', colorClass)}
            data-testid="coverage-pct"
          >
            {pct}%
          </span>
        </div>
      )}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            barClass,
            pct < 40 && 'animate-pulse-slow'
          )}
          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="coverage-fill"
        />
      </div>
      {showLabel && gap !== null && gap > 0 && (
        <span className="font-mono text-[10px] font-medium text-zinc-500">
          {formatBushels(gap)} gap
        </span>
      )}
    </div>
  )
}
