import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Check, X as XIcon, PhoneForwarded, ArrowLeft } from 'lucide-react'
import { DataValue } from '@/components/kernel/shared/DataValue'
import { Skeleton } from '@/components/ui/skeleton'
import { useLeads } from '@/hooks/useLeads'
import type { Farmer, MLRecommendation, LeadOutcome } from '@/types/kernel'

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${res.status}: ${res.statusText}`)
  return res.json()
}

export function InboundScreen() {
  const { farmerId } = useParams<{ farmerId: string }>()
  const navigate = useNavigate()
  const { getLeadByFarmerId, captureOutcome } = useLeads()

  const { data: farmer, isLoading: farmerLoading, isError: farmerError } = useQuery<Farmer>({
    queryKey: ['farmer', farmerId],
    queryFn: () => fetchJson(`/api/farmers/${farmerId}`),
    enabled: !!farmerId,
  })

  const lead = farmerId ? getLeadByFarmerId(farmerId) : undefined

  const { data: recommendations = [] } = useQuery<MLRecommendation[]>({
    queryKey: ['recommendations-inbound', lead?.assigned_to],
    queryFn: () => fetchJson(`/api/recommendations?userId=${lead?.assigned_to}`),
    enabled: !!lead?.assigned_to,
  })

  const recommendation = recommendations.find(r =>
    r.elevator_id === lead?.elevator_id &&
    r.crop === lead?.crop
  )

  if (farmerLoading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
        <Skeleton className="h-16 w-64 mb-4" />
        <Skeleton className="h-8 w-48 mb-8" />
        <Skeleton className="h-24 w-32" />
      </div>
    )
  }

  if (farmerError || !farmer) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <p className="text-zinc-500">Farmer not found</p>
          <button
            onClick={() => navigate('/sales')}
            className="text-xs text-zinc-600 hover:text-zinc-400 underline"
          >
            Back to Sales
          </button>
        </div>
      </div>
    )
  }

  const handleOutcome = (outcome: LeadOutcome) => {
    if (lead) {
      captureOutcome(lead.id, outcome)
    }
    navigate('/sales')
  }

  const recBasis = lead?.recommended_basis ?? recommendation?.recommended_value ?? null
  const lastNote = lead?.last_contact_note ?? farmer.notes

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      data-testid="inbound-screen"
    >
      {/* Back button — minimal chrome */}
      <div className="p-4">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center gap-1 text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Back</span>
        </button>
      </div>

      {/* Main content — centered, high contrast */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-12">
        {/* Farmer name — LARGE */}
        <h1
          className="font-sans text-5xl md:text-7xl uppercase tracking-wider text-foreground mb-2"
          data-testid="inbound-farmer-name"
        >
          {farmer.name}
        </h1>

        {/* Phone */}
        {farmer.phone && (
          <p className="font-mono text-base font-medium text-muted-foreground mb-8">
            {farmer.phone}
          </p>
        )}

        {/* Recommended basis — VERY LARGE */}
        <div className="mb-4">
          <span className="text-xs font-semibold uppercase tracking-widest text-amber-400 block text-center mb-2">
            Recommended Basis
          </span>
          <div className="text-center" data-testid="inbound-basis">
            <DataValue
              value={recBasis}
              format="basis"
              size="xl"
            />
          </div>
        </div>

        {/* One-line reasoning */}
        {recommendation?.reasoning && (
          <p className="text-sm text-muted-foreground max-w-lg text-center mb-6 line-clamp-2">
            {recommendation.reasoning}
          </p>
        )}

        {/* Competitor spread */}
        {lead?.competitor_spread !== null && lead?.competitor_spread !== undefined && (
          <div className="flex items-center gap-4 mb-6">
            <DataValue
              value={lead.competitor_spread}
              format="basis-short"
              size="sm"
              label="Competitor Spread"
              colorize
            />
            {lead.distance_to_competitor_mi !== null && (
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Distance
                </span>
                <span className="font-mono text-base font-medium text-foreground">
                  {lead.distance_to_competitor_mi} mi
                </span>
              </div>
            )}
          </div>
        )}

        {/* Last contact note */}
        {lastNote && (
          <p className="text-xs text-zinc-500 max-w-md text-center mb-10 italic">
            "{lastNote}"
          </p>
        )}

        {/* Action buttons — three choices, clear and large */}
        <div className="flex gap-4">
          <Button
            size="lg"
            className="bg-green-500 hover:bg-green-400 text-white px-8 py-6 text-lg"
            onClick={() => handleOutcome('SOLD')}
            data-testid="inbound-sold"
          >
            <Check className="h-5 w-5 mr-2" />
            Sold
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="border-stone-600 text-zinc-300 hover:bg-secondary px-8 py-6 text-lg"
            onClick={() => handleOutcome('NO_SALE')}
            data-testid="inbound-no-sale"
          >
            <XIcon className="h-5 w-5 mr-2" />
            No Sale
          </Button>
          <Button
            size="lg"
            className="bg-amber-500 hover:bg-amber-400 text-white px-8 py-6 text-lg"
            onClick={() => handleOutcome('CALLBACK')}
            data-testid="inbound-callback"
          >
            <PhoneForwarded className="h-5 w-5 mr-2" />
            Callback
          </Button>
        </div>
      </div>

      {/* Amber accent at bottom */}
      <div className="h-0.5 bg-amber-500" />
    </div>
  )
}
