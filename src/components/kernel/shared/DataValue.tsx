import { cn } from '@/lib/utils'
import { formatBasis, formatBasisShort, formatBushels, basisColor } from '@/lib/format'

type DisplayFormat = 'basis' | 'basis-short' | 'bushels' | 'raw'
type DisplaySize = 'xl' | 'lg' | 'md' | 'sm'

interface DataValueProps {
  value: number | null
  format?: DisplayFormat
  size?: DisplaySize
  colorize?: boolean
  label?: string
  className?: string
}

const sizeClasses: Record<DisplaySize, string> = {
  xl: 'text-5xl font-bold',
  lg: 'text-3xl font-semibold',
  md: 'text-2xl font-semibold',
  sm: 'text-base font-medium',
}

function formatValue(value: number | null, format: DisplayFormat): string {
  switch (format) {
    case 'basis':
      return formatBasis(value)
    case 'basis-short':
      return formatBasisShort(value)
    case 'bushels':
      return formatBushels(value)
    case 'raw':
      return value === null ? '—' : String(value)
  }
}

export function DataValue({
  value,
  format = 'raw',
  size = 'md',
  colorize = false,
  label,
  className,
}: DataValueProps) {
  const colorClass = colorize ? basisColor(value) : 'text-foreground'

  return (
    <div className={cn('flex flex-col gap-0.5', className)}>
      {label && (
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
      )}
      <span
        className={cn('font-mono', sizeClasses[size], colorClass)}
        data-testid="data-value"
      >
        {formatValue(value, format)}
      </span>
    </div>
  )
}
