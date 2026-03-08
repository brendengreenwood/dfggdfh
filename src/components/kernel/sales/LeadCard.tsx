import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { DataValue } from '@/components/kernel/shared/DataValue'
import { CropTag } from '@/components/kernel/shared/CropTag'
import { formatBushels } from '@/lib/format'
import { MapPin, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Lead } from '@/types/kernel'

interface LeadCardProps {
  lead: Lead
  isSelected?: boolean
  onClick?: () => void
}

export function LeadCard({ lead, isSelected, onClick }: LeadCardProps) {
  const scoreColor = lead.ml_score >= 0.8
    ? 'text-green-400'
    : lead.ml_score >= 0.6
      ? 'text-amber-400'
      : 'text-muted-foreground'

  return (
    <Card
      className={cn(
        'border-l-2 border-l-amber-500 cursor-pointer transition-all',
        isSelected && 'ring-1 ring-amber-500/50 bg-secondary'
      )}
      onClick={onClick}
      data-testid="lead-card"
    >
      <CardContent className="py-3">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Farmer info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-medium text-foreground">
                {lead.farmer?.name ?? 'Unknown'}
              </span>
              {lead.crop && <CropTag crop={lead.crop} />}
            </div>
            <div className="flex items-center gap-3 mt-1.5">
              {lead.estimated_bu && (
                <span className="font-mono text-xs font-semibold text-zinc-300">
                  ~{formatBushels(lead.estimated_bu)}
                </span>
              )}
              {lead.farmer?.total_acres && (
                <span className="text-[10px] font-medium text-zinc-500">
                  {lead.farmer.total_acres.toLocaleString()} acres
                </span>
              )}
            </div>
            {lead.last_contact_note && (
              <p className="text-xs text-zinc-500 mt-1.5 line-clamp-1">
                {lead.last_contact_note}
              </p>
            )}
          </div>

          {/* Right: Score + metrics */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase text-zinc-500">
                #{lead.ml_rank}
              </span>
              <span className={cn('font-mono text-base font-medium', scoreColor)}>
                {Math.round(lead.ml_score * 100)}
              </span>
            </div>
            {lead.competitor_spread !== null && (
              <DataValue
                value={lead.competitor_spread}
                format="basis-short"
                size="sm"
                label="Spread"
              />
            )}
            {lead.distance_to_competitor_mi !== null && (
              <div className="flex items-center gap-1 text-zinc-500">
                <MapPin className="h-3 w-3" />
                <span className="font-mono text-[10px] font-medium">
                  {lead.distance_to_competitor_mi}mi
                </span>
              </div>
            )}
            {lead.last_contact_at && (
              <div className="flex items-center gap-1 text-zinc-600">
                <Clock className="h-3 w-3" />
                <span className="font-mono text-[9px] font-medium">
                  {formatDistanceToNow(new Date(lead.last_contact_at), { addSuffix: true })}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
