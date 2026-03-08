import { useState } from 'react'
import { usePosition } from '@/hooks/usePosition'
import { useAlerts } from '@/hooks/useAlerts'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PositionCard } from './PositionCard'
import { PositionSummaryCard } from './PositionSummary'
import { AlertFeed } from './AlertFeed'
import type { CropType } from '@/types/kernel'

const cropFilters: { value: CropType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Crops' },
  { value: 'CORN', label: 'Corn' },
  { value: 'SOYBEANS', label: 'Soybeans' },
]

export function PositionView() {
  const [cropFilter, setCropFilter] = useState<CropType | 'ALL'>('ALL')
  const { currentUser } = useCurrentUser()
  const { positions, getRecommendation, summary } = usePosition(
    cropFilter !== 'ALL' ? { crop: cropFilter } : undefined
  )
  const { alerts, dismiss, markRead } = useAlerts()

  return (
    <div className="space-y-6" data-testid="position-view">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground">
            Position
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.name} · {currentUser.region}
          </p>
        </div>

        {/* Crop filter */}
        <div className="flex gap-1">
          {cropFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setCropFilter(f.value)}
              className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                cropFilter === f.value
                  ? 'border-sky-500 bg-sky-500/15 text-sky-400'
                  : 'border-border text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Regional summary */}
      <PositionSummaryCard {...summary} />

      {/* Main grid: Position cards + Alert feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {positions.map(position => (
            <PositionCard
              key={position.id}
              position={position}
              recommendation={getRecommendation(position)}
            />
          ))}
          {positions.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              No positions for current filter
            </div>
          )}
        </div>

        {/* Alert sidebar */}
        <div className="space-y-4">
          <AlertFeed
            alerts={alerts}
            onDismiss={dismiss}
            onRead={markRead}
          />
        </div>
      </div>
    </div>
  )
}
