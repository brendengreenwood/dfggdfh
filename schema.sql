-- ============================================================
-- KERNEL · POSTGRES SCHEMA
-- Prototype / simulation database
-- All data is simulated. Schema is inferred from product brief
-- and field observation. Validate against stox report and
-- contract data in user research before treating as canonical.
-- ============================================================

-- ── ENUMS ──

CREATE TYPE crop_type AS ENUM (
  'CORN', 'SOYBEANS', 'WHEAT', 'SORGHUM', 'OATS'
);

CREATE TYPE delivery_month AS ENUM (
  'JAN', 'MAR', 'MAY', 'JUL', 'SEP', 'NOV', -- corn/beans standard months
  'DEC' -- corn December contract
);

CREATE TYPE contract_status AS ENUM (
  'OPEN',       -- farmer committed, not yet delivered
  'DELIVERED',  -- grain physically received at elevator
  'SETTLED',    -- payment complete
  'CANCELLED'
);

CREATE TYPE lead_outcome AS ENUM (
  'PENDING',    -- not yet called
  'SOLD',       -- farmer agreed to sell
  'NO_SALE',    -- called, no deal
  'CALLBACK',   -- needs follow up
  'SKIPPED'     -- originator passed on this lead
);

CREATE TYPE persona_type AS ENUM (
  'MERCHANT',
  'GOM',        -- Grain Origination Merchant
  'CSR',        -- Customer Service Rep
  'STRATEGIC',  -- Strategic Account Rep
  'MANAGER',
  'HYBRID'      -- merchant + originator combined role
);

CREATE TYPE alert_type AS ENUM (
  'COMPETITOR_BID_MOVE',
  'FUTURES_MOVE',
  'CROP_STRESS_EVENT',
  'COVERAGE_GAP',
  'CONTRACT_CLOSED',
  'POSITION_THRESHOLD',
  'INBOUND_CALL'
);

-- ── USERS ──

CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  persona       persona_type NOT NULL,
  region        TEXT,                    -- territory they manage
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── ELEVATORS ──
-- Physical grain storage locations.
-- INFERRED: merchants manage multiple elevators across a region.
-- VALIDATE: actual elevator data model against stox report.

CREATE TABLE elevators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  code          TEXT UNIQUE NOT NULL,   -- short identifier used in stox report
  region        TEXT NOT NULL,
  lat           DECIMAL(9,6),
  lng           DECIMAL(9,6),
  capacity_bu   INTEGER,               -- total bushel capacity
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── INVENTORY (STOX) ──
-- Physical grain inventory per elevator.
-- INFERRED from stox report concept. Field names need validation
-- against actual stox report schema in user research.
-- This is the physical side of the position calculation.

CREATE TABLE inventory (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevator_id     UUID REFERENCES elevators(id),
  crop            crop_type NOT NULL,
  crop_year       INTEGER NOT NULL,           -- e.g. 2025
  delivery_month  delivery_month NOT NULL,
  bushels_owned   INTEGER NOT NULL DEFAULT 0, -- total bushels company owns
  bushels_priced  INTEGER NOT NULL DEFAULT 0, -- bushels with a locked basis
  bushels_unpriced INTEGER GENERATED ALWAYS AS (bushels_owned - bushels_priced) STORED,
  avg_basis       DECIMAL(6,4),               -- average basis on priced grain
  -- OPEN QUESTION: are there ownership categories (HTA, basis contract, etc)?
  -- VALIDATE: against actual stox report field structure
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── FUTURES POSITIONS ──
-- Paper side of the position calculation.
-- Submitted via contract app → FCM → exchange.
-- INFERRED: merchant reconciles this against physical inventory.

CREATE TABLE futures_positions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id), -- merchant who owns this position
  crop            crop_type NOT NULL,
  delivery_month  delivery_month NOT NULL,
  crop_year       INTEGER NOT NULL,
  contracts       INTEGER NOT NULL,          -- number of futures contracts (5000 bu each)
  bushels         INTEGER GENERATED ALWAYS AS (contracts * 5000) STORED,
  position_type   TEXT NOT NULL CHECK (position_type IN ('LONG', 'SHORT')),
  avg_price       DECIMAL(8,4),              -- average price of position
  -- OPEN QUESTION: how does the FCM feed map to this?
  -- DISCOVERY TASK: identify FCM and assess API availability
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ── POSITION VIEW (MATERIALIZED) ──
-- The merchant's net position per elevator per crop per delivery month.
-- Physical inventory minus futures hedges.
-- This is the core of the merchant start screen.
-- INFERRED: needs validation against how merchants actually calculate this.

