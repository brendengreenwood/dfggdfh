import { describe, it, expect, beforeEach } from 'vitest'
import {
  setTelemetryUser,
  trackEvent,
  getEvents,
  clearEvents,
  trackModeSwitch,
  trackOverrideSubmitted,
  trackLeadOutcome,
  trackAlertDismissed,
  trackInboundScreenLoaded,
} from './telemetry'

describe('telemetry', () => {
  beforeEach(() => {
    clearEvents()
  })

  describe('trackEvent', () => {
    it('adds event to store with correct shape', () => {
      trackEvent('TEST_EVENT', 'test-view', { key: 'value' })
      const events = getEvents()
      expect(events).toHaveLength(1)

      const event = events[0]
      expect(event.id).toMatch(/^evt-/)
      expect(event.user_id).toBeDefined()
      expect(event.event_type).toBe('TEST_EVENT')
      expect(event.view).toBe('test-view')
      expect(event.metadata).toEqual({ key: 'value' })
      expect(event.created_at).toBeDefined()
    })

    it('defaults view to null and metadata to empty object', () => {
      trackEvent('SIMPLE_EVENT')
      const event = getEvents()[0]
      expect(event.view).toBeNull()
      expect(event.metadata).toEqual({})
    })
  })

  describe('setTelemetryUser', () => {
    it('sets the user_id on subsequent events', () => {
      setTelemetryUser('user-123')
      trackEvent('TEST_EVENT')
      const event = getEvents()[0]
      expect(event.user_id).toBe('user-123')
    })
  })

  describe('getEvents', () => {
    it('returns a copy of events', () => {
      trackEvent('EVENT_1')
      trackEvent('EVENT_2')
      const events = getEvents()
      expect(events).toHaveLength(2)

      // Mutating the returned array should not affect the store
      events.pop()
      expect(getEvents()).toHaveLength(2)
    })
  })

  describe('clearEvents', () => {
    it('empties the store', () => {
      trackEvent('EVENT_1')
      trackEvent('EVENT_2')
      expect(getEvents()).toHaveLength(2)

      clearEvents()
      expect(getEvents()).toHaveLength(0)
    })
  })

  describe('trackModeSwitch', () => {
    it('records MODE_SWITCH event with from/to views', () => {
      trackModeSwitch('position-grid', 'dispatch-queue')
      const event = getEvents()[0]
      expect(event.event_type).toBe('MODE_SWITCH')
      expect(event.view).toBe('position-grid')
      expect(event.metadata).toEqual({ to: 'dispatch-queue' })
    })
  })

  describe('trackOverrideSubmitted', () => {
    it('records correct metadata', () => {
      trackOverrideSubmitted('position-grid', -0.14, -0.10, 'FARMER_CONTEXT')
      const event = getEvents()[0]
      expect(event.event_type).toBe('OVERRIDE_SUBMITTED')
      expect(event.view).toBe('position-grid')
      expect(event.metadata).toEqual({
        original_rec: -0.14,
        posted_value: -0.10,
        delta: -0.10 - (-0.14),
        reason_category: 'FARMER_CONTEXT',
      })
    })

    it('handles null reason_category', () => {
      trackOverrideSubmitted('position-grid', -0.14, -0.10, null)
      const event = getEvents()[0]
      expect(event.metadata).toHaveProperty('reason_category', null)
    })
  })

  describe('trackLeadOutcome', () => {
    it('records lead_id and outcome', () => {
      trackLeadOutcome('lead-456', 'SOLD', -0.12)
      const event = getEvents()[0]
      expect(event.event_type).toBe('LEAD_OUTCOME_CAPTURED')
      expect(event.view).toBe('dispatch-queue')
      expect(event.metadata).toEqual({
        lead_id: 'lead-456',
        outcome: 'SOLD',
        basis_posted: -0.12,
      })
    })

    it('records without basis_posted when not provided', () => {
      trackLeadOutcome('lead-789', 'NO_SALE')
      const event = getEvents()[0]
      expect(event.metadata).toHaveProperty('lead_id', 'lead-789')
      expect(event.metadata).toHaveProperty('outcome', 'NO_SALE')
      expect(event.metadata).toHaveProperty('basis_posted', undefined)
    })
  })

  describe('trackAlertDismissed', () => {
    it('records alert_id and alert_type', () => {
      trackAlertDismissed('alert-001', 'COMPETITOR_BID_MOVE')
      const event = getEvents()[0]
      expect(event.event_type).toBe('ALERT_DISMISSED')
      expect(event.view).toBeNull()
      expect(event.metadata).toEqual({
        alert_id: 'alert-001',
        alert_type: 'COMPETITOR_BID_MOVE',
      })
    })
  })

  describe('trackInboundScreenLoaded', () => {
    it('records farmer_id', () => {
      trackInboundScreenLoaded('farmer-321')
      const event = getEvents()[0]
      expect(event.event_type).toBe('INBOUND_SCREEN_LOADED')
      expect(event.view).toBe('inbound')
      expect(event.metadata).toEqual({ farmer_id: 'farmer-321' })
    })
  })
})
