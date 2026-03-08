// ── KERNEL TELEMETRY ──
// Behavioral event tracking skeleton.
// Principle #13: Instrumentation is specced before features.
// Prototype: console.log + in-memory array. Production: POST to analytics endpoint.

import type { BehavioralEvent } from '@/types/kernel'

const eventStore: BehavioralEvent[] = []
let currentUserId: string | null = null

export function setTelemetryUser(userId: string) {
  currentUserId = userId
}

export function trackEvent(
  eventType: string,
  view: string | null = null,
  metadata: Record<string, unknown> = {},
  durationMs?: number
) {
  const event: BehavioralEvent = {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    user_id: currentUserId ?? 'unknown',
    event_type: eventType,
    view,
    duration_ms: durationMs ?? null,
    metadata,
    created_at: new Date().toISOString(),
  }

  eventStore.push(event)

  if (import.meta.env.DEV) {
    console.log('[Kernel Telemetry]', event.event_type, {
      view: event.view,
      ...event.metadata,
    })
  }
}

export function getEvents(): BehavioralEvent[] {
  return [...eventStore]
}

export function clearEvents() {
  eventStore.length = 0
}

// ── Predefined event helpers ──

export function trackModeSwitch(fromView: string, toView: string) {
  trackEvent('MODE_SWITCH', fromView, { to: toView })
}

export function trackOverrideSubmitted(
  view: string,
  originalRec: number,
  postedValue: number,
  reasonCategory: string | null
) {
  trackEvent('OVERRIDE_SUBMITTED', view, {
    original_rec: originalRec,
    posted_value: postedValue,
    delta: postedValue - originalRec,
    reason_category: reasonCategory,
  })
}

export function trackLeadOutcome(
  leadId: string,
  outcome: string,
  basisPosted?: number
) {
  trackEvent('LEAD_OUTCOME_CAPTURED', 'dispatch-queue', {
    lead_id: leadId,
    outcome,
    basis_posted: basisPosted,
  })
}

export function trackAlertDismissed(alertId: string, alertType: string) {
  trackEvent('ALERT_DISMISSED', null, {
    alert_id: alertId,
    alert_type: alertType,
  })
}

export function trackInboundScreenLoaded(farmerId: string) {
  trackEvent('INBOUND_SCREEN_LOADED', 'inbound', { farmer_id: farmerId })
}
