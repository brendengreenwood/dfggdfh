// ── KERNEL MOCK DATA ──
// Derived from schema.sql seed data. All IDs match the seed INSERT statements.
// All data is fictional but plausible for Iowa grain operations.

import type {
  User,
  Elevator,
  PositionSummary,
  MLRecommendation,
  Farmer,
  Lead,
  Alert,
  MLOverride,
} from '@/types/kernel'

// ── USERS ──

export const users: User[] = [
  { id: 'a1000000-0000-0000-0000-000000000001', name: 'Marcus Webb', email: 'mwebb@cargill.com', persona: 'MERCHANT', region: 'Iowa Central' },
  { id: 'a1000000-0000-0000-0000-000000000002', name: 'Dana Kowalski', email: 'dkowalski@cargill.com', persona: 'HYBRID', region: 'Iowa Southwest' },
  { id: 'a1000000-0000-0000-0000-000000000003', name: 'Tyler Briggs', email: 'tbriggs@cargill.com', persona: 'GOM', region: 'Iowa Southwest' },
  { id: 'a1000000-0000-0000-0000-000000000004', name: 'Sarah Chen', email: 'schen@cargill.com', persona: 'CSR', region: 'Iowa Southwest' },
  { id: 'a1000000-0000-0000-0000-000000000005', name: 'Jim Harrington', email: 'jharrington@cargill.com', persona: 'MANAGER', region: 'Iowa Region' },
]

// ── ELEVATORS ──

export const elevators: Elevator[] = [
  { id: 'b1000000-0000-0000-0000-000000000001', name: 'Ames Main', code: 'AME', region: 'Iowa Central', lat: 41.99, lng: -93.62, capacity_bu: 2500000 },
  { id: 'b1000000-0000-0000-0000-000000000002', name: 'Nevada Terminal', code: 'NEV', region: 'Iowa Central', lat: 42.02, lng: -93.45, capacity_bu: 1800000 },
  { id: 'b1000000-0000-0000-0000-000000000003', name: 'Atlantic Main', code: 'ATL', region: 'Iowa Southwest', lat: 41.40, lng: -95.01, capacity_bu: 3200000 },
  { id: 'b1000000-0000-0000-0000-000000000004', name: 'Harlan Station', code: 'HAR', region: 'Iowa Southwest', lat: 41.65, lng: -95.33, capacity_bu: 1400000 },
  { id: 'b1000000-0000-0000-0000-000000000005', name: 'Red Oak Depot', code: 'ROK', region: 'Iowa Southwest', lat: 41.00, lng: -95.23, capacity_bu: 900000 },
]

// helper to resolve elevator by id
function elevator(id: string): Elevator {
  return elevators.find(e => e.id === id)!
}

// ── POSITION SUMMARIES ──