CREATE TABLE position_summary (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  elevator_id         UUID REFERENCES elevators(id),
  user_id             UUID REFERENCES users(id),
  crop                crop_type NOT NULL,
  delivery_month      delivery_month NOT NULL,
  crop_year           INTEGER NOT NULL,
  bushels_physical    INTEGER NOT NULL DEFAULT 0,  -- from inventory
  bushels_futures     INTEGER NOT NULL DEFAULT 0,  -- from futures_positions
  net_position        INTEGER GENERATED ALWAYS AS (bushels_physical - bushels_futures) STORED,
  coverage_target     INTEGER,                     -- bushels merchant needs to originate
  coverage_gap        INTEGER GENERATED ALWAYS AS (
                        GREATEST(0, coverage_target - bushels_physical)
                      ) STORED,
  current_basis       DECIMAL(6,4),                -- current posted basis
  ml_basis_rec        DECIMAL(6,4),                -- ML recommended basis
  basis_delta         DECIMAL(6,4) GENERATED ALWAYS AS (current_basis - ml_basis_rec) STORED,
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(elevator_id, user_id, crop, delivery_month, crop_year)
);

-- ── FARMERS ──

CREATE TABLE farmers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  salesforce_id   TEXT UNIQUE,                -- Salesforce CRM link
  region          TEXT,
  lat             DECIMAL(9,6),               -- farm location
  lng             DECIMAL(9,6),
  -- OPEN QUESTION: farmer → parcel matching via FSA data (Phase 7)
  -- for now location is approximate farm center
  preferred_crop  crop_type,
  total_acres     INTEGER,
  notes           TEXT,                       -- relationship notes from originators
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── CONTRACTS ──
-- Physical grain contracts.
-- INFERRED: contract object means different things to different personas.
-- Merchant: position exposure. GOM: sale to close. CSR: fulfillment task.
-- VALIDATE: actual contract schema against ERP data model.

CREATE TABLE contracts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id         UUID REFERENCES farmers(id),
  elevator_id       UUID REFERENCES elevators(id),
  originated_by     UUID REFERENCES users(id),   -- GOM who closed the sale
  crop              crop_type NOT NULL,
  crop_year         INTEGER NOT NULL,
  delivery_month    delivery_month NOT NULL,
  bushels           INTEGER NOT NULL,
  basis             DECIMAL(6,4) NOT NULL,        -- locked basis at time of sale
  futures_price     DECIMAL(8,4),                 -- futures price at time of lock
  ml_basis_rec      DECIMAL(6,4),                 -- what ML recommended at time of sale
  basis_delta       DECIMAL(6,4) GENERATED ALWAYS AS (basis - ml_basis_rec) STORED,
  status            contract_status NOT NULL DEFAULT 'OPEN',
  contracted_at     TIMESTAMPTZ DEFAULT now(),
  delivery_start    DATE,
  delivery_end      DATE,
  delivered_at      TIMESTAMPTZ,
  settled_at        TIMESTAMPTZ,
  -- CSR fields
  delivery_notes    TEXT,
  payment_status    TEXT CHECK (payment_status IN ('PENDING', 'PROCESSING', 'COMPLETE')),
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── ML RECOMMENDATIONS ──
-- Every recommendation the ML engine generates.
-- Basis recommendations for merchants.
-- Lead scores for originators.

