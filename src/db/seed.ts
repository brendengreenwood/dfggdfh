import { drizzle } from 'drizzle-orm/better-sqlite3'
import Database from 'better-sqlite3'
import * as schema from './schema'
import { generatedFarmers } from '../data/generated-farmers'

const sqlite = new Database('./kernel.db')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

// Deterministic UUIDs for entities that had non-UUID ids in mock data
const PS_IDS: Record<string, string> = {}
for (let i = 1; i <= 37; i++) {
  PS_IDS[`ps-${String(i).padStart(3, '0')}`] = `d1000000-0000-0000-0000-${String(i).padStart(12, '0')}`
}

const ML_IDS = {
  'ml-001': 'e1000000-0000-0000-0000-000000000001',
  'ml-002': 'e1000000-0000-0000-0000-000000000002',
  'ml-003': 'e1000000-0000-0000-0000-000000000003',
  'ml-004': 'e1000000-0000-0000-0000-000000000004',
} as const

const LEAD_IDS = {
  'lead-001': 'f1000000-0000-0000-0000-000000000001',
  'lead-002': 'f1000000-0000-0000-0000-000000000002',
  'lead-003': 'f1000000-0000-0000-0000-000000000003',
  'lead-004': 'f1000000-0000-0000-0000-000000000004',
  'lead-005': 'f1000000-0000-0000-0000-000000000005',
  'lead-006': 'f1000000-0000-0000-0000-000000000006',
  'lead-007': 'f1000000-0000-0000-0000-000000000007',
  'lead-008': 'f1000000-0000-0000-0000-000000000008',
} as const

const ALERT_IDS = {
  'alert-001': 'aa100000-0000-0000-0000-000000000001',
  'alert-002': 'aa100000-0000-0000-0000-000000000002',
  'alert-003': 'aa100000-0000-0000-0000-000000000003',
  'alert-004': 'aa100000-0000-0000-0000-000000000004',
  'alert-005': 'aa100000-0000-0000-0000-000000000005',
  'alert-006': 'aa100000-0000-0000-0000-000000000006',
} as const