export const positionSummaries: PositionSummary[] = [
  // Marcus Webb — Iowa Central merchant
  {
    id: 'ps-001', elevator_id: 'b1000000-0000-0000-0000-000000000001', elevator: elevator('b1000000-0000-0000-0000-000000000001'),
    user_id: 'a1000000-0000-0000-0000-000000000001', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    bushels_physical: 480000, bushels_futures: 420000, net_position: 60000,
    coverage_target: 600000, coverage_gap: 120000, current_basis: -0.14, ml_basis_rec: -0.12, basis_delta: -0.02,
    updated_at: '2025-10-15T08:00:00Z',
  },
  {
    id: 'ps-002', elevator_id: 'b1000000-0000-0000-0000-000000000001', elevator: elevator('b1000000-0000-0000-0000-000000000001'),
    user_id: 'a1000000-0000-0000-0000-000000000001', crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025,
    bushels_physical: 210000, bushels_futures: 195000, net_position: 15000,
    coverage_target: 280000, coverage_gap: 70000, current_basis: -0.32, ml_basis_rec: -0.29, basis_delta: -0.03,
    updated_at: '2025-10-15T08:00:00Z',
  },
  {
    id: 'ps-003', elevator_id: 'b1000000-0000-0000-0000-000000000002', elevator: elevator('b1000000-0000-0000-0000-000000000002'),
    user_id: 'a1000000-0000-0000-0000-000000000001', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    bushels_physical: 290000, bushels_futures: 260000, net_position: 30000,
    coverage_target: 350000, coverage_gap: 60000, current_basis: -0.15, ml_basis_rec: -0.13, basis_delta: -0.02,
    updated_at: '2025-10-15T08:00:00Z',
  },
  {
    id: 'ps-004', elevator_id: 'b1000000-0000-0000-0000-000000000002', elevator: elevator('b1000000-0000-0000-0000-000000000002'),
    user_id: 'a1000000-0000-0000-0000-000000000001', crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025,
    bushels_physical: 140000, bushels_futures: 120000, net_position: 20000,
    coverage_target: 180000, coverage_gap: 40000, current_basis: -0.34, ml_basis_rec: -0.31, basis_delta: -0.03,
    updated_at: '2025-10-15T08:00:00Z',
  },
  // Dana Kowalski — Iowa Southwest hybrid
  {
    id: 'ps-005', elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    user_id: 'a1000000-0000-0000-0000-000000000002', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    bushels_physical: 620000, bushels_futures: 540000, net_position: 80000,
    coverage_target: 750000, coverage_gap: 130000, current_basis: -0.13, ml_basis_rec: -0.11, basis_delta: -0.02,
    updated_at: '2025-10-15T08:00:00Z',
  },
  {
    id: 'ps-006', elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    user_id: 'a1000000-0000-0000-0000-000000000002', crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025,
    bushels_physical: 310000, bushels_futures: 275000, net_position: 35000,
    coverage_target: 380000, coverage_gap: 70000, current_basis: -0.31, ml_basis_rec: -0.28, basis_delta: -0.03,
    updated_at: '2025-10-15T08:00:00Z',
  },
  {
    id: 'ps-007', elevator_id: 'b1000000-0000-0000-0000-000000000004', elevator: elevator('b1000000-0000-0000-0000-000000000004'),
    user_id: 'a1000000-0000-0000-0000-000000000002', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    bushels_physical: 195000, bushels_futures: 160000, net_position: 35000,
    coverage_target: 240000, coverage_gap: 45000, current_basis: -0.145, ml_basis_rec: -0.125, basis_delta: -0.02,
    updated_at: '2025-10-15T08:00:00Z',
  },
  {
    id: 'ps-008', elevator_id: 'b1000000-0000-0000-0000-000000000005', elevator: elevator('b1000000-0000-0000-0000-000000000005'),
    user_id: 'a1000000-0000-0000-0000-000000000002', crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    bushels_physical: 142000, bushels_futures: 110000, net_position: 32000,
    coverage_target: 180000, coverage_gap: 38000, current_basis: -0.155, ml_basis_rec: -0.135, basis_delta: -0.02,
    updated_at: '2025-10-15T08:00:00Z',
  },
]

// ── FARMERS ──