CREATE TABLE ml_recommendations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rec_type        TEXT NOT NULL CHECK (rec_type IN ('BASIS', 'LEAD_SCORE')),
  user_id         UUID REFERENCES users(id),
  elevator_id     UUID REFERENCES elevators(id),
  farmer_id       UUID REFERENCES farmers(id),   -- for lead score recs
  crop            crop_type,
  delivery_month  delivery_month,
  crop_year       INTEGER,
  recommended_value DECIMAL(8,4) NOT NULL,       -- basis or score
  reasoning       TEXT,                          -- trader-language explanation
  -- reasoning components for explainability
  competitor_signal   TEXT,
  crop_stress_signal  TEXT,
  position_signal     TEXT,
  market_signal       TEXT,
  confidence          DECIMAL(4,3),              -- 0.000 to 1.000
  generated_at    TIMESTAMPTZ DEFAULT now()
);

-- ── ML OVERRIDES (FEEDBACK LOOP) ──
-- Phase 1 · Most critical data capture in the system.
-- Every time a merchant posts a bid that differs from the ML recommendation
-- that decision is captured here. This is the training data moat.

CREATE TABLE ml_overrides (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES ml_recommendations(id),
  user_id           UUID REFERENCES users(id),
  original_rec      DECIMAL(8,4) NOT NULL,
  posted_value      DECIMAL(8,4) NOT NULL,
  delta             DECIMAL(8,4) GENERATED ALWAYS AS (posted_value - original_rec) STORED,
  -- Optional reason capture — 2 tap max in UI
  reason_category   TEXT CHECK (reason_category IN (
                      'FARMER_CONTEXT',
                      'STORAGE_CONSTRAINT',
                      'GUT_READ',
                      'MARKET_READ',
                      'RELATIONSHIP',
                      'OTHER'
                    )),
  reason_note       TEXT,                        -- optional free text
  overridden_at     TIMESTAMPTZ DEFAULT now()
);

-- ── LEADS ──
-- The ML-ranked lead list. Currently a weekly email.
-- Becomes the live dispatch queue.

CREATE TABLE leads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id         UUID REFERENCES farmers(id),
  elevator_id       UUID REFERENCES elevators(id),
  assigned_to       UUID REFERENCES users(id),   -- GOM responsible
  ml_score          DECIMAL(4,3) NOT NULL,        -- 0.000 to 1.000
  ml_rank           INTEGER,                      -- rank in queue for this user
  crop              crop_type,
  estimated_bu      INTEGER,                      -- estimated available bushels
  -- Pre-call brief data
  recommended_basis DECIMAL(6,4),
  competitor_spread DECIMAL(6,4),                 -- your basis minus nearest competitor
  distance_to_competitor_mi DECIMAL(6,2),
  crop_stress_score DECIMAL(4,3),                 -- field stress signal 0-1
  last_contact_at   TIMESTAMPTZ,
  last_contact_note TEXT,
  -- Outcome
  outcome           lead_outcome NOT NULL DEFAULT 'PENDING',
  outcome_basis     DECIMAL(6,4),                 -- what was actually quoted
  outcome_bu        INTEGER,                      -- bushels sold if outcome = SOLD
  outcome_note      TEXT,
  outcome_at        TIMESTAMPTZ,
  -- Queue management
  week_of           DATE NOT NULL,                -- which week's queue this belongs to
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── ALERTS ──

CREATE TABLE alerts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  alert_type    alert_type NOT NULL,
  title         TEXT NOT NULL,
  body          TEXT,
  elevator_id   UUID REFERENCES elevators(id),
  farmer_id     UUID REFERENCES farmers(id),
  data          JSONB,                           -- flexible payload per alert type
  is_read       BOOLEAN DEFAULT false,
  acted_on      BOOLEAN DEFAULT false,
  dismissed_at  TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── COMPETITOR ELEVATORS ──
-- Phase 5: competitor bid scraping.
-- Schema ready now. Data pipeline comes later.