function seed() {
  console.log('Seeding database...')

  // Clear tables in reverse dependency order
  db.delete(schema.feedbackResponses).run()
  db.delete(schema.behavioralEvents).run()
  db.delete(schema.mlOverrides).run()
  db.delete(schema.alerts).run()
  db.delete(schema.positionChanges).run()
  db.delete(schema.leads).run()
  db.delete(schema.mlRecommendations).run()
  db.delete(schema.farmerContacts).run()
  db.delete(schema.contracts).run()
  db.delete(schema.positionSummary).run()
  db.delete(schema.farmers).run()
  db.delete(schema.elevators).run()
  db.delete(schema.users).run()

  console.log('Cleared existing data')

  // ── USERS ──
  db.insert(schema.users).values([
    { id: 'a1000000-0000-0000-0000-000000000001', name: 'Marcus Webb', email: 'mwebb@cargill.com', persona: 'MERCHANT', region: 'Iowa Central' },
    { id: 'a1000000-0000-0000-0000-000000000002', name: 'Dana Kowalski', email: 'dkowalski@cargill.com', persona: 'HYBRID', region: 'Iowa Southwest' },
    { id: 'a1000000-0000-0000-0000-000000000003', name: 'Tyler Briggs', email: 'tbriggs@cargill.com', persona: 'GOM', region: 'Iowa Southwest' },
    { id: 'a1000000-0000-0000-0000-000000000004', name: 'Sarah Chen', email: 'schen@cargill.com', persona: 'CSR', region: 'Iowa Southwest' },
    { id: 'a1000000-0000-0000-0000-000000000005', name: 'Jim Harrington', email: 'jharrington@cargill.com', persona: 'MANAGER', region: 'Iowa Region' },
    // Originators — field reps who call farmers
    { id: 'a1000000-0000-0000-0000-000000000010', name: 'Jake Morrison', email: 'jmorrison@cargill.com', persona: 'ORIGINATOR', region: 'Iowa Central' },
    { id: 'a1000000-0000-0000-0000-000000000011', name: 'Lisa Tran', email: 'ltran@cargill.com', persona: 'ORIGINATOR', region: 'Iowa Central' },
    { id: 'a1000000-0000-0000-0000-000000000012', name: 'Mike Sorensen', email: 'msorensen@cargill.com', persona: 'ORIGINATOR', region: 'Iowa Central' },
    // Southwest originators
    { id: 'a1000000-0000-0000-0000-000000000013', name: 'Sarah Brandt', email: 'sbrandt@cargill.com', persona: 'ORIGINATOR', region: 'Iowa Southwest' },
    { id: 'a1000000-0000-0000-0000-000000000014', name: 'Tom Rasmussen', email: 'trasmussen@cargill.com', persona: 'ORIGINATOR', region: 'Iowa Southwest' },
    { id: 'a1000000-0000-0000-0000-000000000015', name: 'Amy Lindgren', email: 'alindgren@cargill.com', persona: 'ORIGINATOR', region: 'Iowa Southwest' },
  ]).run()
  console.log('Seeded 11 users')

  // ── ELEVATORS ──
  db.insert(schema.elevators).values([
    { id: 'b1000000-0000-0000-0000-000000000001', name: 'Ames Main', code: 'AME', region: 'Iowa Central', lat: 41.99, lng: -93.62, capacity_bu: 2500000 },
    { id: 'b1000000-0000-0000-0000-000000000002', name: 'Nevada Terminal', code: 'NEV', region: 'Iowa Central', lat: 42.02, lng: -93.45, capacity_bu: 1800000 },
    { id: 'b1000000-0000-0000-0000-000000000003', name: 'Atlantic Main', code: 'ATL', region: 'Iowa Southwest', lat: 41.40, lng: -95.01, capacity_bu: 3200000 },
    { id: 'b1000000-0000-0000-0000-000000000004', name: 'Harlan Station', code: 'HAR', region: 'Iowa Southwest', lat: 41.65, lng: -95.33, capacity_bu: 1400000 },
    { id: 'b1000000-0000-0000-0000-000000000005', name: 'Red Oak Depot', code: 'ROK', region: 'Iowa Southwest', lat: 41.00, lng: -95.23, capacity_bu: 900000 },
  ]).run()
  console.log('Seeded 5 elevators')

  // ── FARMERS ──
  db.insert(schema.farmers).values([
    { id: 'c1000000-0000-0000-0000-000000000001', name: 'Harold Johnson', phone: '515-555-0101', region: 'Iowa Southwest', lat: 41.52, lng: -95.18, preferred_crop: 'CORN', total_acres: 1200, notes: 'Reliable seller, prefers early October delivery. Cash flow sensitive.', originator_id: 'a1000000-0000-0000-0000-000000000010' },
    { id: 'c1000000-0000-0000-0000-000000000002', name: 'Linda Petersen', phone: '515-555-0102', region: 'Iowa Southwest', lat: 41.38, lng: -95.44, preferred_crop: 'SOYBEANS', total_acres: 800, notes: 'Watches basis closely. Will hold if spread is unfavorable. Call Tuesdays.', originator_id: 'a1000000-0000-0000-0000-000000000011' },
    { id: 'c1000000-0000-0000-0000-000000000003', name: 'Bob Schroeder', phone: '712-555-0103', region: 'Iowa Southwest', lat: 41.71, lng: -95.29, preferred_crop: 'CORN', total_acres: 2400, notes: 'Large operation. Strategic account potential. Price sensitive on corn.', originator_id: 'a1000000-0000-0000-0000-000000000010' },
    { id: 'c1000000-0000-0000-0000-000000000004', name: 'Marie Gutierrez', phone: '712-555-0104', region: 'Iowa Southwest', lat: 41.44, lng: -95.05, preferred_crop: 'CORN', total_acres: 650, notes: 'New relationship. First sale last year. Building trust.', originator_id: 'a1000000-0000-0000-0000-000000000012' },
    { id: 'c1000000-0000-0000-0000-000000000005', name: 'Tom Lindquist', phone: '515-555-0105', region: 'Iowa Central', lat: 42.11, lng: -93.58, preferred_crop: 'SOYBEANS', total_acres: 1800, notes: 'Prefers evening calls. Sells in tranches, not all at once.', originator_id: 'a1000000-0000-0000-0000-000000000011' },
    { id: 'c1000000-0000-0000-0000-000000000006', name: 'Gary Novak', phone: '515-555-0106', region: 'Iowa Central', lat: 41.95, lng: -93.71, preferred_crop: 'CORN', total_acres: 980, notes: 'Drought stress visible in northeast fields per satellite. Motivated seller.', originator_id: 'a1000000-0000-0000-0000-000000000010' },
    { id: 'c1000000-0000-0000-0000-000000000007', name: 'Diane Olson', phone: '712-555-0107', region: 'Iowa Southwest', lat: 41.58, lng: -95.38, preferred_crop: 'CORN', total_acres: 1450, notes: 'Has storage on farm. Less urgency. Competitive on freight to Harlan.', originator_id: 'a1000000-0000-0000-0000-000000000012' },
    { id: 'c1000000-0000-0000-0000-000000000008', name: 'Ray Fitzgerald', phone: '712-555-0108', region: 'Iowa Southwest', lat: 41.33, lng: -95.21, preferred_crop: 'SOYBEANS', total_acres: 560, notes: 'Cash sale preferred. Quick decisions when price is right.', originator_id: 'a1000000-0000-0000-0000-000000000011' },
  ]).run()
  console.log('Seeded 8 farmers')

  // ── GENERATED FARMERS (500 Iowa Central farmers) ──
  const GEN_BATCH = 50
  for (let i = 0; i < generatedFarmers.length; i += GEN_BATCH) {
    const batch = generatedFarmers.slice(i, i + GEN_BATCH).map(f => ({
      id: f.id,
      name: f.name,
      phone: f.phone,
      email: f.email,
      salesforce_id: f.salesforce_id,
      region: f.region,
      lat: f.lat,
      lng: f.lng,
      preferred_crop: f.preferred_crop,
      total_acres: f.total_acres,
      notes: f.notes,
      originator_id: f.originator_id,
    }))
    db.insert(schema.farmers).values(batch as any).run()
  }
  console.log(`Seeded ${generatedFarmers.length} generated farmers`)

  // ── FARMER CONTACTS (activity history) ──
  // Simulated: mid-October 2025. Mix of recent and stale contacts.
  const contactTypes = ['OUTBOUND_CALL', 'INBOUND_CALL', 'SPOT_SALE', 'SITE_VISIT', 'EMAIL'] as const
  const contactNotes = [
    'Discussed DEC basis. Farmer wants to wait.',
    'Farmer called asking about current prices.',
    'Dropped off 8,200 bu corn at spot. Has more in storage.',
    'Dropped off 4,500 bu soybeans at spot.',
    'Site visit — checked bin levels. Estimated 15k bu remaining.',
    'Left voicemail. Will try again Thursday.',
    'Farmer interested in forward contract for MAR.',
    'Quick call — confirmed delivery for next week.',
    'Farmer shopping competitors. Offered -0.12 to hold.',
    'Sold 12,000 bu corn at spot. Mentioned neighbor also looking to sell.',
    'Email follow-up on DEC pricing.',
    'Farmer called in, locked 5,000 bu at -0.15.',
    'No answer. Third attempt this month.',
    'Good conversation. Farmer has 20k bu, waiting for better basis.',
    'Spot sale 6,800 bu. Farmer seemed motivated — cash flow.',
  ]
  // Generate contacts for generated farmers (subset — not every farmer has recent activity)
  const generatedFarmerIds = Array.from({ length: 2000 }, (_, i) =>
    `c2000000-0000-0000-0000-${String(i + 1).padStart(12, '0')}`)
  const originatorIds = [
    'a1000000-0000-0000-0000-000000000010',
    'a1000000-0000-0000-0000-000000000011',
    'a1000000-0000-0000-0000-000000000012',
    'a1000000-0000-0000-0000-000000000013',
    'a1000000-0000-0000-0000-000000000014',
    'a1000000-0000-0000-0000-000000000015',
  ]

  // Seeded RNG for reproducibility
  let _cseed = 17
  const crand = () => { _cseed = (_cseed * 16807 + 0) % 2147483647; return _cseed / 2147483647 }

  const contacts: { id: string; farmer_id: string; originator_id: string; contact_type: string; bushels_sold: number | null; notes: string; created_at: string }[] = []
  let contactIdx = 0

  for (const farmerId of generatedFarmerIds) {
    // ~60% of farmers have at least one contact record
    if (crand() > 0.6) continue

    // 1-3 contacts per farmer
    const numContacts = 1 + Math.floor(crand() * 3)
    for (let c = 0; c < numContacts; c++) {
      const type = contactTypes[Math.floor(crand() * contactTypes.length)]
      // Recency: most within last 30 days, some older
      const daysAgo = Math.floor(crand() * 45)
      const date = new Date('2025-10-15T08:00:00Z')
      date.setDate(date.getDate() - daysAgo)
      date.setHours(8 + Math.floor(crand() * 10))

      let bushels: number | null = null
      let note = contactNotes[Math.floor(crand() * contactNotes.length)]
      if (type === 'SPOT_SALE') {
        bushels = Math.round((2000 + crand() * 18000) / 100) * 100  // 2k-20k, round to 100
        note = `Spot sale ${bushels.toLocaleString()} bu. ${crand() > 0.5 ? 'Has more in storage.' : 'Cleaned out.'}`
      }

      // Assign to the farmer's originator most of the time, occasionally cross-originator
      const origIdx = Math.floor(crand() * originatorIds.length)
      contacts.push({
        id: `d1000000-0000-0000-0000-${String(++contactIdx).padStart(12, '0')}`,
        farmer_id: farmerId,
        originator_id: originatorIds[origIdx],
        contact_type: type,
        bushels_sold: bushels,
        notes: note,
        created_at: date.toISOString(),
      })
    }
  }

  // Insert in batches (SQLite has a variable limit)
  const BATCH = 50
  for (let i = 0; i < contacts.length; i += BATCH) {
    db.insert(schema.farmerContacts).values(contacts.slice(i, i + BATCH) as any).run()
  }
  console.log(`Seeded ${contacts.length} farmer contacts`)

  // ── POSITION SUMMARIES ──
  // Simulated current date: mid-October 2025 (Iowa harvest underway)
  // Near months heavily covered, far months thin
  const u1 = 'a1000000-0000-0000-0000-000000000001' // Marcus Webb
  const u2 = 'a1000000-0000-0000-0000-000000000002' // Dana Kowalski
  const e1 = 'b1000000-0000-0000-0000-000000000001' // Ames Main
  const e2 = 'b1000000-0000-0000-0000-000000000002' // Nevada Terminal
  const e3 = 'b1000000-0000-0000-0000-000000000003' // Atlantic Main
  const e4 = 'b1000000-0000-0000-0000-000000000004' // Harlan Station
  const e5 = 'b1000000-0000-0000-0000-000000000005' // Red Oak Depot
  const ts = '2025-10-15T08:00:00Z'

  db.insert(schema.positionSummary).values([
    // Marcus Webb — Ames Main CORN
    { id: PS_IDS['ps-001'], elevator_id: e1, user_id: u1, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, bushels_physical: 480000, bushels_futures: 420000, net_position: 60000, coverage_target: 600000, coverage_gap: 120000, current_basis: -0.14, ml_basis_rec: -0.12, basis_delta: -0.02, updated_at: ts },
    { id: PS_IDS['ps-009'], elevator_id: e1, user_id: u1, crop: 'CORN', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 180000, bushels_futures: 150000, net_position: 30000, coverage_target: 400000, coverage_gap: 220000, current_basis: -0.18, ml_basis_rec: -0.15, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-010'], elevator_id: e1, user_id: u1, crop: 'CORN', delivery_month: 'MAY', crop_year: 2026, bushels_physical: 95000, bushels_futures: 80000, net_position: 15000, coverage_target: 350000, coverage_gap: 255000, current_basis: -0.22, ml_basis_rec: -0.19, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-011'], elevator_id: e1, user_id: u1, crop: 'CORN', delivery_month: 'JUL', crop_year: 2026, bushels_physical: 40000, bushels_futures: 30000, net_position: 10000, coverage_target: 300000, coverage_gap: 260000, current_basis: -0.25, ml_basis_rec: -0.22, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-012'], elevator_id: e1, user_id: u1, crop: 'CORN', delivery_month: 'SEP', crop_year: 2026, bushels_physical: 10000, bushels_futures: 5000, net_position: 5000, coverage_target: 250000, coverage_gap: 240000, current_basis: -0.28, ml_basis_rec: -0.24, basis_delta: -0.04, updated_at: ts },
    // Marcus Webb — Ames Main SOYBEANS
    { id: PS_IDS['ps-002'], elevator_id: e1, user_id: u1, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, bushels_physical: 210000, bushels_futures: 195000, net_position: 15000, coverage_target: 280000, coverage_gap: 70000, current_basis: -0.32, ml_basis_rec: -0.29, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-013'], elevator_id: e1, user_id: u1, crop: 'SOYBEANS', delivery_month: 'JAN', crop_year: 2026, bushels_physical: 120000, bushels_futures: 100000, net_position: 20000, coverage_target: 220000, coverage_gap: 100000, current_basis: -0.35, ml_basis_rec: -0.31, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-014'], elevator_id: e1, user_id: u1, crop: 'SOYBEANS', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 60000, bushels_futures: 45000, net_position: 15000, coverage_target: 180000, coverage_gap: 120000, current_basis: -0.38, ml_basis_rec: -0.34, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-015'], elevator_id: e1, user_id: u1, crop: 'SOYBEANS', delivery_month: 'MAY', crop_year: 2026, bushels_physical: 25000, bushels_futures: 15000, net_position: 10000, coverage_target: 150000, coverage_gap: 125000, current_basis: -0.42, ml_basis_rec: -0.38, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-016'], elevator_id: e1, user_id: u1, crop: 'SOYBEANS', delivery_month: 'JUL', crop_year: 2026, bushels_physical: 10000, bushels_futures: 5000, net_position: 5000, coverage_target: 120000, coverage_gap: 110000, current_basis: -0.45, ml_basis_rec: -0.40, basis_delta: -0.05, updated_at: ts },
    // Marcus Webb — Nevada Terminal CORN
    { id: PS_IDS['ps-003'], elevator_id: e2, user_id: u1, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, bushels_physical: 290000, bushels_futures: 260000, net_position: 30000, coverage_target: 350000, coverage_gap: 60000, current_basis: -0.15, ml_basis_rec: -0.13, basis_delta: -0.02, updated_at: ts },
    { id: PS_IDS['ps-017'], elevator_id: e2, user_id: u1, crop: 'CORN', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 110000, bushels_futures: 90000, net_position: 20000, coverage_target: 250000, coverage_gap: 140000, current_basis: -0.20, ml_basis_rec: -0.17, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-018'], elevator_id: e2, user_id: u1, crop: 'CORN', delivery_month: 'MAY', crop_year: 2026, bushels_physical: 55000, bushels_futures: 40000, net_position: 15000, coverage_target: 200000, coverage_gap: 145000, current_basis: -0.24, ml_basis_rec: -0.21, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-019'], elevator_id: e2, user_id: u1, crop: 'CORN', delivery_month: 'JUL', crop_year: 2026, bushels_physical: 20000, bushels_futures: 10000, net_position: 10000, coverage_target: 160000, coverage_gap: 140000, current_basis: -0.27, ml_basis_rec: -0.23, basis_delta: -0.04, updated_at: ts },
    // Marcus Webb — Nevada Terminal SOYBEANS
    { id: PS_IDS['ps-004'], elevator_id: e2, user_id: u1, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, bushels_physical: 140000, bushels_futures: 120000, net_position: 20000, coverage_target: 180000, coverage_gap: 40000, current_basis: -0.34, ml_basis_rec: -0.31, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-020'], elevator_id: e2, user_id: u1, crop: 'SOYBEANS', delivery_month: 'JAN', crop_year: 2026, bushels_physical: 70000, bushels_futures: 55000, net_position: 15000, coverage_target: 140000, coverage_gap: 70000, current_basis: -0.37, ml_basis_rec: -0.33, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-021'], elevator_id: e2, user_id: u1, crop: 'SOYBEANS', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 30000, bushels_futures: 20000, net_position: 10000, coverage_target: 100000, coverage_gap: 70000, current_basis: -0.40, ml_basis_rec: -0.36, basis_delta: -0.04, updated_at: ts },
    // Dana Kowalski — Atlantic Main CORN
    { id: PS_IDS['ps-005'], elevator_id: e3, user_id: u2, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, bushels_physical: 620000, bushels_futures: 550000, net_position: 70000, coverage_target: 750000, coverage_gap: 130000, current_basis: -0.13, ml_basis_rec: -0.11, basis_delta: -0.02, updated_at: ts },
    { id: PS_IDS['ps-022'], elevator_id: e3, user_id: u2, crop: 'CORN', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 240000, bushels_futures: 200000, net_position: 40000, coverage_target: 500000, coverage_gap: 260000, current_basis: -0.17, ml_basis_rec: -0.14, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-023'], elevator_id: e3, user_id: u2, crop: 'CORN', delivery_month: 'MAY', crop_year: 2026, bushels_physical: 120000, bushels_futures: 95000, net_position: 25000, coverage_target: 420000, coverage_gap: 300000, current_basis: -0.21, ml_basis_rec: -0.18, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-024'], elevator_id: e3, user_id: u2, crop: 'CORN', delivery_month: 'JUL', crop_year: 2026, bushels_physical: 50000, bushels_futures: 35000, net_position: 15000, coverage_target: 350000, coverage_gap: 300000, current_basis: -0.24, ml_basis_rec: -0.20, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-025'], elevator_id: e3, user_id: u2, crop: 'CORN', delivery_month: 'SEP', crop_year: 2026, bushels_physical: 15000, bushels_futures: 10000, net_position: 5000, coverage_target: 280000, coverage_gap: 265000, current_basis: -0.27, ml_basis_rec: -0.23, basis_delta: -0.04, updated_at: ts },
    // Dana Kowalski — Atlantic Main SOYBEANS
    { id: PS_IDS['ps-006'], elevator_id: e3, user_id: u2, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, bushels_physical: 280000, bushels_futures: 250000, net_position: 30000, coverage_target: 350000, coverage_gap: 70000, current_basis: -0.31, ml_basis_rec: -0.28, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-026'], elevator_id: e3, user_id: u2, crop: 'SOYBEANS', delivery_month: 'JAN', crop_year: 2026, bushels_physical: 150000, bushels_futures: 120000, net_position: 30000, coverage_target: 280000, coverage_gap: 130000, current_basis: -0.34, ml_basis_rec: -0.30, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-027'], elevator_id: e3, user_id: u2, crop: 'SOYBEANS', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 75000, bushels_futures: 55000, net_position: 20000, coverage_target: 220000, coverage_gap: 145000, current_basis: -0.37, ml_basis_rec: -0.33, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-028'], elevator_id: e3, user_id: u2, crop: 'SOYBEANS', delivery_month: 'MAY', crop_year: 2026, bushels_physical: 30000, bushels_futures: 20000, net_position: 10000, coverage_target: 180000, coverage_gap: 150000, current_basis: -0.41, ml_basis_rec: -0.37, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-029'], elevator_id: e3, user_id: u2, crop: 'SOYBEANS', delivery_month: 'JUL', crop_year: 2026, bushels_physical: 10000, bushels_futures: 5000, net_position: 5000, coverage_target: 140000, coverage_gap: 130000, current_basis: -0.44, ml_basis_rec: -0.39, basis_delta: -0.05, updated_at: ts },
    // Dana Kowalski — Harlan Station CORN
    { id: PS_IDS['ps-007'], elevator_id: e4, user_id: u2, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, bushels_physical: 180000, bushels_futures: 160000, net_position: 20000, coverage_target: 220000, coverage_gap: 40000, current_basis: -0.16, ml_basis_rec: -0.14, basis_delta: -0.02, updated_at: ts },
    { id: PS_IDS['ps-030'], elevator_id: e4, user_id: u2, crop: 'CORN', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 65000, bushels_futures: 50000, net_position: 15000, coverage_target: 160000, coverage_gap: 95000, current_basis: -0.20, ml_basis_rec: -0.17, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-031'], elevator_id: e4, user_id: u2, crop: 'CORN', delivery_month: 'MAY', crop_year: 2026, bushels_physical: 30000, bushels_futures: 20000, net_position: 10000, coverage_target: 130000, coverage_gap: 100000, current_basis: -0.24, ml_basis_rec: -0.20, basis_delta: -0.04, updated_at: ts },
    // Dana Kowalski — Harlan Station SOYBEANS
    { id: PS_IDS['ps-032'], elevator_id: e4, user_id: u2, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, bushels_physical: 90000, bushels_futures: 75000, net_position: 15000, coverage_target: 120000, coverage_gap: 30000, current_basis: -0.33, ml_basis_rec: -0.30, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-033'], elevator_id: e4, user_id: u2, crop: 'SOYBEANS', delivery_month: 'JAN', crop_year: 2026, bushels_physical: 45000, bushels_futures: 30000, net_position: 15000, coverage_target: 90000, coverage_gap: 45000, current_basis: -0.36, ml_basis_rec: -0.32, basis_delta: -0.04, updated_at: ts },
    { id: PS_IDS['ps-034'], elevator_id: e4, user_id: u2, crop: 'SOYBEANS', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 15000, bushels_futures: 10000, net_position: 5000, coverage_target: 70000, coverage_gap: 55000, current_basis: -0.39, ml_basis_rec: -0.35, basis_delta: -0.04, updated_at: ts },
    // Dana Kowalski — Red Oak Depot CORN
    { id: PS_IDS['ps-008'], elevator_id: e5, user_id: u2, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, bushels_physical: 142000, bushels_futures: 110000, net_position: 32000, coverage_target: 180000, coverage_gap: 38000, current_basis: -0.155, ml_basis_rec: -0.135, basis_delta: -0.02, updated_at: ts },
    { id: PS_IDS['ps-035'], elevator_id: e5, user_id: u2, crop: 'CORN', delivery_month: 'MAR', crop_year: 2026, bushels_physical: 50000, bushels_futures: 35000, net_position: 15000, coverage_target: 120000, coverage_gap: 70000, current_basis: -0.21, ml_basis_rec: -0.18, basis_delta: -0.03, updated_at: ts },
    // Dana Kowalski — Red Oak Depot SOYBEANS
    { id: PS_IDS['ps-036'], elevator_id: e5, user_id: u2, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, bushels_physical: 65000, bushels_futures: 50000, net_position: 15000, coverage_target: 85000, coverage_gap: 20000, current_basis: -0.34, ml_basis_rec: -0.31, basis_delta: -0.03, updated_at: ts },
    { id: PS_IDS['ps-037'], elevator_id: e5, user_id: u2, crop: 'SOYBEANS', delivery_month: 'JAN', crop_year: 2026, bushels_physical: 25000, bushels_futures: 15000, net_position: 10000, coverage_target: 60000, coverage_gap: 35000, current_basis: -0.37, ml_basis_rec: -0.33, basis_delta: -0.04, updated_at: ts },
  ]).run()
  console.log('Seeded 37 position summaries')

  // ── ML RECOMMENDATIONS ──
  db.insert(schema.mlRecommendations).values([
    { id: ML_IDS['ml-001'], rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000001', elevator_id: 'b1000000-0000-0000-0000-000000000001', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, recommended_value: -0.12, reasoning: 'Recommend 12 under December. Competitor Atlantic Foods near capacity in southeast zone. Crop stress signals in Johnson County suggest early harvest pressure. Your December coverage gap is 120,000 bu — room to be aggressive.', competitor_signal: 'Atlantic Foods elevator capacity 87% — pulling back bids in southeast zone.', crop_stress_signal: 'NDVI stress index elevated in Johnson, Polk counties. Early harvest likely.', position_signal: 'December coverage gap 120,000 bu. 6 weeks to delivery window.', confidence: 0.78, generated_at: '2025-10-15T06:00:00Z' },
    { id: ML_IDS['ml-002'], rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000002', elevator_id: 'b1000000-0000-0000-0000-000000000003', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025, recommended_value: -0.11, reasoning: 'Recommend 11 under December. Strong origination opportunity in southwest territory. Competitor spread favorable — nearest elevator is 8 miles further for most of your target zone. Coverage gap is your largest across all elevators.', competitor_signal: 'Nearest competitor 18 cents under December. Spread 7 cents in your favor.', crop_stress_signal: 'Crop stress moderate. Some early harvest pressure in Shelby County.', position_signal: 'December coverage gap 130,000 bu. Largest open position in region.', confidence: 0.82, generated_at: '2025-10-15T06:00:00Z' },
    { id: ML_IDS['ml-003'], rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000001', elevator_id: 'b1000000-0000-0000-0000-000000000001', crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, recommended_value: -0.29, reasoning: 'Recommend 29 under November. Soybean basis tightening regionally. Coverage gap at 70,000 bu with harvest window closing. Competitor spread narrow — differentiate on relationship.', competitor_signal: 'Regional soybean basis tightening. Competitors at 32-35 under.', crop_stress_signal: 'Soybean moisture levels normal. No stress signals.', position_signal: 'November coverage gap 70,000 bu. Moderate urgency.', confidence: 0.71, generated_at: '2025-10-15T06:00:00Z' },
    { id: ML_IDS['ml-004'], rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000002', elevator_id: 'b1000000-0000-0000-0000-000000000003', crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025, recommended_value: -0.28, reasoning: 'Recommend 28 under November. Atlantic Main has strongest soybean position in region. Basis can be competitive given freight advantage. Push for volume.', competitor_signal: 'Competitor basis 33-36 under November. Freight advantage 4-6 cents.', crop_stress_signal: 'No significant soybean stress in territory.', position_signal: 'November soybean gap 70,000 bu. Second priority after corn.', confidence: 0.75, generated_at: '2025-10-15T06:00:00Z' },
  ]).run()
  console.log('Seeded 4 ML recommendations')

  // ── LEADS ──
  db.insert(schema.leads).values([
    { id: LEAD_IDS['lead-001'], farmer_id: 'c1000000-0000-0000-0000-000000000003', elevator_id: 'b1000000-0000-0000-0000-000000000003', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.94, ml_rank: 1, crop: 'CORN', estimated_bu: 85000, recommended_basis: -0.11, competitor_spread: 0.07, distance_to_competitor_mi: 12, crop_stress_score: 0.3, last_contact_at: '2025-10-08T14:30:00Z', last_contact_note: 'Interested but waiting on December futures. Said to call back after USDA report.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-002'], farmer_id: 'c1000000-0000-0000-0000-000000000006', elevator_id: 'b1000000-0000-0000-0000-000000000001', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.89, ml_rank: 2, crop: 'CORN', estimated_bu: 35000, recommended_basis: -0.12, competitor_spread: 0.04, distance_to_competitor_mi: 6, crop_stress_score: 0.82, last_contact_at: '2025-10-01T10:00:00Z', last_contact_note: 'Drought stress on northeast fields. Motivated to sell before quality drops.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-003'], farmer_id: 'c1000000-0000-0000-0000-000000000001', elevator_id: 'b1000000-0000-0000-0000-000000000003', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.85, ml_rank: 3, crop: 'CORN', estimated_bu: 42000, recommended_basis: -0.11, competitor_spread: 0.05, distance_to_competitor_mi: 14, crop_stress_score: 0.15, last_contact_at: '2025-10-10T16:00:00Z', last_contact_note: 'Ready to move grain. Cash flow need before end of month. Prefers early delivery.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-004'], farmer_id: 'c1000000-0000-0000-0000-000000000002', elevator_id: 'b1000000-0000-0000-0000-000000000003', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.72, ml_rank: 4, crop: 'SOYBEANS', estimated_bu: 28000, recommended_basis: -0.28, competitor_spread: 0.03, distance_to_competitor_mi: 9, crop_stress_score: 0.05, last_contact_at: '2025-09-25T11:00:00Z', last_contact_note: "Holding beans. Watching basis. Said she won't sell under 30 under.", outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-005'], farmer_id: 'c1000000-0000-0000-0000-000000000007', elevator_id: 'b1000000-0000-0000-0000-000000000004', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.68, ml_rank: 5, crop: 'CORN', estimated_bu: 52000, recommended_basis: -0.125, competitor_spread: 0.02, distance_to_competitor_mi: 5, crop_stress_score: 0.1, last_contact_at: '2025-10-03T09:00:00Z', last_contact_note: 'Has on-farm storage. Not in a rush. Might wait until November.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-006'], farmer_id: 'c1000000-0000-0000-0000-000000000004', elevator_id: 'b1000000-0000-0000-0000-000000000003', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.61, ml_rank: 6, crop: 'CORN', estimated_bu: 20000, recommended_basis: -0.11, competitor_spread: 0.06, distance_to_competitor_mi: 11, crop_stress_score: 0.2, last_contact_at: '2025-09-20T14:00:00Z', last_contact_note: 'New relationship. First sale last year. Building trust. Growth potential.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-007'], farmer_id: 'c1000000-0000-0000-0000-000000000008', elevator_id: 'b1000000-0000-0000-0000-000000000005', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.55, ml_rank: 7, crop: 'SOYBEANS', estimated_bu: 18000, recommended_basis: -0.30, competitor_spread: 0.01, distance_to_competitor_mi: 8, crop_stress_score: 0.08, last_contact_at: '2025-09-28T10:30:00Z', last_contact_note: 'Prefers cash sale. Quick decision maker when price is right.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
    { id: LEAD_IDS['lead-008'], farmer_id: 'c1000000-0000-0000-0000-000000000005', elevator_id: 'b1000000-0000-0000-0000-000000000001', assigned_to: 'a1000000-0000-0000-0000-000000000003', ml_score: 0.48, ml_rank: 8, crop: 'SOYBEANS', estimated_bu: 45000, recommended_basis: -0.29, competitor_spread: 0.02, distance_to_competitor_mi: 15, crop_stress_score: 0.05, last_contact_at: '2025-09-15T16:00:00Z', last_contact_note: 'Sells in tranches. May move 15-20k bu now, rest later. Prefers evening calls.', outcome: 'PENDING', week_of: '2025-10-14', is_active: true },
  ]).run()
  console.log('Seeded 8 leads')

  // ── DEMO: Recently closed leads + position changes ──
  // These simulate what happens when an originator closes a deal from a landscape-sent lead
  const now = new Date()
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString()
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString()
  const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000).toISOString()

  // Closed lead 1: Jake Morrison closed 8,000 bu at -0.14 from Tom Lindquist → Ames Main DEC CORN
  const closedLead1 = 'f1000000-0000-0000-0000-000000000101'
  db.insert(schema.leads).values({
    id: closedLead1,
    farmer_id: 'c1000000-0000-0000-0000-000000000005', // Tom Lindquist
    elevator_id: 'b1000000-0000-0000-0000-000000000001', // Ames Main
    assigned_to: 'a1000000-0000-0000-0000-000000000010', // Jake Morrison
    ml_score: 0.82, crop: 'CORN', estimated_bu: 8000,
    recommended_basis: -0.14, outcome: 'SOLD', outcome_basis: -0.14, outcome_bu: 8000,
    outcome_note: 'Sold first tranche. Has more — will call back next week.',
    outcome_at: twoHoursAgo, week_of: now.toISOString().slice(0, 10), is_active: false,
  }).run()

  // Closed lead 2: Lisa Tran closed 12,000 bu at -0.12 from Gary Novak → Ames Main DEC CORN
  const closedLead2 = 'f1000000-0000-0000-0000-000000000102'
  db.insert(schema.leads).values({
    id: closedLead2,
    farmer_id: 'c1000000-0000-0000-0000-000000000006', // Gary Novak
    elevator_id: 'b1000000-0000-0000-0000-000000000001', // Ames Main
    assigned_to: 'a1000000-0000-0000-0000-000000000011', // Lisa Tran
    ml_score: 0.89, crop: 'CORN', estimated_bu: 12000,
    recommended_basis: -0.12, outcome: 'SOLD', outcome_basis: -0.12, outcome_bu: 12000,
    outcome_note: 'Drought stress on fields — motivated to sell quickly.',
    outcome_at: sixHoursAgo, week_of: now.toISOString().slice(0, 10), is_active: false,
  }).run()

  // Closed lead 3: Mike Sorensen closed 15,000 bu at -0.13 from Harold Johnson → Ames Main DEC CORN
  const closedLead3 = 'f1000000-0000-0000-0000-000000000103'
  db.insert(schema.leads).values({
    id: closedLead3,
    farmer_id: 'c1000000-0000-0000-0000-000000000001', // Harold Johnson
    elevator_id: 'b1000000-0000-0000-0000-000000000001', // Ames Main
    assigned_to: 'a1000000-0000-0000-0000-000000000012', // Mike Sorensen
    ml_score: 0.85, crop: 'CORN', estimated_bu: 15000,
    recommended_basis: -0.13, outcome: 'SOLD', outcome_basis: -0.13, outcome_bu: 15000,
    outcome_note: 'Cash flow sensitive. Prefers early October delivery.',
    outcome_at: twentyHoursAgo, week_of: now.toISOString().slice(0, 10), is_active: false,
  }).run()
  console.log('Seeded 3 demo closed leads')

  // Position changes from the closed leads
  // Ames Main DEC CORN: ps-001 has bushels_physical: 380000, coverage_target: 500000, coverage_gap: 120000
  // Before: 380k/500k = 76% → After: 380k + 35k = 415k/500k = 83% → gap reduced from 120k to 85k
  const posId = PS_IDS['ps-001'] // Ames Main DEC CORN
  db.insert(schema.positionChanges).values([
    {
      position_id: posId, lead_id: closedLead3,
      farmer_name: 'Harold Johnson', originator_name: 'Mike Sorensen',
      bushels: 15000, basis: -0.13,
      coverage_before: 76.0, coverage_after: 79.0,
      created_at: twentyHoursAgo,
    },
    {
      position_id: posId, lead_id: closedLead2,
      farmer_name: 'Gary Novak', originator_name: 'Lisa Tran',
      bushels: 12000, basis: -0.12,
      coverage_before: 79.0, coverage_after: 81.4,
      created_at: sixHoursAgo,
    },
    {
      position_id: posId, lead_id: closedLead1,
      farmer_name: 'Tom Lindquist', originator_name: 'Jake Morrison',
      bushels: 8000, basis: -0.14,
      coverage_before: 81.4, coverage_after: 83.0,
      created_at: twoHoursAgo,
    },
  ]).run()

  // Update the actual position to reflect the closed deals
  sqlite.prepare(`UPDATE position_summary SET bushels_physical = 415000, net_position = 35000, coverage_gap = 85000, updated_at = ? WHERE id = ?`).run(twoHoursAgo, posId)
  console.log('Seeded 3 position changes (Ames Main DEC CORN: 76% → 83%)')

  // ── ALERTS ──
  db.insert(schema.alerts).values([
    { id: ALERT_IDS['alert-001'], user_id: 'a1000000-0000-0000-0000-000000000001', alert_type: 'COVERAGE_GAP', title: 'Coverage gap widening — Ames Main Corn Dec', body: 'December corn coverage gap at Ames Main has increased to 120,000 bu. 6 weeks to delivery window.', elevator_id: 'b1000000-0000-0000-0000-000000000001', data: { gap_bu: 120000, weeks_to_delivery: 6 }, is_read: false, acted_on: false, created_at: '2025-10-15T07:30:00Z' },
    { id: ALERT_IDS['alert-002'], user_id: 'a1000000-0000-0000-0000-000000000001', alert_type: 'COMPETITOR_BID_MOVE', title: 'Atlantic Foods pulled back corn bids', body: 'Atlantic Foods southeast zone elevator at 87% capacity. Pulled corn bids 3 cents. Origination opportunity.', data: { competitor: 'Atlantic Foods', move_cents: -3 }, is_read: false, acted_on: false, created_at: '2025-10-15T06:15:00Z' },
    { id: ALERT_IDS['alert-003'], user_id: 'a1000000-0000-0000-0000-000000000001', alert_type: 'CROP_STRESS_EVENT', title: 'NDVI stress detected — Johnson County', body: 'Satellite imagery shows elevated stress index in Johnson and Polk counties. Early harvest pressure likely.', data: { counties: ['Johnson', 'Polk'], stress_index: 0.72 }, is_read: true, acted_on: false, created_at: '2025-10-14T18:00:00Z' },
    { id: ALERT_IDS['alert-004'], user_id: 'a1000000-0000-0000-0000-000000000002', alert_type: 'COVERAGE_GAP', title: 'Largest coverage gap — Atlantic Main Corn Dec', body: 'Atlantic Main December corn coverage gap at 130,000 bu. Largest open position in your region.', elevator_id: 'b1000000-0000-0000-0000-000000000003', data: { gap_bu: 130000, weeks_to_delivery: 6 }, is_read: false, acted_on: false, created_at: '2025-10-15T07:30:00Z' },
    { id: ALERT_IDS['alert-005'], user_id: 'a1000000-0000-0000-0000-000000000003', alert_type: 'INBOUND_CALL', title: 'Inbound call — Bob Schroeder', body: 'Bob Schroeder calling. 2,400 acres, corn preferred. Last contact: interested but waiting on USDA report.', elevator_id: 'b1000000-0000-0000-0000-000000000003', farmer_id: 'c1000000-0000-0000-0000-000000000003', data: { farmer_acres: 2400 }, is_read: false, acted_on: false, created_at: '2025-10-15T09:45:00Z' },
    { id: ALERT_IDS['alert-006'], user_id: 'a1000000-0000-0000-0000-000000000002', alert_type: 'FUTURES_MOVE', title: 'December corn futures up 8¢', body: 'December corn futures moved +8 cents in morning session. Basis may need adjustment.', data: { contract: 'CZ25', move_cents: 8 }, is_read: false, acted_on: false, created_at: '2025-10-15T10:00:00Z' },
  ]).run()
  console.log('Seeded 6 alerts')

  console.log('Seeding complete!')
}

seed()
sqlite.close()
