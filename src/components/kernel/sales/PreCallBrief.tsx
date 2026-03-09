import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataValue } from '@/components/kernel/shared/DataValue'
import { CropTag } from '@/components/kernel/shared/CropTag'
import { Separator } from '@/components/ui/separator'
import { ProximityMap, computeProximity } from '@/components/kernel/strategy/ProximityMap'
import { competitorElevators } from '@/data/competitors'
import { User, MapPin, Wheat } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types/kernel'

interface PreCallBriefProps {
  lead: Lead
  className?: string
}

export function PreCallBrief({ lead, className }: PreCallBriefProps) {
  const proximity = useMemo(() => {
    if (!lead.farmer || !lead.elevator) return null
    return computeProximity(lead.farmer, [lead.elevator], competitorElevators)
  }, [lead.farmer, lead.elevator])

  const stressLevel = lead.crop_stress_score !== null
    ? lead.crop_stress_score > 0.7 ? 'High' : lead.crop_stress_score > 0.3 ? 'Moderate' : 'Low'
    : null

  const stressColor = lead.crop_stress_score !== null
    ? lead.crop_stress_score > 0.7 ? 'text-red-400' : lead.crop_stress_score > 0.3 ? 'text-amber-400' : 'text-green-400'
    : 'text-muted-foreground'

  return (
    <Card className={cn('border-l-2 border-l-amber-400', className)} data-testid="pre-call-brief">
      <CardHeader className="pb-2">
        <CardTitle>Pre-Call Brief</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Farmer context */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-zinc-300">
            <User className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium">
              {lead.farmer?.name}
            </span>
            {lead.farmer?.phone && (
              <span className="font-mono text-xs font-semibold text-zinc-500">
                {lead.farmer.phone}
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-muted-foreground">
            {lead.farmer?.total_acres && (
              <span className="font-mono text-xs font-semibold">
                {lead.farmer.total_acres.toLocaleString()} acres
              </span>
            )}
            {lead.farmer?.preferred_crop && (
              <CropTag crop={lead.farmer.preferred_crop} />
            )}
            {lead.farmer?.region && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span className="text-xs font-semibold">{lead.farmer.region}</span>
              </div>
            )}
          </div>
          {lead.farmer?.notes && (
            <p className="text-sm text-muted-foreground italic">
              "{lead.farmer.notes}"
            </p>
          )}
        </div>

        {/* Proximity mini-map */}
        {proximity && (
          <div className="rounded-md overflow-hidden border border-border">
            <ProximityMap
              farmer={lead.farmer!}
              nearestOwn={proximity.nearestOwn}
              nearestCompetitor={proximity.nearestCompetitor}
              distanceOwn={proximity.distanceOwn}
              distanceCompetitor={proximity.distanceCompetitor}
            />
            <div className="px-3 py-2 bg-secondary/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm bg-green-500" />
                <span className="text-green-400 font-medium">{proximity.distanceOwn.toFixed(1)} mi</span>
                <span className="text-muted-foreground">to {proximity.nearestOwn.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-sm bg-red-500" />
                <span className="text-red-400 font-medium">{proximity.distanceCompetitor.toFixed(1)} mi</span>
                <span className="text-muted-foreground">competitor</span>
              </div>
            </div>
            {proximity.advantage > 0 ? (
              <div className="px-3 pb-2 bg-secondary/50">
                <div className="rounded bg-green-500/10 border border-green-500/20 px-2 py-1 text-xs text-green-400 font-medium">
                  +{proximity.advantage.toFixed(1)} mi freight advantage
                </div>
              </div>
            ) : (
              <div className="px-3 pb-2 bg-secondary/50">
                <div className="rounded bg-red-500/10 border border-red-500/20 px-2 py-1 text-xs text-red-400 font-medium">
                  {proximity.advantage.toFixed(1)} mi freight disadvantage
                </div>
              </div>
            )}
          </div>
        )}

        <Separator />

        {/* Recommendation */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <DataValue
            value={lead.recommended_basis}
            format="basis"
            size="sm"
            label="Rec. Basis"
          />
          <DataValue
            value={lead.competitor_spread}
            format="basis-short"
            size="sm"
            label="Spread"
            colorize
          />
          <DataValue
            value={lead.estimated_bu}
            format="bushels"
            size="sm"
            label="Est. Volume"
          />
          {lead.distance_to_competitor_mi !== null && (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Competitor Dist.
              </span>
              <span className="font-mono text-base font-medium text-foreground">
                {lead.distance_to_competitor_mi} mi
              </span>
            </div>
          )}
        </div>

        {/* Crop stress */}
        {stressLevel && (
          <div className="flex items-center gap-2">
            <Wheat className={cn('h-4 w-4', stressColor)} />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Crop Stress
            </span>
            <span className={cn('font-mono text-xs font-semibold', stressColor)}>
              {stressLevel} ({Math.round((lead.crop_stress_score ?? 0) * 100)}%)
            </span>
          </div>
        )}

        {/* Last contact */}
        {lead.last_contact_note && (
          <div className="rounded-md bg-secondary p-2.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 block mb-1">
              Last Contact Note
            </span>
            <p className="text-sm text-zinc-300">
              {lead.last_contact_note}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
