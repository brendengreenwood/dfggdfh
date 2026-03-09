import express from 'express'
import cors from 'cors'
import { eq, desc, sql } from 'drizzle-orm'
import { db } from '../db'
import * as schema from '../db/schema'

const app = express()
app.use(cors())
app.use(express.json())

const VALID_OUTCOMES = ['PENDING', 'SOLD', 'NO_SALE', 'CALLBACK', 'SKIPPED'] as const

// ── USERS ──

app.get('/api/users', async (_req, res) => {
  try {
    const rows = await db.select().from(schema.users)
    res.json(rows)
  } catch (err) {
    console.error('[API] GET /api/users failed:', err)
    res.status(500).json({ error: 'Failed to fetch users' })
  }
})

// ── ELEVATORS ──

app.get('/api/elevators', async (_req, res) => {
  try {
    const rows = await db.select().from(schema.elevators)
    res.json(rows)
  } catch (err) {
    console.error('[API] GET /api/elevators failed:', err)
    res.status(500).json({ error: 'Failed to fetch elevators' })
  }
})

// ── POSITIONS ──

app.get('/api/positions', async (req, res) => {
  const userId = req.query.userId as string | undefined
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const positions = await db
      .select()
      .from(schema.positionSummary)
      .where(eq(schema.positionSummary.user_id, userId))

    // Attach elevator objects
    const elevatorIds = [...new Set(positions.map(p => p.elevator_id))]
    const elevatorRows = elevatorIds.length
      ? await db.select().from(schema.elevators)
      : []
    const elevatorMap = Object.fromEntries(elevatorRows.map(e => [e.id, e]))

    const result = positions.map(p => ({
      ...p,
      elevator: elevatorMap[p.elevator_id] || null,
    }))

    res.json(result)
  } catch (err) {
    console.error('[API] GET /api/positions failed:', err)
    res.status(500).json({ error: 'Failed to fetch positions' })
  }
})

// Get recent position changes (for changelog badges)
app.get('/api/position-changes', async (req, res) => {
  const positionId = req.query.positionId as string | undefined
  if (!positionId) return res.status(400).json({ error: 'positionId required' })

  try {
    const changes = await db
      .select()
      .from(schema.positionChanges)
      .where(eq(schema.positionChanges.position_id, positionId))
      .orderBy(desc(schema.positionChanges.created_at))
      .limit(10)

    res.json(changes)
  } catch (err) {
    console.error('[API] GET /api/position-changes failed:', err)
    res.status(500).json({ error: 'Failed to fetch position changes' })
  }
})

// ── RECOMMENDATIONS ──

app.get('/api/recommendations', async (req, res) => {
  const userId = req.query.userId as string | undefined
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const recs = await db
      .select()
      .from(schema.mlRecommendations)
      .where(eq(schema.mlRecommendations.user_id, userId))

    // Attach elevator objects
    const elevatorIds = [...new Set(recs.map(r => r.elevator_id).filter(Boolean))] as string[]
    const elevatorRows = elevatorIds.length
      ? await db.select().from(schema.elevators)
      : []
    const elevatorMap = Object.fromEntries(elevatorRows.map(e => [e.id, e]))

    const result = recs.map(r => ({
      ...r,
      elevator: r.elevator_id ? elevatorMap[r.elevator_id] || null : null,
    }))

    res.json(result)
  } catch (err) {
    console.error('[API] GET /api/recommendations failed:', err)
    res.status(500).json({ error: 'Failed to fetch recommendations' })
  }
})

// ── LEADS ──

app.get('/api/leads', async (req, res) => {
  const userId = req.query.userId as string | undefined
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const rows = await db
      .select()
      .from(schema.leads)
      .where(eq(schema.leads.assigned_to, userId))

    // Attach farmer + elevator objects
    const farmerIds = [...new Set(rows.map(l => l.farmer_id))]
    const elevatorIds = [...new Set(rows.map(l => l.elevator_id))]

    const [farmerRows, elevatorRows] = await Promise.all([
      farmerIds.length ? db.select().from(schema.farmers) : [],
      elevatorIds.length ? db.select().from(schema.elevators) : [],
    ])

    const farmerMap = Object.fromEntries(farmerRows.map(f => [f.id, f]))
    const elevatorMap = Object.fromEntries(elevatorRows.map(e => [e.id, e]))

    const result = rows.map(l => ({
      ...l,
      farmer: farmerMap[l.farmer_id] || null,
      elevator: elevatorMap[l.elevator_id] || null,
    }))

    res.json(result)
  } catch (err) {
    console.error('[API] GET /api/leads failed:', err)
    res.status(500).json({ error: 'Failed to fetch leads' })
  }
})