CREATE TABLE competitor_elevators (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  lat           DECIMAL(9,6),
  lng           DECIMAL(9,6),
  region        TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE competitor_bids (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  competitor_elevator_id UUID REFERENCES competitor_elevators(id),
  crop                  crop_type NOT NULL,
  delivery_month        delivery_month NOT NULL,
  crop_year             INTEGER NOT NULL,
  basis                 DECIMAL(6,4) NOT NULL,
  scraped_at            TIMESTAMPTZ DEFAULT now()
);

-- ── INSTRUMENTATION ──
-- Behavioral telemetry. Owned by Product.
-- Specced before features ship.

CREATE TABLE behavioral_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES users(id),
  event_type    TEXT NOT NULL,  -- 'MODE_SWITCH', 'ALERT_DISMISSED', 'QUEUE_EXIT', etc
  view          TEXT,           -- which screen/view the event occurred in
  duration_ms   INTEGER,        -- time spent before event
  metadata      JSONB,          -- flexible per event type
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE feedback_responses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  prompt_type     TEXT NOT NULL, -- 'OVERRIDE_REASON', 'QUEUE_EXIT', 'REC_CLARITY', 'SPREADSHEET', 'MISSING_INFO'
  response        TEXT,
  response_value  TEXT,          -- for tap options
  context         JSONB,         -- what was on screen when prompted
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ── INDEXES ──

CREATE INDEX idx_inventory_elevator ON inventory(elevator_id);
CREATE INDEX idx_inventory_crop ON inventory(crop, delivery_month, crop_year);
CREATE INDEX idx_position_summary_user ON position_summary(user_id);
CREATE INDEX idx_position_summary_elevator ON position_summary(elevator_id);
CREATE INDEX idx_contracts_farmer ON contracts(farmer_id);
CREATE INDEX idx_contracts_elevator ON contracts(elevator_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_leads_assigned ON leads(assigned_to, week_of);
CREATE INDEX idx_leads_score ON leads(ml_score DESC);
CREATE INDEX idx_alerts_user ON alerts(user_id, is_read, created_at DESC);
CREATE INDEX idx_ml_recs_user ON ml_recommendations(user_id, generated_at DESC);
CREATE INDEX idx_overrides_user ON ml_overrides(user_id, overridden_at DESC);
CREATE INDEX idx_behavioral_user ON behavioral_events(user_id, created_at DESC);

-- ============================================================
-- SEED DATA
-- Simulated data for prototype. Regional names and numbers
-- are plausible but entirely fictional.
-- ============================================================

-- Users
INSERT INTO users (id, name, email, persona, region) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Marcus Webb',    'mwebb@cargill.com',    'MERCHANT',  'Iowa Central'),
  ('a1000000-0000-0000-0000-000000000002', 'Dana Kowalski',  'dkowalski@cargill.com','HYBRID',    'Iowa Southwest'),
  ('a1000000-0000-0000-0000-000000000003', 'Tyler Briggs',   'tbriggs@cargill.com',  'GOM',       'Iowa Southwest'),
  ('a1000000-0000-0000-0000-000000000004', 'Sarah Chen',     'schen@cargill.com',    'CSR',       'Iowa Southwest'),
  ('a1000000-0000-0000-0000-000000000005', 'Jim Harrington', 'jharrington@cargill.com','MANAGER', 'Iowa Region');

-- Elevators
INSERT INTO elevators (id, name, code, region, lat, lng, capacity_bu) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Ames Main',       'AME', 'Iowa Central',   41.9900, -93.6200, 2500000),
  ('b1000000-0000-0000-0000-000000000002', 'Nevada Terminal', 'NEV', 'Iowa Central',   42.0200, -93.4500, 1800000),
  ('b1000000-0000-0000-0000-000000000003', 'Atlantic Main',   'ATL', 'Iowa Southwest', 41.4000, -95.0100, 3200000),
  ('b1000000-0000-0000-0000-000000000004', 'Harlan Station',  'HAR', 'Iowa Southwest', 41.6500, -95.3300, 1400000),
  ('b1000000-0000-0000-0000-000000000005', 'Red Oak Depot',   'ROK', 'Iowa Southwest', 41.0000, -95.2300, 900000);

-- Inventory (physical grain in elevators)
INSERT INTO inventory (elevator_id, crop, crop_year, delivery_month, bushels_owned, bushels_priced, avg_basis) VALUES
  -- Ames Main
  ('b1000000-0000-0000-0000-000000000001', 'CORN',     2025, 'DEC', 480000, 320000, -0.1400),
  ('b1000000-0000-0000-0000-000000000001', 'SOYBEANS', 2025, 'NOV', 210000, 150000, -0.3200),
  ('b1000000-0000-0000-0000-000000000001', 'CORN',     2025, 'MAR', 120000,  60000, -0.1600),
  -- Nevada Terminal
  ('b1000000-0000-0000-0000-000000000002', 'CORN',     2025, 'DEC', 290000, 180000, -0.1500),
  ('b1000000-0000-0000-0000-000000000002', 'SOYBEANS', 2025, 'NOV', 140000,  90000, -0.3400),
  -- Atlantic Main
  ('b1000000-0000-0000-0000-000000000003', 'CORN',     2025, 'DEC', 620000, 380000, -0.1300),
  ('b1000000-0000-0000-0000-000000000003', 'SOYBEANS', 2025, 'NOV', 310000, 200000, -0.3100),
  ('b1000000-0000-0000-0000-000000000003', 'CORN',     2025, 'MAR', 180000,  80000, -0.1700),
  -- Harlan Station
  ('b1000000-0000-0000-0000-000000000004', 'CORN',     2025, 'DEC', 195000, 110000, -0.1450),
  ('b1000000-0000-0000-0000-000000000004', 'SOYBEANS', 2025, 'NOV',  88000,  55000, -0.3300),
  -- Red Oak Depot
  ('b1000000-0000-0000-0000-000000000005', 'CORN',     2025, 'DEC', 142000,  75000, -0.1550),
  ('b1000000-0000-0000-0000-000000000005', 'SOYBEANS', 2025, 'NOV',  61000,  30000, -0.3500);

-- Position Summary (merchant view — inferred position per elevator)
INSERT INTO position_summary
  (elevator_id, user_id, crop, delivery_month, crop_year, bushels_physical, bushels_futures, coverage_target, current_basis, ml_basis_rec)
VALUES
  -- Marcus Webb — Iowa Central merchant
  ('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','CORN','DEC',2025, 480000, 420000, 600000, -0.1400, -0.1200),
  ('b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000001','SOYBEANS','NOV',2025, 210000, 195000, 280000, -0.3200, -0.2900),
  ('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','CORN','DEC',2025, 290000, 260000, 350000, -0.1500, -0.1300),
  ('b1000000-0000-0000-0000-000000000002','a1000000-0000-0000-0000-000000000001','SOYBEANS','NOV',2025, 140000, 120000, 180000, -0.3400, -0.3100),
  -- Dana Kowalski — Iowa Southwest hybrid
  ('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','CORN','DEC',2025, 620000, 540000, 750000, -0.1300, -0.1100),
  ('b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000002','SOYBEANS','NOV',2025, 310000, 275000, 380000, -0.3100, -0.2800),
  ('b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000002','CORN','DEC',2025, 195000, 160000, 240000, -0.1450, -0.1250),
  ('b1000000-0000-0000-0000-000000000005','a1000000-0000-0000-0000-000000000002','CORN','DEC',2025, 142000, 110000, 180000, -0.1550, -0.1350);

-- Farmers
INSERT INTO farmers (id, name, phone, region, lat, lng, preferred_crop, total_acres, notes) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Harold Johnson',  '515-555-0101', 'Iowa Southwest', 41.52, -95.18, 'CORN',     1200, 'Reliable seller, prefers early October delivery. Cash flow sensitive.'),
  ('c1000000-0000-0000-0000-000000000002', 'Linda Petersen',  '515-555-0102', 'Iowa Southwest', 41.38, -95.44, 'SOYBEANS', 800,  'Watches basis closely. Will hold if spread is unfavorable. Call Tuesdays.'),
  ('c1000000-0000-0000-0000-000000000003', 'Bob Schroeder',   '712-555-0103', 'Iowa Southwest', 41.71, -95.29, 'CORN',     2400, 'Large operation. Strategic account potential. Price sensitive on corn.'),
  ('c1000000-0000-0000-0000-000000000004', 'Marie Gutierrez', '712-555-0104', 'Iowa Southwest', 41.44, -95.05, 'CORN',     650,  'New relationship. First sale last year. Building trust.'),
  ('c1000000-0000-0000-0000-000000000005', 'Tom Lindquist',   '515-555-0105', 'Iowa Central',   42.11, -93.58, 'SOYBEANS', 1800, 'Prefers evening calls. Sells in tranches, not all at once.'),
  ('c1000000-0000-0000-0000-000000000006', 'Gary Novak',      '515-555-0106', 'Iowa Central',   41.95, -93.71, 'CORN',     980,  'Drought stress visible in northeast fields per satellite. Motivated seller.'),
  ('c1000000-0000-0000-0000-000000000007', 'Diane Olson',     '712-555-0107', 'Iowa Southwest', 41.58, -95.38, 'CORN',     1450, 'Has storage on farm. Less urgency. Competitive on freight to Harlan.'),
  ('c1000000-0000-0000-0000-000000000008', 'Ray Fitzgerald',  '712-555-0108', 'Iowa Southwest', 41.33, -95.21, 'SOYBEANS', 560,  'Cash sale preferred. Quick decisions when price is right.');

-- ML Recommendations (basis)
INSERT INTO ml_recommendations
  (rec_type, user_id, elevator_id, crop, delivery_month, crop_year, recommended_value, reasoning, competitor_signal, crop_stress_signal, position_signal, confidence)
VALUES
  ('BASIS','a1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000001','CORN','DEC',2025,
   -0.1200,
   'Recommend 12 under December. Competitor Atlantic Foods near capacity in southeast zone. Crop stress signals in Johnson County suggest early harvest pressure. Your December coverage gap is 120,000 bu — room to be aggressive.',
   'Atlantic Foods elevator capacity 87% — pulling back bids in southeast zone.',
   'NDVI stress index elevated in Johnson, Polk counties. Early harvest likely.',
   'December coverage gap 120,000 bu. 6 weeks to delivery window.',
   0.78),
  ('BASIS','a1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000003','CORN','DEC',2025,
   -0.1100,
   'Recommend 11 under December. Strong origination opportunity in southwest territory. Competitor spread favorable — nearest elevator is 8 miles further for most of your target zone. Coverage gap is your largest across all elevators.',
   'Nearest competitor 18 cents under December. Spread 7 cents in your favor.',
   'Crop stress moderate. Some early harvest pressure in Shelby County.',
   'December coverage gap 210,000 bu. Largest open position in region.',
   0.82);

-- Leads (dispatch queue)
INSERT INTO leads
  (farmer_id, elevator_id, assigned_to, ml_score, ml_rank, crop, estimated_bu, recommended_basis, competitor_spread, distance_to_competitor_mi, crop_stress_score, last_contact_at, last_contact_note, outcome, week_of)
VALUES
  ('c1000000-0000-0000-0000-000000000006','b1000000-0000-0000-0000-000000000001','a1000000-0000-0000-0000-000000000003',
   0.94, 1, 'CORN', 45000, -0.1200, 0.06, 3.2, 0.82,
   NOW() - INTERVAL '18 days', 'Interested but waiting on basis to improve. Said call back in 2-3 weeks.',
   'PENDING', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day'),

  ('c1000000-0000-0000-0000-000000000001','b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003',
   0.88, 2, 'CORN', 38000, -0.1450, 0.04, 5.8, 0.61,
   NOW() - INTERVAL '7 days', 'Good conversation. Watching October delivery window.',
   'PENDING', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day'),

  ('c1000000-0000-0000-0000-000000000003','b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003',
   0.85, 3, 'CORN', 95000, -0.1300, 0.07, 2.1, 0.55,
   NOW() - INTERVAL '3 days', 'Left voicemail. Large operation, decision maker is Bob directly.',
   'PENDING', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day'),

  ('c1000000-0000-0000-0000-000000000002','b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003',
   0.79, 4, 'SOYBEANS', 28000, -0.3100, 0.03, 7.4, 0.48,
   NOW() - INTERVAL '14 days', 'Watching November beans. Said she sells when basis is above -30.',
   'PENDING', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day'),

  ('c1000000-0000-0000-0000-000000000008','b1000000-0000-0000-0000-000000000003','a1000000-0000-0000-0000-000000000003',
   0.73, 5, 'SOYBEANS', 18000, -0.3100, 0.05, 4.3, 0.44,
   NOW() - INTERVAL '21 days', 'Cash sale preferred. Quick to decide.',
   'PENDING', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day'),

  ('c1000000-0000-0000-0000-000000000004','b1000000-0000-0000-0000-000000000004','a1000000-0000-0000-0000-000000000003',
   0.68, 6, 'CORN', 22000, -0.1450, 0.02, 9.1, 0.38,
   NOW() - INTERVAL '30 days', 'New relationship. Building trust. Check in monthly.',
   'PENDING', CURRENT_DATE - EXTRACT(DOW FROM CURRENT_DATE)::INTEGER * INTERVAL '1 day');

-- Alerts
INSERT INTO alerts (user_id, alert_type, title, body, elevator_id, is_read, acted_on) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'COMPETITOR_BID_MOVE',
   'Atlantic Foods dropped December corn 4¢',
   'Atlantic Foods elevator moved December corn basis from -17 to -21. Southeast territory overlap. Your spread advantage widened to 7¢.',
   'b1000000-0000-0000-0000-000000000001', false, false),

  ('a1000000-0000-0000-0000-000000000001', 'COVERAGE_GAP',
   'October soybean coverage at 68%',
   'November soybean position at Ames Main is 210,000 bu physical against 195,000 bu hedged. Coverage gap 70,000 bu with 5 weeks to delivery window.',
   'b1000000-0000-0000-0000-000000000001', false, false),

  ('a1000000-0000-0000-0000-000000000002', 'CROP_STRESS_EVENT',
   'Stress signal in Shelby County',
   'NDVI index elevated in northwest Shelby County. Early harvest pressure likely. 3 leads in your queue are in this zone. Queue has been reprioritized.',
   'b1000000-0000-0000-0000-000000000003', false, false),

  ('a1000000-0000-0000-0000-000000000003', 'INBOUND_CALL',
   'Gary Novak calling',
   'Incoming call. ML score 0.94 — highest in your queue. Recommended basis: 12 under December. Last contact 18 days ago.',
   'b1000000-0000-0000-0000-000000000001', false, false);

-- Competitor elevators
INSERT INTO competitor_elevators (id, name, lat, lng, region) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'Atlantic Foods Elevator', 41.38, -95.06, 'Iowa Southwest'),
  ('d1000000-0000-0000-0000-000000000002', 'Midwest Grain Co',        41.66, -95.41, 'Iowa Southwest'),
  ('d1000000-0000-0000-0000-000000000003', 'Central States Grain',    42.05, -93.72, 'Iowa Central');

INSERT INTO competitor_bids (competitor_elevator_id, crop, delivery_month, crop_year, basis) VALUES
  ('d1000000-0000-0000-0000-000000000001', 'CORN',     'DEC', 2025, -0.2100),
  ('d1000000-0000-0000-0000-000000000001', 'SOYBEANS', 'NOV', 2025, -0.3600),
  ('d1000000-0000-0000-0000-000000000002', 'CORN',     'DEC', 2025, -0.1900),
  ('d1000000-0000-0000-0000-000000000002', 'SOYBEANS', 'NOV', 2025, -0.3400),
  ('d1000000-0000-0000-0000-000000000003', 'CORN',     'DEC', 2025, -0.1800),
  ('d1000000-0000-0000-0000-000000000003', 'SOYBEANS', 'NOV', 2025, -0.3500);
