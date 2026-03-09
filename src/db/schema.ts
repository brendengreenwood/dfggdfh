import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core'

// ── TABLES ──

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  persona: text('persona', { enum: ['MERCHANT', 'GOM', 'CSR', 'STRATEGIC', 'MANAGER', 'HYBRID', 'ORIGINATOR'] }).notNull(),
  region: text('region'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const elevators = sqliteTable('elevators', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  region: text('region').notNull(),
  lat: real('lat'),
  lng: real('lng'),
  capacity_bu: integer('capacity_bu'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const positionSummary = sqliteTable('position_summary', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  elevator_id: text('elevator_id').notNull().references(() => elevators.id),
  user_id: text('user_id').notNull().references(() => users.id),
  crop: text('crop', { enum: ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS'] }).notNull(),
  delivery_month: text('delivery_month', { enum: ['JAN', 'MAR', 'MAY', 'JUL', 'AUG', 'SEP', 'NOV', 'DEC'] }).notNull(),
  crop_year: integer('crop_year').notNull(),
  bushels_physical: integer('bushels_physical').notNull(),
  bushels_futures: integer('bushels_futures').notNull(),
  net_position: integer('net_position').notNull(),
  coverage_target: integer('coverage_target'),
  coverage_gap: integer('coverage_gap'),
  current_basis: real('current_basis'),
  ml_basis_rec: real('ml_basis_rec'),
  basis_delta: real('basis_delta'),
  updated_at: text('updated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const farmers = sqliteTable('farmers', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  salesforce_id: text('salesforce_id').unique(),
  region: text('region'),
  lat: real('lat'),
  lng: real('lng'),
  preferred_crop: text('preferred_crop', { enum: ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS'] }),
  total_acres: integer('total_acres'),
  notes: text('notes'),
  originator_id: text('originator_id'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const contracts = sqliteTable('contracts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  farmer_id: text('farmer_id').notNull().references(() => farmers.id),
  elevator_id: text('elevator_id').notNull().references(() => elevators.id),
  originated_by: text('originated_by').notNull().references(() => users.id),
  crop: text('crop', { enum: ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS'] }).notNull(),
  crop_year: integer('crop_year').notNull(),
  delivery_month: text('delivery_month', { enum: ['JAN', 'MAR', 'MAY', 'JUL', 'AUG', 'SEP', 'NOV', 'DEC'] }).notNull(),
  bushels: integer('bushels').notNull(),
  basis: real('basis'),
  futures_price: real('futures_price'),
  ml_basis_rec: real('ml_basis_rec'),
  basis_delta: real('basis_delta'),
  status: text('status', { enum: ['OPEN', 'DELIVERED', 'SETTLED', 'CANCELLED'] }).notNull().default('OPEN'),
  contracted_at: text('contracted_at'),
  delivery_start: text('delivery_start'),
  delivery_end: text('delivery_end'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const mlRecommendations = sqliteTable('ml_recommendations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  rec_type: text('rec_type', { enum: ['BASIS', 'LEAD_SCORE'] }).notNull(),
  user_id: text('user_id').references(() => users.id),
  elevator_id: text('elevator_id').references(() => elevators.id),
  farmer_id: text('farmer_id').references(() => farmers.id),
  crop: text('crop', { enum: ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS'] }),
  delivery_month: text('delivery_month', { enum: ['JAN', 'MAR', 'MAY', 'JUL', 'AUG', 'SEP', 'NOV', 'DEC'] }),
  crop_year: integer('crop_year'),
  recommended_value: real('recommended_value').notNull(),
  reasoning: text('reasoning'),
  competitor_signal: text('competitor_signal'),
  crop_stress_signal: text('crop_stress_signal'),
  position_signal: text('position_signal'),
  market_signal: text('market_signal'),
  confidence: real('confidence'),
  generated_at: text('generated_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const mlOverrides = sqliteTable('ml_overrides', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recommendation_id: text('recommendation_id').notNull().references(() => mlRecommendations.id),
  user_id: text('user_id').notNull().references(() => users.id),
  original_rec: real('original_rec').notNull(),
  posted_value: real('posted_value').notNull(),
  delta: real('delta').notNull(),
  reason_category: text('reason_category', { enum: ['FARMER_CONTEXT', 'STORAGE_CONSTRAINT', 'GUT_READ', 'MARKET_READ', 'RELATIONSHIP', 'OTHER'] }),
  reason_note: text('reason_note'),
  overridden_at: text('overridden_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const leads = sqliteTable('leads', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  farmer_id: text('farmer_id').notNull().references(() => farmers.id),
  elevator_id: text('elevator_id').notNull().references(() => elevators.id),
  assigned_to: text('assigned_to').notNull().references(() => users.id),
  ml_score: real('ml_score').notNull(),
  ml_rank: integer('ml_rank'),
  crop: text('crop', { enum: ['CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS'] }),
  estimated_bu: integer('estimated_bu'),
  recommended_basis: real('recommended_basis'),
  competitor_spread: real('competitor_spread'),
  distance_to_competitor_mi: real('distance_to_competitor_mi'),
  crop_stress_score: real('crop_stress_score'),
  last_contact_at: text('last_contact_at'),
  last_contact_note: text('last_contact_note'),
  outcome: text('outcome', { enum: ['PENDING', 'SOLD', 'NO_SALE', 'CALLBACK', 'SKIPPED'] }).notNull().default('PENDING'),
  outcome_basis: real('outcome_basis'),
  outcome_bu: integer('outcome_bu'),
  outcome_note: text('outcome_note'),
  outcome_at: text('outcome_at'),
  week_of: text('week_of').notNull(),
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const alerts = sqliteTable('alerts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull().references(() => users.id),
  alert_type: text('alert_type', { enum: ['COMPETITOR_BID_MOVE', 'FUTURES_MOVE', 'CROP_STRESS_EVENT', 'COVERAGE_GAP', 'CONTRACT_CLOSED', 'POSITION_THRESHOLD', 'INBOUND_CALL'] }).notNull(),
  title: text('title').notNull(),
  body: text('body'),
  elevator_id: text('elevator_id').references(() => elevators.id),
  farmer_id: text('farmer_id').references(() => farmers.id),
  data: text('data', { mode: 'json' }),
  is_read: integer('is_read', { mode: 'boolean' }).notNull().default(false),
  acted_on: integer('acted_on', { mode: 'boolean' }).notNull().default(false),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const farmerContacts = sqliteTable('farmer_contacts', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  farmer_id: text('farmer_id').notNull().references(() => farmers.id),
  originator_id: text('originator_id').notNull().references(() => users.id),
  contact_type: text('contact_type', { enum: ['OUTBOUND_CALL', 'INBOUND_CALL', 'SPOT_SALE', 'SITE_VISIT', 'EMAIL'] }).notNull(),
  bushels_sold: integer('bushels_sold'),  // for SPOT_SALE events
  notes: text('notes'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const behavioralEvents = sqliteTable('behavioral_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull().references(() => users.id),
  event_type: text('event_type').notNull(),
  view: text('view'),
  duration_ms: integer('duration_ms'),
  metadata: text('metadata', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const positionChanges = sqliteTable('position_changes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  position_id: text('position_id').notNull().references(() => positionSummary.id),
  lead_id: text('lead_id').references(() => leads.id),
  farmer_name: text('farmer_name'),
  originator_name: text('originator_name'),
  bushels: integer('bushels').notNull(),
  basis: real('basis'),
  coverage_before: real('coverage_before'),
  coverage_after: real('coverage_after'),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})

export const feedbackResponses = sqliteTable('feedback_responses', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  user_id: text('user_id').notNull().references(() => users.id),
  prompt_type: text('prompt_type').notNull(),
  response: text('response'),
  response_value: text('response_value'),
  context: text('context', { mode: 'json' }),
  created_at: text('created_at').$defaultFn(() => new Date().toISOString()).notNull(),
})