// Create leads from landscape selections
app.post('/api/leads', async (req, res) => {
  const { farmers: farmerSelections, elevatorId, assignedTo, crop, month, year } = req.body
  if (!Array.isArray(farmerSelections) || !farmerSelections.length) {
    return res.status(400).json({ error: 'farmers array required' })
  }
  if (!elevatorId) return res.status(400).json({ error: 'elevatorId required' })

  try {
    const weekOf = new Date().toISOString().slice(0, 10)
    const created: string[] = []

    for (const sel of farmerSelections) {
      const { farmerId, recommendedBasis, estimatedBu, originatorId } = sel
      if (!farmerId) continue

      const id = crypto.randomUUID()
      await db.insert(schema.leads).values({
        id,
        farmer_id: farmerId,
        elevator_id: elevatorId,
        assigned_to: originatorId || assignedTo || farmerId, // fallback
        ml_score: 0.5,
        crop: crop || 'CORN',
        estimated_bu: estimatedBu || 0,
        recommended_basis: recommendedBasis || null,
        outcome: 'PENDING',
        week_of: weekOf,
        is_active: true,
      })
      created.push(id)
    }

    res.json({ ok: true, created: created.length, ids: created })
  } catch (err) {
    console.error('[API] POST /api/leads failed:', err)
    res.status(500).json({ error: 'Failed to create leads' })
  }
})

app.patch('/api/leads/:id/outcome', async (req, res) => {
  const { id } = req.params
  const { outcome, basis, bu, note } = req.body

  if (!outcome || !VALID_OUTCOMES.includes(outcome)) {
    return res.status(400).json({ error: `Invalid outcome. Must be one of: ${VALID_OUTCOMES.join(', ')}` })
  }
  if (basis !== undefined && (typeof basis !== 'number' || isNaN(basis))) {
    return res.status(400).json({ error: 'basis must be a number' })
  }
  if (bu !== undefined && (typeof bu !== 'number' || isNaN(bu) || bu < 0)) {
    return res.status(400).json({ error: 'bu must be a non-negative number' })
  }

  try {
    const existing = await db.select({ id: schema.leads.id }).from(schema.leads).where(eq(schema.leads.id, id))
    if (!existing.length) return res.status(404).json({ error: 'Lead not found' })

    // Get the full lead for position update
    const [lead] = await db.select().from(schema.leads).where(eq(schema.leads.id, id))

    await db
      .update(schema.leads)
      .set({
        outcome,
        outcome_basis: basis ?? null,
        outcome_bu: bu ?? null,
        outcome_note: note ?? null,
        outcome_at: new Date().toISOString(),
      })
      .where(eq(schema.leads.id, id))

    // When a lead is SOLD, update the position_summary and record the change
    if (outcome === 'SOLD' && bu && bu > 0 && lead) {
      // Find matching position
      const positions = await db
        .select()
        .from(schema.positionSummary)
        .where(eq(schema.positionSummary.elevator_id, lead.elevator_id))

      // Match on crop (delivery_month match is optional since lead may not have month)
      const matchingPos = positions.find(p => p.crop === lead.crop) || positions[0]

      if (matchingPos) {
        const prevPhysical = matchingPos.bushels_physical
        const newPhysical = prevPhysical + bu
        const coverageBefore = matchingPos.coverage_target
          ? (prevPhysical / matchingPos.coverage_target) * 100
          : 0
        const coverageAfter = matchingPos.coverage_target
          ? (newPhysical / matchingPos.coverage_target) * 100
          : 0
        const newGap = matchingPos.coverage_target
          ? Math.max(0, matchingPos.coverage_target - newPhysical)
          : 0
        const newNet = newPhysical - matchingPos.bushels_futures

        // Update position
        await db
          .update(schema.positionSummary)
          .set({
            bushels_physical: newPhysical,
            net_position: newNet,
            coverage_gap: newGap,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.positionSummary.id, matchingPos.id))

        // Get farmer + originator names for changelog
        const [farmer] = await db.select().from(schema.farmers).where(eq(schema.farmers.id, lead.farmer_id))
        const [originator] = lead.assigned_to
          ? await db.select().from(schema.users).where(eq(schema.users.id, lead.assigned_to))
          : [null]

        // Record position change
        await db.insert(schema.positionChanges).values({
          position_id: matchingPos.id,
          lead_id: id,
          farmer_name: farmer?.name ?? 'Unknown',
          originator_name: originator?.name ?? 'Unknown',
          bushels: bu,
          basis: basis ?? null,
          coverage_before: Math.round(coverageBefore * 10) / 10,
          coverage_after: Math.round(coverageAfter * 10) / 10,
        })
      }
    }

    res.json({ ok: true })
  } catch (err) {
    console.error(`[API] PATCH /api/leads/${id}/outcome failed:`, err)
    res.status(500).json({ error: 'Failed to update lead outcome' })
  }
})

// ── ALERTS ──

app.get('/api/alerts', async (req, res) => {
  const userId = req.query.userId as string | undefined
  if (!userId) return res.status(400).json({ error: 'userId required' })

  try {
    const rows = await db
      .select()
      .from(schema.alerts)
      .where(eq(schema.alerts.user_id, userId))

    res.json(rows)
  } catch (err) {
    console.error('[API] GET /api/alerts failed:', err)
    res.status(500).json({ error: 'Failed to fetch alerts' })
  }
})

