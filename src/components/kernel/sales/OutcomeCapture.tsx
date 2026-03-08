import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, PhoneForwarded, SkipForward } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LeadOutcome } from '@/types/kernel'

interface OutcomeCaptureProps {
  onSubmit: (outcome: LeadOutcome, data?: { basis?: number; bu?: number; note?: string }) => void
  className?: string
}

const outcomes: { value: LeadOutcome; label: string; icon: typeof Check; color: string }[] = [
  { value: 'SOLD', label: 'Sold', icon: Check, color: 'bg-green-500 hover:bg-green-400' },
  { value: 'NO_SALE', label: 'No Sale', icon: X, color: 'bg-red-400/80 hover:bg-red-400' },
  { value: 'CALLBACK', label: 'Callback', icon: PhoneForwarded, color: 'bg-amber-500 hover:bg-amber-400' },
  { value: 'SKIPPED', label: 'Skip', icon: SkipForward, color: 'bg-stone-600 hover:bg-stone-500' },
]

export function OutcomeCapture({ onSubmit, className }: OutcomeCaptureProps) {
  const [selected, setSelected] = useState<LeadOutcome | null>(null)
  const [basis, setBasis] = useState('')
  const [bu, setBu] = useState('')
  const [note, setNote] = useState('')

  const handleSubmit = () => {
    if (!selected) return
    onSubmit(selected, {
      basis: basis ? parseFloat(basis) / 100 : undefined,
      bu: bu ? parseInt(bu, 10) : undefined,
      note: note || undefined,
    })
  }

  return (
    <div className={cn('space-y-3', className)} data-testid="outcome-capture">
      {/* Outcome buttons */}
      <div className="flex gap-2">
        {outcomes.map(o => {
          const Icon = o.icon
          return (
            <button
              key={o.value}
              onClick={() => setSelected(selected === o.value ? null : o.value)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wider text-white transition-colors',
                selected === o.value ? o.color : 'bg-secondary text-muted-foreground hover:text-zinc-200'
              )}
              data-testid={`outcome-${o.value.toLowerCase()}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {o.label}
            </button>
          )
        })}
      </div>

      {/* Sold details */}
      {selected === 'SOLD' && (
        <div className="flex gap-3 animate-slide-in">
          <div className="flex-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 block">
              Basis (¢)
            </label>
            <input
              type="number"
              placeholder="-14"
              value={basis}
              onChange={e => setBasis(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-600 focus:outline-none"
              data-testid="outcome-basis"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-medium uppercase tracking-wider text-zinc-500 mb-1 block">
              Bushels
            </label>
            <input
              type="number"
              placeholder="50000"
              value={bu}
              onChange={e => setBu(e.target.value)}
              className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 font-mono text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-600 focus:outline-none"
              data-testid="outcome-bushels"
            />
          </div>
        </div>
      )}

      {/* Note + submit */}
      {selected && (
        <div className="space-y-2 animate-slide-in">
          <input
            type="text"
            placeholder="Note (optional)..."
            value={note}
            onChange={e => setNote(e.target.value)}
            className="w-full rounded-md border border-border bg-secondary px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 focus:border-green-600 focus:outline-none"
            data-testid="outcome-note"
          />
          <Button size="sm" onClick={handleSubmit} data-testid="outcome-submit">
            Confirm {selected.replace('_', ' ')}
          </Button>
        </div>
      )}
    </div>
  )
}
