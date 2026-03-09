import { Fragment, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { CropTag } from '@/components/kernel/shared/CropTag'
import { DataValue } from '@/components/kernel/shared/DataValue'
import { CoverageBar } from '@/components/kernel/shared/CoverageBar'
import { Button } from '@/components/ui/button'
import { MLRecommendation } from './MLRecommendation'
import { OverrideCapture } from './OverrideCapture'
import { formatBushels, formatBasis, formatBasisShort, basisColor, coveragePct } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ArrowRight, ChevronDown, ChevronRight, Activity } from 'lucide-react'
import type { PositionSummary, MLRecommendation as MLRecType, PositionChange } from '@/types/kernel'
import { formatDistanceToNow } from 'date-fns'

interface PositionTableProps {
  positions: PositionSummary[]
  getRecommendation: (position: PositionSummary) => MLRecType | undefined
}

export function PositionTable({ positions, getRecommendation }: PositionTableProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
  const [changesMap, setChangesMap] = useState<Record<string, PositionChange[]>>({})
  const navigate = useNavigate()

  const toggle = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Fetch position changes for all positions (lightweight — used for badges)
  useEffect(() => {
    const fetchChanges = async () => {
      const map: Record<string, PositionChange[]> = {}
      await Promise.all(
        positions.map(async p => {
          try {
            const res = await fetch(`/api/position-changes?positionId=${p.id}`)
            if (res.ok) {
              map[p.id] = await res.json()
            }
          } catch { /* ignore */ }
        })
      )
      setChangesMap(map)
    }
    if (positions.length) fetchChanges()
  }, [positions])

  return (
    <Table data-testid="position-table">
      <TableHeader>
        <TableRow>
          <TableHead className="w-8"></TableHead>
          <TableHead>Elevator</TableHead>
          <TableHead>Crop</TableHead>
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Net</TableHead>
          <TableHead className="text-right">Physical</TableHead>
          <TableHead className="text-right">Futures</TableHead>
          <TableHead className="w-28">Coverage</TableHead>
          <TableHead className="text-right">Basis</TableHead>
          <TableHead className="text-right">ML Rec</TableHead>
          <TableHead className="text-right">Delta</TableHead>
          <TableHead className="w-10"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {positions.map(p => {
          const pct = coveragePct(p.coverage_gap, p.coverage_target)
          const barColor = pct >= 80 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500'
          const textColor = pct >= 80 ? 'text-muted-foreground' : pct >= 40 ? 'text-amber-400' : 'text-red-400'
          const isExpanded = expandedIds.has(p.id)
          const recommendation = getRecommendation(p)
          const changes = changesMap[p.id] ?? []
          const recentChanges = changes.filter(c => {
            const age = Date.now() - new Date(c.created_at).getTime()
            return age < 24 * 60 * 60 * 1000 // within 24 hours
          })

          return (
            <Fragment key={p.id}>
              <TableRow
                className="cursor-pointer"
                onClick={() => toggle(p.id)}
                data-testid="position-row"
              >
                <TableCell className="pr-0">
                  {isExpanded
                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  }
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {p.elevator?.name ?? 'Unknown'}
                    {recentChanges.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-semibold animate-pulse">
                        <Activity className="h-2.5 w-2.5" />
                        {recentChanges.length} update{recentChanges.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <CropTag crop={p.crop} />
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {p.delivery_month} {p.crop_year}
                </TableCell>
                <TableCell className="text-right font-mono font-semibold">
                  {formatBushels(p.net_position)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatBushels(p.bushels_physical)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatBushels(p.bushels_futures)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-16 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          barColor
                        )}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className={cn(
                      'text-xs font-mono',
                      textColor
                    )}>
                      {pct}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  {formatBasis(p.current_basis)}
                </TableCell>
                <TableCell className="text-right font-mono text-muted-foreground">
                  {formatBasis(p.ml_basis_rec)}
                </TableCell>
                <TableCell className={cn('text-right font-mono', basisColor(p.basis_delta))}>
                  {formatBasisShort(p.basis_delta)}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs"
                    title="View Landscape"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/strategy?elevator=${p.elevator_id}&crop=${p.crop}&month=${p.delivery_month}&year=${p.crop_year}`)
                    }}
                  >
                    View Landscape <ArrowRight className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>

              {isExpanded && (
                <TableRow data-testid="position-card">
                  <TableCell colSpan={12} className="p-0">
                    <ExpandedDetail position={p} recommendation={recommendation} changes={changes} />
                  </TableCell>
                </TableRow>
              )}
            </Fragment>
          )
        })}
      </TableBody>
    </Table>
  )
}

function ExpandedDetail({
  position,
  recommendation,
  changes,
}: {
  position: PositionSummary
  recommendation?: MLRecType
  changes: PositionChange[]
}) {
  const [showOverride, setShowOverride] = useState(false)
  const navigate = useNavigate()

  return (
    <div className="border-l-2 border-l-sky-500 bg-card/50 px-6 py-4 space-y-4">
      {/* Position breakdown */}
      <div className="flex items-center gap-8">
        <DataValue
          value={position.net_position}
          format="bushels"
          size="lg"
          label="Net Position"
        />
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
        <div className="w-48">
          <CoverageBar
            gap={position.coverage_gap}
            target={position.coverage_target}
          />
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span
            className="font-mono text-[11px] tabular-nums text-muted-foreground"
            data-testid="row-last-updated"
          >
            8 min ago
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => navigate(`/strategy?elevator=${position.elevator_id}&crop=${position.crop}&month=${position.delivery_month}&year=${position.crop_year}`)}
            data-testid="strategy-launch"
          >
            View Landscape <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Basis comparison */}
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

      {/* Position change log */}
      {changes.length > 0 && (
        <div className="border-t border-border pt-3 space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Recent Activity
          </span>
          <div className="space-y-1">
            {changes.slice(0, 5).map(c => (
              <div key={c.id} className="flex items-center gap-2 text-xs">
                <Activity className="h-3 w-3 text-green-400 flex-shrink-0" />
                <span className="text-foreground">
                  <span className="font-medium">{c.originator_name}</span>
                  {' closed '}
                  <span className="font-mono font-semibold text-green-400">
                    {(c.bushels / 1000).toFixed(0)}k bu
                  </span>
                  {c.basis != null && (
                    <span className="font-mono text-muted-foreground"> at {c.basis.toFixed(2)}</span>
                  )}
                  {' from '}
                  <span className="font-medium">{c.farmer_name}</span>
                </span>
                {c.coverage_before != null && c.coverage_after != null && (
                  <span className="font-mono text-muted-foreground">
                    ({c.coverage_before.toFixed(0)}% → {c.coverage_after.toFixed(0)}%)
                  </span>
                )}
                <span className="text-muted-foreground/60 ml-auto">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

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
              onSubmit={(_posted, _category, _note) => {
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
    </div>
  )
}
