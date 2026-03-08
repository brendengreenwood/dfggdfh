import { cn } from '@/lib/utils'
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  FileCheck,
  Phone,
  Leaf,
} from 'lucide-react'
import type { AlertType } from '@/types/kernel'

interface AlertBadgeProps {
  type: AlertType
  className?: string
}

const alertConfig: Record<AlertType, { icon: typeof TrendingUp; label: string; color: string }> = {
  COMPETITOR_BID_MOVE: { icon: TrendingDown, label: 'Competitor', color: 'text-amber-400' },
  FUTURES_MOVE: { icon: TrendingUp, label: 'Futures', color: 'text-sky-400' },
  CROP_STRESS_EVENT: { icon: Leaf, label: 'Crop Stress', color: 'text-red-400' },
  COVERAGE_GAP: { icon: BarChart3, label: 'Coverage', color: 'text-amber-400' },
  CONTRACT_CLOSED: { icon: FileCheck, label: 'Contract', color: 'text-green-400' },
  POSITION_THRESHOLD: { icon: AlertTriangle, label: 'Position', color: 'text-red-400' },
  INBOUND_CALL: { icon: Phone, label: 'Inbound', color: 'text-green-400' },
}

export function AlertBadge({ type, className }: AlertBadgeProps) {
  const config = alertConfig[type]
  const Icon = config.icon

  return (
    <div
      className={cn('inline-flex items-center gap-1.5', config.color, className)}
      data-testid="alert-badge"
    >
      <Icon className="h-3.5 w-3.5" />
      <span className="text-xs font-semibold uppercase tracking-wider">
        {config.label}
      </span>
    </div>
  )
}
