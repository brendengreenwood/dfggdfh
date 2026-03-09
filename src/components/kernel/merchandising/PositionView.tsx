import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { usePosition } from '@/hooks/usePosition'

import { useCurrentUser } from '@/hooks/useCurrentUser'
import { PositionTable } from './PositionTable'
import { PositionSummaryCard } from './PositionSummary'
import { ErrorBanner } from '@/components/kernel/shared/ErrorBanner'
import { Skeleton } from '@/components/ui/skeleton'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import type { CropType, DeliveryMonth } from '@/types/kernel'

const cropFilters: { value: CropType | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Crops' },
  { value: 'CORN', label: 'Corn' },
  { value: 'SOYBEANS', label: 'Soybeans' },
]

const monthFilters: { value: DeliveryMonth | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All Months' },
  { value: 'NOV', label: 'Nov' },
  { value: 'DEC', label: 'Dec' },
  { value: 'JAN', label: 'Jan' },
  { value: 'MAR', label: 'Mar' },
  { value: 'MAY', label: 'May' },
  { value: 'JUL', label: 'Jul' },
  { value: 'AUG', label: 'Aug' },
  { value: 'SEP', label: 'Sep' },
]

export function PositionView() {
  const [cropFilter, setCropFilter] = useState<CropType | 'ALL'>('ALL')
  const [elevatorFilter, setElevatorFilter] = useState<string | 'ALL'>('ALL')
  const [monthFilter, setMonthFilter] = useState<DeliveryMonth | 'ALL'>('ALL')
  const { currentUser } = useCurrentUser()
  const queryClient = useQueryClient()
  const { positions, getRecommendation, summary, userElevators, isLoading, isError } = usePosition({
    crop: cropFilter !== 'ALL' ? cropFilter : undefined,
    elevatorId: elevatorFilter !== 'ALL' ? elevatorFilter : undefined,
    deliveryMonth: monthFilter !== 'ALL' ? monthFilter : undefined,
  })

  const elevatorSelectItems = [
    { value: 'ALL', label: 'All Elevators' },
    ...userElevators.map(e => ({ value: e.id, label: e.name })),
  ]

  return (
    <div className="space-y-6" data-testid="position-view">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground">
          Position
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentUser.name} · {currentUser.region}
        </p>
      </div>

      {/* Error state */}
      {isError && (
        <ErrorBanner
          message="Failed to load positions — retrying..."
          onRetry={() => queryClient.invalidateQueries({ queryKey: ['positions'] })}
        />
      )}

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ) : (
      <>
      {/* Regional summary */}
      <PositionSummaryCard {...summary} />

      {/* Filters */}
      <div className="flex items-center gap-3">
        {/* Elevator filter */}
        <Select
          items={elevatorSelectItems}
          value={elevatorFilter}
          onValueChange={(val) => setElevatorFilter(val ?? 'ALL')}
        >
          <SelectTrigger size="sm" data-testid="elevator-filter">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {elevatorSelectItems.map(e => (
              <SelectItem key={e.value} value={e.value}>
                {e.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Crop filter */}
        <div className="flex gap-1">
          {cropFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setCropFilter(f.value)}
              className={cn(
                'rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors',
                cropFilter === f.value
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="h-4 w-px bg-border" />

        {/* Month filter */}
        <div className="flex gap-1" data-testid="month-filter">
          {monthFilters.map(f => (
            <button
              key={f.value}
              onClick={() => setMonthFilter(f.value)}
              className={cn(
                'rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors',
                monthFilter === f.value
                  ? 'border-primary bg-primary/15 text-primary'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Position table with expandable detail rows */}
      {positions.length > 0 ? (
        <PositionTable positions={positions} getRecommendation={getRecommendation} />
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          No positions for current filter
        </div>
      )}
      </>
      )}
    </div>
  )
}
