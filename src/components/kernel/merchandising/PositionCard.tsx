import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataValue } from '@/components/kernel/shared/DataValue'
import { CoverageBar } from '@/components/kernel/shared/CoverageBar'
import { CropTag } from '@/components/kernel/shared/CropTag'
import { MLRecommendation } from './MLRecommendation'
import { OverrideCapture } from './OverrideCapture'
import { cn } from '@/lib/utils'
import type { PositionSummary, MLRecommendation as MLRecType } from '@/types/kernel'

interface PositionCardProps {
  position: PositionSummary
  recommendation?: MLRecType
  onOverride?: (posted: number, reason?: string, category?: string) => void
}

export function PositionCard({ position, recommendation, onOverride }: PositionCardProps) {
  const [showOverride, setShowOverride] = useState(false)

  const isAlertState = (position.coverage_gap ?? 0) > 0 &&
    position.coverage_target &&
    ((position.coverage_gap ?? 0) / position.coverage_target) > 0.2

  return (
    <Card
      className={cn(
        'border-l-2 border-l-sky-500 transition-shadow',
        isAlertState && ''
      )}
      data-testid="position-card"
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>
            {position.elevator?.name ?? 'Unknown Elevator'}
          </CardTitle>
          <div className="flex items-center gap-2">
            <CropTag crop={position.crop} />
            <span className="font-mono text-xs font-semibold text-muted-foreground">
              {position.delivery_month} {position.crop_year}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Net Position — large center display */}
        <div className="flex items-center justify-between">
          <DataValue
            value={position.net_position}
            format="bushels"
            size="lg"
            label="Net Position"
          />
          <div className="text-right space-y-1">
            <div className="flex gap-4">
              <DataValue
                value={position.bushels_physical}
                format="bushels"
                size="sm"
                label="Physical"
              />
              <DataValue
                value={position.bushels_futures}
                format="bushels"
                size="sm"
                label="Futures"
              />
            </div>
          </div>
        </div>

        {/* Coverage bar */}
        <CoverageBar
          gap={position.coverage_gap}
          target={position.coverage_target}
        />

        {/* Basis: Current vs ML Recommendation */}
        <div className="flex items-end gap-6 border-t border-border pt-3">
          <DataValue
            value={position.current_basis}
            format="basis"
            size="sm"
            label="Current Basis"
          />
          <DataValue
            value={position.ml_basis_rec}
            format="basis"
            size="sm"
            label="ML Recommendation"
          />
          <DataValue
            value={position.basis_delta}
            format="basis-short"
            size="sm"
            label="Delta"
            colorize
          />
        </div>

        {/* ML Recommendation detail */}
        {recommendation && (
          <MLRecommendation recommendation={recommendation} />
        )}

        {/* Override capture */}
        {position.basis_delta !== null && Math.abs(position.basis_delta) > 0.005 && (
          <div className="border-t border-border pt-3">
            {showOverride ? (
              <OverrideCapture
                currentBasis={position.current_basis ?? 0}
                mlRec={position.ml_basis_rec ?? 0}
                onSubmit={(posted, category, note) => {
                  onOverride?.(posted, note ?? undefined, category ?? undefined)
                  setShowOverride(false)
                }}
                onCancel={() => setShowOverride(false)}
              />
            ) : (
              <button
                onClick={() => setShowOverride(true)}
                className="text-xs font-semibold uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Bid differs from recommendation — log reason →
              </button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