export const farmers: Farmer[] = [
  { id: 'c1000000-0000-0000-0000-000000000001', name: 'Harold Johnson', phone: '515-555-0101', email: null, salesforce_id: null, region: 'Iowa Southwest', lat: 41.52, lng: -95.18, preferred_crop: 'CORN', total_acres: 1200, notes: 'Reliable seller, prefers early October delivery. Cash flow sensitive.' },
  { id: 'c1000000-0000-0000-0000-000000000002', name: 'Linda Petersen', phone: '515-555-0102', email: null, salesforce_id: null, region: 'Iowa Southwest', lat: 41.38, lng: -95.44, preferred_crop: 'SOYBEANS', total_acres: 800, notes: 'Watches basis closely. Will hold if spread is unfavorable. Call Tuesdays.' },
  { id: 'c1000000-0000-0000-0000-000000000003', name: 'Bob Schroeder', phone: '712-555-0103', email: null, salesforce_id: null, region: 'Iowa Southwest', lat: 41.71, lng: -95.29, preferred_crop: 'CORN', total_acres: 2400, notes: 'Large operation. Strategic account potential. Price sensitive on corn.' },
  { id: 'c1000000-0000-0000-0000-000000000004', name: 'Marie Gutierrez', phone: '712-555-0104', email: null, salesforce_id: null, region: 'Iowa Southwest', lat: 41.44, lng: -95.05, preferred_crop: 'CORN', total_acres: 650, notes: 'New relationship. First sale last year. Building trust.' },
  { id: 'c1000000-0000-0000-0000-000000000005', name: 'Tom Lindquist', phone: '515-555-0105', email: null, salesforce_id: null, region: 'Iowa Central', lat: 42.11, lng: -93.58, preferred_crop: 'SOYBEANS', total_acres: 1800, notes: 'Prefers evening calls. Sells in tranches, not all at once.' },
  { id: 'c1000000-0000-0000-0000-000000000006', name: 'Gary Novak', phone: '515-555-0106', email: null, salesforce_id: null, region: 'Iowa Central', lat: 41.95, lng: -93.71, preferred_crop: 'CORN', total_acres: 980, notes: 'Drought stress visible in northeast fields per satellite. Motivated seller.' },
  { id: 'c1000000-0000-0000-0000-000000000007', name: 'Diane Olson', phone: '712-555-0107', email: null, salesforce_id: null, region: 'Iowa Southwest', lat: 41.58, lng: -95.38, preferred_crop: 'CORN', total_acres: 1450, notes: 'Has storage on farm. Less urgency. Competitive on freight to Harlan.' },
  { id: 'c1000000-0000-0000-0000-000000000008', name: 'Ray Fitzgerald', phone: '712-555-0108', email: null, salesforce_id: null, region: 'Iowa Southwest', lat: 41.33, lng: -95.21, preferred_crop: 'SOYBEANS', total_acres: 560, notes: 'Cash sale preferred. Quick decisions when price is right.' },
]

// helper to resolve farmer by id
function farmer(id: string): Farmer {
  return farmers.find(f => f.id === id)!
}

// ── ML RECOMMENDATIONS ──

