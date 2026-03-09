// ── KERNEL TYPE DEFINITIONS ──
// Source of truth: src/db/schema.ts (Drizzle)

export type CropType = 'CORN' | 'SOYBEANS' | 'WHEAT' | 'SORGHUM' | 'OATS'

export type DeliveryMonth = 'JAN' | 'MAR' | 'MAY' | 'JUL' | 'AUG' | 'SEP' | 'NOV' | 'DEC'

export type PersonaType = 'MERCHANT' | 'GOM' | 'CSR' | 'STRATEGIC' | 'MANAGER' | 'HYBRID' | 'ORIGINATOR'

export type ContractStatus = 'OPEN' | 'DELIVERED' | 'SETTLED' | 'CANCELLED'

export type LeadOutcome = 'PENDING' | 'SOLD' | 'NO_SALE' | 'CALLBACK' | 'SKIPPED'

export type AlertType =
  | 'COMPETITOR_BID_MOVE'
  | 'FUTURES_MOVE'
  | 'CROP_STRESS_EVENT'
  | 'COVERAGE_GAP'
  | 'CONTRACT_CLOSED'
  | 'POSITION_THRESHOLD'
  | 'INBOUND_CALL'

export type OverrideReasonCategory =
  | 'FARMER_CONTEXT'
  | 'STORAGE_CONSTRAINT'
  | 'GUT_READ'
  | 'MARKET_READ'
  | 'RELATIONSHIP'
  | 'OTHER'

export type RecType = 'BASIS' | 'LEAD_SCORE'

export interface User {
  id: string
  name: string
  email: string
  persona: PersonaType
  region: string | null
}

export interface Elevator {
  id: string
  name: string
  code: string
  region: string
  lat: number | null
  lng: number | null
  capacity_bu: number | null
}

export interface PositionSummary {
  id: string
  elevator_id: string
  elevator?: Elevator
  user_id: string
  crop: CropType
  delivery_month: DeliveryMonth
  crop_year: number
  bushels_physical: number
  bushels_futures: number
  net_position: number
  coverage_target: number | null
  coverage_gap: number | null
  current_basis: number | null
  ml_basis_rec: number | null
  basis_delta: number | null
  updated_at: string
}

export interface PositionChange {
  id: string
  position_id: string
  lead_id: string | null
  farmer_name: string | null
  originator_name: string | null
  bushels: number
  basis: number | null
  coverage_before: number | null
  coverage_after: number | null
  created_at: string
}

export interface MLRecommendation {
  id: string
  rec_type: RecType
  user_id: string | null
  elevator_id: string | null
  elevator?: Elevator
  farmer_id: string | null
  crop: CropType | null
  delivery_month: DeliveryMonth | null
  crop_year: number | null
  recommended_value: number
  reasoning: string | null
  competitor_signal: string | null
  crop_stress_signal: string | null
  position_signal: string | null
  market_signal: string | null
  confidence: number | null
  generated_at: string
}

export interface MLOverride {
  id: string
  recommendation_id: string
  user_id: string
  original_rec: number
  posted_value: number
  delta: number
  reason_category: OverrideReasonCategory | null
  reason_note: string | null
  overridden_at: string
}

export interface Farmer {
  id: string
  name: string
  phone: string | null
  email: string | null
  salesforce_id: string | null
  region: string | null
  lat: number | null
  lng: number | null
  preferred_crop: CropType | null
  total_acres: number | null
  notes: string | null
  originator_id: string | null
  originator_name?: string | null
  last_contact?: FarmerContact | null
}

export type ContactType = 'OUTBOUND_CALL' | 'INBOUND_CALL' | 'SPOT_SALE' | 'SITE_VISIT' | 'EMAIL'

export interface FarmerContact {
  id: string
  farmer_id: string
  originator_id: string
  contact_type: ContactType
  bushels_sold: number | null
  notes: string | null
  created_at: string
}

export interface Lead {
  id: string
  farmer_id: string
  farmer?: Farmer
  elevator_id: string
  elevator?: Elevator
  assigned_to: string
  ml_score: number
  ml_rank: number | null
  crop: CropType | null
  estimated_bu: number | null
  recommended_basis: number | null
  competitor_spread: number | null
  distance_to_competitor_mi: number | null
  crop_stress_score: number | null
  last_contact_at: string | null
  last_contact_note: string | null
  outcome: LeadOutcome
  outcome_basis: number | null
  outcome_bu: number | null
  outcome_note: string | null
  outcome_at: string | null
  week_of: string
  is_active: boolean
}

export interface Alert {
  id: string
  user_id: string
  alert_type: AlertType
  title: string
  body: string | null
  elevator_id: string | null
  farmer_id: string | null
  data: Record<string, unknown> | null
  is_read: boolean
  acted_on: boolean
  created_at: string
}

export interface Contract {
  id: string
  farmer_id: string
  elevator_id: string
  originated_by: string
  crop: CropType
  crop_year: number
  delivery_month: DeliveryMonth
  bushels: number
  basis: number | null
  futures_price: number | null
  ml_basis_rec: number | null
  basis_delta: number | null
  status: ContractStatus
  contracted_at: string | null
  delivery_start: string | null
  delivery_end: string | null
}

export interface BehavioralEvent {
  id: string
  user_id: string
  event_type: string
  view: string | null
  duration_ms: number | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface FeedbackResponse {
  id: string
  user_id: string
  prompt_type: string
  response: string | null
  response_value: string | null
  context: Record<string, unknown> | null
  created_at: string
}
