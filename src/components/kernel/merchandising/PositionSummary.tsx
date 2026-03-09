import { Card, CardContent } from '@/components/ui/card'
import { DataValue } from '@/components/kernel/shared/DataValue'
import { CoverageBar } from '@/components/kernel/shared/CoverageBar'

interface PositionSummaryProps {
  totalPhysical: number
  totalFutures: number
  totalNet: number
  totalCoverageGap: number
  totalCoverageTarget: number
  elevatorCount: number
  lastUpdated: string | null
}

export function PositionSummaryCard({
  totalPhysical,
  totalFutures,
  totalNet,
  totalCoverageGap,
  totalCoverageTarget,
  elevatorCount,
}: PositionSummaryProps) {
  return (
    <Card className="border-l-2 border-l-green-500" data-testid="position-summary">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <DataValue
              value={totalNet}
              format="bushels"
              size="lg"
              label="Total Net Position"
            />
            <DataValue
              value={totalPhysical}
              format="bushels"
              size="sm"
              label="Physical"
            />
            <DataValue
              value={totalFutures}
              format="bushels"
              size="sm"
              label="Futures"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Elevators
              </span>
              <span className="font-mono text-base font-medium text-foreground">
                {elevatorCount}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="w-48">
              <CoverageBar
                gap={totalCoverageGap}
                target={totalCoverageTarget}
              />
            </div>
            <span
              className="font-mono text-[11px] tabular-nums text-muted-foreground"
              data-testid="last-updated"
            >
              8 min ago
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