export const mlRecommendations: MLRecommendation[] = [
  {
    id: 'ml-001', rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000001',
    elevator_id: 'b1000000-0000-0000-0000-000000000001', elevator: elevator('b1000000-0000-0000-0000-000000000001'),
    farmer_id: null, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    recommended_value: -0.12,
    reasoning: 'Recommend 12 under December. Competitor Atlantic Foods near capacity in southeast zone. Crop stress signals in Johnson County suggest early harvest pressure. Your December coverage gap is 120,000 bu — room to be aggressive.',
    competitor_signal: 'Atlantic Foods elevator capacity 87% — pulling back bids in southeast zone.',
    crop_stress_signal: 'NDVI stress index elevated in Johnson, Polk counties. Early harvest likely.',
    position_signal: 'December coverage gap 120,000 bu. 6 weeks to delivery window.',
    market_signal: null,
    confidence: 0.78,
    generated_at: '2025-10-15T06:00:00Z',
  },
  {
    id: 'ml-002', rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000002',
    elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    farmer_id: null, crop: 'CORN', delivery_month: 'DEC', crop_year: 2025,
    recommended_value: -0.11,
    reasoning: 'Recommend 11 under December. Strong origination opportunity in southwest territory. Competitor spread favorable — nearest elevator is 8 miles further for most of your target zone. Coverage gap is your largest across all elevators.',
    competitor_signal: 'Nearest competitor 18 cents under December. Spread 7 cents in your favor.',
    crop_stress_signal: 'Crop stress moderate. Some early harvest pressure in Shelby County.',
    position_signal: 'December coverage gap 130,000 bu. Largest open position in region.',
    market_signal: null,
    confidence: 0.82,
    generated_at: '2025-10-15T06:00:00Z',
  },
  {
    id: 'ml-003', rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000001',
    elevator_id: 'b1000000-0000-0000-0000-000000000001', elevator: elevator('b1000000-0000-0000-0000-000000000001'),
    farmer_id: null, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025,
    recommended_value: -0.29,
    reasoning: 'Recommend 29 under November. Soybean basis tightening regionally. Coverage gap at 70,000 bu with harvest window closing. Competitor spread narrow — differentiate on relationship.',
    competitor_signal: 'Regional soybean basis tightening. Competitors at 32-35 under.',
    crop_stress_signal: 'Soybean moisture levels normal. No stress signals.',
    position_signal: 'November coverage gap 70,000 bu. Moderate urgency.',
    market_signal: null,
    confidence: 0.71,
    generated_at: '2025-10-15T06:00:00Z',
  },
  {
    id: 'ml-004', rec_type: 'BASIS', user_id: 'a1000000-0000-0000-0000-000000000002',
    elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    farmer_id: null, crop: 'SOYBEANS', delivery_month: 'NOV', crop_year: 2025,
    recommended_value: -0.28,
    reasoning: 'Recommend 28 under November. Atlantic Main has strongest soybean position in region. Basis can be competitive given freight advantage. Push for volume.',
    competitor_signal: 'Competitor basis 33-36 under November. Freight advantage 4-6 cents.',
    crop_stress_signal: 'No significant soybean stress in territory.',
    position_signal: 'November soybean gap 70,000 bu. Second priority after corn.',
    market_signal: null,
    confidence: 0.75,
    generated_at: '2025-10-15T06:00:00Z',
  },
]

// ── LEADS (DISPATCH QUEUE) ──