app.patch('/api/alerts/:id/read', async (req, res) => {
  const { id } = req.params

  try {
    const existing = await db.select({ id: schema.alerts.id }).from(schema.alerts).where(eq(schema.alerts.id, id))
    if (!existing.length) return res.status(404).json({ error: 'Alert not found' })

    await db
      .update(schema.alerts)
      .set({ is_read: true })
      .where(eq(schema.alerts.id, id))
    res.json({ ok: true })
  } catch (err) {
    console.error(`[API] PATCH /api/alerts/${id}/read failed:`, err)
    res.status(500).json({ error: 'Failed to mark alert as read' })
  }
})

app.patch('/api/alerts/:id/dismiss', async (req, res) => {
  const { id } = req.params

  try {
    const existing = await db.select({ id: schema.alerts.id }).from(schema.alerts).where(eq(schema.alerts.id, id))
    if (!existing.length) return res.status(404).json({ error: 'Alert not found' })

    await db
      .update(schema.alerts)
      .set({ is_read: true, acted_on: true })
      .where(eq(schema.alerts.id, id))
    res.json({ ok: true })
  } catch (err) {
    console.error(`[API] PATCH /api/alerts/${id}/dismiss failed:`, err)
    res.status(500).json({ error: 'Failed to dismiss alert' })
  }
})

// ── FARMERS ──

app.get('/api/farmers', async (_req, res) => {
  try {
    // Get farmers with originator name
    const rows = await db
      .select({
        id: schema.farmers.id,
        name: schema.farmers.name,
        phone: schema.farmers.phone,
        email: schema.farmers.email,
        salesforce_id: schema.farmers.salesforce_id,
        region: schema.farmers.region,
        lat: schema.farmers.lat,
        lng: schema.farmers.lng,
        preferred_crop: schema.farmers.preferred_crop,
        total_acres: schema.farmers.total_acres,
        notes: schema.farmers.notes,
        originator_id: schema.farmers.originator_id,
        originator_name: schema.users.name,
      })
      .from(schema.farmers)
      .leftJoin(schema.users, eq(schema.farmers.originator_id, schema.users.id))

    // Get last contact for each farmer (most recent)
    const lastContacts = await db
      .select({
        farmer_id: schema.farmerContacts.farmer_id,
        id: schema.farmerContacts.id,
        originator_id: schema.farmerContacts.originator_id,
        contact_type: schema.farmerContacts.contact_type,
        bushels_sold: schema.farmerContacts.bushels_sold,
        notes: schema.farmerContacts.notes,
        created_at: schema.farmerContacts.created_at,
      })
      .from(schema.farmerContacts)
      .orderBy(desc(schema.farmerContacts.created_at))

    // Build a map of farmer_id → most recent contact
    const lastContactMap = new Map<string, typeof lastContacts[0]>()
    for (const c of lastContacts) {
      if (!lastContactMap.has(c.farmer_id)) {
        lastContactMap.set(c.farmer_id, c)
      }
    }

    const result = rows.map(f => ({
      ...f,
      last_contact: lastContactMap.get(f.id) ?? null,
    }))

    res.json(result)
  } catch (err) {
    console.error('[API] GET /api/farmers failed:', err)
    res.status(500).json({ error: 'Failed to fetch farmers' })
  }
})

app.get('/api/farmers/:id', async (req, res) => {
  const { id } = req.params

  try {
    const rows = await db
      .select({
        id: schema.farmers.id,
        name: schema.farmers.name,
        phone: schema.farmers.phone,
        email: schema.farmers.email,
        salesforce_id: schema.farmers.salesforce_id,
        region: schema.farmers.region,
        lat: schema.farmers.lat,
        lng: schema.farmers.lng,
        preferred_crop: schema.farmers.preferred_crop,
        total_acres: schema.farmers.total_acres,
        notes: schema.farmers.notes,
        originator_id: schema.farmers.originator_id,
        originator_name: schema.users.name,
      })
      .from(schema.farmers)
      .leftJoin(schema.users, eq(schema.farmers.originator_id, schema.users.id))
      .where(eq(schema.farmers.id, id))
    if (!rows.length) return res.status(404).json({ error: 'Farmer not found' })

    // Get contact history for this farmer
    const contacts = await db
      .select()
      .from(schema.farmerContacts)
      .where(eq(schema.farmerContacts.farmer_id, id))
      .orderBy(desc(schema.farmerContacts.created_at))

    res.json({ ...rows[0], last_contact: contacts[0] ?? null, contacts })
  } catch (err) {
    console.error(`[API] GET /api/farmers/${id} failed:`, err)
    res.status(500).json({ error: 'Failed to fetch farmer' })
  }
})

export { app }

const PORT = process.env.PORT || 3001

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`)
  })
}
