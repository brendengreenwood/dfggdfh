import { useState, useCallback } from 'react'
import { useLeads } from '@/hooks/useLeads'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { LeadCard } from './LeadCard'
import { PreCallBrief } from './PreCallBrief'
import { OutcomeCapture } from './OutcomeCapture'
import type { LeadOutcome } from '@/types/kernel'

export function DispatchQueue() {
  const [showAll, setShowAll] = useState(false)
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null)
  const { currentUser } = useCurrentUser()
  const { leads, captureOutcome } = useLeads({ showAll })

  const selectedLead = leads.find(l => l.id === selectedLeadId)

  const handleOutcome = useCallback(
    (outcome: LeadOutcome, data?: { basis?: number; bu?: number; note?: string }) => {
      if (selectedLeadId) {
        captureOutcome(selectedLeadId, outcome, data)
        setSelectedLeadId(null)
      }
    },
    [selectedLeadId, captureOutcome]
  )

  return (
    <div className="space-y-6" data-testid="dispatch-queue">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold uppercase tracking-wider text-foreground">
            Dispatch Queue
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {currentUser.name} · Week of Oct 14, 2025
          </p>
        </div>

        {/* Filter */}
        <div className="flex gap-1">
          <button
            onClick={() => setShowAll(false)}
            className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              !showAll
                ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                : 'border-border text-zinc-500 hover:text-zinc-300'
            }`}
          >
            Pending ({leads.filter(l => l.outcome === 'PENDING').length})
          </button>
          <button
            onClick={() => setShowAll(true)}
            className={`rounded border px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
              showAll
                ? 'border-amber-500 bg-amber-500/15 text-amber-400'
                : 'border-border text-zinc-500 hover:text-zinc-300'
            }`}
          >
            All ({leads.length})
          </button>
        </div>
      </div>

      {/* Queue layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead list */}
        <div className="space-y-2">
          {leads
            .filter(l => showAll || l.outcome === 'PENDING')
            .map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                isSelected={lead.id === selectedLeadId}
                onClick={() => setSelectedLeadId(
                  lead.id === selectedLeadId ? null : lead.id
                )}
              />
            ))}
          {leads.filter(l => showAll || l.outcome === 'PENDING').length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              Queue empty — all leads contacted
            </div>
          )}
        </div>

        {/* Pre-call brief + Outcome */}
        <div className="space-y-4">
          {selectedLead ? (
            <>
              <PreCallBrief lead={selectedLead} />
              <OutcomeCapture onSubmit={handleOutcome} />
            </>
          ) : (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border p-12 text-zinc-600">
              <p className="text-sm">Select a lead to view pre-call brief</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
