import { describe, it, expect } from 'vitest'
import { users, elevators, positionSummaries, farmers, mlRecommendations, leads, alerts } from './mock'
import type { CropType, DeliveryMonth, PersonaType, AlertType, LeadOutcome } from '@/types/kernel'

const validCrops: CropType[] = ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS']
const validMonths: DeliveryMonth[] = ['JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV', 'DEC']
const validPersonas: PersonaType[] = ['MERCHANT', 'GOM', 'CSR', 'STRATEGIC', 'MANAGER', 'HYBRID']
const validAlertTypes: AlertType[] = ['COMPETITOR_BID_MOVE', 'FUTURES_MOVE', 'CROP_STRESS_EVENT', 'COVERAGE_GAP', 'CONTRACT_CLOSED', 'POSITION_THRESHOLD', 'INBOUND_CALL']
const validOutcomes: LeadOutcome[] = ['PENDING', 'SOLD', 'NO_SALE', 'CALLBACK', 'SKIPPED']

describe('Mock data integrity', () => {
  describe('users', () => {
    it('has at least 3 demo users', () => {
      expect(users.length).toBeGreaterThanOrEqual(3)
    })

    it('all users have valid persona types', () => {
      for (const user of users) {
        expect(validPersonas).toContain(user.persona)
      }
    })

    it('all users have unique ids', () => {
      const ids = users.map(u => u.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('all users have unique emails', () => {
      const emails = users.map(u => u.email)
      expect(new Set(emails).size).toBe(emails.length)
    })

    it('has a merchant, hybrid, and GOM for demo', () => {
      const personas = users.map(u => u.persona)
      expect(personas).toContain('MERCHANT')
      expect(personas).toContain('HYBRID')
      expect(personas).toContain('GOM')
    })
  })

  describe('elevators', () => {
    it('has at least 3 elevators', () => {
      expect(elevators.length).toBeGreaterThanOrEqual(3)
    })

    it('all elevators have unique ids', () => {
      const ids = elevators.map(e => e.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('all elevators have unique codes', () => {
      const codes = elevators.map(e => e.code)
      expect(new Set(codes).size).toBe(codes.length)
    })
  })

  describe('positionSummaries', () => {
    it('all reference valid elevators', () => {
      const elevatorIds = new Set(elevators.map(e => e.id))
      for (const ps of positionSummaries) {
        expect(elevatorIds.has(ps.elevator_id)).toBe(true)
      }
    })

    it('all reference valid users', () => {
      const userIds = new Set(users.map(u => u.id))
      for (const ps of positionSummaries) {
        expect(userIds.has(ps.user_id)).toBe(true)
      }
    })

    it('all have valid crop types', () => {
      for (const ps of positionSummaries) {
        expect(validCrops).toContain(ps.crop)
      }
    })

    it('all have valid delivery months', () => {
      for (const ps of positionSummaries) {
        expect(validMonths).toContain(ps.delivery_month)
      }
    })

    it('net_position equals physical minus futures', () => {
      for (const ps of positionSummaries) {
        expect(ps.net_position).toBe(ps.bushels_physical - ps.bushels_futures)
      }
    })

    it('coverage_gap is non-negative when set', () => {
      for (const ps of positionSummaries) {
        if (ps.coverage_gap !== null) {
          expect(ps.coverage_gap).toBeGreaterThanOrEqual(0)
        }
      }
    })

    it('embedded elevator objects match elevator_id', () => {
      for (const ps of positionSummaries) {
        if (ps.elevator) {
          expect(ps.elevator.id).toBe(ps.elevator_id)
        }
      }
    })
  })

  describe('farmers', () => {
    it('all have unique ids', () => {
      const ids = farmers.map(f => f.id)
      expect(new Set(ids).size).toBe(ids.length)
    })

    it('all have names', () => {
      for (const f of farmers) {
        expect(f.name.length).toBeGreaterThan(0)
      }
    })

    it('preferred crops are valid when set', () => {
      for (const f of farmers) {
        if (f.preferred_crop) {
          expect(validCrops).toContain(f.preferred_crop)
        }
      }
    })
  })

  describe('leads', () => {
    it('all reference valid farmers', () => {
      const farmerIds = new Set(farmers.map(f => f.id))
      for (const lead of leads) {
        expect(farmerIds.has(lead.farmer_id)).toBe(true)
      }
    })

    it('all reference valid elevators', () => {
      const elevatorIds = new Set(elevators.map(e => e.id))
      for (const lead of leads) {
        expect(elevatorIds.has(lead.elevator_id)).toBe(true)
      }
    })

    it('all reference valid users for assigned_to', () => {
      const userIds = new Set(users.map(u => u.id))
      for (const lead of leads) {
        expect(userIds.has(lead.assigned_to)).toBe(true)
      }
    })

    it('all have valid outcomes', () => {
      for (const lead of leads) {
        expect(validOutcomes).toContain(lead.outcome)
      }
    })

    it('ml_score is between 0 and 1', () => {
      for (const lead of leads) {
        expect(lead.ml_score).toBeGreaterThanOrEqual(0)
        expect(lead.ml_score).toBeLessThanOrEqual(1)
      }
    })

    it('leads are ranked by ml_score descending', () => {
      for (let i = 1; i < leads.length; i++) {
        expect(leads[i - 1].ml_score).toBeGreaterThanOrEqual(leads[i].ml_score)
      }
    })

    it('embedded farmer objects match farmer_id', () => {
      for (const lead of leads) {
        if (lead.farmer) {
          expect(lead.farmer.id).toBe(lead.farmer_id)
        }
      }
    })
  })

  describe('mlRecommendations', () => {
    it('all reference valid users', () => {
      const userIds = new Set(users.map(u => u.id))
      for (const rec of mlRecommendations) {
        if (rec.user_id) {
          expect(userIds.has(rec.user_id)).toBe(true)
        }
      }
    })

    it('all have reasoning text', () => {
      for (const rec of mlRecommendations) {
        expect(rec.reasoning).toBeTruthy()
        expect(rec.reasoning!.length).toBeGreaterThan(0)
      }
    })

    it('confidence is between 0 and 1 when set', () => {
      for (const rec of mlRecommendations) {
        if (rec.confidence !== null) {
          expect(rec.confidence).toBeGreaterThanOrEqual(0)
          expect(rec.confidence).toBeLessThanOrEqual(1)
        }
      }
    })
  })

  describe('alerts', () => {
    it('all reference valid users', () => {
      const userIds = new Set(users.map(u => u.id))
      for (const alert of alerts) {
        expect(userIds.has(alert.user_id)).toBe(true)
      }
    })

    it('all have valid alert types', () => {
      for (const alert of alerts) {
        expect(validAlertTypes).toContain(alert.alert_type)
      }
    })

    it('all have titles', () => {
      for (const alert of alerts) {
        expect(alert.title.length).toBeGreaterThan(0)
      }
    })

    it('elevator references are valid when set', () => {
      const elevatorIds = new Set(elevators.map(e => e.id))
      for (const alert of alerts) {
        if (alert.elevator_id) {
          expect(elevatorIds.has(alert.elevator_id)).toBe(true)
        }
      }
    })

    it('farmer references are valid when set', () => {
      const farmerIds = new Set(farmers.map(f => f.id))
      for (const alert of alerts) {
        if (alert.farmer_id) {
          expect(farmerIds.has(alert.farmer_id)).toBe(true)
        }
      }
    })
  })
})