export const leads: Lead[] = [
  {
    id: 'lead-001', farmer_id: 'c1000000-0000-0000-0000-000000000003',
    farmer: farmer('c1000000-0000-0000-0000-000000000003'),
    elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.94, ml_rank: 1, crop: 'CORN', estimated_bu: 85000,
    recommended_basis: -0.11, competitor_spread: 0.07, distance_to_competitor_mi: 12,
    crop_stress_score: 0.3, last_contact_at: '2025-10-08T14:30:00Z',
    last_contact_note: 'Interested but waiting on December futures. Said to call back after USDA report.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-002', farmer_id: 'c1000000-0000-0000-0000-000000000006',
    farmer: farmer('c1000000-0000-0000-0000-000000000006'),
    elevator_id: 'b1000000-0000-0000-0000-000000000001', elevator: elevator('b1000000-0000-0000-0000-000000000001'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.89, ml_rank: 2, crop: 'CORN', estimated_bu: 35000,
    recommended_basis: -0.12, competitor_spread: 0.04, distance_to_competitor_mi: 6,
    crop_stress_score: 0.82, last_contact_at: '2025-10-01T10:00:00Z',
    last_contact_note: 'Drought stress on northeast fields. Motivated to sell before quality drops.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-003', farmer_id: 'c1000000-0000-0000-0000-000000000001',
    farmer: farmer('c1000000-0000-0000-0000-000000000001'),
    elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.85, ml_rank: 3, crop: 'CORN', estimated_bu: 42000,
    recommended_basis: -0.11, competitor_spread: 0.05, distance_to_competitor_mi: 14,
    crop_stress_score: 0.15, last_contact_at: '2025-10-10T16:00:00Z',
    last_contact_note: 'Ready to move grain. Cash flow need before end of month. Prefers early delivery.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-004', farmer_id: 'c1000000-0000-0000-0000-000000000002',
    farmer: farmer('c1000000-0000-0000-0000-000000000002'),
    elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.72, ml_rank: 4, crop: 'SOYBEANS', estimated_bu: 28000,
    recommended_basis: -0.28, competitor_spread: 0.03, distance_to_competitor_mi: 9,
    crop_stress_score: 0.05, last_contact_at: '2025-09-25T11:00:00Z',
    last_contact_note: 'Holding beans. Watching basis. Said she won\'t sell under 30 under.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-005', farmer_id: 'c1000000-0000-0000-0000-000000000007',
    farmer: farmer('c1000000-0000-0000-0000-000000000007'),
    elevator_id: 'b1000000-0000-0000-0000-000000000004', elevator: elevator('b1000000-0000-0000-0000-000000000004'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.68, ml_rank: 5, crop: 'CORN', estimated_bu: 52000,
    recommended_basis: -0.125, competitor_spread: 0.02, distance_to_competitor_mi: 5,
    crop_stress_score: 0.1, last_contact_at: '2025-10-03T09:00:00Z',
    last_contact_note: 'Has on-farm storage. Not in a rush. Freight to Harlan is competitive.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-006', farmer_id: 'c1000000-0000-0000-0000-000000000004',
    farmer: farmer('c1000000-0000-0000-0000-000000000004'),
    elevator_id: 'b1000000-0000-0000-0000-000000000003', elevator: elevator('b1000000-0000-0000-0000-000000000003'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.61, ml_rank: 6, crop: 'CORN', estimated_bu: 20000,
    recommended_basis: -0.11, competitor_spread: 0.06, distance_to_competitor_mi: 11,
    crop_stress_score: 0.2, last_contact_at: '2025-09-18T13:00:00Z',
    last_contact_note: 'New relationship. Building trust. Small volume but growth potential.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-007', farmer_id: 'c1000000-0000-0000-0000-000000000008',
    farmer: farmer('c1000000-0000-0000-0000-000000000008'),
    elevator_id: 'b1000000-0000-0000-0000-000000000005', elevator: elevator('b1000000-0000-0000-0000-000000000005'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.55, ml_rank: 7, crop: 'SOYBEANS', estimated_bu: 18000,
    recommended_basis: -0.30, competitor_spread: 0.01, distance_to_competitor_mi: 7,
    crop_stress_score: 0.0, last_contact_at: '2025-09-20T15:00:00Z',
    last_contact_note: 'Prefers cash sale. Quick decision maker. Tight competitor spread.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
  {
    id: 'lead-008', farmer_id: 'c1000000-0000-0000-0000-000000000005',
    farmer: farmer('c1000000-0000-0000-0000-000000000005'),
    elevator_id: 'b1000000-0000-0000-0000-000000000001', elevator: elevator('b1000000-0000-0000-0000-000000000001'),
    assigned_to: 'a1000000-0000-0000-0000-000000000003',
    ml_score: 0.48, ml_rank: 8, crop: 'SOYBEANS', estimated_bu: 60000,
    recommended_basis: -0.29, competitor_spread: 0.02, distance_to_competitor_mi: 8,
    crop_stress_score: 0.0, last_contact_at: '2025-09-12T17:00:00Z',
    last_contact_note: 'Sells in tranches. Prefers evening calls. Long-term relationship.',
    outcome: 'PENDING', outcome_basis: null, outcome_bu: null, outcome_note: null, outcome_at: null,
    week_of: '2025-10-14', is_active: true,
  },
]

// ── ALERTS ──

export const alerts: Alert[] = [
  {
    id: 'alert-001', user_id: 'a1000000-0000-0000-0000-000000000001',
    alert_type: 'COVERAGE_GAP', title: 'Coverage gap widening — Ames Main Corn Dec',
    body: 'December corn coverage gap at Ames Main has increased to 120,000 bu. 6 weeks to delivery window.',
    elevator_id: 'b1000000-0000-0000-0000-000000000001', farmer_id: null,
    data: { gap_bu: 120000, weeks_to_delivery: 6 },
    is_read: false, acted_on: false, created_at: '2025-10-15T07:30:00Z',
  },
  {
    id: 'alert-002', user_id: 'a1000000-0000-0000-0000-000000000001',
    alert_type: 'COMPETITOR_BID_MOVE', title: 'Atlantic Foods pulled back corn bids',
    body: 'Atlantic Foods southeast zone elevator at 87% capacity. Pulled corn bids 3 cents. Origination opportunity.',
    elevator_id: null, farmer_id: null,
    data: { competitor: 'Atlantic Foods', move_cents: -3 },
    is_read: false, acted_on: false, created_at: '2025-10-15T06:15:00Z',
  },
  {
    id: 'alert-003', user_id: 'a1000000-0000-0000-0000-000000000001',
    alert_type: 'CROP_STRESS_EVENT', title: 'NDVI stress detected — Johnson County',
    body: 'Satellite imagery shows elevated stress index in Johnson and Polk counties. Early harvest pressure likely.',
    elevator_id: null, farmer_id: null,
    data: { counties: ['Johnson', 'Polk'], stress_index: 0.72 },
    is_read: true, acted_on: false, created_at: '2025-10-14T18:00:00Z',
  },
  {
    id: 'alert-004', user_id: 'a1000000-0000-0000-0000-000000000002',
    alert_type: 'COVERAGE_GAP', title: 'Largest coverage gap — Atlantic Main Corn Dec',
    body: 'Atlantic Main December corn coverage gap at 130,000 bu. Largest open position in your region.',
    elevator_id: 'b1000000-0000-0000-0000-000000000003', farmer_id: null,
    data: { gap_bu: 130000, weeks_to_delivery: 6 },
    is_read: false, acted_on: false, created_at: '2025-10-15T07:30:00Z',
  },
  {
    id: 'alert-005', user_id: 'a1000000-0000-0000-0000-000000000003',
    alert_type: 'INBOUND_CALL', title: 'Inbound call — Bob Schroeder',
    body: 'Bob Schroeder calling. 2,400 acres, corn preferred. Last contact: interested but waiting on USDA report.',
    elevator_id: 'b1000000-0000-0000-0000-000000000003', farmer_id: 'c1000000-0000-0000-0000-000000000003',
    data: { farmer_acres: 2400 },
    is_read: false, acted_on: false, created_at: '2025-10-15T09:45:00Z',
  },
  {
    id: 'alert-006', user_id: 'a1000000-0000-0000-0000-000000000002',
    alert_type: 'FUTURES_MOVE', title: 'December corn futures up 8¢',
    body: 'December corn futures moved +8 cents in morning session. Basis may need adjustment.',
    elevator_id: null, farmer_id: null,
    data: { contract: 'CZ25', move_cents: 8 },
    is_read: false, acted_on: false, created_at: '2025-10-15T10:00:00Z',
  },
]

// ── ML OVERRIDES (in-memory store for prototype) ──

export const mlOverrides: MLOverride[] = []

// ── MOCK STORE ──
// Mutable state for the prototype. Functions to simulate writes.

export const mockStore = {
  overrides: [...mlOverrides] as MLOverride[],
  leads: [...leads] as Lead[],
  alerts: [...alerts] as Alert[],

  addOverride(override: MLOverride) {
    this.overrides.push(override)
  },

  updateLeadOutcome(leadId: string, outcome: Lead['outcome'], data?: { basis?: number; bu?: number; note?: string }) {
    const lead = this.leads.find(l => l.id === leadId)
    if (lead) {
      lead.outcome = outcome
      lead.outcome_at = new Date().toISOString()
      if (data) {
        lead.outcome_basis = data.basis ?? null
        lead.outcome_bu = data.bu ?? null
        lead.outcome_note = data.note ?? null
      }
    }
  },

  markAlertRead(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) alert.is_read = true
  },

  dismissAlert(alertId: string) {
    const alert = this.alerts.find(a => a.id === alertId)
    if (alert) {
      alert.is_read = true
      alert.acted_on = true
    }
  },
}
