import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { OverrideReasonCategory } from '@/types/kernel'

interface OverrideCaptureProps {
  currentBasis: number
  mlRec: number
  onSubmit: (posted: number, category: OverrideReasonCategory | null, note: string | null) => void
  onCancel: () => void
}

const reasonCategories: { value: OverrideReasonCategory; label: string }[] = [
  { value: 'FARMER_CONTEXT', label: 'Farmer Context' },
  { value: 'STORAGE_CONSTRAINT', label: 'Storage' },
  { value: 'GUT_READ', label: 'Gut Read' },
  { value: 'MARKET_READ', label: 'Market Read' },
  { value: 'RELATIONSHIP', label: 'Relationship' },
  { value: 'OTHER', label: 'Other' },
]

export function OverrideCapture({ currentBasis, mlRec, onSubmit, onCancel }: OverrideCaptureProps) {
  const [selectedCategory, setSelectedCategory] = useState<OverrideReasonCategory | null>(null)
  const [note, setNote] = useState('')

  const delta = currentBasis - mlRec
  const deltaCents = (delta * 100).toFixed(1)

  return (
    <div className="space-y-3 animate-slide-in" data-testid="override-capture">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Override Reason
        </span>
        <span className="font-mono text-[10px] font-medium text-zinc-500">
          ({deltaCents}¢ from rec)
        </span>
      </div>

      {/* Category buttons — 2-tap max */}
      <div className="flex flex-wrap gap-1.5">
        {reasonCategories.map(cat => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(
              selectedCategory === cat.value ? null : cat.value
            )}
            className={cn(
              'rounded border px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition-colors',
              selectedCategory === cat.value
                ? 'border-green-500 bg-green-500/15 text-green-400'
                : 'border-border bg-secondary text-muted-foreground hover:text-zinc-200'
            )}
            data-testid="reason-category"
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Optional note */}
      <input
        type="text"
        placeholder="Optional note..."
        value={note}
        onChange={e => setNote(e.target.value)}
        className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-600 focus:outline-none"
        data-testid="override-note"
      />

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSubmit(currentBasis, selectedCategory, note || null)}
          data-testid="override-submit"
        >
          Log Override
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  )
}
