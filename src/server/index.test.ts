// @vitest-environment node
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './index'
import { db } from '../db'
import * as schema from '../db/schema'

// Known IDs from seed data
const MARCUS_ID = 'a1000000-0000-0000-0000-000000000001'
const TYLER_ID = 'a1000000-0000-0000-0000-000000000003'

describe('API Server', () => {
  // ── GET /api/users ──
  describe('GET /api/users', () => {
    it('returns all users', async () => {
      const res = await request(app).get('/api/users')
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('id')
      expect(res.body[0]).toHaveProperty('name')
      expect(res.body[0]).toHaveProperty('persona')
    })
  })

  // ── GET /api/elevators ──
  describe('GET /api/elevators', () => {
    it('returns all elevators', async () => {
      const res = await request(app).get('/api/elevators')
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('name')
    })
  })

  // ── GET /api/positions ──
  describe('GET /api/positions', () => {
    it('returns 400 without userId', async () => {
      const res = await request(app).get('/api/positions')
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('userId required')
    })

    it('returns positions for a user', async () => {
      const res = await request(app).get(`/api/positions?userId=${MARCUS_ID}`)
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('crop')
      expect(res.body[0]).toHaveProperty('delivery_month')
      expect(res.body[0]).toHaveProperty('net_position')
      expect(res.body[0]).toHaveProperty('elevator')
    })

    it('returns empty array for unknown userId', async () => {
      const res = await request(app).get('/api/positions?userId=unknown-user')
      expect(res.status).toBe(200)
      expect(res.body).toEqual([])
    })
  })

  // ── GET /api/recommendations ──
  describe('GET /api/recommendations', () => {
    it('returns 400 without userId', async () => {
      const res = await request(app).get('/api/recommendations')
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('userId required')
    })

    it('returns recommendations for a user', async () => {
      const res = await request(app).get(`/api/recommendations?userId=${MARCUS_ID}`)
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
    })
  })

  // ── GET /api/leads ──
  describe('GET /api/leads', () => {
    it('returns 400 without userId', async () => {
      const res = await request(app).get('/api/leads')
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('userId required')
    })

    it('returns leads with farmer and elevator attached', async () => {
      const res = await request(app).get(`/api/leads?userId=${TYLER_ID}`)
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('farmer')
      expect(res.body[0]).toHaveProperty('elevator')
      expect(res.body[0]).toHaveProperty('ml_score')
    })
  })

  // ── PATCH /api/leads/:id/outcome ──
  describe('PATCH /api/leads/:id/outcome', () => {
    let testLeadId: string

    beforeAll(async () => {
      const leads = await db.select({ id: schema.leads.id }).from(schema.leads).limit(1)
      testLeadId = leads[0].id
    })

    it('returns 400 without outcome', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}/outcome`)
        .send({})
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Invalid outcome')
    })

    it('returns 400 with invalid outcome', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}/outcome`)
        .send({ outcome: 'INVALID' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('Invalid outcome')
    })

    it('returns 400 with invalid basis type', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}/outcome`)
        .send({ outcome: 'SOLD', basis: 'not-a-number' })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('basis must be a number')
    })

    it('returns 400 with negative bu', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}/outcome`)
        .send({ outcome: 'SOLD', bu: -100 })
      expect(res.status).toBe(400)
      expect(res.body.error).toContain('bu must be a non-negative number')
    })

    it('returns 404 for unknown lead', async () => {
      const res = await request(app)
        .patch('/api/leads/nonexistent-id/outcome')
        .send({ outcome: 'SOLD' })
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Lead not found')
    })

    it('updates lead outcome successfully', async () => {
      const res = await request(app)
        .patch(`/api/leads/${testLeadId}/outcome`)
        .send({ outcome: 'CALLBACK', note: 'Will call back Tuesday' })
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  // ── GET /api/alerts ──
  describe('GET /api/alerts', () => {
    it('returns 400 without userId', async () => {
      const res = await request(app).get('/api/alerts')
      expect(res.status).toBe(400)
      expect(res.body.error).toBe('userId required')
    })

    it('returns alerts for a user', async () => {
      const res = await request(app).get(`/api/alerts?userId=${MARCUS_ID}`)
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('alert_type')
      expect(res.body[0]).toHaveProperty('title')
    })
  })

  // ── PATCH /api/alerts/:id/read ──
  describe('PATCH /api/alerts/:id/read', () => {
    let testAlertId: string

    beforeAll(async () => {
      const alerts = await db.select({ id: schema.alerts.id }).from(schema.alerts).limit(1)
      testAlertId = alerts[0].id
    })

    it('returns 404 for unknown alert', async () => {
      const res = await request(app).patch('/api/alerts/nonexistent-id/read')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Alert not found')
    })

    it('marks alert as read', async () => {
      const res = await request(app).patch(`/api/alerts/${testAlertId}/read`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  // ── PATCH /api/alerts/:id/dismiss ──
  describe('PATCH /api/alerts/:id/dismiss', () => {
    let testAlertId: string

    beforeAll(async () => {
      const alerts = await db.select({ id: schema.alerts.id }).from(schema.alerts).limit(1)
      testAlertId = alerts[0].id
    })

    it('returns 404 for unknown alert', async () => {
      const res = await request(app).patch('/api/alerts/nonexistent-id/dismiss')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Alert not found')
    })

    it('dismisses alert', async () => {
      const res = await request(app).patch(`/api/alerts/${testAlertId}/dismiss`)
      expect(res.status).toBe(200)
      expect(res.body.ok).toBe(true)
    })
  })

  // ── GET /api/farmers ──
  describe('GET /api/farmers', () => {
    it('returns all farmers', async () => {
      const res = await request(app).get('/api/farmers')
      expect(res.status).toBe(200)
      expect(res.body).toBeInstanceOf(Array)
      expect(res.body.length).toBeGreaterThan(0)
      expect(res.body[0]).toHaveProperty('name')
      expect(res.body[0]).toHaveProperty('total_acres')
    })
  })

  // ── GET /api/farmers/:id ──
  describe('GET /api/farmers/:id', () => {
    it('returns 404 for unknown farmer', async () => {
      const res = await request(app).get('/api/farmers/nonexistent-id')
      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Farmer not found')
    })

    it('returns a single farmer', async () => {
      const farmers = await db.select({ id: schema.farmers.id }).from(schema.farmers).limit(1)
      const res = await request(app).get(`/api/farmers/${farmers[0].id}`)
      expect(res.status).toBe(200)
      expect(res.body).toHaveProperty('name')
      expect(res.body.id).toBe(farmers[0].id)
    })
  })
})
