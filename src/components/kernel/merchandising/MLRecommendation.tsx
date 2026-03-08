import { useState } from 'react'
import { ChevronDown, ChevronUp, BrainCircuit } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { MLRecommendation as MLRecType } from '@/types/kernel'

interface MLRecommendationProps {
  recommendation: MLRecType
  className?: string
}

export function MLRecommendation({ recommendation, className }: MLRecommendationProps) {
  const [expanded, setExpanded] = useState(false)

  const confidencePct = recommendation.confidence
    ? Math.round(recommendation.confidence * 100)
    : null

  return (
    <div
      className={cn(
        'rounded-md border border-violet-700/30 bg-violet-900/10 p-3 space-y-2',
        className
      )}
      data-testid="ml-recommendation"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-3.5 w-3.5 text-violet-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400">
            ML Basis Recommendation
          </span>
          {confidencePct !== null && (
            <span className="font-mono text-[10px] font-medium text-zinc-500">
              {confidencePct}% confidence
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-500" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-500" />
        )}
      </button>

      {/* Reasoning — always visible as one line */}
      {recommendation.reasoning && (
        <p className={cn(
          'text-sm text-zinc-300',
          !expanded && 'line-clamp-1'
        )}>
          {recommendation.reasoning}
        </p>
      )}

      {/* Expanded signals */}
      {expanded && (
        <div className="space-y-1.5 pt-1 animate-fade-in">
          {recommendation.competitor_signal && (
            <SignalLine label="Competitor" text={recommendation.competitor_signal} />
          )}
          {recommendation.crop_stress_signal && (
            <SignalLine label="Crop Stress" text={recommendation.crop_stress_signal} />
          )}
          {recommendation.position_signal && (
            <SignalLine label="Position" text={recommendation.position_signal} />
          )}
          {recommendation.market_signal && (
            <SignalLine label="Market" text={recommendation.market_signal} />
          )}
        </div>
      )}
    </div>
  )
}

function SignalLine({ label, text }: { label: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 shrink-0 w-20">
        {label}
      </span>
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  )
}
